import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { FoodItem, MenuCategory } from '../../types';
import { Search, ShoppingBag, Flame, Sparkles, Utensils, X, Bell, Receipt, CheckCircle, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CustomerMenuProps {
  tableId: string;
}

export const CustomerMenu: React.FC<CustomerMenuProps> = ({ tableId }) => {
  const {
    settings,
    categories,
    foodItems,
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
  } = useRestaurant();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [vegOnly, setVegOnly] = useState(false);
  const [popularOnly, setPopularOnly] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any>(null);
  
  // Status states for call staff feedback
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [billRequested, setBillRequested] = useState(false);

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
  };

  const handleAddToCart = () => {
    if (selectedItem) {
      addToCart(selectedItem, quantity, specialInstructions);
      setSelectedItem(null);
      
      // Mini pop confetti on button click
      confetti({
        particleCount: 40,
        spread: 40,
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

  const totalItemsCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-mesh pb-28">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-150/60 dark:border-slate-800/80 px-4 py-3 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
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
              <span>{waiterCalled ? 'Calling...' : 'Waiter'}</span>
            </button>
            
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
              <span>{billRequested ? 'Requested' : 'Bill'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-6">
        {/* Modern Search Bar */}
        <div className="relative mb-5 shadow-sm rounded-2xl">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <Search className="w-4 h-4 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder="Search our delicious items..."
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
                : 'bg-white border-slate-200 text-slate-550 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
            }`}
          >
            <span className={`w-2 h-2 rounded-full bg-green-500 border border-white ${vegOnly ? 'bg-green-500' : ''}`}></span>
            Veg Only
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
            Popular Items
          </button>
        </div>

        {/* Category Horizontal Bar */}
        <div className="mb-6">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">Categories</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-950 shadow-sm'
                  : 'bg-white text-slate-550 border-slate-100 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
              }`}
            >
              All Items
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-950 shadow-sm'
                    : 'bg-white text-slate-550 border-slate-100 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
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
            <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-200">Our Menu Menu</h2>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md">{filteredItems.length} options</span>
          </div>

          {filteredItems.length === 0 ? (
            <div className="bg-white/70 dark:bg-slate-900/60 rounded-3xl p-10 text-center border border-slate-200/50 dark:border-slate-800/80 backdrop-blur-md animate-scale-in">
              <Utensils className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">No items match your choices.</p>
            </div>
          ) : (
            filteredItems.map(item => {
              const discountedPrice = item.price * (1 - (item.discountPercentage || 0) / 100);
              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenItem(item)}
                  className="bg-white/90 dark:bg-slate-900/65 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-3.5 flex gap-4 cursor-pointer hover:border-slate-305 dark:hover:border-slate-700 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 group backdrop-blur-sm"
                >
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-850 flex-shrink-0">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Discount & Popular overlays */}
                    {item.discountPercentage > 0 && (
                      <span className="absolute top-1.5 left-1.5 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-sm">
                        {item.discountPercentage}% OFF
                      </span>
                    )}

                    {item.isPopular && (
                      <span className="absolute bottom-1.5 right-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm uppercase tracking-wider">
                        <Sparkles className="w-2.5 h-2.5 fill-current" />
                        POP
                      </span>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between py-0.5">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm leading-snug group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                          {item.name}
                        </h3>
                        {/* Veg / Non-Veg Indicator */}
                        <span className={`w-3.5 h-3.5 border rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          item.isVeg ? 'border-green-600' : 'border-red-650'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            item.isVeg ? 'bg-green-600' : 'bg-red-650'
                          }`}></span>
                        </span>
                      </div>
                      
                      <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 mt-1 leading-normal font-medium">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50 dark:border-slate-800/40">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-slate-850 dark:text-slate-100">
                          {settings?.currency || '₹'}{discountedPrice.toFixed(0)}
                        </span>
                        {item.discountPercentage > 0 && (
                          <span className="text-xs text-slate-400 line-through">
                            {settings?.currency || '₹'}{item.price}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>{item.preparationTime} min</span>
                        {item.spicyLevel > 0 && (
                          <span className="flex items-center text-orange-550 dark:text-orange-400 font-extrabold gap-0.5">
                            <Flame className="w-3 h-3 fill-current" />
                            <span>{item.spicyLevel === 3 ? 'HOT' : item.spicyLevel === 2 ? 'MED' : 'MILD'}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Cart Summary Floating Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-150/60 dark:border-slate-800/80 p-4 shadow-glass max-w-md mx-auto rounded-t-3xl animate-slide-up">
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
                  <span className="text-xs text-slate-400 font-semibold">Prep time: {selectedItem.preparationTime} minutes</span>
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
                {selectedItem.description}
              </p>

              {/* Special Instructions Field */}
              <div className="mb-6">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  Special Cooking Instructions
                </label>
                <textarea
                  placeholder="E.g., No onion, make it spicy, well cooked, etc."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                />
              </div>

              {/* Quantity Controls & Price */}
              <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Item Total</p>
                  <p className="text-xl font-black text-slate-850 dark:text-slate-100">
                    {settings?.currency || '₹'}{(selectedItem.price * (1 - (selectedItem.discountPercentage || 0) / 100) * quantity).toFixed(0)}
                  </p>
                </div>

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
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-brand-500/10 mt-5 flex items-center justify-center gap-2 text-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Basket</span>
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

            {/* Cart Items list */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.map(c => (
                <div key={c.itemId} className="flex gap-4 items-start pb-4 border-b border-slate-100/50 dark:border-slate-800/40">
                  <div className="flex-1">
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">{c.name}</h4>
                    <p className="text-xs text-brand-600 dark:text-brand-400 font-bold mt-0.5">
                      {settings?.currency || '₹'}{c.price.toFixed(0)} each
                    </p>
                    {c.specialInstructions && (
                      <p className="text-[10px] text-orange-555 bg-orange-500/5 dark:bg-orange-950/20 px-2.5 py-1 rounded-lg inline-block mt-1.5 font-bold">
                        Note: {c.specialInstructions}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/40 px-2 py-1 rounded-xl">
                    <button
                      onClick={() => updateCartQuantity(c.itemId, c.quantity - 1)}
                      className="w-6 h-6 font-bold text-slate-400 hover:text-slate-700 text-sm"
                    >
                      -
                    </button>
                    <span className="font-bold text-sm text-slate-850 dark:text-slate-100">{c.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(c.itemId, c.quantity + 1)}
                      className="w-6 h-6 font-bold text-slate-400 hover:text-slate-700 text-sm"
                    >
                      +
                    </button>
                  </div>

                  <span className="font-bold text-sm text-slate-800 dark:text-slate-100 w-16 text-right">
                    {settings?.currency || '₹'}{(c.price * c.quantity).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>

            {/* Cart Footer / Bill Summary */}
            <div className="p-5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-150/60 dark:border-slate-800/80 rounded-t-3xl">
              <div className="space-y-2.5 text-xs text-slate-500 dark:text-slate-400 mb-5">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Subtotal</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">
                    {settings?.currency || '₹'}{getCartSubtotal().toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Taxes & GST ({settings?.taxPercentage || 18}%)</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">
                    {settings?.currency || '₹'}{getCartTax().toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-3 border-t border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 items-center">
                  <span className="font-extrabold">Grand Total</span>
                  <span className="font-black text-brand-600 dark:text-brand-400 text-base">
                    {settings?.currency || '₹'}{getCartGrandTotal().toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-brand-500/20 flex items-center justify-center gap-1.5 text-sm"
              >
                <span>Confirm & Place Order</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMenu;
