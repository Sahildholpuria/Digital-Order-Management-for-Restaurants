import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRestaurant } from "../../context/RestaurantContext";
import { useTheme } from "../../context/ThemeContext";
import { RestaurantTable, TableStatus, RestaurantOrder } from "../../types";
import { CaptainOrderPunchModal } from "../../components/captain/CaptainOrderPunchModal";
import { AtTableSettlementModal } from "../../components/captain/AtTableSettlementModal";
import { RestaurantsOSLogo } from "../../components/RestaurantsOSLogo";
import { PWAInstallButton } from "../../components/common/PWAInstallButton";
import {
  Bell,
  Receipt,
  Users,
  Check,
  Clock,
  MessageSquare,
  Coffee,
  X,
  Volume2,
  VolumeX,
  Zap,
  Plus,
  Search,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  Sparkles,
  Layers,
  UtensilsCrossed,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  User,
  Phone,
  Tag
} from "lucide-react";

interface WaiterDashboardProps {
  isStandalone?: boolean;
}

export const WaiterDashboard: React.FC<WaiterDashboardProps> = ({ isStandalone = false }) => {
  const {
    tables,
    orders,
    notifications,
    markNotificationRead,
    updateTableStatus,
    settings,
    currentUser,
    logoutUser,
    showToast
  } = useRestaurant();

  const { theme, toggleTheme } = useTheme();

  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isPunchModalOpen, setIsPunchModalOpen] = useState<boolean>(false);
  const [punchInitialTableId, setPunchInitialTableId] = useState<string | undefined>(undefined);
  const [punchInitialOrderType, setPunchInitialOrderType] = useState<"dine_in" | "takeaway">("dine_in");
  const [filterStatus, setFilterStatus] = useState<"all" | "available" | "occupied" | "calling" | "takeaway">("all");
  const [selectedFloorFilter, setSelectedFloorFilter] = useState<string>("all");
  const [searchTableQuery, setSearchTableQuery] = useState<string>("");
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState<boolean>(false);
  const [settlementTable, setSettlementTable] = useState<RestaurantTable | null>(null);
  const [settlementTakeaway, setSettlementTakeaway] = useState<RestaurantOrder | null>(null);

  const handleOpenSettlement = (table?: RestaurantTable | null, takeaway?: RestaurantOrder | null, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSettlementTable(table || null);
    setSettlementTakeaway(takeaway || null);
    setIsSettlementModalOpen(true);
    if (selectedTable) setSelectedTable(null);
  };

  // Unique floors across all tables
  const availableFloors = useMemo(() => {
    const list = tables.map(t => t.floor?.trim()).filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [tables]);

  const currency = settings?.currency || "₹";

  // Active notifications for waiters (call_waiter or request_bill that are unread)
  const activeAlerts = useMemo(() => {
    return notifications.filter(
      n => !n.isRead && ["call_waiter", "request_bill"].includes(n.type)
    );
  }, [notifications]);

  // Set of table IDs that have pending service calls / bill requests
  const callingTableIds = useMemo(() => {
    const ids = new Set<string>();
    activeAlerts.forEach(a => {
      if (a.tableId) ids.add(a.tableId);
      // Also match by table number if present
      const match = a.message.match(/Table\s+([A-Za-z0-9_-]+)/i);
      if (match && match[1]) {
        const found = tables.find(t => String(t.number) === match[1] || t.id === match[1]);
        if (found) ids.add(found.id);
      }
    });
    return ids;
  }, [activeAlerts, tables]);

  // Active Takeaway Orders
  const activeTakeawayOrders = useMemo(() => {
    return orders.filter(
      o => (o.orderType === "takeaway" || !!o.tokenNumber) && !["completed", "cancelled"].includes(o.status)
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders]);

  const prevAlertsCountRef = useRef<number>(activeAlerts.length);
  const isInitialMount = useRef<boolean>(true);

  // Play crisp two-tone service bell chime whenever a new call waiter / bill request alert arrives
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevAlertsCountRef.current = activeAlerts.length;
      return;
    }

    if (activeAlerts.length > prevAlertsCountRef.current && soundEnabled) {
      playChime();
    }
    prevAlertsCountRef.current = activeAlerts.length;
  }, [activeAlerts.length, soundEnabled]);

  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1318.51, ctx.currentTime);
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
    } catch (_) {}
  };

  // Filtered tables based on tab & search query
  const filteredTables = useMemo(() => {
    return tables.filter(t => {
      const isCalling = callingTableIds.has(t.id);

      // Floor filter
      if (selectedFloorFilter !== "all") {
        if (selectedFloorFilter === "unassigned" && t.floor?.trim()) return false;
        if (selectedFloorFilter !== "unassigned" && t.floor?.trim() !== selectedFloorFilter) return false;
      }

      if (filterStatus === "available" && t.status !== "available") return false;
      if (filterStatus === "occupied" && t.status !== "occupied") return false;
      if (filterStatus === "calling" && !isCalling) return false;

      if (searchTableQuery.trim()) {
        const q = searchTableQuery.toLowerCase().trim();
        const numMatch = String(t.number).toLowerCase().includes(q);
        const capMatch = String(t.capacity).includes(q);
        const floorMatch = (t.floor || "").toLowerCase().includes(q);
        if (!numMatch && !capMatch && !floorMatch) return false;
      }
      return true;
    });
  }, [tables, selectedFloorFilter, filterStatus, callingTableIds, searchTableQuery]);

  const availableCount = useMemo(() => tables.filter(t => t.status === "available").length, [tables]);
  const occupiedCount = useMemo(() => tables.filter(t => t.status === "occupied").length, [tables]);

  // Find active orders for selected table
  const selectedTableOrders = useMemo(() => {
    if (!selectedTable) return [];
    return orders.filter(
      o =>
        (o.tableId === selectedTable.id ||
          o.tableId === `table-${selectedTable.number}` ||
          o.tableName === `Table ${selectedTable.number}` ||
          o.tableName === selectedTable.number) &&
        !["completed", "cancelled"].includes(o.status)
    );
  }, [selectedTable, orders]);

  const handleResolveAlert = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await markNotificationRead(id);
    showToast("Service request marked as attended", "success");
  };

  const handleOpenPunchForTable = (tableId?: string, orderType: "dine_in" | "takeaway" = "dine_in", e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPunchInitialTableId(tableId);
    setPunchInitialOrderType(orderType);
    setIsPunchModalOpen(true);
    if (selectedTable) setSelectedTable(null);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors pb-24">
      
      {/* TOP RESPONSIVE HEADER BAR */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-6 py-2.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          
          {/* Brand & Console Title */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2">
              <RestaurantsOSLogo className="h-6 w-auto" />
              <div className="hidden sm:block text-left leading-tight">
                <span className="block font-black text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                  {settings?.name || "RestaurantsOS"}
                </span>
                <span className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  Floor Captain & Takeaway POS
                </span>
              </div>
            </div>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            {/* Captain Role Badge */}
            <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 px-2.5 py-1 rounded-full text-[11px] font-extrabold">
              <Bell className="w-3 h-3 text-amber-500 fill-current animate-wiggle" />
              <span>{currentUser?.name || "Captain Floor"}</span>
            </div>
          </div>

          {/* Actions & Utilities */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Sound Chime Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) playChime();
                showToast(next ? "Service Bell Chimes ON" : "Service Bell Muted", "info");
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                soundEnabled
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
              }`}
              title={soundEnabled ? "Sound Chimes Active (Click to mute)" : "Sound Muted (Click to enable)"}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  <span className="hidden md:inline text-[11px]">Chimes ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span className="hidden md:inline text-[11px]">Muted</span>
                </>
              )}
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              title="Toggle Theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* PWA Button */}
            <div className="hidden sm:block">
              <PWAInstallButton />
            </div>

            {/* Logout / Exit */}
            <button
              type="button"
              onClick={async () => {
                await logoutUser();
                window.location.href = "/";
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>

        </div>
      </header>

      {/* MAIN CONTENT WRAPPER */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 pt-4 sm:pt-6 space-y-4 sm:space-y-6 flex-1">

        {/* COMPACT FLOOR STATUS STRIP */}
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 rounded-2xl px-4 py-2.5 sm:py-3 text-white shadow-md shadow-emerald-950/10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 z-10">
            <span className="bg-emerald-400/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Real-Time Captain Floor</span>
            </span>
            <span className="text-xs text-emerald-100 font-medium">
              Floor: <strong className="text-white font-black">{occupiedCount} / {tables.length}</strong> Tables Busy &bull; <strong className="text-white font-black">{activeTakeawayOrders.length}</strong> Parcels Active
            </span>
          </div>

          {/* Decorative subtle pattern */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none" />
        </div>

        {/* ACTIVE CALL BELL & BILL REQUEST ALERTS BANNER */}
        {activeAlerts.length > 0 && (
          <div className="space-y-2.5 animate-slide-down">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 fill-current animate-bounce" />
                <span>Urgent Guest Requests ({activeAlerts.length})</span>
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Tap to attend or take order
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {activeAlerts.map(alert => {
                const isBill = alert.type === "request_bill";
                return (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 shadow-md ${
                      isBill
                        ? "bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200"
                        : "bg-rose-500/10 border-rose-500/40 text-rose-900 dark:text-rose-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                          isBill ? "bg-amber-500 text-white" : "bg-rose-500 text-white animate-pulse"
                        }`}
                      >
                        {isBill ? <Receipt className="w-4 h-4" /> : <Bell className="w-4 h-4 fill-current" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-xs truncate">
                          {alert.message || "Guest Calling"}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>Just now</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleResolveAlert(alert.id, e)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer shadow-2xs"
                        title="Mark Attended"
                      >
                        ✓ Done
                      </button>
                      {isBill ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            handleResolveAlert(alert.id, e);
                            const t = tables.find(tbl => tbl.id === alert.tableId || String(tbl.number) === alert.tableId || alert.message.includes(`Table ${tbl.number}`));
                            handleOpenSettlement(t || null, null, e);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs flex items-center gap-1"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>Settle</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            handleResolveAlert(alert.id, e);
                            handleOpenPunchForTable(alert.tableId, "dine_in");
                          }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs flex items-center gap-0.5"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Order</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CONTROLS & FILTER BAR */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 rounded-2xl shadow-xs space-y-3">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                  filterStatus === "all"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                All Tables ({tables.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus("available")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                  filterStatus === "available"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Available ({availableCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus("occupied")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                  filterStatus === "occupied"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Occupied ({occupiedCount})</span>
              </button>

              {/* Takeaway Filter Pill */}
              <button
                type="button"
                onClick={() => setFilterStatus("takeaway")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  filterStatus === "takeaway"
                    ? "bg-orange-600 text-white shadow-sm"
                    : "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 hover:bg-orange-100"
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Takeaways ({activeTakeawayOrders.length})</span>
              </button>

              {callingTableIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterStatus("calling")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 shrink-0 cursor-pointer animate-pulse ${
                    filterStatus === "calling"
                      ? "bg-rose-600 text-white shadow-sm"
                      : "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100"
                  }`}
                >
                  <Bell className="w-3 h-3 fill-current text-rose-500" />
                  <span>Calling ({callingTableIds.size})</span>
                </button>
              )}
            </div>

            {/* Quick Table Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search table # or takeaway token..."
                value={searchTableQuery}
                onChange={(e) => setSearchTableQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-7 py-1.5 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {searchTableQuery && (
                <button
                  type="button"
                  onClick={() => setSearchTableQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          </div>

          {/* Horizontal Floor Filter Carousel */}
          {availableFloors.length > 0 && filterStatus !== "takeaway" && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1 pr-1 shrink-0">
                <Layers className="w-3.5 h-3.5 text-emerald-500" />
                <span>Zone:</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedFloorFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all shrink-0 cursor-pointer ${
                  selectedFloorFilter === "all"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                All Zones ({tables.length})
              </button>
              {availableFloors.map(fl => {
                const count = tables.filter(t => t.floor?.trim() === fl).length;
                return (
                  <button
                    key={fl}
                    type="button"
                    onClick={() => setSelectedFloorFilter(fl)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                      selectedFloorFilter === fl
                        ? "bg-emerald-600 text-white shadow-2xs font-black"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    📍 {fl} ({count})
                  </button>
                );
              })}
            </div>
          )}

        </div>

        {/* TAKEAWAY ORDERS GRID (WHEN TAKEAWAY TAB SELECTED) */}
        {filterStatus === "takeaway" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-orange-500" />
                <span>Active Takeaway & Parcel Orders ({activeTakeawayOrders.length})</span>
              </h2>
              <button
                type="button"
                onClick={() => handleOpenPunchForTable(undefined, "takeaway")}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-orange-600 hover:bg-orange-500 text-white flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Takeaway</span>
              </button>
            </div>

            {activeTakeawayOrders.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-3">
                <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                  No Active Takeaway Orders
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Punch a new parcel order for a takeaway customer with auto-token generation.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenPunchForTable(undefined, "takeaway")}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-orange-600 hover:bg-orange-500 text-white cursor-pointer shadow-md"
                >
                  + Punch First Takeaway Order
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {activeTakeawayOrders.map(order => {
                  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
                  return (
                    <div
                      key={order.id}
                      className="bg-white dark:bg-slate-900 border-2 border-orange-500/40 hover:border-orange-500 p-4 rounded-3xl transition-all shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        {/* Header: Token & Status */}
                        <div className="flex items-start justify-between gap-1 mb-2">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 block">
                              🛍️ Takeaway Token
                            </span>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">
                              {order.tokenNumber ? `#${order.tokenNumber}` : order.orderNumber}
                            </h3>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                            ["ready", "served"].includes(order.status)
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                          }`}>
                            {order.status === "ready" ? "PACKED / READY" : order.status}
                          </span>
                        </div>

                        {/* Customer Details */}
                        {(order.customerName || order.customerPhone) && (
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 py-1.5 border-t border-slate-100 dark:border-slate-800 space-y-0.5">
                            {order.customerName && (
                              <p className="flex items-center gap-1 truncate">
                                <User className="w-3 h-3 text-slate-400" />
                                <span>{order.customerName}</span>
                              </p>
                            )}
                            {order.customerPhone && (
                              <p className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                                <Phone className="w-3 h-3" />
                                <span>{order.customerPhone}</span>
                              </p>
                            )}
                          </div>
                        )}

                        {/* Items preview */}
                        <div className="py-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            {itemCount} Items:
                          </p>
                          {order.items.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex justify-between text-[11px]">
                              <span className="truncate pr-1">{item.name} x{item.quantity}</span>
                              <span className="font-bold shrink-0">{currency}{(item.price * item.quantity).toFixed(0)}</span>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <p className="text-[10px] text-orange-500 font-bold">+{order.items.length - 3} more items...</p>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Amount & Punch More */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Total</span>
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                            {currency}{order.grandTotal.toFixed(0)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenPunchForTable(undefined, "takeaway")}
                            className="px-2 py-1.5 rounded-xl text-[10px] font-black bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-xs"
                            title="Punch more items"
                          >
                            + Items
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenSettlement(null, order)}
                            className="px-2.5 py-1.5 rounded-xl text-[10px] font-black bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-xs flex items-center gap-1"
                            title="Settle bill"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>Settle</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* DINING TABLES RESPONSIVE GRID */
          filteredTables.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-3">
              <UtensilsCrossed className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                No Dining Tables Found
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No tables match your active status or search filters. Try clearing the filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilterStatus("all");
                  setSearchTableQuery("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {filteredTables.map(table => {
                const isOccupied = table.status === "occupied";
                const isCalling = callingTableIds.has(table.id);

                const activeOrders = orders.filter(
                  o =>
                    (o.tableId === table.id ||
                      o.tableId === `table-${table.number}` ||
                      o.tableName === `Table ${table.number}` ||
                      o.tableName === table.number) &&
                    !["completed", "cancelled"].includes(o.status)
                );

                const totalAmount = activeOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
                const itemCount = activeOrders.reduce((sum, o) => sum + (o.items?.length || 0), 0);

                return (
                  <div
                    key={table.id}
                    onClick={() => {
                      if (isOccupied) {
                        setSelectedTable(table);
                      } else {
                        handleOpenPunchForTable(table.id, "dine_in");
                      }
                    }}
                    className={`group relative p-4 rounded-3xl border-2 transition-all flex flex-col justify-between cursor-pointer hover:shadow-lg active:scale-98 ${
                      isCalling
                        ? "bg-rose-500/10 border-rose-500 dark:bg-rose-950/30 shadow-rose-500/20 shadow-md animate-pulse-gentle"
                        : isOccupied
                        ? "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/40 hover:border-amber-500"
                        : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-emerald-500"
                    }`}
                  >
                    {/* Card Header: Table Number & Status Pill */}
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                            Table
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
                              {table.number}
                            </h3>
                            {table.floor && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 truncate">
                                {table.floor}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status Pill */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                            isCalling
                              ? "bg-rose-500 text-white border-rose-500 animate-bounce"
                              : isOccupied
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                          }`}
                        >
                          {isCalling ? "CALLING 🔔" : isOccupied ? "OCCUPIED" : "AVAILABLE"}
                        </span>
                      </div>

                      {/* Capacity & Live Orders info */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium pt-1 border-t border-slate-100 dark:border-slate-800/80">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>{table.capacity} Seats</span>
                        </span>

                        {isOccupied && (
                          <span className="font-extrabold text-amber-600 dark:text-amber-400 text-[10px]">
                            {activeOrders.length} KOT ({itemCount})
                          </span>
                        )}
                      </div>

                      {/* Running Amount if Occupied */}
                      {isOccupied && totalAmount > 0 && (
                        <div className="mt-2 pt-1.5 border-t border-dashed border-amber-500/25 flex justify-between items-center text-xs font-black text-amber-700 dark:text-amber-400">
                          <span>Running:</span>
                          <span>{currency}{totalAmount.toFixed(0)}</span>
                        </div>
                      )}
                    </div>

                    {/* Primary Touch Button */}
                    <div className="mt-3 pt-2">
                      <button
                        type="button"
                        onClick={(e) => handleOpenPunchForTable(table.id, "dine_in", e)}
                        className={`w-full py-2.5 px-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer ${
                          isOccupied
                            ? "bg-slate-900 hover:bg-amber-600 dark:bg-slate-800 dark:hover:bg-amber-600 text-white"
                            : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/20"
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isOccupied ? "Add Dishes" : "Take Order"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

      </main>

      {/* MOBILE FLOATING ACTION BUTTONS (FAB) */}
      <div className="fixed bottom-4 right-4 z-40 sm:hidden flex flex-col gap-2 items-end">
        <button
          type="button"
          onClick={() => handleOpenPunchForTable(undefined, "takeaway")}
          className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-600 active:scale-95 text-white px-4 py-2.5 rounded-full font-black text-xs tracking-wider shadow-xl shadow-orange-600/40 border border-white/20 cursor-pointer"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>+ TAKEAWAY</span>
        </button>

        <button
          type="button"
          onClick={() => handleOpenPunchForTable(undefined, "dine_in")}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 active:scale-95 text-white px-5 py-3.5 rounded-full font-black text-xs tracking-wider shadow-2xl shadow-emerald-600/50 border border-white/20 cursor-pointer"
        >
          <Zap className="w-4 h-4 fill-current text-amber-300 animate-pulse" />
          <span>+ TAKE ORDER</span>
        </button>
      </div>

      {/* TABLE DETAILS BOTTOM SHEET / DRAWER FOR OCCUPIED TABLES */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-slide-up flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-base">
                  {selectedTable.number}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    Table {selectedTable.number} Overview
                  </h3>
                  <p className="text-xs text-slate-400">
                    Capacity: {selectedTable.capacity} guests • {selectedTableOrders.length} active KOT tickets
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTable(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              
              {/* Quick Table Status Switcher */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Update Table Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["available", "occupied", "reserved"] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        updateTableStatus(selectedTable.id, st);
                        setSelectedTable(prev => (prev ? { ...prev, status: st } : null));
                      }}
                      className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                        selectedTable.status === st
                          ? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                          : "bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Cooking Tickets List */}
              <div className="space-y-2.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Running Kitchen Order Tickets (KOT)
                </label>

                {selectedTableOrders.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    No active dishes currently preparing for this table.
                  </div>
                ) : (
                  selectedTableOrders.map(order => (
                    <div
                      key={order.id}
                      className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          #{order.orderNumber}
                        </span>
                        <span
                          className={`font-black px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                            ["ready", "served"].includes(order.status)
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>

                      <div className="space-y-1 divide-y divide-slate-100 dark:divide-slate-700/50">
                        {order.items.map((i, idx) => (
                          <div key={idx} className="pt-1 flex justify-between text-xs text-slate-700 dark:text-slate-300">
                            <span>{i.name} <strong className="text-slate-900 dark:text-white">x{i.quantity}</strong></span>
                            <span className="font-bold">{currency}{(i.price * i.quantity).toFixed(0)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-center text-xs font-black text-slate-900 dark:text-white">
                        <span>Ticket Amount:</span>
                        <span className="text-emerald-600 dark:text-emerald-400">{currency}{order.grandTotal.toFixed(0)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => handleOpenPunchForTable(selectedTable.id, "dine_in")}
                className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-black py-3 rounded-2xl transition-all shadow-sm text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Punch Dishes</span>
              </button>

              {selectedTableOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleOpenSettlement(selectedTable, null)}
                  className="flex-1 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-3 rounded-2xl transition-all shadow-md text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Settle & Free Table</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* CAPTAIN ORDER PUNCHING MODAL */}
      <CaptainOrderPunchModal
        isOpen={isPunchModalOpen}
        onClose={() => setIsPunchModalOpen(false)}
        initialTableId={punchInitialTableId}
        initialOrderType={punchInitialOrderType}
      />

      {/* AT-TABLE BILL SETTLEMENT MODAL */}
      <AtTableSettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => {
          setIsSettlementModalOpen(false);
          setSettlementTable(null);
          setSettlementTakeaway(null);
        }}
        table={settlementTable}
        takeawayOrder={settlementTakeaway}
      />

    </div>
  );
};

export default WaiterDashboard;
