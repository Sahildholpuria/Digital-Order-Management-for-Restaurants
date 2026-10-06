import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { QRCodeCanvas } from "qrcode.react";
import { RestaurantTable, RestaurantOrder, OrderItem, PaymentRecord } from "../../types";
import { useRestaurant } from "../../context/RestaurantContext";
import { printBillReceipt } from "../../utils/printUtils";
import {
  X,
  Receipt,
  CheckCircle2,
  QrCode,
  CreditCard,
  Banknote,
  Wallet,
  Printer,
  Sparkles,
  Percent,
  Calculator,
  User,
  Phone,
  ArrowRight,
  AlertCircle,
  Clock,
  ShieldCheck,
  Check
} from "lucide-react";

interface AtTableSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  table?: RestaurantTable | null;
  takeawayOrder?: RestaurantOrder | null;
}

export const AtTableSettlementModal: React.FC<AtTableSettlementModalProps> = ({
  isOpen,
  onClose,
  table,
  takeawayOrder,
}) => {
  const {
    orders,
    settings,
    addPaymentRecord,
    saveOrder,
    updateOrderStatus,
    updateTableStatus,
    markNotificationRead,
    notifications,
    showToast,
  } = useRestaurant();

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card" | "wallet">("upi");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [customDiscountAmt, setCustomDiscountAmt] = useState<string>("");
  const [cashTendered, setCashTendered] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [autoPrintReceipt, setAutoPrintReceipt] = useState<boolean>(true);
  const [isSettling, setIsSettling] = useState<boolean>(false);

  const currency = settings?.currency || "₹";
  const taxPercentage = settings?.taxPercentage !== undefined ? settings.taxPercentage : 5;
  const upiId = "merchant@upi";

  // Find all active orders for this table or takeaway
  const activeOrders = useMemo(() => {
    if (takeawayOrder) return [takeawayOrder];
    if (!table) return [];
    return orders.filter(
      (o) =>
        (o.tableId === table.id ||
          o.tableId === `table-${table.number}` ||
          o.tableName === `Table ${table.number}` ||
          o.tableName === table.number) &&
        !["completed", "cancelled"].includes(o.status)
    );
  }, [orders, table, takeawayOrder]);

  // Aggregate items across all KOT orders for consolidated billing
  const consolidatedItems = useMemo((): OrderItem[] => {
    const itemMap = new Map<string, OrderItem>();
    activeOrders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const key = `${item.itemId}_${item.price}`;
        if (itemMap.has(key)) {
          const existing = itemMap.get(key)!;
          existing.quantity += item.quantity;
        } else {
          itemMap.set(key, { ...item });
        }
      });
    });
    return Array.from(itemMap.values());
  }, [activeOrders]);

  // Financial calculations
  const subtotal = useMemo(() => {
    return consolidatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [consolidatedItems]);

  const discountAmount = useMemo(() => {
    if (customDiscountAmt && Number(customDiscountAmt) > 0) {
      return Math.min(Number(customDiscountAmt), subtotal);
    }
    if (discountPercent > 0) {
      return Math.round((subtotal * (discountPercent / 100)) * 100) / 100;
    }
    return 0;
  }, [subtotal, discountPercent, customDiscountAmt]);

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxableAmount * (taxPercentage / 100) * 100) / 100;
  const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

  // Change computation for cash
  const changeDue = useMemo(() => {
    const tendered = Number(cashTendered) || 0;
    return Math.max(0, tendered - grandTotal);
  }, [cashTendered, grandTotal]);

  // UPI Dynamic QR string (Standard Indian NPCI UPI spec)
  const upiQrString = useMemo(() => {
    const title = table ? `Table ${table.number} Bill` : `Takeaway ${takeawayOrder?.tokenNumber || "Order"}`;
    const cleanPayee = encodeURIComponent(settings?.name || "RestaurantsOS");
    const cleanNote = encodeURIComponent(title);
    return `upi://pay?pa=${upiId}&pn=${cleanPayee}&am=${grandTotal.toFixed(2)}&cu=INR&tn=${cleanNote}`;
  }, [upiId, settings?.name, table, takeawayOrder, grandTotal]);

  if (!isOpen || (!table && !takeawayOrder)) return null;

  const titleText = table ? `Table ${table.number}` : `Takeaway #${takeawayOrder?.tokenNumber || takeawayOrder?.orderNumber}`;
  const subtitleText = table ? `${table.floor ? `${table.floor} • ` : ""}${table.capacity} Seats` : "Takeaway Parcel";

  // Handle thermal print dispatch
  const handlePrintReceipt = async () => {
    try {
      if (activeOrders.length === 0) return;
      const primaryOrder = activeOrders[0];
      const receiptOrder: RestaurantOrder = {
        ...primaryOrder,
        tableName: table ? `Table ${table.number}` : `Takeaway #${takeawayOrder?.tokenNumber || ""}`,
        items: consolidatedItems,
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
        grandTotal,
      };

      await printBillReceipt(receiptOrder, settings);
      showToast("Thermal receipt printed successfully", "success");
    } catch (err) {
      console.warn("Receipt print warning:", err);
    }
  };

  // Perform Complete Settlement
  const handleSettleBill = async () => {
    if (activeOrders.length === 0) {
      showToast("No active orders found to settle", "error");
      return;
    }

    setIsSettling(true);
    try {
      const primaryOrder = activeOrders[0];
      const paymentId = `pay-${Date.now()}`;

      // 1. Log payment transaction record
      const paymentRecord: PaymentRecord = {
        id: paymentId,
        orderId: primaryOrder.id,
        orderNumber: primaryOrder.orderNumber,
        tableName: table ? `Table ${table.number}` : `Takeaway #${takeawayOrder?.tokenNumber || "Order"}`,
        orderType: table ? "dine_in" : "takeaway",
        customerName: customerName.trim() || primaryOrder.customerName || undefined,
        customerPhone: customerPhone.trim() || primaryOrder.customerPhone || undefined,
        tokenNumber: takeawayOrder?.tokenNumber || primaryOrder.tokenNumber,
        subtotal,
        tax: taxAmount,
        discount: discountAmount,
        grandTotal,
        paymentMethod,
        createdAt: new Date().toISOString(),
      };
      await addPaymentRecord(paymentRecord);

      // 2. Mark all active orders for this table as completed
      for (const order of activeOrders) {
        const settledOrder: RestaurantOrder = {
          ...order,
          subtotal: activeOrders.length === 1 ? subtotal : order.subtotal,
          discount: activeOrders.length === 1 ? discountAmount : 0,
          tax: activeOrders.length === 1 ? taxAmount : order.tax,
          grandTotal: activeOrders.length === 1 ? grandTotal : order.grandTotal,
          status: "completed",
        };
        await saveOrder(settledOrder);
        await updateOrderStatus(order.id, "completed");
      }

      // 3. Automatically free table if dine-in
      if (table) {
        await updateTableStatus(table.id, "available");
      }

      // 4. Mark any related table notifications as read
      const tableAlerts = notifications.filter(
        (n) => !n.isRead && (n.tableId === table?.id || (table && n.message.includes(`Table ${table.number}`)))
      );
      for (const alert of tableAlerts) {
        await markNotificationRead(alert.id);
      }

      // 5. Auto print thermal receipt if checked
      if (autoPrintReceipt) {
        await handlePrintReceipt();
      }

      showToast(`Bill for ${titleText} settled successfully via ${paymentMethod.toUpperCase()} (${currency}${grandTotal.toFixed(0)})!`, "success");
      onClose();
    } catch (err: any) {
      console.error("Settlement error:", err);
      showToast(err?.message || "Failed to settle bill", "error");
    } finally {
      setIsSettling(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in font-sans">
      <div 
        className="bg-white dark:bg-slate-900 w-full sm:max-w-xl max-h-[92vh] sm:rounded-3xl rounded-t-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center font-black text-lg text-white shadow-inner">
              {table ? table.number : "🛍️"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white leading-tight">
                  {titleText} Settlement
                </h2>
                <span className="bg-emerald-400/25 text-emerald-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-400/30">
                  At-Table POS
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 font-medium">
                {subtitleText} &bull; {activeOrders.length} KOT ({consolidatedItems.reduce((s, i) => s + i.quantity, 0)} items)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrintReceipt}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              title="Print Bill Preview"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 overscroll-contain">

          {/* ITEM SUMMARY CARD */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/80 pb-2">
              <span className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                <span>Ordered Dishes</span>
              </span>
              <span>{consolidatedItems.length} Unique Items</span>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-700/40">
              {consolidatedItems.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  No active items punched for this table.
                </div>
              ) : (
                consolidatedItems.map((item, idx) => (
                  <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs text-slate-700 dark:text-slate-200">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="font-extrabold text-slate-900 dark:text-white bg-slate-200/70 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[11px]">
                        {item.quantity}x
                      </span>
                      <span className="truncate font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white shrink-0">
                      {currency}{(item.price * item.quantity).toFixed(0)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* DISCOUNT SELECTOR */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-amber-500" />
              <span>Apply Discount</span>
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[0, 5, 10, 15].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    setDiscountPercent(pct);
                    setCustomDiscountAmt("");
                  }}
                  className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                    discountPercent === pct && !customDiscountAmt
                      ? "bg-amber-500 text-slate-950 border-amber-500 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {pct === 0 ? "0%" : `${pct}%`}
                </button>
              ))}
              <div className="relative">
                <input
                  type="number"
                  placeholder="₹ Off"
                  value={customDiscountAmt}
                  onChange={(e) => {
                    setCustomDiscountAmt(e.target.value);
                    setDiscountPercent(0);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs font-black text-center text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* BILL BREAKDOWN SUMMARY */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Subtotal:</span>
              <span className="font-bold">{currency}{subtotal.toFixed(2)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
                <span>Discount Applied:</span>
                <span>-{currency}{discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>GST / Taxes ({taxPercentage}%):</span>
              <span className="font-bold">{currency}{taxAmount.toFixed(2)}</span>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-center text-base font-black text-slate-900 dark:text-white">
              <span>Grand Total:</span>
              <span className="text-xl text-emerald-600 dark:text-emerald-400">
                {currency}{grandTotal.toFixed(0)}
              </span>
            </div>
          </div>

          {/* PAYMENT METHOD SELECTION */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Payment Mode</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold capitalize">{paymentMethod}</span>
            </label>

            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "upi", label: "UPI QR", icon: QrCode, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10 border-purple-500" },
                { id: "cash", label: "Cash", icon: Banknote, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500" },
                { id: "card", label: "Card / POS", icon: CreditCard, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500" },
                { id: "wallet", label: "Wallet", icon: Wallet, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500" },
              ].map((m) => {
                const Icon = m.icon;
                const isSel = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`p-2.5 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSel
                        ? `${m.bg} shadow-md scale-102`
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isSel ? m.color : "text-slate-400"}`} />
                    <span className={`text-[11px] font-black ${isSel ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* DYNAMIC UPI QR CODE DISPLAY (Directly on Waiter Phone Screen) */}
            {paymentMethod === "upi" && (
              <div className="bg-purple-500/5 dark:bg-purple-500/10 border-2 border-purple-500/30 rounded-2xl p-4 flex flex-col items-center text-center space-y-2.5 animate-scale-up">
                <div className="flex items-center gap-1.5 text-xs font-black text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                  <QrCode className="w-4 h-4" />
                  <span>Scan to Pay at Table ({currency}{grandTotal.toFixed(0)})</span>
                </div>

                <div className="p-3 bg-white rounded-2xl shadow-md border border-purple-100 flex items-center justify-center">
                  <QRCodeCanvas
                    value={upiQrString}
                    size={140}
                    level="M"
                    includeMargin={false}
                  />
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Ask guest to scan using <strong className="text-slate-800 dark:text-slate-200">GPay &bull; PhonePe &bull; Paytm &bull; BHIM</strong>
                </div>
              </div>
            )}

            {/* CASH TENDER CALCULATOR */}
            {paymentMethod === "cash" && (
              <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl p-3.5 space-y-2.5 animate-scale-up">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                    Cash Tendered
                  </span>
                  {changeDue > 0 && (
                    <span className="font-black text-emerald-700 dark:text-emerald-300">
                      Change to Return: <strong className="text-sm">{currency}{changeDue.toFixed(0)}</strong>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[500, 1000, 2000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCashTendered(String(amt))}
                      className="py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-500/30 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 cursor-pointer"
                    >
                      {currency}{amt}
                    </button>
                  ))}
                  <input
                    type="number"
                    placeholder="Custom ₹"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className="bg-white dark:bg-slate-800 border border-emerald-500/40 rounded-xl px-2 py-1 text-xs font-bold text-center text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* CUSTOMER PHONE / NAME (OPTIONAL) */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="relative">
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Guest Name (Optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-2 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                placeholder="Phone (WhatsApp Bill)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-2 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* AUTO-PRINT CHECKBOX */}
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-400 pt-1">
            <input
              type="checkbox"
              checked={autoPrintReceipt}
              onChange={(e) => setAutoPrintReceipt(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>Print thermal receipt silently upon settlement</span>
          </label>

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSettling}
            className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSettleBill}
            disabled={isSettling || activeOrders.length === 0}
            className="flex-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white text-xs font-black tracking-wide shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSettling ? (
              <span>Settling Bill...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Settle & Free Table ({currency}{grandTotal.toFixed(0)})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
