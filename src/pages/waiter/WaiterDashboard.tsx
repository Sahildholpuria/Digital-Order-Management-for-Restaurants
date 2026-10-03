import React, { useState, useEffect, useRef } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { RestaurantTable, TableStatus, RestaurantOrder } from '../../types';
import { CaptainOrderPunchModal } from '../../components/captain/CaptainOrderPunchModal';
import { 
  Bell, 
  Receipt, 
  Users, 
  Check, 
  Clock, 
  MessageSquare, 
  HelpCircle, 
  Coffee, 
  X,
  Volume2,
  VolumeX,
  Zap,
  Plus
} from 'lucide-react';

export const WaiterDashboard: React.FC = () => {
  const { 
    tables, 
    orders, 
    notifications, 
    markNotificationRead, 
    updateTableStatus,
    settings 
  } = useRestaurant();

  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isPunchModalOpen, setIsPunchModalOpen] = useState<boolean>(false);
  const [punchInitialTableId, setPunchInitialTableId] = useState<string | undefined>(undefined);

  const currency = settings?.currency || '₹';

  // Active notifications for waiters (call_waiter or request_bill that are unread)
  const activeAlerts = notifications.filter(n => !n.isRead && ['call_waiter', 'request_bill'].includes(n.type));

  const prevAlertsCountRef = useRef<number>(activeAlerts.length);
  const isInitialMount = useRef<boolean>(true);

  // Play crisp service bell chime whenever a new call waiter / bill request alert arrives
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevAlertsCountRef.current = activeAlerts.length;
      return;
    }

    if (activeAlerts.length > prevAlertsCountRef.current && soundEnabled) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        // Classic pleasant two-tone service bell: E6 (1318.5Hz) -> C6 (1046.5Hz)
        osc.frequency.setValueAtTime(1318.51, ctx.currentTime);
        osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.65);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.65);
      } catch (_) {}
    }
    prevAlertsCountRef.current = activeAlerts.length;
  }, [activeAlerts.length, soundEnabled]);

  // Find active orders for selected table
  const selectedTableOrders = selectedTable 
    ? orders.filter(o => 
        (o.tableId === selectedTable.id || 
         o.tableId === `table-${selectedTable.number}` || 
         o.tableName === `Table ${selectedTable.number}` || 
         o.tableName === selectedTable.number) && 
        !['completed', 'cancelled'].includes(o.status)
      )
    : [];

  const handleResolveAlert = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await markNotificationRead(id);
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight font-sans">
            Waiter Console
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Respond to guest service chimes and update table occupancy loads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Punch Order Button */}
          <button
            type="button"
            onClick={() => {
              setPunchInitialTableId(undefined);
              setIsPunchModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
          >
            <Zap className="w-4 h-4 fill-current text-amber-300" />
            <span>Punch Table Order (KOT)</span>
          </button>

          {/* Sound Alert Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer shadow-sm ${
            soundEnabled 
              ? 'bg-slate-900 dark:bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-800' 
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-50'
          }`}
          title="Toggle Waiter Service Chime"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          <span>{soundEnabled ? 'Chime ON' : 'Mute'}</span>
          </button>
        </div>
      </div>

      {/* Active Service Requests Section */}
      {activeAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-extrabold text-red-500 text-xs uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
            <Bell className="w-4 h-4 fill-current" />
            <span>Active Guest Call Alerts ({activeAlerts.length})</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activeAlerts.map(alert => (
              <div 
                key={alert.id}
                className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm transition-all ${
                  alert.type === 'request_bill' 
                    ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-900/30 dark:text-green-400' 
                    : 'bg-orange-50 border-orange-205 text-orange-850 dark:bg-orange-950/20 dark:border-orange-900/30 dark:text-orange-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${
                    alert.type === 'request_bill' ? 'bg-green-500/10' : 'bg-orange-500/10'
                  }`}>
                    {alert.type === 'request_bill' ? <Receipt className="w-5 h-5" /> : <Coffee className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm">{alert.tableName}</h4>
                    <p className="text-[11px] opacity-80">{alert.message}</p>
                  </div>
                </div>

                <button
                  onClick={(e) => handleResolveAlert(alert.id, e)}
                  className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-all dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800"
                >
                  <Check className="w-3.5 h-3.5 text-green-500 stroke-[3px]" />
                  <span>Dismiss</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid of Tables */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-slate-700 dark:text-slate-205 text-sm uppercase tracking-wider">Dining Floor Layout</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {tables.map(table => {
            const cleanNum = table.number || table.id.replace(/^table-/i, '');
            const activeOrderCount = orders.filter(o => 
              (o.tableId === table.id || 
               o.tableId === `table-${cleanNum}` || 
               o.tableId === cleanNum || 
               o.tableName === `Table ${table.number}` || 
               o.tableName === table.number || 
               o.tableName === `Table ${cleanNum}`) && 
              !['completed', 'cancelled'].includes(o.status)
            ).length;
            
            return (
              <div
                key={table.id}
                onClick={() => setSelectedTable(table)}
                className={`bg-white dark:bg-slate-900 border rounded-3xl p-4 shadow-sm flex flex-col justify-between h-36 cursor-pointer hover:shadow-md transition-all ${
                  selectedTable?.id === table.id 
                    ? 'ring-2 ring-brand-500 border-transparent' 
                    : 'border-slate-150/60 dark:border-slate-850'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-slate-800 dark:text-slate-100 text-sm">Table {table.number}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Cap: {table.capacity}</p>
                  </div>

                  <span className={`w-2.5 h-2.5 rounded-full ${
                    table.status === 'available' ? 'bg-emerald-500' :
                    table.status === 'occupied' ? 'bg-brand-500' : 'bg-rose-500'
                  }`} />
                </div>

                <div className="flex justify-between items-end">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    table.status === 'available' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                    table.status === 'occupied' ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400' :
                    'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400'
                  }`}>
                    {table.status.toUpperCase()}
                  </span>

                  {activeOrderCount > 0 && (
                    <span className="bg-amber-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md">
                      {activeOrderCount} Ord
                    </span>
                  )}
                </div>

                {/* Quick Punch Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPunchInitialTableId(table.id);
                    setIsPunchModalOpen(true);
                  }}
                  className="mt-2 w-full py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3 h-3" />
                  <span>Take Order / KOT</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slide-over/Panel details for selected table */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 animate-slide-up flex flex-col max-h-[85vh] pb-safe">
            
            {/* Panel Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base">Table {selectedTable.number} Details</h3>
                <p className="text-xs text-slate-400">Capacity: {selectedTable.capacity} guests &bull; status: {selectedTable.status}</p>
              </div>
              <button 
                onClick={() => setSelectedTable(null)} 
                className="text-slate-450 hover:text-slate-655 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-850"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Panel Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              
              {/* Quick Status Setter */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Modify Table Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['available', 'occupied', 'reserved'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => updateTableStatus(selectedTable.id, status)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        selectedTable.status === status
                          ? 'bg-slate-800 border-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                          : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {status.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table active orders list */}
              <div className="space-y-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Cooking Tickets</label>
                
                {selectedTableOrders.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-450 border border-dashed border-slate-205 dark:border-slate-805 rounded-2xl">
                    No active dishes currently preparing.
                  </div>
                ) : (
                  selectedTableOrders.map(order => (
                    <div 
                      key={order.id}
                      className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2.5"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">#{order.orderNumber}</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                          ['ready', 'served'].includes(order.status) ? 'bg-green-105 text-green-700' : 'bg-amber-105 text-amber-700'
                        }`}>
                          {order.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {order.items.map((i, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-slate-650 dark:text-slate-350">
                            <span>{i.name} <strong>x{i.quantity}</strong></span>
                            <span>{currency}{(i.price * i.quantity).toFixed(0)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200">
                        <span>Total Payable</span>
                        <span>{currency}{order.grandTotal.toFixed(0)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>

            {/* Panel Actions */}
            <div className="p-5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setPunchInitialTableId(selectedTable.id);
                  setIsPunchModalOpen(true);
                }}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-3 rounded-2xl transition-all shadow-md text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current text-amber-300" />
                <span>Punch Items / Add KOT</span>
              </button>

              <button
                onClick={() => {
                  // Direct POS Checkout link
                  window.history.pushState(null, "", "/admin/billing");
                  window.dispatchEvent(new PopStateEvent("popstate"));
                  setSelectedTable(null);
                }}
                disabled={selectedTableOrders.length === 0}
                className="w-full bg-slate-800 hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:bg-slate-200 dark:disabled:bg-slate-800/50 disabled:text-slate-400 text-white font-bold py-3 rounded-2xl transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                <span>Go to Bill Settlements</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Captain Order Punching Modal */}
      <CaptainOrderPunchModal
        isOpen={isPunchModalOpen}
        onClose={() => setIsPunchModalOpen(false)}
        initialTableId={punchInitialTableId}
      />
    </div>
  );
};
export default WaiterDashboard;
