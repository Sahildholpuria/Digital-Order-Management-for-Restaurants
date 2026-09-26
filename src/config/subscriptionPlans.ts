/**
 * SaaS Subscription Plans & Razorpay Integration Configuration
 *
 * Official Plans:
 * 1. Starter Plan: ₹2,999 for 6 Months
 * 2. Pro Restaurant Plan: ₹6,999 for 6 Months
 */

export interface SubscriptionPlan {
  id: "starter" | "pro";
  name: string;
  badge?: string;
  popular?: boolean;
  price: number; // in INR
  durationMonths: number;
  durationText: string;
  pricePerMonth: number;
  description: string;
  features: string[];
  limitations?: string[];
  icon: string;
}

export const SAAS_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "starter",
    name: "Starter Plan",
    badge: "Budget Friendly • Cafés & Small Diners",
    price: 2999,
    durationMonths: 6,
    durationText: "6 Months",
    pricePerMonth: Math.round(2999 / 6), // ~₹500 / month
    description: "Essential POS terminal, live kitchen display, and table QR digital ordering for your restaurant.",
    features: [
      "Full POS Billing & Quick Checkout",
      "Table QR Digital Interactive Menus",
      "Kitchen Order Display (KDS) Live Tickets",
      "Unlimited Guest Orders & Bills",
      "Thermal KOT & Bill Printing (80mm & 58mm)",
      "Sales Reports & Daily Revenue Analytics",
      "Standard Email & Chat Support"
    ],
    limitations: [
      "Single Counter Terminal Login",
      "Standard System Alerts"
    ],
    icon: "⚡"
  },
  {
    id: "pro",
    name: "Pro Restaurant Plan",
    badge: "Most Popular • Full Restaurant Suite",
    popular: true,
    price: 6999,
    durationMonths: 6,
    durationText: "6 Months",
    pricePerMonth: Math.round(6999 / 6), // ~₹1,166 / month
    description: "The complete restaurant operating system with waiter handheld consoles, audio alerts, and priority 24/7 support.",
    features: [
      "Everything in Starter Plan included",
      "Table Waiter Call & Guest Bill Request Buttons",
      "Dynamic Audio Alerts & Voice Announcements",
      "Waiter Digital Handheld Tablets Console",
      "Advanced Table Floor Manager & Instant QR Generation",
      "GST Tax Breakdown & Thermal Receipt Branding",
      "Multi-Staff Shifts (Admin, Manager, Cashier, Kitchen, Waiter)",
      "Priority 24/7 Phone & WhatsApp Technical Support"
    ],
    icon: "👑"
  }
];

export const getPlanById = (id: string): SubscriptionPlan => {
  const found = SAAS_SUBSCRIPTION_PLANS.find(p => p.id === id);
  return found || SAAS_SUBSCRIPTION_PLANS[0];
};

export const formatINR = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
};

export const calculateNextExpiry = (
  currentExpiresAt?: string,
  currentStatus?: string,
  monthsToAdd: number = 6
): Date => {
  const now = new Date();
  let base = now;

  if (currentExpiresAt && currentStatus === "active") {
    const current = new Date(currentExpiresAt);
    if (current.getTime() > now.getTime()) {
      base = current;
    }
  }

  const next = new Date(base);
  next.setMonth(next.getMonth() + monthsToAdd);
  return next;
};

// Razorpay Key Management
const RAZORPAY_STORAGE_KEY = "saas_razorpay_key_id";
const RAZORPAY_SECRET_KEY = "saas_razorpay_key_secret";

export const getRazorpayKeyId = (): string => {
  const stored = localStorage.getItem(RAZORPAY_STORAGE_KEY);
  if (stored && stored.trim()) return stored.trim();
  const envKey = (import.meta as any).env?.VITE_RAZORPAY_KEY_ID;
  if (envKey && envKey.trim()) return envKey.trim();
  // Safe default test key indicator
  return "rzp_test_RestaurantsOS";
};

export const setRazorpayKeyId = (keyId: string): void => {
  localStorage.setItem(RAZORPAY_STORAGE_KEY, keyId.trim());
};

export const getRazorpayKeySecret = (): string => {
  const stored = localStorage.getItem(RAZORPAY_SECRET_KEY);
  if (stored && stored.trim()) return stored.trim();
  return "";
};

export const setRazorpayKeySecret = (secret: string): void => {
  localStorage.setItem(RAZORPAY_SECRET_KEY, secret.trim());
};

/**
 * Dynamically loads the official Razorpay Checkout v1 script
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn("Failed to load Razorpay script from CDN.");
      resolve(false);
    };
    document.body.appendChild(script);
  });
};
