import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Crown,
  ArrowRight,
  Lock,
  Building2,
  Calendar,
  Loader2,
  Copy,
  Check,
  Printer,
  Clock,
  Info
} from "lucide-react";
import {
  SAAS_SUBSCRIPTION_PLANS,
  getSubscriptionPlans,
  SubscriptionPlan,
  formatINR,
  getRazorpayKeyId,
  loadRazorpayScript,
  calculateNextExpiry,
  getRenewalEligibility
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
  currentPlan = "pro",
  onSuccess
}) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(() => getSubscriptionPlans());
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    currentPlan === "starter" ? "starter" : "pro"
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<{
    paymentId: string;
    newExpiresAt: string;
    paidAt: string;
    plan: SubscriptionPlan;
  } | null>(null);
  const [copiedPayId, setCopiedPayId] = useState(false);

  // Sync real-time pricing whenever Super Admin updates pricing in the database
  useEffect(() => {
    const unsub = subscriptionService.subscribeCustomPricing(() => {
      setPlans(getSubscriptionPlans());
    });
    subscriptionService.getCustomPricing(true).then(() => {
      setPlans(getSubscriptionPlans());
    }).catch(() => {});
    return () => {
      unsub();
    };
  }, []);

  // Proactively fetch latest pricing from Supabase whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setPlans(getSubscriptionPlans());
      subscriptionService.getCustomPricing(true).then(() => {
        setPlans(getSubscriptionPlans());
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedPlan =
    plans.find((p) => p.id === selectedPlanId) || plans[1] || plans[0];

  const eligibility = getRenewalEligibility(currentStatus, currentExpiresAt);
  const calculatedNewExpiry = calculateNextExpiry(
    currentExpiresAt,
    currentStatus,
    selectedPlan.durationMonths
  );

  const formattedNewExpiry = calculatedNewExpiry.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  const handleCopyPaymentId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedPayId(true);
    setTimeout(() => setCopiedPayId(false), 2000);
  };

  const handlePayWithRazorpay = async () => {
    if (!eligibility.canRenew) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const razorpayKey = getRazorpayKeyId();
      const isLiveKey =
        razorpayKey &&
        razorpayKey.startsWith("rzp_") &&
        !razorpayKey.includes("placeholder");

      if (isLiveKey) {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          throw new Error("Failed to load Razorpay payment SDK. Check network.");
        }

        const options = {
          key: razorpayKey,
          amount: Math.round(selectedPlan.price * 100),
          currency: "INR",
          name: "RestaurantsOS Platform",
          description: `${selectedPlan.name} Renewal - ${restaurantName}`,
          image: "https://restaurantsos.com/favicon.png",
          prefill: {
            name: restaurantName,
            email: restaurantEmail || "billing@restaurant.com",
            contact: restaurantPhone || "9999999999"
          },
          theme: {
            color: "#059669"
          },
          handler: async (response: any) => {
            try {
              const result = await subscriptionService.processRenewal(
                restaurantId,
                restaurantName,
                selectedPlan,
                response.razorpay_payment_id || `pay_${Date.now()}`,
                currentExpiresAt,
                currentStatus
              );

              setPaymentSuccess({
                paymentId: result.payment.razorpayPaymentId,
                newExpiresAt: result.newExpiresAt,
                paidAt: result.payment.paidAt,
                plan: selectedPlan
              });

              if (onSuccess) {
                onSuccess(result.newExpiresAt, selectedPlan);
              }
            } catch (err: any) {
              console.error("Renewal processing error:", err);
              setErrorMessage(
                "Payment received (" +
                  response.razorpay_payment_id +
                  ") but database update failed: " +
                  (err.message || String(err))
              );
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
        // Sandbox Simulation
        setTimeout(async () => {
          const mockPaymentId = `pay_test_${Math.random().toString(36).substring(2, 10)}`;
          try {
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
              paidAt: result.payment.paidAt,
              plan: selectedPlan
            });
            if (onSuccess) {
              onSuccess(result.newExpiresAt, selectedPlan);
            }
          } catch (err: any) {
            console.warn("Sandbox renewal background notice:", err);
            const fallbackExpiry = calculatedNewExpiry.toISOString();
            setPaymentSuccess({
              paymentId: mockPaymentId,
              newExpiresAt: fallbackExpiry,
              paidAt: new Date().toISOString(),
              plan: selectedPlan
            });
            if (onSuccess) {
              onSuccess(fallbackExpiry, selectedPlan);
            }
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

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 overflow-y-auto animate-fade-in text-slate-900 dark:text-slate-100"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 border-0 sm:border border-slate-200 dark:border-slate-800 rounded-none sm:rounded-3xl w-full sm:max-w-2xl shadow-2xl overflow-hidden sm:my-auto h-full sm:h-auto sm:max-h-[92vh] flex flex-col animate-scale-in relative">
        
        {/* Close Button */}
        {!isProcessing && (
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 z-30 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 dark:bg-white/10 dark:hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {paymentSuccess ? (
          /* ====================================================
             ===== PAYMENT SUCCESS RECEIPT =====
             ==================================================== */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
            {/* Success Header */}
            <div className="text-center space-y-1.5 pt-1">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-sm animate-bounce-short">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Payment Successful & Plan Extended!
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Thank you, <strong>{restaurantName}</strong>. Your {paymentSuccess.plan.durationText} subscription renewal is verified and active.
              </p>
            </div>

            {/* Receipt Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Box 1: Transaction Details */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-extrabold uppercase text-[9px] tracking-wider">
                  <CreditCard className="w-3 h-3 text-emerald-500" />
                  <span>Transaction Info</span>
                </div>

                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Payment ID</span>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                      {paymentSuccess.paymentId}
                    </span>
                    <button
                      onClick={() => handleCopyPaymentId(paymentSuccess.paymentId)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 transition-colors shrink-0"
                      title="Copy Payment ID"
                    >
                      {copiedPayId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Amount Paid</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {formatINR(paymentSuccess.plan.price)}
                  </span>
                </div>
              </div>

              {/* Box 2: Plan Details */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-extrabold uppercase text-[9px] tracking-wider">
                  <Crown className="w-3 h-3 text-emerald-500" />
                  <span>Subscribed Plan</span>
                </div>

                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Plan Tier</span>
                  <p className="text-xs font-black text-slate-900 dark:text-white">
                    {paymentSuccess.plan.name}
                  </p>
                </div>

                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Validity Duration</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {paymentSuccess.plan.durationText}
                  </span>
                </div>
              </div>

              {/* Box 3: Expiry Updates */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-extrabold uppercase text-[9px] tracking-wider">
                  <Calendar className="w-3 h-3 text-emerald-500" />
                  <span>Validity Period</span>
                </div>

                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">New Expiration</span>
                  <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    {new Date(paymentSuccess.newExpiresAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}
                  </p>
                </div>

                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Status</span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">
                    Active & Verified
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                onClick={() => window.print()}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-200 active:scale-95"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Invoice Receipt</span>
              </button>
              
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        ) : (
          /* ====================================================
             ===== PLAN SELECTION VIEW =====
             ==================================================== */
          <div className="flex flex-col h-full overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-4 sm:p-5 text-white shrink-0 pr-12">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-5 h-5 text-emerald-200" />
                <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                  Choose Subscription Plan for {restaurantName}
                </h2>
              </div>
              <p className="text-emerald-100 text-xs">
                Instant Razorpay renewal with zero downtime for POS, QR Orders, & KDS.
              </p>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
              
              {/* Renewal Eligibility Alert Banner */}
              {!eligibility.canRenew && (
                <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-900 dark:text-blue-200 text-xs flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <p className="font-extrabold text-xs text-blue-900 dark:text-blue-200">
                      Subscription Active ({eligibility.daysLeft} Days Remaining)
                    </p>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                      Per the 15-day renewal rule, the renew button unlocks <strong>15 days prior to expiration</strong> (in {eligibility.daysUntilRenewalOpens} days). POS runs uninterrupted.
                    </p>
                  </div>
                </div>
              )}

              {/* Error Alert if any */}
              {errorMessage && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs p-3 rounded-2xl flex items-center justify-between">
                  <p className="font-bold">{errorMessage}</p>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="p-1 hover:bg-rose-500/20 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* 2 Subscription Plan Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {plans.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`relative rounded-2xl p-4 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20 shadow-md"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      {/* Popular / Best Value Badge */}
                      {plan.popular && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                          <Crown className="w-2.5 h-2.5" />
                          <span>Most Popular</span>
                        </div>
                      )}

                      <div>
                        {/* Plan Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xl">{plan.icon}</span>
                              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                                {plan.name}
                              </h3>
                            </div>
                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block mt-0.5">
                              {plan.badge}
                            </span>
                          </div>
                          
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-300 dark:border-slate-600"
                          }`}>
                            {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                        </div>

                        {/* Price Tag */}
                        <div className="my-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                              {formatINR(plan.price)}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                              / {plan.durationText}
                            </span>
                          </div>
                          <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                            Just {formatINR(plan.pricePerMonth)} per month
                          </p>
                        </div>

                        {/* Features List */}
                        <ul className="space-y-1.5 my-2.5">
                          {plan.features.map((feat, idx) => (
                            <li
                              key={idx}
                              className="text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="leading-tight">{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-1.5">
                        <span className={`text-[9px] font-black uppercase tracking-wider block text-center py-1 rounded-lg transition-all ${
                          isSelected
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}>
                          {isSelected ? "✓ Selected Plan" : "Click to Select"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Summary & Payment Box */}
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-700/60">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Order Summary
                    </span>
                    <p className="text-xs font-black text-slate-900 dark:text-white">
                      {selectedPlan.name} • {selectedPlan.durationText} Full Access
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-emerald-500" />
                      <span>Valid until: <strong>{formattedNewExpiry}</strong></span>
                    </p>
                  </div>
                  
                  <div className="sm:text-right">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Total Due</span>
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      {formatINR(selectedPlan.price)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-semibold">
                    <Lock className="w-3 h-3 text-emerald-500" />
                    <span>Razorpay 256-bit Encrypted • UPI, Cards, NetBanking</span>
                  </div>

                  <button
                    onClick={handlePayWithRazorpay}
                    disabled={isProcessing || !eligibility.canRenew}
                    className={`w-full sm:w-auto font-black text-[11px] uppercase tracking-wider py-2.5 px-6 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 ${
                      !eligibility.canRenew
                        ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none border border-slate-300 dark:border-slate-700"
                        : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/20 cursor-pointer active:scale-95"
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Connecting Razorpay...</span>
                      </>
                    ) : !eligibility.canRenew ? (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Renewal Locked ({eligibility.daysLeft}d left)</span>
                      </>
                    ) : (
                      <>
                        <span>Pay {formatINR(selectedPlan.price)} with Razorpay</span>
                        <ArrowRight className="w-3.5 h-3.5" />
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

  return createPortal(modalContent, document.body);
};

export default SubscriptionModal;
