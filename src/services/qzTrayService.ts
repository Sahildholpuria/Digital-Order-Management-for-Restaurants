import qz from "qz-tray";
import { RestaurantOrder, RestaurantSettings } from "../types";

export interface QZPrinterConfig {
  kotPrinter?: string;
  billPrinter?: string;
  paperWidth: "80mm" | "58mm";
  autoPrintKOT: boolean;
  autoPrintBill: boolean;
  autoConnect: boolean;
  cutPaper: boolean;
  openCashDrawer: boolean;
}

export type QZConnectionStatus = "connected" | "connecting" | "disconnected" | "error";

const LOCAL_STORAGE_KEY = "restaurantsos_qz_config_v1";

const DEFAULT_CONFIG: QZPrinterConfig = {
  kotPrinter: "",
  billPrinter: "",
  paperWidth: "80mm",
  autoPrintKOT: true,
  autoPrintBill: true,
  autoConnect: true,
  cutPaper: true,
  openCashDrawer: false,
};

class QZTrayService {
  private status: QZConnectionStatus = "disconnected";
  private printers: string[] = [];
  private defaultPrinter: string = "";
  private config: QZPrinterConfig = DEFAULT_CONFIG;
  private listeners: Set<(status: QZConnectionStatus, printers: string[]) => void> = new Set();
  private lastError: string | null = null;
  private isSecurityConfigured = false;

  constructor() {
    this.loadStoredConfig();
  }

  public getStatus(): QZConnectionStatus {
    return this.status;
  }

  public isConnected(): boolean {
    try {
      return this.status === "connected" && qz.websocket.isActive();
    } catch {
      return false;
    }
  }

  public getPrinters(): string[] {
    return this.printers;
  }

  public getDefaultPrinterName(): string {
    return this.defaultPrinter;
  }

  public getConfig(): QZPrinterConfig {
    return { ...this.config };
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public subscribe(listener: (status: QZConnectionStatus, printers: string[]) => void): () => void {
    this.listeners.add(listener);
    // Initial notification
    listener(this.status, this.printers);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.status, this.printers);
      } catch (err) {
        console.error("Error in QZ subscriber callback:", err);
      }
    });
  }

  private loadStoredConfig() {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn("Failed to load QZ config from localStorage:", e);
      this.config = DEFAULT_CONFIG;
    }
  }

  public saveConfig(newConfig: Partial<QZPrinterConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.config));
      } catch (e) {
        console.warn("Failed to save QZ config to localStorage:", e);
      }
    }
    this.notify();
  }

  private setupSecurity() {
    if (this.isSecurityConfigured) return;
    try {
      // Configure default community / prompt mode
      qz.security.setCertificatePromise((resolve: (cert?: string) => void) => {
        resolve();
      });

      qz.security.setSignaturePromise((_toSign: string) => {
        return (resolve: (sig?: string) => void) => {
          resolve();
        };
      });

      this.isSecurityConfigured = true;
    } catch (err) {
      console.warn("QZ security configuration warning:", err);
    }
  }

  public async connect(): Promise<boolean> {
    if (this.isConnected()) {
      return true;
    }

    this.status = "connecting";
    this.lastError = null;
    this.notify();

    try {
      this.setupSecurity();

      if (!qz.websocket.isActive()) {
        await qz.websocket.connect({
          retries: 2,
          delay: 1,
        });
      }

      this.status = "connected";
      this.lastError = null;

      // Fetch printers list immediately upon connection
      await this.refreshPrinters();

      // Listen for socket closing
      qz.websocket.setClosedCallbacks(() => {
        this.status = "disconnected";
        this.notify();
      });

      qz.websocket.setErrorCallbacks((err: any) => {
        console.warn("QZ WebSocket error:", err);
        this.status = "error";
        this.lastError = err?.message || String(err);
        this.notify();
      });

      this.notify();
      return true;
    } catch (err: any) {
      console.warn("Failed to connect to QZ Tray daemon:", err);
      this.status = "disconnected";
      this.lastError = err?.message || "QZ Tray is not running locally. Please start QZ Tray.";
      this.notify();
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (qz.websocket.isActive()) {
        await qz.websocket.disconnect();
      }
    } catch (e) {
      console.warn("Error disconnecting QZ Tray:", e);
    } finally {
      this.status = "disconnected";
      this.notify();
    }
  }

  public async refreshPrinters(): Promise<string[]> {
    if (!this.isConnected()) {
      return [];
    }

    try {
      const printerList = await qz.printers.find();
      this.printers = Array.isArray(printerList) ? printerList : [printerList].filter(Boolean);

      try {
        const def = await qz.printers.getDefault();
        this.defaultPrinter = typeof def === "string" ? def : "";
      } catch {
        this.defaultPrinter = this.printers[0] || "";
      }

      // Auto-assign default printers if not yet configured
      if (!this.config.kotPrinter && this.defaultPrinter) {
        this.saveConfig({ kotPrinter: this.defaultPrinter });
      }
      if (!this.config.billPrinter && this.defaultPrinter) {
        this.saveConfig({ billPrinter: this.defaultPrinter });
      }

      this.notify();
      return this.printers;
    } catch (err: any) {
      console.error("Error fetching printers from QZ Tray:", err);
      return [];
    }
  }

  public async printHTML(options: {
    printerName?: string;
    html: string;
    paperWidth?: "80mm" | "58mm";
    jobName?: string;
  }): Promise<{ success: boolean; message?: string }> {
    const width = options.paperWidth || this.config.paperWidth || "80mm";
    const targetPrinter =
      options.printerName ||
      this.config.billPrinter ||
      this.config.kotPrinter ||
      this.defaultPrinter ||
      (this.printers.length > 0 ? this.printers[0] : null);

    if (!targetPrinter) {
      return {
        success: false,
        message: "No thermal printer configured or detected in QZ Tray.",
      };
    }

    if (!this.isConnected()) {
      const connected = await this.connect();
      if (!connected) {
        return {
          success: false,
          message: "QZ Tray connection is offline. Fallback to standard browser print.",
        };
      }
    }

    try {
      const inchWidth = width === "58mm" ? 2.28 : 3.14;

      const printConfig = qz.configs.create(targetPrinter, {
        colorType: "grayscale",
        rasterize: true,
        scaleContent: true,
        size: {
          width: inchWidth,
        },
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        units: "in",
        reopenWait: 100,
        jobName: options.jobName || "RestaurantsOS Thermal Ticket",
      });

      const printData = [
        {
          type: "pixel" as const,
          format: "html" as const,
          flavor: "plain" as const,
          data: options.html,
          options: {
            pageWidth: inchWidth,
            pageHeight: "auto",
          },
        },
      ];

      await qz.print(printConfig, printData);
      return {
        success: true,
        message: `Silent print sent directly to ${targetPrinter}`,
      };
    } catch (err: any) {
      console.error("Error during QZ silent print:", err);
      return {
        success: false,
        message: err?.message || "Failed to print via QZ Tray.",
      };
    }
  }
}

export const qzTrayService = new QZTrayService();
export default qzTrayService;
