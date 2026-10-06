import React, { useState, useRef } from "react";
import { useRestaurant } from "../../context/RestaurantContext";
import { RestaurantOrder, PaymentRecord } from "../../types";
import { printBillReceipt } from "../../utils/printUtils";
import { CaptainOrderPunchModal } from "../../components/captain/CaptainOrderPunchModal";
import { 
  FileText, 
  Printer, 
  Download, 
  CreditCard, 
  Check, 
  Tag,
  DollarSign,
  Receipt,
  User,
  Phone,
  ShoppingBag,
  Percent,
  Plus,
  UtensilsCrossed
} from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";

export const BillingManager: React.FC = () => {
  const { 
    orders, 
    settings, 
    addPaymentRecord, 
    updateOrderStatus,
    updateTableStatus,
    saveOrder,
    showToast,
    qzStatus,
    qzConfig,
    connectQZTray
  } = useRestaurant();

  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card" | "wallet">("cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [queueFilter, setQueueFilter] = useState<"all" | "dine_in" | "takeaway">("all");
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false);

  const receiptRef = useRef<HTMLDivElement>(null);
  const currency = settings?.currency || "₹";

  // Get active orders that need payment (either ready, served or completed, but let's show served as primary target for POS cash-out)
  const allBillableOrders = orders.filter(o => ["ready", "served"].includes(o.status));
  
  const billableOrders = allBillableOrders.filter(o => {
    const isTakeaway = o.orderType === "takeaway" || !!o.tokenNumber;
    if (queueFilter === "dine_in") return !isTakeaway;
    if (queueFilter === "takeaway") return isTakeaway;
    return true;
  });

  const selectedOrder = orders.find(o => o.id === selectedOrderId) || billableOrders[0];

  const isSelectedTakeaway = selectedOrder ? (selectedOrder.orderType === "takeaway" || !!selectedOrder.tokenNumber) : false;

  // Calculations
  const subtotal = selectedOrder 
    ? Math.round(selectedOrder.items.reduce((acc, item) => acc + (item.price * item.quantity), 0) * 100) / 100 
    : 0;
  const taxPercentage = settings?.taxPercentage ?? 0;
  const discountAmount = Math.round(subtotal * (discountPercent / 100) * 100) / 100;
  const taxableAmount = Math.round((subtotal - discountAmount) * 100) / 100;
  const taxAmount = Math.round(taxableAmount * (taxPercentage / 100) * 100) / 100;
  const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

  const [autoPrintOnSettle, setAutoPrintOnSettle] = useState(true);

  const handleMarkPaid = async () => {
    if (!selectedOrder) return;
    setIsProcessing(true);
    try {
      // 1. Log payment settlement
      await addPaymentRecord({
        id: `pay-${Date.now()}`,
        orderId: selectedOrder.id,
        orderNumber: selectedOrder.orderNumber,
        tableName: selectedOrder.tableName,
        orderType: selectedOrder.orderType,
        customerName: selectedOrder.customerName,
        customerPhone: selectedOrder.customerPhone,
        tokenNumber: selectedOrder.tokenNumber,
        subtotal,
        tax: taxAmount,
        discount: discountAmount,
        grandTotal,
        paymentMethod,
        createdAt: new Date().toISOString()
      });
      
      // 2. Mark order completed with exact settled totals
      const settledOrder = {
        ...selectedOrder,
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
        grandTotal,
        status: "completed" as const
      };
      await saveOrder(settledOrder);
      await updateOrderStatus(selectedOrder.id, "completed");
      
      showToast(`Order ${selectedOrder.orderNumber} settled successfully via ${paymentMethod.toUpperCase()}!`, "success");

      // 3. If no other active orders remain for this table, mark table available (for dine-in only)
      if (!isSelectedTakeaway && selectedOrder.tableId && selectedOrder.tableId !== "takeaway") {
        const otherActiveOrders = orders.filter(o => 
          o.id !== selectedOrder.id &&
          (o.tableId === selectedOrder.tableId || o.tableName === selectedOrder.tableName) &&
          ["pending", "accepted", "preparing", "ready", "served"].includes(o.status)
        );
        if (otherActiveOrders.length === 0) {
          try {
            await updateTableStatus(selectedOrder.tableId, "available");
          } catch (_) {}
        }
      }

      // Auto-trigger bill printing on POS thermal billing machine if enabled in settings
      if (autoPrintOnSettle && settings?.enableBillPrinting !== false) {
        try {
          await printBillReceipt({ ...settledOrder, paymentMethod: paymentMethod.toUpperCase() }, settings, "80mm", false);
        } catch (_) {}
      }

      // Reset POS terminal selection
      setSelectedOrderId("");
      setDiscountPercent(0);
    } catch (err) {
      console.error(err);
      showToast("Settlement failed.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate Receipt PDF
  const downloadReceiptPDF = async () => {
    if (!selectedOrder || !receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      
      // Thermal receipt standard size (3 inches wide, dynamic height based on aspect ratio)
      const width = 3;
      const height = (canvas.height * width) / canvas.width;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "in",
        format: [width, height + 0.5]
      });

      pdf.addImage(imgData, "PNG", 0, 0.25, width, height);
      pdf.save(`${selectedOrder.orderNumber}_Receipt.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
    }
  };

  // Trigger POS Thermal Receipt Print (80mm / 58mm POS billing machine)
  const triggerPrint = async (paperWidth: "80mm" | "58mm" = "80mm", forcePrint: boolean = true) => {
    if (!selectedOrder) return;
    try {
      const res = await printBillReceipt(selectedOrder, settings, paperWidth, forcePrint);
      if (res.mode === "qz-tray") {
        showToast("⚡ Silent thermal receipt sent directly to printer!", "success");
      }
    } catch (e: any) {
      showToast("Print error: " + (e.message || e), "error");
    }
  };

  const dineInCount = allBillableOrders.filter(o => o.orderType !== "takeaway" && !o.tokenNumber).length;
  const takeawayCount = allBillableOrders.filter(o => o.orderType === "takeaway" || !!o.tokenNumber).length;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight font-sans">
            POS Billing Terminal
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Generate professional invoices, apply discount margins, and settle payments for Dine-In & Takeaway.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Takeaway Punch */}
          <button
            type="button"
            onClick={() => setIsPunchModalOpen(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white px-4 py-2 rounded-2xl text-xs font-black shadow-md shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>+ Quick Takeaway</span>
          </button>

          {/* QZ Tray Printer Status Badge */}
          {qzStatus === "connected" ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-2xl text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Silent Thermal: {qzConfig.billPrinter || "Default Printer"}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => connectQZTray()}
              className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Click to connect QZ Tray for silent direct printing"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Connect QZ Tray</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Billable Table queues */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-5 rounded-3xl shadow-sm space-y-4 lg:col-span-1">
          <div className="space-y-3 pb-2 border-b border-slate-100 dark:border-slate-850">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wider">
                Awaiting Billing ({allBillableOrders.length})
              </h3>
            </div>

            {/* Queue Filter Segment */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setQueueFilter("all")}
                className={`py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  queueFilter === "all" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                All ({allBillableOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setQueueFilter("dine_in")}
                className={`py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  queueFilter === "dine_in" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                🍽️ Table ({dineInCount})
              </button>
              <button
                type="button"
                onClick={() => setQueueFilter("takeaway")}
                className={`py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  queueFilter === "takeaway" ? "bg-orange-600 text-white shadow-xs" : "text-orange-600/80 hover:text-orange-600"
                }`}
              >
                🛍️ Parcel ({takeawayCount})
              </button>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {billableOrders.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-805 rounded-2xl">
                No orders waiting for check-out.
              </div>
            ) : (
              billableOrders.map(order => {
                const isOrderTakeaway = order.orderType === "takeaway" || !!order.tokenNumber;
                return (
                  <button
                    key={order.id}
                    onClick={() => {
                      setSelectedOrderId(order.id);
                      setDiscountPercent(0);
                    }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-1.5 cursor-pointer ${
                      (selectedOrder?.id === order.id)
                        ? "bg-brand-50 border-brand-200 text-brand-600 dark:bg-brand-950/20 dark:border-brand-900/30"
                        : "bg-slate-50/50 border-slate-100 dark:bg-slate-800/10 dark:border-slate-850 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-xs font-mono">#{order.orderNumber}</span>
                        {isOrderTakeaway && (
                          <span className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30 text-[9px] font-black px-1.5 py-0.2 rounded">
                            🛍️ {order.tokenNumber ? `TK #${order.tokenNumber}` : "TAKEAWAY"}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500 text-white rounded-md">
                        {order.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex justify-between items-end w-full">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                          {isOrderTakeaway 
                            ? (order.tokenNumber ? `Takeaway Token #${order.tokenNumber}` : order.tableName)
                            : order.tableName}
                        </h4>
                        {order.customerName && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {order.customerName} {order.customerPhone ? `(${order.customerPhone})` : ""}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-0.5">{order.items.reduce((acc, curr) => acc + curr.quantity, 0)} items</p>
                      </div>
                      <span className="font-black text-sm text-slate-800 dark:text-slate-200">{currency}{order.grandTotal.toFixed(0)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Invoice Terminal */}
        {selectedOrder ? (
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            {/* Thermal Receipt Visual Preview Box */}
            <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Receipt Preview</h3>
              
              {/* Thermal Receipt Design (Ref target) */}
              <div 
                ref={receiptRef}
                className="bg-white p-6 border border-slate-200 font-mono text-slate-900 text-xs space-y-4 leading-normal shadow-sm max-w-sm mx-auto"
              >
                <div className="text-center space-y-1">
                  <Receipt className="w-8 h-8 mx-auto text-emerald-500" />
                  <h4 className="font-bold text-sm uppercase tracking-wide">{settings?.name || "The Grand Bistro"}</h4>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    {settings?.address || "102 Gourmet Blvd, Culinary District"}
                  </p>
                  {settings?.gstNumber && (
                    <p className="text-[10px] text-slate-500 font-bold">GSTIN: {settings.gstNumber}</p>
                  )}
                  {isSelectedTakeaway && (
                    <div className="mt-1 pt-1 border-t border-b border-black py-0.5">
                      <p className="font-black text-xs uppercase tracking-wider">*** TAKEAWAY / PARCEL INVOICE ***</p>
                      {selectedOrder.tokenNumber && (
                        <p className="font-black text-sm mt-0.5">TOKEN NUMBER: #{selectedOrder.tokenNumber}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-slate-300 my-2"></div>

                <div className="space-y-1 text-[10px] text-slate-700">
                  <div className="flex justify-between">
                    <span>Receipt No: {selectedOrder.orderNumber}</span>
                    <span>Date: {new Date(selectedOrder.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isSelectedTakeaway ? "Order Type:" : "Table:"} {isSelectedTakeaway ? "TAKEAWAY / PARCEL" : selectedOrder.tableName.replace(/table\s*-\s*/gi, "")}</span>
                    <span>Time: {new Date(selectedOrder.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  {selectedOrder.customerName && (
                    <div className="flex justify-between font-bold">
                      <span>Customer: {selectedOrder.customerName}</span>
                      {selectedOrder.customerPhone && <span>{selectedOrder.customerPhone}</span>}
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-slate-300 my-2"></div>

                {/* Items List */}
                <table className="w-full text-[10px] text-slate-800">
                  <thead>
                    <tr className="border-b border-dashed border-slate-300">
                      <th className="font-bold pb-1 text-left">Item</th>
                      <th className="font-bold text-center pb-1">Qty</th>
                      <th className="font-bold text-right pb-1">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((i, index) => (
                      <tr key={index}>
                        <td className="py-1">{i.name}</td>
                        <td className="py-1 text-center">{i.quantity}</td>
                        <td className="py-1 text-right">{currency}{(i.price * i.quantity).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t border-dashed border-slate-300 my-2"></div>

                {/* Totals Block */}
                <div className="space-y-1.5 text-[10px] text-slate-800">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{currency}{subtotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-red-650 font-bold">
                      <span>Discount ({discountPercent}%)</span>
                      <span>-{currency}{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Taxes & GST ({taxPercentage}%)</span>
                    <span>{currency}{taxAmount.toFixed(2)}</span>
                  </div>
                  
                  <div className="border-t border-dashed border-slate-300 my-1.5"></div>
                  
                  <div className="flex justify-between text-sm font-black text-slate-900">
                    <span>GRAND TOTAL</span>
                    <span>{currency}{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-300 my-2"></div>

                <div className="text-center text-[9px] text-slate-550 space-y-0.5">
                  <p>Settled via {paymentMethod.toUpperCase()}</p>
                  <p>{isSelectedTakeaway ? "Thank you for picking up with us!" : "Thank you for dining with us!"}</p>
                  {settings?.websiteUrl ? (
                    <p className="font-mono text-[9px] text-slate-600 font-semibold">{settings.websiteUrl}</p>
                  ) : (
                    <p className="text-[9px] text-slate-400">Please visit again</p>
                  )}
                </div>
              </div>
            </div>

            {/* Billing settlement panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-6 rounded-3xl shadow-sm space-y-6">
              
              <div className="pb-3 border-b border-slate-50 dark:border-slate-850 flex justify-between items-center">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-105 text-base">Settlement Terminal</h3>
                {isSelectedTakeaway && (
                  <span className="bg-orange-500/15 text-orange-700 dark:text-orange-400 text-xs font-black px-2.5 py-1 rounded-full border border-orange-500/30">
                    🛍️ Takeaway Token #{selectedOrder.tokenNumber || "N/A"}
                  </span>
                )}
              </div>

              {/* Adjust discount */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Apply Discount (%)</span>
                  <span className="text-brand-500">{discountPercent}% OFF</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Percent className="w-4 h-4" />
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={discountPercent || ""}
                    onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-850 rounded-2xl py-3 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white text-slate-805 dark:text-slate-100 dark:focus:bg-slate-800"
                  />
                </div>
              </div>

              {/* Select payment method */}
              <div className="space-y-3.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Payment Method</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(["cash", "upi", "card", "wallet"] as const).map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-3 rounded-2xl font-bold text-xs border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMethod === method
                          ? "bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-500/10"
                          : "bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50"
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>{method.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
                {/* POS Thermal Printing & Download Commands */}
                {settings?.enableBillPrinting !== false ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => triggerPrint("80mm")}
                        className="py-3 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-900/50 text-brand-700 dark:text-brand-300 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-brand-200 dark:border-brand-800 shadow-sm cursor-pointer"
                      >
                        <Printer className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                        <span>Print Bill (80mm)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerPrint("58mm")}
                        className="py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-800 cursor-pointer"
                      >
                        <Printer className="w-4 h-4 text-slate-500" />
                        <span>Mini Bill (58mm)</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-600 dark:text-slate-400">
                        <input
                          type="checkbox"
                          checked={autoPrintOnSettle}
                          onChange={(e) => setAutoPrintOnSettle(e.target.checked)}
                          className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                        />
                        <span>Auto-print receipt on settlement</span>
                      </label>
                      <button
                        type="button"
                        onClick={downloadReceiptPDF}
                        className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF Invoice</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-700 dark:text-amber-300 text-xs font-medium flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Printer className="w-4 h-4 text-amber-500" />
                      <span>Thermal Bill Printing Disabled</span>
                    </div>
                    <button
                      type="button"
                      onClick={downloadReceiptPDF}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF Invoice</span>
                    </button>
                  </div>
                )}

                {/* Final Checkout settled button */}
                <button
                  onClick={handleMarkPaid}
                  disabled={isProcessing}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <Check className="w-5 h-5" />
                  <span>{isProcessing ? "Processing Settle..." : `Settle & Mark Paid (${currency}${grandTotal.toFixed(0)})`}</span>
                </button>
              </div>

            </div>

          </div>
        ) : (
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 rounded-3xl p-12 text-center text-slate-400">
            No active billing orders selected. Pick an awaiting order from the left list.
          </div>
        )}

      </div>

      {/* POS Quick Takeaway Punch Modal */}
      <CaptainOrderPunchModal
        isOpen={isPunchModalOpen}
        onClose={() => setIsPunchModalOpen(false)}
        initialOrderType="takeaway"
      />

    </div>
  );
};
export default BillingManager;
