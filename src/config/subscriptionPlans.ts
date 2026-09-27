/**
 * SaaS Subscription Plans & Razorpay Integration Configuration
 *
 * Super Admins can customize the Starter and Pro plan prices from the Super Admin Panel.
 * Default official plans:
 * 1. Starter Plan: ₹2,999 for 6 Months (~₹500/mo)
 * 2. Pro Restaurant Plan: ₹6,999 for 6 Months (~₹1,166/mo)
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

export const DEFAULT_SAAS_SUBSCRIPTION_PLANS: readonly SubscriptionPlan[] = Object.freeze([
  {
    id: "starter",
    name: "Starter Plan",
    badge: "Budget Friendly • Cafés & Small Diners",
    price: 2999,
    durationMonths: 6,
    durationText: "6 Months",
    pricePerMonth: Math.round(2999 / 6),
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
    pricePerMonth: Math.round(6999 / 6),
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
]);

const CUSTOM_PRICING_STORAGE_KEY = "saas_subscription_custom_pricing";

export interface CustomPlanPricing {
  starterPrice: number;
  starterDurationMonths?: number;
  proPrice: number;
  proDurationMonths?: number;
}

export const formatDurationText = (months: number): string => {
  const m = Math.max(1, Math.round(Number(months) || 6));
  return `${m} Month${m > 1 ? "s" : ""}`;
};

/**
 * Retrieves custom plan prices and durations from local cache or defaults
 */
export const getCustomPlanPricing = (): CustomPlanPricing => {
  try {
    const stored = localStorage.getItem(CUSTOM_PRICING_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const starter = Number(parsed.starterPrice);
      const pro = Number(parsed.proPrice);
      const starterDuration = Number(parsed.starterDurationMonths);
      const proDuration = Number(parsed.proDurationMonths);

      const starterValid = !isNaN(starter) && starter > 0;
      const proValid = !isNaN(pro) && pro > 0;

      if (starterValid && proValid) {
        return {
          starterPrice: starter,
          starterDurationMonths: !isNaN(starterDuration) && starterDuration > 0 ? Math.round(starterDuration) : 6,
          proPrice: pro,
          proDurationMonths: !isNaN(proDuration) && proDuration > 0 ? Math.round(proDuration) : 6
        };
      }
    }
  } catch (_) {}
  return { starterPrice: 2999, starterDurationMonths: 6, proPrice: 6999, proDurationMonths: 6 };
};

/**
 * Saves custom plan prices and durations to local cache
 */
export const saveCustomPlanPricingLocally = (pricing: CustomPlanPricing): void => {
  try {
    localStorage.setItem(CUSTOM_PRICING_STORAGE_KEY, JSON.stringify(pricing));
  } catch (_) {}
};

/**
 * Dynamic getter for subscription plans with Super Admin custom prices and durations applied
 */
export const getSubscriptionPlans = (): SubscriptionPlan[] => {
  const custom = getCustomPlanPricing();
  const starterDuration = custom.starterDurationMonths || 6;
  const proDuration = custom.proDurationMonths || 6;

  return DEFAULT_SAAS_SUBSCRIPTION_PLANS.map(plan => {
    const isStarter = plan.id === "starter";
    const customPrice = isStarter ? custom.starterPrice : custom.proPrice;
    const durationMonths = isStarter ? starterDuration : proDuration;
    const price = typeof customPrice === "number" && customPrice > 0 ? customPrice : plan.price;
    const durationText = formatDurationText(durationMonths);

    return {
      ...plan,
      price,
      durationMonths,
      durationText,
      pricePerMonth: Math.round(price / durationMonths)
    };
  });
};

/**
 * Legacy static array exported for backward compatibility
 */
export const SAAS_SUBSCRIPTION_PLANS: SubscriptionPlan[] = getSubscriptionPlans();

/**
 * Validates and retrieves plan by id with dynamic pricing
 */
export const getPlanById = (id: string): SubscriptionPlan => {
  const plans = getSubscriptionPlans();
  const found = plans.find(p => p.id === id);
  return found || plans[0];
};

/**
 * Validates whether plan ID and submitted amount strictly match system pricing
 */
