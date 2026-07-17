import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { FoodItem, MenuCategory } from '../../types';
import { Search, ShoppingBag, Flame, Sparkles, Utensils, X, Bell, Receipt, CheckCircle, ArrowRight, ClipboardList, ChevronRight, Clock, Globe } from 'lucide-react';
import confetti from 'canvas-confetti';
import { translations, Language } from '../../translations';

interface CustomerMenuProps {
  tableId: string;
}

export const CustomerMenu: React.FC<CustomerMenuProps> = ({ tableId }) => {
  const {
    settings,
    categories,
    foodItems,
    orders,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    getCartSubtotal,
    getCartTax,
    getCartGrandTotal,
    placeOrder,
    callWaiter,
    requestBill,
    setCurrentTableById,
    currentTable,
    tables,
    loading,
    tablesLoaded,
  } = useRestaurant();

  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('customer_lang') as Language) || 'en');
  const t = translations[lang];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [vegOnly, setVegOnly] = useState(false);
  const [popularOnly, setPopularOnly] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [selectedVariantName, setSelectedVariantName] = useState<string>('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any>(null);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  
  // Status states for call staff feedback
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [billRequested, setBillRequested] = useState(false);

  // Load/manage order completion timestamps to auto-remove completed orders after 5 minutes
  const [completedTimestamps, setCompletedTimestamps] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('completed_orders_timestamps');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Track and save completed orders' completion times
  useEffect(() => {
    let updated = false;
    const newTimestamps = { ...completedTimestamps };

    orders.forEach(o => {
      if (o.status === 'completed' && !newTimestamps[o.id]) {
        newTimestamps[o.id] = new Date().toISOString();
        updated = true;
      }
    });

    if (updated) {
      setCompletedTimestamps(newTimestamps);
      localStorage.setItem('completed_orders_timestamps', JSON.stringify(newTimestamps));
    }
  }, [orders, completedTimestamps]);

  // Periodic tick to trigger recalculation of expired completed orders every 10 seconds
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // All orders placed at this table in this session, filtering out completed ones after 2 minutes
  const tableOrders = orders
    .filter(o => {
      if (o.tableId !== tableId) return false;
      if (o.status === 'completed') {
        const completedAtStr = completedTimestamps[o.id] || o.createdAt;
        const completedAt = new Date(completedAtStr).getTime();
        const now = new Date().getTime();
        const diffMs = now - completedAt;
        const twoMinutesMs = 2 * 60 * 1000;
        if (diffMs > twoMinutesMs) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  useEffect(() => {
    if (tableId) {
      setCurrentTableById(tableId);
    }
  }, [tableId, setCurrentTableById]);

  // Filter items
  const filteredItems = foodItems.filter(item => {
    if (!item.isAvailable) return false;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
    const matchesVeg = !vegOnly || item.isVeg;
    const matchesPopular = !popularOnly || item.isPopular || item.isRecommended;
    return matchesSearch && matchesCategory && matchesVeg && matchesPopular;
  });

  const handleOpenItem = (item: FoodItem) => {
    setSelectedItem(item);
    setQuantity(1);
    setSpecialInstructions('');

    // Default selected variant
    let defaultVariant = '';
    if (item.description && item.description.includes('||variants:')) {
      const [, variantsStr] = item.description.split('||variants:');
      const parts = variantsStr.split(';');
      if (parts.length > 0) {
        defaultVariant = parts[0].split('=')[0];
      }
    }
    setSelectedVariantName(defaultVariant);
  };

  const handleAddToCart = () => {
    if (selectedItem) {
      addToCart(selectedItem, quantity, specialInstructions, selectedVariantName || undefined);
      setSelectedItem(null);
      
      // Mini pop confetti on button click
      confetti({
        particleCount: 40,
        spread: 45,
        origin: { y: 0.9 }
      });
    }
  };

  const handlePlaceOrder = async () => {
    try {
      const placed = await placeOrder();
      setOrderSuccess(placed);
      setIsCartOpen(false);
      
      // Giant victory confetti
      confetti({
        particleCount: 155,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (err) {
      alert('Failed to place order. Please try again.');
    }
  };

  const handleCallWaiter = async () => {
    await callWaiter();
    setWaiterCalled(true);
    setTimeout(() => setWaiterCalled(false), 5000);
  };

  const handleRequestBill = async () => {
    await requestBill();
    setBillRequested(true);
    setTimeout(() => setBillRequested(false), 5000);
  };

  // Show loading state while the initial context or tables list hasn't arrived yet.
  // We wait for BOTH loading=false AND tablesLoaded=true before making any
  // table-existence decision, so we never accidentally block a valid table that
  // just hasn't loaded from the DB yet.
  if (loading || !tablesLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-mesh flex items-center justify-center p-6 text-center animate-fade-in">
        <div className="flex flex-col items-center gap-3.5">
          <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Synchronizing table details...</p>
        </div>
      </div>
    );
  }

  // Once tables have been definitively loaded from the database, if this
  // tableId is NOT in the list the table has been deleted by the owner.
  const isTableDeleted = !tables.some(t => t.id === tableId);
  if (isTableDeleted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-mesh flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-150/60 dark:border-slate-800/80 animate-scale-in">
          <div className="w-20 h-20 bg-rose-500/10 dark:bg-rose-950/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
            <X className="w-10 h-10 text-rose-600 dark:text-rose-400" />
          </div>
          
          <h2 className="text-2xl font-black mb-2 text-slate-800 dark:text-slate-100 font-sans tracking-tight">Table Inactive</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 text-xs font-semibold leading-relaxed">
            This table QR code has been deactivated or deleted by the restaurant management. Please contact our staff or scan a valid table QR code to proceed.
          </p>

          <div className="bg-slate-50 dark:bg-slate-800/20 rounded-2xl p-4.5 mb-6 text-left border border-slate-100 dark:border-slate-800/40 text-xs">
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-455">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Reference ID</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{tableId}</span>
            </div>
          </div>

          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md flex items-center justify-center gap-1.5 text-xs cursor-pointer"
          >
            <span>Return to Homepage</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-mesh flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-800/80 animate-scale-in">
          <div className="w-20 h-20 bg-green-500/10 dark:bg-green-950/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-550/20">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-450" />
          </div>
          
          <h2 className="text-3xl font-black mb-2 text-slate-800 dark:text-slate-100 font-sans tracking-tight">Order Sent!</h2>
          <p className="text-slate-550 dark:text-slate-455 mb-6 text-sm font-semibold">Your items are sent directly to our kitchen staff.</p>
          
          <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-5 mb-6 space-y-3.5 text-left border border-slate-100 dark:border-slate-800/40 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold uppercase tracking-wider">Order Reference</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-200">{orderSuccess.orderNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold uppercase tracking-wider">Table Assigned</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-200">{currentTable?.number || tableId.replace('table-', '')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold uppercase tracking-wider">Est. Preparation</span>
              <span className="font-extrabold text-brand-600 dark:text-brand-400">~15 - 20 Mins</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold uppercase tracking-wider">Order Value</span>
              <span className="font-black text-slate-900 dark:text-slate-105 text-sm">
                {settings?.currency || '₹'}{orderSuccess.grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              window.location.pathname = `/menu/${tableId}/track/${orderSuccess.id}`;
            }}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-brand-500/20 text-sm flex items-center justify-center gap-1.5"
          >
            <span>Track Cooking Status</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setOrderSuccess(null)}
            className="w-full text-slate-400 dark:text-slate-500 font-bold py-3 px-6 mt-3 hover:text-slate-700 dark:hover:text-slate-350 transition-colors text-sm"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  const totalItemsCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  const renderCartContent = () => (
    <div className="flex flex-col h-full justify-between overflow-hidden">
      {/* Cart Items list */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
        {cart.map(c => {
          const itemImage = foodItems.find(f => f.id === c.itemId)?.image;
          return (
            <div key={c.itemId} className="flex gap-3 items-center pb-4 border-b border-slate-100/50 dark:border-slate-800/40">
              {itemImage && (
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                  <img src={itemImage} alt={c.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate leading-snug">{c.name}</h4>
                <p className="text-[10px] text-brand-600 dark:text-brand-400 font-bold mt-0.5">
                  {settings?.currency || '₹'}{c.price.toFixed(0)} each
                </p>
                {c.specialInstructions && (
                  <p className="text-[8px] text-orange-500 bg-orange-500/5 dark:bg-orange-950/20 px-2 py-0.5 rounded-md inline-block mt-1 truncate max-w-full">
                    Note: {c.specialInstructions}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-805 px-1.5 py-0.5 rounded-lg">
                <button
                  onClick={() => updateCartQuantity(c.itemId, c.quantity - 1)}
                  className="w-4 h-4 font-bold text-slate-400 hover:text-slate-700 text-[10px] flex items-center justify-center"
                >
                  -
                </button>
                <span className="font-bold text-[10px] text-slate-850 dark:text-slate-100 w-3 text-center">{c.quantity}</span>
                <button
                  onClick={() => updateCartQuantity(c.itemId, c.quantity + 1)}
                  className="w-4 h-4 font-bold text-slate-400 hover:text-slate-700 text-[10px] flex items-center justify-center"
                >
                  +
                </button>
              </div>

              <span className="font-bold text-xs text-slate-800 dark:text-slate-100 w-12 text-right">
                {settings?.currency || '₹'}{(c.price * c.quantity).toFixed(0)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Cart Summary & CTA */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
        <div className="space-y-2 text-[11px] text-slate-500 dark:text-slate-400 mb-4">
          <div className="flex justify-between items-center">
            <span>Subtotal</span>
            <span className="font-bold text-slate-800 dark:text-slate-205">
              {settings?.currency || '₹'}{getCartSubtotal().toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>Taxes & GST ({settings?.taxPercentage || 18}%)</span>
            <span className="font-bold text-slate-800 dark:text-slate-205">
              {settings?.currency || '₹'}{getCartTax().toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-xs pt-2.5 border-t border-slate-150 dark:border-slate-800 text-slate-800 dark:text-slate-100 items-center">
            <span className="font-bold">Grand Total</span>
            <span className="font-black text-brand-600 dark:text-brand-400 text-sm">
              {settings?.currency || '₹'}{getCartGrandTotal().toFixed(2)}
            </span>
          </div>
        </div>

        <button
          onClick={handlePlaceOrder}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-brand-500/10 flex items-center justify-center gap-1.5 text-xs"
        >
          Confirm & Place Order
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-mesh pb-28">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-150/60 dark:border-slate-800/80 px-4 py-3 shadow-sm">
        <div className="max-w-md md:max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings?.logoUrl ? (
              <img 
                src={settings.logoUrl} 
                alt={settings.name} 
                className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-800"
              />
            ) : (
              <div className="w-10 h-10 bg-brand-500/10 text-brand-600 rounded-full flex items-center justify-center border border-brand-500/20">
                <Utensils className="w-5 h-5" />
              </div>
            )}
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-slate-805 dark:text-slate-100 font-sans leading-tight">
                {settings?.name || 'The Grand Bistro'}
              </h1>
              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <span className="inline-block w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                <span>Table {currentTable?.number.replace(/table\s*-\s*/gi, '') || tableId.replace('table-', '')}</span>
              </div>
            </div>
          </div>

          {/* Quick Staff Interactions */}
          <div className="flex gap-2">
            {/* Language Switcher */}
            <button
              onClick={() => {
                const nextLang = lang === 'en' ? 'hi' : 'en';
                setLang(nextLang);
                localStorage.setItem('customer_lang', nextLang);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'हिन्दी' : 'EN'}</span>
            </button>

            {(settings?.enableWaiterCall ?? true) && (
              <button
                onClick={handleCallWaiter}
                disabled={waiterCalled}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  waiterCalled 
                    ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{waiterCalled ? t.waiterCalled : t.callWaiter}</span>
              </button>
            )}
            
            {(settings?.enableBillRequest ?? true) && (
              <button
                onClick={handleRequestBill}
                disabled={billRequested}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  billRequested 
                    ? 'bg-green-600 border-green-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>{billRequested ? t.billRequested : t.requestBill}</span>
              </button>
            )}

            {/* My Orders button with badge */}
            <button
              onClick={() => setIsOrdersOpen(true)}
              className="relative flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border bg-white border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>{t.liveOrders}</span>
              {tableOrders.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {tableOrders.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ===== MY ORDERS SLIDE-UP PANEL ===== */}
      {isOrdersOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          onClick={() => setIsOrdersOpen(false)}
        >
          {/* Scrim */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Panel */}
          <div
            className="relative bg-white dark:bg-slate-900 rounded-t-3xl max-h-[80vh] flex flex-col shadow-2xl border-t border-slate-100 dark:border-slate-800 animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="font-extrabold text-slate-800 dark:text-slate-100 text-base">My Orders</h2>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  Table {currentTable?.number || tableId.replace('table-', '')} · {tableOrders.length} order{tableOrders.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setIsOrdersOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Orders List */}
            <div className="overflow-y-auto flex-1 px-4 py-4 space-y-3">
              {tableOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ClipboardList className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-3" />
                  <p className="text-sm font-bold text-slate-400">No orders placed yet</p>
                  <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Add items to your basket and place an order!</p>
                </div>
              ) : (
                tableOrders.map(order => {
                  const statusColors: Record<string, string> = {
                    pending:   'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-900/30',
                    accepted:  'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30',
                    preparing: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30',
                    ready:     'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950/20 dark:text-brand-400 dark:border-brand-900/30',
                    served:    'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30',
                    completed: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
                    cancelled: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30',
                  };
                  const statusDot: Record<string, string> = {
                    pending: 'bg-yellow-400 animate-pulse', accepted: 'bg-blue-500 animate-pulse',
                    preparing: 'bg-orange-500 animate-pulse', ready: 'bg-brand-500 animate-pulse',
                    served: 'bg-green-500', completed: 'bg-slate-400', cancelled: 'bg-red-500',
                  };

                  return (
                    <div
                      key={order.id}
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800"
                    >
                      {/* Order header row */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">{order.orderNumber}</p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusColors[order.status] || statusColors.pending}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDot[order.status] || 'bg-yellow-400'}`} />
                          {order.status}
                        </span>
                      </div>

                      {/* Items list */}
                      <div className="space-y-1 mb-3">
                        {order.items.slice(0, 3).map(item => (
                          <div key={item.itemId} className="flex justify-between text-xs">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">{item.name} × {item.quantity}</span>
                            <span className="text-slate-700 dark:text-slate-300 font-semibold">{settings?.currency || '₹'}{(item.price * item.quantity).toFixed(0)}</span>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <p className="text-[10px] text-slate-400">+{order.items.length - 3} more items</p>
                        )}
                      </div>

                      {/* Total + Track button */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                          {settings?.currency || '₹'}{order.grandTotal.toFixed(2)}
                        </span>
                        {order.status !== 'completed' && order.status !== 'cancelled' && (
                          <button
                            onClick={() => {
                              setIsOrdersOpen(false);
                              window.location.pathname = `/menu/${tableId}/track/${order.id}`;
                            }}
                            className="flex items-center gap-1 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl transition-colors"
                          >
                            <span>Track Order</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
      <main className="max-w-md md:max-w-5xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Column: Menu catalogue */}
          <div className="md:col-span-8 space-y-6">
            <div className="relative mb-5 shadow-sm rounded-2xl">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all font-medium"
              />
            </div>

            {/* Quick Filter Tags */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1.5 no-scrollbar">
              <button
                onClick={() => setVegOnly(!vegOnly)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
                  vegOnly
                    ? 'bg-green-500/10 border-green-500 text-green-600 dark:text-green-400'
                    : 'bg-white border-slate-200 text-slate-555 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
                }`}
              >
                <span className={`w-2 h-2 rounded-full bg-green-500 border border-white ${vegOnly ? 'bg-green-500' : ''}`}></span>
                {t.vegOnly}
              </button>
              <button
                onClick={() => setPopularOnly(!popularOnly)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
                  popularOnly
                    ? 'bg-brand-500/10 border-brand-550 text-brand-655 dark:text-brand-400'
                    : 'bg-white border-slate-200 text-slate-555 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {t.popularOnly}
              </button>
            </div>

            {/* Category Horizontal Bar */}
            <div className="mb-6">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">{t.categories}</h2>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                    selectedCategory === 'all'
                      ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-950 shadow-sm'
                      : 'bg-white text-slate-555 border-slate-100 hover:bg-slate-55/50 dark:bg-slate-900 dark:border-slate-805 dark:text-slate-400'
                  }`}
                >
                  {t.allItems}
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                      selectedCategory === cat.id
                        ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-950 shadow-sm'
                        : 'bg-white text-slate-555 border-slate-100 hover:bg-slate-55/50 dark:bg-slate-900 dark:border-slate-805 dark:text-slate-400'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Food Items List */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-200">{t.ourMenu}</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md">{filteredItems.length} {t.options}</span>
              </div>

              {filteredItems.length === 0 ? (
                <div className="bg-white/70 dark:bg-slate-900/60 rounded-3xl p-10 text-center border border-slate-200/50 dark:border-slate-800/80 backdrop-blur-md animate-scale-in">
                  <Utensils className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-555 dark:text-slate-400 text-sm font-semibold">{t.noItemsFound}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredItems.map(item => {
                    const discountedPrice = item.price * (1 - (item.discountPercentage || 0) / 100);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleOpenItem(item)}
                        className="bg-white/90 dark:bg-slate-900/65 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-3.5 flex gap-4 cursor-pointer hover:border-brand-500 dark:hover:border-brand-500/50 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 group backdrop-blur-sm"
                      >
                        <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-855 flex-shrink-0">
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          
                          {item.discountPercentage > 0 && (
                            <span className="absolute top-1 left-1 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-sm">
                              {item.discountPercentage}% OFF
                            </span>
                          )}

                          {item.isPopular && (
                            <span className="absolute bottom-1 right-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm uppercase tracking-wider">
                              <Sparkles className="w-2 h-2 fill-current" />
                              POP
                            </span>
                          )}
                        </div>

                        <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs sm:text-sm leading-snug group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                                {item.name}
                              </h3>
                              <span className={`w-3 h-3 border rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                item.isVeg ? 'border-green-600' : 'border-red-600'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  item.isVeg ? 'bg-green-600' : 'bg-red-600'
                                }`}></span>
                              </span>
                            </div>
                            
                            <p className="text-slate-550 dark:text-slate-400 text-[11px] line-clamp-2 mt-1 leading-normal font-medium truncate-2-lines">
                              {item.description ? item.description.split('||variants:')[0] : ''}
                            </p>
                          </div>

                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50 dark:border-slate-800/40">
                            <div className="flex items-center gap-1.5">
                              {(() => {
                                if (item.description && item.description.includes('||variants:')) {
                                  const [, variantsStr] = item.description.split('||variants:');
                                  const prices = variantsStr.split(';').map(v => Number(v.split('=')[1])).filter(p => !isNaN(p));
                                  if (prices.length > 0) {
                                    const minPrice = Math.min(...prices);
                                    const maxPrice = Math.max(...prices);
                                    const discMin = minPrice * (1 - (item.discountPercentage || 0) / 100);
                                    const discMax = maxPrice * (1 - (item.discountPercentage || 0) / 100);
                                    if (minPrice === maxPrice) {
                                      return (
                                        <span className="text-xs sm:text-sm font-black text-slate-850 dark:text-slate-100">
                                          {settings?.currency || '₹'}{discMin.toFixed(0)}
                                        </span>
                                      );
                                    }
                                    return (
                                      <span className="text-xs sm:text-sm font-black text-slate-850 dark:text-slate-100">
                                        {settings?.currency || '₹'}{discMin.toFixed(0)} - {settings?.currency || '₹'}{discMax.toFixed(0)}
                                      </span>
                                    );
                                  }
                                }
                                return (
                                  <>
                                    <span className="text-xs sm:text-sm font-black text-slate-850 dark:text-slate-100">
                                      {settings?.currency || '₹'}{discountedPrice.toFixed(0)}
                                    </span>
                                    {item.discountPercentage > 0 && (
                                      <span className="text-[10px] text-slate-400 line-through">
                                        {settings?.currency || '₹'}{item.price}
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>

                            <div className="flex items-center gap-2 text-[8px] font-bold text-slate-450 uppercase tracking-wider">
                              <span>{item.preparationTime} min</span>
                              {item.spicyLevel > 0 && (
                                <span className="flex items-center text-orange-550 dark:text-orange-400 font-extrabold gap-0.5">
                                  <Flame className="w-2.5 h-2.5 fill-current" />
                                  <span>{item.spicyLevel === 3 ? 'HOT' : item.spicyLevel === 2 ? 'MED' : 'MILD'}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Embedded Basket on Desktop */}
          <div className="hidden md:block md:col-span-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-805 p-6 rounded-3xl shadow-sm sticky top-24 max-h-[calc(100vh-120px)] flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <ShoppingBag className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider">Your Basket</h3>
              {cart.length > 0 && (
                <span className="bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400 text-[10px] font-black px-2.5 py-0.5 rounded-full ml-auto">
                  {totalItemsCount} items
                </span>
              )}
            </div>
            
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 dark:text-slate-505 my-auto">
                <ShoppingBag className="w-12 h-12 mb-3 stroke-[1.2] text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-bold">Your basket is empty</p>
                <p className="text-[10px] mt-1">Select delicious dishes to add them to your order.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {renderCartContent()}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Cart Summary Floating Bar (Mobile Only) */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-150/60 dark:border-slate-800/80 p-4 shadow-glass max-w-md mx-auto rounded-t-3xl animate-slide-up md:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative bg-brand-100 dark:bg-brand-950/40 p-3.5 rounded-2xl text-brand-655 dark:text-brand-400">
                <ShoppingBag className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 bg-brand-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                  {totalItemsCount}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subtotal</p>
                <p className="text-lg font-black text-slate-800 dark:text-slate-100">
                  {settings?.currency || '₹'}{getCartSubtotal().toFixed(0)}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setIsCartOpen(true)}
              className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-3.5 rounded-2xl transition-all shadow-lg hover:shadow-brand-500/20 flex items-center gap-1.5 text-sm"
            >
              <span>Review Basket</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Item Detail & Customization Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl rounded-b-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800/60 animate-scale-in">
            <div className="relative h-56 bg-slate-100">
              <img src={selectedItem.image} alt={selectedItem.name} className="w-full h-full object-cover" />
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-full hover:bg-black/80 transition-colors shadow-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{selectedItem.name}</h3>
                  <span className="text-xs text-slate-400 font-semibold">{t.preparationTime}: {selectedItem.preparationTime} {t.min}</span>
                </div>
                <span className={`w-4 h-4 border rounded-md flex items-center justify-center mt-1 ${
                  selectedItem.isVeg ? 'border-green-600' : 'border-red-650'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    selectedItem.isVeg ? 'bg-green-600' : 'bg-red-655'
                  }`}></span>
                </span>
              </div>

              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6 font-medium">
                {selectedItem.description ? selectedItem.description.split('||variants:')[0] : ''}
              </p>

              {/* Portion Variants Selector */}
              {(() => {
                let variants: { name: string; price: number }[] = [];
                if (selectedItem.description && selectedItem.description.includes('||variants:')) {
                  const [, variantsStr] = selectedItem.description.split('||variants:');
                  variants = variantsStr.split(';').map(v => {
                    const [name, price] = v.split('=');
                    return { name, price: Number(price) };
                  });
                }

                if (variants.length === 0) return null;

                return (
                  <div className="mb-5">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-450 mb-2">
                      {t.selectPortion}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {variants.map(v => {
                        const discountedPrice = v.price * (1 - (selectedItem.discountPercentage || 0) / 100);
                        const isSelected = selectedVariantName === v.name;
                        return (
                          <button
                            key={v.name}
                            type="button"
                            onClick={() => setSelectedVariantName(v.name)}
                            className={`flex py-2.5 px-3.5 rounded-2xl border font-bold text-xs justify-between items-center transition-all ${
                              isSelected
                                ? 'border-brand-600 bg-brand-50/10 text-brand-600 dark:border-brand-500 dark:bg-brand-950/20 dark:text-brand-400 shadow-sm'
                                : 'border-slate-200 text-slate-555 dark:border-slate-800 hover:bg-slate-55/50 dark:hover:bg-slate-850'
                            }`}
                          >
                            <span>{v.name}</span>
                            <span className="font-extrabold">{settings?.currency || '₹'}{discountedPrice.toFixed(0)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Special Instructions Field */}
              <div className="mb-6">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  {t.specialInstructions}
                </label>
                <textarea
                  placeholder={t.specialInstructionsPlaceholder}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                />
              </div>

              {/* Quantity Controls & Price */}
              <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800">
                {(() => {
                  let currentPrice = selectedItem.price;
                  if (selectedItem.description && selectedItem.description.includes('||variants:')) {
                    const [, variantsStr] = selectedItem.description.split('||variants:');
                    const variants = variantsStr.split(';').map(v => {
                      const [name, price] = v.split('=');
                      return { name, price: Number(price) };
                    });
                    const matched = variants.find(v => v.name === selectedVariantName);
                    if (matched) {
                      currentPrice = matched.price;
                    }
                  }
                  const discountedItemPrice = currentPrice * (1 - (selectedItem.discountPercentage || 0) / 100);
                  
                  return (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-455">{t.itemTotal}</p>
                      <p className="text-xl font-black text-slate-850 dark:text-slate-100">
                        {settings?.currency || '₹'}{(discountedItemPrice * quantity).toFixed(0)}
                      </p>
                    </div>
                  );
                })()}

                <div className="flex items-center gap-3 bg-slate-550/5 dark:bg-slate-800/80 px-3.5 py-2 rounded-2xl border border-slate-100/50 dark:border-slate-700/50">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-8 h-8 flex items-center justify-center font-bold text-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                  >
                    -
                  </button>
                  <span className="font-extrabold w-5 text-center text-slate-850 dark:text-slate-150">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-8 h-8 flex items-center justify-center font-bold text-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-brand-500/10 mt-5 flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{t.addToBasket}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-0 md:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl w-full max-w-md h-[85vh] flex flex-col shadow-2xl border-t border-slate-100 dark:border-slate-850 animate-slide-up">
            
            {/* Cart Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-brand-655" />
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">My Basket</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-slate-400 hover:text-slate-655 dark:hover:text-slate-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Cart Items list & summary using helper */}
            <div className="flex-1 overflow-hidden p-5">
              {renderCartContent()}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMenu;
