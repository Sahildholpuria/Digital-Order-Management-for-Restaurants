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
  RestaurantWorkspace,
  SubscriptionPlan,
} from '../types';

const DEFAULT_WORKSPACES: RestaurantWorkspace[] = [
  {
    id: 'c08eb195-236b-4b20-9118-18e388d7adfe',
    name: 'The Grand SaaS Bistro',
    logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=60',
    themeColor: '#6366F1',
    plan: 'professional',
    status: 'active',
    role: 'owner',
  },
  {
    id: 'a9b2d2a4-f726-4444-8888-bf29c8cd2b1a',
    name: 'Burger & Co',
    logoUrl: '',
    themeColor: '#EC4899',
    plan: 'starter',
    status: 'active',
    role: 'owner',
  }
];


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
  
  // SaaS Multi-Tenant Additions
  workspaces: RestaurantWorkspace[];
  activeWorkspace: RestaurantWorkspace | null;
  isSuperAdmin: boolean;
  subscription: SubscriptionPlan | null;
  showWorkspaceSwitcher: boolean;
  setShowWorkspaceSwitcher: (show: boolean) => void;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  
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
  
  // Auth Helpers
  loginMockUser: (email: string, role: UserRole) => Promise<UserProfile>;
  logoutUser: () => Promise<void>;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [restaurantId, setRestaurantId] = useState<string>(() => localStorage.getItem('workspace_selected') || 'c08eb195-236b-4b20-9118-18e388d7adfe');
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

  // SaaS States
  const [workspaces, setWorkspaces] = useState<RestaurantWorkspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<RestaurantWorkspace | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [subscription, setSubscription] = useState<SubscriptionPlan | null>(null);
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState<boolean>(false);
  
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
        
        interval = setInterval(() => {
          if (!audioCtx) return;
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          gain.gain.setValueAtTime(0, audioCtx.currentTime); // SILENT
          osc.start();
          osc.stop(audioCtx.currentTime + 0.05);
        }, 10000);
      } catch (e) {
        console.warn('Audio keep-alive failed to initialize:', e);
      }
    };

    const handleInteraction = () => {
      startKeepAlive();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

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
      const superAdminCheck = await dbService.checkSuperAdmin(user.id);
      setIsSuperAdmin(superAdminCheck);

      const userWorkspaces = await dbService.getUserWorkspaces(user.id);
      setWorkspaces(userWorkspaces);

      if (userWorkspaces.length > 0) {
        // Resolve active workspace
        let selectedWorkspace = userWorkspaces.find(w => w.id === restaurantId);
        if (!selectedWorkspace) {
          selectedWorkspace = userWorkspaces[0];
        }
        setRestaurantId(selectedWorkspace.id);
        setActiveWorkspace(selectedWorkspace);
        localStorage.setItem('workspace_selected', selectedWorkspace.id);

        const users = await dbService.getUsers(selectedWorkspace.id);
        const found = users.find(u => u.id === user.id);
        if (found) {
          setCurrentUserState(found);
        } else {
          const profile: UserProfile = {
            id: user.id,
            restaurantId: selectedWorkspace.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Staff Member',
            email: user.email || '',
            role: selectedWorkspace.role || 'admin',
            status: 'active',
            createdAt: new Date().toISOString(),
          };
          await dbService.addUser(selectedWorkspace.id, profile);
          setCurrentUserState(profile);
        }

        const subData = await dbService.getSubscription(selectedWorkspace.id);
        setSubscription(subData);

        if (userWorkspaces.length > 1 && !localStorage.getItem('workspace_selected_once')) {
          setShowWorkspaceSwitcher(true);
        }
      } else {
        if (!superAdminCheck) {
          // Auto-onboard default workspace for new signups
          const newRestId = await dbService.superCreateRestaurant(
            `${user.user_metadata?.full_name || 'My'} Restaurant`,
            'professional',
            user.email,
            user.user_metadata?.full_name || 'Owner'
          );
          
          const profile: UserProfile = {
            id: user.id,
            restaurantId: newRestId,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Owner',
            email: user.email || '',
            role: 'owner',
            status: 'active',
            createdAt: new Date().toISOString(),
          };
          await dbService.addUser(newRestId, profile);

          const refetchedWorkspaces = await dbService.getUserWorkspaces(user.id);
          setWorkspaces(refetchedWorkspaces);
          if (refetchedWorkspaces[0]) {
            setRestaurantId(refetchedWorkspaces[0].id);
            setActiveWorkspace(refetchedWorkspaces[0]);
            setCurrentUserState(profile);
            localStorage.setItem('workspace_selected', refetchedWorkspaces[0].id);
            const subData = await dbService.getSubscription(refetchedWorkspaces[0].id);
            setSubscription(subData);
          }
        } else {
          // Super admin without direct membership gets defaults
          const defaultRestId = 'c08eb195-236b-4b20-9118-18e388d7adfe';
          setRestaurantId(defaultRestId);
          localStorage.setItem('workspace_selected', defaultRestId);
          setCurrentUserState({
            id: user.id,
            restaurantId: defaultRestId,
            name: 'Super Admin',
            email: user.email,
            role: 'owner',
            status: 'active',
            createdAt: new Date().toISOString()
          });
        }
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
        const parsed = JSON.parse(savedUser);
        setCurrentUserState(parsed);
        setIsSuperAdmin(parsed.email === 'admin@saasbistro.com');
        setWorkspaces(DEFAULT_WORKSPACES);
        const selected = DEFAULT_WORKSPACES.find((w: RestaurantWorkspace) => w.id === restaurantId) || DEFAULT_WORKSPACES[0];
        setActiveWorkspace(selected);
        
        dbService.getSubscription(selected.id).then(subData => {
          setSubscription(subData);
        });
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
        await dbService.cleanupExpiredOrders(restaurantId);
        const setts = await dbService.getSettings(restaurantId);
        setSettings(setts);

        // 1. Fetch tables, categories, and food items ONCE to save connection & DB budget
        const tablesData = await dbService.getTables(restaurantId);
        setTables(tablesData);
        setTablesLoaded(true); // Mark tables as definitively loaded
        if (currentTable) {
          const fresh = tablesData.find(t => t.id === currentTable.id);
          if (fresh) setCurrentTable(fresh);
        }

        const categoriesData = await dbService.getCategories(restaurantId);
        setCategories(categoriesData);

        const itemsData = await dbService.getFoodItems(restaurantId);
        setFoodItems(itemsData);

        // 2. Optimized Subscriptions - only open WebSocket channels if necessary
        const isStaffUser = !!currentUser;

        if (isStaffUser) {
          // Staff needs Live Orders, Notifications
          unsubOrders = dbService.subscribeOrders(restaurantId, (data) => {
            setOrders(data);
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

          // Staff Cashier/Admin/Manager needs Payments logs
          if (currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'cashier' || currentUser.role === 'owner') {
            unsubPayments = dbService.subscribePayments(restaurantId, (data) => {
              setPayments(data);
            });
          }
        } else {
          // Guest Customer - only needs orders subscription (to track status)
          unsubOrders = dbService.subscribeOrders(restaurantId, (data) => {
            setOrders(data);
          });
        }

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
  }, [restaurantId, currentTable?.id, subscriptionTrigger, currentUser?.id]);

  // Workspace Switch Action
  const switchWorkspace = async (workspaceId: string) => {
    setLoading(true);
    setRestaurantId(workspaceId);
    localStorage.setItem('workspace_selected', workspaceId);
    localStorage.setItem('workspace_selected_once', 'true');
    
    const selected = workspaces.find(w => w.id === workspaceId);
    if (selected) {
      setActiveWorkspace(selected);
    }
    
    // Reset local data states to clear memory context between tenant switches
    setTables([]);
    setCategories([]);
    setFoodItems([]);
    setOrders([]);
    setPayments([]);
    setNotifications([]);
    setTablesLoaded(false);

    if (currentUser) {
      const users = await dbService.getUsers(workspaceId);
      const found = users.find(u => u.email === currentUser.email);
      if (found) {
        setCurrentUserState(found);
      } else {
        // Handle admin mapping
        const profile: UserProfile = {
          ...currentUser,
          restaurantId: workspaceId,
          role: selected?.role || 'admin',
        };
        setCurrentUserState(profile);
      }
    }
    const subData = await dbService.getSubscription(workspaceId);
    setSubscription(subData);
    setShowWorkspaceSwitcher(false);
    setLoading(false);
  };

  // Trigger Sound & Speech Synthesis
  const triggerNotificationSoundAndSpeech = (n: RestaurantNotification) => {
    if (!settings?.enableSoundNotification) return;

    // Web Audio Synthesizer: Louder 4-note chime sequence
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audio = new AudioCtx();
        const now = audio.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 ascending chord
        
        notes.forEach((freq, idx) => {
          const osc = audio.createOscillator();
          const gain = audio.createGain();
          osc.connect(gain);
          gain.connect(audio.destination);
          
          osc.frequency.setValueAtTime(freq, now + idx * 0.15);
          
          // Amplified peaks
          gain.gain.setValueAtTime(0, now + idx * 0.15);
          gain.gain.linearRampToValueAtTime(0.95, now + idx * 0.15 + 0.02);
          gain.gain.setValueAtTime(1.0, now + idx * 0.15 + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.5);
          
          osc.start(now + idx * 0.15);
          osc.stop(now + idx * 0.15 + 0.5);
        });
      }
    } catch (e) {
      console.warn('Synth chime trigger failed:', e);
    }

    // Voice announcement (Text-to-Speech)
    if ('speechSynthesis' in window) {
      setTimeout(() => {
        const synth = window.speechSynthesis;
        let speakText = '';
        if (n.type === 'new_order') {
          speakText = `New order received from ${n.tableName}.`;
        } else if (n.type === 'call_waiter') {
          speakText = `${n.tableName} is calling a waiter.`;
        } else if (n.type === 'request_bill') {
          speakText = `${n.tableName} requested the bill.`;
        }
        
        if (speakText && synth) {
          synth.cancel(); // cancel pending speech queues
          const utterance = new SpeechSynthesisUtterance(speakText);
          utterance.volume = 1.0;
          utterance.rate = 1.0;
          
          const voices = synth.getVoices();
          const selectedVoice = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('en-GB') || v.lang.includes('en-US'));
          if (selectedVoice) utterance.voice = selectedVoice;
          
          synth.speak(utterance);
        }
      }, 700);
    }
  };

  // Cart Actions
  const addToCart = (item: FoodItem, quantity: number, instructions?: string, selectedVariantName?: string) => {
    setCart(prev => {
      // Unique item composite key: itemId + variant
      const compositeId = selectedVariantName ? `${item.id}-${selectedVariantName}` : item.id;
      const existing = prev.find(i => i.itemId === compositeId);
      
      const itemPrice = selectedVariantName && item.description.includes('||variants:')
        ? (() => {
            const match = item.description.match(/\|\|variants:(.*)/);
            if (match && match[1]) {
              const vars = match[1].split(';').reduce((acc: any, vStr) => {
                const [n, p] = vStr.split('=');
                if (n && p) acc[n.trim()] = parseFloat(p);
                return acc;
              }, {});
              return vars[selectedVariantName] ?? item.price;
            }
            return item.price;
          })()
        : item.price;

      const itemName = selectedVariantName ? `${item.name} (${selectedVariantName})` : item.name;

      if (existing) {
        return prev.map(i =>
          i.itemId === compositeId
            ? { ...i, quantity: i.quantity + quantity, specialInstructions: instructions || i.specialInstructions }
            : i
        );
      }
      return [...prev, {
        itemId: compositeId,
        name: itemName,
        price: itemPrice,
        quantity,
        specialInstructions: instructions
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

  const getCartSubtotal = () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const getCartTax = () => getCartSubtotal() * ((settings?.taxPercentage || 18) / 100);
  const getCartGrandTotal = () => getCartSubtotal() + getCartTax();

  // Database actions
  const placeOrder = async (instructions?: string) => {
    if (!currentTable) throw new Error('No table selected');
    
    const newOrder: RestaurantOrder = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(),
      restaurantId,
      orderNumber: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      tableId: currentTable.id,
      tableName: currentTable.number,
      items: cart,
      subtotal: getCartSubtotal(),
      tax: getCartTax(),
      discount: 0,
      grandTotal: getCartGrandTotal(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      elapsedTimeStart: new Date().toISOString(),
    };

    if (instructions) {
      newOrder.items = newOrder.items.map(item => ({
        ...item,
        specialInstructions: item.specialInstructions 
          ? `${item.specialInstructions} | General: ${instructions}` 
          : instructions
      }));
    }

    await dbService.saveOrder(restaurantId, newOrder);
    
    // Trigger notification
    const nId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString();
    const newNotify: RestaurantNotification = {
      id: nId,
      restaurantId,
      type: 'new_order',
      tableId: currentTable.id,
      tableName: currentTable.number,
      orderId: newOrder.id,
      message: `Table ${currentTable.number} placed a new order containing ${cart.length} item(s)`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    await dbService.addNotification(restaurantId, newNotify);
    
    // Log Activity
    await dbService.logActivity(restaurantId, currentUser?.id || 'guest', 'place_order', `Placed order ${newOrder.orderNumber}`);

    clearCart();
    return newOrder;
  };

  const callWaiter = async () => {
    if (!currentTable) return;
    const nId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString();
    const newNotify: RestaurantNotification = {
      id: nId,
      restaurantId,
      type: 'call_waiter',
      tableId: currentTable.id,
      tableName: currentTable.number,
      message: `Table ${currentTable.number} is calling a waiter`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    await dbService.addNotification(restaurantId, newNotify);
  };

  const requestBill = async () => {
    if (!currentTable) return;
    const nId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString();
    const newNotify: RestaurantNotification = {
      id: nId,
      restaurantId,
      type: 'request_bill',
      tableId: currentTable.id,
      tableName: currentTable.number,
      message: `Table ${currentTable.number} requested the bill`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    await dbService.addNotification(restaurantId, newNotify);
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const updated = { ...order, status };
    await dbService.saveOrder(restaurantId, updated);
  };

  const saveOrder = async (order: RestaurantOrder) => {
    await dbService.saveOrder(restaurantId, order);
  };

  const updateTableStatus = async (tableId: string, status: TableStatus) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    const updated = { ...table, status };
    await dbService.saveTable(restaurantId, updated);
  };

  const addTable = async (table: RestaurantTable) => {
    if (subscription && tables.length >= subscription.maxTables) {
      throw new Error(`Workspace plan (${subscription.plan.toUpperCase()}) limit reached. Max tables: ${subscription.maxTables}. Upgrade subscription to add more tables.`);
    }
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
    await dbService.addPaymentRecord(restaurantId, payment);
  };

  const markNotificationRead = async (id: string) => {
    await dbService.markNotificationRead(restaurantId, id);
  };

  const clearAllNotifications = async () => {
    await dbService.clearAllNotifications(restaurantId);
  };

  // MOCK AUTH
  const loginMockUser = async (email: string, role: UserRole): Promise<UserProfile> => {
    const mockId = 'c08eb195-236b-4b20-9118-18e388d7adfe';
    const users = await dbService.getUsers(mockId);
    let found = users.find(u => u.email === email && u.role === role);
    if (!found) {
      found = {
        id: `mock-user-${Date.now()}`,
        restaurantId: mockId,
        name: email.split('@')[0].toUpperCase(),
        email,
        role,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      await dbService.addUser(mockId, found);
    }
    
    setWorkspaces(DEFAULT_WORKSPACES);
    setActiveWorkspace(DEFAULT_WORKSPACES[0]);
    setRestaurantId(DEFAULT_WORKSPACES[0].id);
    localStorage.setItem('workspace_selected', DEFAULT_WORKSPACES[0].id);

    const subData = await dbService.getSubscription(DEFAULT_WORKSPACES[0].id);
    setSubscription(subData);

    const adminCheck = email === 'admin@saasbistro.com';
    setIsSuperAdmin(adminCheck);

    setCurrentUserState(found);
    localStorage.setItem('restaurant_current_user', JSON.stringify(found));
    return found;
  };

  const logoutUser = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    
    setCurrentUserState(null);
    setWorkspaces([]);
    setActiveWorkspace(null);
    setSubscription(null);
    setIsSuperAdmin(false);
    localStorage.removeItem('restaurant_current_user');
    localStorage.removeItem('workspace_selected');
    localStorage.removeItem('workspace_selected_once');
    setRestaurantId('c08eb195-236b-4b20-9118-18e388d7adfe');
  };

  const setCurrentTableById = async (tableId: string) => {
    const found = tables.find(t => t.id === tableId);
    if (found) {
      setCurrentTable(found);
    }
  };

  const setCurrentUser = (user: UserProfile | null) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem('restaurant_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('restaurant_current_user');
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
      workspaces,
      activeWorkspace,
      isSuperAdmin,
      subscription,
      showWorkspaceSwitcher,
      setShowWorkspaceSwitcher,
      switchWorkspace,
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
export default RestaurantContext;