export const validatePlanPricing = (planId: string, amount: number): boolean => {
  const plan = getPlanById(planId);
  if (!plan) return false;
  return plan.price === amount;
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
    if (!isNaN(current.getTime()) && current.getTime() > now.getTime()) {
      base = current;
    }
  }

  const next = new Date(base);
  next.setMonth(next.getMonth() + monthsToAdd);
  return next;
};

export const getDaysLeft = (expiryDate?: string): number | null => {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate).getTime();
  if (isNaN(expiry)) return null;
  const diff = expiry - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export interface RenewalEligibility {
  canRenew: boolean;
  daysLeft: number | null;
  daysUntilRenewalOpens: number;
  renewalOpenDate: Date | null;
  reason: string;
}

export const getRenewalEligibility = (
  subscriptionStatus?: string,
  subscriptionExpiresAt?: string
): RenewalEligibility => {
  const daysLeft = getDaysLeft(subscriptionExpiresAt);
  const isExpired =
    subscriptionStatus === "expired" ||
    subscriptionStatus === "suspended" ||
    (daysLeft !== null && daysLeft <= 0);
  const isTrial = subscriptionStatus === "trial" || !subscriptionStatus;

  if (isExpired) {
    return {
      canRenew: true,
      daysLeft,
      daysUntilRenewalOpens: 0,
      renewalOpenDate: null,
      reason: "Subscription has expired"
    };
  }

  if (isTrial) {
    return {
      canRenew: true,
      daysLeft,
      daysUntilRenewalOpens: 0,
      renewalOpenDate: null,
      reason: "Trial active - upgrade anytime"
    };
  }

  if (daysLeft !== null && daysLeft <= 15) {
    return {
      canRenew: true,
      daysLeft,
      daysUntilRenewalOpens: 0,
      renewalOpenDate: null,
      reason: `Expiring in ${daysLeft} days - renewal unlocked`
    };
  }

  const expiryTime = subscriptionExpiresAt
    ? new Date(subscriptionExpiresAt).getTime()
    : Date.now();
  const renewalOpenDate = new Date(expiryTime - 15 * 24 * 60 * 60 * 1000);
  const daysUntilRenewalOpens = daysLeft !== null ? daysLeft - 15 : 0;

  return {
    canRenew: false,
    daysLeft,
    daysUntilRenewalOpens,
    renewalOpenDate,
    reason: `Renewal opens 15 days before expiry (in ${daysUntilRenewalOpens} days)`
  };
};

// Razorpay Public Client Key Management
const RAZORPAY_KEY_ID_STORAGE = "saas_razorpay_key_id";

export const getRazorpayKeyId = (): string => {
  const stored = localStorage.getItem(RAZORPAY_KEY_ID_STORAGE);
  if (stored && stored.trim()) return stored.trim();
  const envKey = (import.meta as any).env?.VITE_RAZORPAY_KEY_ID;
  if (envKey && envKey.trim()) return envKey.trim();
  return "rzp_test_TgfMcpEjORTFSS";
};

export const setRazorpayKeyId = (keyId: string): void => {
  if (!keyId || !keyId.trim()) {
    localStorage.removeItem(RAZORPAY_KEY_ID_STORAGE);
    return;
  }
  localStorage.setItem(RAZORPAY_KEY_ID_STORAGE, keyId.trim());
};

/**
 * Dynamically loads the official Razorpay Checkout v1 script securely
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

// Super Admin credentials configuration helpers
const RAZORPAY_SECRET_STORAGE = "saas_razorpay_key_secret";

export const getRazorpayKeySecret = (): string => {
  const stored = localStorage.getItem(RAZORPAY_SECRET_STORAGE);
  if (stored && stored.trim()) return stored.trim();
  const envSecret = (import.meta as any).env?.VITE_RAZORPAY_KEY_SECRET;
  if (envSecret && envSecret.trim()) return envSecret.trim();
  return "";
};

export const setRazorpayKeySecret = (secret: string): void => {
  if (!secret || !secret.trim()) {
    localStorage.removeItem(RAZORPAY_SECRET_STORAGE);
    return;
  }
  localStorage.setItem(RAZORPAY_SECRET_STORAGE, secret.trim());
};
