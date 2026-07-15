import {
  isFirebaseConfigured,
  db,
  auth,
} from './firebase';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  addDoc,
  Timestamp,
  limit,
} from 'firebase/firestore';
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
// MOCK DATA INITIALIZATION SEED
// ==========================================

const DEFAULT_SETTINGS: RestaurantSettings = {
  id: 'demo-restaurant',
  name: 'The Grand Bistro',
  address: '102 Gourmet Boulevard, Culinary District',
  phone: '+1 (555) 019-2834',
  email: 'hello@grandbistro.com',
  logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=60',
  gstNumber: '22AAAAA1111A1Z1',
  taxPercentage: 18,
  currency: '₹',
  openingHours: '09:00',
  closingHours: '23:00',
  themeColor: '#6366F1', // Indigo
  createdAt: new Date().toISOString(),
};

const DEFAULT_CATEGORIES: MenuCategory[] = [
  { id: 'cat-1', name: 'Starters', order: 1, createdAt: new Date().toISOString() },
  { id: 'cat-2', name: 'Main Course', order: 2, createdAt: new Date().toISOString() },
  { id: 'cat-3', name: 'Chinese Specials', order: 3, createdAt: new Date().toISOString() },
  { id: 'cat-4', name: 'Desserts', order: 4, createdAt: new Date().toISOString() },
  { id: 'cat-5', name: 'Beverages', order: 5, createdAt: new Date().toISOString() },
];

