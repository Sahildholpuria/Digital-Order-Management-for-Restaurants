import React, { useState, useEffect, useRef } from "react";
import { 
  Bell, 
  Receipt, 
  Clock, 
  Flame, 
  CheckCircle2, 
  UtensilsCrossed, 
  ChevronUp, 
  ArrowRight,
  Sparkles
} from "lucide-react";
import { RestaurantOrder } from "../types";

interface DynamicIslandProps {
  activeOrder?: RestaurantOrder | null;
  waiterCalled?: boolean;
  billRequested?: boolean;
  tableNumber?: string | number;
  currency?: string;
  onOpenTracker?: (orderId: string) => void;
  onOpenOrders?: () => void;
}

export const DynamicIsland: React.FC<DynamicIslandProps> = ({
  activeOrder,
  waiterCalled,
  billRequested,
  tableNumber,
  currency = "₹",
  onOpenTracker,
  onOpenOrders
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const islandRef = useRef<HTMLDivElement>(null);

  // Close island when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (islandRef.current && !islandRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isExpanded]);

  // If there is no active order and no alert, do not render
  const hasActivity = Boolean(activeOrder || waiterCalled || billRequested);
  if (!hasActivity) return null;

  // Determine priority content
  let statusType: "bill" | "waiter" | "order" = "order";
  if (billRequested) {
    statusType = "bill";
  } else if (waiterCalled) {
    statusType = "waiter";
  }

  // Order status details
  const getOrderStage = () => {
    if (!activeOrder) return { label: "Active", progress: 0, color: "text-slate-400", dot: "bg-slate-400" };
    switch (activeOrder.status) {
      case "pending":
      case "accepted":
        return { label: "Order Received", progress: 25, icon: Clock, color: "text-blue-400", dot: "bg-blue-400" };
      case "preparing":
        return { label: "Kitchen Cooking", progress: 60, icon: Flame, color: "text-orange-400", dot: "bg-orange-400" };
      case "ready":
        return { label: "Ready to Serve", progress: 90, icon: CheckCircle2, color: "text-emerald-400", dot: "bg-emerald-400" };
      case "served":
        return { label: "Served", progress: 100, icon: UtensilsCrossed, color: "text-green-400", dot: "bg-green-400" };
      default:
        return { label: activeOrder.status, progress: 10, icon: Clock, color: "text-slate-400", dot: "bg-slate-400" };
    }
  };

  const stage = getOrderStage();

  return (
    <div
      ref={islandRef}
      className="fixed left-1/2 -translate-x-1/2 z-50 pointer-events-auto transition-all duration-300 ease-out top-[max(0.4rem,calc(env(safe-area-inset-top,0px)+0.2rem))]"
      style={{
        WebkitTapHighlightColor: "transparent"
      }}
    >
      {!isExpanded ? (
        /* ================= COMPACT ISLAND PILL ================= */
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="h-9 px-3.5 bg-black/95 text-white border border-white/20 rounded-full shadow-[0_10px_25px_-5px_rgba(0,0,0,0.6)] backdrop-blur-2xl flex items-center justify-between gap-2.5 transition-all duration-300 hover:scale-[1.03] active:scale-95 cursor-pointer min-w-[200px] max-w-[92vw]"
          aria-label="Expand Dynamic Island Live Status"
        >
          {/* Left Icon Pill */}
          <div className="flex items-center gap-1.5 min-w-0">
            {statusType === "bill" ? (
              <>
                <Receipt className="w-3.5 h-3.5 text-emerald-400 animate-bounce shrink-0" />
                <span className="text-[11px] font-black text-emerald-400 truncate">Bill Requested</span>
              </>
            ) : statusType === "waiter" ? (
              <>
                <Bell className="w-3.5 h-3.5 text-amber-400 animate-bounce shrink-0" />
                <span className="text-[11px] font-black text-amber-300 truncate">Waiter Called</span>
              </>
            ) : (
              <>
                <span className={`w-2 h-2 rounded-full ${stage.dot} animate-pulse shrink-0`} />
                <span className="text-[11px] font-black text-white truncate">
                  {stage.label}
                </span>
              </>
            )}
          </div>

          {/* Right Indicator */}
          <div className="flex items-center gap-1.5 shrink-0 pl-1">
            {activeOrder && (
              <span className="text-[10px] font-mono font-bold text-slate-400 bg-white/10 px-1.5 py-0.5 rounded-md">
                #{activeOrder.orderNumber}
              </span>
            )}
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/30 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
          </div>
        </button>
      ) : (
        /* ================= EXPANDED DYNAMIC ISLAND CARD ================= */
        <div className="w-[340px] max-w-[94vw] bg-black/95 text-white border border-white/20 rounded-[28px] p-4 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.85)] backdrop-blur-3xl animate-scale-in flex flex-col gap-3">
          
          {/* Header Row */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                {statusType === "bill" ? (
                  <Receipt className="w-4 h-4 text-emerald-400" />
                ) : statusType === "waiter" ? (
                  <Bell className="w-4 h-4 text-amber-400" />
                ) : (
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-white truncate">
                  {statusType === "bill" 
                    ? "Bill Request Sent" 
                    : statusType === "waiter" 
                      ? "Waiter Notified" 
                      : `Table #${tableNumber || ""} • ${stage.label}`}
                </h4>
                <p className="text-[10px] text-slate-400 truncate">
                  {statusType === "bill"
                    ? "Cashier is preparing your final tax invoice"
                    : statusType === "waiter"
                      ? "Staff has received your table chime"
                      : activeOrder ? `Order #${activeOrder.orderNumber}` : "Live Kitchen Sync"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded-full text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              aria-label="Collapse Dynamic Island"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          {/* Active Order Progress Bar */}
          {activeOrder && (
            <div className="space-y-2 py-1">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                <span>Cooking Progress</span>
                <span className="text-emerald-400 font-mono">{stage.progress}%</span>
              </div>
              
              {/* Progress Track */}
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                  style={{ width: `${stage.progress}%` }}
                />
              </div>

              {/* Progress 4-step markers */}
              <div className="grid grid-cols-4 text-center text-[9px] font-bold text-slate-400 pt-1">
                <span className={activeOrder.status === "pending" || activeOrder.status === "accepted" ? "text-blue-400 font-black" : ""}>Placed</span>
                <span className={activeOrder.status === "preparing" ? "text-orange-400 font-black" : ""}>Cooking</span>
                <span className={activeOrder.status === "ready" ? "text-emerald-400 font-black" : ""}>Ready</span>
                <span className={activeOrder.status === "served" ? "text-green-400 font-black" : ""}>Served</span>
              </div>

              {/* Items summary */}
              {activeOrder.items && activeOrder.items.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-[11px] flex justify-between items-center mt-1">
                  <span className="text-slate-300 truncate max-w-[200px]">
                    {activeOrder.items[0]?.name} {activeOrder.items.length > 1 ? `+ ${activeOrder.items.length - 1} more` : ""}
                  </span>
                  <span className="font-mono font-black text-white shrink-0">
                    {currency}{activeOrder.grandTotal.toFixed(0)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action CTAs */}
          <div className="flex gap-2 pt-1 border-t border-white/10">
            {activeOrder && onOpenTracker && (
              <button
                type="button"
                onClick={() => {
                  setIsExpanded(false);
                  onOpenTracker(activeOrder.id);
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <span>Live Tracker</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {onOpenOrders && (
              <button
                type="button"
                onClick={() => {
                  setIsExpanded(false);
                  onOpenOrders();
                }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
              >
                <span>My Orders</span>
              </button>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
