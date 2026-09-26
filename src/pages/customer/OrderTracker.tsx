import React, { useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Clock, Check, UtensilsCrossed, ChevronLeft, RefreshCw, Flame, CheckCircle } from 'lucide-react';
import { OrderStatus } from '../../types';
import { translations, Language } from '../../translations';
import { PageLoader } from '../../components/PageLoader';

interface OrderTrackerProps {
  orderId: string;
  tableId: string;
}

export const OrderTracker: React.FC<OrderTrackerProps> = ({ orderId, tableId }) => {
  const { orders, settings, setCurrentTableById, currentTable, t, lang } = useRestaurant();

  useEffect(() => {
    if (tableId) {
      setCurrentTableById(tableId);
    }
  }, [tableId]);

  const order = orders.find(o => o.id === orderId);

  // Status timeline nodes
  const statuses: { label: string; value: OrderStatus; desc: string }[] = [
    { label: t.orderReceived, value: 'pending', desc: t.orderReceivedSub },
    { label: t.accepted, value: 'accepted', desc: t.acceptedSub },
    { label: t.preparing, value: 'preparing', desc: t.preparingSub },
    { label: t.ready, value: 'ready', desc: t.readySub },
    { label: t.served, value: 'served', desc: t.servedSub },
  ];

  const getStatusIndex = (currentStatus: OrderStatus) => {
    const idx = statuses.findIndex(s => s.value === currentStatus);
    if (idx === -1 && (currentStatus === 'completed' || currentStatus === 'served')) return 4;
    return idx;
  };

  const currentStatusIndex = order ? getStatusIndex(order.status) : 0;

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-glass border border-slate-100 dark:border-slate-800">
          <PageLoader 
            compact={true} 
            size="md"
            message={t.findingOrder || "LOCATING YOUR ORDER..."} 
            subtext={t.checkingKitchen || "Checking kitchen display system"} 
          />
          <button 
            onClick={() => window.location.pathname = `/menu/${tableId}`}
            className="mt-4 text-sm font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-1 mx-auto"
          >
            <ChevronLeft className="w-4 h-4" /> {t.backToMenu}
          </button>
        </div>
      </div>
    );
  }

  // Check if order was cancelled
  const isCancelled = order.status === 'cancelled';

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return t.orderReceived;
      case 'accepted': return t.accepted;
      case 'preparing': return t.preparing;
      case 'ready': return t.ready;
      case 'served': return t.served;
      case 'completed': return t.orderCompleted;
      case 'cancelled': return t.orderCancelled;
      default: return (status as string).toUpperCase();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-955 pb-20">
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800/80 px-4 py-3 shadow-sm">
        <div className="max-w-md md:max-w-4xl mx-auto flex items-center gap-3">
          <button 
            onClick={() => window.location.pathname = `/menu/${tableId}`}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" aria-label="Back to menu"
          >
            <ChevronLeft className="w-6 h-6 text-slate-655" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 font-sans">
              {t.trackOrderStatus}
            </h1>
            <p className="text-xs text-slate-500">{order.orderNumber}</p>
          </div>
        </div>
      </header>

      <main className="max-w-md md:max-w-4xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Column: Progress Timeline */}
          <div className="md:col-span-7 space-y-6">
            {/* Timeline Status Card */}
            {isCancelled ? (
              <div className="bg-red-50 dark:bg-red-955/20 text-red-750 dark:text-red-400 p-5 rounded-3xl border border-red-100 dark:border-red-900/30">
                <p className="font-bold text-sm">{t.orderCancelled}</p>
                <p className="text-xs mt-1">{t.orderCancelledSubtitle}</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-glass border border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-6 text-sm">{t.cookingTimeline}</h3>
                
                <div className="relative pl-8 space-y-8">
                  {/* Vertical line connector */}
                  <div 
                    className="absolute left-3.5 top-1 bottom-1 w-[2px] bg-slate-150 dark:bg-slate-800"
                    style={{
                      backgroundImage: `linear-gradient(to bottom, var(--brand-500) ${
                        (currentStatusIndex / (statuses.length - 1)) * 100
                      }%, rgb(226, 232, 240) ${(currentStatusIndex / (statuses.length - 1)) * 100}%)`
                    }}
                  />

                  {statuses.map((s, index) => {
                    const isPassed = index < currentStatusIndex;
                    const isCurrent = index === currentStatusIndex;

                    return (
                      <div key={s.value} className="relative flex gap-4">
                        {/* Circle Node */}
                        <span className={`absolute -left-8 w-7.5 h-7.5 rounded-full border-2 flex items-center justify-center z-10 transition-colors ${
                          isPassed 
                            ? 'bg-brand-600 border-brand-600 text-white' 
                            : isCurrent 
                              ? 'bg-white border-brand-500 text-brand-600 dark:bg-slate-900 dark:text-brand-400 animate-pulse'
                              : 'bg-white border-slate-200 text-slate-300 dark:bg-slate-900 dark:border-slate-800'
                        }`}>
                          {isPassed ? (
                            <Check className="w-4 h-4 stroke-[3px]" />
                          ) : (
                            <span className={`w-2.5 h-2.5 rounded-full ${isCurrent ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
                          )}
                        </span>

                        <div>
                          <h4 className={`font-bold text-sm ${
                            isPassed 
                              ? 'text-slate-700 dark:text-slate-350' 
                              : isCurrent 
                                ? 'text-brand-600 dark:text-brand-400 text-base'
                                : 'text-slate-400 dark:text-slate-655'
                          }`}>
                            {s.label}
                          </h4>
                          <p className="text-xs text-slate-400 dark:text-slate-505 mt-0.5 leading-relaxed">{s.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Status Summary & Items */}
          <div className="md:col-span-5 space-y-6">
            {/* Status Header Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-glass border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs text-slate-455 uppercase tracking-wider font-bold mb-1">{t.statusReport}</p>
                  <h2 className={`text-2xl font-black ${
                    isCancelled ? 'text-red-500' : 'text-brand-600 dark:text-brand-400'
                  }`}>
                    {getStatusText(order.status)}
                  </h2>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl text-right">
                  <p className="text-[10px] text-slate-455 font-bold uppercase">Table</p>
                  <p className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                    {(() => {
                      if (currentTable?.number) {
                        const clean = currentTable.number.replace(/^table[\s\-_]*/i, '').trim();
                        if (clean && !/^\d{7,}$/.test(clean)) return clean;
                      }
                      const cleanId = tableId ? tableId.replace(/^table[\s\-_]*/i, '').trim() : '';
                      if (cleanId && !/^\d{7,}$/.test(cleanId)) return cleanId;
                      return '1';
                    })()}
                  </p>
                </div>
              </div>

              {!isCancelled && (
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                  <Clock className="w-5 h-5 text-brand-500" />
                  <span>{t.estPrep}: <strong className="text-slate-700 dark:text-slate-300">~15-20 {t.mins}</strong></span>
                </div>
              )}
            </div>

            {/* Order Details Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-glass border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <UtensilsCrossed className="w-5 h-5 text-slate-400" />
                <h3 className="font-bold text-slate-805 dark:text-slate-200 text-sm">{t.orderSummary}</h3>
              </div>

              <div className="space-y-4">
                {order.items.map(i => (
                  <div key={i.itemId} className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-300 text-sm">
                        {i.name} <span className="text-slate-400">x{i.quantity}</span>
                      </h4>
                      {i.specialInstructions && (
                        <p className="text-[11px] text-orange-550 mt-0.5">
                          Note: "{i.specialInstructions}"
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-slate-805 dark:text-slate-300">
                      {settings?.currency || '₹'}{(i.price * i.quantity).toFixed(0)}
                    </span>
                  </div>
                ))}

                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>{t.subtotal}</span>
                    <span>{settings?.currency || '₹'}{order.subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.tax}</span>
                    <span>{settings?.currency || '₹'}{order.tax.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-800 dark:text-slate-200 pt-2 border-t border-slate-150 dark:border-slate-800/40">
                    <span>{t.grandTotal}</span>
                    <span>{settings?.currency || '₹'}{order.grandTotal.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => window.location.pathname = `/menu/${tableId}`}
              className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:border dark:border-slate-800 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold py-4 px-6 rounded-2xl transition-all text-sm cursor-pointer"
            >
              {t.addMoreItems}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
export default OrderTracker;
