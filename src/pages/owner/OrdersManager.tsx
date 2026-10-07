import React, { useState, useEffect } from "react";
import { useRestaurant } from "../../context/RestaurantContext";
import { RestaurantOrder, OrderStatus, OrderItem, OrderType } from "../../types";
import { 
  Search, 
  Clock, 
  Check, 
  X, 
  Play, 
  CheckSquare, 
  Trash2, 
  Edit3, 
  Plus, 
  Minus,
  Volume2,
  VolumeX,
  FileText,
  Printer,
  RotateCw,
  Zap,
  ShoppingBag,
  User,
  Phone
} from "lucide-react";
import { printKOTReceipt } from "../../utils/printUtils";
import { CaptainOrderPunchModal } from "../../components/captain/CaptainOrderPunchModal";

export const OrdersManager: React.FC = () => {
  const { orders, settings, tables, updateOrderStatus, saveOrder, refreshData, testSoundAlert, qzStatus, qzConfig, connectQZTray, showToast } = useRestaurant();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [selectedTableFilter, setSelectedTableFilter] = useState<string>("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState<"all" | "dine_in" | "takeaway">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false);
  const [punchModalOrderType, setPunchModalOrderType] = useState<"dine_in" | "takeaway">("dine_in");

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (refreshData) {
        await refreshData();
      }
    } catch (_) {
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Edit Order Modal States
  const [editingOrder, setEditingOrder] = useState<RestaurantOrder | null>(null);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);

  // Force re-renders for elapsed timers
  const [, setTimeTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTimeTick(t => t + 1), 10000); // refresh every 10s
    return () => clearInterval(timer);
  }, []);

  const currency = settings?.currency || "₹";

  // Get elapsed minutes
  const getElapsedMinutes = (timeString: string) => {
    const start = new Date(timeString).getTime();
    const diffMs = Date.now() - start;
    return Math.floor(diffMs / 60000);
  };

  // Build the set of valid table display-names from currently-existing tables only.
  const validTableNames: Set<string> = tables.length > 0
    ? new Set(tables.map(t => `Table ${t.number}`))
    : new Set(orders.map(o => o.tableName));

  const activeTables = Array.from(validTableNames).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ""), 10);
    const numB = parseInt(b.replace(/\D/g, ""), 10);
    return numA - numB;
  });

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const isTakeaway = order.orderType === "takeaway" || !!order.tokenNumber;
    
    // Type filter
    if (orderTypeFilter === "dine_in" && isTakeaway) return false;
    if (orderTypeFilter === "takeaway" && !isTakeaway) return false;

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      order.orderNumber.toLowerCase().includes(q) || 
      order.tableName.toLowerCase().includes(q) ||
      (order.customerName && order.customerName.toLowerCase().includes(q)) ||
      (order.customerPhone && order.customerPhone.includes(q)) ||
      (order.tokenNumber && order.tokenNumber.toLowerCase().includes(q));
    
    const matchesTable = selectedTableFilter === "all" || order.tableName === selectedTableFilter;
    
    let matchesStatus = false;
    if (statusFilter === "active") {
      matchesStatus = ["pending", "accepted", "preparing", "ready", "served"].includes(order.status);
    } else if (statusFilter === "all") {
      matchesStatus = true;
    } else {
      matchesStatus = order.status === statusFilter;
    }

    return matchesSearch && matchesTable && matchesStatus;
  });

  // Handle Edit Order Actions
  const handleOpenEdit = (order: RestaurantOrder) => {
    setEditingOrder(order);
    setEditItems([...order.items]);
  };

  const handleUpdateItemQty = (index: number, delta: number) => {
    const updated = [...editItems];
    updated[index].quantity += delta;
    if (updated[index].quantity <= 0) {
      updated.splice(index, 1);
    }
    setEditItems(updated);
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    
    const subtotal = Math.round(editItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0) * 100) / 100;
    const taxRate = settings?.taxPercentage ?? 0;
    const tax = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const grandTotal = Math.round((subtotal + tax) * 100) / 100;

    const updatedOrder: RestaurantOrder = {
      ...editingOrder,
      items: editItems,
      subtotal,
      tax,
      grandTotal
    };

    await saveOrder(updatedOrder);
    setEditingOrder(null);
  };

  // Group orders for board columns
  const getBoardColumns = () => {
    const columns: { title: string; statusCodes: OrderStatus[]; color: string; badge: string; list: RestaurantOrder[] }[] = [
      { title: "New Pending", statusCodes: ["pending"], color: "border-t-red-500 bg-red-500/5", badge: "bg-red-500/10 text-red-700 dark:text-red-400", list: [] },
      { title: "In Kitchen Cooking", statusCodes: ["accepted", "preparing"], color: "border-t-amber-500 bg-amber-500/5", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400", list: [] },
      { title: "Ready / Serving", statusCodes: ["ready", "served"], color: "border-t-emerald-500 bg-emerald-500/5", badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", list: [] },
    ];

    filteredOrders.forEach(o => {
      columns.forEach(col => {
        if (col.statusCodes.includes(o.status)) {
          col.list.push(o);
        }
      });
    });

    return columns;
  };

  const boardColumns = getBoardColumns();

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Page Title & Action CTAs */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-1 border-b border-slate-200/80 dark:border-slate-800">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            Live Order Manager
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            Monitor and update kitchen orders in real-time for Dine-In & Takeaway.
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
          {/* Primary Action Buttons Grid */}
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
            {/* Punch Table Order CTA */}
            <button
              type="button"
              onClick={() => {
                setPunchModalOrderType("dine_in");
                setIsPunchModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 text-center truncate"
            >
              <Zap className="w-4 h-4 fill-current text-amber-300 shrink-0" />
              <span className="truncate">+ Table KOT</span>
            </button>

            {/* Punch Takeaway Order CTA */}
            <button
              type="button"
              onClick={() => {
                setPunchModalOrderType("takeaway");
                setIsPunchModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white shadow-md shadow-orange-500/20 transition-all cursor-pointer active:scale-95 text-center truncate"
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span className="truncate">+ Takeaway</span>
            </button>
          </div>

          {/* Secondary Utilities Row */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 w-full sm:w-auto">
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-2xs cursor-pointer active:scale-95 shrink-0"
              title="Refresh Live Orders & Details"
            >
              <RotateCw className={`w-3.5 h-3.5 text-brand-600 dark:text-brand-400 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            {/* Audio speech notification controls & Test Chime */}
            <button
              onClick={() => testSoundAlert()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all border bg-brand-50 border-brand-200 text-brand-600 dark:bg-brand-950/20 dark:border-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-900/40 cursor-pointer active:scale-95 shadow-2xs shrink-0"
              title="Click to Test Sound Chime & Voice Alert"
            >
              <Volume2 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              <span>Test Sound</span>
            </button>

            {/* QZ Tray Printer Status Badge */}
            {qzStatus === "connected" ? (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold shadow-2xs shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="truncate max-w-[140px]">KOT: {qzConfig.kotPrinter || "Kitchen"}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => connectQZTray()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0"
                title="Connect QZ Tray for silent direct thermal printing"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>QZ Printer</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter and search panel - Compact & Clean */}
      <div className="card-premium flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center justify-between p-2.5 sm:p-3 rounded-2xl">
        
        {/* Search Input */}
        <div className="relative w-full lg:w-64 xl:w-72 shadow-2xs rounded-xl">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </span>
          <input
            type="text"
            placeholder="Search order ID, table, or token..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl py-1.5 pl-8.5 pr-7 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all font-medium text-slate-900 dark:text-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter Controls: Structured Rows on Mobile, Responsive Wrap on Desktop */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full lg:w-auto">
          
          {/* Order Type Toggle (Dine-In / Takeaway / All) */}
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => setOrderTypeFilter("all")}
              className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center whitespace-nowrap ${
                orderTypeFilter === "all" 
                  ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xs font-black"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setOrderTypeFilter("dine_in")}
              className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1 whitespace-nowrap ${
                orderTypeFilter === "dine_in" 
                  ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xs font-black"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              <span>🍽️</span>
              <span>Dine-In</span>
            </button>
            <button
              onClick={() => setOrderTypeFilter("takeaway")}
              className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1 whitespace-nowrap ${
                orderTypeFilter === "takeaway" 
                  ? "bg-orange-600 text-white shadow-xs font-black"
                  : "text-orange-600/80 hover:text-orange-600"
              }`}
            >
              <span>🛍️</span>
              <span>Takeaway</span>
            </button>
          </div>

          {/* Status Filter Tabs (Active / Completed / All) */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => setStatusFilter("active")}
              className={`flex-1 sm:flex-initial min-w-[64px] px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center whitespace-nowrap ${
                statusFilter === "active" 
                  ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xs font-black"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-700/40"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`flex-1 sm:flex-initial min-w-[76px] px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center whitespace-nowrap ${
                statusFilter === "completed" 
                  ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xs font-black"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-700/40"
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setStatusFilter("all")}
              className={`flex-1 sm:flex-initial min-w-[48px] px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center whitespace-nowrap ${
                statusFilter === "all" 
                  ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xs font-black"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-700/40"
              }`}
            >
              All
            </button>
          </div>

          {/* Table Selector Dropdown */}
          <div className="w-full sm:w-auto">
            <select
              value={selectedTableFilter}
              onChange={(e) => setSelectedTableFilter(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-[11px] text-slate-700 dark:text-slate-200 focus:outline-none font-bold cursor-pointer shadow-2xs"
            >
              <option value="all">All Dining Tables</option>
              {activeTables.map((t, idx) => (
                <option key={idx} value={t}>{t}</option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* Kanban Board View (Compact & Proportional) */}
      {statusFilter === "active" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {boardColumns.map((col, index) => (
            <div key={index} className={`rounded-2xl border-t-4 p-3.5 sm:p-4 space-y-3 flex flex-col min-h-[420px] border border-slate-200/70 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/10 backdrop-blur-sm ${col.color}`}>
              
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800/50">
                <h3 className="font-extrabold text-slate-700 dark:text-slate-200 text-[11px] uppercase tracking-wider">{col.title}</h3>
                <span className={`font-black text-[11px] px-2 py-0.5 rounded-full ${col.badge}`}>
                  {col.list.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 max-h-[70vh] pr-1">
                {col.list.length === 0 ? (
                  <div className="h-32 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                    No orders in this stage
                  </div>
                ) : (
                  col.list.map(order => (
                    <OrderCard 
                      key={order.id}
                      order={order}
                      currency={currency}
                      restaurantName={settings?.name}
                      getElapsedMinutes={getElapsedMinutes}
                      onUpdateStatus={updateOrderStatus}
                      onOpenEdit={handleOpenEdit}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Regular Flat List View for historical/filtered orders */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredOrders.length === 0 ? (
            <div className="col-span-full card-premium p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
              No orders found matching filters.
            </div>
          ) : (
            filteredOrders.map(order => (
              <OrderCard 
                key={order.id}
                order={order}
                currency={currency}
                restaurantName={settings?.name}
                getElapsedMinutes={getElapsedMinutes}
                onUpdateStatus={updateOrderStatus}
                onOpenEdit={handleOpenEdit}
              />
            ))
          )}
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-slide-up">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-105 text-base">Edit Order Items</h3>
                <p className="text-xs text-slate-400 font-semibold">{editingOrder.orderNumber} &bull; {editingOrder.tableName}</p>
              </div>
              <button onClick={() => setEditingOrder(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 max-h-[50vh] overflow-y-auto space-y-4">
              {editItems.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-400 font-semibold">
                  No items left in order. Saving will cancel the order.
                </div>
              ) : (
                editItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center pb-3.5 border-b border-slate-50 dark:border-slate-800/40">
                    <div className="flex-1 pr-4">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{item.name}</h4>
                      <p className="text-xs text-brand-600 font-semibold">{currency}{item.price}</p>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/40 px-2 py-1 rounded-xl">
                      <button
                        onClick={() => handleUpdateItemQty(idx, -1)}
                        className="text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateItemQty(idx, 1)}
                        className="text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Estimated Total</p>
                <p className="text-lg font-black text-slate-800 dark:text-slate-100">
                  {currency}{editItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0).toFixed(0)}
                </p>
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CAPTAIN / CASHIER ORDER PUNCH MODAL */}
      <CaptainOrderPunchModal
        isOpen={isPunchModalOpen}
        onClose={() => setIsPunchModalOpen(false)}
        initialOrderType={punchModalOrderType}
      />

    </div>
  );
};

// ==========================================
// SUB-COMPONENT: ORDER CARD
// ==========================================

interface OrderCardProps {
  order: RestaurantOrder;
  currency: string;
  restaurantName?: string;
  getElapsedMinutes: (time: string) => number;
  onUpdateStatus: (id: string, status: OrderStatus) => Promise<void>;
  onOpenEdit: (order: RestaurantOrder) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ 
  order, 
  currency, 
  restaurantName,
  getElapsedMinutes, 
  onUpdateStatus, 
  onOpenEdit 
}) => {
  const elapsed = getElapsedMinutes(order.createdAt);
  const isTakeaway = order.orderType === "takeaway" || !!order.tokenNumber;
  
  // Determine timer color based on delay
  const timerColor = elapsed > 20 
    ? "text-red-650 bg-red-500/10 border border-red-500/10 animate-pulse" 
    : elapsed > 10 
      ? "text-amber-600 bg-amber-500/10 border border-amber-500/10" 
      : "text-slate-500 bg-slate-500/10 border border-slate-205/10 dark:bg-slate-800/40";

  return (
    <div className={`card-premium space-y-3 flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl ${
      isTakeaway ? "border-2 border-orange-500/40 shadow-xs" : ""
    }`}>
      
      {/* Card Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-extrabold text-slate-800 dark:text-slate-100 text-xs font-mono">{order.orderNumber}</span>
            
            {/* Takeaway Tag */}
            {isTakeaway && (
              <span className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30 text-[8.5px] font-black px-1.5 py-0.5 rounded flex items-center gap-1">
                <ShoppingBag className="w-2.5 h-2.5" />
                <span>{order.tokenNumber ? `TK #${order.tokenNumber}` : "TAKEAWAY"}</span>
              </span>
            )}

            <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
              order.status === "pending" ? "bg-red-500/10 text-red-700 dark:text-red-400" :
              order.status === "accepted" ? "bg-blue-500/10 text-blue-700 dark:text-blue-400" :
              order.status === "preparing" ? "bg-amber-500/10 text-amber-705 dark:text-amber-400" :
              order.status === "ready" ? "bg-green-500/10 text-green-700 dark:text-green-400" :
              order.status === "served" ? "bg-teal-500/10 text-teal-700 dark:text-teal-400" :
              "bg-slate-500/10 text-slate-700 dark:text-slate-400"
            }`}>
              {order.status === "ready" && isTakeaway ? "PACKED / READY" : order.status}
            </span>
          </div>

          <h4 className="font-black text-sm sm:text-base text-slate-800 dark:text-slate-100 mt-0.5">
            {isTakeaway
              ? (order.tokenNumber ? `Takeaway • Token #${order.tokenNumber}` : order.tableName)
              : (order.tableName.toLowerCase().startsWith("table") 
                  ? order.tableName 
                  : `Table ${order.tableName.replace(/table\s*[-_]?\s*/gi, "").trim()}`)}
          </h4>

          {(order.customerName || order.customerPhone) && (
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
              {order.customerName && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>{order.customerName}</span>
                </span>
              )}
              {order.customerPhone && (
                <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                  <Phone className="w-3 h-3" />
                  <span>{order.customerPhone}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Live Elapsed Timer & 12h Time */}
        <div className="flex flex-col items-end gap-1">
          {["pending", "accepted", "preparing", "ready"].includes(order.status) && (
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${timerColor}`}>
              <Clock className="w-3 h-3" />
              <span>{elapsed}m ago</span>
            </div>
          )}
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
            {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
          </span>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-2 flex-1 pt-1.5">
        {order.items.map((item, idx) => {
          const lowerName = item.name.toLowerCase();
          const portionStr = item.portion ? item.portion.toLowerCase() : "";
          const isHalf = portionStr.includes("half") || lowerName.includes("(half)") || lowerName.includes("[half]");
          const isFull = portionStr.includes("full") || lowerName.includes("(full)") || lowerName.includes("[full]");
          const cleanName = item.name.replace(/\s*\((half|full)\)/gi, "").replace(/\s*\[(half|full)\]/gi, "").trim();

          return (
            <div key={idx} className="flex justify-between items-center text-xs">
              <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5 flex-wrap">
                <span>{cleanName}</span>
                {isHalf && (
                  <span className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[9px] font-black px-1.5 py-0.5 rounded">
                    HALF
                  </span>
                )}
                {isFull && (
                  <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[9px] font-black px-1.5 py-0.5 rounded">
                    FULL
                  </span>
                )}
                <strong className="text-brand-600 dark:text-brand-400">×{item.quantity}</strong>
              </span>
              <span className="text-slate-500 font-semibold">{currency}{(item.price * item.quantity).toFixed(0)}</span>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-100/60 dark:border-slate-800/40 pt-3 flex justify-between items-center text-xs">
        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Subtotal</span>
        <span className="font-black text-slate-800 dark:text-slate-100 text-sm">{currency}{order.grandTotal.toFixed(0)}</span>
      </div>

      {/* Action Buttons based on status */}
      <div className="flex gap-2 pt-2 flex-wrap">
        {order.status === "pending" && (
          <>
            <button
              onClick={async () => {
                // 1. Accept order
                await onUpdateStatus(order.id, "accepted");
                // 2. Transition to preparing for kitchen cooking
                await onUpdateStatus(order.id, "preparing");
              }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Accept & Send to Kitchen</span>
            </button>
            <button
              onClick={() => onUpdateStatus(order.id, "cancelled")}
              className="px-3 bg-red-50 hover:bg-red-100 text-red-655 dark:bg-red-950/20 dark:text-red-400 font-bold py-2 rounded-xl text-xs flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {order.status === "accepted" && (
          <button
            onClick={async () => {
              await onUpdateStatus(order.id, "preparing");
            }}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Send to Kitchen (KOT)</span>
          </button>
        )}

        {order.status === "preparing" && (
          <button
            onClick={() => onUpdateStatus(order.id, "ready")}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>{isTakeaway ? "Mark Packed & Ready" : "Mark Ready"}</span>
          </button>
        )}

        {order.status === "ready" && (
          <button
            onClick={() => onUpdateStatus(order.id, "served")}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>{isTakeaway ? "Handover / Completed" : "Mark Served"}</span>
          </button>
        )}

        {order.status === "served" && (
          <button
            onClick={() => {
              window.history.pushState(null, "", "/admin/billing");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Generate Bill</span>
          </button>
        )}

        {/* Print KOT, Edit & Cancel overrides for active orders */}
        {["pending", "accepted", "preparing", "ready", "served"].includes(order.status) && (
          <>
            <button
              onClick={() => printKOTReceipt(order, restaurantName || "Kitchen", "80mm", true)}
              className="p-2 border border-slate-205 dark:border-slate-800 text-amber-500 hover:text-amber-600 rounded-xl transition-all font-bold cursor-pointer"
              title="Re-print Kitchen Order Ticket (KOT)"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onOpenEdit(order)}
              className="p-2 border border-slate-205 dark:border-slate-800 text-slate-400 hover:text-slate-655 dark:hover:text-slate-300 rounded-xl transition-all cursor-pointer"
              title="Edit items"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onUpdateStatus(order.id, "cancelled")}
              className="p-2 border border-slate-205 dark:border-slate-800 text-red-400 hover:text-red-655 dark:hover:text-red-950 rounded-xl transition-all cursor-pointer"
              title="Cancel order"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

    </div>
  );
};

export default OrdersManager;
