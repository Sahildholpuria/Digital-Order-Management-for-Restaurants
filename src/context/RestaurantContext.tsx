import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import dbService from '../services/database';
import { isSupabaseConfigured, supabase } from '../services/supabase';
import {
  RestaurantSettings,
  UserProfile,
  RestaurantTable,
  MenuCategory,
  FoodItem,
  RestaurantOrder,
  PaymentRecord,
  OrderType,
  RestaurantNotification,
  OrderItem,
  OrderStatus,
  TableStatus,
  UserRole,
  ToastConfig,
  ConfirmModalConfig,
} from '../types';

import { translations, Language } from '../translations';
import { printKOTReceipt, printBillReceipt } from '../utils/printUtils';
import { qzTrayService, QZPrinterConfig, QZConnectionStatus } from '../services/qzTrayService';

interface RestaurantContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof translations.en;
  settings: RestaurantSettings | null;
  categories: MenuCategory[];
  foodItems: FoodItem[];
  tables: RestaurantTable[];
  orders: RestaurantOrder[];
  payments: PaymentRecord[];
  notifications: RestaurantNotification[];
  cart: OrderItem[];
  currentTable: RestaurantTable | null;
  currentUser: UserProfile | null;
  loading: boolean;
  tablesLoaded: boolean;
  tableNotFound: boolean;
  restaurantId: string;
  isFirebase: boolean;
  setRestaurantId: (id: string) => void;
  setCurrentTableById: (tableId: string) => void;
  setCurrentUser: (user: UserProfile | null) => void;
  
  // Cart Actions
  addToCart: (item: FoodItem, quantity: number, instructions?: string, selectedVariantName?: string) => void;
  removeFromCart: (itemId: string) => void;
  updateCartQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getCartSubtotal: () => number;
  getCartTax: () => number;
  getCartGrandTotal: () => number;

  // Database Write Actions
  placeOrder: (instructions?: string, orderType?: OrderType, customerInfo?: { name?: string; phone?: string }) => Promise<RestaurantOrder>;
  punchTableOrder: (tableId: string, items: OrderItem[], specialInstructions?: string, waiterId?: string) => Promise<RestaurantOrder>;
  punchTakeawayOrder: (items: OrderItem[], customerDetails?: { customerName?: string; customerPhone?: string; tokenNumber?: string; specialInstructions?: string }, waiterId?: string) => Promise<RestaurantOrder>;
  callWaiter: () => Promise<void>;
  requestBill: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  saveOrder: (order: RestaurantOrder) => Promise<void>;
  updateTableStatus: (tableId: string, status: TableStatus) => Promise<void>;
  addTable: (table: RestaurantTable) => Promise<void>;
  deleteTable: (tableId: string) => Promise<void>;
  addCategory: (category: MenuCategory) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  addFoodItem: (item: FoodItem) => Promise<void>;
  deleteFoodItem: (itemId: string) => Promise<void>;
  updateSettings: (updates: Partial<RestaurantSettings>) => Promise<void>;
  addPaymentRecord: (payment: PaymentRecord) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  testSoundAlert: () => void;
  
  // Auth Helpers
  loginMockUser: (email: string, role: UserRole) => Promise<UserProfile>;
  logoutUser: () => Promise<void>;

  refreshData: () => Promise<void>;

  // Toast & Modal Helper State API
  toasts: ToastConfig[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  confirmModal: ConfirmModalConfig;
  askConfirmation: (title: string, message: string, onConfirm: () => void) => void;
  closeConfirmation: () => void;

  // QZ Tray Silent Thermal Printing Station
  qzStatus: QZConnectionStatus;
  qzPrinters: string[];
  qzConfig: QZPrinterConfig;
  connectQZTray: () => Promise<boolean>;
  disconnectQZTray: () => Promise<void>;
  refreshQZPrinters: () => Promise<string[]>;
  saveQZConfig: (cfg: Partial<QZPrinterConfig>) => void;
  testQZPrint: (type: "kot" | "bill") => Promise<{ success: boolean; message?: string }>;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

/**
 * Utility to strictly purge stale/cross-tenant cached keys from localStorage.
 * Prevents flashing demo-restaurant or prior-tenant data when another user authenticates.
 */
export const clearTenantCache = (keepTenantId?: string) => {
  try {
    const isCustomerRoute = window.location.pathname.startsWith('/menu/');
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Retain global user preferences and auth session
      if (
        key === 'app_language' ||
        key === 'customer_lang' ||
        key === 'admin_lang' ||
        key === 'admin_theme' ||
        key === 'login_remember_email' ||
        key === 'login_remember_me' ||
        key === 'pos_portal_active_tab' ||
        key === 'superadmin_impersonated_tenant_id' ||
        key.startsWith('sb-')
      ) {
        continue;
      }

      // Preserve table resolution on guest menu routes
      if (isCustomerRoute && key.startsWith('resolved_rest_')) {
        continue;
      }

      // Preserve cache belonging strictly to the active tenant
      if (keepTenantId) {
        if (
          key === `cached_tables_${keepTenantId}` ||
          key === `cached_categories_${keepTenantId}` ||
          key === `cached_food_${keepTenantId}` ||
          key === `cached_settings_${keepTenantId}` ||
          key === 'last_active_staff_restaurant_id'
        ) {
          continue;
        }
      }

      // Purge cross-tenant and legacy mock caches
      if (
        key.startsWith('cached_tables_') ||
        key.startsWith('cached_categories_') ||
        key.startsWith('cached_food_') ||
        key.startsWith('cached_settings_') ||
        (!isCustomerRoute && key.startsWith('resolved_rest_')) ||
        key.includes('demo-restaurant') ||
        key === 'restaurant_settings' ||
        key === 'restaurant_categories' ||
        key === 'restaurant_foodItems' ||
        key === 'restaurant_tables' ||
        key === 'restaurant_orders' ||
        key === 'restaurant_payments' ||
        key === 'restaurant_notifications' ||
        (!keepTenantId && key === 'last_active_staff_restaurant_id')
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.warn('RestaurantsOS: Error clearing tenant cache:', e);
  }
};

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [restaurantId, setRestaurantId] = useState<string>(() => {
    const path = window.location.pathname;
    const menuMatch = path.match(/^\/menu\/([^/]+)$/);
    const trackerMatch = path.match(/^\/menu\/([^/]+)\/track\/([^/]+)$/);
    const tableId = menuMatch?.[1] || trackerMatch?.[1];
    
    if (tableId) {
      const cached = localStorage.getItem(`resolved_rest_${tableId}`) || sessionStorage.getItem(`resolved_rest_${tableId}`);
      if (cached) return cached;
      return ''; // On QR menu routes, do NOT load staff/demo restaurant while resolving table URL
    }
    
    // Check if Super Admin is currently impersonating a tenant
    const impersonated = localStorage.getItem('superadmin_impersonated_tenant_id');
    if (impersonated) return impersonated;

    const storedStaffRest = localStorage.getItem('last_active_staff_restaurant_id');
    const savedUser = localStorage.getItem('restaurant_current_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u.isSuperAdmin) {
          return storedStaffRest && storedStaffRest !== 'demo-restaurant' ? storedStaffRest : '';
        }
        if (u.restaurantId) return u.restaurantId;
      } catch (e) {}
    }
    if (storedStaffRest) return storedStaffRest;
    
    // When Supabase is configured, do not preemptively load demo-restaurant cache before auth resolves
    return isSupabaseConfigured ? '' : 'demo-restaurant';
  });
  const [isResolvingId, setIsResolvingId] = useState<boolean>(() => {
    const path = window.location.pathname;
    const isMenuRoute = path.match(/^\/menu\/([^/]+)$/) || path.match(/^\/menu\/([^/]+)\/track\/([^/]+)$/);
    if (!isMenuRoute) return false;
    
    const tableId = isMenuRoute[1];
    const cached = localStorage.getItem(`resolved_rest_${tableId}`) || sessionStorage.getItem(`resolved_rest_${tableId}`);
    return !cached;
  });
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [notifications, setNotifications] = useState<RestaurantNotification[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [currentTable, setCurrentTable] = useState<RestaurantTable | null>(null);
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('restaurant_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('restaurant_current_user');
      return !saved && isSupabaseConfigured;
    } catch {
      return false;
    }
  });
  const [tablesLoaded, setTablesLoaded] = useState<boolean>(false);
  const [tableNotFound, setTableNotFound] = useState<boolean>(false);
  const [subscriptionTrigger, setSubscriptionTrigger] = useState<number>(0);

  // Standard English Translation state
  const [lang, setLangState] = useState<Language>('en');

  const setLang = (newLang: Language) => {
    setLangState('en');
  };

  const t = translations.en;

  // Toast & Modal popup states
  const [toasts, setToasts] = useState<ToastConfig[]>([]);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalConfig>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const askConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        closeConfirmation();
      },
    });
  };

  const closeConfirmation = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  // QZ Tray State & Subscription
  const [qzStatus, setQzStatus] = useState<QZConnectionStatus>(qzTrayService.getStatus());
  const [qzPrinters, setQzPrinters] = useState<string[]>(qzTrayService.getPrinters());
  const [qzConfig, setQzConfig] = useState<QZPrinterConfig>(qzTrayService.getConfig());

  useEffect(() => {
    const unsubscribe = qzTrayService.subscribe((status, printers) => {
      setQzStatus(status);
      setQzPrinters(printers);
      setQzConfig(qzTrayService.getConfig());
    });

    // Auto-connect if enabled
    if (qzConfig.autoConnect !== false) {
      qzTrayService.connect().catch(() => {});
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const connectQZTray = async () => {
    const success = await qzTrayService.connect();
    if (success) {
      showToast("🟢 Connected to QZ Tray thermal printer service!", "success");
    } else {
      const err = qzTrayService.getLastError();
      showToast(err || "Failed to connect to QZ Tray. Ensure QZ Tray is running.", "error");
    }
    return success;
  };

  const disconnectQZTray = async () => {
    await qzTrayService.disconnect();
    showToast("QZ Tray disconnected.", "info");
  };

  const refreshQZPrinters = async () => {
    const list = await qzTrayService.refreshPrinters();
    showToast(`Discovered ${list.length} thermal printers`, "info");
    return list;
  };

  const saveQZConfig = (cfg: Partial<QZPrinterConfig>) => {
    qzTrayService.saveConfig(cfg);
    setQzConfig(qzTrayService.getConfig());
    showToast("Printer preferences saved!", "success");
  };

  const testQZPrint = async (type: "kot" | "bill") => {
    const restName = settings?.name || "Main Kitchen";
    const mockOrder: RestaurantOrder = {
      id: "test-kot-" + Date.now(),
      orderNumber: "TEST-99",
      tableId: "t-1",
      tableName: "Table 1",
      items: [
        { itemId: "item-1", name: "Paneer Butter Masala", price: 280, quantity: 2, specialInstructions: "Test Spicy" },
        { itemId: "item-2", name: "Butter Naan", price: 40, quantity: 4 }
      ],
      subtotal: 720,
      tax: 36,
      discount: 0,
      grandTotal: 756,
      status: "pending",
      createdAt: new Date().toISOString(),
      elapsedTimeStart: new Date().toISOString()
    };

    if (type === "kot") {
      const res = await printKOTReceipt(mockOrder, restName, qzConfig.paperWidth, true);
      if (res.mode === "qz-tray") {
        showToast("⚡ Test KOT sent silently to thermal printer!", "success");
      }
      return { success: true, message: "KOT printed" };
    } else {
      const res = await printBillReceipt(mockOrder, settings, qzConfig.paperWidth, true);
      if (res.mode === "qz-tray") {
        showToast("⚡ Test Receipt sent silently to thermal printer!", "success");
      }
      return { success: true, message: "Bill printed" };
    }
  };
  
  const isFirstLoad = useRef(true);
  const seenNotificationIds = useRef<Set<string>>(new Set());
  const sessionStartTime = useRef<number>(Date.now());
  const originalDocTitle = useRef<string>(document.title);

  // Update session start time whenever user logs in or switches
  useEffect(() => {
    sessionStartTime.current = Date.now();
    isFirstLoad.current = true;
    seenNotificationIds.current.clear();
  }, [currentUser?.id, restaurantId]);

  // Handle Tab Focus to clear flashing title
  useEffect(() => {
    const handleFocus = () => {
      if (originalDocTitle.current) {
        document.title = originalDocTitle.current;
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Silent audio loop & User Interaction Audio Unlocker for Mac, Windows, and Android
  useEffect(() => {
    let interval: any;
    let audioCtx: AudioContext | null = null;

    const startKeepAlive = () => {
      if (audioCtx) return;
      try {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Play tiny silent sound every 10 seconds to keep Web Audio process active in background
        interval = setInterval(() => {
          if (!audioCtx) return;
          if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
          }
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          gain.gain.setValueAtTime(0, audioCtx.currentTime); // SILENT (0 volume)
          osc.start();
          osc.stop(audioCtx.currentTime + 0.05);
        }, 10000);
      } catch (e) {
        console.warn('Audio keep-alive failed to initialize:', e);
      }
    };

    // Trigger on first user interaction to unlock audio & request native web notifications
    const handleInteraction = () => {
      startKeepAlive();
      if ('speechSynthesis' in window && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    return () => {
      if (interval) clearInterval(interval);
      if (audioCtx) audioCtx.close();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  const syncSupabaseProfile = async (user: any) => {
    try {
      // Query directly by user ID — avoids relying on context restaurantId
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Profile found — map to frontend shape
        const isSuper = !!data.is_super_admin;
        const impersonatedTenant = localStorage.getItem('superadmin_impersonated_tenant_id');

        let targetRestaurantId: string;
        if (isSuper && impersonatedTenant) {
          // Super Admin is impersonating a tenant: retain tenant context
          targetRestaurantId = impersonatedTenant;
          clearTenantCache(targetRestaurantId);
          setRestaurantId(targetRestaurantId);
          localStorage.setItem('last_active_staff_restaurant_id', targetRestaurantId);
        } else if (isSuper) {
          // Super Admin in Central SaaS Mode
          targetRestaurantId = '';
          clearTenantCache();
          setRestaurantId('');
          localStorage.removeItem('last_active_staff_restaurant_id');
        } else {
          // Normal staff account
          targetRestaurantId = data.restaurant_id || '';
          clearTenantCache(targetRestaurantId);
          setRestaurantId(targetRestaurantId);
          if (targetRestaurantId) {
            localStorage.setItem('last_active_staff_restaurant_id', targetRestaurantId);
          }
        }

        const profile: UserProfile = {
          id: data.id,
          restaurantId: isSuper ? (impersonatedTenant || undefined) : (data.restaurant_id || undefined),
          name: data.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Staff',
          email: data.email || user.email || '',
          role: data.role || 'admin',
          isSuperAdmin: isSuper,
          createdAt: data.created_at || new Date().toISOString(),
        };
        try { localStorage.setItem('restaurant_current_user', JSON.stringify(profile)); } catch (_) {}
        setCurrentUserState(profile);
      } else {
        // Profile genuinely missing (e.g. legacy account) — only insert then
        const isSuper = user.email === 'superadmin@restaurant.com' || user.email?.includes('super') || false;
        const profile: UserProfile = {
          id: user.id,
          restaurantId: isSuper ? undefined : 'demo-restaurant',
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Staff Member',
          email: user.email || '',
          role: 'admin',
          isSuperAdmin: isSuper,
          createdAt: new Date().toISOString(),
        };
        await dbService.addUser(isSuper ? '' : 'demo-restaurant', profile);
        if (!isSuper) {
          setRestaurantId('demo-restaurant');
        }
        setCurrentUserState(profile);
      }
    } catch (err) {
      console.error('Error syncing user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load User Auth State (Supabase or LocalMock)
  useEffect(() => {
    const clearState = () => {
      setCurrentUserState(null);
      setSettings(null);
      setCategories([]);
      setFoodItems([]);
      setTables([]);
      setOrders([]);
      setPayments([]);
      setNotifications([]);
      setCurrentTable(null);
      localStorage.removeItem('last_active_staff_restaurant_id');
      localStorage.removeItem('restaurant_current_user');
      clearTenantCache();
    };

    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          syncSupabaseProfile(session.user);
        } else {
          clearState();
          setLoading(false);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          syncSupabaseProfile(session.user);
        } else {
          clearState();
          setLoading(false);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      const savedUser = localStorage.getItem('restaurant_current_user');
      if (savedUser) {
        setCurrentUserState(JSON.parse(savedUser));
      } else {
        clearState();
      }
      setLoading(false);
    }
  }, [restaurantId]);

  // Sync restaurantId with logged-in user's profile restaurantId
  useEffect(() => {
    if (currentUser?.isSuperAdmin) {
      // Super Admin is platform-level: starts with empty restaurant context unless actively impersonating
      const storedImpersonating = localStorage.getItem('last_active_staff_restaurant_id');
      if (storedImpersonating && storedImpersonating !== 'demo-restaurant') {
        setRestaurantId(storedImpersonating);
      } else {
        setRestaurantId('');
        localStorage.removeItem('last_active_staff_restaurant_id');
      }
    } else if (currentUser?.restaurantId) {
      setRestaurantId(currentUser.restaurantId);
      localStorage.setItem('last_active_staff_restaurant_id', currentUser.restaurantId);
    }
  }, [currentUser]);

  // Screen Wake Lock API to prevent devices from sleeping/locking during restaurant shifts
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && currentUser) {
          wakeLock = await (navigator.wakeLock as any).request('screen');
        }
      } catch (err) {
        console.warn('RestaurantsOS: Failed to acquire screen wake lock:', err);
      }
    };

    const handleVisibilityChange = async () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    if (currentUser) {
      requestWakeLock();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().then(() => {
          wakeLock = null;
        }).catch(() => {});
      }
    };
  }, [currentUser]);

  // Resolve restaurantId from URL tableId for guest customers
  useEffect(() => {
    const resolveRestaurantFromUrl = async () => {
      const menuMatch = window.location.pathname.match(/^\/menu\/([^/]+)$/);
      const trackerMatch = window.location.pathname.match(/^\/menu\/([^/]+)\/track\/([^/]+)$/);
      const tableId = menuMatch?.[1] || trackerMatch?.[1];
      
      if (tableId) {
        const cached = localStorage.getItem(`resolved_rest_${tableId}`) || sessionStorage.getItem(`resolved_rest_${tableId}`);
        if (cached) {
          setRestaurantId(cached);
          setIsResolvingId(false);
          setTableNotFound(false);
          return;
        }
        
        setIsResolvingId(true);
        setTableNotFound(false);
        try {
          const resolvedId = await dbService.getRestaurantIdByTableId(tableId);
          if (resolvedId) {
            localStorage.setItem(`resolved_rest_${tableId}`, resolvedId);
            sessionStorage.setItem(`resolved_rest_${tableId}`, resolvedId);
            setRestaurantId(resolvedId);
            setTableNotFound(false);
          } else {
            setTableNotFound(true);
          }
        } catch (err) {
          console.error('Failed to resolve restaurant from table URL:', err);
          setTableNotFound(true);
        } finally {
          setIsResolvingId(false);
        }
      } else {
        setIsResolvingId(false);
        setTableNotFound(false);
      }
    };
    
    resolveRestaurantFromUrl();
  }, [window.location.pathname]);

  // Load Settings and Real-time Listeners
  useEffect(() => {
    if (loading || !restaurantId) return;

    // If no active restaurant selected (e.g. Super Admin on SaaS dashboard), reset tenant state
    if (!restaurantId) {
      setTablesLoaded(true);
      setSettings(null);
      setCategories([]);
      setFoodItems([]);
      setTables([]);
      setOrders([]);
      setPayments([]);
      setNotifications([]);
      return;
    }

    // Reset tablesLoaded for new restaurantId to prevent flash of wrong table cache
    setTablesLoaded(false);

    // Hydrate local cache immediately for low-connectivity support (0ms load)
    try {
      const cachedTables = localStorage.getItem(`cached_tables_${restaurantId}`);
      if (cachedTables) {
        const parsed = JSON.parse(cachedTables);
        if (parsed && parsed.length > 0) {
          setTables(parsed);
          setTablesLoaded(true);
        } else {
          setTables([]);
        }
      } else {
        setTables([]);
      }
      const cachedCats = localStorage.getItem(`cached_categories_${restaurantId}`);
      if (cachedCats) {
        const parsed = JSON.parse(cachedCats);
        if (parsed && parsed.length > 0) setCategories(parsed);
        else setCategories([]);
      } else {
        setCategories([]);
      }
      const cachedFood = localStorage.getItem(`cached_food_${restaurantId}`);
      if (cachedFood) {
        const parsed = JSON.parse(cachedFood);
        if (parsed && parsed.length > 0) setFoodItems(parsed);
        else setFoodItems([]);
      } else {
        setFoodItems([]);
      }
      const cachedSet = localStorage.getItem(`cached_settings_${restaurantId}`);
      if (cachedSet) {
        const parsed = JSON.parse(cachedSet);
        if (parsed) setSettings(parsed);
      }
    } catch (e) {}

    let unsubSettings: () => void = () => {};
    let unsubTables: () => void = () => {};
    let unsubCategories: () => void = () => {};
    let unsubFoodItems: () => void = () => {};
    let unsubOrders: () => void = () => {};
    let unsubPayments: () => void = () => {};
    let unsubNotifications: () => void = () => {};

    const loadData = async () => {
      try {
        await dbService.cleanupExpiredOrders(restaurantId);
      } catch (e) {
        console.warn('cleanupExpiredOrders error:', e);
      }

      const isStaffUser = !!currentUser;
      // Subscriptions active for all users (Staff & Guest Customers) so menu updates/deletions reflect instantly on Customer Menu
      try {
        unsubCategories = dbService.subscribeCategories(restaurantId, (data) => {
          setCategories(data);
          try { localStorage.setItem(`cached_categories_${restaurantId}`, JSON.stringify(data)); } catch (e) {}
        });
      } catch (e) { console.error('subscribeCategories error:', e); }

      try {
        unsubFoodItems = dbService.subscribeFoodItems(restaurantId, (data) => {
          setFoodItems(data);
          try { localStorage.setItem(`cached_food_${restaurantId}`, JSON.stringify(data)); } catch (e) {}
        });
      } catch (e) { console.error('subscribeFoodItems error:', e); }

      if (isStaffUser) {
        // Staff Users (Admin, Manager, Waiter, Kitchen, Cashier) need full Real-time WebSockets
        try {
          unsubSettings = dbService.subscribeSettings(restaurantId, (data) => {
            setSettings(data);
            try { localStorage.setItem(`cached_settings_${restaurantId}`, JSON.stringify(data)); } catch (e) {}
          });
        } catch (e) { console.error('subscribeSettings error:', e); }

        try {
          unsubTables = dbService.subscribeTables(restaurantId, (data) => {
            setTables(data);
            setTablesLoaded(true);
            try { localStorage.setItem(`cached_tables_${restaurantId}`, JSON.stringify(data)); } catch (e) {}
            if (currentTable) {
              const updated = data.find(t => t.id === currentTable.id);
              if (updated) setCurrentTable(updated);
            }
          });
        } catch (e) {
          console.error('subscribeTables error:', e);
          setTablesLoaded(true);
        }

        try {
          unsubOrders = dbService.subscribeOrders(restaurantId, (data) => {
            setOrders(data);
          });
        } catch (e) { console.error('subscribeOrders error:', e); }

        try {
          unsubNotifications = dbService.subscribeNotifications(restaurantId, (data) => {
            setNotifications(data);
            
            data.forEach(n => {
              if (n.type === 'new_order' && !n.isRead && !seenNotificationIds.current.has(n.id)) {
                seenNotificationIds.current.add(n.id);
                const notifyTime = n.createdAt ? new Date(n.createdAt).getTime() : 0;
                const isLiveCreatedDuringSession = notifyTime >= (sessionStartTime.current - 5000);

                if (!isFirstLoad.current || isLiveCreatedDuringSession) {
                  triggerNotificationSoundAndSpeech(n);
                }
              }
            });

            isFirstLoad.current = false;
          });
        } catch (e) { console.error('subscribeNotifications error:', e); }

        if (currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'cashier') {
          try {
            unsubPayments = dbService.subscribePayments(restaurantId, (data) => {
              setPayments(data);
            });
          } catch (e) { console.error('subscribePayments error:', e); }
        }
      } else {
        // Guest Customer Mode
        try {
          const [sData, tData] = await Promise.all([
            dbService.getSettings(restaurantId),
            dbService.getTables(restaurantId)
          ]);
          if (sData) setSettings(sData);
          if (tData) {
            setTables(tData);
            setTablesLoaded(true);
          }
        } catch (err) {
          console.error('Guest data fetch error:', err);
          setTablesLoaded(true);
        }

        // Guest customer only subscribes to live orders for their table
        try {
          unsubOrders = dbService.subscribeOrders(restaurantId, (data) => {
            setOrders(data);
          });
        } catch (e) { console.error('subscribeOrders error:', e); }
      }
    };

    loadData();

    return () => {
      unsubSettings();
      unsubTables();
      unsubCategories();
      unsubFoodItems();
      unsubOrders();
      unsubPayments();
      unsubNotifications();
    };
  }, [restaurantId, currentTable?.id, subscriptionTrigger, currentUser?.id, loading]);

  // Trigger Sound, Speech Synthesis & Background Notifications
  const triggerNotificationSoundAndSpeech = (n: RestaurantNotification) => {
    // Only play sound and announce speech for new customer orders
    if (n.type !== 'new_order') return;

    try {
      const soundEnabled = settings?.enableSoundNotification ?? true;
      if (!soundEnabled) return;

      const tableCleanName = n.tableName.replace(/Table\s*/i, '');

      // 1. Native Desktop / Mobile Background Notification
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`🔔 NEW ORDER - Table ${tableCleanName}`, {
            body: `Order received from Table ${tableCleanName}. Tap to view.`,
            icon: '/favicon.ico',
            tag: n.id,
          });
        } catch (e) {
          console.warn('Native notification error:', e);
        }
      }

      // 2. Background Tab Title Flashing
      if (document.hidden) {
        document.title = `🔔 (1) NEW ORDER - Table ${tableCleanName}!`;
      }

      // 3. Rich 4-note ascending chime with smooth fade-in/out envelopes
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Explicitly resume audio context (fixes browser auto-play policies/suspensions on macOS, Windows, Android)
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }

      const playNote = (freq: number, startTime: number, duration: number, peakGain: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
      };

      const t = audioCtx.currentTime;

      // 4-note ascending bell sequence: C5 → E5 → G5 → C6
      playNote(523.25, t + 0.0,  0.35, 0.95); // C5
      playNote(659.25, t + 0.22, 0.35, 0.95); // E5
      playNote(783.99, t + 0.44, 0.35, 0.95); // G5
      playNote(1046.5, t + 0.66, 0.55, 1.0);  // C6

      // 4. Speech Synthesis Voice Announcement (strictly for new customer orders)
      if ('speechSynthesis' in window) {
        const speechMessage = `New order received from Table ${tableCleanName}.`;

        setTimeout(() => {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          const speech = new SpeechSynthesisUtterance(speechMessage);
          speech.rate = 0.78;   // Slower for clarity
          speech.pitch = 1.05;  // Warm tone
          speech.volume = 1.0;
          speech.lang = 'en-US';

          const voices = window.speechSynthesis.getVoices();
          const preferredVoice =
            voices.find(v => v.name.includes('Samantha')) ||     // macOS premium
            voices.find(v => v.name.includes('Google US English')) || // Chrome / Android
            voices.find(v => v.name.includes('Microsoft Aria')) ||    // Edge / Windows
            voices.find(v => v.lang === 'en-US' && v.localService) ||
            voices.find(v => v.lang.startsWith('en'));

          if (preferredVoice) speech.voice = preferredVoice;

          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(speech);
        }, 900);
      }
    } catch (e) {
      console.warn('Notification audio/speech synthesis blocked by browser:', e);
    }
  };

  const setCurrentTableById = (tableId: string) => {
    const cleanNum = tableId.replace(/^table-/i, '');
    const table = tables.find(t => 
      t.id === tableId || 
      t.number === cleanNum || 
      t.number === tableId ||
      t.id.replace(/^table-/i, '') === cleanNum
    );
    if (table) {
      setCurrentTable(table);
    } else {
      // Create temporary local table state if not loaded yet
      setCurrentTable({
        id: tableId,
        number: cleanNum,
        capacity: 4,
        status: 'available',
        qrCodeUrl: '',
        updatedAt: new Date().toISOString()
      });
    }
  };

  // Re-sync currentTable when tables array updates from Supabase/realtime
  useEffect(() => {
    if (currentTable && tables.length > 0) {
      const cleanNum = currentTable.number || currentTable.id.replace(/^table-/i, '');
      const matched = tables.find(t => 
        t.id === currentTable.id || 
        t.number === cleanNum || 
        t.number === currentTable.number ||
        t.id.replace(/^table-/i, '') === cleanNum
      );
      if (matched && (matched.id !== currentTable.id || matched.status !== currentTable.status)) {
        setCurrentTable(matched);
      }
    }
  }, [tables]);

  const setCurrentUser = (user: UserProfile | null) => {
    setCurrentUserState(user);
    if (!isSupabaseConfigured) {
      if (user) {
        localStorage.setItem('restaurant_current_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('restaurant_current_user');
      }
    }
  };

  // CART LOGIC
  const addToCart = (item: FoodItem, quantity: number, instructions?: string, selectedVariantName?: string) => {
    setCart(prev => {
      let finalName = item.name;
      let finalPrice = item.price;
      let uniqueId = item.id;

      if (selectedVariantName && item.description && item.description.includes('||variants:')) {
        const [, variantsStr] = item.description.split('||variants:');
        const variants = variantsStr.split(';').map(v => {
          const [name, price] = v.split('=');
          return { name, price: Number(price) };
        });
        const matched = variants.find(v => v.name === selectedVariantName);
        if (matched) {
          finalName = `${item.name} (${matched.name})`;
          finalPrice = matched.price;
          uniqueId = `${item.id}-${matched.name}`;
        }
      }

      const discountedPrice = finalPrice * (1 - (item.discountPercentage || 0) / 100);

      const existing = prev.find(i => i.itemId === uniqueId);
      if (existing) {
        return prev.map(i =>
          i.itemId === uniqueId
            ? { ...i, quantity: i.quantity + quantity, specialInstructions: instructions || i.specialInstructions }
            : i
        );
      }
      return [...prev, {
        itemId: uniqueId,
        name: finalName,
        price: discountedPrice,
        quantity,
        specialInstructions: instructions,
      }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.itemId !== itemId));
  };

  const updateCartQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(prev => prev.map(i => i.itemId === itemId ? { ...i, quantity } : i));
  };

  const clearCart = () => setCart([]);

  const getCartSubtotal = () => {
    const sum = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    return Math.round(sum * 100) / 100;
  };

  const getCartTax = () => {
    const taxRate = settings?.taxPercentage ?? 0;
    const tax = getCartSubtotal() * (taxRate / 100);
    return Math.round(tax * 100) / 100;
  };

  const getCartGrandTotal = () => {
    const total = getCartSubtotal() + getCartTax();
    return Math.round(total * 100) / 100;
  };

  // PLACE ORDER (Supports Dine-In Tables & Customer Takeaway Pickup)
  const placeOrder = async (
    instructions?: string,
    orderType: OrderType = "dine_in",
    customerInfo?: { name?: string; phone?: string }
  ): Promise<RestaurantOrder> => {
    if (cart.length === 0) throw new Error("Cart is empty");
    if (orderType === "dine_in" && !currentTable) throw new Error("Table not assigned");

    const isTakeaway = orderType === "takeaway";
    const todayTakeaways = orders.filter(o => {
      const isToday = new Date(o.createdAt).toDateString() === new Date().toDateString();
      return isToday && o.orderType === "takeaway";
    });
    const tokenStr = isTakeaway ? `TK-${String(todayTakeaways.length + 1).padStart(2, "0")}` : undefined;
    const cleanTableName = isTakeaway ? `Takeaway • ${tokenStr}` : `Table ${currentTable?.number || ""}`;

    const taxRate = settings?.taxPercentage ?? 0;
    const subtotal = getCartSubtotal();
    const tax = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const grandTotal = Math.round((subtotal + tax) * 100) / 100;
    const orderNum = `${isTakeaway ? "TAK" : "ORD"}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: RestaurantOrder = {
      id: `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderNumber: orderNum,
      tableId: isTakeaway ? "takeaway" : (currentTable ? currentTable.id : "takeaway"),
      tableName: cleanTableName,
      tableFloor: isTakeaway ? undefined : currentTable?.floor,
      orderType,
      customerName: customerInfo?.name?.trim() || undefined,
      customerPhone: customerInfo?.phone?.trim() || undefined,
      tokenNumber: tokenStr,
      items: cart.map(c => ({
        ...c,
        specialInstructions: c.specialInstructions || instructions || "",
      })),
      subtotal,
      tax,
      discount: 0,
      grandTotal,
      status: "pending",
      createdAt: new Date().toISOString(),
      elapsedTimeStart: new Date().toISOString(),
    };

    // Save order to database
    await dbService.saveOrder(restaurantId, newOrder);
    
    // Update table status to occupied if Dine-In
    if (!isTakeaway && currentTable) {
      try {
        await dbService.updateTableStatus(restaurantId, currentTable.id, "occupied");
      } catch (err) {
        console.warn("Table status auto-update notice:", err);
      }
      setCurrentTable(prev => prev ? { ...prev, status: "occupied" } : null);
      setTables(prev => prev.map(t => {
        const cleanNum = currentTable.number || currentTable.id.replace(/^table-/i, "");
        if (t.id === currentTable.id || t.number === cleanNum || t.number === currentTable.number || t.id.replace(/^table-/i, "") === cleanNum) {
          return { ...t, status: "occupied", updatedAt: new Date().toISOString() };
        }
        return t;
      }));
    }

    // Add alert notification for kitchen/staff
    try {
      const notification: RestaurantNotification = {
        id: `notify-${Date.now()}`,
        type: "new_order",
        tableId: isTakeaway ? "takeaway" : (currentTable?.id || "takeaway"),
        tableName: cleanTableName,
        orderId: newOrder.id,
        message: isTakeaway
          ? `New Takeaway pickup order ${orderNum} (${tokenStr}) received.`
          : `New order ${orderNum} received from Table ${currentTable?.number}.`,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      await dbService.addNotification(restaurantId, notification);
    } catch (_) {}

    clearCart();
    return newOrder;
  };

  // CAPTAIN DIRECT TAKEAWAY / PARCEL ORDER PUNCHING
  const punchTakeawayOrder = async (
    items: OrderItem[],
    customerDetails?: {
      customerName?: string;
      customerPhone?: string;
      tokenNumber?: string;
      specialInstructions?: string;
    },
    waiterId?: string
  ): Promise<RestaurantOrder> => {
    if (!items || items.length === 0) throw new Error("Order items list cannot be empty");

    // Calculate sequential token number if not provided
    const todayOrders = orders.filter(o => {
      const isToday = new Date(o.createdAt).toDateString() === new Date().toDateString();
      return isToday && o.orderType === "takeaway";
    });
    const tokenStr = customerDetails?.tokenNumber?.trim() || `TK-${String(todayOrders.length + 1).padStart(2, "0")}`;
    const cleanTableName = `Takeaway • ${tokenStr}`;

    const taxRate = settings?.taxPercentage ?? 0;
    const subtotal = Math.round(items.reduce((sum, i) => sum + (i.price * i.quantity), 0) * 100) / 100;
    const tax = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const grandTotal = Math.round((subtotal + tax) * 100) / 100;
    const orderNum = `TAK-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: RestaurantOrder = {
      id: `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderNumber: orderNum,
      tableId: "takeaway",
      tableName: cleanTableName,
      orderType: "takeaway",
      customerName: customerDetails?.customerName?.trim() || undefined,
      customerPhone: customerDetails?.customerPhone?.trim() || undefined,
      tokenNumber: tokenStr,
      orderNotes: customerDetails?.specialInstructions?.trim() || undefined,
      items: items.map(c => ({
        ...c,
        specialInstructions: c.specialInstructions || customerDetails?.specialInstructions || "",
      })),
      subtotal,
      tax,
      discount: 0,
      grandTotal,
      status: "preparing", // Sent straight to kitchen prep queue
      createdAt: new Date().toISOString(),
      elapsedTimeStart: new Date().toISOString(),
      waiterId: (waiterId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(waiterId))
        ? waiterId
        : (currentUser?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser.id))
          ? currentUser.id
          : undefined,
    };

    // Save order to database
    await dbService.saveOrder(restaurantId, newOrder);

    // Optimistically update orders list
    setOrders(prev => [newOrder, ...prev]);

    // Dispatch real-time notification
    try {
      const notification: RestaurantNotification = {
        id: `notify-${Date.now()}`,
        type: "new_order",
        tableId: "takeaway",
        tableName: cleanTableName,
        orderId: newOrder.id,
        message: `New Takeaway order ${orderNum} (${tokenStr}) placed.`,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      await dbService.addNotification(restaurantId, notification);
    } catch (_) {}

    // Auto silent thermal KOT printing via QZ Tray if online
    if (qzTrayService.isConnected() && qzConfig.autoPrintKOT !== false) {
      try {
        await printKOTReceipt(newOrder, settings?.name || "Kitchen", qzConfig.paperWidth, false);
      } catch (err) {
        console.warn("Auto QZ KOT takeaway print notice:", err);
      }
    }

    return newOrder;
  };

  // CAPTAIN DIRECT ORDER PUNCHING WITH INSTANT KOT GENERATION
  const punchTableOrder = async (
    tableId: string,
    items: OrderItem[],
    specialInstructions?: string,
    waiterId?: string
  ): Promise<RestaurantOrder> => {
    if (!items || items.length === 0) throw new Error("Order items list cannot be empty");
    
    // Find target table
    const targetTable = tables.find(t => t.id === tableId || t.number === tableId);
    const tableNumber = targetTable ? targetTable.number : tableId.replace(/^table-/i, "");
    const cleanTableName = `Table ${tableNumber}`;

    const taxRate = settings?.taxPercentage ?? 0;
    const subtotal = Math.round(items.reduce((sum, i) => sum + (i.price * i.quantity), 0) * 100) / 100;
    const tax = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const grandTotal = Math.round((subtotal + tax) * 100) / 100;
    const orderNum = `KOT-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: RestaurantOrder = {
      id: `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderNumber: orderNum,
      tableId: targetTable ? targetTable.id : tableId,
      tableName: cleanTableName,
      tableFloor: targetTable?.floor,
      orderType: "dine_in",
      items: items.map(c => ({
        ...c,
        specialInstructions: c.specialInstructions || specialInstructions || "",
      })),
      subtotal,
      tax,
      discount: 0,
      grandTotal,
      status: "preparing", // Directly preparing for instant kitchen ticket
      createdAt: new Date().toISOString(),
      elapsedTimeStart: new Date().toISOString(),
      waiterId: (waiterId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(waiterId))
        ? waiterId
        : (currentUser?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser.id))
          ? currentUser.id
          : undefined,
    };

    // Save order to database
    await dbService.saveOrder(restaurantId, newOrder);

    // Optimistically update orders list
    setOrders(prev => [newOrder, ...prev]);

    // Update table status to occupied automatically in DB and state
    if (targetTable) {
      try {
        await dbService.updateTableStatus(restaurantId, targetTable.id, "occupied");
      } catch (err) {
        console.warn("Table status auto-update notice:", err);
      }

      setTables(prev => prev.map(t => {
        if (t.id === targetTable.id) {
          return { ...t, status: "occupied", updatedAt: new Date().toISOString() };
        }
        return t;
      }));
    }

    // Add notification for kitchen/staff
    try {
      const notification: RestaurantNotification = {
        id: `notify-${Date.now()}`,
        type: "new_order",
        tableId: targetTable ? targetTable.id : tableId,
        tableName: cleanTableName,
        orderId: newOrder.id,
        message: `⚡ Captain punched new order ${orderNum} for Table ${tableNumber}.`,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      await dbService.addNotification(restaurantId, notification);
    } catch (_) {}

    // Auto-generate and print KOT ticket
    try {
      printKOTReceipt(newOrder, settings?.name || "Kitchen", "80mm", true);
    } catch (printErr) {
      console.warn("Auto KOT printing notice:", printErr);
    }

    return newOrder;
  };

  const callWaiter = async () => {
    if (!currentTable) return;
    const notification: RestaurantNotification = {
      id: `notify-${Date.now()}`,
      type: 'call_waiter',
      tableId: currentTable.id,
      tableName: `Table ${currentTable.number}`,
      message: `Table ${currentTable.number} is requesting a waiter.`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    await dbService.addNotification(restaurantId, notification);
  };

  const requestBill = async () => {
    if (!currentTable) return;
    const notification: RestaurantNotification = {
      id: `notify-${Date.now()}`,
      type: 'request_bill',
      tableId: currentTable.id,
      tableName: `Table ${currentTable.number}`,
      message: `Table ${currentTable.number} is requesting the bill.`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    await dbService.addNotification(restaurantId, notification);
  };

  // STAFF OPERATIONS
  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const updatedOrder = { ...order, status };
    
    // Instant Optimistic UI Update
    setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
    
    // Persist to Database
    await dbService.saveOrder(restaurantId, updatedOrder);

    // Auto-print Kitchen Order Ticket (KOT) automatically ONCE when order is accepted
    if (status === 'accepted' || (status === 'preparing' && order.status === 'pending')) {
      try {
        printKOTReceipt(updatedOrder, settings?.name || 'Kitchen');
      } catch (err) {
        console.warn('Auto KOT printing warning:', err);
      }
    }

    // If order completed or cancelled, release the table status if no other active order
    if (status === 'completed' || status === 'cancelled') {
      const activeTableOrders = orders.filter(o => o.tableId === order.tableId && o.id !== order.id && !['completed', 'cancelled'].includes(o.status));
      if (activeTableOrders.length === 0) {
        const table = tables.find(t => t.id === order.tableId);
        if (table && table.status === 'occupied') {
          setTables(prev => prev.map(t => t.id === table.id ? { ...t, status: 'available' } : t));
          await dbService.updateTableStatus(restaurantId, table.id, 'available');
        }
      }
    }
  };

  const saveOrder = async (order: RestaurantOrder) => {
    // Instant Optimistic UI Update
    setOrders(prev => {
      const exists = prev.some(o => o.id === order.id);
      return exists ? prev.map(o => o.id === order.id ? order : o) : [order, ...prev];
    });
    await dbService.saveOrder(restaurantId, order);
  };

  const updateTableStatus = async (tableId: string, status: TableStatus) => {
    // Instant Optimistic UI Update
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, status } : t));
    await dbService.updateTableStatus(restaurantId, tableId, status);
  };

  const addTable = async (table: RestaurantTable) => {
    // Instant Optimistic UI Update
    setTables(prev => {
      const exists = prev.some(t => t.id === table.id);
      if (exists) {
        return prev.map(t => t.id === table.id ? table : t);
      }
      return [...prev, table].sort((a, b) => a.number.localeCompare(b.number));
    });
    await dbService.saveTable(restaurantId, table);
  };

  const deleteTable = async (tableId: string) => {
    // Instant Optimistic UI Update
    setTables(prev => prev.filter(t => t.id !== tableId));
    await dbService.deleteTable(restaurantId, tableId);
  };

  const addCategory = async (category: MenuCategory) => {
    // Instant Optimistic UI Update
    setCategories(prev => {
      const exists = prev.some(c => c.id === category.id);
      if (exists) return prev.map(c => c.id === category.id ? category : c);
      return [...prev, category].sort((a, b) => a.order - b.order);
    });
    await dbService.saveCategory(restaurantId, category);
  };

  const deleteCategory = async (categoryId: string) => {
    // Instant Optimistic UI Update
    setCategories(prev => prev.filter(c => c.id !== categoryId));
    await dbService.deleteCategory(restaurantId, categoryId);
  };

  const addFoodItem = async (item: FoodItem) => {
    // Instant Optimistic UI Update
    setFoodItems(prev => {
      const exists = prev.some(f => f.id === item.id);
      if (exists) return prev.map(f => f.id === item.id ? item : f);
      return [...prev, item];
    });
    await dbService.saveFoodItem(restaurantId, item);
  };

  const deleteFoodItem = async (itemId: string) => {
    // Instant Optimistic UI Update
    setFoodItems(prev => prev.filter(f => f.id !== itemId));
    await dbService.deleteFoodItem(restaurantId, itemId);
  };

  const updateSettings = async (updates: Partial<RestaurantSettings>) => {
    // Instant Optimistic UI Update
    setSettings(prev => prev ? { ...prev, ...updates } : null);
    await dbService.updateSettings(restaurantId, updates);
  };

  const addPaymentRecord = async (payment: PaymentRecord) => {
    // Instant Optimistic UI Update
    setPayments(prev => [payment, ...prev]);
    await dbService.addPayment(restaurantId, payment);
  };

  const markNotificationRead = async (id: string) => {
    // Instant Optimistic UI Update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    await dbService.markNotificationRead(restaurantId, id);
  };

  const clearAllNotifications = async () => {
    // Instant Optimistic UI Update
    setNotifications([]);
    await dbService.clearAllNotifications(restaurantId);
  };

  // MOCK AUTH
  const loginMockUser = async (email: string, role: UserRole): Promise<UserProfile> => {
    const isSuper = email === 'superadmin@restaurant.com' || email.includes('super');
    const mockRestaurantId = isSuper ? '' : (restaurantId || 'demo-restaurant');
    if (!isSuper) {
      clearTenantCache(mockRestaurantId);
      setRestaurantId(mockRestaurantId);
      localStorage.setItem('last_active_staff_restaurant_id', mockRestaurantId);
    } else {
      clearTenantCache();
      setRestaurantId('');
      localStorage.removeItem('last_active_staff_restaurant_id');
    }

    const users = isSuper ? await dbService.getAllUsers() : await dbService.getUsers(mockRestaurantId);
    let found = users.find(u => u.email === email && (isSuper ? true : u.role === role));
    if (!found) {
      found = {
        id: `mock-user-${Date.now()}`,
        restaurantId: isSuper ? undefined : mockRestaurantId,
        name: email.split('@')[0].toUpperCase(),
        email,
        role: isSuper ? 'admin' : role,
        isSuperAdmin: isSuper,
        createdAt: new Date().toISOString()
      };
      await dbService.addUser(mockRestaurantId, found);
    }
    setCurrentUser(found);
    return found;
  };

  const logoutUser = async () => {
    localStorage.removeItem('superadmin_impersonated_tenant_id');
    clearTenantCache();
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    } else {
      setCurrentUser(null);
    }
  };

  const refreshData = async () => {
    try {
      showToast('Refreshing live restaurant details & orders...', 'info');
      const [fetchedSettings, fetchedTables, fetchedCats, fetchedFood, fetchedOrders, fetchedPayments, fetchedNotifs] = await Promise.all([
        dbService.getSettings(restaurantId),
        dbService.getTables(restaurantId),
        dbService.getCategories(restaurantId),
        dbService.getFoodItems(restaurantId),
        dbService.getOrders(restaurantId),
        dbService.getPaymentRecords(restaurantId),
        dbService.getNotifications(restaurantId),
      ]);
      if (fetchedSettings) setSettings(fetchedSettings);
      if (fetchedTables) {
        setTables(fetchedTables);
        setTablesLoaded(true);
      }
      if (fetchedCats) setCategories(fetchedCats);
      if (fetchedFood) setFoodItems(fetchedFood);
      if (fetchedOrders) setOrders(fetchedOrders);
      if (fetchedPayments) setPayments(fetchedPayments);
      if (fetchedNotifs) setNotifications(fetchedNotifs);
      showToast('All details & live orders refreshed!', 'success');
    } catch (err) {
      console.error('Failed to refresh data:', err);
      showToast('Failed to refresh details. Please try again.', 'error');
    }
  };

  const testSoundAlert = () => {
    try {
      const mockNotif: RestaurantNotification = {
        id: `test-${Date.now()}`,
        type: 'new_order',
        tableId: 'test-table',
        tableName: 'Table 1',
        orderId: 'test-order',
        message: 'Sound Test Alert',
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      triggerNotificationSoundAndSpeech(mockNotif);
      showToast('🔔 Sound Chime & Voice Alert Tested Successfully!', 'success');
    } catch (err) {
      console.error('Test sound error:', err);
    }
  };

  return (
    <RestaurantContext.Provider value={{
      lang,
      setLang,
      t,
      settings,
      categories,
      foodItems,
      tables,
      orders,
      payments,
      notifications,
      cart,
      currentTable,
      currentUser,
      loading: loading || isResolvingId,
      tablesLoaded,
      tableNotFound,
      restaurantId,
      isFirebase: isSupabaseConfigured,
      setRestaurantId,
      setCurrentTableById,
      setCurrentUser,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      getCartSubtotal,
      getCartTax,
      getCartGrandTotal,
      placeOrder,
      punchTableOrder,
      punchTakeawayOrder,
      callWaiter,
      requestBill,
      updateOrderStatus,
      saveOrder,
      updateTableStatus,
      addTable,
      deleteTable,
      addCategory,
      deleteCategory,
      addFoodItem,
      deleteFoodItem,
      updateSettings,
      addPaymentRecord,
      markNotificationRead,
      clearAllNotifications,
      testSoundAlert,
      loginMockUser,
      logoutUser,
      refreshData,
      toasts,
      showToast,
      removeToast,
      confirmModal,
      askConfirmation,
      closeConfirmation,
      qzStatus,
      qzPrinters,
      qzConfig,
      connectQZTray,
      disconnectQZTray,
      refreshQZPrinters,
      saveQZConfig,
      testQZPrint,
    }}>
      {settings?.themeColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(settings.themeColor) && !['#10B981', '#059669', '#6366F1', '#4f46e5', '#0B132B', '#18251D', '#39FF88', '#0F172A', '#F59E0B', '#064E3B'].includes(settings.themeColor) && (
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --brand-50: ${settings.themeColor}0a;
            --brand-100: ${settings.themeColor}1f;
            --brand-500: ${settings.themeColor};
            --brand-600: ${settings.themeColor}e0;
            --brand-700: ${settings.themeColor}c0;
          }
        `}} />
      )}
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
};
