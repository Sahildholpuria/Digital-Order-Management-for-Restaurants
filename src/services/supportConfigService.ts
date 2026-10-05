import { supabase, isSupabaseConfigured } from "./supabase";

export interface SupportChannelsConfig {
  email: string;
  phone: string;
  whatsapp: string;
}

export const DEFAULT_SUPPORT_CONFIG: SupportChannelsConfig = {
  email: "support@restaurantsos.in",
  phone: "+91 97722 09200",
  whatsapp: "919772209200",
};

const SUPPORT_CONFIG_STORAGE_KEY = "saas_support_channels_config";
const BROADCAST_CHANNEL_NAME = "restaurantsos_support_config_sync";

export const sanitizeWhatsappNumber = (val: string): string => {
  return (val || "").replace(/[^0-9]/g, "");
};

export const supportConfigService = {
  /**
   * Synchronously retrieves current support config from local cache or fallback default
   */
  getSupportConfig(): SupportChannelsConfig {
    try {
      const stored = localStorage.getItem(SUPPORT_CONFIG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          email: (parsed.email || "").trim() || DEFAULT_SUPPORT_CONFIG.email,
          phone: (parsed.phone || "").trim() || DEFAULT_SUPPORT_CONFIG.phone,
          whatsapp: sanitizeWhatsappNumber(parsed.whatsapp) || DEFAULT_SUPPORT_CONFIG.whatsapp,
        };
      }
    } catch (_) {}
    return DEFAULT_SUPPORT_CONFIG;
  },

  /**
   * Fetches latest support config from Supabase system_config table and updates local cache
   */
  async syncRemoteSupportConfig(): Promise<SupportChannelsConfig> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("system_config")
          .select("value")
          .eq("key", "support_channels_config")
          .maybeSingle();

        if (!error && data && data.value) {
          const val = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
          const merged: SupportChannelsConfig = {
            email: (val.email || "").trim() || DEFAULT_SUPPORT_CONFIG.email,
            phone: (val.phone || "").trim() || DEFAULT_SUPPORT_CONFIG.phone,
            whatsapp: sanitizeWhatsappNumber(val.whatsapp) || DEFAULT_SUPPORT_CONFIG.whatsapp,
          };
          try {
            localStorage.setItem(SUPPORT_CONFIG_STORAGE_KEY, JSON.stringify(merged));
          } catch (_) {}
          return merged;
        }
      } catch (err) {
        console.warn("Notice syncing remote support config:", err);
      }
    }
    return this.getSupportConfig();
  },

  /**
   * Saves updated support config locally, broadcasts across tabs, and persists to Supabase
   */
  async saveSupportConfig(config: Partial<SupportChannelsConfig>): Promise<SupportChannelsConfig> {
    const current = this.getSupportConfig();
    const updated: SupportChannelsConfig = {
      email: (config.email !== undefined ? config.email : current.email).trim() || DEFAULT_SUPPORT_CONFIG.email,
      phone: (config.phone !== undefined ? config.phone : current.phone).trim() || DEFAULT_SUPPORT_CONFIG.phone,
      whatsapp: sanitizeWhatsappNumber(config.whatsapp !== undefined ? config.whatsapp : current.whatsapp) || DEFAULT_SUPPORT_CONFIG.whatsapp,
    };

    // 1. Cache locally
    try {
      localStorage.setItem(SUPPORT_CONFIG_STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {}

    // 2. Broadcast via BroadcastChannel
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        channel.postMessage({ type: "SUPPORT_CONFIG_UPDATED", config: updated });
        channel.close();
      }
    } catch (_) {}

    // 3. Dispatch local CustomEvent
    try {
      window.dispatchEvent(new CustomEvent("support-config-updated", { detail: updated }));
    } catch (_) {}

    // 4. Persist to Supabase
    if (isSupabaseConfigured) {
      try {
        await supabase
          .from("system_config")
          .upsert({
            key: "support_channels_config",
            value: updated,
            updated_at: new Date().toISOString(),
          });
      } catch (err) {
        console.warn("Notice persisting support config to Supabase:", err);
      }
    }

    return updated;
  },

  /**
   * Subscribes to realtime updates on support config
   */
  subscribeSupportConfig(callback: (config: SupportChannelsConfig) => void): () => void {
    // Initial sync
    this.syncRemoteSupportConfig().then(callback).catch(() => {});

    // Listen to local custom event
    const handleLocalUpdate = (e: any) => {
      if (e.detail) callback(e.detail);
      else callback(this.getSupportConfig());
    };
    window.addEventListener("support-config-updated", handleLocalUpdate);

    // Listen to storage event for multi-tab
    const handleStorage = (e: StorageEvent) => {
      if (e.key === SUPPORT_CONFIG_STORAGE_KEY) {
        callback(this.getSupportConfig());
      }
    };
    window.addEventListener("storage", handleStorage);

    // BroadcastChannel listener
    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        bc.onmessage = (event) => {
          if (event.data?.type === "SUPPORT_CONFIG_UPDATED" && event.data?.config) {
            callback(event.data.config);
          }
        };
      } catch (_) {}
    }

    // Supabase Realtime Subscription
    let supaSub: any = null;
    if (isSupabaseConfigured) {
      try {
        supaSub = supabase
          .channel(`support_cfg_${Math.random().toString(36).substring(2, 9)}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "system_config",
              filter: "key=eq.support_channels_config",
            },
            () => {
              this.syncRemoteSupportConfig().then(callback).catch(() => {});
            }
          )
          .subscribe();
      } catch (_) {}
    }

    return () => {
      window.removeEventListener("support-config-updated", handleLocalUpdate);
      window.removeEventListener("storage", handleStorage);
      if (bc) {
        bc.close();
      }
      if (supaSub) {
        supabase.removeChannel(supaSub);
      }
    };
  },
};

export default supportConfigService;
