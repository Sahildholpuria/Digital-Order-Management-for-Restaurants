export interface RestaurantSettings {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  gstNumber: string;
  websiteUrl?: string;
  taxPercentage: number;
  currency: string;
  openingHours: string;
  closingHours: string;
  themeColor: string;
  enableWaiterCall: boolean;   // show/hide Waiter button on customer menu
  enableBillRequest: boolean;  // show/hide Bill button on customer menu
  enableSoundNotification: boolean; // turn order/request sound chime + voice announcement ON/OFF
  enableBillPrinting?: boolean; // turn thermal bill printing feature ON/OFF
  enableTakeawayOrders?: boolean; // enable takeaway / parcel ordering
  hideSubscriptionPlan?: boolean; // Super Admin toggle to show/hide subscription billing for this restaurant
  subscriptionStatus?: 'trial' | 'active' | 'expired' | 'suspended';
  subscriptionExpiresAt?: any;
  planType?: 'starter' | 'pro' | 'pro_6m' | 'pro_1y';
  upiId?: string;
  paymentQrImage?: string;
  paymentQrType?: "dynamic" | "custom";
  createdAt: any;
  settings?: Record<string, any>;
}

export type UserRole = 'admin' | 'manager' | 'cashier' | 'kitchen' | 'waiter';

export interface UserProfile {
  id: string;
  restaurantId?: string;
  name: string;
  email: string;
  role: UserRole;
  isSuperAdmin?: boolean;
  createdAt: any;
}

export type TableStatus = 'available' | 'occupied' | 'reserved';

export interface RestaurantTable {
  id: string;
  number: string;
  floor?: string;
  capacity: number;
  status: TableStatus;
  qrCodeUrl: string;
  updatedAt: any;
}

export interface MenuCategory {
  id: string;
  name: string;
  order: number;
  createdAt: any;
}

export type DietaryType = 'veg' | 'non_veg' | 'egg';

export interface FoodPortion {
  id: string; // 'half' | 'full' | 'quarter' | custom
  name: string; // 'Half' | 'Full' | custom
  price: number;
}

export interface FoodItem {
  id: string;
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

  // Portion Variations (e.g. Half / Full)
  hasPortions?: boolean;
  portions?: FoodPortion[];
  halfPrice?: number;
  fullPrice?: number;

  // Dish Attributes
  dietaryType?: DietaryType;
  serves?: string;
  allergens?: string[];
  calories?: number;
}

export interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  portion?: string; // e.g. 'Half', 'Full'
  portionId?: string;
  specialInstructions?: string;
}

export type OrderType = 'dine_in' | 'takeaway' | 'delivery';

export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';

export interface RestaurantOrder {
  id: string;
  orderNumber: string;
  tableId: string;
  tableName: string;
  tableFloor?: string;
  orderType?: OrderType;
  customerName?: string;
  customerPhone?: string;
  tokenNumber?: string;
  pickupTime?: string;
  orderNotes?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  grandTotal: number;
  status: OrderStatus;
  paymentMethod?: string;
  createdAt: any; // ISO String or Timestamp
  elapsedTimeStart: any;
  waiterId?: string;
  feedback?: {
    rating: number;
    review?: string;
  };
  isOfflineQueued?: boolean;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  tableName: string;
  orderType?: OrderType;
  customerName?: string;
  customerPhone?: string;
  tokenNumber?: string;
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
  type: NotificationType;
  tableId: string;
  tableName: string;
  orderId?: string;
  message: string;
  isRead: boolean;
  createdAt: any;
}

export interface ToastConfig {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface ConfirmModalConfig {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

export interface SaaSAnnouncement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  isActive: boolean;
  isDismissible: boolean;
  startsAt?: string;
  expiresAt?: string;
  createdAt: string;
}
