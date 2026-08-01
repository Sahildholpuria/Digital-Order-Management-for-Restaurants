import React, { useState, useEffect, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { FoodItem, MenuCategory } from '../../types';
import { Search, ShoppingBag, Flame, Sparkles, Utensils, X, Bell, Receipt, CheckCircle, ArrowRight, ClipboardList, ChevronRight, Clock } from 'lucide-react';
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
    lang,
    setLang,
    t,
  } = useRestaurant();

  // Returns a clean, short display number from the actual table record.
  // Never displays raw 13-digit timestamp IDs (e.g. 1785560211444).
  const getTableDisplayNumber = () => {
    const target = currentTable || tables.find(t => t.id === tableId || t.number === tableId);
    
    if (target?.number) {
      const clean = target.number.replace(/^table[\s\-_]*/i, '').trim();
      if (clean && !/^\d{7,}$/.test(clean)) {
        return clean;
      }
    }

    if (tables && tables.length > 0) {
      const idx = tables.findIndex(t => t.id === tableId || t.id === currentTable?.id || t.number === tableId);
      if (idx !== -1) {
        return `${idx + 1}`;
      }
    }

    const cleanId = tableId ? tableId.replace(/^table[\s\-_]*/i, '').trim() : '';
    if (cleanId && !/^\d{7,}$/.test(cleanId)) {
      return cleanId;
    }

    return '1';
  };

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

  // Splash Screen state for QR scan greeting
  const [showSplash, setShowSplash] = useState(() => {
    const key = `splash_seen_${tableId}`;
    return !sessionStorage.getItem(key);
  });
  const [splashProgress, setSplashProgress] = useState(0);

  useEffect(() => {
    if (!showSplash) return;

    const interval = setInterval(() => {
      setSplashProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setShowSplash(false);
            sessionStorage.setItem(`splash_seen_${tableId}`, 'true');
          }, 250);
          return 100;
        }
        return prev + 4;
      });
    }, 90);

    return () => clearInterval(interval);
  }, [showSplash, tableId]);

  const handleDismissSplash = () => {
    setShowSplash(false);
    sessionStorage.setItem(`splash_seen_${tableId}`, 'true');
  };

  // Active orders placed at this table in this session. Completed (settled) and cancelled orders clear immediately.
  const tableOrders = useMemo(() => {
    return orders
      .filter(o => {
        if (o.tableId !== tableId) return false;
        if (o.status === 'completed' || o.status === 'cancelled') {
          return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, tableId]);

  useEffect(() => {
    if (tableId) {
      setCurrentTableById(tableId);
    }
  }, [tableId, setCurrentTableById]);

  // Filter items memoized for zero-lag UI response
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return foodItems.filter(item => {
      if (!item.isAvailable) return false;
      const matchesSearch = !query || 
                            item.name.toLowerCase().includes(query) || 
                            item.description.toLowerCase().includes(query);
      const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
      const matchesVeg = !vegOnly || item.isVeg;
      const matchesPopular = !popularOnly || item.isPopular || item.isRecommended;
      return matchesSearch && matchesCategory && matchesVeg && matchesPopular;
    });
  }, [foodItems, searchQuery, selectedCategory, vegOnly, popularOnly]);

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

  // Anti-spam cooldown timestamps
  const [lastWaiterCallTime, setLastWaiterCallTime] = useState<number>(0);
  const [lastBillRequestTime, setLastBillRequestTime] = useState<number>(0);

  const sanitizeInput = (str: string, maxLen = 250): string => {
    if (!str) return '';
    return str
      .replace(/<[^>]*>?/gm, '') // Strip HTML tags
      .trim()
      .slice(0, maxLen);
  };

  const handleAddToCart = () => {
    if (selectedItem) {
      const cleanInstructions = sanitizeInput(specialInstructions, 200);
      addToCart(selectedItem, quantity, cleanInstructions, selectedVariantName || undefined);
      setSelectedItem(null);
      setSpecialInstructions('');
      
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
    const now = Date.now();
    if (now - lastWaiterCallTime < 15000) {
      const remainingSecs = Math.ceil((15000 - (now - lastWaiterCallTime)) / 1000);
      showToast(`Please wait ${remainingSecs}s before calling waiter again.`, 'info');
      return;
    }

    try {
      await callWaiter();
      setLastWaiterCallTime(now);
      setWaiterCalled(true);
      showToast('Staff notified. A waiter is on their way to your table!', 'success');
      setTimeout(() => setWaiterCalled(false), 5000);
    } catch (_) {
      showToast('Failed to notify staff. Please try again.', 'error');
    }
  };

  const handleRequestBill = async () => {
    const now = Date.now();
    if (now - lastBillRequestTime < 15000) {
      const remainingSecs = Math.ceil((15000 - (now - lastBillRequestTime)) / 1000);
      showToast(`Please wait ${remainingSecs}s before requesting bill again.`, 'info');
      return;
    }

    try {
      await requestBill();
      setLastBillRequestTime(now);
      setBillRequested(true);
      showToast('Bill request sent. A cashier will assist you shortly!', 'success');
      setTimeout(() => setBillRequested(false), 5000);
    } catch (_) {
      showToast('Failed to request bill. Please try again.', 'error');
    }
  };

  // Show loading state while the initial context or settings list hasn't arrived yet.
  if (loading || !tablesLoaded || !settings) {
    return (
      <PageLoader
        message="LOADING GOURMET MENU..."
        subtext="Syncing live restaurant items & kitchen status"
        fullScreen={true}
      />
    );
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
      {/* Welcome Splash Screen Overlay */}
      {showSplash && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 text-white animate-fade-in overflow-hidden">
          {/* Background Glow Orbs */}
          <div className="absolute top-1/4 -left-20 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
          <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Badge */}
          <div className="relative z-10 pt-4 sm:pt-6 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[10px] font-black uppercase tracking-widest text-emerald-300 shadow-lg">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Digital Order & Dining</span>
            </div>
          </div>

          {/* Center Welcome Card */}
          <div className="relative z-10 max-w-sm w-full text-center space-y-5 sm:space-y-6 my-auto px-2">
            {/* Logo / Avatar with animated glowing rings */}
            <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28">
              <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 opacity-75 blur-md animate-pulse" />
              <div className="relative w-full h-full rounded-full bg-slate-900 p-1 border-2 border-white/30 overflow-hidden shadow-2xl flex items-center justify-center">
                {settings?.logoUrl ? (
                  <img src={settings.logoUrl} alt={settings.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-600 to-teal-800 rounded-full flex items-center justify-center">
                    <Utensils className="w-12 h-12 text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Restaurant Name & Address */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans drop-shadow-md leading-snug">
                {settings?.name || 'Gourmet Restaurant'}
              </h1>
              <p className="text-xs text-emerald-200/90 font-medium mt-1 max-w-xs mx-auto line-clamp-2">
                {settings?.address || 'Fresh gourmet dishes crafted with passion & served hot to your table.'}
              </p>
            </div>

            {/* Table Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-black uppercase tracking-wider text-emerald-200">
                Seated at Table <span className="text-amber-300 font-extrabold text-sm font-mono">#{getTableDisplayNumber()}</span>
              </span>
            </div>

            {/* Warm Greeting Card */}
            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-slate-200 text-xs sm:text-sm font-medium leading-relaxed shadow-lg">
              <p className="flex items-center justify-center gap-1.5 font-black text-amber-300 mb-1 text-xs uppercase tracking-wider">
                <span>✨ Welcome & Bon Appétit ✨</span>
              </p>
              <span>
                We are delighted to serve you today! Browse our freshly prepared delicacies, customize your dishes, and place your order directly from your table.
              </span>
            </div>
          </div>

          {/* Bottom Controls & Progress */}
          <div className="relative z-10 w-full max-w-sm pb-4 sm:pb-6 space-y-4 text-center">
            {/* Animated Loader Bar */}
            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden backdrop-blur-sm border border-white/10">
              <div 
                className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 h-full transition-all duration-100 ease-out"
                style={{ width: `${splashProgress}%` }}
              />
            </div>

            {/* Manual Dismiss Button */}
            <button
              onClick={handleDismissSplash}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-900/40 border border-emerald-400/30 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <span>Explore Menu</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/80 px-3 sm:px-4 py-2.5 shadow-sm">
        <div className="max-w-md md:max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {settings?.logoUrl ? (
              <img 
                src={settings.logoUrl} 
                alt={settings.name} 
                className="w-9 h-9 rounded-2xl object-cover border border-slate-200 dark:border-slate-800 shadow-sm"
              />
            ) : (
              <div className="w-9 h-9 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-sm">
                <Utensils className="w-4 h-4" />
              </div>
            )}
            <div>
              <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-slate-100 font-sans leading-tight">
                {settings?.name || 'Gourmet Restaurant'}
              </h1>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-emerald-700 dark:text-emerald-400">Table #{getTableDisplayNumber()}</span>
              </div>
            </div>
          </div>

          {/* Quick Staff Interactions */}
          <div className="flex gap-1.5 sm:gap-2 items-center">

            {(settings?.enableWaiterCall ?? true) && (
              <button
                onClick={handleCallWaiter}
                disabled={waiterCalled}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer active:scale-95 shadow-sm ${
                  waiterCalled 
                    ? 'bg-amber-500 border-amber-500 text-white shadow-md'
                    : 'bg-white border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
                title={waiterCalled ? "Waiter Called" : "Call Waiter"}
              >
                <Bell className={`w-3.5 h-3.5 ${waiterCalled ? 'animate-bounce' : 'text-amber-500'}`} />
                <span className="hidden sm:inline">{waiterCalled ? t.waiterCalled : t.callWaiter}</span>
              </button>
            )}
            
            {(settings?.enableBillRequest ?? true) && (
              <button
                onClick={handleRequestBill}
                disabled={billRequested}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer active:scale-95 shadow-sm ${
                  billRequested 
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                    : 'bg-white border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
                title={billRequested ? "Bill Requested" : "Request Bill"}
              >
                <Receipt className={`w-3.5 h-3.5 ${billRequested ? '' : 'text-emerald-500'}`} />
                <span className="hidden sm:inline">{billRequested ? t.billRequested : t.requestBill}</span>
              </button>
            )}

            {/* My Orders button with badge */}
            <button
              onClick={() => setIsOrdersOpen(true)}
              className="relative flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border bg-slate-900 border-slate-800 text-white hover:bg-slate-800 cursor-pointer active:scale-95 shadow-sm"
              title="Live Orders"
            >
              <ClipboardList className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">{t.liveOrders}</span>
              {tableOrders.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 text-slate-950 text-[9px] font-black rounded-full flex items-center justify-center shadow-md border border-white">
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Panel */}
          <div
            className="relative bg-white dark:bg-slate-900 rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl border-t border-slate-200 dark:border-slate-800 animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="font-black text-slate-900 dark:text-slate-100 text-base">My Live Orders</h2>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                  Table #{getTableDisplayNumber()} &bull; {tableOrders.length} order{tableOrders.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setIsOrdersOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Orders List */}
            <div className="overflow-y-auto flex-1 px-4 py-4 space-y-3">
              {tableOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                  <p className="text-sm font-black text-slate-400">No orders placed yet</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Select delicious dishes and place your order!</p>
                </div>
              ) : (
                tableOrders.map(order => {
                  const statusColors: Record<string, string> = {
                    pending:   'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-900/40',
                    accepted:  'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/40',
                    preparing: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900/40',
                    ready:     'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40',
                    served:    'bg-green-50 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-900/40',
                    completed: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
                    cancelled: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/40',
                  };
                  const statusDot: Record<string, string> = {
                    pending: 'bg-yellow-400 animate-pulse', accepted: 'bg-blue-500 animate-pulse',
                    preparing: 'bg-orange-500 animate-pulse', ready: 'bg-emerald-500 animate-pulse',
                    served: 'bg-green-500', completed: 'bg-slate-400', cancelled: 'bg-red-500',
                  };

                  return (
                    <div
                      key={order.id}
                      className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800 shadow-sm"
                    >
                      {/* Order header row */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-black text-slate-900 dark:text-slate-100 text-sm font-mono">{order.orderNumber}</p>
                          <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-emerald-500" />
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusColors[order.status] || statusColors.pending}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDot[order.status] || 'bg-yellow-400'}`} />
                          {order.status}
                        </span>
                      </div>

                      {/* Items list */}
                      <div className="space-y-1 mb-3">
                        {order.items.slice(0, 3).map(item => (
                          <div key={item.itemId} className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-700 dark:text-slate-300">{item.name} × {item.quantity}</span>
                            <span className="text-slate-900 dark:text-slate-100 font-black">{settings?.currency || '₹'}{(item.price * item.quantity).toFixed(0)}</span>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <p className="text-[10px] text-slate-400 font-bold">+{order.items.length - 3} more items</p>
                        )}
                      </div>

                      {/* Total + Track button */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                          {settings?.currency || '₹'}{order.grandTotal.toFixed(0)}
                        </span>
                        {order.status !== 'completed' && order.status !== 'cancelled' && (
                          <button
                            onClick={() => {
                              setIsOrdersOpen(false);
                              window.location.pathname = `/menu/${tableId}/track/${order.id}`;
                            }}
                            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95"
                          >
                            <span>Track Order</span>
                            <ChevronRight className="w-3.5 h-3.5" />
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
      <main className="max-w-md md:max-w-5xl mx-auto px-3 sm:px-4 mt-4 sm:mt-6">
        {/* Eye-catching Hero Welcome Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 text-white p-5 sm:p-6 shadow-xl shadow-emerald-900/10 mb-6 group transition-all duration-500">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-400/20 rounded-full blur-xl group-hover:scale-125 transition-transform duration-700 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-block bg-white/20 backdrop-blur-md text-emerald-100 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full mb-2 border border-white/20">
                Digital Order & Dining
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                {settings?.name || 'Gourmet Restaurant'}
              </h2>
              <p className="text-xs text-white/80 font-medium mt-1">
                {settings?.address || 'Fresh gourmet dishes crafted & served hot to your table.'}
              </p>
            </div>

            <div className="flex items-center gap-2 sm:flex-col sm:items-end">
              <div className="bg-white/15 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/25 text-center shadow-lg">
                <span className="text-[9px] uppercase tracking-widest text-white/80 block font-black">Your Table</span>
                <span className="text-lg font-black tracking-wider text-amber-300">
                  #{getTableDisplayNumber()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left Column: Menu catalogue */}
          <div className="md:col-span-8 space-y-6">
            
            {/* Search Input Box */}
            <div className="relative mb-4 shadow-sm rounded-2xl">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <Search className="w-4 h-4 text-emerald-500" />
              </span>
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl py-3.5 pl-11 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 shadow-sm font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Filter Tags */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setVegOnly(!vegOnly)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black border transition-all duration-200 active:scale-95 whitespace-nowrap cursor-pointer shadow-sm ${
                  vegOnly
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-500/20'
                    : 'bg-white border-slate-250 text-slate-800 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full bg-green-500 border border-white ${vegOnly ? 'animate-pulse' : ''}`}></span>
                {t.vegOnly}
              </button>
              <button
                onClick={() => setPopularOnly(!popularOnly)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black border transition-all duration-200 active:scale-95 whitespace-nowrap cursor-pointer shadow-sm ${
                  popularOnly
                    ? 'bg-amber-500 border-amber-500 text-white shadow-amber-500/20'
                    : 'bg-white border-slate-250 text-slate-800 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 hover:bg-slate-50'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-current" />
                {t.popularOnly}
              </button>
            </div>

            {/* Category Horizontal Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">{t.categories}</h2>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{categories.length + 1} sections</span>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 whitespace-nowrap border cursor-pointer active:scale-95 ${
                    selectedCategory === 'all'
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/25 scale-[1.02]'
                      : 'bg-white text-slate-900 border-slate-250 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 hover:border-emerald-500'
                  }`}
                >
                  {t.allItems}
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 whitespace-nowrap border cursor-pointer active:scale-95 ${
                      selectedCategory === cat.id
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/25 scale-[1.02]'
                        : 'bg-white text-slate-900 border-slate-250 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 hover:border-emerald-500'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Food Items Grid */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-base font-black text-slate-900 dark:text-slate-100 font-sans tracking-tight">{t.ourMenu}</h2>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">{filteredItems.length} {t.options}</span>
              </div>

              {filteredItems.length === 0 ? (
                <div className="bg-white/80 dark:bg-slate-900/60 rounded-3xl p-10 text-center border border-slate-200 dark:border-slate-800 backdrop-blur-md animate-scale-in">
                  <Utensils className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-700 dark:text-slate-300 text-sm font-extrabold">{t.noItemsFound}</p>
                  <p className="text-xs text-slate-400 mt-1 font-medium">Try clearing your search query or switching filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredItems.map((item, index) => {
                    const discountedPrice = item.price * (1 - (item.discountPercentage || 0) / 100);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleOpenItem(item)}
                        className="relative bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 flex gap-4 cursor-pointer transition-all duration-300 ease-out shadow-sm hover:shadow-xl hover:shadow-emerald-600/10 hover:-translate-y-1 hover:border-emerald-500/60 dark:hover:border-emerald-500/50 group backdrop-blur-md overflow-hidden"
                      >
                        {/* Hover Gradient Top Line */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                          <LazyImage 
                            src={item.image} 
                            alt={item.name} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                            width={180}
                            priority={index < 6}
                          />
                          
                          {item.discountPercentage > 0 && (
                            <span className="absolute top-1 left-1 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-md animate-pulse">
                              {item.discountPercentage}% OFF
                            </span>
                          )}

                          {item.isPopular && (
                            <span className="absolute bottom-1 right-1 bg-amber-500 text-slate-950 text-[8px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-md uppercase tracking-wider">
                              <Sparkles className="w-2 h-2 fill-current" />
                              POP
                            </span>
                          )}
                        </div>

                        <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs sm:text-sm leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate font-sans">
                                {item.name}
                              </h3>
                              <span className={`w-3.5 h-3.5 border rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                item.isVeg ? 'border-green-600 bg-green-500/10' : 'border-red-600 bg-red-500/10'
                              }`} title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  item.isVeg ? 'bg-green-600' : 'bg-red-600'
                                }`}></span>
                              </span>
                            </div>
                            
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] line-clamp-2 mt-1 leading-normal font-medium truncate-2-lines">
                              {item.description ? item.description.split('||variants:')[0] : ''}
                            </p>
                          </div>

                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
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
                                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                                          {settings?.currency || '₹'}{discMin.toFixed(0)}
                                        </span>
                                      );
                                    }
                                    return (
                                      <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                                        {settings?.currency || '₹'}{discMin.toFixed(0)} - {settings?.currency || '₹'}{discMax.toFixed(0)}
                                      </span>
                                    );
                                  }
                                }
                                return (
                                  <>
                                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                                      {settings?.currency || '₹'}{discountedPrice.toFixed(0)}
                                    </span>
                                    {item.discountPercentage > 0 && (
                                      <span className="text-[10px] text-slate-400 line-through font-semibold">
                                        {settings?.currency || '₹'}{item.price}
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>

                            {/* Touch-Optimized + ADD / Stepper */}
                            {(() => {
                              const existingInCart = cart.find(c => c.itemId === item.id);
                              const qty = existingInCart ? existingInCart.quantity : 0;
                              if (qty === 0) {
                                return (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenItem(item);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black px-3 py-1.5 rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>+ ADD</span>
                                  </button>
                                );
                              }
                              return (
                                <div 
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-600/20 px-2 py-1 gap-2 border border-emerald-500/30"
                                >
                                  <button
                                    onClick={() => {
                                      if (qty <= 1) {
                                        removeFromCart(item.id);
                                      } else {
                                        updateCartQuantity(item.id, qty - 1);
                                      }
                                    }}
                                    className="w-5 h-5 flex items-center justify-center font-black text-xs hover:bg-emerald-700 rounded-md transition-colors cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="text-xs font-black min-w-3 text-center">{qty}</span>
                                  <button
                                    onClick={() => {
                                      updateCartQuantity(item.id, qty + 1);
                                    }}
                                    className="w-5 h-5 flex items-center justify-center font-black text-xs hover:bg-emerald-700 rounded-md transition-colors cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              );
                            })()}
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
        <div className="fixed bottom-4 inset-x-4 z-40 bg-emerald-800/95 dark:bg-emerald-950/95 backdrop-blur-xl border border-emerald-500/40 text-white p-3.5 pl-4 pr-3 shadow-2xl shadow-emerald-900/30 max-w-md mx-auto rounded-3xl animate-slide-up md:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative bg-white/20 p-2.5 rounded-2xl text-white border border-white/30">
                <ShoppingBag className="w-5 h-5 animate-pulse" />
                <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-900 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg border border-white">
                  {totalItemsCount}
                </span>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-200">Total Basket</p>
                <p className="text-base font-black tracking-tight text-white">
                  {settings?.currency || '₹'}{getCartGrandTotal().toFixed(0)}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setIsCartOpen(true)}
              className="bg-white hover:bg-emerald-50 text-emerald-900 font-black px-5 py-3 rounded-2xl transition-all duration-200 active:scale-95 flex items-center gap-2 text-xs uppercase tracking-wider shadow-lg cursor-pointer"
            >
              <span>Review Cart</span>
              <ArrowRight className="w-4 h-4 text-emerald-700" />
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
