import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  ShieldCheck,
  Zap,
  CreditCard,
  Crown,
  Sparkles,
  ArrowRight,
  Lock,
  Building2,
  Calendar,
  Loader2
} from "lucide-react";
import {
  SAAS_SUBSCRIPTION_PLANS,
  SubscriptionPlan,
  formatINR,
  getRazorpayKeyId,
  loadRazorpayScript,
  calculateNextExpiry
} from "../../config/subscriptionPlans";
import subscriptionService from "../../services/subscriptionService";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
  restaurantEmail?: string;
  restaurantPhone?: string;
  currentExpiresAt?: string;
  currentStatus?: string;
  currentPlan?: string;
  onSuccess?: (newExpiresAt: string, plan: SubscriptionPlan) => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  restaurantId,
  restaurantName,
  restaurantEmail,
  restaurantPhone,
  currentExpiresAt,
  currentStatus,
  currentPlan,
  onSuccess
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<"starter" | "pro">(
    currentPlan === "starter" ? "starter" : "pro"
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<{
    paymentId: string;
    newExpiresAt: string;
    plan: SubscriptionPlan;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedPlan =
    SAAS_SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlanId) ||
    SAAS_SUBSCRIPTION_PLANS[1];

  const calculatedNewExpiry = calculateNextExpiry(
    currentExpiresAt,
    currentStatus,
    selectedPlan.durationMonths
  );

  const formattedNewExpiry = calculatedNewExpiry.toLocaleDateString([], {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const handlePayWithRazorpay = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const razorpayKey = getRazorpayKeyId();
      const isRealKey =
        razorpayKey &&
        !razorpayKey.includes("RestaurantsOS") &&
        (razorpayKey.startsWith("rzp_live_") || razorpayKey.startsWith("rzp_test_"));

      // Try loading Razorpay Checkout script
      const scriptLoaded = await loadRazorpayScript();

      if (scriptLoaded && isRealKey && (window as any).Razorpay) {
        // Real Razorpay Standard Checkout
        const options = {
          key: razorpayKey,
          amount: selectedPlan.price * 100, // paise
          currency: "INR",
          name: "RestaurantsOS",
          description: `${selectedPlan.name} (6 Months Renewal)`,
          image: "https://www.restaurantsos.in/favicon.svg",
          prefill: {
            name: restaurantName,
            email: restaurantEmail || "admin@restaurant.com",
            contact: restaurantPhone || "9999999999"
          },
          notes: {
            restaurant_id: restaurantId,
            restaurant_name: restaurantName,
            plan_id: selectedPlan.id,
            duration: "6 Months"
          },
          theme: {
            color: "#059669"
          },
          handler: async (response: any) => {
            try {
              const paymentId = response.razorpay_payment_id || `pay_${Date.now()}`;
              const result = await subscriptionService.processRenewal(
                restaurantId,
                restaurantName,
                selectedPlan,
                paymentId,
                currentExpiresAt,
                currentStatus
              );
              setPaymentSuccess({
                paymentId: result.payment.razorpayPaymentId,
                newExpiresAt: result.newExpiresAt,
                plan: selectedPlan
              });
              if (onSuccess) {
                onSuccess(result.newExpiresAt, selectedPlan);
              }
            } catch (err: any) {
              setErrorMessage("Renewal update failed: " + (err.message || String(err)));
            } finally {
              setIsProcessing(false);
            }
          },
          modal: {
            ondismiss: () => {
              setIsProcessing(false);
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on("payment.failed", (response: any) => {
          setErrorMessage(
            response.error?.description || "Payment failed or was cancelled by user."
          );
          setIsProcessing(false);
        });
        rzp.open();
      } else {
        // Demonstration / Test Mode (Instant Sandbox Simulation)
        // Allows testing without waiting for live merchant approval
        setTimeout(async () => {
          try {
            const mockPaymentId = `pay_test_${Math.random().toString(36).substring(2, 10)}`;
            const result = await subscriptionService.processRenewal(
              restaurantId,
              restaurantName,
              selectedPlan,
              mockPaymentId,
              currentExpiresAt,
              currentStatus
            );
            setPaymentSuccess({
              paymentId: result.payment.razorpayPaymentId,
              newExpiresAt: result.newExpiresAt,
              plan: selectedPlan
            });
            if (onSuccess) {
              onSuccess(result.newExpiresAt, selectedPlan);
            }
          } catch (err: any) {
            setErrorMessage("Renewal update failed: " + (err.message || String(err)));
          } finally {
            setIsProcessing(false);
          }
        }, 1200);
      }
    } catch (err: any) {
      setErrorMessage("Could not initiate payment: " + (err.message || String(err)));
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto animate-scale-in relative">
        
        {/* Close Button */}
        {!isProcessing && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {paymentSuccess ? (
          /* ===== PAYMENT SUCCESS STATE ===== */
          <div className="p-8 sm:p-12 text-center space-y-6 animate-fade-in">
            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-emerald-500/20 animate-bounce duration-1000">
              <ShieldCheck className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Subscription Activated</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Payment Successful!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto font-medium">
                Your restaurant subscription has been renewed for{" "}
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                  6 Months
                </strong>
                . Your live POS, tables, and KDS tickets are fully active.
              </p>
            </div>

            {/* Receipt Details Box */}
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 max-w-md mx-auto text-left text-xs space-y-2.5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700/60">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Restaurant:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{restaurantName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Activated Plan:</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{paymentSuccess.plan.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Amount Paid:</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatINR(paymentSuccess.plan.price)} (6 Months)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Next Renewal Date:</span>
                <span className="font-bold text-slate-900 dark:text-white">{formattedNewExpiry}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700/60 font-mono text-[10px]">
                <span className="text-slate-400 uppercase">Razorpay Ref ID:</span>
                <span className="text-slate-600 dark:text-slate-300 font-bold truncate max-w-[200px]">{paymentSuccess.paymentId}</span>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                window.location.reload();
              }}
              className="bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs uppercase tracking-wider py-4 px-8 rounded-2xl transition-all shadow-lg shadow-brand-500/20 cursor-pointer inline-flex items-center gap-2"
            >
              <span>Return to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* ===== PLAN SELECTION & CHECKOUT FORM ===== */
          <div>
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 sm:p-8 text-white relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="relative z-10 max-w-xl">
                <div className="flex items-center gap-2 text-emerald-200 text-xs font-black uppercase tracking-widest mb-1.5">
                  <CreditCard className="w-4 h-4" />
                  <span>SaaS Subscription & Renewal</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                  Choose Your 6-Month Plan for {restaurantName}
                </h2>
                <p className="text-emerald-100 text-xs mt-1 font-medium leading-relaxed">
                  Renew instantly with automated Razorpay checkout. Zero downtime for your POS billing, guest QR menus, and kitchen screens.
                </p>
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            {/* Plans Grid */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SAAS_SUBSCRIPTION_PLANS.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`relative rounded-3xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/5 ring-4 ring-emerald-500/10 shadow-lg"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      {/* Popular / Best Value Badge */}
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          <span>Most Popular • Complete</span>
                        </div>
                      )}

                      <div>
                        {/* Plan Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <span className="text-2xl">{plan.icon}</span>
                            <h3 className="text-base font-black text-slate-900 dark:text-white mt-1">
                              {plan.name}
                            </h3>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                              {plan.badge}
                            </span>
                          </div>
                          
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-300 dark:border-slate-600"
                          }`}>
                            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                        </div>

                        {/* Price Tag */}
                        <div className="my-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                              {formatINR(plan.price)}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                              / 6 Months
                            </span>
                          </div>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                            Just {formatINR(plan.pricePerMonth)} per month
                          </p>
                        </div>

                        {/* Features List */}
                        <ul className="space-y-2 my-4">
                          {plan.features.map((feat, idx) => (
                            <li
                              key={idx}
                              className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="leading-tight">{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider block text-center py-1.5 rounded-xl transition-all ${
                          isSelected
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}>
                          {isSelected ? "✓ Selected Plan" : "Click to Choose"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Summary & Payment Button */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-700/60">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Order Summary
                    </span>
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      {selectedPlan.name} • 6 Months Full Validity
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Valid until: <strong>{formattedNewExpiry}</strong></span>
                    </p>
                  </div>
                  
                  <div className="text-right sm:text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Due</span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {formatINR(selectedPlan.price)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold">
                    <Lock className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Razorpay 256-bit Encrypted • UPI, Cards, NetBanking</span>
                  </div>

                  <button
                    onClick={handlePayWithRazorpay}
                    disabled={isProcessing}
                    className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider py-4 px-8 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Connecting Razorpay...</span>
                      </>
                    ) : (
                      <>
                        <span>Pay {formatINR(selectedPlan.price)} with Razorpay</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SubscriptionModal;
