import React, { useState, useEffect, useMemo } from "react";
import { useRestaurant } from "../../context/RestaurantContext";
import { FoodItem, MenuCategory, OrderItem, RestaurantOrder, OrderType, RestaurantTable } from "../../types";
import { parseFoodItemDescription } from "../../services/database";
import { printKOTReceipt } from "../../utils/printUtils";
import {
  X,
  Search,
  Plus,
  Minus,
  Trash2,
  Zap,
  CheckCircle2,
  ChefHat,
  MessageSquare,
  Clock,
  Printer,
  RotateCcw,
  Sparkles,
  ShoppingBag,
  UtensilsCrossed,
  User,
  Phone,
  Tag,
  ArrowRight,
  Receipt
} from "lucide-react";

interface CaptainOrderPunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTableId?: string;
  initialOrderType?: OrderType;
  onOrderPunched?: (order: RestaurantOrder) => void;
}

const QUICK_INSTRUCTION_PRESETS = [
  "Less Spicy 🌶️",
  "Extra Spicy 🔥",
  "No Onion/Garlic 🧅",
  "Extra Crispy",
  "Pack Separately 📦",
  "Less Oil",
  "No Sugar",
  "Extra Chutney/Dip"
];

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
    orders,
    punchTableOrder,
    punchTakeawayOrder,
    currentUser,
    settings,
    showToast
  } = useRestaurant();

  // Mode: Dine-In Table or Takeaway / Parcel
  const [orderType, setOrderType] = useState<OrderType>(initialOrderType);
  const [selectedTableId, setSelectedTableId] = useState<string>(initialTableId || "");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [tokenNumber, setTokenNumber] = useState<string>("");

  // Cart state: itemId -> OrderItem
  const [cartItems, setCartItems] = useState<{ [itemId: string]: OrderItem }>({});
  const [generalNotes, setGeneralNotes] = useState<string>("");

  // Filter & Search states
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [dietaryFilter, setDietaryFilter] = useState<"all" | "veg" | "non_veg">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Note Modal state for specific dish
  const [activeItemNoteId, setActiveItemNoteId] = useState<string | null>(null);
  const [itemNoteText, setItemNoteText] = useState<string>("");

  // Submitting & success states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [punchedOrder, setPunchedOrder] = useState<RestaurantOrder | null>(null);

  // Mobile Bottom Cart Sheet
  const [isMobileCartDrawerOpen, setIsMobileCartDrawerOpen] = useState<boolean>(false);

  const currency = settings?.currency || "₹";

  // Auto-generate Token Number for Takeaway
  useEffect(() => {
    if (orderType === "takeaway" && !tokenNumber) {
      const todayTakeaways = orders.filter((o: RestaurantOrder) => {
        const isToday = new Date(o.createdAt).toDateString() === new Date().toDateString();
        return isToday && (o.orderType === "takeaway" || !!o.tokenNumber);
      });
      const nextNum = todayTakeaways.length + 1;
      setTokenNumber(`TK-${String(nextNum).padStart(2, "0")}`);
    }
  }, [orderType, orders, tokenNumber]);

  // Sync initial props
  useEffect(() => {
    if (initialTableId) {
      setSelectedTableId(initialTableId);
    } else if (tables.length > 0 && !selectedTableId) {
      setSelectedTableId(tables[0].id);
    }
    if (initialOrderType) {
      setOrderType(initialOrderType);
    }
  }, [initialTableId, initialOrderType, tables]);

  // Filtered Food Items
  const filteredItems = useMemo(() => {
    return foodItems.filter((item: FoodItem) => {
      if (!item.isAvailable) return false;
      if (selectedCategoryId !== "all" && item.categoryId !== selectedCategoryId) return false;
      if (dietaryFilter === "veg" && !item.isVeg) return false;
      if (dietaryFilter === "non_veg" && item.isVeg) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = item.name.toLowerCase().includes(q);
        const descMatch = (item.description || "").toLowerCase().includes(q);
        if (!nameMatch && !descMatch) return false;
      }
      return true;
    });
  }, [foodItems, selectedCategoryId, dietaryFilter, searchQuery]);

  // Cart Totals
  const cartList = useMemo(() => Object.values(cartItems), [cartItems]);
  const subtotal = useMemo(() => cartList.reduce((acc, curr) => acc + curr.price * curr.quantity, 0), [cartList]);
  const taxPercentage = settings?.taxPercentage ?? 0;
  const taxAmount = Math.round(subtotal * (taxPercentage / 100) * 100) / 100;
  const grandTotal = Math.round((subtotal + taxAmount) * 100) / 100;
  const totalItemCount = useMemo(() => cartList.reduce((acc, curr) => acc + curr.quantity, 0), [cartList]);

  // Cart operations
  const handleAddItem = (item: FoodItem) => {
    setCartItems(prev => {
      const existing = prev[item.id];
      const newQty = existing ? existing.quantity + 1 : 1;
      return {
        ...prev,
        [item.id]: {
          itemId: item.id,
          name: item.name,
          price: item.price,
          quantity: newQty,
          specialInstructions: existing?.specialInstructions || ""
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
        [itemId]: {
          ...existing,
          quantity: existing.quantity - 1
        }
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
    if (!activeItemNoteId) return;
    setCartItems(prev => {
      const existing = prev[activeItemNoteId];
      if (!existing) return prev;
      return {
        ...prev,
        [activeItemNoteId]: {
          ...existing,
          specialInstructions: itemNoteText.trim()
        }
      };
    });
    setActiveItemNoteId(null);
    setItemNoteText("");
  };

  const handleApplyPresetNote = (preset: string) => {
    setItemNoteText(prev => {
      if (!prev.trim()) return preset;
      return `${prev}, ${preset}`;
    });
  };

  // Submit Order Action
  const handlePunchOrder = async () => {
    if (cartList.length === 0) {
      showToast("Please add at least one dish item", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      let createdOrder: RestaurantOrder;

      if (orderType === "takeaway") {
        createdOrder = await punchTakeawayOrder(
          cartList,
          {
            customerName: customerName.trim() || undefined,
            customerPhone: customerPhone.trim() || undefined,
            tokenNumber: tokenNumber.trim() || undefined,
            specialInstructions: generalNotes.trim() || undefined
          },
          currentUser?.id
        );
      } else {
        if (!selectedTableId) {
          showToast("Please select a dining table first", "error");
          setIsSubmitting(false);
          return;
        }
        createdOrder = await punchTableOrder(
          selectedTableId,
          cartList,
          generalNotes.trim() || undefined,
          currentUser?.id
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

  const currentSelectedTable = tables.find((t: RestaurantTable) => t.id === selectedTableId);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-0 sm:p-3 md:p-4 lg:p-6 animate-fade-in">
      <div 
        className="w-full h-[100dvh] sm:h-[92vh] sm:max-h-[820px] sm:w-[96vw] sm:max-w-[1240px] bg-white dark:bg-slate-900 rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col relative"
      >
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-3.5 sm:px-6 py-2.5 sm:py-3.5 text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${
              orderType === "takeaway"
                ? "bg-orange-500/20 text-orange-400 border-orange-400/30"
                : "bg-emerald-500/20 text-emerald-400 border-emerald-400/30"
            }`}>
              {orderType === "takeaway" ? <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" /> : <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-base font-black tracking-tight text-white truncate">
                  {orderType === "takeaway" ? "Takeaway & Parcel Order Puncher" : "Captain Floor Order Puncher"}
                </h2>
                <span className={`text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full border uppercase tracking-wider shrink-0 ${
                  orderType === "takeaway"
                    ? "bg-orange-500/20 text-orange-300 border-orange-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                }`}>
                  {orderType === "takeaway" ? "🛍️ Takeaway" : "🍽️ Table KOT"}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-300 truncate">
                {orderType === "takeaway"
                  ? `Token #${tokenNumber || "TK-01"} • Instant Silent KOT`
                  : (currentSelectedTable ? `Table ${currentSelectedTable.number} (${currentSelectedTable.capacity} Seats)` : "Select table & add dishes")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 ml-2 active:scale-95"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PUNCHED ORDER SUCCESS VIEW */}
        {punchedOrder ? (
          <div className="p-4 sm:p-8 flex-1 overflow-y-auto flex flex-col items-center justify-center text-center space-y-4 sm:space-y-5 animate-scale-in">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10 animate-bounce-short">
              <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Kitchen Order Ticket Dispatched
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Order #{punchedOrder.orderNumber} Generated!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                Successfully assigned to <strong>{punchedOrder.tableName}</strong>. Dishes are queued in Live Kitchen Display (KDS).
              </p>
            </div>

            {/* KOT Summary Box */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 w-full max-w-md text-left space-y-3 shadow-sm">
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
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-center w-full max-w-md">
              <button
                type="button"
                onClick={() => printKOTReceipt(punchedOrder, settings?.name || "Kitchen", "80mm", true)}
                className="w-full sm:flex-1 bg-slate-900 hover:bg-slate-800 text-white font-black py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Print Kitchen KOT</span>
              </button>

              <button
                type="button"
                onClick={handleResetForNext}
                className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Punch Next Order</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-300 cursor-pointer pt-1"
            >
              Close Window
            </button>
          </div>
        ) : (
          /* MAIN ORDER PUNCHING WORKSPACE */
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative min-h-0">
            
            {/* LEFT 7/12: MENU BROWSING & SEARCH */}
            <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 h-full overflow-hidden min-h-0">
              
              {/* Controls Bar: Order Mode + Table / Customer Details + Search */}
              <div className="p-2.5 sm:p-3.5 bg-slate-50/95 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 space-y-2 sm:space-y-2.5 shrink-0">
                
                {/* Row 1: Mode Switcher & Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {/* Mode Segmented Toggle */}
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/80 dark:bg-slate-800 rounded-2xl shrink-0">
                    <button
                      type="button"
                      onClick={() => setOrderType("dine_in")}
                      className={`py-1.5 px-2.5 sm:px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        orderType === "dine_in"
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-500" />
                      <span>🍽️ Table</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType("takeaway")}
                      className={`py-1.5 px-2.5 sm:px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        orderType === "takeaway"
                          ? "bg-orange-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>🛍️ Takeaway</span>
                    </button>
                  </div>

                  {/* Search Field */}
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search dishes or item name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8.5 pr-7 py-1.5 sm:py-2 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Row 2: Target Assignment (Table Dropdown OR Takeaway Fields) */}
                {orderType === "dine_in" ? (
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-800/80 p-1.5 sm:p-2 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                    <span className="text-[10px] sm:text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 pl-1 shrink-0 flex items-center gap-1">
                      <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Table:</span>
                    </span>
                    <select
                      value={selectedTableId}
                      onChange={(e) => setSelectedTableId(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="" disabled>-- Select Table --</option>
                      {tables.map((t: RestaurantTable) => (
                        <option key={t.id} value={t.id}>
                          Table {t.number} ({t.status.toUpperCase()} • Cap: {t.capacity} Seats)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-stretch gap-1.5 sm:gap-2 bg-orange-50/70 dark:bg-orange-950/20 p-2 rounded-xl border border-orange-200/80 dark:border-orange-900/40 shadow-2xs">
                    {/* Token Number */}
                    <div className="flex items-center gap-1.5 sm:w-28 shrink-0 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-900/60 rounded-lg px-2 py-1 shadow-2xs">
                      <Tag className="w-3 h-3 text-orange-500 shrink-0" />
                      <input
                        type="text"
                        value={tokenNumber}
                        onChange={(e) => setTokenNumber(e.target.value)}
                        placeholder="Token #"
                        className="w-full bg-transparent text-xs font-black text-orange-600 dark:text-orange-400 font-mono focus:outline-none"
                      />
                    </div>

                    {/* Customer Name */}
                    <div className="flex-1 flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 shadow-2xs">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Customer Name (Optional)"
                        className="w-full bg-transparent text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                      />
                    </div>

                    {/* Customer Phone */}
                    <div className="flex-1 flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 shadow-2xs">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Mobile No. (Optional)"
                        className="w-full bg-transparent text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Dietary Filter & Categories Horizontal Carousel */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5 pb-0.5">
                  {/* Dietary Quick Toggles */}
                  <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 shrink-0 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setDietaryFilter("all")}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        dietaryFilter === "all"
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs font-black"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setDietaryFilter("veg")}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        dietaryFilter === "veg"
                          ? "bg-emerald-600 text-white shadow-xs font-black"
                          : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      }`}
                    >
                      <span>🌱</span>
                      <span>Veg</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDietaryFilter("non_veg")}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        dietaryFilter === "non_veg"
                          ? "bg-rose-600 text-white shadow-xs font-black"
                          : "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      }`}
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
                    className={`px-3 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                      selectedCategoryId === "all"
                        ? "bg-amber-500 text-white shadow-sm font-black"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                    }`}
                  >
                    All Items ({foodItems.length})
                  </button>

                  {categories.map((cat: MenuCategory) => {
                    const count = foodItems.filter((f: FoodItem) => f.categoryId === cat.id).length;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`px-3 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                          selectedCategoryId === cat.id
                            ? "bg-amber-500 text-white shadow-sm font-black"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                        }`}
                      >
                        {cat.name} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Food Items Grid */}
              <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 pb-24 lg:pb-4 min-h-0">
                {filteredItems.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                    <UtensilsCrossed className="w-10 h-10 stroke-1 opacity-40 text-slate-300" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No matching dishes found</p>
                    <p className="text-[10px] text-slate-400">Try changing the category filter or search query.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                    {filteredItems.map((item: FoodItem) => {
                      const inCart = cartItems[item.id];
                      return (
                        <div
                          key={item.id}
                          className={`p-2.5 sm:p-3 rounded-2xl border transition-all flex flex-col justify-between shadow-2xs hover:shadow-sm ${
                            inCart
                              ? "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/60 shadow-xs"
                              : "bg-white dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${item.isVeg ? "bg-emerald-500" : "bg-rose-500"}`} />
                                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
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
                            <span className="font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 shrink-0">
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
                                className="text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-amber-600 flex items-center gap-1 cursor-pointer py-1"
                              >
                                <MessageSquare className="w-3 h-3 text-amber-500" />
                                <span>{inCart.specialInstructions ? "Edit Note" : "+ Note"}</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{item.preparationTime || 15}m</span>
                              </span>
                            )}

                            {/* Stepper / Add Button */}
                            {inCart ? (
                              <div className="flex items-center gap-1 bg-amber-500 text-white rounded-xl p-0.5 shadow-sm">
                                <button
                                  type="button"
                                  onClick={() => handleDecrementItem(item.id)}
                                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center hover:bg-amber-600 active:scale-90 transition-all cursor-pointer"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-xs font-black px-1.5 min-w-[20px] text-center">
                                  {inCart.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAddItem(item)}
                                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center hover:bg-amber-600 active:scale-90 transition-all cursor-pointer"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddItem(item)}
                                className="bg-slate-900 dark:bg-white hover:bg-emerald-600 dark:hover:bg-emerald-400 text-white dark:text-slate-900 hover:text-white dark:hover:text-slate-900 text-[11px] font-black px-3.5 py-1.5 sm:py-2 rounded-xl transition-all active:scale-95 flex items-center gap-1 cursor-pointer shadow-xs"
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

            {/* RIGHT 5/12: LIVE KOT CART & PUNCH PANEL (Desktop / Wide screens) */}
            <div className="hidden lg:flex lg:col-span-5 flex-col bg-slate-50 dark:bg-slate-950/50 h-full overflow-hidden border-l border-slate-200 dark:border-slate-800 min-h-0">
              
              {/* Cart Header */}
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <ChefHat className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-xs text-slate-900 dark:text-white">
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
              <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                {cartList.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No dishes added yet</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Click + Add on items from the menu to build the KOT ticket.</p>
                    </div>
                  </div>
                ) : (
                  cartList.map(item => (
                    <div
                      key={item.itemId}
                      className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5 shadow-2xs"
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

                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5">
                          <button
                            type="button"
                            onClick={() => handleDecrementItem(item.itemId)}
                            className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 active:scale-90 transition-all cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-black px-1.5 min-w-[18px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const food = foodItems.find((f: FoodItem) => f.id === item.itemId);
                              if (food) handleAddItem(food);
                            }}
                            className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 active:scale-90 transition-all cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Special instructions badge or trigger */}
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
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Cart Footer & Action */}
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-2.5 shrink-0">
                
                {/* General Note */}
                <div>
                  <input
                    type="text"
                    placeholder={orderType === "takeaway" ? "Takeaway Parcel Note (e.g. Extra chutney)..." : "Table Note (e.g. Serve starters first)..."}
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                </div>

                {/* Subtotal & Totals */}
                <div className="space-y-0.5 text-xs">
                  <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                    <span>Subtotal ({totalItemCount} items)</span>
                    <span className="font-bold">{currency}{subtotal.toFixed(0)}</span>
                  </div>
                  {taxPercentage > 0 && (
                    <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                      <span>Taxes & GST ({taxPercentage}%)</span>
                      <span className="font-bold">{currency}{taxAmount.toFixed(0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center font-black text-xs text-slate-900 dark:text-white pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span>Total KOT Value:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                      {currency}{grandTotal.toFixed(0)}
                    </span>
                  </div>
                </div>

                {/* Dispatch Button */}
                <button
                  type="button"
                  onClick={handlePunchOrder}
                  disabled={isSubmitting || cartList.length === 0}
                  className={`w-full text-white font-black py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 ${
                    cartList.length === 0
                      ? "bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none"
                      : orderType === "takeaway"
                        ? "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 shadow-orange-500/25"
                        : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/25"
                  }`}
                >
                  <Zap className="w-4 h-4 fill-current text-amber-300" />
                  <span>
                    {isSubmitting
                      ? "DISPATCHING KOT..."
                      : orderType === "takeaway"
                        ? `DISPATCH TAKEAWAY KOT (${currency}${grandTotal.toFixed(0)}) ⚡`
                        : `DISPATCH KOT TO KITCHEN (${currency}${grandTotal.toFixed(0)}) ⚡`}
                  </span>
                </button>

              </div>

            </div>

            {/* MOBILE & TABLET FLOATING CART BAR (Inside modal view) */}
            <div className="lg:hidden absolute bottom-0 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-2xl z-30">
              <div
                onClick={() => setIsMobileCartDrawerOpen(true)}
                className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black text-xs shadow-md shrink-0">
                  {totalItemCount}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 uppercase font-black truncate">
                    {orderType === "takeaway" ? `Takeaway ${tokenNumber || "Token"}` : (currentSelectedTable ? `Table ${currentSelectedTable.number}` : "Table Order")}
                  </p>
                  <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                    {currency}{grandTotal.toFixed(0)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (cartList.length === 0) {
                    showToast("Please add dishes to order first", "info");
                  } else {
                    setIsMobileCartDrawerOpen(true);
                  }
                }}
                className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-xs flex items-center gap-1.5 transition-all active:scale-95 text-white shadow-md cursor-pointer shrink-0 ${
                  orderType === "takeaway" ? "bg-orange-600 hover:bg-orange-500 shadow-orange-600/30" : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
                }`}
              >
                <span>Review & Dispatch</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* MOBILE CART BOTTOM DRAWER */}
            {isMobileCartDrawerOpen && (
              <div className="lg:hidden absolute inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end justify-center animate-fade-in">
                <div className="bg-white dark:bg-slate-900 rounded-t-3xl w-full max-h-[90%] flex flex-col shadow-2xl border-t border-slate-200 dark:border-slate-800 animate-slide-up overflow-hidden">
                  
                  {/* Drawer Handle & Header */}
                  <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-900">
                    <div className="flex items-center gap-2">
                      <ChefHat className="w-5 h-5 text-emerald-500" />
                      <h3 className="font-black text-sm text-slate-900 dark:text-white">
                        Review KOT ({totalItemCount} {totalItemCount === 1 ? "dish" : "dishes"})
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMobileCartDrawerOpen(false)}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Drawer Items List */}
                  <div className="p-3 sm:p-4 overflow-y-auto space-y-2.5 flex-1 min-h-0">
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
                                const food = foodItems.find((f: FoodItem) => f.id === item.itemId);
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
                            className="text-slate-400 hover:text-rose-500 cursor-pointer p-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Drawer Footer */}
                  <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 space-y-2.5 shrink-0">
                    <input
                      type="text"
                      placeholder={orderType === "takeaway" ? "Takeaway Parcel Note (e.g. Extra chutney)..." : "Special Table Instructions (e.g. Less spicy)..."}
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
                      className={`w-full text-white font-black py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95 ${
                        orderType === "takeaway"
                          ? "bg-gradient-to-r from-orange-500 to-amber-600 shadow-orange-600/30"
                          : "bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-600/30"
                      }`}
                    >
                      <Zap className="w-4 h-4 fill-current text-amber-300" />
                      <span>{isSubmitting ? "DISPATCHING KOT..." : (orderType === "takeaway" ? `DISPATCH TAKEAWAY KOT (${currency}${grandTotal.toFixed(0)}) ⚡` : `DISPATCH KOT TO KITCHEN (${currency}${grandTotal.toFixed(0)}) ⚡`)}</span>
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
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-scale-in">
            <div>
              <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Kitchen Cooking Note</span>
              </div>
              <h4 className="font-black text-sm text-slate-900 dark:text-white mt-0.5">
                {cartItems[activeItemNoteId]?.name}
              </h4>
              <p className="text-[11px] text-slate-400">
                Add special dietary or preparation requests for the chef.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_INSTRUCTION_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPresetNote(preset)}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 hover:text-amber-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95"
                >
                  {preset}
                </button>
              ))}
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

            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setActiveItemNoteId(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveItemNote}
                className="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs cursor-pointer active:scale-95"
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
