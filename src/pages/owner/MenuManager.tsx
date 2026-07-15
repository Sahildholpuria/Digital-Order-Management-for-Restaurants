import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { FoodItem, MenuCategory } from '../../types';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Copy, 
  ChevronUp, 
  ChevronDown, 
  Sparkles, 
  Flame, 
  Tag, 
  Check, 
  X, 
  HelpCircle,
  EyeOff,
  Eye
} from 'lucide-react';

export const MenuManager: React.FC = () => {
  const { 
    categories, 
    foodItems, 
    addCategory, 
    deleteCategory, 
    addFoodItem, 
    deleteFoodItem, 
    settings 
  } = useRestaurant();

  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');

  // Category Edit States
  const [isCatOpen, setIsCatOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');

  // Item Edit States
  const [isItemOpen, setIsItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  
  // Food Item Form States
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState<number>(0);
  const [itemImage, setItemImage] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemCat, setItemCat] = useState('');
  const [itemVeg, setItemVeg] = useState(true);
  const [itemPrep, setItemPrep] = useState<number>(10);
  const [itemAvailable, setItemAvailable] = useState(true);
  const [itemPopular, setItemPopular] = useState(false);
  const [itemRecommended, setItemRecommended] = useState(false);
  const [itemSpicy, setItemSpicy] = useState<number>(0);
  const [itemDiscount, setItemDiscount] = useState<number>(0);

  const currency = settings?.currency || '₹';

  // Sort categories by order field
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  // CATEGORY OPERATIONS
  const handleOpenAddCat = () => {
    setEditingCategory(null);
    setCategoryName('');
    setIsCatOpen(true);
  };

  const handleOpenEditCat = (cat: MenuCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setIsCatOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName) return;

    const newCategory: MenuCategory = {
      id: editingCategory ? editingCategory.id : `cat-${Date.now()}`,
      name: categoryName,
      order: editingCategory ? editingCategory.order : categories.length + 1,
      createdAt: editingCategory ? editingCategory.createdAt : new Date().toISOString()
    };

    await addCategory(newCategory);
    setIsCatOpen(false);
  };

  const handleDeleteCat = async (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Check if food items belong to this category
    const count = foodItems.filter(i => i.categoryId === categoryId).length;
    if (count > 0) {
      alert(`Cannot delete this category. It contains ${count} food items. Move the items first.`);
      return;
    }
    if (confirm('Delete this category?')) {
      await deleteCategory(categoryId);
      if (activeCategoryId === categoryId) {
        setActiveCategoryId('all');
      }
    }
  };

  const handleMoveCategory = async (cat: MenuCategory, direction: 'up' | 'down') => {
    const currentIndex = sortedCategories.findIndex(c => c.id === cat.id);
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === sortedCategories.length - 1) return;

    const swapTargetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetCat = sortedCategories[swapTargetIndex];

    // Swap orders
    const tempOrder = cat.order;
    await addCategory({ ...cat, order: targetCat.order });
    await addCategory({ ...targetCat, order: tempOrder });
  };

  // FOOD ITEM OPERATIONS
  const handleOpenAddItem = () => {
    setEditingItem(null);
    setItemName('');
    setItemPrice(0);
    setItemImage('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60'); // healthy plate placeholder
    setItemDesc('');
    setItemCat(categories[0]?.id || '');
    setItemVeg(true);
    setItemPrep(10);
    setItemAvailable(true);
    setItemPopular(false);
    setItemRecommended(false);
    setItemSpicy(0);
    setItemDiscount(0);
    setIsItemOpen(true);
  };

  const handleOpenEditItem = (item: FoodItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemPrice(item.price);
    setItemImage(item.image);
    setItemDesc(item.description);
    setItemCat(item.categoryId);
    setItemVeg(item.isVeg);
    setItemPrep(item.preparationTime);
    setItemAvailable(item.isAvailable);
    setItemPopular(item.isPopular);
    setItemRecommended(item.isRecommended);
    setItemSpicy(item.spicyLevel);
    setItemDiscount(item.discountPercentage);
    setIsItemOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !itemCat) return;

    const newItem: FoodItem = {
      id: editingItem ? editingItem.id : `item-${Date.now()}`,
      name: itemName,
      price: Number(itemPrice),
      image: itemImage,
      description: itemDesc,
      categoryId: itemCat,
      isVeg: itemVeg,
      preparationTime: Number(itemPrep),
      isAvailable: itemAvailable,
      isPopular: itemPopular,
      isRecommended: itemRecommended,
      spicyLevel: itemSpicy as any,
      discountPercentage: Number(itemDiscount),
      updatedAt: new Date().toISOString()
    };

    await addFoodItem(newItem);
    setIsItemOpen(false);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (confirm('Are you sure you want to delete this menu item?')) {
      await deleteFoodItem(itemId);
    }
  };

  const handleDuplicateItem = async (item: FoodItem) => {
    const cloned: FoodItem = {
      ...item,
      id: `item-clone-${Date.now()}`,
      name: `${item.name} (Copy)`,
      updatedAt: new Date().toISOString()
    };
    await addFoodItem(cloned);
  };

  const handleToggleAvailable = async (item: FoodItem) => {
    await addFoodItem({
      ...item,
      isAvailable: !item.isAvailable,
      updatedAt: new Date().toISOString()
    });
  };

  // Filter items based on category
  const filteredItems = foodItems.filter(item => {
    return activeCategoryId === 'all' || item.categoryId === activeCategoryId;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight font-sans">
            Menu Organizer
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Structure your dishes by category, set spicy metrics, discount margins, and manage stocks.
          </p>
        </div>

        <button
          onClick={handleOpenAddItem}
          disabled={categories.length === 0}
          className="bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold px-5 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-md shadow-brand-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>Add Food Item</span>
        </button>
      </div>

      {/* Main menu content layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Categories Manager list */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-5 rounded-3xl shadow-sm space-y-4 lg:col-span-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-850">
              <h3 className="font-extrabold text-slate-700 dark:text-slate-205 text-sm uppercase tracking-wider">Categories</h3>
              <button 
                onClick={handleOpenAddCat}
                className="text-brand-650 hover:text-brand-800 p-1 bg-brand-50 hover:bg-brand-100 dark:bg-slate-800 dark:text-brand-405 dark:hover:bg-slate-750 rounded-xl"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-[50vh] lg:max-h-none overflow-y-auto pr-1">
              <button
                onClick={() => setActiveCategoryId('all')}
                className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between ${
                  activeCategoryId === 'all'
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400'
                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <span>All Food Items</span>
                <span className="bg-slate-200 dark:bg-slate-800 text-slate-650 dark:text-slate-350 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {foodItems.length}
                </span>
              </button>

              {sortedCategories.map(cat => {
                const count = foodItems.filter(i => i.categoryId === cat.id).length;
                return (
                  <div 
                    key={cat.id}
                    onClick={() => setActiveCategoryId(cat.id)}
                    className={`w-full px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer group ${
                      activeCategoryId === cat.id
                        ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400'
                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <span className="truncate pr-2">{cat.name}</span>
                    
                    <div className="flex items-center gap-1.5">
                      <span className="bg-slate-105 dark:bg-slate-800 group-hover:bg-white text-slate-655 text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                        {count}
                      </span>
                      
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMoveCategory(cat, 'up'); }}
                          className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 rounded"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMoveCategory(cat, 'down'); }}
                          className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 rounded"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleOpenEditCat(cat, e)}
                          className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 rounded"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteCat(cat.id, e)}
                          className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="lg:col-span-3">
          {filteredItems.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 rounded-3xl p-12 text-center text-slate-400">
              No food items found in this category. Click "Add Food Item" to start creating.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredItems.map(item => {
                const discPrice = item.price * (1 - (item.discountPercentage || 0) / 100);
                return (
                  <div 
                    key={item.id}
                    className={`bg-white dark:bg-slate-900 border rounded-3xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all ${
                      item.isAvailable ? 'border-slate-150/60 dark:border-slate-850' : 'border-dashed border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div>
                      {/* Image Box */}
                      <div className="relative w-full h-40 bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden mb-3.5">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        
                        {/* Veg indicator badge */}
                        <span className={`absolute top-2.5 left-2.5 w-5 h-5 bg-white/90 border rounded-md flex items-center justify-center ${
                          item.isVeg ? 'border-green-600' : 'border-red-600'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            item.isVeg ? 'bg-green-600' : 'bg-red-600'
                          }`}></span>
                        </span>

                        {/* Discount Tag */}
                        {item.discountPercentage > 0 && (
                          <span className="absolute bottom-2.5 left-2.5 bg-red-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow">
                            <Tag className="w-3 h-3" />
                            <span>{item.discountPercentage}% OFF</span>
                          </span>
                        )}

                        {/* Availability override banner */}
                        {!item.isAvailable && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold uppercase tracking-wider">
                            Out of Stock
                          </div>
                        )}
                      </div>

                      {/* Item content details */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-start gap-1">
                          <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-105 leading-snug line-clamp-1">
                            {item.name}
                          </h3>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {/* Tags & Badges */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {item.isPopular && (
                          <span className="bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" />
                            Popular
                          </span>
                        )}
                        {item.isRecommended && (
                          <span className="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" />
                            Recommended
                          </span>
                        )}
                        {item.spicyLevel > 0 && (
                          <span className="bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400 text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5">
                            <Flame className="w-2.5 h-2.5 fill-current" />
                            <span>Spicy {item.spicyLevel}</span>
                          </span>
                        )}
                        <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[9px] font-semibold px-2 py-0.5 rounded-md">
                          {item.preparationTime}m prep
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3.5 border-t border-slate-50 dark:border-slate-850/40 flex items-center justify-between">
                      <div>
                        <span className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                          {currency}{discPrice.toFixed(0)}
                        </span>
                        {item.discountPercentage > 0 && (
                          <span className="text-[11px] text-slate-400 line-through block leading-tight">
                            {currency}{item.price}
                          </span>
                        )}
                      </div>

                      {/* Card Operations */}
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleToggleAvailable(item)}
                          className={`p-2 border rounded-xl transition-all ${
                            item.isAvailable 
                              ? 'border-slate-205 text-slate-400 hover:text-slate-600 dark:border-slate-800' 
                              : 'bg-red-500 border-red-500 text-white'
                          }`}
                          title={item.isAvailable ? "Set Unavailable" : "Set Available"}
                        >
                          {item.isAvailable ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDuplicateItem(item)}
                          className="p-2 border border-slate-205 dark:border-slate-800 text-slate-400 hover:text-slate-655 rounded-xl transition-colors"
                          title="Clone Item"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditItem(item)}
                          className="p-2 border border-slate-205 dark:border-slate-800 text-slate-400 hover:text-slate-655 rounded-xl transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-2 border border-slate-205 dark:border-slate-800 text-slate-400 hover:text-red-500 rounded-xl transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Add/Edit Category Modal */}
      {isCatOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveCategory} className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 animate-slide-up">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-805 dark:text-slate-100 text-lg">
                {editingCategory ? 'Rename Category' : 'Create Category'}
              </h3>
              <p className="text-xs text-slate-400">Enter a category name for food items sorting.</p>
            </div>

            <div className="p-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Category Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Starters, North Indian, Mocktails"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/60 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCatOpen(false)}
                className="px-4 py-2.5 border border-slate-205 dark:border-slate-850 text-xs font-bold rounded-xl text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl"
              >
                Save Category
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add/Edit Food Item Modal */}
      {isItemOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveItem} className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 animate-slide-up">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg">
                {editingItem ? `Edit ${editingItem.name}` : 'Create Menu Item'}
              </h3>
              <p className="text-xs text-slate-400">Specify details, tags, and stock availability.</p>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              
              {/* Name & Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Item Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Garlic Bread"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Price ({currency})</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={itemPrice}
                    onChange={(e) => setItemPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Category selector & Preparation Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Category</label>
                  <select
                    value={itemCat}
                    onChange={(e) => setItemCat(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Prep Time (mins)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={itemPrep}
                    onChange={(e) => setItemPrep(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Food Image URL</label>
                <input
                  type="text"
                  placeholder="https://unsplash.com/..."
                  value={itemImage}
                  onChange={(e) => setItemImage(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Description</label>
                <textarea
                  placeholder="Summarize the ingredients, taste profiles..."
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Veg / Non-Veg & Spicy & Discount */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Dietary Type</label>
                  <select
                    value={itemVeg ? 'veg' : 'non-veg'}
                    onChange={(e) => setItemVeg(e.target.value === 'veg')}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-3.5 text-xs font-semibold focus:outline-none"
                  >
                    <option value="veg">Veg 🌱</option>
                    <option value="non-veg">Non-Veg 🍗</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Spicy Level</label>
                  <select
                    value={itemSpicy}
                    onChange={(e) => setItemSpicy(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-3.5 text-xs font-semibold focus:outline-none"
                  >
                    <option value={0}>None 🌶️0</option>
                    <option value={1}>Mild 🌶️1</option>
                    <option value={2}>Medium 🌶️2</option>
                    <option value={3}>Hot 🌶️3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Discount %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={itemDiscount}
                    onChange={(e) => setItemDiscount(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Toggles: Popular, Recommended */}
              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={itemPopular}
                    onChange={(e) => setItemPopular(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500 w-4.5 h-4.5"
                  />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Popular Tag</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={itemRecommended}
                    onChange={(e) => setItemRecommended(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500 w-4.5 h-4.5"
                  />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Recommended Tag</span>
                </label>
              </div>

            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/60 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsItemOpen(false)}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-850 text-xs font-bold rounded-xl text-slate-500 hover:bg-slate-105"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl"
              >
                Save Food Item
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
export default MenuManager;
