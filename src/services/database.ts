import { isSupabaseConfigured, supabase, signUpClient } from './supabase';
import {
  RestaurantSettings,
  UserProfile,
  RestaurantTable,
  MenuCategory,
  FoodItem,
  RestaurantOrder,
  PaymentRecord,
  RestaurantNotification,
} from '../types';

// ==========================================
// MAPPERS: postgres (snake_case) <-> frontend (camelCase)
// ==========================================

const mapSettingsToFrontend = (row: any): RestaurantSettings => {
  const rawTheme = row.theme_color || row.themeColor || '#064E3B';
  const themeParts = rawTheme.split('|');
  let themeColor = themeParts[0] || '#064E3B';
  if (['#10B981', '#059669', '#6366F1', '#4f46e5', '#18251D', '#0B132B', '#0F172A'].includes(themeColor)) {
    themeColor = '#064E3B';
  }
  const enableWaiterCall = themeParts[1] !== 'false';
  const enableBillRequest = themeParts[2] !== 'false';
  const enableSoundNotification = themeParts[3] !== 'false';
  const enableBillPrinting = themeParts[4] !== 'false';
  const websiteUrl = themeParts[5] || row.website_url || row.websiteUrl || '';

  return {
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    email: row.email,
    gstNumber: row.gst_number || row.gstNumber || '',
    websiteUrl,
    taxPercentage: Number(row.tax_percentage ?? row.taxPercentage ?? 0),
    currency: row.currency || '₹',
    openingHours: row.opening_hours || row.openingHours || '09:00',
    closingHours: row.closing_hours || row.closingHours || '23:00',
    themeColor,
    enableWaiterCall,
    enableBillRequest,
    enableSoundNotification,
    enableBillPrinting,
    subscriptionStatus: row.subscription_status || row.subscriptionStatus || 'trial',
    subscriptionExpiresAt: row.subscription_expires_at || row.subscriptionExpiresAt,
    planType: row.plan_type || row.planType || 'starter',
    createdAt: row.created_at || row.createdAt,
  };
};

const mapSettingsToDb = (model: Partial<RestaurantSettings>) => {
  const dbRow: any = {
    ...(model.id && { id: model.id }),
    ...(model.name && { name: model.name }),
    ...(model.address !== undefined && { address: model.address }),
    ...(model.phone !== undefined && { phone: model.phone }),
    ...(model.email !== undefined && { email: model.email }),
    ...(model.gstNumber !== undefined && { gst_number: model.gstNumber }),
    ...(model.taxPercentage !== undefined && { tax_percentage: model.taxPercentage }),
    ...(model.currency !== undefined && { currency: model.currency }),
    ...(model.openingHours !== undefined && { opening_hours: model.openingHours }),
    ...(model.closingHours !== undefined && { closing_hours: model.closingHours }),
    ...(model.subscriptionStatus !== undefined && { subscription_status: model.subscriptionStatus }),
    ...(model.subscriptionExpiresAt !== undefined && { subscription_expires_at: model.subscriptionExpiresAt }),
    ...(model.planType !== undefined && { plan_type: model.planType }),
  };

  if (model.themeColor !== undefined || model.websiteUrl !== undefined || model.enableWaiterCall !== undefined || model.enableBillPrinting !== undefined) {
    const color = model.themeColor || '#10B981';
    const waiter = model.enableWaiterCall ?? true;
    const bill = model.enableBillRequest ?? true;
    const sound = model.enableSoundNotification ?? true;
    const printBill = model.enableBillPrinting ?? true;
    const site = model.websiteUrl ?? '';
    dbRow.theme_color = `${color}|${waiter}|${bill}|${sound}|${printBill}|${site}`;
  }

  return dbRow;
};

const mapUserToFrontend = (row: any): UserProfile => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  isSuperAdmin: !!row.is_super_admin,
  createdAt: row.created_at,
});

const mapTableToFrontend = (row: any): RestaurantTable => ({
  id: row.id,
  number: row.number,
  capacity: Number(row.capacity),
  status: row.status,
  qrCodeUrl: row.qr_code_url,
  updatedAt: row.updated_at,
});

const mapTableToDb = (model: RestaurantTable, restaurantId: string) => ({
  id: model.id,
  restaurant_id: restaurantId,
  number: model.number,
  capacity: model.capacity,
  status: model.status,
  qr_code_url: model.qrCodeUrl,
  updated_at: model.updatedAt,
});

const mapCategoryToFrontend = (row: any): MenuCategory => ({
  id: row.id,
  name: row.name,
  order: Number(row.order),
  createdAt: row.created_at,
});

const mapCategoryToDb = (model: MenuCategory, restaurantId: string) => ({
  id: model.id,
  restaurant_id: restaurantId,
  name: model.name,
  order: model.order,
  created_at: model.createdAt,
});

const mapFoodItemToFrontend = (row: any): FoodItem => ({
  id: row.id,
  name: row.name,
  image: row.image,
  description: row.description,
  price: Number(row.price),
  categoryId: row.category_id,
  isVeg: row.is_veg,
  preparationTime: Number(row.preparation_time),
  isAvailable: row.is_available,
  isPopular: row.is_popular,
  isRecommended: row.is_recommended,
  spicyLevel: row.spicy_level as any,
  discountPercentage: Number(row.discount_percentage),
  updatedAt: row.updated_at,
});

const mapFoodItemToDb = (model: FoodItem, restaurantId: string) => ({
  id: model.id,
  restaurant_id: restaurantId,
  category_id: model.categoryId,
  name: model.name,
  image: model.image,
  description: model.description,
  price: model.price,
  is_veg: model.isVeg,
  preparation_time: model.preparationTime,
  is_available: model.isAvailable,
  is_popular: model.isPopular,
  is_recommended: model.isRecommended,
  spicy_level: model.spicyLevel,
  discount_percentage: model.discountPercentage,
  updated_at: model.updatedAt,
});

const mapOrderToFrontend = (row: any): RestaurantOrder => ({
  id: row.id,
  orderNumber: row.order_number,
  tableId: row.table_id,
  tableName: row.table_name,
  items: row.items, // jsonb is parsed automatically
  subtotal: Number(row.subtotal),
  tax: Number(row.tax),
  discount: Number(row.discount),
  grandTotal: Number(row.grand_total),
  status: row.status,
  createdAt: row.created_at,
  elapsedTimeStart: row.elapsed_time_start,
  waiterId: row.waiter_id,
  feedback: row.feedback,
});

