import { UserRole } from '../types';

export interface RoleProfile {
  role: UserRole;
  label: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  description: string;
  allowedTabs: string[];
  defaultTab: string;
  canEditRestaurantSettings: boolean;
  canManageSubscription: boolean;
  canManageStaff: boolean;
  canEditMenu: boolean;
  canEditPrices: boolean;
  canToggleItemAvailability: boolean;
  canSettleBills: boolean;
  canViewReports: boolean;
  canPunchOrders: boolean;
  canAccessWaiterConsole: boolean;
  canAccessKDS: boolean;
}

export const ROLE_PROFILES: Record<UserRole, RoleProfile> = {
  admin: {
    role: 'admin',
    label: 'Restaurant Administrator',
    badge: 'Admin • Full Access',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    badgeBorder: 'border-emerald-500/30',
    description: 'Complete operational and financial authority over POS, menus, staff, tables, reports, and tenant settings.',
    allowedTabs: ['dashboard', 'orders', 'tables', 'menu', 'billing', 'reports', 'settings', 'waiter', 'kitchen'],
    defaultTab: 'dashboard',
    canEditRestaurantSettings: true,
    canManageSubscription: true,
    canManageStaff: true,
    canEditMenu: true,
    canEditPrices: true,
    canToggleItemAvailability: true,
    canSettleBills: true,
    canViewReports: true,
    canPunchOrders: true,
    canAccessWaiterConsole: true,
    canAccessKDS: true,
  },
  manager: {
    role: 'manager',
    label: 'Restaurant Store Manager',
    badge: 'Store Manager',
    badgeBg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    badgeText: 'text-indigo-700 dark:text-indigo-400',
    badgeBorder: 'border-indigo-500/30',
    description: 'Floor supervision, live order tracking, menu availability overrides, table floor layout, and POS settlements.',
    allowedTabs: ['dashboard', 'orders', 'tables', 'menu', 'billing', 'reports', 'waiter', 'kitchen'],
    defaultTab: 'dashboard',
    canEditRestaurantSettings: false,
    canManageSubscription: false,
    canManageStaff: false,
    canEditMenu: true,
    canEditPrices: true,
    canToggleItemAvailability: true,
    canSettleBills: true,
    canViewReports: true,
    canPunchOrders: true,
    canAccessWaiterConsole: true,
    canAccessKDS: true,
  },
  waiter: {
    role: 'waiter',
    label: 'Captain / Waiter Staff',
    badge: 'Captain & Waiter',
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    badgeText: 'text-amber-700 dark:text-amber-400',
    badgeBorder: 'border-amber-500/30',
    description: 'Direct table order punching with instant KOT tickets, table service chimes, bill request response, and floor status.',
    allowedTabs: ['waiter', 'orders', 'tables'],
    defaultTab: 'waiter',
    canEditRestaurantSettings: false,
    canManageSubscription: false,
    canManageStaff: false,
    canEditMenu: false,
    canEditPrices: false,
    canToggleItemAvailability: false,
    canSettleBills: false,
    canViewReports: false,
    canPunchOrders: true,
    canAccessWaiterConsole: true,
    canAccessKDS: false,
  },
  cashier: {
    role: 'cashier',
    label: 'Cashier & Counter Staff',
    badge: 'Cashier & Billing',
    badgeBg: 'bg-teal-500/10 dark:bg-teal-500/20',
    badgeText: 'text-teal-700 dark:text-teal-400',
    badgeBorder: 'border-teal-500/30',
    description: 'Quick bill settlements, tax invoicing, receipt printing, and live order status verification.',
    allowedTabs: ['billing', 'orders', 'tables'],
    defaultTab: 'billing',
    canEditRestaurantSettings: false,
    canManageSubscription: false,
    canManageStaff: false,
    canEditMenu: false,
    canEditPrices: false,
    canToggleItemAvailability: false,
    canSettleBills: true,
    canViewReports: false,
    canPunchOrders: true,
    canAccessWaiterConsole: false,
    canAccessKDS: false,
  },
  kitchen: {
    role: 'kitchen',
    label: 'Kitchen Head Chef',
    badge: 'Kitchen Chef (KDS)',
    badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20',
    badgeText: 'text-rose-700 dark:text-rose-400',
    badgeBorder: 'border-rose-500/30',
    description: 'Dedicated Kitchen Display System (KDS) for cooking queue tickets, KOT printing, and preparation timer management.',
    allowedTabs: ['kitchen'],
    defaultTab: 'kitchen',
    canEditRestaurantSettings: false,
    canManageSubscription: false,
    canManageStaff: false,
    canEditMenu: false,
    canEditPrices: false,
    canToggleItemAvailability: true,
    canSettleBills: false,
    canViewReports: false,
    canPunchOrders: false,
    canAccessWaiterConsole: false,
    canAccessKDS: true,
  },
};

export const getRoleProfile = (role?: UserRole | string): RoleProfile => {
  if (role && role in ROLE_PROFILES) {
    return ROLE_PROFILES[role as UserRole];
  }
  return ROLE_PROFILES.admin;
};

export const isTabAllowedForRole = (role: UserRole | undefined, tabId: string): boolean => {
  const profile = getRoleProfile(role);
  return profile.allowedTabs.includes(tabId);
};
