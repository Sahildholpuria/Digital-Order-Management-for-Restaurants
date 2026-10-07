import React, { useState, useRef, useMemo } from "react";
import { useRestaurant } from "../../context/RestaurantContext";
import { RestaurantOrder, PaymentRecord, OrderItem, OrderType, OrderStatus } from "../../types";
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

  // Build Consolidated Bill Groups: Combines multiple rounds/KOTs for the same table into 1 unified bill
  const activeOrdersList = useMemo(() => {
    return orders.filter(o => !["completed", "cancelled"].includes(o.status));
  }, [orders]);

  const billableGroups = useMemo(() => {
    const groups: {
      id: string;
      key: string;
      tableName: string;
      tableId?: string;
      tableFloor?: string;
      orderType: OrderType;
      customerName?: string;
      customerPhone?: string;
      tokenNumber?: string;
      orders: RestaurantOrder[];
      items: OrderItem[];
      subtotal: number;
      tax: number;
      grandTotal: number;
      status: OrderStatus;
      createdAt: string;
      isTakeaway: boolean;
    }[] = [];

    const tableMap = new Map<string, typeof groups[0]>();

    activeOrdersList.forEach(order => {
      const isTakeaway = order.orderType === "takeaway" || !!order.tokenNumber;
      
      if (isTakeaway) {
        // Each takeaway parcel is an independent bill
        const items = order.items || [];
        const sub = Math.round(items.reduce((acc, item) => acc + (item.price * item.quantity), 0) * 100) / 100;
        const taxRate = settings?.taxPercentage ?? 0;
        const tax = Math.round(sub * (taxRate / 100) * 100) / 100;
        const total = Math.round((sub + tax) * 100) / 100;

        groups.push({
          id: order.id,
          key: `takeaway-${order.id}`,
          tableName: order.tableName || "Takeaway",
          tableId: "takeaway",
          tableFloor: undefined,
          orderType: "takeaway",
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          tokenNumber: order.tokenNumber,
          orders: [order],
          items,
          subtotal: sub,
          tax,
          grandTotal: total,
          status: order.status,
          createdAt: order.createdAt,
          isTakeaway: true
        });
      } else {
        // Consolidate all orders for this table into 1 master bill
        const cleanTableNum = (order.tableName || "").replace(/^table[\s\-_]*/i, '').trim().toLowerCase();
        const groupKey = order.tableId && order.tableId !== "takeaway" ? order.tableId : `table-${cleanTableNum || '1'}`;

        if (tableMap.has(groupKey)) {
          const grp = tableMap.get(groupKey)!;
          grp.orders.push(order);
          if (order.customerName && !grp.customerName) grp.customerName = order.customerName;
          if (order.customerPhone && !grp.customerPhone) grp.customerPhone = order.customerPhone;
          if (order.tableFloor && !grp.tableFloor) grp.tableFloor = order.tableFloor;

          // Merge item quantities
          (order.items || []).forEach(newItem => {
            const key = `${newItem.itemId}_${newItem.price}_${newItem.portion || ''}_${newItem.specialInstructions || ''}`;
            const existingIdx = grp.items.findIndex(i => `${i.itemId}_${i.price}_${i.portion || ''}_${i.specialInstructions || ''}` === key);
            if (existingIdx > -1) {
              grp.items[existingIdx].quantity += newItem.quantity;
            } else {
              grp.items.push({ ...newItem });
            }
          });
        } else {
          const items = (order.items || []).map(i => ({ ...i }));
          const grp = {
            id: groupKey,
            key: groupKey,
            tableName: order.tableName.toLowerCase().startsWith("table") ? order.tableName : `Table ${order.tableName}`,
            tableId: order.tableId,
            tableFloor: order.tableFloor,
            orderType: "dine_in" as OrderType,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            tokenNumber: undefined,
            orders: [order],
            items,
            subtotal: 0,
            tax: 0,
            grandTotal: 0,
            status: order.status,
            createdAt: order.createdAt,
            isTakeaway: false
          };
          tableMap.set(groupKey, grp);
          groups.push(grp);
        }
      }
    });

    // Compute final subtotal and totals for consolidated table groups
    const taxRate = settings?.taxPercentage ?? 0;
    groups.forEach(g => {
      if (!g.isTakeaway) {
        g.subtotal = Math.round(g.items.reduce((acc, item) => acc + (item.price * item.quantity), 0) * 100) / 100;
        g.tax = Math.round(g.subtotal * (taxRate / 100) * 100) / 100;
        g.grandTotal = Math.round((g.subtotal + g.tax) * 100) / 100;
      }
    });

    return groups;
  }, [activeOrdersList, settings]);

  const filteredBillableGroups = useMemo(() => {
    return billableGroups.filter(g => {
      if (queueFilter === "dine_in") return !g.isTakeaway;
      if (queueFilter === "takeaway") return g.isTakeaway;
      return true;
    });
  }, [billableGroups, queueFilter]);

  const selectedGroup = billableGroups.find(g => g.id === selectedOrderId || g.key === selectedOrderId) || filteredBillableGroups[0];

  // Map selectedGroup to a synthesized consolidated RestaurantOrder for seamless printing & rendering
  const selectedOrder = useMemo((): RestaurantOrder | null => {
    if (!selectedGroup || !selectedGroup.orders || selectedGroup.orders.length === 0) return null;
    const primaryOrder = selectedGroup.orders[0];
    return {
      ...primaryOrder,
      id: primaryOrder.id,
      orderNumber: primaryOrder.orderNumber,
      tableId: selectedGroup.tableId || primaryOrder.tableId,
      tableName: selectedGroup.tableName,
      tableFloor: selectedGroup.tableFloor,
      orderType: selectedGroup.orderType,
      customerName: selectedGroup.customerName || primaryOrder.customerName,
      customerPhone: selectedGroup.customerPhone || primaryOrder.customerPhone,
      tokenNumber: selectedGroup.tokenNumber || primaryOrder.tokenNumber,
      items: selectedGroup.items,
      subtotal: selectedGroup.subtotal,
      tax: selectedGroup.tax,
      discount: 0,
      grandTotal: selectedGroup.grandTotal,
      status: selectedGroup.status,
      createdAt: selectedGroup.createdAt,
      elapsedTimeStart: selectedGroup.createdAt,
    };
  }, [selectedGroup]);

  const isSelectedTakeaway = selectedGroup?.isTakeaway || false;

  // Financial calculations
  const subtotal = selectedGroup ? selectedGroup.subtotal : 0;
  const taxPercentage = settings?.taxPercentage ?? 0;
  const discountAmount = Math.round(subtotal * (discountPercent / 100) * 100) / 100;
  const taxableAmount = Math.round((subtotal - discountAmount) * 100) / 100;
  const taxAmount = Math.round(taxableAmount * (taxPercentage / 100) * 100) / 100;
  const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

  const [autoPrintOnSettle, setAutoPrintOnSettle] = useState(true);

  const handleMarkPaid = async () => {
    if (!selectedGroup || !selectedOrder) return;
    setIsProcessing(true);
    try {
      const primaryOrder = selectedGroup.orders[0] || selectedOrder;
      const paymentId = `pay-${Date.now()}`;

      // 1. Log payment settlement with genuine primary order ID
      await addPaymentRecord({
        id: paymentId,
        orderId: primaryOrder.id,
        orderNumber: primaryOrder.orderNumber,
        tableName: selectedGroup.tableName,
        orderType: selectedGroup.orderType,
        customerName: selectedGroup.customerName || primaryOrder.customerName,
        customerPhone: selectedGroup.customerPhone || primaryOrder.customerPhone,
        tokenNumber: selectedGroup.tokenNumber || primaryOrder.tokenNumber,
        subtotal,
        tax: taxAmount,
        discount: discountAmount,
        grandTotal,
        paymentMethod,
        createdAt: new Date().toISOString()
      });
      
      // 2. Mark all orders in this table session as completed
      for (const ord of selectedGroup.orders) {
        try {
          const updatedOrd: RestaurantOrder = {
            ...ord,
            status: "completed" as const,
            subtotal: ord.id === primaryOrder.id ? subtotal : ord.subtotal,
            discount: ord.id === primaryOrder.id ? discountAmount : 0,
            tax: ord.id === primaryOrder.id ? taxAmount : ord.tax,
            grandTotal: ord.id === primaryOrder.id ? grandTotal : ord.grandTotal,
          };
          await saveOrder(updatedOrd);
          await updateOrderStatus(ord.id, "completed");
        } catch (itemErr) {
          console.warn("Complete order item notice:", itemErr);
        }
      }

      // 3. Mark dining table available
      if (!selectedGroup.isTakeaway && selectedGroup.tableId && selectedGroup.tableId !== "takeaway") {
        try {
          await updateTableStatus(selectedGroup.tableId, "available");
        } catch (_) {}
      }

      showToast(`${selectedGroup.tableName} settled successfully via ${paymentMethod.toUpperCase()}!`, "success");

      // 4. Auto-trigger bill printing on POS thermal billing machine if enabled
      if (autoPrintOnSettle && settings?.enableBillPrinting !== false) {
        try {
          const receiptPrintOrder: RestaurantOrder = {
            ...primaryOrder,
            tableName: selectedGroup.tableName,
            items: selectedGroup.items,
            subtotal,
            discount: discountAmount,
            tax: taxAmount,
            grandTotal,
          };
          await printBillReceipt({ ...receiptPrintOrder, paymentMethod: paymentMethod.toUpperCase() }, settings, "80mm", true);
        } catch (err) {
          console.warn("Settlement receipt auto-print notice:", err);
        }
      }

      // Reset POS terminal selection
      setSelectedOrderId("");
      setDiscountPercent(0);
    } catch (err: any) {
      console.error("Settlement error:", err);
      showToast("Settlement error: " + (err.message || "Operation failed"), "error");
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

  const dineInCount = billableGroups.filter(g => !g.isTakeaway).length;
  const takeawayCount = billableGroups.filter(g => g.isTakeaway).length;

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in max-w-7xl mx-auto">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight font-sans">
            POS Billing Terminal
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Consolidated table billing, discount management, and instant payment settlement for Dine-In & Takeaway.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Takeaway Punch */}
          <button
            type="button"
            onClick={() => setIsPunchModalOpen(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white px-3 py-1.5 rounded-xl text-xs font-black shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>+ Quick Takeaway</span>
          </button>

          {/* QZ Tray Printer Status Badge */}
          {qzStatus === "connected" ? (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1.5 rounded-xl text-[11px] font-bold shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Silent Thermal: {qzConfig.billPrinter || "Default Printer"}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => connectQZTray()}
              className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-400 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
              title="Click to connect QZ Tray for silent direct printing"
            >
              <Printer className="w-3 h-3" />
              <span>Connect QZ Tray</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4">
        
        {/* Left Side: Billable Table queues */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 p-3.5 sm:p-4 rounded-2xl shadow-sm space-y-3 lg:col-span-1">
          <div className="space-y-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">
                Active Tables & Bills ({billableGroups.length})
              </h3>
            </div>

            {/* Queue Filter Segment */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setQueueFilter("all")}
                className={`py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  queueFilter === "all" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                All ({billableGroups.length})
              </button>
              <button
                type="button"
                onClick={() => setQueueFilter("dine_in")}
                className={`py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  queueFilter === "dine_in" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                🍽️ Tables ({dineInCount})
              </button>
              <button
                type="button"
                onClick={() => setQueueFilter("takeaway")}
                className={`py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  queueFilter === "takeaway" ? "bg-orange-600 text-white shadow-xs" : "text-orange-600/80 hover:text-orange-600"
                }`}
              >
                🛍️ Parcels ({takeawayCount})
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {filteredBillableGroups.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No active tables waiting for check-out.
              </div>
            ) : (
              filteredBillableGroups.map(group => {
                const isSelected = selectedGroup?.id === group.id;
                const totalItemsCount = group.items.reduce((acc, curr) => acc + curr.quantity, 0);

                return (
                  <button
                    key={group.id}
                    onClick={() => {
                      setSelectedOrderId(group.id);
                      setDiscountPercent(0);
                    }}
                    className={`w-full text-left p-2.5 sm:p-3 rounded-xl border transition-all flex flex-col gap-1 cursor-pointer ${
                      isSelected
                        ? "bg-brand-50 border-brand-200 text-brand-600 dark:bg-brand-950/20 dark:border-brand-900/30"
                        : "bg-slate-50/50 border-slate-100 dark:bg-slate-800/10 dark:border-slate-850 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-xs font-mono">
                          {group.isTakeaway ? `TK #${group.tokenNumber || group.orders[0]?.orderNumber}` : group.tableName}
                        </span>
                        {group.orders.length > 1 && (
                          <span className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-[8.5px] font-black px-1.5 py-0.2 rounded">
                            {group.orders.length} KOTs Combined
                          </span>
                        )}
                        {group.isTakeaway && (
                          <span className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30 text-[8.5px] font-black px-1.5 py-0.2 rounded">
                            🛍️ TAKEAWAY
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-500 text-white rounded">
                        {group.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex justify-between items-end w-full">
                      <div>
                        {group.customerName && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[140px]">
                            {group.customerName} {group.customerPhone ? `(${group.customerPhone})` : ""}
                          </p>
                        )}
                        <p className="text-[9.5px] text-slate-400">
                          {totalItemsCount} {totalItemsCount === 1 ? "item" : "items"}
                          {group.orders.length > 1 ? ` • ${group.orders.length} rounds` : ""}
                        </p>
                      </div>
                      <span className="font-black text-xs sm:text-sm text-slate-800 dark:text-slate-200">{currency}{group.grandTotal.toFixed(0)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Invoice Terminal */}
        {selectedOrder ? (
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 items-start">
            
            {/* Thermal Receipt Visual Preview Box */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 p-3.5 sm:p-4 rounded-2xl shadow-sm space-y-3">
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
                    <span>Time: {new Date(selectedOrder.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</span>
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
            <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 p-3.5 sm:p-4 rounded-2xl shadow-sm space-y-4">
              
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