const mapOrderToDb = (model: RestaurantOrder, restaurantId: string) => ({
  id: model.id,
  restaurant_id: restaurantId,
  order_number: model.orderNumber,
  table_id: model.tableId,
  table_name: model.tableName,
  items: model.items, // serialized as jsonb automatically
  subtotal: model.subtotal,
  tax: model.tax,
  discount: model.discount,
  grand_total: model.grandTotal,
  status: model.status,
  created_at: model.createdAt,
  elapsed_time_start: model.elapsedTimeStart,
  ...(model.waiterId && { waiter_id: model.waiterId }),
  ...(model.feedback && { feedback: model.feedback }),
});

const mapPaymentToFrontend = (row: any): PaymentRecord => ({
  id: row.id,
  orderId: row.order_id,
  orderNumber: row.order_number,
  tableName: row.table_name,
  subtotal: Number(row.subtotal),
  tax: Number(row.tax),
  discount: Number(row.discount),
  grandTotal: Number(row.grand_total),
  paymentMethod: row.payment_method,
  createdAt: row.created_at,
});

const mapPaymentToDb = (model: PaymentRecord, restaurantId: string) => ({
  id: model.id,
  restaurant_id: restaurantId,
  order_id: model.orderId,
  order_number: model.orderNumber,
  table_name: model.tableName,
  subtotal: model.subtotal,
  tax: model.tax,
  discount: model.discount,
  grand_total: model.grandTotal,
  payment_method: model.paymentMethod,
  created_at: model.createdAt,
});

const mapNotificationToFrontend = (row: any): RestaurantNotification => ({
  id: row.id,
  type: row.type,
  tableId: row.table_id,
  tableName: row.table_name,
  orderId: row.order_id,
  message: row.message,
  isRead: row.is_read,
  createdAt: row.created_at,
});

const mapNotificationToDb = (model: RestaurantNotification, restaurantId: string) => ({
  id: model.id,
  restaurant_id: restaurantId,
  type: model.type,
  table_id: model.tableId,
  table_name: model.tableName,
  ...(model.orderId && { order_id: model.orderId }),
  message: model.message,
  is_read: model.isRead,
  created_at: model.createdAt,
});

// ==========================================
// LOCAL STORAGE MOCK SEEDS & DEFAULTS
// ==========================================

const DEFAULT_SETTINGS = {
  id: 'demo-restaurant',
  name: 'The Grand Bistro',
  address: '102 Gourmet Boulevard, Culinary District',
  phone: '+1 (555) 019-2834',
  email: 'hello@grandbistro.com',
  gstNumber: '',
  websiteUrl: 'www.grandbistro.com',
  taxPercentage: 0,
  currency: '₹',
  openingHours: '09:00',
  closingHours: '23:00',
  themeColor: '#064E3B',
  subscriptionStatus: 'trial' as const,
  planType: 'starter' as const,
  subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
};

const DEFAULT_CATEGORIES = [
  { id: 'cat-1', name: 'Starters', order: 1, createdAt: new Date().toISOString() },
  { id: 'cat-2', name: 'Main Course', order: 2, createdAt: new Date().toISOString() },
  { id: 'cat-3', name: 'Chinese Specials', order: 3, createdAt: new Date().toISOString() },
  { id: 'cat-4', name: 'Desserts', order: 4, createdAt: new Date().toISOString() },
  { id: 'cat-5', name: 'Beverages', order: 5, createdAt: new Date().toISOString() },
];