const DEFAULT_ITEMS: FoodItem[] = [
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

const DEFAULT_TABLES: RestaurantTable[] = [
  { id: 'table-1', number: '1', capacity: 2, status: 'available', qrCodeUrl: '', updatedAt: new Date().toISOString() },
  { id: 'table-2', number: '2', capacity: 4, status: 'available', qrCodeUrl: '', updatedAt: new Date().toISOString() },
  { id: 'table-3', number: '3', capacity: 4, status: 'occupied', qrCodeUrl: '', updatedAt: new Date().toISOString() },
  { id: 'table-4', number: '4', capacity: 6, status: 'reserved', qrCodeUrl: '', updatedAt: new Date().toISOString() },
  { id: 'table-5', number: '5', capacity: 8, status: 'available', qrCodeUrl: '', updatedAt: new Date().toISOString() },
  { id: 'table-6', number: '6', capacity: 2, status: 'available', qrCodeUrl: '', updatedAt: new Date().toISOString() },
];

const DEFAULT_USERS: UserProfile[] = [
  { id: 'admin-user-id', name: 'Sahil Admin', email: 'admin@restaurant.com', role: 'admin', createdAt: new Date().toISOString() },
  { id: 'manager-user-id', name: 'Rohit Manager', email: 'manager@restaurant.com', role: 'manager', createdAt: new Date().toISOString() },
  { id: 'kitchen-user-id', name: 'Chef Mario', email: 'kitchen@restaurant.com', role: 'kitchen', createdAt: new Date().toISOString() },
  { id: 'waiter-user-id', name: 'David Waiter', email: 'waiter@restaurant.com', role: 'waiter', createdAt: new Date().toISOString() },
];

const DEFAULT_ORDERS: RestaurantOrder[] = [
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
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago
    elapsedTimeStart: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
];

// Helper to check if key exists in local storage, if not, write defaults
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

if (!isFirebaseConfigured) {
  initializeLocalStorage();
}

// Custom event for notifying database changes in the same window
const notifyLocalSubscribers = () => {
  window.dispatchEvent(new Event('restaurant-db-update'));
};

// ==========================================
// CENTRAL DATABASE SERVICE OBJECT
// ==========================================

export const dbService = {
  // 1. SETTINGS OPERATIONS
  async getSettings(restaurantId: string): Promise<RestaurantSettings> {
    if (isFirebaseConfigured) {
      const docRef = doc(db, 'restaurants', restaurantId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return snapshot.data() as RestaurantSettings;
      } else {
        // Create initial settings if not present
        const settings = { ...DEFAULT_SETTINGS, id: restaurantId };
        await setDoc(docRef, settings);
        return settings;
      }
    } else {
      const data = localStorage.getItem('restaurant_settings');
      return data ? JSON.parse(data) : DEFAULT_SETTINGS;
    }
  },

  async updateSettings(restaurantId: string, updates: Partial<RestaurantSettings>): Promise<void> {
    if (isFirebaseConfigured) {
      const docRef = doc(db, 'restaurants', restaurantId);
      await updateDoc(docRef, updates);
    } else {
      const current = await this.getSettings(restaurantId);
      const updated = { ...current, ...updates };
      localStorage.setItem('restaurant_settings', JSON.stringify(updated));
      notifyLocalSubscribers();
    }
  },

  // 2. STAFF / USER MANAGEMENT
  async getUsers(restaurantId: string): Promise<UserProfile[]> {
    if (isFirebaseConfigured) {
      const colRef = collection(db, 'restaurants', restaurantId, 'users');
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map(doc => doc.data() as UserProfile);
    } else {
      const data = localStorage.getItem('restaurant_users');
      return data ? JSON.parse(data) : [];
    }
  },

  async updateUserRole(restaurantId: string, userId: string, role: string): Promise<void> {
    if (isFirebaseConfigured) {
      const docRef = doc(db, 'restaurants', restaurantId, 'users', userId);
      await updateDoc(docRef, { role });
    } else {
      const users = await this.getUsers(restaurantId);
      const updated = users.map(u => (u.id === userId ? { ...u, role: role as any } : u));
      localStorage.setItem('restaurant_users', JSON.stringify(updated));
      notifyLocalSubscribers();
    }
  },

  async addUser(restaurantId: string, user: UserProfile): Promise<void> {
    if (isFirebaseConfigured) {
      const docRef = doc(db, 'restaurants', restaurantId, 'users', user.id);
      await setDoc(docRef, user);
    } else {
      const users = await this.getUsers(restaurantId);
      users.push(user);
      localStorage.setItem('restaurant_users', JSON.stringify(users));
      notifyLocalSubscribers();
    }
  },

  async deleteUser(restaurantId: string, userId: string): Promise<void> {
    if (isFirebaseConfigured) {
      const docRef = doc(db, 'restaurants', restaurantId, 'users', userId);
      await deleteDoc(docRef);
    } else {
      const users = await this.getUsers(restaurantId);
      const updated = users.filter(u => u.id !== userId);
      localStorage.setItem('restaurant_users', JSON.stringify(updated));
      notifyLocalSubscribers();
    }
  },

  // 3. TABLES (Real-time Subscribe & CRUD)
  subscribeTables(restaurantId: string, callback: (tables: RestaurantTable[]) => void) {
    if (isFirebaseConfigured) {
      const colRef = collection(db, 'restaurants', restaurantId, 'tables');
      return onSnapshot(colRef, (snapshot) => {
        const tables = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as RestaurantTable);
        // Sort tables numerically or by name
        tables.sort((a, b) => parseFloat(a.number) - parseFloat(b.number));
        callback(tables);
      });
    } else {
      const emitData = () => {
        const data = localStorage.getItem('restaurant_tables');
        const parsed = data ? JSON.parse(data) : [];
        parsed.sort((a: any, b: any) => parseFloat(a.number) - parseFloat(b.number));
        callback(parsed);
      };

      // Initial call
      emitData();

      // Listeners
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
    if (isFirebaseConfigured) {
      const docRef = doc(db, 'restaurants', restaurantId, 'tables', table.id);
      await setDoc(docRef, table);
    } else {
      const data = localStorage.getItem('restaurant_tables');
      const tables: RestaurantTable[] = data ? JSON.parse(data) : [];
      const index = tables.findIndex(t => t.id === table.id);
      if (index > -1) {
        tables[index] = table;
      } else {
        tables.push(table);
      }
      localStorage.setItem('restaurant_tables', JSON.stringify(tables));
      notifyLocalSubscribers();
    }
  },

  async deleteTable(restaurantId: string, tableId: string): Promise<void> {
    if (isFirebaseConfigured) {
      const docRef = doc(db, 'restaurants', restaurantId, 'tables', tableId);
      await deleteDoc(docRef);
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
    if (isFirebaseConfigured) {
      const colRef = collection(db, 'restaurants', restaurantId, 'categories');
      const q = query(colRef, orderBy('order', 'asc'));
      return onSnapshot(q, (snapshot) => {
        const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as MenuCategory);
        callback(categories);
      });
    } else {
      const emitData = () => {
        const data = localStorage.getItem('restaurant_categories');
        const parsed: MenuCategory[] = data ? JSON.parse(data) : [];
        parsed.sort((a, b) => a.order - b.order);
        callback(parsed);
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
    if (isFirebaseConfigured) {
      const docRef = doc(db, 'restaurants', restaurantId, 'categories', category.id);
      await setDoc(docRef, category);
    } else {
      const data = localStorage.getItem('restaurant_categories');
      const categories: MenuCategory[] = data ? JSON.parse(data) : [];
      const index = categories.findIndex(c => c.id === category.id);
      if (index > -1) {
        categories[index] = category;
      } else {
        categories.push(category);
      }
      localStorage.setItem('restaurant_categories', JSON.stringify(categories));
      notifyLocalSubscribers();
    }
  },

  async deleteCategory(restaurantId: string, categoryId: string): Promise<void> {
    if (isFirebaseConfigured) {
      const docRef = doc(db, 'restaurants', restaurantId, 'categories', categoryId);
      await deleteDoc(docRef);
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
    if (isFirebaseConfigured) {
      const colRef = collection(db, 'restaurants', restaurantId, 'foodItems');
      return onSnapshot(colRef, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as FoodItem);
        callback(items);
      });
    } else {
      const emitData = () => {
        const data = localStorage.getItem('restaurant_foodItems');
        callback(data ? JSON.parse(data) : []);
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
    if (isFirebaseConfigured) {
      const docRef = doc(db, 'restaurants', restaurantId, 'foodItems', item.id);
      await setDoc(docRef, item);
    } else {
      const data = localStorage.getItem('restaurant_foodItems');
      const items: FoodItem[] = data ? JSON.parse(data) : [];
      const index = items.findIndex(i => i.id === item.id);
      if (index > -1) {
        items[index] = item;
      } else {
        items.push(item);
      }
      localStorage.setItem('restaurant_foodItems', JSON.stringify(items));
      notifyLocalSubscribers();
    }
  },

  async deleteFoodItem(restaurantId: string, itemId: string): Promise<void> {
    if (isFirebaseConfigured) {
      const docRef = doc(db, 'restaurants', restaurantId, 'foodItems', itemId);
      await deleteDoc(docRef);
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
    if (isFirebaseConfigured) {
      const colRef = collection(db, 'restaurants', restaurantId, 'orders');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => {
          const raw = doc.data();
          return {
            id: doc.id,
            ...raw,
            // Convert timestamps if needed
            createdAt: raw.createdAt instanceof Timestamp ? raw.createdAt.toDate().toISOString() : raw.createdAt,
            elapsedTimeStart: raw.elapsedTimeStart instanceof Timestamp ? raw.elapsedTimeStart.toDate().toISOString() : raw.elapsedTimeStart,
          } as RestaurantOrder;
        });
        callback(orders);
      });
    } else {
      const emitData = () => {
        const data = localStorage.getItem('restaurant_orders');
        const parsed: RestaurantOrder[] = data ? JSON.parse(data) : [];
        parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(parsed);
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
    if (isFirebaseConfigured) {
      const docRef = doc(db, 'restaurants', restaurantId, 'orders', order.id);
      await setDoc(docRef, order);
    } else {
      const data = localStorage.getItem('restaurant_orders');
      const orders: RestaurantOrder[] = data ? JSON.parse(data) : [];
      const index = orders.findIndex(o => o.id === order.id);
      if (index > -1) {
        orders[index] = order;
      } else {
        orders.push(order);
      }
      localStorage.setItem('restaurant_orders', JSON.stringify(orders));
      notifyLocalSubscribers();
    }
  },

  // 7. PAYMENTS (CRUD & List)
  subscribePayments(restaurantId: string, callback: (payments: PaymentRecord[]) => void) {
    if (isFirebaseConfigured) {
      const colRef = collection(db, 'restaurants', restaurantId, 'payments');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as PaymentRecord);
        callback(payments);
      });
    } else {
      const emitData = () => {
        const data = localStorage.getItem('restaurant_payments');
        const parsed: PaymentRecord[] = data ? JSON.parse(data) : [];
        parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(parsed);
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
    if (isFirebaseConfigured) {
      const colRef = collection(db, 'restaurants', restaurantId, 'payments');
      await addDoc(colRef, payment);
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
    if (isFirebaseConfigured) {
      const colRef = collection(db, 'restaurants', restaurantId, 'notifications');
      const q = query(colRef, orderBy('createdAt', 'desc'), limit(50));
      return onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as RestaurantNotification);
        callback(list);
      });
    } else {
      const emitData = () => {
        const data = localStorage.getItem('restaurant_notifications');
        const parsed: RestaurantNotification[] = data ? JSON.parse(data) : [];
        parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(parsed);
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
    if (isFirebaseConfigured) {
      const colRef = collection(db, 'restaurants', restaurantId, 'notifications');
      await addDoc(colRef, n);
    } else {
      const data = localStorage.getItem('restaurant_notifications');
      const list: RestaurantNotification[] = data ? JSON.parse(data) : [];
      list.push(n);
      localStorage.setItem('restaurant_notifications', JSON.stringify(list));
      notifyLocalSubscribers();
    }
  },

  async markNotificationRead(restaurantId: string, id: string): Promise<void> {
    if (isFirebaseConfigured) {
      const docRef = doc(db, 'restaurants', restaurantId, 'notifications', id);
      await updateDoc(docRef, { isRead: true });
    } else {
      const data = localStorage.getItem('restaurant_notifications');
      const list: RestaurantNotification[] = data ? JSON.parse(data) : [];
      const updated = list.map(n => (n.id === id ? { ...n, isRead: true } : n));
      localStorage.setItem('restaurant_notifications', JSON.stringify(updated));
      notifyLocalSubscribers();
    }
  },

  async clearAllNotifications(restaurantId: string): Promise<void> {
    if (isFirebaseConfigured) {
      // In production, we'd batch delete, but for client sync let's mark all read
      const colRef = collection(db, 'restaurants', restaurantId, 'notifications');
      const q = query(colRef, where('isRead', '==', false));
      const snapshot = await getDocs(q);
      // Wait for all updates
      await Promise.all(snapshot.docs.map(d => updateDoc(doc(db, 'restaurants', restaurantId, 'notifications', d.id), { isRead: true })));
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
