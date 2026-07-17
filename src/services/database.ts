import { isSupabaseConfigured, supabase } from './supabase';
import {
  RestaurantSettings,
  UserProfile,
  RestaurantTable,
  MenuCategory,
  FoodItem,
  RestaurantOrder,
  PaymentRecord,
  RestaurantNotification,
  RestaurantWorkspace,
  SubscriptionPlan,
  InventoryItem,
  ActivityLog,
} from '../types';

// ==========================================
// MAPPERS: postgres (snake_case) <-> frontend (camelCase)
// ==========================================

const mapSettingsToFrontend = (row: any): RestaurantSettings => {
  const rawTheme = row.theme_color || row.themeColor || '#6366F1';
  const themeParts = rawTheme.split('|');
  const themeColor = themeParts[0] || '#6366F1';
  const enableWaiterCall = themeParts[1] !== 'false';
  const enableBillRequest = themeParts[2] !== 'false';
  const enableSoundNotification = themeParts[3] !== 'false';

  return {
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    email: row.email,
    logoUrl: row.logo_url || row.logoUrl || '',
    gstNumber: row.gst_number || row.gstNumber || '',
    taxPercentage: Number(row.tax_percentage ?? row.taxPercentage ?? 18),
    currency: row.currency || '₹',
    openingHours: row.opening_hours || row.openingHours || '09:00',
    closingHours: row.closing_hours || row.closingHours || '23:00',
    themeColor,
    enableWaiterCall,
    enableBillRequest,
    enableSoundNotification,
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
    ...(model.logoUrl !== undefined && { logo_url: model.logoUrl }),
    ...(model.gstNumber !== undefined && { gst_number: model.gstNumber }),
    ...(model.taxPercentage !== undefined && { tax_percentage: model.taxPercentage }),
    ...(model.currency !== undefined && { currency: model.currency }),
    ...(model.openingHours !== undefined && { opening_hours: model.openingHours }),
    ...(model.closingHours !== undefined && { closing_hours: model.closingHours }),
  };

  if (model.themeColor !== undefined) {
    const waiter = model.enableWaiterCall ?? true;
    const bill = model.enableBillRequest ?? true;
    const sound = model.enableSoundNotification ?? true;
    dbRow.theme_color = `${model.themeColor}|${waiter}|${bill}|${sound}|en`;
  }

  return dbRow;
};

const mapUserToFrontend = (row: any): UserProfile => ({
  id: row.id,
  restaurantId: row.restaurant_id,
  name: row.name,
  email: row.email,
  role: row.role,
  status: row.status || 'active',
  createdAt: row.created_at,
});

const mapTableToFrontend = (row: any): RestaurantTable => ({
  id: row.id,
  restaurantId: row.restaurant_id,
  branchId: row.branch_id,
  number: row.number,
  capacity: Number(row.capacity),
  status: row.status,
  qrCodeUrl: row.qr_code_url,
  updatedAt: row.updated_at,
});

const mapTableToDb = (model: RestaurantTable, restaurantId: string) => ({
  id: model.id,
  restaurant_id: restaurantId,
  branch_id: model.branchId || null,
  number: model.number,
  capacity: model.capacity,
  status: model.status,
  qr_code_url: model.qrCodeUrl,
  updated_at: model.updatedAt,
});

