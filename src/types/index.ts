export interface RestaurantSettings {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  gstNumber: string;
  taxPercentage: number;
  currency: string;
  openingHours: string;
  closingHours: string;
  themeColor: string;
  enableWaiterCall: boolean;   // show/hide Waiter button on customer menu
  enableBillRequest: boolean;  // show/hide Bill button on customer menu
  enableSoundNotification: boolean; // turn order/request sound chime + voice announcement ON/OFF
  createdAt: any;
}

export type UserRole = 'owner' | 'admin' | 'manager' | 'cashier' | 'kitchen' | 'waiter' | 'staff' | 'store';

export interface UserProfile {
  id: string;
  restaurantId?: string;
  name: string;
  email: string;
  role: UserRole;
  status?: 'active' | 'suspended';
  createdAt: any;
}

export type TableStatus = 'available' | 'occupied' | 'reserved';

export interface RestaurantTable {
  id: string;
  restaurantId?: string;
  branchId?: string;
  number: string;
  capacity: number;
  status: TableStatus;
  qrCodeUrl: string;
  updatedAt: any;
}

export interface MenuCategory {
  id: string;
  restaurantId?: string;
  name: string;
  order: number;
  createdAt: any;
}

export interface FoodItem {
  id: string;
  restaurantId?: string;
  name: string;
  image: string;
  description: string;
  price: number;
  categoryId: string;
  isVeg: boolean;
  preparationTime: number; // in minutes
  isAvailable: boolean;
  isPopular: boolean;
  isRecommended: boolean;
  spicyLevel: 0 | 1 | 2 | 3; // 0 = None, 1 = Mild, 2 = Medium, 3 = Hot
  discountPercentage: number; // 0 to 100
  updatedAt: any;
}

export interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
}

export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';

export interface RestaurantOrder {
  id: string;
  restaurantId?: string;
  branchId?: string;
  orderNumber: string;
  tableId: string;
  tableName: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  grandTotal: number;
  status: OrderStatus;
  createdAt: any; // ISO String or Timestamp
  elapsedTimeStart: any;
  waiterId?: string;
  feedback?: {
    rating: number;
    review?: string;
  };
}

export interface PaymentRecord {
  id: string;
  restaurantId?: string;
  orderId: string;
  orderNumber: string;
  tableName: string;
  subtotal: number;
  tax: number;
  discount: number;
  grandTotal: number;
  paymentMethod: 'cash' | 'upi' | 'card' | 'wallet';
  createdAt: any;
}

export type NotificationType = 'new_order' | 'call_waiter' | 'request_bill';

export interface RestaurantNotification {
  id: string;
  restaurantId?: string;
  type: NotificationType;
  tableId: string;
  tableName: string;
  orderId?: string;
  message: string;
  isRead: boolean;
  createdAt: any;
}

// ==========================================
// SAAS MULTI-TENANT WORKSPACE TYPES
// ==========================================

export interface RestaurantWorkspace {
  id: string;
  name: string;
  logoUrl?: string;
  themeColor: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended';
  role: UserRole;
}

export interface SubscriptionPlan {
  restaurantId: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  startsAt: any;
  endsAt: any;
  status: 'active' | 'expired' | 'trialing';
  maxTables: number;
  maxStaff: number;
  maxBranches: number;
}

export interface InventoryItem {
  id: string;
  restaurantId?: string;
  itemName: string;
  quantity: number;
  unit: string;
  minStockLevel: number;
  updatedAt: any;
}

export interface ActivityLog {
  id: string;
  restaurantId?: string;
  userId: string;
  action: string;
  details?: string;
  createdAt: any;
}
