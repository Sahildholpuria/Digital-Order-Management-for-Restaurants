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
} from '../types';

interface RestaurantContextType {
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
  addToCart: (item: FoodItem, quantity: number, instructions?: string) => void;
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
  
  // Auth Helpers
  loginMockUser: (email: string, role: UserRole) => Promise<UserProfile>;
  logoutUser: () => Promise<void>;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [restaurantId, setRestaurantId] = useState<string>('demo-restaurant');
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
  
  const isFirstLoad = useRef(true);
  const prevNotificationsCount = useRef(0);

  // Silent audio loop to keep browser tab active in background, and visibility listener to re-sync
  useEffect(() => {
    let interval: any;
    let audioCtx: AudioContext | null = null;

    const startKeepAlive = () => {
      if (audioCtx) return;
      try {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Play tiny silent sound every 10 seconds to keep the process running in the background
        interval = setInterval(() => {
          if (!audioCtx) return;
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

    // Trigger on first user interaction to bypass browser autoplay policies
    const handleInteraction = () => {
      startKeepAlive();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    // Force complete database re-sync when tab gains focus or visibility
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setSubscriptionTrigger(t => t + 1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      if (interval) clearInterval(interval);
      if (audioCtx) audioCtx.close();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);

  const syncSupabaseProfile = async (user: any) => {
    try {
      const users = await dbService.getUsers(restaurantId);
      const found = users.find(u => u.id === user.id);
      if (found) {
        setCurrentUserState(found);
      } else {
        const profile: UserProfile = {
          id: user.id,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Staff Member',
          email: user.email || '',
          role: 'admin',
          createdAt: new Date().toISOString(),
        };
        await dbService.addUser(restaurantId, profile);
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
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          syncSupabaseProfile(session.user);
        } else {
          setCurrentUserState(null);
          setLoading(false);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          syncSupabaseProfile(session.user);
        } else {
          setCurrentUserState(null);
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
      }
      setLoading(false);
    }
  }, [restaurantId]);

  // Load Settings and Real-time Listeners
  useEffect(() => {
    let unsubTables: () => void = () => {};
    let unsubCategories: () => void = () => {};
    let unsubFoodItems: () => void = () => {};
    let unsubOrders: () => void = () => {};
    let unsubPayments: () => void = () => {};
    let unsubNotifications: () => void = () => {};

    const loadData = async () => {
      try {
        const setts = await dbService.getSettings(restaurantId);
        setSettings(setts);

        // Subscriptions
        unsubTables = dbService.subscribeTables(restaurantId, (data) => {
          setTables(data);
          setTablesLoaded(true); // Mark tables as definitively loaded
          // Sync current table status if selected
          if (currentTable) {
            const fresh = data.find(t => t.id === currentTable.id);
            if (fresh) setCurrentTable(fresh);
          }
        });

        unsubCategories = dbService.subscribeCategories(restaurantId, (data) => {
          setCategories(data);
        });

        unsubFoodItems = dbService.subscribeFoodItems(restaurantId, (data) => {
          setFoodItems(data);
        });

        unsubOrders = dbService.subscribeOrders(restaurantId, (data) => {
          setOrders(data);
        });

        unsubPayments = dbService.subscribePayments(restaurantId, (data) => {
          setPayments(data);
        });

        unsubNotifications = dbService.subscribeNotifications(restaurantId, (data) => {
          setNotifications(data);
          
          // Audio alert / Speech Synthesis on new notification (Order/Request)
          if (!isFirstLoad.current && data.length > prevNotificationsCount.current) {
            const newNotify = data[0]; // assumes sorted desc
            if (newNotify && !newNotify.isRead) {
              triggerNotificationSoundAndSpeech(newNotify);
            }
          }
          prevNotificationsCount.current = data.length;
          isFirstLoad.current = false;
        });

      } catch (err) {
        console.error('Failed loading subscriptions:', err);
      }
    };

    loadData();

    return () => {
      unsubTables();
      unsubCategories();
      unsubFoodItems();
      unsubOrders();
      unsubPayments();
      unsubNotifications();
    };
  }, [restaurantId, currentTable?.id, subscriptionTrigger]);

  // Trigger Sound & Speech Synthesis
  const triggerNotificationSoundAndSpeech = (n: RestaurantNotification) => {
    try {
      const soundEnabled = settings?.enableSoundNotification ?? true;
      if (!soundEnabled) return;

      // Play Audio Notification Chime
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
      
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime); // A5
        gain2.gain.setValueAtTime(0.3, audioCtx.currentTime);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.3);
      }, 150);

      // Speech Synthesis Voice Announcement
      if ('speechSynthesis' in window) {
        const tableCleanName = n.tableName.replace(/Table\s*/i, '');
        let speechMessage = '';

        if (n.type === 'new_order') {
          speechMessage = `New order received from Table ${tableCleanName}.`;
        } else if (n.type === 'call_waiter') {
          speechMessage = `Table ${tableCleanName} is requesting a waiter.`;
        } else if (n.type === 'request_bill') {
          speechMessage = `Table ${tableCleanName} requested the bill.`;
        } else {
          speechMessage = `New message from Table ${tableCleanName}.`;
        }

        const speech = new SpeechSynthesisUtterance(speechMessage);
        speech.rate = 0.82; // Slower rate for smoother, clearer pronunciation
        speech.pitch = 1.0;
        speech.lang = 'en-US';

        const voices = window.speechSynthesis.getVoices();
        const enVoice = voices.find(v => v.lang.includes('en') || v.lang.includes('EN'));
        if (enVoice) speech.voice = enVoice;

        window.speechSynthesis.speak(speech);
      }
    } catch (e) {
      console.warn('Notification audio/speech synthesis blocked by browser:', e);
    }
  };

  const setCurrentTableById = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (table) {
      setCurrentTable(table);
    } else {
      // Create temporary local table state if not loaded yet
      setCurrentTable({
        id: tableId,
        number: tableId.replace('table-', ''),
        capacity: 4,
        status: 'available',
        qrCodeUrl: '',
        updatedAt: new Date().toISOString()
      });
    }
  };

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
  const addToCart = (item: FoodItem, quantity: number, instructions?: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.itemId === item.id);
      if (existing) {
        return prev.map(i =>
          i.itemId === item.id
            ? { ...i, quantity: i.quantity + quantity, specialInstructions: instructions || i.specialInstructions }
            : i
        );
      }
      return [...prev, {
        itemId: item.id,
        name: item.name,
        price: item.price * (1 - (item.discountPercentage || 0) / 100),
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
    return cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  };

  const getCartTax = () => {
    const taxRate = settings ? settings.taxPercentage : 18;
    return getCartSubtotal() * (taxRate / 100);
  };

  const getCartGrandTotal = () => {
    return getCartSubtotal() + getCartTax();
  };

  // PLACE ORDER
  const placeOrder = async (instructions?: string): Promise<RestaurantOrder> => {
    if (cart.length === 0) throw new Error('Cart is empty');
    if (!currentTable) throw new Error('Table not assigned');

    const taxRate = settings ? settings.taxPercentage : 18;
    const subtotal = getCartSubtotal();
    const tax = subtotal * (taxRate / 100);
    const grandTotal = subtotal + tax;
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
    
    // Update table status to occupied — only possible when a staff session is active.
    // Customer sessions are anonymous (no auth.uid) so this call is skipped to
    // avoid an RLS violation that would abort the entire order placement.
    try {
      await dbService.saveTable(restaurantId, {
        ...currentTable,
        status: 'occupied',
        updatedAt: new Date().toISOString()
      });
    } catch (_) {
      // Silently ignore — staff can update table status manually from the dashboard
    }

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
    // If order was served or completed, we might reset table status
    await dbService.saveOrder(restaurantId, updatedOrder);

    // If order completed or cancelled, release the table status if no other active order
    if (status === 'completed' || status === 'cancelled') {
      const activeTableOrders = orders.filter(o => o.tableId === order.tableId && o.id !== order.id && !['completed', 'cancelled'].includes(o.status));
      if (activeTableOrders.length === 0) {
        const table = tables.find(t => t.id === order.tableId);
        if (table && table.status === 'occupied') {
          await dbService.saveTable(restaurantId, {
            ...table,
            status: 'available',
            updatedAt: new Date().toISOString()
          });
        }
      }
    }
  };

  const saveOrder = async (order: RestaurantOrder) => {
    await dbService.saveOrder(restaurantId, order);
  };

  const updateTableStatus = async (tableId: string, status: TableStatus) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    await dbService.saveTable(restaurantId, {
      ...table,
      status,
      updatedAt: new Date().toISOString()
    });
  };

  const addTable = async (table: RestaurantTable) => {
    await dbService.saveTable(restaurantId, table);
    setTables(prev => {
      const exists = prev.some(t => t.id === table.id);
      if (exists) {
        return prev.map(t => t.id === table.id ? table : t);
      }
      return [...prev, table].sort((a, b) => a.number.localeCompare(b.number));
    });
  };

  const deleteTable = async (tableId: string) => {
    await dbService.deleteTable(restaurantId, tableId);
    setTables(prev => prev.filter(t => t.id !== tableId));
  };

  const addCategory = async (category: MenuCategory) => {
    await dbService.saveCategory(restaurantId, category);
    setCategories(prev => {
      const exists = prev.some(c => c.id === category.id);
      if (exists) return prev.map(c => c.id === category.id ? category : c);
      return [...prev, category].sort((a, b) => a.order - b.order);
    });
  };

  const deleteCategory = async (categoryId: string) => {
    await dbService.deleteCategory(restaurantId, categoryId);
    setCategories(prev => prev.filter(c => c.id !== categoryId));
  };

  const addFoodItem = async (item: FoodItem) => {
    await dbService.saveFoodItem(restaurantId, item);
    setFoodItems(prev => {
      const exists = prev.some(f => f.id === item.id);
      if (exists) return prev.map(f => f.id === item.id ? item : f);
      return [...prev, item];
    });
  };

  const deleteFoodItem = async (itemId: string) => {
    await dbService.deleteFoodItem(restaurantId, itemId);
    setFoodItems(prev => prev.filter(f => f.id !== itemId));
  };

  const updateSettings = async (updates: Partial<RestaurantSettings>) => {
    await dbService.updateSettings(restaurantId, updates);
    const newSettings = await dbService.getSettings(restaurantId);
    setSettings(newSettings);
  };

  const addPaymentRecord = async (payment: PaymentRecord) => {
    await dbService.addPayment(restaurantId, payment);
  };

  const markNotificationRead = async (id: string) => {
    await dbService.markNotificationRead(restaurantId, id);
  };

  const clearAllNotifications = async () => {
    await dbService.clearAllNotifications(restaurantId);
  };

  // MOCK AUTH
  const loginMockUser = async (email: string, role: UserRole): Promise<UserProfile> => {
    const users = await dbService.getUsers(restaurantId);
    let found = users.find(u => u.email === email && u.role === role);
    if (!found) {
      found = {
        id: `mock-user-${Date.now()}`,
        name: email.split('@')[0].toUpperCase(),
        email,
        role,
        createdAt: new Date().toISOString()
      };
      await dbService.addUser(restaurantId, found);
    }
    setCurrentUser(found);
    return found;
  };

  const logoutUser = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    } else {
      setCurrentUser(null);
    }
  };

  return (
    <RestaurantContext.Provider value={{
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
      loading,
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
      loginMockUser,
      logoutUser,
    }}>
      {settings?.themeColor && (
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