const mapCategoryToFrontend = (row: any): MenuCategory => ({
  id: row.id,
  restaurantId: row.restaurant_id,
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
  restaurantId: row.restaurant_id,
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
  restaurantId: row.restaurant_id,
  branchId: row.branch_id,
  orderNumber: row.order_number,
  tableId: row.table_id,
  tableName: row.table_name,
  items: row.items, // jsonb representation compatibility
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
  branch_id: model.branchId || null,
  order_number: model.orderNumber,
  table_id: model.tableId,
  table_name: model.tableName,
  items: model.items,
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
  restaurantId: row.restaurant_id,
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
  restaurantId: row.restaurant_id,
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

const DEFAULT_SETTINGS: RestaurantSettings = {
  id: 'c08eb195-236b-4b20-9118-18e388d7adfe',
  name: 'The Grand SaaS Bistro',
  address: '102 Gourmet Boulevard, Culinary District',
  phone: '+1 (555) 019-2834',
  email: 'hello@grandbistro.com',
  logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=60',
  gstNumber: '22AAAAA1111A1Z1',
  taxPercentage: 18,
  currency: '₹',
  openingHours: '09:00',
  closingHours: '23:00',
  themeColor: '#6366F1',
  enableWaiterCall: true,
  enableBillRequest: true,
  enableSoundNotification: true,
  createdAt: new Date().toISOString(),
};

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

const DEFAULT_SUBSCRIPTION: SubscriptionPlan = {
  restaurantId: 'c08eb195-236b-4b20-9118-18e388d7adfe',
  plan: 'professional',
  startsAt: new Date().toISOString(),
  endsAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months
  status: 'active',
  maxTables: 25,
  maxStaff: 20,
  maxBranches: 2,
};

// Seed LocalStorage helpers
const initializeMockLocalStorage = () => {
  if (!localStorage.getItem('saas_workspaces')) {
    localStorage.setItem('saas_workspaces', JSON.stringify(DEFAULT_WORKSPACES));
  }
  if (!localStorage.getItem('saas_subscription_c08eb195-236b-4b20-9118-18e388d7adfe')) {
    localStorage.setItem('saas_subscription_c08eb195-236b-4b20-9118-18e388d7adfe', JSON.stringify(DEFAULT_SUBSCRIPTION));
  }
  if (!localStorage.getItem('restaurant_settings')) {
    localStorage.setItem('restaurant_settings', JSON.stringify(DEFAULT_SETTINGS));
  }
};

initializeMockLocalStorage();

const notifyLocalSubscribers = () => {
  window.dispatchEvent(new Event('restaurant-db-update'));
};

// ==========================================
// DB SERVICE METHODS (Supabase & Mock Mode)
// ==========================================

export const dbService = {

  // 1. WORKSPACE / TENANT & SUBSCRIPTION OPERATIONS
  async getUserWorkspaces(userId: string): Promise<RestaurantWorkspace[]> {
    if (isSupabaseConfigured) {
      // Fetch workspaces where user has profile role mapping
      const { data, error } = await supabase
        .from('restaurant_users')
        .select(`
          restaurant_id,
          role,
          restaurants (
            id,
            name,
            logo_url,
            theme_color,
            plan,
            status
          )
        `)
        .eq('id', userId);

      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.restaurants.id,
        name: row.restaurants.name,
        logoUrl: row.restaurants.logo_url,
        themeColor: row.restaurants.theme_color,
        plan: row.restaurants.plan,
        status: row.restaurants.status,
        role: row.role,
      }));
    } else {
      const data = localStorage.getItem('saas_workspaces');
      return data ? JSON.parse(data) : DEFAULT_WORKSPACES;
    }
  },

  async getSubscription(restaurantId: string): Promise<SubscriptionPlan> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('restaurant_subscriptions')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return {
          restaurantId,
          plan: 'free',
          startsAt: null,
          endsAt: null,
          status: 'expired',
          maxTables: 5,
          maxStaff: 2,
          maxBranches: 1,
        };
      }
      return {
        restaurantId: data.restaurant_id,
        plan: data.plan,
        startsAt: data.starts_at,
        endsAt: data.ends_at,
        status: data.status,
        maxTables: data.max_tables,
        maxStaff: data.max_staff,
        maxBranches: data.max_branches,
      };
    } else {
      const data = localStorage.getItem(`saas_subscription_${restaurantId}`);
      return data ? JSON.parse(data) : {
        ...DEFAULT_SUBSCRIPTION,
        restaurantId
      };
    }
  },

  async getSettings(restaurantId: string): Promise<RestaurantSettings> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single();
      
      if (error) {
        // Fallback or trigger onboarding setup
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
      const data = localStorage.getItem(`restaurant_settings_${restaurantId}`);
      return data ? mapSettingsToFrontend(JSON.parse(data)) : mapSettingsToFrontend({ ...DEFAULT_SETTINGS, id: restaurantId });
    }
  },

  async updateSettings(restaurantId: string, updates: Partial<RestaurantSettings>): Promise<void> {
    if (isSupabaseConfigured) {
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
      localStorage.setItem(`restaurant_settings_${restaurantId}`, JSON.stringify(updated));
      notifyLocalSubscribers();
    }
  },

  // 2. STAFF & EMPLOYEE PORTAL
  async getUsers(restaurantId: string): Promise<UserProfile[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('restaurant_users')
        .select('*')
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
      return (data || []).map(mapUserToFrontend);
    } else {
      const data = localStorage.getItem(`restaurant_users_${restaurantId}`);
      return data ? JSON.parse(data).map(mapUserToFrontend) : [];
    }
  },

  async updateUserRole(restaurantId: string, userId: string, role: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('restaurant_users')
        .update({ role })
        .eq('id', userId)
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
    } else {
      const users = await this.getUsers(restaurantId);
      const updated = users.map(u => (u.id === userId ? { ...u, role: role as any } : u));
      localStorage.setItem(`restaurant_users_${restaurantId}`, JSON.stringify(updated));
      notifyLocalSubscribers();
    }
  },

  async addUser(restaurantId: string, user: UserProfile): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('restaurant_users')
        .insert({
          id: user.id,
          restaurant_id: restaurantId,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status || 'active',
          created_at: user.createdAt
        });
      if (error) throw error;
    } else {
      const users = await this.getUsers(restaurantId);
      users.push(user);
      localStorage.setItem(`restaurant_users_${restaurantId}`, JSON.stringify(users));
      notifyLocalSubscribers();
    }
  },

  async deleteUser(restaurantId: string, userId: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('restaurant_users')
        .delete()
        .eq('id', userId)
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
    } else {
      const users = await this.getUsers(restaurantId);
      const updated = users.filter(u => u.id !== userId);
      localStorage.setItem(`restaurant_users_${restaurantId}`, JSON.stringify(updated));
      notifyLocalSubscribers();
    }
  },

  // 3. TABLES (Fetch once or subscribe)
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
      const data = localStorage.getItem(`restaurant_tables_${restaurantId}`);
      const parsed = data ? JSON.parse(data) : [];
      return parsed.map(mapTableToFrontend);
    }
  },

  subscribeTables(restaurantId: string, callback: (tables: RestaurantTable[]) => void) {
    if (isSupabaseConfigured) {
      const fetchTables = async () => {
        const list = await this.getTables(restaurantId);
        callback(list);
      };
      
      fetchTables();

      const channel = supabase
        .channel(`public:tables:${restaurantId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'tables', 
          filter: `restaurant_id=eq.${restaurantId}` 
        }, () => {
          fetchTables();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      const emitData = () => {
        const data = localStorage.getItem(`restaurant_tables_${restaurantId}`);
        const parsed = data ? JSON.parse(data) : [];
        parsed.sort((a: any, b: any) => parseFloat(a.number) - parseFloat(b.number));
        callback(parsed.map(mapTableToFrontend));
      };

      emitData();

      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === `restaurant_tables_${restaurantId}`) emitData();
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
      const data = localStorage.getItem(`restaurant_tables_${restaurantId}`);
      const tables: RestaurantTable[] = data ? JSON.parse(data) : [];
      const index = tables.findIndex(t => t.id === table.id);
      if (index > -1) {
        tables[index] = table;
      } else {
        tables.push(table);
      }
      localStorage.setItem(`restaurant_tables_${restaurantId}`, JSON.stringify(tables));
      notifyLocalSubscribers();
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
      const data = localStorage.getItem(`restaurant_tables_${restaurantId}`);
      let tables: RestaurantTable[] = data ? JSON.parse(data) : [];
      tables = tables.filter(t => t.id !== tableId);
      localStorage.setItem(`restaurant_tables_${restaurantId}`, JSON.stringify(tables));
      notifyLocalSubscribers();
    }
  },

  // 4. MENU CATEGORIES
  async getCategories(restaurantId: string): Promise<MenuCategory[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('order', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapCategoryToFrontend);
    } else {
      const data = localStorage.getItem(`restaurant_categories_${restaurantId}`);
      const parsed = data ? JSON.parse(data) : [];
      return parsed.map(mapCategoryToFrontend);
    }
  },

  subscribeCategories(restaurantId: string, callback: (categories: MenuCategory[]) => void) {
    if (isSupabaseConfigured) {
      const fetchCategories = async () => {
        const list = await this.getCategories(restaurantId);
        callback(list);
      };

      fetchCategories();

      const channel = supabase
        .channel(`public:menu_categories:${restaurantId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'menu_categories', 
          filter: `restaurant_id=eq.${restaurantId}` 
        }, () => {
          fetchCategories();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      const emitData = () => {
        const data = localStorage.getItem(`restaurant_categories_${restaurantId}`);
        const parsed: MenuCategory[] = data ? JSON.parse(data) : [];
        parsed.sort((a, b) => a.order - b.order);
        callback(parsed.map(mapCategoryToFrontend));
      };

      emitData();

      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === `restaurant_categories_${restaurantId}`) emitData();
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
        .from('menu_categories')
        .upsert(dbCat);
      if (error) throw error;
    } else {
      const data = localStorage.getItem(`restaurant_categories_${restaurantId}`);
      const categories: MenuCategory[] = data ? JSON.parse(data) : [];
      const index = categories.findIndex(c => c.id === category.id);
      if (index > -1) {
        categories[index] = category;
      } else {
        categories.push(category);
      }
      localStorage.setItem(`restaurant_categories_${restaurantId}`, JSON.stringify(categories));
      notifyLocalSubscribers();
    }
  },

  async deleteCategory(restaurantId: string, categoryId: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('menu_categories')
        .delete()
        .eq('id', categoryId)
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
    } else {
      const data = localStorage.getItem(`restaurant_categories_${restaurantId}`);
      let categories: MenuCategory[] = data ? JSON.parse(data) : [];
      categories = categories.filter(c => c.id !== categoryId);
      localStorage.setItem(`restaurant_categories_${restaurantId}`, JSON.stringify(categories));
      notifyLocalSubscribers();
    }
  },

  // 5. MENU ITEMS (Food items)
  async getFoodItems(restaurantId: string): Promise<FoodItem[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name');
      if (error) throw error;
      return (data || []).map(mapFoodItemToFrontend);
    } else {
      const data = localStorage.getItem(`restaurant_foodItems_${restaurantId}`);
      const parsed = data ? JSON.parse(data) : [];
      return parsed.map(mapFoodItemToFrontend);
    }
  },

  subscribeFoodItems(restaurantId: string, callback: (items: FoodItem[]) => void) {
    if (isSupabaseConfigured) {
      const fetchFoodItems = async () => {
        const list = await this.getFoodItems(restaurantId);
        callback(list);
      };

      fetchFoodItems();

      const channel = supabase
        .channel(`public:menu_items:${restaurantId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'menu_items', 
          filter: `restaurant_id=eq.${restaurantId}` 
        }, () => {
          fetchFoodItems();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      const emitData = () => {
        const data = localStorage.getItem(`restaurant_foodItems_${restaurantId}`);
        const parsed = data ? JSON.parse(data) : [];
        callback(parsed.map(mapFoodItemToFrontend));
      };

      emitData();

      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === `restaurant_foodItems_${restaurantId}`) emitData();
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
        .from('menu_items')
        .upsert(dbItem);
      if (error) throw error;
    } else {
      const data = localStorage.getItem(`restaurant_foodItems_${restaurantId}`);
      const items: FoodItem[] = data ? JSON.parse(data) : [];
      const index = items.findIndex(i => i.id === item.id);
      if (index > -1) {
        items[index] = item;
      } else {
        items.push(item);
      }
      localStorage.setItem(`restaurant_foodItems_${restaurantId}`, JSON.stringify(items));
      notifyLocalSubscribers();
    }
  },

  async deleteFoodItem(restaurantId: string, itemId: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId)
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
    } else {
      const data = localStorage.getItem(`restaurant_foodItems_${restaurantId}`);
      let items: FoodItem[] = data ? JSON.parse(data) : [];
      items = items.filter(i => i.id !== itemId);
      localStorage.setItem(`restaurant_foodItems_${restaurantId}`, JSON.stringify(items));
      notifyLocalSubscribers();
    }
  },

  // 6. ORDERS
  subscribeOrders(restaurantId: string, callback: (orders: RestaurantOrder[]) => void) {
    if (isSupabaseConfigured) {
      const fetchOrders = async () => {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false });
        if (!error && data) {
          callback(data.map(mapOrderToFrontend));
        }
      };

      fetchOrders();

      const channel = supabase
        .channel(`public:orders:${restaurantId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'orders', 
          filter: `restaurant_id=eq.${restaurantId}` 
        }, () => {
          fetchOrders();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      const emitData = () => {
        const data = localStorage.getItem(`restaurant_orders_${restaurantId}`);
        const parsed = data ? JSON.parse(data) : [];
        parsed.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(parsed.map(mapOrderToFrontend));
      };

      emitData();

      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === `restaurant_orders_${restaurantId}`) emitData();
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
      const data = localStorage.getItem(`restaurant_orders_${restaurantId}`);
      const orders: RestaurantOrder[] = data ? JSON.parse(data) : [];
      const index = orders.findIndex(o => o.id === order.id);
      if (index > -1) {
        orders[index] = order;
      } else {
        orders.push(order);
      }
      localStorage.setItem(`restaurant_orders_${restaurantId}`, JSON.stringify(orders));
      notifyLocalSubscribers();
    }
  },

  async cleanupExpiredOrders(restaurantId: string): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('restaurant_id', restaurantId)
        .lt('created_at', thirtyDaysAgo.toISOString());
      if (error) {
        console.error('Error cleaning up old orders:', error);
      }
    } else {
      const data = localStorage.getItem(`restaurant_orders_${restaurantId}`);
      if (data) {
        const orders: RestaurantOrder[] = JSON.parse(data);
        const filtered = orders.filter(o => new Date(o.createdAt).getTime() >= thirtyDaysAgo.getTime());
        localStorage.setItem(`restaurant_orders_${restaurantId}`, JSON.stringify(filtered));
        notifyLocalSubscribers();
      }
    }
  },

  // 7. PAYMENTS
  subscribePayments(restaurantId: string, callback: (payments: PaymentRecord[]) => void) {
    if (isSupabaseConfigured) {
      const fetchPayments = async () => {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false });
        if (!error && data) {
          callback(data.map(mapPaymentToFrontend));
        }
      };

      fetchPayments();

      const channel = supabase
        .channel(`public:payments:${restaurantId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'payments', 
          filter: `restaurant_id=eq.${restaurantId}` 
        }, () => {
          fetchPayments();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      const emitData = () => {
        const data = localStorage.getItem(`restaurant_payments_${restaurantId}`);
        const parsed = data ? JSON.parse(data) : [];
        parsed.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(parsed.map(mapPaymentToFrontend));
      };

      emitData();

      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === `restaurant_payments_${restaurantId}`) emitData();
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

  async addPaymentRecord(restaurantId: string, payment: PaymentRecord): Promise<void> {
    if (isSupabaseConfigured) {
      const dbPayment = mapPaymentToDb(payment, restaurantId);
      const { error } = await supabase
        .from('payments')
        .insert(dbPayment);
      if (error) throw error;
    } else {
      const data = localStorage.getItem(`restaurant_payments_${restaurantId}`);
      const payments: PaymentRecord[] = data ? JSON.parse(data) : [];
      payments.push(payment);
      localStorage.setItem(`restaurant_payments_${restaurantId}`, JSON.stringify(payments));
      notifyLocalSubscribers();
    }
  },

  // 8. NOTIFICATIONS & ALERTS
  subscribeNotifications(restaurantId: string, callback: (notifications: RestaurantNotification[]) => void) {
    if (isSupabaseConfigured) {
      const fetchNotifications = async () => {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false });
        if (!error && data) {
          callback(data.map(mapNotificationToFrontend));
        }
      };

      fetchNotifications();

      const channel = supabase
        .channel(`public:notifications:${restaurantId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'notifications', 
          filter: `restaurant_id=eq.${restaurantId}` 
        }, () => {
          fetchNotifications();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      const emitData = () => {
        const data = localStorage.getItem(`restaurant_notifications_${restaurantId}`);
        const parsed = data ? JSON.parse(data) : [];
        parsed.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(parsed.map(mapNotificationToFrontend));
      };

      emitData();

      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === `restaurant_notifications_${restaurantId}`) emitData();
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
      const data = localStorage.getItem(`restaurant_notifications_${restaurantId}`);
      const list: RestaurantNotification[] = data ? JSON.parse(data) : [];
      list.push(n);
      localStorage.setItem(`restaurant_notifications_${restaurantId}`, JSON.stringify(list));
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
      const data = localStorage.getItem(`restaurant_notifications_${restaurantId}`);
      const list: RestaurantNotification[] = data ? JSON.parse(data) : [];
      const updated = list.map(n => (n.id === id ? { ...n, isRead: true } : n));
      localStorage.setItem(`restaurant_notifications_${restaurantId}`, JSON.stringify(updated));
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
      const data = localStorage.getItem(`restaurant_notifications_${restaurantId}`);
      const list: RestaurantNotification[] = data ? JSON.parse(data) : [];
      const updated = list.map(n => ({ ...n, isRead: true }));
      localStorage.setItem(`restaurant_notifications_${restaurantId}`, JSON.stringify(updated));
      notifyLocalSubscribers();
    }
  },

  // 9. SUPER ADMIN WORKSPACE CONTROL API
  async checkSuperAdmin(userId: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('super_admins')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      return !error && !!data;
    } else {
      // Mock admin flag check
      return userId === 'super-admin-uuid';
    }
  },

  async superGetRestaurants(): Promise<any[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } else {
      const workspaces = localStorage.getItem('saas_workspaces');
      return workspaces ? JSON.parse(workspaces) : DEFAULT_WORKSPACES;
    }
  },

  async superCreateRestaurant(name: string, plan: string, ownerEmail: string, ownerName: string): Promise<string> {
    const newRestaurantId = crypto.randomUUID ? crypto.randomUUID() : 'temp-' + Math.random().toString(36).substr(2, 9);
    
    if (isSupabaseConfigured) {
      // Call onboarding RPC function on Postgres to keep it transaction-safe
      const { error } = await supabase.rpc('onboard_new_restaurant', {
        new_restaurant_id: newRestaurantId,
        restaurant_name: name,
        owner_email: ownerEmail,
        owner_name: ownerName
      });
      if (error) throw error;
      return newRestaurantId;
    } else {
      // Mock Mode onboarding
      const workspaces = await this.superGetRestaurants();
      const newWorkspace: RestaurantWorkspace = {
        id: newRestaurantId,
        name,
        logoUrl: '',
        themeColor: '#6366F1',
        plan: plan as any,
        status: 'active',
        role: 'owner',
      };
      workspaces.push(newWorkspace);
      localStorage.setItem('saas_workspaces', JSON.stringify(workspaces));
      
      // Save subscription settings
      const newSub: SubscriptionPlan = {
        restaurantId: newRestaurantId,
        plan: plan as any,
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        maxTables: plan === 'starter' ? 5 : plan === 'professional' ? 25 : 100,
        maxStaff: plan === 'starter' ? 3 : plan === 'professional' ? 20 : 100,
        maxBranches: plan === 'enterprise' ? 10 : 1,
      };
      localStorage.setItem(`saas_subscription_${newRestaurantId}`, JSON.stringify(newSub));
      
      // Seed default menu/tables for mock workspace
      localStorage.setItem(`restaurant_settings_${newRestaurantId}`, JSON.stringify({ ...DEFAULT_SETTINGS, id: newRestaurantId, name }));
      localStorage.setItem(`restaurant_tables_${newRestaurantId}`, JSON.stringify([
        { id: 't1', restaurantId: newRestaurantId, number: 'Table 1', capacity: 4, status: 'available', qrCodeUrl: '', updatedAt: new Date().toISOString() },
        { id: 't2', restaurantId: newRestaurantId, number: 'Table 2', capacity: 4, status: 'available', qrCodeUrl: '', updatedAt: new Date().toISOString() }
      ]));
      localStorage.setItem(`restaurant_categories_${newRestaurantId}`, JSON.stringify([
        { id: 'c1', restaurantId: newRestaurantId, name: 'Mains', order: 1, createdAt: new Date().toISOString() }
      ]));
      localStorage.setItem(`restaurant_foodItems_${newRestaurantId}`, JSON.stringify([
        { id: 'fi1', restaurantId: newRestaurantId, categoryId: 'c1', name: 'Paneer Butter Masala', price: 240, description: 'Paneer dish', isVeg: true, preparationTime: 12, isAvailable: true, isPopular: true, isRecommended: true, spicyLevel: 1, discountPercentage: 0, updatedAt: new Date().toISOString() }
      ]));

      notifyLocalSubscribers();
      return newRestaurantId;
    }
  },

  async superUpdateRestaurantStatus(restaurantId: string, status: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('restaurants')
        .update({ status })
        .eq('id', restaurantId);
      if (error) throw error;
    } else {
      const workspaces = await this.superGetRestaurants();
      const updated = workspaces.map(w => (w.id === restaurantId ? { ...w, status } : w));
      localStorage.setItem('saas_workspaces', JSON.stringify(updated));
      notifyLocalSubscribers();
    }
  },

  async superUpdateRestaurantPlan(restaurantId: string, plan: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('restaurants')
        .update({ plan })
        .eq('id', restaurantId);
      if (error) throw error;
      
      // Update active subscription
      const maxTables = plan === 'starter' ? 5 : plan === 'professional' ? 25 : 100;
      const maxStaff = plan === 'starter' ? 3 : plan === 'professional' ? 20 : 100;
      const maxBranches = plan === 'enterprise' ? 10 : 1;
      
      const { error: subError } = await supabase
        .from('restaurant_subscriptions')
        .update({ plan, max_tables: maxTables, max_staff: maxStaff, max_branches: maxBranches })
        .eq('restaurant_id', restaurantId)
        .eq('status', 'active');
      if (subError) throw subError;
    } else {
      const workspaces = await this.superGetRestaurants();
      const updated = workspaces.map(w => (w.id === restaurantId ? { ...w, plan } : w));
      localStorage.setItem('saas_workspaces', JSON.stringify(updated));

      const sub = await this.getSubscription(restaurantId);
      const updatedSub: SubscriptionPlan = {
        ...sub,
        plan: plan as any,
        maxTables: plan === 'starter' ? 5 : plan === 'professional' ? 25 : 100,
        maxStaff: plan === 'starter' ? 3 : plan === 'professional' ? 20 : 100,
        maxBranches: plan === 'enterprise' ? 10 : 1,
      };
      localStorage.setItem(`saas_subscription_${restaurantId}`, JSON.stringify(updatedSub));
      notifyLocalSubscribers();
    }
  },

  async superDeleteRestaurant(restaurantId: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', restaurantId);
      if (error) throw error;
    } else {
      const workspaces = await this.superGetRestaurants();
      const filtered = workspaces.filter(w => w.id !== restaurantId);
      localStorage.setItem('saas_workspaces', JSON.stringify(filtered));
      notifyLocalSubscribers();
    }
  },

  // 10. INVENTORY OPERATIONS
  async getInventory(restaurantId: string): Promise<InventoryItem[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('item_name');
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        restaurantId: row.restaurant_id,
        itemName: row.item_name,
        quantity: Number(row.quantity),
        unit: row.unit,
        minStockLevel: Number(row.min_stock_level),
        updatedAt: row.updated_at,
      }));
    } else {
      const data = localStorage.getItem(`restaurant_inventory_${restaurantId}`);
      return data ? JSON.parse(data) : [];
    }
  },

  async saveInventoryItem(restaurantId: string, item: InventoryItem): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('inventory')
        .upsert({
          id: item.id,
          restaurant_id: restaurantId,
          item_name: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          min_stock_level: item.minStockLevel,
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
    } else {
      const list = await this.getInventory(restaurantId);
      const index = list.findIndex(i => i.id === item.id);
      if (index > -1) {
        list[index] = item;
      } else {
        list.push(item);
      }
      localStorage.setItem(`restaurant_inventory_${restaurantId}`, JSON.stringify(list));
      notifyLocalSubscribers();
    }
  },

  async deleteInventoryItem(restaurantId: string, itemId: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', itemId)
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
    } else {
      const list = await this.getInventory(restaurantId);
      const filtered = list.filter(i => i.id !== itemId);
      localStorage.setItem(`restaurant_inventory_${restaurantId}`, JSON.stringify(filtered));
      notifyLocalSubscribers();
    }
  },

  // 11. ACTIVITY LOGGING
  async logActivity(restaurantId: string, userId: string, action: string, details?: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('activity_logs')
        .insert({
          restaurant_id: restaurantId,
          user_id: userId,
          action,
          details
        });
      if (error) {
        console.error('Error writing activity log:', error);
      }
    } else {
      const data = localStorage.getItem(`restaurant_activity_${restaurantId}`);
      const logs: ActivityLog[] = data ? JSON.parse(data) : [];
      logs.push({
        id: Math.random().toString(),
        restaurantId,
        userId,
        action,
        details,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem(`restaurant_activity_${restaurantId}`, JSON.stringify(logs.slice(-100))); // Keep last 100
    }
  }

};

export default dbService;
