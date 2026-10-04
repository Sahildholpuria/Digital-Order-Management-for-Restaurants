import React, { useState, useMemo, useEffect } from "react";
import { useRestaurant } from "../../context/RestaurantContext";
import { FoodItem, OrderItem, RestaurantOrder } from "../../types";
import { parseFoodItemDescription } from "../../services/database";
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
  RotateCcw,
  ShoppingBag,
  Trash2,
  ChevronUp,
  ChevronDown
} from "lucide-react";

interface CaptainOrderPunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTableId?: string;
  initialOrderType?: "dine_in" | "takeaway";
  onOrderPunched?: (order: RestaurantOrder) => void;
}

export const CaptainOrderPunchModal: React.FC<CaptainOrderPunchModalProps> = ({
  isOpen,
  onClose,
  initialTableId,
  initialOrderType = "dine_in",
  onOrderPunched
}) => {
  const {
    foodItems,
    categories,
    tables,
    settings,
    currentUser,
    punchTableOrder,
    punchTakeawayOrder,
    orders,
    showToast
  } = useRestaurant();

  const [orderType, setOrderType] = useState<"dine_in" | "takeaway">(initialOrderType);
  const [selectedTableId, setSelectedTableId] = useState<string>(initialTableId || "");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [tokenNumber, setTokenNumber] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dietaryFilter, setDietaryFilter] = useState<"all" | "veg" | "non_veg">("all");
  const [cartItems, setCartItems] = useState<{ [itemId: string]: OrderItem }>({});
  const [generalNotes, setGeneralNotes] = useState<string>("");
  const [activeItemNoteId, setActiveItemNoteId] = useState<string | null>(null);
  const [itemNoteText, setItemNoteText] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [punchedOrder, setPunchedOrder] = useState<RestaurantOrder | null>(null);
  const [isMobileCartDrawerOpen, setIsMobileCartDrawerOpen] = useState<boolean>(false);

  const currency = settings?.currency || "₹";

  useEffect(() => {
    if (isOpen) {
      setOrderType(initialOrderType);
      if (initialTableId) {
        setSelectedTableId(initialTableId);
      } else if (!selectedTableId && tables.length > 0) {
        const available = tables.find(t => t.status === "available");
        setSelectedTableId(available ? available.id : tables[0].id);
      }
      // Calculate token for takeaway
      const todayTakeaways = orders.filter(o => {
        const isToday = new Date(o.createdAt).toDateString() === new Date().toDateString();
        return isToday && o.orderType === "takeaway";
      });
      setTokenNumber(`TK-${String(todayTakeaways.length + 1).padStart(2, "0")}`);
      setCustomerName("");
      setCustomerPhone("");
      setPunchedOrder(null);
      setIsMobileCartDrawerOpen(false);
    }
  }, [isOpen, initialTableId, initialOrderType, tables, orders]);

  const filteredItems = useMemo(() => {
    return foodItems.filter(item => {
      if (!item.isAvailable) return false;
      if (selectedCategoryId !== "all" && item.categoryId !== selectedCategoryId) return false;
      if (dietaryFilter === "veg" && !item.isVeg) return false;
      if (dietaryFilter === "non_veg" && item.isVeg) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const parsed = parseFoodItemDescription(item.description || "");
        const matchesDesc = (parsed.cleanDescription || "").toLowerCase().includes(q);
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

  const handleRemoveItem = (itemId: string) => {
    setCartItems(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
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
    if (orderType === "dine_in" && !selectedTableId) {
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
      
      let createdOrder: RestaurantOrder;
      
      if (orderType === "takeaway") {
        createdOrder = await punchTakeawayOrder(
          cartList,
          {
            customerName: customerName.trim() || undefined,
            customerPhone: customerPhone.trim() || undefined,
            tokenNumber: tokenNumber.trim() || undefined,
            specialInstructions: generalNotes.trim() || undefined,
          },
          waiterId
        );
      } else {
        createdOrder = await punchTableOrder(
          selectedTableId,
          cartList,
          generalNotes.trim(),
          waiterId
        );
      }

      setPunchedOrder(createdOrder);
      setCartItems({});
      setGeneralNotes("");
      setCustomerName("");
      setCustomerPhone("");
      setIsMobileCartDrawerOpen(false);
      showToast(`${orderType === "takeaway" ? "Takeaway" : "Table"} Order #${createdOrder.orderNumber} punched & KOT queued!`, "success");
      
      // Auto-trigger kitchen KOT print
      try {
        printKOTReceipt(createdOrder, settings?.name || "Kitchen", "80mm", false);
      } catch (_) {}

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
    setIsMobileCartDrawerOpen(false);
  };

  if (!isOpen) return null;

  const currentSelectedTable = tables.find(t => t.id === selectedTableId);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-0 sm:p-3 md:p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-5xl h-full sm:h-[92vh] sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col">
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-4 sm:px-6 py-3 sm:py-4 text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-white truncate">
                  Captain Table Order Puncher
                </h2>
                <span className="hidden xs:inline-block text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase tracking-wider shrink-0">
                  Instant KOT
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                {currentSelectedTable ? `Taking order for Table ${currentSelectedTable.number}` : "Select table and add items"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 ml-2"
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
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-black py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Print Kitchen KOT</span>
              </button>

              <button
                type="button"
                onClick={handleResetForNext}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Punch Next Order</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-300 cursor-pointer pt-2"
            >
              Close Window
            </button>
          </div>
        ) : (
          /* MAIN ORDER PUNCHING WORKSPACE */
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative">
            
            {/* LEFT 7/12: MENU BROWSING & SEARCH */}
            <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 h-full overflow-hidden">
              
              {/* Controls Bar: Order Mode + Table / Customer Details + Search */}
              <div className="p-3 sm:p-4 bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 space-y-2.5 shrink-0">
                
                {/* Order Type Toggle */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setOrderType("dine_in")}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      orderType === "dine_in"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-500" />
                    <span>🍽️ Dine-In Table</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType("takeaway")}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      orderType === "takeaway"
                        ? "bg-amber-500 text-white shadow-xs font-black"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>🛍️ Takeaway / Parcel</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  
                  {/* Table Selection Dropdown OR Takeaway Customer Details */}
                  {orderType === "dine_in" ? (
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Dining Table *
                      </label>
                      <select
                        value={selectedTableId}
                        onChange={(e) => setSelectedTableId(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs"
                      >
                        <option value="" disabled>-- Select Table --</option>
                        {tables.map(t => (
                          <option key={t.id} value={t.id}>
                            Table {t.number} ({t.status.toUpperCase()} • Cap: {t.capacity})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          Token #
                        </label>
                        <input
                          type="text"
                          value={tokenNumber}
                          onChange={(e) => setTokenNumber(e.target.value)}
                          placeholder="TK-01"
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          Customer
                        </label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Name (opt)"
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Search Field */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Search Dishes
                    </label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search dish name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-7 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                </div>

                {/* Dietary Filter & Categories Horizontal Carousel */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                  {/* Dietary Quick Toggles */}
                  <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 shrink-0 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setDietaryFilter("all")}
                      className={"px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer " + (
                        dietaryFilter === "all"
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs font-black"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                      )}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setDietaryFilter("veg")}
                      className={"px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer " + (
                        dietaryFilter === "veg"
                          ? "bg-emerald-600 text-white shadow-xs font-black"
                          : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      )}
                    >
                      <span>🌱</span>
                      <span>Veg</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDietaryFilter("non_veg")}
                      className={"px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer " + (
                        dietaryFilter === "non_veg"
                          ? "bg-rose-600 text-white shadow-xs font-black"
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
                    className={"px-3 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all cursor-pointer " + (
                      selectedCategoryId === "all"
                        ? "bg-amber-500 text-white shadow-sm font-black"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    )}
                  >
                    All Items ({foodItems.length})
                  </button>

                  {categories.map(cat => {
                    const count = foodItems.filter(f => f.categoryId === cat.id).length;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={"px-3 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all cursor-pointer " + (
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
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 pb-24 lg:pb-4">
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
                          className={"p-3 rounded-2xl border transition-all flex flex-col justify-between shadow-2xs " + (
                            inCart
                              ? "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/50 shadow-sm"
                              : "bg-white dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs shrink-0">{item.isVeg ? "🌱" : "🍗"}</span>
                                <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {item.name}
                                </h4>
                              </div>
                              {(() => {
                                const clean = parseFoodItemDescription(item.description || "").cleanDescription;
                                return clean ? (
                                  <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                                    {clean}
                                  </p>
                                ) : null;
                              })()}
                            </div>
                            <span className="font-black text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
                              {currency}{item.price}
                            </span>
                          </div>

                          {/* Item Note preview if added */}
                          {inCart?.specialInstructions && (
                            <div className="mt-1.5 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-[10px] px-2 py-0.5 rounded-md font-medium truncate">
                              Note: {inCart.specialInstructions}
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                            
                            {/* Note Button */}
                            {inCart ? (
                              <button
                                type="button"
                                onClick={() => handleOpenItemNote(item.id)}
                                className="text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-amber-600 flex items-center gap-1 cursor-pointer"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>{inCart.specialInstructions ? "Edit Note" : "+ Note"}</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{item.preparationTime || 15}m</span>
                              </span>
                            )}

                            {/* Stepper / Add Button with touch-friendly dimensions */}
                            {inCart ? (
                              <div className="flex items-center gap-1 bg-amber-500 text-white rounded-xl p-0.5 shadow-sm">
                                <button
                                  type="button"
                                  onClick={() => handleDecrementItem(item.id)}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-amber-600 active:scale-90 transition-all cursor-pointer"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-xs font-black px-2 min-w-[20px] text-center">
                                  {inCart.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAddItem(item)}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-amber-600 active:scale-90 transition-all cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddItem(item)}
                                className="bg-slate-900 dark:bg-white hover:bg-emerald-600 dark:hover:bg-emerald-400 text-white dark:text-slate-900 hover:text-white dark:hover:text-slate-900 text-[11px] font-black px-3.5 py-1.5 rounded-xl transition-all active:scale-95 flex items-center gap-1 cursor-pointer shadow-xs"
                              >
                                <Plus className="w-3.5 h-3.5" />
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

            {/* RIGHT 5/12: LIVE KOT CART & PUNCH PANEL (Desktop & Tablet Split View) */}
            <div className="hidden lg:flex lg:col-span-5 flex-col bg-slate-50 dark:bg-slate-950/50 h-full overflow-hidden">
              
              {/* Cart Header */}
              <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <ChefHat className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      Live KOT Summary
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      {totalItemCount} {totalItemCount === 1 ? "dish" : "dishes"} queued
                    </p>
                  </div>
                </div>

                {cartList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCartItems({})}
                    className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
                {cartList.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                    <ShoppingBag className="w-10 h-10 stroke-1 opacity-30" />
                    <p className="text-xs font-bold text-slate-500">Order Ticket is Empty</p>
                    <p className="text-[10px]">Select items from the menu on the left to add dishes to this table.</p>
                  </div>
                ) : (
                  cartList.map(item => (
                    <div
                      key={item.itemId}
                      className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {item.name}
                          </h4>
                          <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                            {currency}{(item.price * item.quantity).toFixed(0)}
                          </span>
                        </div>

                        {/* Counter */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => handleDecrementItem(item.itemId)}
                            className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 active:scale-90 transition-all cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-black px-1.5 min-w-[18px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const food = foodItems.find(f => f.id === item.itemId);
                              if (food) handleAddItem(food);
                            }}
                            className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 active:scale-90 transition-all cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Per-dish note */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                        <button
                          type="button"
                          onClick={() => handleOpenItemNote(item.itemId)}
                          className="text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <MessageSquare className="w-2.5 h-2.5" />
                          <span>{item.specialInstructions ? item.specialInstructions : "+ Add Cooking Instruction"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.itemId)}
                          className="text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Cart Footer: General Notes + Punch KOT */}
              <div className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
                
                {/* General Table Notes */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Special Table Instructions (KOT Note)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Serve starters first, Less spicy..."
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Totals */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                    <span>Subtotal ({totalItemCount} items)</span>
                    <span>{currency}{subtotal.toFixed(0)}</span>
                  </div>
                  {taxRate > 0 && (
                    <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                      <span>Tax & GST ({taxRate}%)</span>
                      <span>{currency}{taxAmount.toFixed(0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm text-slate-900 dark:text-white pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span>Total KOT Value:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                      {currency}{grandTotal.toFixed(0)}
                    </span>
                  </div>
                </div>

                {/* Dispatch KOT Button */}
                <button
                  type="button"
                  onClick={handlePunchOrder}
                  disabled={isSubmitting || cartList.length === 0}
                  className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-black py-3.5 px-4 rounded-2xl transition-all shadow-lg shadow-emerald-600/25 text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Zap className="w-4 h-4 fill-current text-amber-300 animate-pulse" />
                  <span>{isSubmitting ? "DISPATCHING KOT..." : "DISPATCH KOT TO KITCHEN ⚡"}</span>
                </button>
              </div>

            </div>

            {/* MOBILE FLOATING STICKY CART BAR & SLIDE-UP DRAWER */}
            {totalItemCount > 0 && (
              <div className="lg:hidden absolute bottom-0 left-0 right-0 z-30 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
                <div className="pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => setIsMobileCartDrawerOpen(true)}
                    className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white p-3.5 rounded-2xl font-black text-xs shadow-2xl flex items-center justify-between border border-white/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-black">
                        {totalItemCount}
                      </span>
                      <span>Review KOT Ticket</span>
                    </div>

                    <div className="flex items-center gap-1 text-amber-300">
                      <span>{currency}{grandTotal.toFixed(0)}</span>
                      <ChevronUp className="w-4 h-4" />
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* MOBILE CART SLIDE-UP BOTTOM SHEET */}
            {isMobileCartDrawerOpen && (
              <div className="lg:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center animate-fade-in">
                <div className="bg-white dark:bg-slate-900 rounded-t-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border-t border-slate-200 dark:border-slate-800 animate-slide-up">
                  
                  {/* Drawer Header */}
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
                    <div className="flex items-center gap-2">
                      <ChefHat className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <h3 className="font-black text-xs text-slate-900 dark:text-white">
                        Review KOT for {currentSelectedTable ? `Table ${currentSelectedTable.number}` : "Selected Table"}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMobileCartDrawerOpen(false)}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Drawer Items List */}
                  <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
                    {cartList.map(item => (
                      <div
                        key={item.itemId}
                        className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {item.name}
                            </h4>
                            <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                              {currency}{(item.price * item.quantity).toFixed(0)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5">
                            <button
                              type="button"
                              onClick={() => handleDecrementItem(item.itemId)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 active:scale-90 transition-all cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-black px-1.5 min-w-[18px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const food = foodItems.find(f => f.id === item.itemId);
                                if (food) handleAddItem(food);
                              }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 active:scale-90 transition-all cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px]">
                          <button
                            type="button"
                            onClick={() => handleOpenItemNote(item.itemId)}
                            className="text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <MessageSquare className="w-2.5 h-2.5" />
                            <span>{item.specialInstructions ? item.specialInstructions : "+ Add Cooking Instruction"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.itemId)}
                            className="text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Drawer Footer */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    <input
                      type="text"
                      placeholder="Special Table Instructions (e.g. Less spicy)..."
                      value={generalNotes}
                      onChange={(e) => setGeneralNotes(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />

                    <div className="flex justify-between items-center font-black text-sm text-slate-900 dark:text-white">
                      <span>Total ({totalItemCount} dishes):</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                        {currency}{grandTotal.toFixed(0)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handlePunchOrder}
                      disabled={isSubmitting || cartList.length === 0}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-95"
                    >
                      <Zap className="w-4 h-4 fill-current text-amber-300" />
                      <span>{isSubmitting ? "DISPATCHING KOT..." : "DISPATCH KOT TO KITCHEN ⚡"}</span>
                    </button>
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* DISH SPECIAL INSTRUCTIONS POPUP MODAL */}
      {activeItemNoteId && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-scale-in">
            <div>
              <h4 className="font-black text-sm text-slate-900 dark:text-white">
                Cooking Instruction Note
              </h4>
              <p className="text-[11px] text-slate-400">
                For: {cartItems[activeItemNoteId]?.name}
              </p>
            </div>

            <input
              type="text"
              autoFocus
              placeholder="e.g. No onion, Extra spicy, Crispy..."
              value={itemNoteText}
              onChange={(e) => setItemNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveItemNote();
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setActiveItemNoteId(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveItemNote}
                className="px-4 py-1.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs cursor-pointer"
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