const DEFAULT_ITEMS = [
  {
    id: 'item-1',
    name: 'Truffle Parmesan Fries',
    price: 180,
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=60',
    description: 'Crispy golden french fries tossed in black truffle oil, fresh herbs, and freshly grated parmesan cheese.',
    categoryId: 'cat-1',
    isVeg: true,
    preparationTime: 8,
    isAvailable: true,
    isPopular: true,
    isRecommended: false,
    spicyLevel: 0,
    discountPercentage: 0,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-2',
    name: 'Paneer Tikka Shaslik',
    price: 260,
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=60',
    description: 'Skewered cottage cheese cubes marinated in spiced yogurt and grilled to perfection with bell peppers.',
    categoryId: 'cat-1',
    isVeg: true,
    preparationTime: 15,
    isAvailable: true,
    isPopular: true,
    isRecommended: true,
    spicyLevel: 2,
    discountPercentage: 10,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-3',
    name: 'Classic Butter Chicken',
    price: 380,
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=60',
    description: 'Tender chicken roasted in a clay oven and cooked in a rich butter, cream, and tomato gravy.',
    categoryId: 'cat-2',
    isVeg: false,
    preparationTime: 18,
    isAvailable: true,
    isPopular: true,
    isRecommended: true,
    spicyLevel: 1,
    discountPercentage: 0,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-4',
    name: 'Dal Makhani',
    price: 240,
    image: 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=500&auto=format&fit=crop&q=60',
    description: 'Black lentils slow-cooked overnight with cream, butter, and select Indian spices.',
    categoryId: 'cat-2',
    isVeg: true,
    preparationTime: 12,
    isAvailable: true,
    isPopular: false,
    isRecommended: true,
    spicyLevel: 1,
    discountPercentage: 0,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-5',
    name: 'Schezwan Chilli Paneer',
    price: 250,
    image: 'https://images.unsplash.com/photo-1603133872878-685f20d6da41?w=500&auto=format&fit=crop&q=60',
    description: 'Crispy paneer cubes tossed in a fiery home-made Schezwan paste with onions and green peppers.',
    categoryId: 'cat-3',
    isVeg: true,
    preparationTime: 10,
    isAvailable: true,
    isPopular: false,
    isRecommended: false,
    spicyLevel: 3,
    discountPercentage: 5,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-6',
    name: 'Gooey Chocolate Lava Cake',
    price: 150,
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=60',
    description: 'Molten Belgian chocolate core inside a soft baked cake shell, served with a scoop of vanilla ice cream.',
    categoryId: 'cat-4',
    isVeg: true,
    preparationTime: 10,
    isAvailable: true,
    isPopular: true,
    isRecommended: true,
    spicyLevel: 0,
    discountPercentage: 0,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-7',
    name: 'Virgin Mojito',
    price: 110,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60',
    description: 'Fresh mint leaves muddled with sugar, lime juice, and sparkling club soda.',
    categoryId: 'cat-5',
    isVeg: true,
    preparationTime: 4,
    isAvailable: true,
    isPopular: true,
    isRecommended: false,
    spicyLevel: 0,
    discountPercentage: 0,
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_TABLES = [
  { id: 'table-1', number: '1', capacity: 2, status: 'available', qrCodeUrl: '', updatedAt: new Date().toISOString() },
  { id: 'table-2', number: '2', capacity: 4, status: 'available', qrCodeUrl: '', updatedAt: new Date().toISOString() },
  { id: 'table-3', number: '3', capacity: 4, status: 'occupied', qrCodeUrl: '', updatedAt: new Date().toISOString() },
  { id: 'table-4', number: '4', capacity: 6, status: 'reserved', qrCodeUrl: '', updatedAt: new Date().toISOString() },
  { id: 'table-5', number: '5', capacity: 8, status: 'available', qrCodeUrl: '', updatedAt: new Date().toISOString() },
  { id: 'table-6', number: '6', capacity: 2, status: 'available', qrCodeUrl: '', updatedAt: new Date().toISOString() },
];

const DEFAULT_USERS = [
  { id: 'admin-user-id', name: 'Sahil Admin', email: 'admin@restaurant.com', role: 'admin', createdAt: new Date().toISOString() },
  { id: 'manager-user-id', name: 'Rohit Manager', email: 'manager@restaurant.com', role: 'manager', createdAt: new Date().toISOString() },
  { id: 'kitchen-user-id', name: 'Chef Mario', email: 'kitchen@restaurant.com', role: 'kitchen', createdAt: new Date().toISOString() },
  { id: 'waiter-user-id', name: 'David Waiter', email: 'waiter@restaurant.com', role: 'waiter', createdAt: new Date().toISOString() },
];

const DEFAULT_ORDERS = [
  {
    id: 'ord-101',
    orderNumber: 'ORD-0001',
    tableId: 'table-3',
    tableName: 'Table 3',
    items: [
      { itemId: 'item-2', name: 'Paneer Tikka Shaslik', price: 260, quantity: 1, specialInstructions: 'Make it extra spicy' },
      { itemId: 'item-7', name: 'Virgin Mojito', price: 110, quantity: 2 },
    ],
    subtotal: 480,
    tax: 86.4,
    discount: 26,
    grandTotal: 540.4,
    status: 'preparing',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    elapsedTimeStart: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
];

const initializeLocalStorage = () => {
  if (!localStorage.getItem('restaurant_settings')) {
    localStorage.setItem('restaurant_settings', JSON.stringify(DEFAULT_SETTINGS));
  }
  if (!localStorage.getItem('restaurant_categories')) {
    localStorage.setItem('restaurant_categories', JSON.stringify(DEFAULT_CATEGORIES));
  }
  if (!localStorage.getItem('restaurant_foodItems')) {
    localStorage.setItem('restaurant_foodItems', JSON.stringify(DEFAULT_ITEMS));
  }
  if (!localStorage.getItem('restaurant_tables')) {
    localStorage.setItem('restaurant_tables', JSON.stringify(DEFAULT_TABLES));
  }
  if (!localStorage.getItem('restaurant_users')) {
    localStorage.setItem('restaurant_users', JSON.stringify(DEFAULT_USERS));
  }
  if (!localStorage.getItem('restaurant_orders')) {
    localStorage.setItem('restaurant_orders', JSON.stringify(DEFAULT_ORDERS));
  }
  if (!localStorage.getItem('restaurant_payments')) {
    localStorage.setItem('restaurant_payments', JSON.stringify([]));
  }
  if (!localStorage.getItem('restaurant_notifications')) {
    localStorage.setItem('restaurant_notifications', JSON.stringify([]));
  }
};

if (!isSupabaseConfigured) {
  initializeLocalStorage();
}

const notifyLocalSubscribers = () => {
  window.dispatchEvent(new Event('restaurant-db-update'));
};

// ==========================================
// CENTRAL DATABASE SERVICE OBJECT
// ==========================================

export const dbService = {
  // 1. SETTINGS OPERATIONS
  async getSettings(restaurantId: string): Promise<RestaurantSettings> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single();
      
      if (error) {
        // Create initial settings if not present
        const dbSettings = mapSettingsToDb({ ...DEFAULT_SETTINGS, id: restaurantId });
        const { data: created, error: createError } = await supabase
          .from('restaurants')
          .insert(dbSettings)
          .select()
          .single();
        if (createError) throw createError;
        return mapSettingsToFrontend(created);
      }
      return mapSettingsToFrontend(data);
    } else {
      const data = localStorage.getItem('super_admin_restaurants');
      if (data) {
        const list = JSON.parse(data);
        const match = list.find((r: any) => r.id === restaurantId);
        if (match) return mapSettingsToFrontend(match);
      }
      const singleData = localStorage.getItem('restaurant_settings');
      return singleData ? mapSettingsToFrontend(JSON.parse(singleData)) : mapSettingsToFrontend(DEFAULT_SETTINGS);
    }
  },
  subscribeSettings(restaurantId: string, callback: (settings: RestaurantSettings) => void) {
    if (isSupabaseConfigured) {
      const fetchSettings = async () => {
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', restaurantId)
          .maybeSingle();
        if (!error && data) {
          callback(mapSettingsToFrontend(data));
        }
      };

      fetchSettings();

      const channelId = `pub_settings_${restaurantId}_${Math.random().toString(36).substring(2, 9)}`;
      const channel = supabase
        .channel(channelId)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'restaurants', 
          filter: `id=eq.${restaurantId}` 
        }, (payload) => {
          // Instant inline update — no extra round-trip
          if (payload.eventType === 'DELETE') return; // Restaurant shouldn't be deleted mid-session
          if (payload.new && Object.keys(payload.new).length > 0) {
            callback(mapSettingsToFrontend(payload.new));
          } else {
            fetchSettings(); // fallback for rare edge cases
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      const emitData = () => {
        const data = localStorage.getItem('super_admin_restaurants');
        if (data) {
          const list = JSON.parse(data);
          const match = list.find((r: any) => r.id === restaurantId);
          if (match) {
            callback(mapSettingsToFrontend(match));
            return;
          }
        }
        const singleData = localStorage.getItem('restaurant_settings');
        callback(singleData ? mapSettingsToFrontend(JSON.parse(singleData)) : mapSettingsToFrontend(DEFAULT_SETTINGS));
      };

      emitData();

      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'restaurant_settings') emitData();
      };
      const handleCustomChange = () => emitData();

      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('restaurant-db-update', handleCustomChange);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('restaurant-db-update', handleCustomChange);
      };
    }
  },
  async getRestaurantIdByTableId(tableId: string): Promise<string | null> {
    if (isSupabaseConfigured) {
      // 1. Direct match on table ID
      const { data, error } = await supabase
        .from('tables')
        .select('restaurant_id')
        .eq('id', tableId)
        .maybeSingle();

      if (!error && data?.restaurant_id) {
        return data.restaurant_id;
      }

      // 2. Fallback match on clean table number (e.g. table-1 => 1)
      const cleanNumber = tableId.replace(/^table-/i, '');
      const { data: dataNum } = await supabase
        .from('tables')
        .select('restaurant_id')
        .eq('number', cleanNumber)
        .maybeSingle();

      if (dataNum?.restaurant_id) {
        return dataNum.restaurant_id;
      }

      return null;
    } else {
      const data = localStorage.getItem('restaurant_tables');
      if (data) {
        const list = JSON.parse(data);
        const cleanNumber = tableId.replace(/^table-/i, '');
        const table = list.find((t: any) => t.id === tableId || t.number === cleanNumber || t.number === tableId);
        return table?.restaurant_id || null;
      }
      return null;
    }
  },
  async getTables(restaurantId: string): Promise<RestaurantTable[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('number');
      if (error) throw error;
      return (data || []).map(mapTableToFrontend);
    } else {
      const data = localStorage.getItem('restaurant_tables');
      const parsed = data ? JSON.parse(data) : [];
      const filtered = parsed.filter((t: any) => !t.restaurant_id || t.restaurant_id === restaurantId || t.restaurantId === restaurantId);
      return filtered.map(mapTableToFrontend);
    }
  },

  async getCategories(restaurantId: string): Promise<MenuCategory[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('order', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapCategoryToFrontend);
    } else {
      const data = localStorage.getItem('restaurant_categories');
      const parsed = data ? JSON.parse(data) : [];
      const filtered = parsed.filter((c: any) => !c.restaurant_id || c.restaurant_id === restaurantId || c.restaurantId === restaurantId);
      return filtered.map(mapCategoryToFrontend);
    }
  },

  async getFoodItems(restaurantId: string): Promise<FoodItem[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name');
      if (error) throw error;
      return (data || []).map(mapFoodItemToFrontend);
    } else {
      const data = localStorage.getItem('restaurant_foodItems');
      const parsed = data ? JSON.parse(data) : [];
      const filtered = parsed.filter((i: any) => !i.restaurant_id || i.restaurant_id === restaurantId || i.restaurantId === restaurantId);
      return filtered.map(mapFoodItemToFrontend);
    }
  },

  async getOrders(restaurantId: string): Promise<RestaurantOrder[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapOrderToFrontend);
    } else {
      const data = localStorage.getItem('restaurant_orders');
      const parsed: any[] = data ? JSON.parse(data) : [];
      const filtered = parsed.filter((o: any) => !o.restaurant_id || o.restaurant_id === restaurantId || o.restaurantId === restaurantId);
      filtered.sort((a, b) => new Date(b.createdAt || b.created_at).getTime() - new Date(a.createdAt || a.created_at).getTime());
      return filtered.map(mapOrderToFrontend);
    }
  },

  async getPaymentRecords(restaurantId: string): Promise<PaymentRecord[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapPaymentToFrontend);
    } else {
      const data = localStorage.getItem('restaurant_payments');
      const parsed: any[] = data ? JSON.parse(data) : [];
      const filtered = parsed.filter((p: any) => !p.restaurant_id || p.restaurant_id === restaurantId || p.restaurantId === restaurantId);
      return filtered.map(mapPaymentToFrontend);
    }
  },

  async getNotifications(restaurantId: string): Promise<RestaurantNotification[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapNotificationToFrontend);
    } else {
      const data = localStorage.getItem('restaurant_notifications');
      const parsed: any[] = data ? JSON.parse(data) : [];
      const filtered = parsed.filter((n: any) => !n.restaurant_id || n.restaurant_id === restaurantId || n.restaurantId === restaurantId);
      return parsed.map(mapNotificationToFrontend);
    }
  },


  async updateSettings(restaurantId: string, updates: Partial<RestaurantSettings>): Promise<void> {
    if (isSupabaseConfigured) {
      // Fetch current settings to perform a complete merge and avoid losing toggle configuration
      const current = await this.getSettings(restaurantId);
      const merged = { ...current, ...updates };
      const dbUpdates = mapSettingsToDb(merged);
      const { error } = await supabase
        .from('restaurants')
        .update(dbUpdates)
        .eq('id', restaurantId);
      if (error) throw error;
    } else {
      const current = await this.getSettings(restaurantId);
      const updated = { ...current, ...updates };
      localStorage.setItem('restaurant_settings', JSON.stringify(updated));
      notifyLocalSubscribers();
    }
  },

  async getAllRestaurants(): Promise<RestaurantSettings[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapSettingsToFrontend);
    } else {
      const data = localStorage.getItem('super_admin_restaurants');
      if (!data) {
        const defaultList = [{
          id: 'demo-restaurant',
          name: 'The Grand Bistro',
          theme_color: '#6366F1|true|true|true|en',
          subscription_status: 'trial',
          plan_type: 'starter',
          created_at: new Date().toISOString()
        }];
        localStorage.setItem('super_admin_restaurants', JSON.stringify(defaultList));
        return defaultList.map(mapSettingsToFrontend);
      }
      return JSON.parse(data).map(mapSettingsToFrontend);
    }
  },

  async createRestaurant(restaurant: Partial<RestaurantSettings>): Promise<void> {
    if (isSupabaseConfigured) {
      const dbRow = mapSettingsToDb(restaurant);
      dbRow.created_at = new Date().toISOString();
      dbRow.subscription_status = restaurant.subscriptionStatus || 'trial';
      dbRow.subscription_expires_at = restaurant.subscriptionExpiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      dbRow.plan_type = restaurant.planType || 'starter';
      const { error } = await supabase
        .from('restaurants')
        .insert(dbRow);
      if (error) throw error;
    } else {
      const data = localStorage.getItem('super_admin_restaurants');
      const list = data ? JSON.parse(data) : [];
      const newRest = {
        ...DEFAULT_SETTINGS,
        ...restaurant,
        id: restaurant.id || `rest-${Date.now()}`,
        subscriptionStatus: restaurant.subscriptionStatus || 'trial',
        planType: restaurant.planType || 'starter',
        subscriptionExpiresAt: restaurant.subscriptionExpiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      };
      list.push(newRest);
      localStorage.setItem('super_admin_restaurants', JSON.stringify(list));
      notifyLocalSubscribers();
    }
  },

  async updateRestaurantSubscription(restaurantId: string, updates: Partial<RestaurantSettings>): Promise<void> {
    if (isSupabaseConfigured) {
      const dbRow = mapSettingsToDb(updates);
      const { error } = await supabase
        .from('restaurants')
        .update(dbRow)
        .eq('id', restaurantId);
      if (error) throw error;
    } else {
      const data = localStorage.getItem('super_admin_restaurants');
      const list = data ? JSON.parse(data) : [];
      const index = list.findIndex((r: any) => r.id === restaurantId);
      if (index > -1) {
        list[index] = { ...list[index], ...updates };
        localStorage.setItem('super_admin_restaurants', JSON.stringify(list));
        const activeStaffRest = localStorage.getItem('last_active_staff_restaurant_id') || 'demo-restaurant';
        if (restaurantId === 'demo-restaurant' || restaurantId === activeStaffRest) {
          const currentSettings = localStorage.getItem('restaurant_settings');
          const current = currentSettings ? JSON.parse(currentSettings) : {};
          localStorage.setItem('restaurant_settings', JSON.stringify({ ...current, ...updates }));
        }
        notifyLocalSubscribers();
      }
    }
  },

  // 2. STAFF / USER MANAGEMENT
  async getUsers(restaurantId: string): Promise<UserProfile[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
      return (data || []).map(mapUserToFrontend);
    } else {
      const data = localStorage.getItem('restaurant_users');
      return data ? JSON.parse(data).map(mapUserToFrontend) : [];
    }
  },

  async updateUserRole(restaurantId: string, userId: string, role: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', userId)
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
    } else {
      const users = await this.getUsers(restaurantId);
      const updated = users.map(u => (u.id === userId ? { ...u, role: role as any } : u));
      localStorage.setItem('restaurant_users', JSON.stringify(updated));
      notifyLocalSubscribers();
    }
  },

  async addUser(restaurantId: string, user: UserProfile): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('users')
        .insert({
          id: user.id,
          restaurant_id: restaurantId,
          name: user.name,
          email: user.email,
          role: user.role,
          created_at: user.createdAt
        });
      if (error) throw error;
    } else {
      const users = await this.getUsers(restaurantId);
      users.push(user);
      localStorage.setItem('restaurant_users', JSON.stringify(users));
      notifyLocalSubscribers();
    }
  },

  async createStaffUser(email: string, name: string, role: string, restaurantId: string, password?: string): Promise<void> {
    if (isSupabaseConfigured) {
      // Use the Edge Function which uses admin.createUser() — no confirmation email sent
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const response = await fetch(`${supabaseUrl}/functions/v1/create-staff-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          email,
          name,
          role,
          restaurant_id: restaurantId,
          password: password || 'ChangeMe@123'
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create staff user');
    } else {
      const dataKey = 'restaurant_users';
      const existing = localStorage.getItem(dataKey);
      const list = existing ? JSON.parse(existing) : [];
      list.push({
        id: `mock-user-${Date.now()}`,
        restaurant_id: restaurantId,
        name,
        email,
        role,
        is_super_admin: false,
        created_at: new Date().toISOString()
      });
      localStorage.setItem(dataKey, JSON.stringify(list));
      notifyLocalSubscribers();
    }
  },

  async deleteUser(restaurantId: string, userId: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
    } else {
      const users = await this.getUsers(restaurantId);
      const updated = users.filter(u => u.id !== userId);
      localStorage.setItem('restaurant_users', JSON.stringify(updated));
      notifyLocalSubscribers();
    }
  },

  async getAllUsers(): Promise<UserProfile[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .select('*');
      if (error) throw error;
      return (data || []).map(mapUserToFrontend);
    } else {
      const data = localStorage.getItem('restaurant_users');
      return data ? JSON.parse(data).map(mapUserToFrontend) : [];
    }
  },

  async deleteUserByAdmin(userId: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      if (error) throw error;
    } else {
      const dataKey = 'restaurant_users';
      const existing = localStorage.getItem(dataKey);
      if (existing) {
        const list = JSON.parse(existing);
        const updated = list.filter((u: any) => u.id !== userId);
        localStorage.setItem(dataKey, JSON.stringify(updated));
        notifyLocalSubscribers();
      }
    }
  },

  async updateUserByAdmin(userId: string, name: string, role: string, restaurantId: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('users')
        .update({
          name,
          role,
          restaurant_id: restaurantId
        })
        .eq('id', userId);
      if (error) throw error;
    } else {
      const dataKey = 'restaurant_users';
      const existing = localStorage.getItem(dataKey);
      if (existing) {
        const list = JSON.parse(existing);
        const index = list.findIndex((u: any) => u.id === userId);
        if (index > -1) {
          list[index] = {
            ...list[index],
            name,
            role,
            restaurant_id: restaurantId
          };
          localStorage.setItem(dataKey, JSON.stringify(list));
          notifyLocalSubscribers();
        }
      }
    }
  },

  async deleteRestaurant(restaurantId: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', restaurantId);
      if (error) throw error;
    } else {
      const data = localStorage.getItem('super_admin_restaurants');
      if (data) {
        const list = JSON.parse(data);
        const updated = list.filter((r: any) => r.id !== restaurantId);
        localStorage.setItem('super_admin_restaurants', JSON.stringify(updated));
        notifyLocalSubscribers();
      }
    }
  },

  // 3. TABLES (Real-time Subscribe & CRUD)
  subscribeTables(restaurantId: string, callback: (tables: RestaurantTable[]) => void) {
    if (isSupabaseConfigured) {
      // Track current state locally so inline updates can be applied without re-fetching
      let currentTables: RestaurantTable[] = [];

      const fetchTables = async () => {
        const { data, error } = await supabase
          .from('tables')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('number');
        if (!error && data) {
          currentTables = data.map(mapTableToFrontend);
          callback(currentTables);
        }
      };
      
      fetchTables();

      const channelId = `pub_tables_${restaurantId}_${Math.random().toString(36).substring(2, 9)}`;
      const channel = supabase
        .channel(channelId)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'tables', 
          filter: `restaurant_id=eq.${restaurantId}` 
        }, (payload) => {
          if (!payload.new) return;
          const newTable = mapTableToFrontend(payload.new);
          currentTables = [...currentTables.filter(t => t.id !== newTable.id), newTable]
            .sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true }));
          callback(currentTables);
        })
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'tables', 
          filter: `restaurant_id=eq.${restaurantId}` 
        }, (payload) => {
          if (!payload.new) return;
          const updated = mapTableToFrontend(payload.new);
          currentTables = currentTables.map(t => t.id === updated.id ? updated : t);
          callback(currentTables);
        })
        .on('postgres_changes', { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'tables', 
          filter: `restaurant_id=eq.${restaurantId}` 
        }, (payload) => {
          if (!payload.old?.id) return;
          currentTables = currentTables.filter(t => t.id !== payload.old.id);
          callback(currentTables);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      const emitData = () => {
        const data = localStorage.getItem('restaurant_tables');
        const parsed = data ? JSON.parse(data) : [];
        parsed.sort((a: any, b: any) => parseFloat(a.number) - parseFloat(b.number));
        callback(parsed.map(mapTableToFrontend));
      };

      emitData();

      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'restaurant_tables') emitData();
      };
      const handleCustomChange = () => emitData();

      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('restaurant-db-update', handleCustomChange);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('restaurant-db-update', handleCustomChange);
      };
    }
  },

  async saveTable(restaurantId: string, table: RestaurantTable): Promise<void> {
    if (isSupabaseConfigured) {
      const dbTable = mapTableToDb(table, restaurantId);
      const { error } = await supabase
        .from('tables')
        .upsert(dbTable);
      if (error) throw error;
    } else {
      const data = localStorage.getItem('restaurant_tables');
      const tables: any[] = data ? JSON.parse(data) : [];
      const itemWithTenant = { ...table, restaurant_id: restaurantId };
      const index = tables.findIndex(t => t.id === table.id);
      if (index > -1) {
        tables[index] = itemWithTenant;
      } else {
        tables.push(itemWithTenant);
      }
      localStorage.setItem('restaurant_tables', JSON.stringify(tables));
      notifyLocalSubscribers();
    }
  },

  async updateTableStatus(restaurantId: string, tableId: string, status: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.rpc('update_table_status', {
        p_table_id: tableId,
        p_status: status
      });
      if (error) throw error;
    } else {
      const data = localStorage.getItem('restaurant_tables');
      const tables: RestaurantTable[] = data ? JSON.parse(data) : [];
      const index = tables.findIndex(t => t.id === tableId);
      if (index > -1) {
        tables[index].status = status as any;
        tables[index].updatedAt = new Date().toISOString();
        localStorage.setItem('restaurant_tables', JSON.stringify(tables));
        notifyLocalSubscribers();
      }
    }
  },

  async deleteTable(restaurantId: string, tableId: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('tables')
        .delete()
        .eq('id', tableId)
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
    } else {
      const data = localStorage.getItem('restaurant_tables');
      let tables: RestaurantTable[] = data ? JSON.parse(data) : [];
      tables = tables.filter(t => t.id !== tableId);
      localStorage.setItem('restaurant_tables', JSON.stringify(tables));
      notifyLocalSubscribers();
    }
  },

  // 4. CATEGORIES (Real-time Subscribe & CRUD)
  subscribeCategories(restaurantId: string, callback: (categories: MenuCategory[]) => void) {
    if (isSupabaseConfigured) {
      let currentCategories: MenuCategory[] = [];

      const fetchCategories = async () => {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('order', { ascending: true });
        if (!error && data) {
          currentCategories = data.map(mapCategoryToFrontend);
          callback(currentCategories);
        }
      };

      fetchCategories();

      const channelId = `pub_categories_${restaurantId}_${Math.random().toString(36).substring(2, 9)}`;
      const channel = supabase
        .channel(channelId)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'categories', 
          filter: `restaurant_id=eq.${restaurantId}` 
        }, (payload) => {
          if (!payload.new) return;
          const newCat = mapCategoryToFrontend(payload.new);
          currentCategories = [...currentCategories.filter(c => c.id !== newCat.id), newCat]
            .sort((a, b) => a.order - b.order);
          callback([...currentCategories]);
        })
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'categories', 
          filter: `restaurant_id=eq.${restaurantId}` 
        }, (payload) => {
          if (!payload.new) return;
          const updated = mapCategoryToFrontend(payload.new);
          currentCategories = currentCategories.map(c => c.id === updated.id ? updated : c)
            .sort((a, b) => a.order - b.order);
          callback([...currentCategories]);
        })
        .on('postgres_changes', { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'categories'
        }, (payload) => {
          const deletedId = payload.old?.id;
          if (deletedId) {
            const beforeLen = currentCategories.length;
            currentCategories = currentCategories.filter(c => c.id !== deletedId);
            if (currentCategories.length !== beforeLen) {
              callback([...currentCategories]);
            }
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      const emitData = () => {
        const data = localStorage.getItem('restaurant_categories');
        const parsed: MenuCategory[] = data ? JSON.parse(data) : [];
        parsed.sort((a, b) => a.order - b.order);
        callback(parsed.map(mapCategoryToFrontend));
      };

      emitData();

      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'restaurant_categories') emitData();
      };
      const handleCustomChange = () => emitData();

      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('restaurant-db-update', handleCustomChange);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('restaurant-db-update', handleCustomChange);
      };
    }
  },

  async saveCategory(restaurantId: string, category: MenuCategory): Promise<void> {
    if (isSupabaseConfigured) {
      const dbCat = mapCategoryToDb(category, restaurantId);
      const { error } = await supabase
        .from('categories')
        .upsert(dbCat);
      if (error) throw error;
    } else {
      const data = localStorage.getItem('restaurant_categories');
      const categories: any[] = data ? JSON.parse(data) : [];
      const itemWithTenant = { ...category, restaurant_id: restaurantId };
      const index = categories.findIndex(c => c.id === category.id);
      if (index > -1) {
        categories[index] = itemWithTenant;
      } else {
        categories.push(itemWithTenant);
      }
      localStorage.setItem('restaurant_categories', JSON.stringify(categories));
      notifyLocalSubscribers();
    }
  },

  async deleteCategory(restaurantId: string, categoryId: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
    } else {
      const data = localStorage.getItem('restaurant_categories');
      let categories: MenuCategory[] = data ? JSON.parse(data) : [];
      categories = categories.filter(c => c.id !== categoryId);
      localStorage.setItem('restaurant_categories', JSON.stringify(categories));
      notifyLocalSubscribers();
    }
  },

  // 5. FOOD ITEMS (Real-time Subscribe & CRUD)
  subscribeFoodItems(restaurantId: string, callback: (items: FoodItem[]) => void) {
    if (isSupabaseConfigured) {
      let currentItems: FoodItem[] = [];

      const fetchFoodItems = async () => {
        const { data, error } = await supabase
          .from('food_items')
          .select('*')
          .eq('restaurant_id', restaurantId);
        if (!error && data) {
          currentItems = data.map(mapFoodItemToFrontend);
          callback([...currentItems]);
        }
      };

      fetchFoodItems();

      const channelId = `pub_food_items_${restaurantId}_${Math.random().toString(36).substring(2, 9)}`;
      const channel = supabase
        .channel(channelId)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'food_items', 
          filter: `restaurant_id=eq.${restaurantId}` 
        }, (payload) => {
          if (!payload.new) return;
          const newItem = mapFoodItemToFrontend(payload.new);
          currentItems = [newItem, ...currentItems.filter(i => i.id !== newItem.id)];
          callback([...currentItems]);
        })
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'food_items', 
          filter: `restaurant_id=eq.${restaurantId}` 
        }, (payload) => {
          if (!payload.new) return;
          const updated = mapFoodItemToFrontend(payload.new);
          currentItems = currentItems.map(i => i.id === updated.id ? updated : i);
          callback([...currentItems]);
        })
        .on('postgres_changes', { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'food_items'
        }, (payload) => {
          const deletedId = payload.old?.id;
          if (deletedId) {
            const beforeLen = currentItems.length;
            currentItems = currentItems.filter(i => i.id !== deletedId);
            if (currentItems.length !== beforeLen) {
              callback([...currentItems]);
            }
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      const emitData = () => {
        const data = localStorage.getItem('restaurant_foodItems');
        const parsed = data ? JSON.parse(data) : [];
        callback(parsed.map(mapFoodItemToFrontend));
      };

      emitData();

      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'restaurant_foodItems') emitData();
      };
      const handleCustomChange = () => emitData();

      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('restaurant-db-update', handleCustomChange);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('restaurant-db-update', handleCustomChange);
      };
    }
  },

  async saveFoodItem(restaurantId: string, item: FoodItem): Promise<void> {
    if (isSupabaseConfigured) {
      const dbItem = mapFoodItemToDb(item, restaurantId);
      const { error } = await supabase
        .from('food_items')
        .upsert(dbItem);
      if (error) throw error;
    } else {
      const data = localStorage.getItem('restaurant_foodItems');
      const items: any[] = data ? JSON.parse(data) : [];
      const itemWithTenant = { ...item, restaurant_id: restaurantId };
      const index = items.findIndex(i => i.id === item.id);
      if (index > -1) {
        items[index] = itemWithTenant;
      } else {
        items.push(itemWithTenant);
      }
      localStorage.setItem('restaurant_foodItems', JSON.stringify(items));
      notifyLocalSubscribers();
    }
  },

  async deleteFoodItem(restaurantId: string, itemId: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('food_items')
        .delete()
        .eq('id', itemId)
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
    } else {
      const data = localStorage.getItem('restaurant_foodItems');
      let items: FoodItem[] = data ? JSON.parse(data) : [];
      items = items.filter(i => i.id !== itemId);
      localStorage.setItem('restaurant_foodItems', JSON.stringify(items));
      notifyLocalSubscribers();
    }
  },

  // 6. ORDERS (Real-time Subscribe & CRUD)
  subscribeOrders(restaurantId: string, callback: (orders: RestaurantOrder[]) => void) {
    if (isSupabaseConfigured) {
      let currentOrders: RestaurantOrder[] = [];

      const fetchOrders = async () => {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false });
        if (!error && data) {
          currentOrders = data.map(mapOrderToFrontend);
          callback(currentOrders);
        }
      };

      fetchOrders();

      const channelId = `pub_orders_${restaurantId}_${Math.random().toString(36).substring(2, 9)}`;
      const channel = supabase
        .channel(channelId)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'orders', 
          filter: `restaurant_id=eq.${restaurantId}` 
        }, (payload) => {
          if (!payload.new) return;
          const newOrder = mapOrderToFrontend(payload.new);
          // Prepend new order so it appears instantly at top of list
          currentOrders = [newOrder, ...currentOrders.filter(o => o.id !== newOrder.id)];
          callback(currentOrders);
        })
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders', 
          filter: `restaurant_id=eq.${restaurantId}` 
        }, (payload) => {
          if (!payload.new) return;
          const updated = mapOrderToFrontend(payload.new);
          currentOrders = currentOrders.map(o => o.id === updated.id ? updated : o);
          callback(currentOrders);
        })
        .on('postgres_changes', { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'orders', 
          filter: `restaurant_id=eq.${restaurantId}` 
        }, (payload) => {
          if (!payload.old?.id) return;
          currentOrders = currentOrders.filter(o => o.id !== payload.old.id);
          callback(currentOrders);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      const emitData = () => {
        const data = localStorage.getItem('restaurant_orders');
        const parsed: any[] = data ? JSON.parse(data) : [];
        const filtered = parsed.filter((o: any) => !o.restaurant_id || o.restaurant_id === restaurantId || o.restaurantId === restaurantId);
        filtered.sort((a, b) => new Date(b.createdAt || b.created_at).getTime() - new Date(a.createdAt || a.created_at).getTime());
        callback(filtered.map(mapOrderToFrontend));
      };

      emitData();

      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'restaurant_orders') emitData();
      };
      const handleCustomChange = () => emitData();

      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('restaurant-db-update', handleCustomChange);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('restaurant-db-update', handleCustomChange);
      };
    }
  },

  async saveOrder(restaurantId: string, order: RestaurantOrder): Promise<void> {
    if (isSupabaseConfigured) {
      const dbOrder = mapOrderToDb(order, restaurantId);
      const { error } = await supabase
        .from('orders')
        .upsert(dbOrder);
      if (error) throw error;
    } else {
      const data = localStorage.getItem('restaurant_orders');
      const orders: any[] = data ? JSON.parse(data) : [];
      const itemWithTenant = { ...order, restaurant_id: restaurantId };
      const index = orders.findIndex(o => o.id === order.id);
      if (index > -1) {
        orders[index] = itemWithTenant;
      } else {
        orders.push(itemWithTenant);
      }
      localStorage.setItem('restaurant_orders', JSON.stringify(orders));
      notifyLocalSubscribers();
    }
  },

  async cleanupExpiredOrders(restaurantId: string): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    if (isSupabaseConfigured) {
      // 1. Delete orders older than 30 days
      const { error: ordersError } = await supabase
        .from('orders')
        .delete()
        .eq('restaurant_id', restaurantId)
        .lt('created_at', thirtyDaysAgoStr);
      if (ordersError) {
        console.error('Error cleaning up old orders:', ordersError);
      }

      // 2. Delete payment transactions older than 30 days
      const { error: paymentsError } = await supabase
        .from('payments')
        .delete()
        .eq('restaurant_id', restaurantId)
        .lt('created_at', thirtyDaysAgoStr);
      if (paymentsError) {
        console.error('Error cleaning up old payments:', paymentsError);
      }
    } else {
      // LocalStorage orders cleanup
      const data = localStorage.getItem('restaurant_orders');
      if (data) {
        const orders: RestaurantOrder[] = JSON.parse(data);
        const filtered = orders.filter(o => new Date(o.createdAt).getTime() >= thirtyDaysAgo.getTime());
        localStorage.setItem('restaurant_orders', JSON.stringify(filtered));
      }

      // LocalStorage payments cleanup
      const paymentsData = localStorage.getItem('restaurant_payments');
      if (paymentsData) {
        const paymentsList: PaymentRecord[] = JSON.parse(paymentsData);
        const filtered = paymentsList.filter(p => new Date(p.createdAt).getTime() >= thirtyDaysAgo.getTime());
        localStorage.setItem('restaurant_payments', JSON.stringify(filtered));
      }
      
      notifyLocalSubscribers();
    }
  },

  // 7. PAYMENTS (CRUD & List)
  subscribePayments(restaurantId: string, callback: (payments: PaymentRecord[]) => void) {
    if (isSupabaseConfigured) {
      let currentPayments: PaymentRecord[] = [];

      const fetchPayments = async () => {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false });
        if (!error && data) {
          currentPayments = data.map(mapPaymentToFrontend);
          callback(currentPayments);
        }
      };

      fetchPayments();

      const channelId = `pub_payments_${restaurantId}_${Math.random().toString(36).substring(2, 9)}`;
      const channel = supabase
        .channel(channelId)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'payments', 
          filter: `restaurant_id=eq.${restaurantId}` 
        }, (payload) => {
          if (!payload.new) return;
          const newPay = mapPaymentToFrontend(payload.new);
          currentPayments = [newPay, ...currentPayments.filter(p => p.id !== newPay.id)];
          callback(currentPayments);
        })
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'payments', 
          filter: `restaurant_id=eq.${restaurantId}` 
        }, (payload) => {
          if (!payload.new) return;
          const updated = mapPaymentToFrontend(payload.new);
          currentPayments = currentPayments.map(p => p.id === updated.id ? updated : p);
          callback(currentPayments);
        })
        .on('postgres_changes', { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'payments', 
          filter: `restaurant_id=eq.${restaurantId}` 
        }, (payload) => {
          if (!payload.old?.id) return;
          currentPayments = currentPayments.filter(p => p.id !== payload.old.id);
          callback(currentPayments);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      const emitData = () => {
        const data = localStorage.getItem('restaurant_payments');
        const parsed: PaymentRecord[] = data ? JSON.parse(data) : [];
        parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(parsed.map(mapPaymentToFrontend));
      };

      emitData();

      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'restaurant_payments') emitData();
      };
      const handleCustomChange = () => emitData();

      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('restaurant-db-update', handleCustomChange);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('restaurant-db-update', handleCustomChange);
      };
    }
  },

  async addPayment(restaurantId: string, payment: PaymentRecord): Promise<void> {
    if (isSupabaseConfigured) {
      const dbPayment = mapPaymentToDb(payment, restaurantId);
      const { error } = await supabase
        .from('payments')
        .insert(dbPayment);
      if (error) throw error;
    } else {
      const data = localStorage.getItem('restaurant_payments');
      const payments: PaymentRecord[] = data ? JSON.parse(data) : [];
      payments.push(payment);
      localStorage.setItem('restaurant_payments', JSON.stringify(payments));
      notifyLocalSubscribers();
    }
  },

  // 8. NOTIFICATIONS (Real-time Subscribe & CRUD)
  subscribeNotifications(restaurantId: string, callback: (notifications: RestaurantNotification[]) => void) {
    if (isSupabaseConfigured) {
      let currentNotifications: RestaurantNotification[] = [];

      const fetchNotifications = async () => {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false })
          .limit(50);
        if (!error && data) {
          currentNotifications = data.map(mapNotificationToFrontend);
          callback(currentNotifications);
        }
      };

      fetchNotifications();

      const channelId = `pub_notifications_${restaurantId}_${Math.random().toString(36).substring(2, 9)}`;
      const channel = supabase
        .channel(channelId)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications', 
          filter: `restaurant_id=eq.${restaurantId}` 
        }, (payload) => {
          if (!payload.new) return;
          const newNotif = mapNotificationToFrontend(payload.new);
          // Prepend so newest notifications appear first
          currentNotifications = [newNotif, ...currentNotifications.filter(n => n.id !== newNotif.id)]
            .slice(0, 50);
          callback(currentNotifications);
        })
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'notifications', 
          filter: `restaurant_id=eq.${restaurantId}` 
        }, (payload) => {
          if (!payload.new) return;
          const updated = mapNotificationToFrontend(payload.new);
          currentNotifications = currentNotifications.map(n => n.id === updated.id ? updated : n);
          callback(currentNotifications);
        })
        .on('postgres_changes', { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'notifications', 
          filter: `restaurant_id=eq.${restaurantId}` 
        }, (payload) => {
          if (!payload.old?.id) return;
          currentNotifications = currentNotifications.filter(n => n.id !== payload.old.id);
          callback(currentNotifications);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      const emitData = () => {
        const data = localStorage.getItem('restaurant_notifications');
        const parsed: RestaurantNotification[] = data ? JSON.parse(data) : [];
        parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(parsed.map(mapNotificationToFrontend));
      };

      emitData();

      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'restaurant_notifications') emitData();
      };
      const handleCustomChange = () => emitData();

      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('restaurant-db-update', handleCustomChange);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('restaurant-db-update', handleCustomChange);
      };
    }
  },

  async addNotification(restaurantId: string, n: RestaurantNotification): Promise<void> {
    if (isSupabaseConfigured) {
      const dbNotification = mapNotificationToDb(n, restaurantId);
      const { error } = await supabase
        .from('notifications')
        .insert(dbNotification);
      if (error) throw error;
    } else {
      const data = localStorage.getItem('restaurant_notifications');
      const list: RestaurantNotification[] = data ? JSON.parse(data) : [];
      list.push(n);
      localStorage.setItem('restaurant_notifications', JSON.stringify(list));
      notifyLocalSubscribers();
    }
  },

  async markNotificationRead(restaurantId: string, id: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
    } else {
      const data = localStorage.getItem('restaurant_notifications');
      const list: RestaurantNotification[] = data ? JSON.parse(data) : [];
      const updated = list.map(n => (n.id === id ? { ...n, isRead: true } : n));
      localStorage.setItem('restaurant_notifications', JSON.stringify(updated));
      notifyLocalSubscribers();
    }
  },

  async clearAllNotifications(restaurantId: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('restaurant_id', restaurantId)
        .eq('is_read', false);
      if (error) throw error;
    } else {
      const data = localStorage.getItem('restaurant_notifications');
      const list: RestaurantNotification[] = data ? JSON.parse(data) : [];
      const updated = list.map(n => ({ ...n, isRead: true }));
      localStorage.setItem('restaurant_notifications', JSON.stringify(updated));
      notifyLocalSubscribers();
    }
  }
};
export default dbService;
