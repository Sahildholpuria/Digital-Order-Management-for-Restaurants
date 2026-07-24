import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { RestaurantOrder, OrderStatus, OrderItem } from '../../types';
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
  Printer
} from 'lucide-react';
import { printKOTReceipt } from '../../utils/printUtils';

export const OrdersManager: React.FC = () => {
  const { orders, settings, updateOrderStatus, saveOrder } = useRestaurant();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [selectedTableFilter, setSelectedTableFilter] = useState<string>('all');
  
  // Audio state
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Edit Order Modal States
  const [editingOrder, setEditingOrder] = useState<RestaurantOrder | null>(null);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);

  // Force re-renders for elapsed timers
  const [, setTimeTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTimeTick(t => t + 1), 10000); // refresh every 10s
    return () => clearInterval(timer);
  }, []);

  const currency = settings?.currency || '₹';

  // Get elapsed minutes
  const getElapsedMinutes = (timeString: string) => {
    const start = new Date(timeString).getTime();
    const diffMs = Date.now() - start;
    return Math.floor(diffMs / 60000);
  };

  // Get unique tables in active orders for filter dropdown
  const activeTables = Array.from(new Set(orders.map(o => o.tableName)));

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          order.tableName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTable = selectedTableFilter === 'all' || order.tableName === selectedTableFilter;
    
    let matchesStatus = false;
    if (statusFilter === 'active') {
      matchesStatus = ['pending', 'accepted', 'preparing', 'ready', 'served'].includes(order.status);
    } else if (statusFilter === 'all') {
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
    
    const subtotal = editItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    const taxRate = settings?.taxPercentage ?? 0;
    const tax = subtotal * (taxRate / 100);
    const grandTotal = subtotal + tax;

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
      { title: 'New Pending', statusCodes: ['pending'], color: 'border-t-red-500 bg-red-500/5', badge: 'bg-red-500/10 text-red-700 dark:text-red-400', list: [] },
      { title: 'In Kitchen Cooking', statusCodes: ['accepted', 'preparing'], color: 'border-t-amber-500 bg-amber-500/5', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400', list: [] },
      { title: 'Ready / Serving', statusCodes: ['ready', 'served'], color: 'border-t-emerald-500 bg-emerald-500/5', badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', list: [] },
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
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            Live Order Manager
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Monitor and update kitchen orders in real-time.
          </p>
        </div>

        {/* Audio speech notification controls */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
            soundEnabled 
              ? 'bg-brand-50 border-brand-200 text-brand-600 dark:bg-brand-950/20 dark:border-brand-900/30'
              : 'bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          <span>{soundEnabled ? 'Speech Alerts ON' : 'Speech Alerts MUTED'}</span>
        </button>
      </div>

      {/* Filter and search panel */}
      <div className="card-premium flex flex-col md:flex-row gap-4 items-center justify-between p-4">
        
        {/* Search */}
        <div className="relative w-full md:w-80 shadow-sm rounded-2xl">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search order ID or table..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all font-medium"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2.5 w-full md:w-auto justify-end">
          <select
            value={selectedTableFilter}
            onChange={(e) => setSelectedTableFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2 text-xs text-slate-600 dark:text-slate-300 focus:outline-none font-bold"
          >
            <option value="all">All Tables</option>
            {activeTables.map((t, idx) => (
              <option key={idx} value={t}>{t}</option>
            ))}
          </select>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'active' 
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'completed' 
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'all' 
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              All
            </button>
          </div>
        </div>

      </div>

      {/* Kanban Board View */}
      {statusFilter === 'active' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boardColumns.map((col, index) => (
            <div key={index} className={`rounded-3xl border-t-4 p-5 space-y-4 flex flex-col min-h-[500px] border border-slate-200/60 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/10 backdrop-blur-sm ${col.color}`}>
              
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800/50">
                <h3 className="font-extrabold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">{col.title}</h3>
                <span className={`font-black text-xs px-2.5 py-0.5 rounded-full ${col.badge}`}>
                  {col.list.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 max-h-[70vh] pr-1">
                {col.list.length === 0 ? (
                  <div className="h-40 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    No orders in this stage
                  </div>
                ) : (
                  col.list.map(order => (
                    <OrderCard 
                      key={order.id}
                      order={order}
                      currency={currency}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.length === 0 ? (
            <div className="col-span-full card-premium p-10 text-center text-slate-450 text-xs font-bold uppercase tracking-wider">
              No orders found matching filters.
            </div>
          ) : (
            filteredOrders.map(order => (
              <OrderCard 
                key={order.id}
                order={order}
                currency={currency}
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
                      <p className="text-xs text-brand-655 font-semibold">{currency}{item.price}</p>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/40 px-2 py-1 rounded-xl">
                      <button
                        onClick={() => handleUpdateItemQty(idx, -1)}
                        className="text-slate-500 hover:text-slate-800 font-bold"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-sm text-slate-850 dark:text-slate-100">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateItemQty(idx, 1)}
                        className="text-slate-500 hover:text-slate-800 font-bold"
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
                <p className="text-lg font-black text-slate-850 dark:text-slate-105">
                  {currency}{editItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0).toFixed(0)}
                </p>
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-655 dark:text-slate-350"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// ==========================================
// SUB-COMPONENT: ORDER CARD
// ==========================================

interface OrderCardProps {
  order: RestaurantOrder;
  currency: string;
  getElapsedMinutes: (time: string) => number;
  onUpdateStatus: (id: string, status: OrderStatus) => Promise<void>;
  onOpenEdit: (order: RestaurantOrder) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ 
  order, 
  currency, 
  getElapsedMinutes, 
  onUpdateStatus, 
  onOpenEdit 
}) => {
  const elapsed = getElapsedMinutes(order.createdAt);
  
  // Determine timer color based on delay
  const timerColor = elapsed > 20 
    ? 'text-red-650 bg-red-500/10 border border-red-500/10 animate-pulse' 
    : elapsed > 10 
      ? 'text-amber-600 bg-amber-500/10 border border-amber-500/10' 
      : 'text-slate-500 bg-slate-500/10 border border-slate-205/10 dark:bg-slate-800/40';

  return (
    <div className="card-premium space-y-4 flex flex-col justify-between p-5">
      
      {/* Card Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-slate-800 dark:text-slate-105 text-sm font-mono">{order.orderNumber}</span>
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
              order.status === 'pending' ? 'bg-red-500/10 text-red-700 dark:text-red-400' :
              order.status === 'accepted' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400' :
              order.status === 'preparing' ? 'bg-amber-500/10 text-amber-705 dark:text-amber-400' :
              order.status === 'ready' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
              order.status === 'served' ? 'bg-teal-500/10 text-teal-700 dark:text-teal-400' :
              'bg-slate-500/10 text-slate-700 dark:text-slate-400'
            }`}>
              {order.status}
            </span>
          </div>
          <h4 className="font-black text-base text-slate-800 dark:text-slate-100 mt-1">
            {order.tableName.toLowerCase().startsWith('table') 
              ? order.tableName 
              : `Table ${order.tableName.replace(/table\s*[-_]?\s*/gi, '').trim()}`}
          </h4>
        </div>

        {/* Live Elapsed Timer */}
        {['pending', 'accepted', 'preparing', 'ready'].includes(order.status) && (
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${timerColor}`}>
            <Clock className="w-3 h-3" />
            <span>{elapsed}m ago</span>
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="space-y-2 flex-1 pt-1.5">
        {order.items.map((item, idx) => (
          <div key={idx} className="text-xs">
            <div className="flex justify-between items-start text-slate-700 dark:text-slate-350 gap-2">
              <span className="font-extrabold text-slate-805 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                <span>{item.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide ${
                  item.quantity > 1 
                    ? 'bg-brand-600 text-white animate-pulse' 
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  x{item.quantity}
                </span>
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-bold whitespace-nowrap">{currency}{(item.price * item.quantity).toFixed(0)}</span>
            </div>
            
            {item.specialInstructions && (
              <p className="text-[10px] text-orange-650 bg-orange-500/5 dark:bg-orange-955/20 px-2 py-0.5 rounded-md inline-block mt-1 font-bold">
                Note: {item.specialInstructions}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100/60 dark:border-slate-800/40 pt-3 flex justify-between items-center text-xs">
        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Subtotal</span>
        <span className="font-black text-slate-800 dark:text-slate-100 text-sm">{currency}{order.grandTotal.toFixed(0)}</span>
      </div>

      {/* Action Buttons based on status */}
      <div className="flex gap-2 pt-2 flex-wrap">
        {order.status === 'pending' && (
          <>
            <button
              onClick={() => onUpdateStatus(order.id, 'accepted')}
              className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Accept</span>
            </button>
            <button
              onClick={() => onUpdateStatus(order.id, 'cancelled')}
              className="px-3 bg-red-50 hover:bg-red-100 text-red-655 dark:bg-red-950/20 dark:text-red-400 font-bold py-2 rounded-xl text-xs flex items-center justify-center transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {order.status === 'accepted' && (
          <button
            onClick={() => onUpdateStatus(order.id, 'preparing')}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Prepare</span>
          </button>
        )}

        {order.status === 'preparing' && (
          <button
            onClick={() => onUpdateStatus(order.id, 'ready')}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm transition-all"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Mark Ready</span>
          </button>
        )}

        {order.status === 'ready' && (
          <button
            onClick={() => onUpdateStatus(order.id, 'served')}
            className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm transition-all"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Mark Served</span>
          </button>
        )}

        {order.status === 'served' && (
          <button
            onClick={() => {
              window.location.hash = `#billing`;
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Generate Bill</span>
          </button>
        )}

        {/* Print KOT, Edit & Cancel overrides for active orders */}
        {['pending', 'accepted', 'preparing', 'ready', 'served'].includes(order.status) && (
          <>
            <button
              onClick={() => printKOTReceipt(order)}
              className="p-2 border border-slate-205 dark:border-slate-800 text-amber-500 hover:text-amber-600 rounded-xl transition-all"
              title="Print Kitchen Order Ticket (KOT)"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onOpenEdit(order)}
              className="p-2 border border-slate-205 dark:border-slate-800 text-slate-400 hover:text-slate-655 dark:hover:text-slate-300 rounded-xl transition-all"
              title="Edit items"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onUpdateStatus(order.id, 'cancelled')}
              className="p-2 border border-slate-205 dark:border-slate-800 text-red-400 hover:text-red-655 dark:hover:text-red-950 rounded-xl transition-all"
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
