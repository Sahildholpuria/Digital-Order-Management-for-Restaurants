import React, { useState, useEffect, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { FoodItem, MenuCategory, DietaryType } from '../../types';
import { Search, ShoppingBag, Flame, Sparkles, Utensils, X, Bell, Receipt, CheckCircle, ArrowRight, ClipboardList, ChevronRight, Clock, AlertCircle, Globe, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { translations, Language } from '../../translations';
import { CustomerMenuLoader } from '../../components/CustomerMenuLoader';
import { PageLoader } from '../../components/PageLoader';
import { FSSAIIndicator } from '../../components/FSSAIIndicator';
import { RestaurantsOSLogo } from '../../components/RestaurantsOSLogo';
import { parseFoodItemDescription } from '../../services/database';

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
    tableNotFound,
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
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non_veg'>('all');
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
  }, [tableId, setCurrentTableById, tables]);

  // Filter items memoized for zero-lag UI response
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return foodItems.filter(item => {
      if (!item.isAvailable) return false;
      const matchesSearch = !query || 
                            item.name.toLowerCase().includes(query) || 
                            item.description.toLowerCase().includes(query);
      const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;

      // Extract attributes safely
      const parsed = parseFoodItemDescription(item.description || '');
      const dType: DietaryType = item.dietaryType || parsed.dietaryType || (item.isVeg ? 'veg' : 'non_veg');

      let matchesDietary = true;
      if (dietaryFilter === 'veg') {
        matchesDietary = dType === 'veg' || item.isVeg;
      } else if (dietaryFilter === 'non_veg') {
        matchesDietary = dType === 'non_veg' || (!item.isVeg && dType !== 'egg');
      }

      const matchesVegLegacy = !vegOnly || (dType === 'veg' || item.isVeg);
      const matchesPopular = !popularOnly || item.isPopular || item.isRecommended;

      return matchesSearch && matchesCategory && matchesDietary && matchesVegLegacy && matchesPopular;
    });
  }, [foodItems, searchQuery, selectedCategory, dietaryFilter, vegOnly, popularOnly]);

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

  // Smart Upselling state
  const [upsellState, setUpsellState] = useState<{ item: FoodItem; pairedItems: FoodItem[] } | null>(null);

  const getPairedItems = (mainItem: FoodItem): FoodItem[] => {
    const candidates = foodItems.filter(f => f.id !== mainItem.id && f.isAvailable);
    if (candidates.length === 0) return [];

    const drinkKeywords = ['drink', 'beverage', 'shake', 'coffee', 'tea', 'soda', 'juice', 'cooler', 'lassi', 'mocktail', 'mojito', 'water', 'coke', 'pepsi', 'sharbat'];
    const sideKeywords = ['side', 'fry', 'fries', 'bread', 'garlic', 'nacho', 'starter', 'appetizer', 'extra', 'raita', 'papad', 'salad', 'dip', 'roti', 'naan', 'kulcha', 'paratha'];
    const dessertKeywords = ['dessert', 'sweet', 'ice cream', 'gulab jamun', 'brownie', 'halwa', 'cake', 'kulfi', 'rasgulla'];

    const getCatName = (catId: string) => (categories.find(c => c.id === catId)?.name || '').toLowerCase();

    const isDrink = (f: FoodItem) => {
      const cat = getCatName(f.categoryId);
      const name = f.name.toLowerCase();
      return drinkKeywords.some(k => cat.includes(k) || name.includes(k));
    };

    const isSide = (f: FoodItem) => {
      const cat = getCatName(f.categoryId);
      const name = f.name.toLowerCase();
      return sideKeywords.some(k => cat.includes(k) || name.includes(k));
    };

    const isDessert = (f: FoodItem) => {
      const cat = getCatName(f.categoryId);
      const name = f.name.toLowerCase();
      return dessertKeywords.some(k => cat.includes(k) || name.includes(k));
    };

    const mainIsDrink = isDrink(mainItem);
    const paired: FoodItem[] = [];

    if (!mainIsDrink) {
      // 1. Recommend a drink
      const bestDrink = candidates.find(f => isDrink(f) && !cart.some(c => c.itemId === f.id))
        || candidates.find(f => isDrink(f));
      if (bestDrink) paired.push(bestDrink);

      // 2. Recommend a side/starter
      const bestSide = candidates.find(f => isSide(f) && f.id !== bestDrink?.id && !cart.some(c => c.itemId === f.id))
        || candidates.find(f => isSide(f) && f.id !== bestDrink?.id);
      if (bestSide) paired.push(bestSide);

      // 3. Recommend a dessert or popular item
      const bestDessertOrPop = candidates.find(f => 
        (isDessert(f) || f.isPopular || f.isRecommended) && 
        !paired.some(p => p.id === f.id)
      );
      if (bestDessertOrPop) paired.push(bestDessertOrPop);
    } else {
      // Main is a drink -> recommend food, side or dessert
      const bestSide = candidates.find(f => isSide(f) && !cart.some(c => c.itemId === f.id));
      if (bestSide) paired.push(bestSide);

      const bestPop = candidates.find(f => (f.isPopular || f.isRecommended) && !paired.some(p => p.id === f.id));
      if (bestPop) paired.push(bestPop);
    }

    // Fallback: If not enough matches, pick lowest-priced popular items
    if (paired.length < 2) {
      const fallbacks = candidates
        .filter(f => !paired.some(p => p.id === f.id))
        .sort((a, b) => {
          if (a.isPopular && !b.isPopular) return -1;
          if (!a.isPopular && b.isPopular) return 1;
          return a.price - b.price;
        })
        .slice(0, 2 - paired.length);
      paired.push(...fallbacks);
    }

    return paired.slice(0, 2);
  };

  const handleOneTapAdd = (item: FoodItem) => {
    addToCart(item, 1);
    showToast(`Added ${item.name} to basket!`, 'success');
    confetti({
      particleCount: 35,
      spread: 40,
      origin: { y: 0.9 }
    });
    if (upsellState) {
      const remaining = upsellState.pairedItems.filter(p => p.id !== item.id);
      if (remaining.length === 0) {
        setUpsellState(null);
      } else {
        setUpsellState({ ...upsellState, pairedItems: remaining });
      }
    }
  };

  // Auto-dismiss upsell prompt after 10s
  useEffect(() => {
    if (upsellState) {
      const timer = setTimeout(() => {
        setUpsellState(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [upsellState]);

  // Frequently paired recommendations in Cart Drawer
  const cartPairedRecommendations = useMemo(() => {
    if (cart.length === 0) return [];
    const lastItemInCart = foodItems.find(f => f.id === cart[cart.length - 1]?.itemId);
    if (!lastItemInCart) {
      return foodItems
        .filter(f => f.isAvailable && !cart.some(c => c.itemId === f.id) && (f.isPopular || f.isRecommended))
        .slice(0, 3);
    }
    return getPairedItems(lastItemInCart);
  }, [cart, foodItems, categories]);

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
      const added = selectedItem;
      setSelectedItem(null);
      setSpecialInstructions('');
      
      // Mini pop confetti on button click
      confetti({
        particleCount: 40,
        spread: 45,
        origin: { y: 0.9 }
      });

      // Trigger Smart Upsell Recommendation Bar
      const paired = getPairedItems(added);
      if (paired.length > 0) {
        setUpsellState({ item: added, pairedItems: paired });
      }
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

  // 3-second timeout state for table/restaurant resolution failure
  const [resolutionTimedOut, setResolutionTimedOut] = useState(false);

  useEffect(() => {
    // If settings and tables have successfully loaded, reset timeout
    if (settings && tablesLoaded) {
      setResolutionTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      if (!settings || !tablesLoaded || tableNotFound) {
        setResolutionTimedOut(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [settings, tablesLoaded, tableNotFound]);

  // Check if a table was explicitly deleted or renumbered from an active restaurant
  const isTableMissingInRestaurant = useMemo(() => {
    if (!tablesLoaded || !settings || tables.length === 0) return false;
    // Direct restaurant menu QR links (using restaurant id/slug) are always valid
    if (tableId === settings.id) return false;
    const cleanId = tableId.replace(/^table[\s\-_]*/i, '').trim();
    return !tables.some(t => 
      t.id === tableId || 
      t.number === tableId || 
      t.number.replace(/^table[\s\-_]*/i, '').trim() === cleanId
    );
  }, [tablesLoaded, settings, tables, tableId]);

  const isTableResolutionFailed = tableNotFound || (resolutionTimedOut && (!settings || !tablesLoaded)) || isTableMissingInRestaurant;

  // Friendly error screen for invalid or expired table links
  if (isTableResolutionFailed) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-mesh flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-100 dark:border-slate-800/80 animate-scale-in">
          <div className="w-20 h-20 bg-rose-500/10 dark:bg-rose-950/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/20 text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-black mb-2 text-slate-900 dark:text-slate-100 font-sans tracking-tight">
            Table Not Found
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm font-medium leading-relaxed">
            Please scan the QR code on your table again or ask your server for assistance.
          </p>

          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 mb-6 text-xs text-slate-500 dark:text-slate-400 space-y-1.5 border border-slate-100 dark:border-slate-800 text-left">
            <div className="flex justify-between items-center font-mono">
              <span className="font-sans font-bold uppercase text-[10px] text-slate-400">Table ID Scanned</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">{tableId || 'Unknown'}</span>
            </div>
            <div className="flex justify-between items-center font-mono">
              <span className="font-sans font-bold uppercase text-[10px] text-slate-400">Status</span>
              <span className="font-bold text-rose-600 dark:text-rose-400 uppercase text-[10px]">Unassigned / Expired</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full bg-slate-900 hover:bg-slate-850 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md text-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Connecting</span>
            </button>

            {settings?.id && (
              <button
                type="button"
                onClick={() => {
                  window.location.href = `/menu/${settings.id}`;
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 px-6 rounded-2xl transition-all text-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <Utensils className="w-4 h-4" />
                <span>Browse General Menu</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

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
                <div className="flex items-center gap-1.5 min-w-0">
                  {(() => {
                    const foodItemObj = foodItems.find(f => f.id === c.itemId);
                    const cartDType = foodItemObj?.dietaryType || (foodItemObj?.isVeg ? 'veg' : 'non_veg');
                    return <FSSAIIndicator type={cartDType} size={12} />;
                  })()}
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate leading-snug">{c.name}</h4>
                </div>
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

      {/* Frequently Paired Upsell Shelf in Basket */}
      {cartPairedRecommendations.length > 0 && (
        <div className="pt-3 pb-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0 animate-pulse" />
            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {t.pairsWellWithOrder || 'Pairs Well With Your Order'}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {cartPairedRecommendations.map(item => (
              <div
                key={item.id}
                className="min-w-[150px] max-w-[170px] bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl p-2.5 flex flex-col justify-between shadow-sm flex-shrink-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1 mb-1">
                    <FSSAIIndicator type={item.dietaryType || (item.isVeg ? 'veg' : 'non_veg')} size={11} />
                    <p className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100 truncate">
                      {item.name}
                    </p>
                  </div>
                  <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                    +{settings?.currency || '₹'}{item.price.toFixed(0)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOneTapAdd(item)}
                  className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black py-1.5 px-2 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                >
                  <span>{t.oneTapAdd || '+ 1-Tap'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/80 px-2.5 sm:px-4 py-2 sm:py-2.5 shadow-sm">
        <div className="max-w-md md:max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#10B981]/15 text-[#10B981] dark:text-[#10B981] rounded-xl sm:rounded-2xl flex items-center justify-center border border-[#10B981]/30 shadow-sm flex-shrink-0">
              <Utensils className="w-4 h-4 text-[#10B981]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base font-black tracking-tight text-slate-900 dark:text-slate-100 font-sans leading-tight truncate max-w-[120px] xs:max-w-[170px] sm:max-w-none">
                {settings?.name || 'Gourmet Restaurant'}
              </h1>
              <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                <span className="text-[#10B981] font-mono">Table #{getTableDisplayNumber()}</span>
              </div>
            </div>
          </div>

          {/* Quick Staff Interactions & Language Switcher */}
          <div className="flex gap-1.5 sm:gap-2 items-center">

            {/* Language Switcher (EN ⇄ हिन्दी) */}
            <button
              type="button"
              onClick={() => {
                const nextLang: Language = lang === 'en' ? 'hi' : 'en';
                setLang(nextLang);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer active:scale-95 shadow-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750"
              title={lang === 'en' ? 'Switch menu to हिन्दी (Hindi)' : 'Switch menu to English'}
              aria-label="Toggle language between English and Hindi"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span>{lang === 'en' ? 'हिन्दी' : 'ENG'}</span>
            </button>

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
                style={{ fontSize: '16px' }}
                className="w-full bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl py-3.5 pl-11 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400"
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
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1 no-scrollbar touch-pan-x">
              <button
                onClick={() => {
                  setDietaryFilter('all');
                  setVegOnly(false);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black border transition-all duration-200 active:scale-95 whitespace-nowrap cursor-pointer shadow-sm ${
                  dietaryFilter === 'all' && !vegOnly
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-500/20'
                    : 'bg-white border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                All Dishes
              </button>

              <button
                onClick={() => {
                  const next = dietaryFilter === 'veg' ? 'all' : 'veg';
                  setDietaryFilter(next);
                  setVegOnly(next === 'veg');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black border transition-all duration-200 active:scale-95 whitespace-nowrap cursor-pointer shadow-sm ${
                  dietaryFilter === 'veg'
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-500/20'
                    : 'bg-white border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <FSSAIIndicator type="veg" size={13} bg={dietaryFilter === 'veg' ? 'white' : 'auto'} />
                <span>Veg Only</span>
              </button>

              <button
                onClick={() => {
                  setDietaryFilter(dietaryFilter === 'non_veg' ? 'all' : 'non_veg');
                  setVegOnly(false);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black border transition-all duration-200 active:scale-95 whitespace-nowrap cursor-pointer shadow-sm ${
                  dietaryFilter === 'non_veg'
                    ? 'bg-red-600 border-red-500 text-white shadow-red-500/20'
                    : 'bg-white border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <FSSAIIndicator type="non_veg" size={13} bg={dietaryFilter === 'non_veg' ? 'white' : 'auto'} />
                <span>Non-Veg</span>
              </button>

              <button
                onClick={() => setPopularOnly(!popularOnly)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black border transition-all duration-200 active:scale-95 whitespace-nowrap cursor-pointer shadow-sm ${
                  popularOnly
                    ? 'bg-amber-500 border-amber-500 text-white shadow-amber-500/20'
                    : 'bg-white border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 hover:bg-slate-50'
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

              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar touch-pan-x scroll-smooth">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 whitespace-nowrap border cursor-pointer active:scale-95 ${
                    selectedCategory === 'all'
                      ? 'bg-[#10B981] border-[#10B981] text-white shadow-lg shadow-[#10B981]/25 scale-[1.02]'
                      : 'bg-white text-slate-900 border-slate-250 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 hover:border-[#10B981]'
                  }`}
                >
                  {t.allItems}
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 whitespace-nowrap border cursor-pointer active:scale-95 ${
                      selectedCategory === cat.id
                        ? 'bg-[#10B981] border-[#10B981] text-white shadow-lg shadow-[#10B981]/25 scale-[1.02]'
                        : 'bg-white text-slate-900 border-slate-250 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 hover:border-[#10B981]'
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

                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
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
                          {(() => {
                            const parsedAttrs = parseFoodItemDescription(item.description || '');
                            const dType: DietaryType = item.dietaryType || parsedAttrs.dietaryType || (item.isVeg ? 'veg' : 'non_veg');
                            const serves = item.serves || parsedAttrs.serves;
                            const cals = item.calories ?? parsedAttrs.calories;

                            return (
                              <div>
                                {/* Name + Dietary Badge */}
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs sm:text-sm leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate font-sans">
                                    {item.name}
                                  </h3>
                                  <div className="flex items-center gap-1 flex-shrink-0 pt-0.5">
                                    <FSSAIIndicator type={dType} size="sm" />
                                  </div>
                                </div>
                                
                                {/* Description */}
                                <p className="text-slate-500 dark:text-slate-400 text-[11px] line-clamp-2 mt-1 leading-normal font-medium truncate-2-lines">
                                  {parsedAttrs.cleanDescription || 'Freshly prepared gourmet dish.'}
                                </p>

                                {/* Highlights: Serves, Calories, Prep Time */}
                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px] font-bold">
                                  {serves && (
                                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
                                      👥 {serves.toLowerCase().startsWith('serves') ? serves : `Serves ${serves}`}
                                    </span>
                                  )}
                                  {cals !== undefined && (
                                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
                                      🔥 {cals} kcal
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                                    <Clock className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                    {item.preparationTime || 15}m
                                  </span>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Price & Add Stepper Row */}
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
                                    className="bg-[#10B981] hover:bg-[#059669] text-white text-[11px] font-black px-3.5 py-1.5 rounded-xl shadow-md shadow-[#10B981]/20 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>+ ADD</span>
                                  </button>
                                );
                              }
                              return (
                                <div 
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center bg-[#064E3B] text-white rounded-xl shadow-md px-2 py-1 gap-2 border border-[#10B981]/40"
                                >
                                  <button
                                    onClick={() => {
                                      if (qty <= 1) {
                                        removeFromCart(item.id);
                                      } else {
                                        updateCartQuantity(item.id, qty - 1);
                                      }
                                    }}
                                    className="w-5 h-5 flex items-center justify-center font-black text-xs hover:bg-[#047857] rounded-md transition-colors cursor-pointer text-[#34D399]"
                                  >
                                    -
                                  </button>
                                  <span className="text-xs font-black min-w-3 text-center text-white">{qty}</span>
                                  <button
                                    onClick={() => {
                                      updateCartQuantity(item.id, qty + 1);
                                    }}
                                    className="w-5 h-5 flex items-center justify-center font-black text-xs hover:bg-[#047857] rounded-md transition-colors cursor-pointer text-[#34D399]"
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
        <a 
          href="https://www.restaurantsos.in" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex items-center gap-2 hover:opacity-85 transition-opacity"
          aria-label="Powered by Restaurants OS"
        >
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold tracking-wider uppercase">
            Powered by
          </span>
          <RestaurantsOSLogo size="sm" showText={true} />
        </a>
      </footer>

      {/* Cart Summary Floating Bar (Mobile Only) */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 inset-x-4 z-40 bg-[#064E3B]/95 dark:bg-[#064E3B]/95 backdrop-blur-xl border border-[#10B981]/40 text-white p-3.5 pl-4 pr-3 shadow-2xl shadow-[#064E3B]/60 max-w-md mx-auto rounded-3xl animate-slide-up md:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative bg-[#10B981]/20 p-2.5 rounded-2xl text-[#10B981] border border-[#10B981]/40">
                <ShoppingBag className="w-5 h-5 animate-pulse text-[#10B981]" />
                <span className="absolute -top-1.5 -right-1.5 bg-[#10B981] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg border border-[#064E3B]">
                  {totalItemsCount}
                </span>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-[#34D399]">Total Basket</p>
                <p className="text-base font-black tracking-tight text-white">
                  {settings?.currency || '₹'}{getCartGrandTotal().toFixed(0)}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setIsCartOpen(true)}
              className="bg-[#10B981] hover:bg-[#059669] text-white font-black px-5 py-3 rounded-2xl transition-all duration-200 active:scale-95 flex items-center gap-2 text-xs uppercase tracking-wider shadow-lg shadow-[#10B981]/20 cursor-pointer"
            >
              <span>Review Cart</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Quick-Actions: Call Waiter & Request Bill */}
      <div className={`fixed z-30 flex items-center gap-2 pointer-events-auto transition-all duration-300 right-4 ${
        cart.length > 0 ? 'bottom-20 sm:bottom-6 sm:right-6' : 'bottom-5 sm:bottom-6 sm:right-6'
      }`}>
        {(settings?.enableWaiterCall ?? true) && (
          <button
            type="button"
            onClick={handleCallWaiter}
            disabled={waiterCalled}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full font-black text-xs shadow-2xl backdrop-blur-xl border transition-all duration-200 active:scale-95 cursor-pointer ${
              waiterCalled
                ? 'bg-amber-500 text-white border-amber-400 ring-4 ring-amber-500/25 shadow-amber-500/40 animate-pulse'
                : 'bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 border-slate-200/90 dark:border-slate-800 hover:border-amber-500/60 shadow-slate-900/15 dark:shadow-black/50'
            }`}
            title="Call Waiter (Notifies staff instantly)"
            aria-label="Call Waiter"
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
              waiterCalled ? 'bg-white/20 text-white' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            }`}>
              <Bell className={`w-3.5 h-3.5 ${waiterCalled ? 'animate-bounce' : ''}`} />
            </div>
            <span className="text-xs font-black">
              {waiterCalled ? (t.waiterCalled || 'Waiter Called!') : (t.callWaiter || 'Call Waiter')}
            </span>
          </button>
        )}

        {(settings?.enableBillRequest ?? true) && (
          <button
            type="button"
            onClick={handleRequestBill}
            disabled={billRequested}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full font-black text-xs shadow-2xl backdrop-blur-xl border transition-all duration-200 active:scale-95 cursor-pointer ${
              billRequested
                ? 'bg-emerald-600 text-white border-emerald-500 ring-4 ring-emerald-500/25 shadow-emerald-600/40 animate-pulse'
                : 'bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 border-slate-200/90 dark:border-slate-800 hover:border-emerald-500/60 shadow-slate-900/15 dark:shadow-black/50'
            }`}
            title="Request Bill (Signals cashier to print invoice)"
            aria-label="Request Bill"
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
              billRequested ? 'bg-white/20 text-white' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            }`}>
              <Receipt className={`w-3.5 h-3.5 ${billRequested ? 'animate-bounce' : ''}`} />
            </div>
            <span className="text-xs font-black">
              {billRequested ? (t.billRequested || 'Bill Requested!') : (t.requestBill || 'Request Bill')}
            </span>
          </button>
        )}
      </div>

      {/* Smart Upsell Floating Recommendation Bar ("Frequently paired with this") */}
      {upsellState && upsellState.pairedItems.length > 0 && (
        <div className={`fixed z-40 transition-all duration-300 inset-x-3 sm:inset-x-auto sm:right-6 sm:w-96 max-w-md mx-auto ${
          cart.length > 0 ? 'bottom-32 sm:bottom-20' : 'bottom-20 sm:bottom-20'
        }`}>
          <div className="bg-slate-900/95 dark:bg-slate-900/98 backdrop-blur-xl text-white rounded-3xl p-3 sm:p-3.5 shadow-2xl border border-emerald-500/50 animate-slide-up">
            <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800/80">
              <div className="flex items-center gap-1.5 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0 animate-pulse" />
                <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider truncate">
                  {t.frequentlyPaired || 'Frequently ordered with this:'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setUpsellState(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
              {upsellState.pairedItems.map(paired => (
                <div
                  key={paired.id}
                  className="flex-1 min-w-[140px] bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 rounded-2xl p-2.5 flex items-center justify-between gap-2 transition-all group shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <FSSAIIndicator type={paired.dietaryType || (paired.isVeg ? 'veg' : 'non_veg')} size={11} />
                      <p className="text-xs font-bold text-slate-100 truncate group-hover:text-emerald-400 transition-colors">
                        {paired.name}
                      </p>
                    </div>
                    <p className="text-[11px] font-black text-emerald-400 mt-0.5">
                      +{settings?.currency || '₹'}{paired.price.toFixed(0)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOneTapAdd(paired)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black px-2.5 py-1.5 rounded-xl transition-all active:scale-90 flex-shrink-0 shadow-md cursor-pointer whitespace-nowrap"
                  >
                    {t.oneTapAdd || '+ 1-Tap'}
                  </button>
                </div>
              ))}
            </div>
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
              {(() => {
                const parsed = parseFoodItemDescription(selectedItem.description || '');
                const dType: DietaryType = selectedItem.dietaryType || parsed.dietaryType || (selectedItem.isVeg ? 'veg' : 'non_veg');
                const serves = selectedItem.serves || parsed.serves;
                const cals = selectedItem.calories ?? parsed.calories;
                const allergens = selectedItem.allergens || parsed.allergens || [];

                return (
                  <div className="space-y-3.5 mb-5">
                    {/* Header: Title + Authentic Dietary Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">{selectedItem.name}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400 font-semibold">{t.preparationTime}: {selectedItem.preparationTime} {t.min}</span>
                          {serves && (
                            <span className="text-xs text-slate-400 font-semibold">&bull; 👥 {serves.toLowerCase().startsWith('serves') ? serves : `Serves ${serves}`}</span>
                          )}
                          {cals !== undefined && (
                            <span className="text-xs text-slate-400 font-semibold">&bull; 🔥 {cals} kcal</span>
                          )}
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <FSSAIIndicator type={dType} size="md" showLabel={true} badgeClassName="px-2.5 py-1 text-xs rounded-xl" />
                      </div>
                    </div>

                    {/* Spicy indicator chip */}
                    {selectedItem.spicyLevel > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        <span className="bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300 text-[10px] font-black px-2.5 py-1 rounded-lg border border-orange-200/60 dark:border-orange-800/50 flex items-center gap-1">
                          🌶️ Spicy ({selectedItem.spicyLevel === 1 ? 'Mild' : selectedItem.spicyLevel === 2 ? 'Medium' : 'Hot'})
                        </span>
                      </div>
                    )}

                    {/* Description */}
                    {parsed.cleanDescription && (
                      <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed font-medium">
                        {parsed.cleanDescription}
                      </p>
                    )}

                    {/* Allergen Advisory Banner */}
                    {allergens.length > 0 && (
                      <div className="bg-amber-500/10 border border-amber-500/30 dark:border-amber-500/20 rounded-2xl p-3 text-xs text-amber-900 dark:text-amber-200">
                        <p className="font-extrabold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>Allergen Notice</span>
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed font-medium text-amber-800/90 dark:text-amber-200/90">
                          Contains: <span className="font-bold">{allergens.join(', ')}</span>. Please inform our team if you have severe allergies.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

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
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-[16px] sm:text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
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
