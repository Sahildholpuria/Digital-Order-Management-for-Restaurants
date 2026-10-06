import React, { useEffect, useState, useRef } from "react";
import { useRestaurant } from "../../context/RestaurantContext";
import { RestaurantOrder } from "../../types";
import { Clock, CheckSquare, ChefHat, Play, Printer, Volume2, VolumeX, RotateCcw, Filter, AlertTriangle, ShoppingBag, User, Phone } from "lucide-react";
import { printKOTReceipt } from "../../utils/printUtils";

export const KitchenDisplay: React.FC = () => {
  const { orders, updateOrderStatus, settings, qzStatus, qzConfig, connectQZTray } = useRestaurant();
  
  // Local states
  const [crossedItems, setCrossedItems] = useState<{ [key: string]: boolean }>({});
  const [autoPrintKOT, setAutoPrintKOT] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [filterStage, setFilterStage] = useState<"all" | "pending" | "preparing" | "takeaway" | "ready">("all");

  // Force re-renders for live elapsed timers (every 10s)
  const [, setTimeTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTimeTick(t => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  // Filter for active kitchen tickets (Customer Pending orders stay in Manager queue until accepted)
  const activeOrders = orders
    .filter(o => ["accepted", "preparing"].includes(o.status))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Recent recallable ready orders (last 8 completed in past 30 mins)
  const recentReadyOrders = orders
    .filter(o => o.status === "ready" || o.status === "served")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  const takeawayActiveCount = activeOrders.filter(o => o.orderType === "takeaway" || !!o.tokenNumber).length;

  const filteredDisplayOrders = filterStage === "ready" 
    ? recentReadyOrders 
    : filterStage === "takeaway"
      ? activeOrders.filter(o => o.orderType === "takeaway" || !!o.tokenNumber)
      : filterStage === "pending"
        ? activeOrders.filter(o => o.status === "pending" || o.status === "accepted")
        : filterStage === "preparing"
          ? activeOrders.filter(o => o.status === "preparing")
          : activeOrders;

  // Auto-print & Sound Chime when new KOT arrives
  const prevOrdersCountRef = useRef(activeOrders.length);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevOrdersCountRef.current = activeOrders.length;
      return;
    }

    if (activeOrders.length > prevOrdersCountRef.current) {
      const latestOrder = activeOrders[activeOrders.length - 1];
      if (latestOrder) {
        if (soundEnabled) {
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
          } catch (_) {}
        }
        if (autoPrintKOT && latestOrder.status !== "pending") {
          try {
            printKOTReceipt(latestOrder, settings?.name || "Kitchen", "80mm", false);
          } catch (_) {}
        }
      }
    }
    prevOrdersCountRef.current = activeOrders.length;
  }, [activeOrders.length, soundEnabled]);

  const toggleItemCross = (orderId: string, itemIdx: number) => {
    const key = `${orderId}-${itemIdx}`;
    setCrossedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleStartCooking = async (orderId: string) => {
    await updateOrderStatus(orderId, "preparing");
  };

  const handleMarkReady = async (order: RestaurantOrder) => {
    // Clear item checkboxes for this order
    order.items.forEach((_, idx) => {
      delete crossedItems[`${order.id}-${idx}`];
    });
    setCrossedItems({ ...crossedItems });
    await updateOrderStatus(order.id, "ready");
  };

  const handleRecallOrder = async (orderId: string) => {
    await updateOrderStatus(orderId, "preparing");
  };

  const getElapsedTime = (createdAt: string) => {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    return Math.floor(diffMs / 60000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 flex flex-col gap-6 font-sans select-none">
      
      {/* KDS Industrial Top Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-slate-800 pb-4 pt-10 sm:pt-0 sm:pl-32 lg:pl-36 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-2xl shadow-sm">
            <ChefHat className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Kitchen Display Station (KDS)</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 font-extrabold px-2.5 py-0.5 rounded-full border border-slate-700">LIVE</span>
            </h1>
            <p className="text-xs font-bold text-slate-400 mt-0.5">
              Industrial Station &bull; <span className="text-emerald-400 font-black">{activeOrders.length} Active KOT Tickets</span>
              {takeawayActiveCount > 0 && (
                <span className="text-amber-400 font-black ml-2">({takeawayActiveCount} Takeaway Parcels)</span>
              )}
            </p>
          </div>
        </div>

        {/* Control Toggles & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Stage Filter Buttons */}
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl flex-wrap">
            <button
              onClick={() => setFilterStage("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                filterStage === "all" ? "bg-emerald-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              ALL ({activeOrders.length})
            </button>
            <button
              onClick={() => setFilterStage("pending")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                filterStage === "pending" ? "bg-amber-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              PENDING ({activeOrders.filter(o => o.status === "pending" || o.status === "accepted").length})
            </button>
            <button
              onClick={() => setFilterStage("preparing")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                filterStage === "preparing" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              COOKING ({activeOrders.filter(o => o.status === "preparing").length})
            </button>
            <button
              onClick={() => setFilterStage("takeaway")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
                filterStage === "takeaway" ? "bg-orange-600 text-white shadow-md" : "text-orange-400/80 hover:text-orange-300"
              }`}
            >
              <ShoppingBag className="w-3 h-3" />
              <span>PARCEL ({takeawayActiveCount})</span>
            </button>
            <button
              onClick={() => setFilterStage("ready")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                filterStage === "ready" ? "bg-purple-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              RECALL ({recentReadyOrders.length})
            </button>
          </div>

          {/* Sound Alert Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
              soundEnabled ? "bg-slate-900 border-slate-700 text-emerald-400" : "bg-slate-900 border-slate-800 text-slate-500"
            }`}
            title="Toggle KOT New Order Sound Alert"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? "Chime ON" : "Mute"}</span>
          </button>

          {/* Auto-Print KOT Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-black text-slate-200 bg-slate-900 border border-slate-700 px-3.5 py-2 rounded-2xl shadow-sm hover:border-emerald-500 transition-colors">
            <input
              type="checkbox"
              checked={autoPrintKOT}
              onChange={(e) => setAutoPrintKOT(e.target.checked)}
              className="rounded text-emerald-500 focus:ring-emerald-500 w-4 h-4 bg-slate-800 border-slate-700 cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Auto-Print</span>
            </span>
          </label>
        </div>
      </div>

      {/* Tickets Display Grid */}
      {filteredDisplayOrders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center text-slate-400 min-h-[60vh]">
          <ChefHat className="w-16 h-16 mb-4 text-emerald-500/40 animate-pulse" />
          <p className="font-black text-xl text-slate-200">No Orders in this Queue</p>
          <p className="text-xs mt-1 text-slate-400 font-extrabold uppercase tracking-wider">New customer KOT tickets will slide in automatically in real time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          {filteredDisplayOrders.map(order => {
            const elapsed = getElapsedTime(order.createdAt);
            const isTakeaway = order.orderType === "takeaway" || !!order.tokenNumber;
            
            // Standard Industrial Time-based Urgency Colors
            const isUrgent = elapsed >= 15;
            const isWarning = elapsed >= 8 && elapsed < 15;

            // Format Table Display Number nicely
            const tableNumStr = order.tableName.replace(/table\s*-\s*/gi, "").replace(/#?\d{13}/g, "1");
            const cleanTableDisplay = isTakeaway
              ? (order.tokenNumber ? `Token #${order.tokenNumber}` : order.tableName)
              : (tableNumStr.toLowerCase().includes("table") ? tableNumStr : `Table ${tableNumStr}`);

            return (
              <div 
                key={order.id} 
                className={`bg-slate-900 border-2 rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl min-h-[400px] transition-all duration-300 ${
                  filterStage === "ready" || order.status === "ready" || order.status === "served"
                    ? "border-purple-600/70 shadow-purple-900/10"
                    : isTakeaway
                      ? "border-orange-500/80 shadow-orange-900/30"
                      : isUrgent 
                        ? "border-red-500 shadow-red-900/30 animate-pulse-slow" 
                        : isWarning
                          ? "border-amber-500/80 shadow-amber-900/20"
                          : "border-emerald-600/70 shadow-emerald-900/20"
                }`}
              >
                
                {/* Takeaway High-Visibility Banner */}
                {isTakeaway && (
                  <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-1.5 flex items-center justify-between text-white text-[11px] font-black uppercase tracking-wider shadow-inner">
                    <div className="flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>🛍️ TAKEAWAY / PARCEL BOX</span>
                    </div>
                    {order.tokenNumber && (
                      <span className="bg-black/40 px-2 py-0.5 rounded text-white font-mono text-xs font-black">
                        #{order.tokenNumber}
                      </span>
                    )}
                  </div>
                )}

                {/* Industrial Ticket Header */}
                <div className={`p-4 flex justify-between items-center ${
                  filterStage === "ready" || order.status === "ready" || order.status === "served"
                    ? "bg-purple-950/50 text-purple-200 border-b border-purple-800/40"
                    : isTakeaway
                      ? "bg-orange-950/50 text-orange-200 border-b border-orange-800/40"
                      : isUrgent 
                        ? "bg-red-950/60 text-red-200 border-b border-red-800/50" 
                        : isWarning
                          ? "bg-amber-950/50 text-amber-200 border-b border-amber-800/40"
                          : "bg-emerald-950/50 text-emerald-200 border-b border-emerald-800/40"
                }`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs tracking-wider font-mono bg-slate-950/70 px-2 py-0.5 rounded-md text-slate-200 border border-white/10">
                        {order.orderNumber}
                      </span>
                      {isUrgent && (
                        <span className="bg-red-600 text-white font-black text-[9px] px-2 py-0.5 rounded-md uppercase animate-bounce flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          URGENT
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <h3 className="text-xl font-black text-white capitalize font-sans tracking-tight">
                        {cleanTableDisplay}
                      </h3>
                      {order.tableFloor && !isTakeaway && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          📍 {order.tableFloor}
                        </span>
                      )}
                    </div>
                    {(order.customerName || order.customerPhone) && (
                      <p className="text-[11px] text-amber-300 font-bold flex items-center gap-1.5 mt-0.5">
                        <User className="w-3 h-3 text-amber-400" />
                        <span>{order.customerName || "Customer"}</span>
                        {order.customerPhone && <span className="text-slate-400">({order.customerPhone})</span>}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <div className={`flex items-center justify-end gap-1.5 text-xs font-black px-2.5 py-1 rounded-xl border ${
                      isUrgent ? "bg-red-600 text-white border-red-400" : isWarning ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    }`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{elapsed}m ({new Date(order.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })})</span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1">
                      {order.status === "pending" || order.status === "accepted" ? "NEW" : order.status}
                    </p>
                  </div>
                </div>

                {/* Plating Items Checklist */}
                <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
                  {order.items.map((item, idx) => {
                    const isCrossed = !!crossedItems[`${order.id}-${idx}`];
                    
                    let cleanDescNote = item.specialInstructions || "";
                    
                    // Detect Portion
                    const lowerName = item.name.toLowerCase();
                    const portionStr = item.portion ? item.portion.toLowerCase() : "";
                    const isHalf = portionStr.includes("half") || lowerName.includes("(half)") || lowerName.includes("[half]");
                    const isFull = portionStr.includes("full") || lowerName.includes("(full)") || lowerName.includes("[full]");
                    
                    // Clean dish title
                    const cleanItemName = item.name
                      .replace(/\s*\((half|full)\)/gi, "")
                      .replace(/\s*\[(half|full)\]/gi, "")
                      .trim();

                    return (
                      <div 
                        key={idx}
                        onClick={() => toggleItemCross(order.id, idx)}
                        className={`flex gap-3 items-center cursor-pointer transition-all p-3 rounded-2xl border ${
                          isCrossed 
                            ? "bg-slate-950/60 border-slate-800/50 text-slate-500 line-through opacity-60" 
                            : "bg-slate-800/90 border-slate-700 hover:bg-slate-800 text-slate-100 shadow-sm"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isCrossed}
                          readOnly
                          className="rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700 w-4 h-4 cursor-pointer"
                        />
                        <div className="flex-1 flex justify-between items-center gap-2">
                          <div>
                            <p className="font-black text-sm text-slate-100 leading-snug flex items-center gap-2 flex-wrap">
                              <span>{cleanItemName}</span>
                              
                              {/* Prominent Portion Badges */}
                              {isHalf && (
                                <span className="bg-amber-500/25 text-amber-300 border-2 border-amber-500/60 text-[11px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-xs tracking-wider animate-pulse">
                                  ⚡ HALF
                                </span>
                              )}
                              {isFull && (
                                <span className="bg-emerald-500/25 text-emerald-300 border-2 border-emerald-500/60 text-[11px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-xs tracking-wider">
                                  👑 FULL
                                </span>
                              )}
                              {!isHalf && !isFull && item.portion && (
                                <span className="bg-slate-700 text-slate-200 text-[10px] font-black px-2 py-0.5 rounded-md border border-slate-600 uppercase">
                                  {item.portion}
                                </span>
                              )}
                            </p>
                            {cleanDescNote && (
                              <p className="text-[10px] text-amber-300 font-bold bg-amber-950/70 border border-amber-800/70 px-2 py-0.5 rounded-md mt-1 inline-block">
                                Note: {cleanDescNote}
                              </p>
                            )}
                          </div>
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-sm font-black px-3 py-1 rounded-xl flex-shrink-0">
                            x{item.quantity}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Primary Action Buttons */}
                <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2.5">
                  <button
                    onClick={() => printKOTReceipt(order, settings?.name || "Kitchen")}
                    className="p-3 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-black rounded-2xl text-xs flex items-center justify-center transition-colors border border-slate-700 cursor-pointer shadow-sm"
                    title="Print Kitchen Order Ticket (KOT)"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  {filterStage === "ready" || order.status === "ready" || order.status === "served" ? (
                    <button
                      onClick={() => handleRecallOrder(order.id)}
                      className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-black py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/20 transition-all active:scale-[0.98] cursor-pointer tracking-wider uppercase"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>RECALL TO KITCHEN</span>
                    </button>
                  ) : order.status === "pending" || order.status === "accepted" ? (
                    <button
                      onClick={() => handleStartCooking(order.id)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] cursor-pointer tracking-wider uppercase"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>START COOKING</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleMarkReady(order)}
                      className={`flex-1 text-white font-black py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all active:scale-[0.98] cursor-pointer tracking-wider uppercase ${
                        isTakeaway
                          ? "bg-orange-600 hover:bg-orange-500 shadow-orange-600/20"
                          : "bg-green-600 hover:bg-green-500 shadow-green-600/20"
                      }`}
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span>{isTakeaway ? "MARK PACKED / READY" : "MARK READY FOR SERVING"}</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default KitchenDisplay;
