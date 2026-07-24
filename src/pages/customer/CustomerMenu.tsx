import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { FoodItem, MenuCategory } from '../../types';
import { Search, ShoppingBag, Flame, Sparkles, Utensils, X, Bell, Receipt, CheckCircle, ArrowRight, ClipboardList, ChevronRight, Clock, Globe } from 'lucide-react';
import confetti from 'canvas-confetti';
import { translations, Language } from '../../translations';
import { CustomerMenuLoader } from '../../components/CustomerMenuLoader';
import { PageLoader } from '../../components/PageLoader';

interface CustomerMenuProps {
  tableId: string;
}

// Global in-memory image cache to render previously loaded images instantly (0ms delay)
const globalLoadedImageCache = new Set<string>();

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  priority?: boolean;
}

const LazyImage: React.FC<LazyImageProps> = ({ 
  src, 
  alt, 
  className = '', 
  width = 200,
  priority = false 
}) => {
  const getOptimizedUrl = (urlStr: string) => {
    if (!urlStr) return '';
    try {
      if (urlStr.includes('images.unsplash.com')) {
        const u = new URL(urlStr);
        u.searchParams.set('w', width.toString());
        u.searchParams.set('auto', 'format');
        u.searchParams.set('fit', 'crop');
        u.searchParams.set('q', '75');
        return u.toString();
      }
    } catch (_) {}
    return urlStr;
  };

  const [imgSrc, setImgSrc] = useState(() => getOptimizedUrl(src));
  const [isLoaded, setIsLoaded] = useState(() => globalLoadedImageCache.has(imgSrc));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const opt = getOptimizedUrl(src);
    setImgSrc(opt);
    setHasError(false);
    if (globalLoadedImageCache.has(opt) || globalLoadedImageCache.has(src)) {
      setIsLoaded(true);
    }
  }, [src, width]);

  const handleLoad = () => {
    globalLoadedImageCache.add(imgSrc);
    globalLoadedImageCache.add(src);
    setIsLoaded(true);
  };

  const handleError = () => {
    if (imgSrc !== src) {
      // Fallback to raw un-transformed src if optimized URL failed
      setImgSrc(src);
    } else {
      setHasError(true);
      setIsLoaded(true);
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
      {(!isLoaded || hasError || !src) && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-150 dark:bg-slate-800 text-slate-350 dark:text-slate-655">
          <Utensils className="w-5 h-5 stroke-[1.5]" />
        </div>
      )}
      {src && !hasError && (
        <img
          src={imgSrc}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          // @ts-ignore
          fetchpriority={priority ? 'high' : 'low'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`${className} transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
};

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
    showToast,
  } = useRestaurant();

  // Returns a clean, short display number from the actual table record.
  // Always use currentTable.number from DB; never fall back to raw timestamp tableId.
  const getTableDisplayNumber = () => {
    if (currentTable?.number) {
      // Strip any "table-" prefix the number field might have, return clean label
      return currentTable.number.replace(/^table[\s\-_]*/i, '');
    }
    return '—';
  };

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
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Active orders placed at this table in this session. Completed (settled) and cancelled orders clear immediately.
  const tableOrders = orders
    .filter(o => {
      if (o.tableId !== tableId) return false;
      // Immediately clear completed/settled and cancelled orders from live order history
      if (o.status === 'completed' || o.status === 'cancelled') {
        return false;
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

  const isSubscriptionExpired = () => {
    if (!settings) return false;
    const status = settings.subscriptionStatus || 'trial';
    const expiry = settings.subscriptionExpiresAt;
    if (status === 'expired' || status === 'suspended') return true;
    if (expiry && new Date(expiry) < new Date()) return true;
    return false;
  };

  const handlePlaceOrder = async () => {
    if (isPlacingOrder) return;
    if (isSubscriptionExpired()) {
      showToast("This restaurant's ordering service is currently inactive. Please contact the staff.", 'error');
      return;
    }
    setIsPlacingOrder(true);
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
      showToast('Failed to place order. Please try again.', 'error');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleCallWaiter = async () => {
    try {
      await callWaiter();
      setWaiterCalled(true);
      showToast('Staff notified. A waiter is on their way to your table!', 'success');
      setTimeout(() => setWaiterCalled(false), 5000);
    } catch (_) {
      showToast('Failed to notify staff. Please try again.', 'error');
    }
  };

  const handleRequestBill = async () => {
    try {
      await requestBill();
      setBillRequested(true);
      showToast('Bill request sent. A cashier will assist you shortly!', 'success');
      setTimeout(() => setBillRequested(false), 5000);
    } catch (_) {
      showToast('Failed to request bill. Please try again.', 'error');
    }
  };

  // Show loading state while the initial context or settings list hasn't arrived yet.
  if (loading || !tablesLoaded || !settings) {
    return <CustomerMenuLoader restaurantName={settings?.name} />;
  }

  if (isPlacingOrder) {
    return (
      <PageLoader
        message="TRANSMITTING YOUR ORDER..."
        subtext="Sending your dish items directly to the kitchen staff"
        fullScreen={true}
      />
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
              <span className="font-extrabold text-slate-800 dark:text-slate-200">{getTableDisplayNumber()}</span>
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
            <span>Taxes & GST ({settings?.taxPercentage ?? 0}%)</span>
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
          type="button"
          onClick={handlePlaceOrder}
          disabled={isSubscriptionExpired() || isPlacingOrder}
          className={`w-full font-bold py-3.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer ${
            isSubscriptionExpired() || isPlacingOrder
              ? 'bg-slate-350 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-80 shadow-none'
              : 'bg-brand-600 hover:bg-brand-700 text-white hover:shadow-brand-500/10'
          }`}
        >
          {isPlacingOrder ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Placing Order...</span>
            </>
          ) : isSubscriptionExpired() ? (
            'Ordering Service Inactive'
          ) : (
            'Confirm & Place Order'
          )}
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
                {settings?.name || 'Restaurant Menu'}
              </h1>
              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <span className="inline-block w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                <span>Table {getTableDisplayNumber()}</span>
              </div>
            </div>
          </div>

          {/* Quick Staff Interactions */}
          <div className="flex gap-1.5 sm:gap-2">
            {/* Language Switcher */}
            <button
              onClick={() => {
                const nextLang = lang === 'en' ? 'hi' : 'en';
                setLang(nextLang);
                localStorage.setItem('customer_lang', nextLang);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              title="Change Language"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'हिन्दी' : 'EN'}</span>
            </button>

            {(settings?.enableWaiterCall ?? true) && (
              <button
                onClick={handleCallWaiter}
                disabled={waiterCalled}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  waiterCalled 
                    ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
                title={waiterCalled ? "Waiter Called" : "Call Waiter"}
              >
                <Bell className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{waiterCalled ? t.waiterCalled : t.callWaiter}</span>
              </button>
            )}
            
            {(settings?.enableBillRequest ?? true) && (
              <button
                onClick={handleRequestBill}
                disabled={billRequested}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  billRequested 
                    ? 'bg-green-600 border-green-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
                title={billRequested ? "Bill Requested" : "Request Bill"}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{billRequested ? t.billRequested : t.requestBill}</span>
              </button>
            )}

            {/* My Orders button with badge */}
            <button
              onClick={() => setIsOrdersOpen(true)}
              className="relative flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border bg-white border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
              title="Live Orders"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.liveOrders}</span>
              {tableOrders.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-brand-600 text-white text-[8px] font-black rounded-full flex items-center justify-center">
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
                  Table {getTableDisplayNumber()} · {tableOrders.length} order{tableOrders.length !== 1 ? 's' : ''}
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
        {/* Eye-catching Hero Welcome Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-700 text-white p-6 shadow-xl shadow-brand-500/15 mb-6 group transition-all duration-500 hover:shadow-brand-500/25">
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-purple-500/20 rounded-full blur-xl group-hover:scale-125 transition-transform duration-700 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md text-white mb-2 shadow-inner">
                <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                Live Digital QR Ordering
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                {settings?.name || 'Gourmet Dining'}
              </h2>
              <p className="text-xs text-white/80 font-medium mt-1">
                {settings?.address || 'Fresh gourmet dishes crafted & served hot to your table.'}
              </p>
            </div>

            <div className="flex items-center gap-2 sm:flex-col sm:items-end">
              <div className="bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/20 text-center">
                <span className="text-[9px] uppercase tracking-widest text-white/70 block font-bold">Table</span>
                <span className="text-base font-black tracking-wider text-amber-300">
                  #{getTableDisplayNumber()}
                </span>
              </div>
            </div>
          </div>
        </div>

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
                className="w-full bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all duration-300 shadow-sm hover:shadow-md font-medium backdrop-blur-md"
              />
            </div>

            {/* Quick Filter Tags */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1.5 no-scrollbar">
              <button
                onClick={() => setVegOnly(!vegOnly)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all duration-200 active:scale-95 whitespace-nowrap ${
                  vegOnly
                    ? 'bg-green-500/15 border-green-500 text-green-600 dark:text-green-400 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-555 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full bg-green-500 border border-white ${vegOnly ? 'bg-green-500 animate-pulse' : ''}`}></span>
                {t.vegOnly}
              </button>
              <button
                onClick={() => setPopularOnly(!popularOnly)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all duration-200 active:scale-95 whitespace-nowrap ${
                  popularOnly
                    ? 'bg-brand-500/15 border-brand-550 text-brand-655 dark:text-brand-400 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-555 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                {t.popularOnly}
              </button>
            </div>

            {/* Category Horizontal Bar */}
            <div className="mb-6">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">{t.categories}</h2>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap border cursor-pointer active:scale-95 ${
                    selectedCategory === 'all'
                      ? 'bg-gradient-to-r from-brand-600 to-indigo-600 border-brand-500 text-white shadow-lg shadow-brand-500/25 scale-[1.02]'
                      : 'bg-white text-slate-555 border-slate-200/60 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:scale-105'
                  }`}
                >
                  {t.allItems}
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap border cursor-pointer active:scale-95 ${
                      selectedCategory === cat.id
                        ? 'bg-gradient-to-r from-brand-600 to-indigo-600 border-brand-500 text-white shadow-lg shadow-brand-500/25 scale-[1.02]'
                        : 'bg-white text-slate-555 border-slate-200/60 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:scale-105'
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
                  {filteredItems.map((item, index) => {
                    const discountedPrice = item.price * (1 - (item.discountPercentage || 0) / 100);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleOpenItem(item)}
                        className="relative bg-white/90 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-4 flex gap-4 cursor-pointer transition-all duration-300 ease-out shadow-sm hover:shadow-xl hover:shadow-brand-500/10 hover:-translate-y-1 hover:border-brand-500/60 dark:hover:border-brand-500/50 group backdrop-blur-md overflow-hidden"
                      >
                        {/* Hover Gradient Top Line */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 via-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="relative w-22 h-22 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-855 flex-shrink-0">
                          <LazyImage 
                            src={item.image} 
                            alt={item.name} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                            width={160}
                            priority={index < 6}
                          />
                          
                          {item.discountPercentage > 0 && (
                            <span className="absolute top-1 left-1 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-sm animate-pulse-slow">
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

                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/40">
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

      <footer className="py-6 text-center border-t border-slate-100 dark:border-slate-800/50 mt-12 bg-white/30 dark:bg-slate-900/10 backdrop-blur-sm">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-wider uppercase">
          Build by <span className="text-brand-655 dark:text-brand-400 font-extrabold">RestaurantsOS Pvt. Ltd</span>
        </p>
      </footer>

      {/* Cart Summary Floating Bar (Mobile Only) */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 inset-x-4 z-40 bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/20 dark:border-slate-800 text-white p-3.5 pl-4 pr-3 shadow-2xl max-w-md mx-auto rounded-3xl animate-slide-up hover:-translate-y-0.5 transition-all duration-300 md:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative bg-brand-500/20 p-3 rounded-2xl text-amber-300 border border-brand-500/30">
                <ShoppingBag className="w-5 h-5 animate-pulse-slow" />
                <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-brand-500 to-indigo-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg border border-white/20">
                  {totalItemsCount}
                </span>
              </div>
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Total Basket</p>
                <p className="text-base font-black tracking-tight text-white">
                  {settings?.currency || '₹'}{getCartGrandTotal().toFixed(0)}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setIsCartOpen(true)}
              className="bg-gradient-to-r from-brand-500 via-indigo-600 to-purple-600 hover:shadow-brand-500/30 text-white font-extrabold px-5 py-3 rounded-2xl transition-all duration-200 active:scale-95 hover:scale-105 flex items-center gap-2 text-xs uppercase tracking-wider shadow-lg cursor-pointer"
            >
              <span>Review Cart</span>
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
              <LazyImage src={selectedItem.image} alt={selectedItem.name} className="w-full h-full object-cover" width={480} />
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
