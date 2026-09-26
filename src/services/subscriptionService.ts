import confetti from "canvas-confetti";
import dbService from "./database";
import { isSupabaseConfigured, supabase } from "./supabase";
import { SubscriptionPlan, calculateNextExpiry } from "../config/subscriptionPlans";

export interface SubscriptionPaymentRecord {
  id: string;
  restaurantId: string;
  restaurantName: string;
  planId: "starter" | "pro";
  planName: string;
  amount: number;
  currency: string;
  durationMonths: number;
  razorpayPaymentId: string;
  razorpayOrderId?: string;
  status: "successful";
  paidAt: string;
  expiresAt: string;
}

const STORAGE_KEY = "saas_subscription_payments";

export const subscriptionService = {
  /**
   * Retrieves all subscription payments, optionally filtered by restaurant ID
   */
  async getPayments(restaurantId?: string): Promise<SubscriptionPaymentRecord[]> {
    let localList: SubscriptionPaymentRecord[] = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        localList = JSON.parse(stored);
      }
    } catch (e) {
      console.error("Error reading local subscription payments:", e);
    }

    if (isSupabaseConfigured) {
      try {
        let query = supabase
          .from("subscription_payments")
          .select("*")
          .order("paid_at", { ascending: false });

        if (restaurantId) {
          query = query.eq("restaurant_id", restaurantId);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map((row: any) => ({
            id: row.id,
            restaurantId: row.restaurant_id,
            restaurantName: row.restaurant_name,
            planId: row.plan_id,
            planName: row.plan_name,
            amount: Number(row.amount),
            currency: row.currency || "INR",
            durationMonths: Number(row.duration_months || 6),
            razorpayPaymentId: row.razorpay_payment_id,
            razorpayOrderId: row.razorpay_order_id,
            status: "successful",
            paidAt: row.paid_at,
            expiresAt: row.expires_at
          }));
        }
      } catch (err) {
        // Table might not exist yet in Supabase, gracefully fallback to local
      }
    }

    if (restaurantId) {
      return localList.filter(p => p.restaurantId === restaurantId);
    }
    return localList;
  },

  /**
   * Logs a successful subscription payment
   */
  async recordPayment(payment: SubscriptionPaymentRecord): Promise<void> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const list: SubscriptionPaymentRecord[] = stored ? JSON.parse(stored) : [];
      list.unshift(payment);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error("Error saving local subscription payment:", e);
    }

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("subscription_payments").insert({
          id: payment.id,
          restaurant_id: payment.restaurantId,
          restaurant_name: payment.restaurantName,
          plan_id: payment.planId,
          plan_name: payment.planName,
          amount: payment.amount,
          currency: payment.currency,
          duration_months: payment.durationMonths,
          razorpay_payment_id: payment.razorpayPaymentId,
          razorpay_order_id: payment.razorpayOrderId,
          status: payment.status,
          paid_at: payment.paidAt,
          expires_at: payment.expiresAt
        });
        if (error) {
          console.warn("Supabase record payment notice:", error);
        }
      } catch (err) {
        console.warn("Supabase record payment network error (using local storage):", err);
      }
    }
  },

  /**
   * Completes renewal: Updates restaurant status to active, extends expiry by 6 months,
   * logs the payment, and triggers confetti celebration.
   */
  async processRenewal(
    restaurantId: string,
    restaurantName: string,
    plan: SubscriptionPlan,
    razorpayPaymentId: string,
    currentExpiresAt?: string,
    currentStatus?: string
  ): Promise<{ payment: SubscriptionPaymentRecord; newExpiresAt: string }> {
    const newExpiresAtDate = calculateNextExpiry(currentExpiresAt, currentStatus, plan.durationMonths);
    const newExpiresAtIso = newExpiresAtDate.toISOString();

    const paymentRecord: SubscriptionPaymentRecord = {
      id: "subpay_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      restaurantId,
      restaurantName,
      planId: plan.id,
      planName: plan.name,
      amount: plan.price,
      currency: "INR",
      durationMonths: plan.durationMonths,
      razorpayPaymentId,
      status: "successful",
      paidAt: new Date().toISOString(),
      expiresAt: newExpiresAtIso
    };

    // 1. Record payment invoice receipt locally and in Supabase (defensively)
    try {
      await this.recordPayment(paymentRecord);
    } catch (err) {
      console.warn("Notice recording payment receipt:", err);
    }

    // 2. Update restaurant settings in Database / LocalStorage (defensively)
    try {
      await dbService.updateRestaurantSubscription(restaurantId, {
        subscriptionStatus: "active",
        planType: plan.id,
        subscriptionExpiresAt: newExpiresAtIso
      });
    } catch (err) {
      console.warn("Notice updating restaurant subscription:", err);
    }

    // 3. Trigger celebration confetti 🎉
    try {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // Ignore if confetti not supported in environment
    }

    return {
      payment: paymentRecord,
      newExpiresAt: newExpiresAtIso
    };
  }
};

export default subscriptionService;
