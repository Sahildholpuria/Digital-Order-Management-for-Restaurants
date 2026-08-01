import React, { useEffect, useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { RestaurantOrder, OrderStatus } from '../../types';
import { Clock, CheckSquare, ChefHat, Play, Printer } from 'lucide-react';
import { printKOTReceipt } from '../../utils/printUtils';

export const KitchenDisplay: React.FC = () => {
  const { orders, updateOrderStatus, settings } = useRestaurant();
  
  // Crossed items track state locally for chef checkboxes
  const [crossedItems, setCrossedItems] = useState<{ [key: string]: boolean }>({});
  const [autoPrintKOT, setAutoPrintKOT] = useState<boolean>(true);

  const currency = settings?.currency || '₹';

  // Force re-renders for elapsed timers
  const [, setTimeTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTimeTick(t => t + 1), 10000); // 10s
    return () => clearInterval(timer);
  }, []);

  // Filter for active kitchen tickets
  const kitchenOrders = orders
    .filter(o => ['pending', 'accepted', 'preparing'].includes(o.status))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // oldest first

  // Auto-print KOT when new orders arrive in kitchen queue
  const prevOrdersCountRef = React.useRef(kitchenOrders.length);
  const isFirstRender = React.useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevOrdersCountRef.current = kitchenOrders.length;
      return;
    }

    if (autoPrintKOT && kitchenOrders.length > prevOrdersCountRef.current) {
      const latestNewOrder = kitchenOrders[kitchenOrders.length - 1];
      if (latestNewOrder) {
        printKOTReceipt(latestNewOrder, settings?.name || 'Kitchen');
      }
    }
    prevOrdersCountRef.current = kitchenOrders.length;
  }, [kitchenOrders.length, autoPrintKOT, settings?.name]);

  const toggleItemCross = (orderId: string, itemIdx: number) => {
    const key = `${orderId}-${itemIdx}`;
    setCrossedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleStartCooking = async (orderId: string) => {
    await updateOrderStatus(orderId, 'preparing');
  };

  const handleMarkReady = async (order: RestaurantOrder) => {
    // Clear item checkboxes for this order
    order.items.forEach((_, idx) => {
      delete crossedItems[`${order.id}-${idx}`];
    });
    setCrossedItems({ ...crossedItems });

    await updateOrderStatus(order.id, 'ready');
  };

  const getElapsedTime = (createdAt: string) => {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    return Math.floor(diffMs / 60000);
  };

  return (
    <div className="min-h-screen bg-slate-955 text-slate-100 p-6 flex flex-col gap-6 font-sans">
      
      {/* KDS Header with padding for Exit button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800/80 pb-4 pl-32 sm:pl-36 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-2xl shadow-sm">
            <ChefHat className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white font-sans">
              Kitchen Display Station
            </h1>
            <p className="text-xs font-bold text-slate-400">
              Active KOT Queue &bull; <span className="text-emerald-400 font-black">{kitchenOrders.length} Active Tickets</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-black text-slate-200 bg-slate-900 border border-slate-700 px-4 py-2.5 rounded-2xl shadow-sm hover:border-emerald-500 transition-colors">
            <input
              type="checkbox"
              checked={autoPrintKOT}
              onChange={(e) => setAutoPrintKOT(e.target.checked)}
              className="rounded text-emerald-500 focus:ring-emerald-500 w-4 h-4 bg-slate-800 border-slate-700 cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Auto-Print KOT</span>
            </span>
          </label>

          <div className="text-right hidden sm:block">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Station Name</p>
            <p className="text-xs font-black text-slate-200">{settings?.name || 'Main Kitchen'}</p>
          </div>
        </div>
      </div>

      {/* Tickets Grid */}
      {kitchenOrders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center text-slate-400 min-h-[60vh]">
          <ChefHat className="w-14 h-14 mb-4 text-emerald-500/50 animate-pulse" />
          <p className="font-black text-lg text-slate-200">No Active Kitchen Orders</p>
          <p className="text-xs mt-1 text-slate-400 font-bold uppercase tracking-wider">New customer KOT tickets will slide in automatically in real time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          {kitchenOrders.map(order => {
            const elapsed = getElapsedTime(order.createdAt);
            const isUrgent = elapsed >= 15;
            
            // Format Table Display Number nicely
            const tableNumStr = order.tableName.replace(/table\s*-\s*/gi, '').replace(/#?\d{13}/g, '1');
            const cleanTableDisplay = tableNumStr.toLowerCase().includes('table') ? tableNumStr : `Table ${tableNumStr}`;

            return (
              <div 
                key={order.id} 
                className={`bg-slate-900 border-2 rounded-3xl overflow-hidden flex flex-col justify-between shadow-xl min-h-[380px] transition-all duration-300 ${
                  isUrgent 
                    ? 'border-red-500/90 shadow-red-500/10 animate-pulse-slow' 
                    : order.status === 'preparing' 
                      ? 'border-emerald-500/70 shadow-emerald-500/10' 
                      : 'border-slate-700/80 hover:border-slate-600'
                }`}
              >
                
                {/* Ticket Top Bar */}
                <div className={`p-4 flex justify-between items-center ${
                  isUrgent 
                    ? 'bg-red-950/50 text-red-300 border-b border-red-900/40' 
                    : order.status === 'preparing'
                      ? 'bg-emerald-950/40 text-emerald-300 border-b border-emerald-800/40'
                      : 'bg-slate-800/90 text-slate-200 border-b border-slate-700/80'
                }`}>
                  <div>
                    <span className="font-black text-xs tracking-wider font-mono bg-slate-950/60 px-2 py-0.5 rounded-md text-slate-300">{order.orderNumber}</span>
                    <h3 className="text-lg font-black text-white mt-1 capitalize">{cleanTableDisplay}</h3>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-black bg-slate-950/60 px-2.5 py-1 rounded-xl border border-white/10">
                    <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`} />
                    <span>{elapsed}m</span>
                  </div>
                </div>

                {/* Items Checklist */}
                <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
                  {order.items.map((item, idx) => {
                    const isCrossed = !!crossedItems[`${order.id}-${idx}`];
                    return (
                      <div 
                        key={idx}
                        onClick={() => toggleItemCross(order.id, idx)}
                        className={`flex gap-3 items-center cursor-pointer transition-all p-3 rounded-2xl border ${
                          isCrossed 
                            ? 'bg-slate-950/40 border-slate-800/50 text-slate-500 line-through' 
                            : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 text-slate-100 shadow-sm'
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
                            <p className="font-extrabold text-sm text-slate-100 leading-snug">
                              {item.name}
                            </p>
                            {item.specialInstructions && (
                              <p className="text-[10px] text-amber-400 font-extrabold bg-amber-950/40 border border-amber-900/40 px-2 py-0.5 rounded-md mt-1 inline-block">
                                Note: {item.specialInstructions}
                              </p>
                            )}
                          </div>
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black px-2.5 py-1 rounded-xl flex-shrink-0">
                            x{item.quantity}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Ticket Actions */}
                <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex gap-2.5">
                  <button
                    onClick={() => printKOTReceipt(order, settings?.name || 'Kitchen')}
                    className="p-3 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-black rounded-2xl text-xs flex items-center justify-center transition-colors border border-slate-700 cursor-pointer shadow-sm"
                    title="Print Kitchen Order Ticket (KOT)"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  {order.status === 'pending' || order.status === 'accepted' ? (
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
                      className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-green-600/20 transition-all active:scale-[0.98] cursor-pointer tracking-wider uppercase"
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span>MARK READY FOR SERVING</span>
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
