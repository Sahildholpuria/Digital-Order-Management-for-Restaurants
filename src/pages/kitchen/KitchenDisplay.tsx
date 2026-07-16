import React, { useEffect, useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { RestaurantOrder, OrderStatus } from '../../types';
import { Clock, CheckSquare, ChefHat, Play } from 'lucide-react';

export const KitchenDisplay: React.FC = () => {
  const { orders, updateOrderStatus, settings } = useRestaurant();
  
  // Crossed items track state locally for chef checkboxes
  const [crossedItems, setCrossedItems] = useState<{ [key: string]: boolean }>({});

  const currency = settings?.currency || '₹';

  // Force re-renders for elapsed timers
  const [, setTimeTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTimeTick(t => t + 1), 10000); // 10s
    return () => clearInterval(timer);
  }, []);

  // Filter for active kitchen tickets
  const kitchenOrders = orders
    .filter(o => ['accepted', 'preparing'].includes(o.status))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // oldest first

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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col gap-6">
      
      {/* KDS Header */}
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl">
            <ChefHat className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight font-sans text-slate-100">
              Kitchen Display Screen (KDS)
            </h1>
            <p className="text-xs text-slate-400">
              Cooking queues & bullpens &bull; <span className="text-amber-450 font-extrabold">{kitchenOrders.length} active tickets</span>
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kitchen Station</p>
          <p className="text-sm font-bold text-slate-300">{settings?.name || 'Main Kitchen'}</p>
        </div>
      </div>

      {/* Tickets Grid */}
      {kitchenOrders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center text-slate-500">
          <ChefHat className="w-12 h-12 mb-3 text-slate-600 animate-pulse" />
          <p className="font-bold">No active cooking orders.</p>
          <p className="text-xs mt-1 text-slate-500 font-semibold uppercase tracking-wider">New tickets will slide in automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          {kitchenOrders.map(order => {
            const elapsed = getElapsedTime(order.createdAt);
            const isUrgent = elapsed >= 15;
            
            return (
              <div 
                key={order.id} 
                className={`bg-slate-900 border-2 rounded-3xl overflow-hidden flex flex-col justify-between shadow-lg h-[400px] transition-all duration-300 ${
                  isUrgent 
                    ? 'border-red-600/80 animate-pulse-slow' 
                    : order.status === 'preparing' 
                      ? 'border-amber-600/60' 
                      : 'border-slate-800'
                }`}
              >
                
                {/* Ticket Top bar */}
                <div className={`p-4 flex justify-between items-center ${
                  isUrgent 
                    ? 'bg-red-950/40 text-red-400 border-b border-red-900/30' 
                    : order.status === 'preparing'
                      ? 'bg-amber-950/20 text-amber-450 border-b border-amber-900/20'
                      : 'bg-slate-800 text-slate-300 border-b border-slate-700/80'
                }`}>
                  <div>
                    <h3 className="font-black text-sm tracking-wide font-mono">{order.orderNumber}</h3>
                    <p className="text-base font-extrabold text-white">{order.tableName.replace(/table\s*-\s*/gi, '')}</p>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-bold font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{elapsed}m</span>
                  </div>
                </div>

                {/* Items check list */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {order.items.map((item, idx) => {
                    const isCrossed = !!crossedItems[`${order.id}-${idx}`];
                    return (
                      <div 
                        key={idx}
                        onClick={() => toggleItemCross(order.id, idx)}
                        className={`flex gap-3 items-start cursor-pointer transition-colors p-2.5 rounded-xl border ${
                          isCrossed 
                            ? 'bg-slate-800/20 border-slate-800 text-slate-500 line-through' 
                            : 'bg-slate-800/40 border-slate-800/30 hover:bg-slate-800/80 text-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isCrossed}
                          readOnly
                          className="rounded text-amber-500 focus:ring-amber-500 bg-slate-800 border-slate-700 w-4 h-4 mt-0.5"
                        />
                        <div className="flex-1 text-xs">
                          <p className="font-bold text-sm">
                            {item.name} <strong className="text-amber-500 font-extrabold">x{item.quantity}</strong>
                          </p>
                          {item.specialInstructions && (
                            <p className="text-[10px] text-orange-400 font-bold bg-orange-950/20 border border-orange-900/30 px-2 py-0.5 rounded mt-1 inline-block">
                              Note: {item.specialInstructions}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Ticket actions */}
                <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex gap-2">
                  {order.status === 'accepted' ? (
                    <button
                      onClick={() => handleStartCooking(order.id)}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-[0.98]"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>START COOKING</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleMarkReady(order)}
                      className="w-full bg-green-500 hover:bg-green-600 text-slate-950 font-black py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-[0.98]"
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span>MARK AS READY</span>
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
