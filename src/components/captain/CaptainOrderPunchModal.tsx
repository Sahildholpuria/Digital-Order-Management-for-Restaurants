import React, { useState, useMemo, useEffect } from "react";
import { useRestaurant } from "../../context/RestaurantContext";
import { FoodItem, OrderItem, RestaurantOrder } from "../../types";
import { printKOTReceipt } from "../../utils/printUtils";
import {
  X,
  Search,
  Plus,
  Minus,
  Printer,
  Zap,
  CheckCircle2,
  Clock,
  MessageSquare,
  UtensilsCrossed,
  ChefHat,
  RotateCcw
} from "lucide-react";

interface CaptainOrderPunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTableId?: string;
  onOrderPunched?: (order: RestaurantOrder) => void;
}

export const CaptainOrderPunchModal: React.FC<CaptainOrderPunchModalProps> = ({
  isOpen,
  onClose,
  initialTableId,
  onOrderPunched
}) => {
  const {
    foodItems,
    categories,
    tables,
    settings,
    currentUser,
    punchTableOrder,
    showToast
  } = useRestaurant();

  const [selectedTableId, setSelectedTableId] = useState<string>(initialTableId || "");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dietaryFilter, setDietaryFilter] = useState<"all" | "veg" | "non_veg">("all");
  const [cartItems, setCartItems] = useState<{ [itemId: string]: OrderItem }>({});
  const [generalNotes, setGeneralNotes] = useState<string>("");
  const [activeItemNoteId, setActiveItemNoteId] = useState<string | null>(null);
  const [itemNoteText, setItemNoteText] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [punchedOrder, setPunchedOrder] = useState<RestaurantOrder | null>(null);

  const currency = settings?.currency || "₹";

  useEffect(() => {
    if (isOpen) {
      if (initialTableId) {
        setSelectedTableId(initialTableId);
      } else if (!selectedTableId && tables.length > 0) {
        const available = tables.find(t => t.status === "available");
        setSelectedTableId(available ? available.id : tables[0].id);
      }
      setPunchedOrder(null);
    }
  }, [isOpen, initialTableId, tables]);

  const filteredItems = useMemo(() => {
    return foodItems.filter(item => {
      if (!item.isAvailable) return false;
      if (selectedCategoryId !== "all" && item.categoryId !== selectedCategoryId) return false;
      if (dietaryFilter === "veg" && !item.isVeg) return false;
      if (dietaryFilter === "non_veg" && item.isVeg) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = (item.description || "").toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }
      return true;
    });
  }, [foodItems, selectedCategoryId, dietaryFilter, searchQuery]);

  const cartList = useMemo(() => Object.values(cartItems), [cartItems]);
  const totalItemCount = useMemo(() => cartList.reduce((sum, i) => sum + i.quantity, 0), [cartList]);
  const subtotal = useMemo(() => cartList.reduce((sum, i) => sum + (i.price * i.quantity), 0), [cartList]);
  const taxRate = settings?.taxPercentage ?? 0;
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const grandTotal = Math.round((subtotal + taxAmount) * 100) / 100;

  const handleAddItem = (item: FoodItem) => {
    setCartItems(prev => {
      const existing = prev[item.id];
      if (existing) {
        return {
          ...prev,
          [item.id]: { ...existing, quantity: existing.quantity + 1 }
        };
      }
      return {
        ...prev,
        [item.id]: {
          itemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          specialInstructions: ""
        }
      };
    });
  };

  const handleDecrementItem = (itemId: string) => {
    setCartItems(prev => {
      const existing = prev[itemId];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return {
        ...prev,
        [itemId]: { ...existing, quantity: existing.quantity - 1 }
      };
    });
  };

  const handleOpenItemNote = (itemId: string) => {
    setActiveItemNoteId(itemId);
    setItemNoteText(cartItems[itemId]?.specialInstructions || "");
  };

  const handleSaveItemNote = () => {
    if (activeItemNoteId) {
      setCartItems(prev => {
        const existing = prev[activeItemNoteId];
        if (!existing) return prev;
        return {
          ...prev,
          [activeItemNoteId]: { ...existing, specialInstructions: itemNoteText.trim() }
        };
      });
    }
    setActiveItemNoteId(null);
    setItemNoteText("");
  };

  const handlePunchOrder = async () => {
    if (!selectedTableId) {
      showToast("Please select a dining table first.", "error");
      return;
    }
    if (cartList.length === 0) {
      showToast("Please add at least 1 food item to the order.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const waiterId = currentUser?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser.id)
        ? currentUser.id
        : undefined;
      const createdOrder = await punchTableOrder(
        selectedTableId,
        cartList,
        generalNotes.trim(),
        waiterId
      );

      setPunchedOrder(createdOrder);
      setCartItems({});
      setGeneralNotes("");
      showToast("Order " + createdOrder.orderNumber + " punched & KOT printed!", "success");
      if (onOrderPunched) {
        onOrderPunched(createdOrder);
      }
    } catch (err: any) {
      showToast("Failed to punch order: " + (err.message || err), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForNext = () => {
    setPunchedOrder(null);
    setCartItems({});
    setGeneralNotes("");
  };

  if (!isOpen) return null;

  const currentSelectedTable = tables.find(t => t.id === selectedTableId);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-sm">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Captain Table Order Puncher
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/30 uppercase tracking-wider">
                  Instant KOT
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Punch table orders directly and generate instant Kitchen Order Tickets (KOT)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PUNCHED ORDER SUCCESS VIEW */}
        {punchedOrder ? (
          <div className="p-6 sm:p-8 flex-1 overflow-y-auto flex flex-col items-center justify-center text-center space-y-6 animate-scale-in">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10 animate-bounce-short">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Kitchen Order Ticket Dispatched
              </span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                Order #{punchedOrder.orderNumber} Generated!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                Successfully assigned to <strong>{punchedOrder.tableName}</strong>. Dishes are queued in Live Kitchen Display (KDS).
              </p>
            </div>

            {/* KOT Summary Box */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 w-full max-w-md text-left space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500">
                <span>{punchedOrder.tableName}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono">#{punchedOrder.orderNumber}</span>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {punchedOrder.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-start text-xs text-slate-800 dark:text-slate-200">
                    <div>
                      <span className="font-bold">{it.name}</span>
                      {it.specialInstructions && (
                        <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          Note: {it.specialInstructions}
                        </span>
                      )}
                    </div>
                    <span className="font-black text-slate-900 dark:text-white shrink-0 ml-2">x{it.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center font-black text-sm text-slate-900 dark:text-white">
                <span>Total Amount:</span>
                <span className="text-emerald-600 dark:text-emerald-400">{currency}{punchedOrder.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 justify-center w-full max-w-md">
              <button
                type="button"
                onClick={() => printKOTReceipt(punchedOrder, settings?.name || "Kitchen", "80mm", true)}
                className="flex-1 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-black text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Re-print KOT (80mm)</span>
              </button>

              <button
                type="button"
                onClick={() => printKOTReceipt(punchedOrder, settings?.name || "Kitchen", "58mm", true)}
                className="flex-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print 58mm</span>
              </button>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={handleResetForNext}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Punch Another Order</span>
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          /* MAIN ORDER PUNCHING WORKSPACE */
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
            
            {/* LEFT 7/12: MENU BROWSING & SEARCH */}
            <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 h-full overflow-hidden">
              
              {/* Controls Bar: Table Picker + Search */}
              <div className="p-3.5 sm:p-4 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Table Selection Dropdown */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Dining Table *
                    </label>
                    <select
                      value={selectedTableId}
                      onChange={(e) => setSelectedTableId(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="" disabled>-- Select Table --</option>
                      {tables.map(t => (
                        <option key={t.id} value={t.id}>
                          Table {t.number} ({t.status.toUpperCase()} • Cap: {t.capacity})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Search Field */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Search Dishes
                    </label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Type dish name or code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-7 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Filter Pills Bar */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
                  {/* Dietary Quick Toggles */}
                  <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setDietaryFilter("all")}
                      className={"px-2 py-1 rounded text-[10px] font-bold transition-all " + (
                        dietaryFilter === "all"
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                      )}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setDietaryFilter("veg")}
                      className={"px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 " + (
                        dietaryFilter === "veg"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      )}
                    >
                      <span>🌱</span>
                      <span>Veg</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDietaryFilter("non_veg")}
                      className={"px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 " + (
                        dietaryFilter === "non_veg"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      )}
                    >
                      <span>🍗</span>
                      <span>Non-Veg</span>
                    </button>
                  </div>

                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />

                  {/* Categories Pills */}
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId("all")}
                    className={"px-3 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-all " + (
                      selectedCategoryId === "all"
                        ? "bg-amber-500 text-white shadow-sm font-black"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    )}
                  >
                    All Categories ({foodItems.length})
                  </button>

                  {categories.map(cat => {
                    const count = foodItems.filter(f => f.categoryId === cat.id).length;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={"px-3 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-all " + (
                          selectedCategoryId === cat.id
                            ? "bg-amber-500 text-white shadow-sm font-black"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                        )}
                      >
                        {cat.name} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Food Items Grid */}
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-4">
                {filteredItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                    <UtensilsCrossed className="w-10 h-10 stroke-1 opacity-40" />
                    <p className="text-xs font-bold">No matching dishes found</p>
                    <p className="text-[10px]">Try changing the category or search query.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredItems.map(item => {
                      const inCart = cartItems[item.id];
                      return (
                        <div
                          key={item.id}
                          className={"p-3 rounded-2xl border transition-all flex flex-col justify-between " + (
                            inCart
                              ? "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/40 shadow-xs"
                              : "bg-white dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs">{item.isVeg ? "🌱" : "🍗"}</span>
                                <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {item.name}
                                </h4>
                              </div>
                              {item.description && (
                                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <span className="font-black text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
                              {currency}{item.price}
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{item.preparationTime || 15}m</span>
                            </span>

                            {inCart ? (
                              <div className="flex items-center gap-1.5 bg-amber-500 text-white rounded-lg p-0.5 shadow-xs">
                                <button
                                  type="button"
                                  onClick={() => handleDecrementItem(item.id)}
                                  className="w-6 h-6 rounded flex items-center justify-center hover:bg-amber-600 active:scale-95 transition-all cursor-pointer"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-black px-1.5 min-w-[18px] text-center">
                                  {inCart.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAddItem(item)}
                                  className="w-6 h-6 rounded flex items-center justify-center hover:bg-amber-600 active:scale-95 transition-all cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddItem(item)}
                                className="bg-slate-900 dark:bg-white hover:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-900 hover:text-white dark:hover:text-slate-900 text-[11px] font-black px-3 py-1 rounded-lg transition-all active:scale-95 flex items-center gap-1 cursor-pointer shadow-xs"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT 5/12: LIVE KOT CART & PUNCH PANEL */}
            <div className="lg:col-span-5 flex flex-col bg-slate-50 dark:bg-slate-950/40 h-full overflow-hidden">
              
              {/* Cart Header */}
              <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <ChefHat className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                      Live KOT Summary
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      {currentSelectedTable ? "Table " + currentSelectedTable.number : "No Table Selected"} &bull; {totalItemCount} Items
                    </p>
                  </div>
                </div>

                {cartList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCartItems({})}
                    className="text-[10px] text-rose-500 hover:underline font-bold cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2">
                {cartList.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-slate-400 stroke-1" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Cart is empty</p>
                    <p className="text-[10px] max-w-[200px]">
                      Select items from the menu to punch this table order and generate KOT.
                    </p>
                  </div>
                ) : (
                  cartList.map(item => (
                    <div
                      key={item.itemId}
                      className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {item.name}
                          </h5>
                          <span className="text-[10px] text-slate-400 font-bold">
                            {currency}{item.price} each
                          </span>
                        </div>

                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => handleDecrementItem(item.itemId)}
                            className="w-5 h-5 rounded flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="text-xs font-black px-1.5 text-slate-900 dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const food = foodItems.find(f => f.id === item.itemId);
                              if (food) handleAddItem(food);
                            }}
                            className="w-5 h-5 rounded flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>

                      {/* Item Special Instructions / Note */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                        {item.specialInstructions ? (
                          <span className="text-amber-600 dark:text-amber-400 font-bold truncate max-w-[200px]">
                            🍳 {item.specialInstructions}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No custom notes</span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenItemNote(item.itemId)}
                          className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          <MessageSquare className="w-2.5 h-2.5" />
                          <span>{item.specialInstructions ? "Edit Note" : "+ Note"}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Order Footer & Punch Action */}
              <div className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
                {/* General Kitchen Notes Input */}
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    General KOT Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Rush order, Serve starters first..."
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Financial Summary */}
                <div className="space-y-1 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                    <span>Items Subtotal:</span>
                    <span className="font-bold">{currency}{subtotal.toFixed(2)}</span>
                  </div>
                  {taxRate > 0 && (
                    <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                      <span>Tax / GST ({taxRate}%):</span>
                      <span className="font-bold">{currency}{taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-900 dark:text-white font-black text-sm pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span>Grand Total:</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{currency}{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Big Tactile Punch Button */}
                <button
                  type="button"
                  onClick={handlePunchOrder}
                  disabled={isSubmitting || cartList.length === 0 || !selectedTableId}
                  className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-slate-800 dark:disabled:to-slate-800 text-white font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-2xl shadow-md shadow-emerald-600/20 disabled:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed active:scale-98"
                >
                  <Zap className="w-4 h-4 fill-current text-amber-300" />
                  <span>
                    {isSubmitting ? "Generating KOT & Punching..." : "⚡ Punch Order & Generate KOT"}
                  </span>
                </button>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* ITEM NOTE MODAL */}
      {activeItemNoteId && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-4 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3 animate-scale-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Item Cooking Note
              </h4>
              <button type="button" onClick={() => setActiveItemNoteId(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 font-medium">
              Add specific preparation notes for: <strong>{cartItems[activeItemNoteId]?.name}</strong>
            </p>

            <textarea
              rows={3}
              placeholder="e.g., Less spicy, no onion / garlic, extra cheese..."
              value={itemNoteText}
              onChange={(e) => setItemNoteText(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            {/* Quick Note Presets */}
            <div className="flex flex-wrap gap-1.5">
              {["Less Spicy", "Extra Spicy", "No Onion", "No Garlic", "Crispy", "Pack Separate"].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setItemNoteText(prev => prev ? (prev + ", " + preset) : preset)}
                  className="text-[9px] bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400 font-bold px-2 py-1 rounded-md text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                >
                  +{preset}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveItemNoteId(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveItemNote}
                className="px-4 py-1.5 rounded-lg text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CaptainOrderPunchModal;
