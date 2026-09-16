import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { FoodItem, MenuCategory, DietaryType } from '../../types';
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
  Eye,
  Upload,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Wheat,
  UtensilsCrossed
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../services/supabase';
import { parseFoodItemDescription, serializeFoodItemDescription } from '../../services/database';
import { FSSAIIndicator } from '../../components/FSSAIIndicator';

export const MenuManager: React.FC = () => {
  const { 
    categories, 
    foodItems, 
    addCategory, 
    deleteCategory, 
    addFoodItem, 
    deleteFoodItem, 
    settings,
    showToast,
    askConfirmation,
    restaurantId
  } = useRestaurant();

  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');

  // Category Edit States
  const [isCatOpen, setIsCatOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');

  // Item Edit States
  const [isItemOpen, setIsItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [variants, setVariants] = useState<{ name: string; price: number }[]>([]);
  
  // Food Item Form States
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState<number>(0);
  const [itemImage, setItemImage] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemCat, setItemCat] = useState('');
  const [itemVeg, setItemVeg] = useState(true);
  const [itemDietaryType, setItemDietaryType] = useState<DietaryType>('veg');
  const [itemServes, setItemServes] = useState('');
  const [itemAllergens, setItemAllergens] = useState<string[]>([]);
  const [itemCalories, setItemCalories] = useState<string>('');
  const [itemPrep, setItemPrep] = useState<number>(10);
  const [itemAvailable, setItemAvailable] = useState(true);
  const [itemPopular, setItemPopular] = useState(false);
  const [itemRecommended, setItemRecommended] = useState(false);
  const [itemSpicy, setItemSpicy] = useState<number>(0);
  const [itemDiscount, setItemDiscount] = useState<number>(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

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
    showToast(editingCategory ? 'Category updated successfully!' : 'Category created successfully!', 'success');
    setIsCatOpen(false);
  };

  const handleDeleteCat = async (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Check if food items belong to this category
    const count = foodItems.filter(i => i.categoryId === categoryId).length;
    if (count > 0) {
      showToast(`Cannot delete this category. It contains ${count} food items. Move the items first.`, 'error');
      return;
    }
    askConfirmation(
      'Delete Category?',
      'Are you sure you want to permanently delete this category? This action cannot be undone.',
      async () => {
        await deleteCategory(categoryId);
        if (activeCategoryId === categoryId) {
          setActiveCategoryId('all');
        }
        showToast('Category deleted successfully.', 'success');
      }
    );
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
    setVariants([]);
    setItemCat(categories[0]?.id || '');
    setItemVeg(true);
    setItemDietaryType('veg');
    setItemServes('');
    setItemAllergens([]);
    setItemCalories('');
    setItemPrep(10);
    setItemAvailable(true);
    setItemPopular(false);
    setItemRecommended(false);
    setItemSpicy(0);
    setItemDiscount(0);
    setImageError(null);
    setIsUploadingImage(false);
    setIsItemOpen(true);
  };

  const handleOpenEditItem = (item: FoodItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemPrice(item.price);
    setItemImage(item.image);
    setItemCat(item.categoryId);
    setItemPrep(item.preparationTime);
    setItemAvailable(item.isAvailable);
    setItemPopular(item.isPopular);
    setItemRecommended(item.isRecommended);
    setItemSpicy(item.spicyLevel);
    setItemDiscount(item.discountPercentage);
    setImageError(null);
    setIsUploadingImage(false);

    // Extract attributes and variants from description
    const parsed = parseFoodItemDescription(item.description || '');
    setItemDesc(parsed.cleanDescription);
    setVariants(parsed.variants);
    const resolvedDietary: DietaryType = item.dietaryType || parsed.dietaryType || (item.isVeg ? 'veg' : 'non_veg');
    setItemDietaryType(resolvedDietary);
    setItemVeg(resolvedDietary !== 'non_veg' && resolvedDietary !== 'egg');
    setItemServes(item.serves || parsed.serves || '');
    setItemAllergens(item.allergens || parsed.allergens || []);
    setItemCalories(item.calories !== undefined ? String(item.calories) : parsed.calories !== undefined ? String(parsed.calories) : '');
    setIsItemOpen(true);
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict 1 MB (1,048,576 bytes) limit check
    const MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB
    if (file.size > MAX_SIZE_BYTES) {
      const actualMB = (file.size / (1024 * 1024)).toFixed(2);
      const errMsg = `File size (${actualMB} MB) exceeds the 1 MB upload limit. Please select an image smaller than 1 MB.`;
      setImageError(errMsg);
      showToast(errMsg, 'error');
      e.target.value = '';
      return;
    }

    setImageError(null);
    setIsUploadingImage(true);

    try {
      if (restaurantId && isSupabaseConfigured) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${restaurantId}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const { data, error } = await supabase.storage.from('food-images').upload(filePath, file);
        if (!error && data) {
          const { data: publicUrlData } = supabase.storage.from('food-images').getPublicUrl(filePath);
          if (publicUrlData?.publicUrl) {
            setItemImage(publicUrlData.publicUrl);
            showToast('Food image uploaded successfully!', 'success');
            setIsUploadingImage(false);
            return;
          }
        }
      }

      // Fallback to compressed Data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setItemImage(result);
          showToast('Food image attached successfully!', 'success');
        }
        setIsUploadingImage(false);
      };
      reader.onerror = () => {
        showToast('Failed to process image file.', 'error');
        setIsUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Image upload error:', err);
      showToast('Error uploading image.', 'error');
      setIsUploadingImage(false);
    }
  };

  const deleteSupabaseStorageImage = async (imageUrl: string) => {
    if (!imageUrl || !isSupabaseConfigured) return;
    try {
      if (imageUrl.includes('/storage/v1/object/public/food-images/')) {
        const relativePath = imageUrl.split('/storage/v1/object/public/food-images/')[1];
        if (relativePath) {
          const cleanPath = decodeURIComponent(relativePath);
          await supabase.storage.from('food-images').remove([cleanPath]);
        }
      }
    } catch (err) {
      console.warn('Failed to cleanup old image from Supabase storage:', err);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !itemCat) return;

    // Automatically delete previous image from Supabase Storage if replaced or removed
    if (editingItem && editingItem.image && editingItem.image !== itemImage) {
      deleteSupabaseStorageImage(editingItem.image);
    }

    // Serialize variants and attributes to description string
    const finalDesc = serializeFoodItemDescription(itemDesc, {
      variants,
      dietaryType: itemDietaryType,
      serves: itemServes.trim() || undefined,
      allergens: itemAllergens.length > 0 ? itemAllergens : undefined,
      calories: itemCalories ? Number(itemCalories) : undefined,
    });

    const isVegCalculated = itemDietaryType !== 'non_veg' && itemDietaryType !== 'egg';

    const newItem: FoodItem = {
      id: editingItem ? editingItem.id : `item-${Date.now()}`,
      name: itemName,
      price: Number(itemPrice),
      image: itemImage,
      description: finalDesc,
      categoryId: itemCat,
      isVeg: isVegCalculated,
      dietaryType: itemDietaryType,
      serves: itemServes.trim() || undefined,
      allergens: itemAllergens.length > 0 ? itemAllergens : undefined,
      calories: itemCalories ? Number(itemCalories) : undefined,
      preparationTime: Number(itemPrep),
      isAvailable: itemAvailable,
      isPopular: itemPopular,
      isRecommended: itemRecommended,
      spicyLevel: itemSpicy as any,
      discountPercentage: Number(itemDiscount),
      updatedAt: new Date().toISOString()
    };

    await addFoodItem(newItem);
    showToast(editingItem ? 'Menu item updated successfully!' : 'Menu item created successfully!', 'success');
    setIsItemOpen(false);
  };

  const handleDeleteItem = async (itemId: string) => {
    const itemToDelete = foodItems.find(i => i.id === itemId);
    askConfirmation(
      'Delete Menu Item?',
      'Are you sure you want to permanently delete this menu item from your restaurant menu?',
      async () => {
        if (itemToDelete?.image) {
          deleteSupabaseStorageImage(itemToDelete.image);
        }
        await deleteFoodItem(itemId);
        showToast('Menu item deleted successfully.', 'success');
      }
    );
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
                const parsedAttrs = parseFoodItemDescription(item.description || '');
                const itemDietary = item.dietaryType || parsedAttrs.dietaryType || (item.isVeg ? 'veg' : 'non_veg');
                const servesInfo = item.serves || parsedAttrs.serves;
                const calCount = item.calories ?? parsedAttrs.calories;
                const allergenList = item.allergens || parsedAttrs.allergens || [];
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
                        
                        {/* Authentic Dietary Badge */}
                        <div className="absolute top-2.5 left-2.5 shadow-sm">
                          <FSSAIIndicator type={itemDietary} size="sm" showLabel={true} bg="white" />
                        </div>

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
                        {(() => {
                          const rawDesc = item.description || '';
                          const hasVariants = rawDesc.includes('||variants:');
                          const [cleanText, variantsStr] = hasVariants ? rawDesc.split('||variants:') : [rawDesc, ''];
                          const variantNames = variantsStr
                            ? variantsStr.split(';').map(v => v.split('=')[0]).filter(Boolean).join(', ')
                            : '';

                          return (
                            <div className="space-y-1">
                              {cleanText.trim() ? (
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed">
                                  {cleanText.trim()}
                                </p>
                              ) : null}
                              {variantNames ? (
                                <span className="inline-block bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-emerald-500/20">
                                  Variants: {variantNames}
                                </span>
                              ) : null}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Tags & Badges */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {servesInfo && (
                          <span className="bg-blue-50 text-blue-700 dark:bg-blue-950/25 dark:text-blue-300 text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 border border-blue-200/50 dark:border-blue-800/40">
                            👥 {servesInfo.toLowerCase().startsWith('serves') ? servesInfo : `Serves ${servesInfo}`}
                          </span>
                        )}
                        {calCount !== undefined && (
                          <span className="bg-rose-50 text-rose-700 dark:bg-rose-950/25 dark:text-rose-300 text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 border border-rose-200/50 dark:border-rose-800/40">
                            🔥 {calCount} kcal
                          </span>
                        )}
                        {allergenList.length > 0 && (
                          <span className="bg-amber-50 text-amber-800 dark:bg-amber-950/25 dark:text-amber-300 text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 border border-amber-200/50 dark:border-amber-800/40" title={allergenList.join(', ')}>
                            ⚠️ {allergenList.slice(0, 2).join(', ')}{allergenList.length > 2 ? ` +${allergenList.length - 2}` : ''}
                          </span>
                        )}
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

              {/* Food Image Upload & URL */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Food Image <span className="text-rose-500 font-extrabold text-[10px]">(Max 1 MB)</span>
                  </label>
                  {itemImage && (
                    <button
                      type="button"
                      onClick={() => { setItemImage(''); setImageError(null); }}
                      className="text-[11px] text-rose-500 hover:underline font-semibold"
                    >
                      Remove Image
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  {/* Thumbnail Preview */}
                  <div className="sm:col-span-1 h-24 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 flex items-center justify-center relative group">
                    {itemImage ? (
                      <img src={itemImage} alt="Food Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500">
                        <ImageIcon className="w-6 h-6 stroke-[1.5]" />
                        <span className="text-[10px] font-semibold">No Image</span>
                      </div>
                    )}
                  </div>

                  {/* File Upload Dropzone & URL Input */}
                  <div className="sm:col-span-2 space-y-2">
                    <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-3 cursor-pointer transition-all ${
                      imageError 
                        ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20' 
                        : 'border-slate-250 dark:border-slate-700 hover:border-brand-500 bg-slate-50/70 dark:bg-slate-850/50'
                    }`}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageFileUpload} 
                        disabled={isUploadingImage}
                        className="hidden" 
                      />
                      {isUploadingImage ? (
                        <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 py-1">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-xs font-bold">Uploading (Max 1 MB)...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 py-0.5">
                          <Upload className="w-4 h-4 text-brand-500" />
                          <span className="text-xs font-bold">Click to Upload Image</span>
                          <span className="text-[9px] bg-slate-200 dark:bg-slate-750 px-1.5 py-0.5 rounded font-black text-slate-500">1MB MAX</span>
                        </div>
                      )}
                    </label>

                    <input
                      type="text"
                      placeholder="Or paste image URL (https://...)"
                      value={itemImage}
                      onChange={(e) => { setItemImage(e.target.value); setImageError(null); }}
                      className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {imageError && (
                  <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 p-2.5 rounded-xl text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{imageError}</span>
                  </div>
                )}
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

              {/* Dietary Classification, Spicy & Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Dietary Type</label>
                  <select
                    value={itemDietaryType}
                    onChange={(e) => {
                      const val = e.target.value as DietaryType;
                      setItemDietaryType(val);
                      setItemVeg(val !== 'non_veg' && val !== 'egg');
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-3.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="veg">🟢 Veg (FSSAI Green Dot)</option>
                    <option value="non_veg">🔺 Non-Veg (FSSAI Red Triangle)</option>
                    <option value="egg">🟡 Eggitarian (Contains Egg)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Spicy Level</label>
                  <select
                    value={itemSpicy}
                    onChange={(e) => setItemSpicy(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-3.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
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

              {/* Portion, Calorie & Prep Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Serving Size</label>
                  <input
                    type="text"
                    placeholder="e.g. Serves 1-2, 250g"
                    value={itemServes}
                    onChange={(e) => setItemServes(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-2.5 px-3.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Calories (kcal)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 340"
                    value={itemCalories}
                    onChange={(e) => setItemCalories(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-2.5 px-3.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Prep Time (mins)</label>
                  <input
                    type="number"
                    min={1}
                    value={itemPrep}
                    onChange={(e) => setItemPrep(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-2.5 px-3.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Highlights & Promotional Tags */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Highlights & Tags</label>
                <div className="flex flex-wrap gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={itemPopular}
                      onChange={(e) => setItemPopular(e.target.checked)}
                      className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">⭐ Popular Tag</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={itemRecommended}
                      onChange={(e) => setItemRecommended(e.target.checked)}
                      className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">🌟 Recommended</span>
                  </label>
                </div>
              </div>

              {/* Allergen Advisory Selector */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Allergen Advisory</label>
                  <span className="text-[10px] text-slate-400">Select any that apply</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Dairy', 'Nuts', 'Gluten', 'Soy', 'Eggs', 'Mustard', 'Sesame', 'Shellfish', 'Fish'].map((allergen) => {
                    const isSelected = itemAllergens.includes(allergen);
                    return (
                      <button
                        key={allergen}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setItemAllergens(itemAllergens.filter(a => a !== allergen));
                          } else {
                            setItemAllergens([...itemAllergens, allergen]);
                          }
                        }}
                        className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 text-amber-800 dark:text-amber-300 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}{allergen}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Portion Variants Editor Block */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Portion Options (Variants)</label>
                  <button
                    type="button"
                    onClick={() => setVariants([...variants, { name: '', price: 0 }])}
                    className="flex items-center gap-1 text-[10px] bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 font-bold px-2.5 py-1 rounded-lg transition-all"
                  >
                    <Plus className="w-3 h-3" /> Add Portion
                  </button>
                </div>

                {variants.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic">No portions defined. Defaults to single item price.</p>
                ) : (
                  <div className="space-y-2">
                    {variants.map((v, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          required
                          placeholder="e.g. Half, Full"
                          value={v.name}
                          onChange={(e) => {
                            const copy = [...variants];
                            copy[idx].name = e.target.value;
                            setVariants(copy);
                          }}
                          className="flex-1 bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none"
                        />
                        <div className="relative w-28">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-450 text-xs">{currency}</span>
                          <input
                            type="number"
                            required
                            min={0}
                            placeholder="Price"
                            value={v.price || ''}
                            onChange={(e) => {
                              const copy = [...variants];
                              copy[idx].price = Number(e.target.value);
                              setVariants(copy);
                            }}
                            className="w-full bg-slate-50 dark:bg-slate-855 border border-slate-150 dark:border-slate-800 rounded-xl py-2 pl-6 pr-3 text-xs focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setVariants(variants.filter((_, i) => i !== idx))}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-955/20 rounded-xl transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
