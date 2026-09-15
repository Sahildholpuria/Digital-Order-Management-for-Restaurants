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
  RestaurantNotification,
  OrderItem,
  OrderStatus,
  TableStatus,
  UserRole,
  ToastConfig,
  ConfirmModalConfig,
} from '../types';

import { translations, Language } from '../translations';
import { printKOTReceipt } from '../utils/printUtils';

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
  placeOrder: (instructions?: string) => Promise<RestaurantOrder>;
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
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

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
    
    return 'demo-restaurant';
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
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [tablesLoaded, setTablesLoaded] = useState<boolean>(false);
  const [subscriptionTrigger, setSubscriptionTrigger] = useState<number>(0);

  // Global Language & Translation state
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem('app_language') as Language) || 
           (localStorage.getItem('customer_lang') as Language) || 
           (localStorage.getItem('admin_lang') as Language) || 
           'en';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('app_language', newLang);
    localStorage.setItem('customer_lang', newLang);
    localStorage.setItem('admin_lang', newLang);
  };

  const t = translations[lang] || translations.en;

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
        const profile: UserProfile = {
          id: data.id,
          restaurantId: isSuper ? undefined : (data.restaurant_id || undefined),
          name: data.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Staff',
          email: data.email || user.email || '',
          role: data.role || 'admin',
          isSuperAdmin: isSuper,
          createdAt: data.created_at || new Date().toISOString(),
        };
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
          return;
        }
        
        setIsResolvingId(true);
        try {
          const resolvedId = await dbService.getRestaurantIdByTableId(tableId);
          if (resolvedId) {
            localStorage.setItem(`resolved_rest_${tableId}`, resolvedId);
            sessionStorage.setItem(`resolved_rest_${tableId}`, resolvedId);
            setRestaurantId(resolvedId);
          }
        } catch (err) {
          console.error('Failed to resolve restaurant from table URL:', err);
        } finally {
          setIsResolvingId(false);
        }
      } else {
        setIsResolvingId(false);
      }
    };
    
    resolveRestaurantFromUrl();
  }, [window.location.pathname]);

  // Load Settings and Real-time Listeners
  useEffect(() => {
    if (loading) return;

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

  // PLACE ORDER
  const placeOrder = async (instructions?: string): Promise<RestaurantOrder> => {
    if (cart.length === 0) throw new Error('Cart is empty');
    if (!currentTable) throw new Error('Table not assigned');

    const taxRate = settings?.taxPercentage ?? 0;
    const subtotal = getCartSubtotal();
    const tax = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const grandTotal = Math.round((subtotal + tax) * 100) / 100;
    const orderNum = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: RestaurantOrder = {
      id: `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderNumber: orderNum,
      tableId: currentTable.id,
      tableName: `Table ${currentTable.number}`,
      items: cart.map(c => ({
        ...c,
        specialInstructions: c.specialInstructions || instructions || '',
      })),
      subtotal,
      tax,
      discount: 0,
      grandTotal,
      status: 'pending',
      createdAt: new Date().toISOString(),
      elapsedTimeStart: new Date().toISOString(),
    };

    // Save order to database
    await dbService.saveOrder(restaurantId, newOrder);
    
    // Update table status to occupied automatically in DB and local state
    try {
      await dbService.updateTableStatus(restaurantId, currentTable.id, 'occupied');
    } catch (err) {
      console.warn('Table status auto-update notice:', err);
    }

    // Optimistically update currentTable and tables list to 'occupied' immediately
    setCurrentTable(prev => prev ? { ...prev, status: 'occupied' } : null);
    setTables(prev => prev.map(t => {
      const cleanNum = currentTable.number || currentTable.id.replace(/^table-/i, '');
      if (t.id === currentTable.id || t.number === cleanNum || t.number === currentTable.number || t.id.replace(/^table-/i, '') === cleanNum) {
        return { ...t, status: 'occupied', updatedAt: new Date().toISOString() };
      }
      return t;
    }));

    // Add alert notification for kitchen/staff
    try {
      const notification: RestaurantNotification = {
        id: `notify-${Date.now()}`,
        type: 'new_order',
        tableId: currentTable.id,
        tableName: `Table ${currentTable.number}`,
        orderId: newOrder.id,
        message: `New order ${orderNum} received from Table ${currentTable.number}.`,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      await dbService.addNotification(restaurantId, notification);
    } catch (_) {
      // Notification failure must not block the customer's order confirmation
    }

    clearCart();
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
    const targetRest = isSuper ? '' : restaurantId;
    const users = isSuper ? await dbService.getAllUsers() : await dbService.getUsers(restaurantId);
    let found = users.find(u => u.email === email && (isSuper ? true : u.role === role));
    if (!found) {
      found = {
        id: `mock-user-${Date.now()}`,
        restaurantId: isSuper ? undefined : restaurantId,
        name: email.split('@')[0].toUpperCase(),
        email,
        role: isSuper ? 'admin' : role,
        isSuperAdmin: isSuper,
        createdAt: new Date().toISOString()
      };
      await dbService.addUser(targetRest, found);
    }
    setCurrentUser(found);
    if (isSuper) {
      setRestaurantId('');
      localStorage.removeItem('last_active_staff_restaurant_id');
    }
    return found;
  };

  const logoutUser = async () => {
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
    }}>
      {settings?.themeColor && !['#10B981', '#059669', '#6366F1', '#4f46e5', '#0B132B', '#18251D', '#39FF88', '#0F172A', '#F59E0B', '#064E3B'].includes(settings.themeColor) && (
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
