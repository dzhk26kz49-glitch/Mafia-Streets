import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, Search, Sparkles, Star, 
  ChevronRight, ChevronLeft, Filter, 
  Zap, Trophy, Wallet, Info, Check,
  CreditCard, Tag, Clock, TrendingUp, Plus, X, Crown,
  ShoppingBag, Edit3, Trash2, FolderPlus, Settings2,
  Package, Shield, Sword, Glasses, Footprints, Headphones,
  Watch, Briefcase, Car, Gem, Shirt, Cpu, Gamepad2, HeartPulse,
  Flame, RefreshCw, ArrowRight
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { 
  doc, updateDoc, increment, onSnapshot, setDoc, 
  collection, query, orderBy, getDocs, deleteDoc, 
  arrayUnion, serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { formatMoney } from '../lib/utils';
import { toast } from 'sonner';
import clsx from 'clsx';
import { 
  DEFAULT_STORE_CATEGORIES, 
  CATEGORY_ICON_MAP, 
  CATEGORY_COLORS, 
  EQUIPMENT_SLOT_GROUPS, 
  ALL_EQUIPMENT_SLOTS,
  getSlotLabel, 
  getSlotGroupLabel,
  StoreCategory 
} from '../lib/mallItems';

export default function CityMall() {
  const { profile, user, equipItem, unequipItem } = useAuthStore();
  const navigate = useNavigate();

  // Active View Tab: 'store' (معروضات المتجر) or 'my_items' (ممتلكاتي)
  const [activeView, setActiveView] = useState<'store' | 'my_items'>('store');

  // Categories State
  const [categories, setCategories] = useState<StoreCategory[]>(DEFAULT_STORE_CATEGORIES);
  const [activeCategoryId, setActiveCategoryId] = useState<string>(DEFAULT_STORE_CATEGORIES[0].id);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'equipped' | 'unequipped'>('all');

  // Personalized Deal & Products
  const [personalizedDeal, setPersonalizedDeal] = useState<any>(null);
  const [customProducts, setCustomProducts] = useState<any[]>([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSetModal, setShowSetModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  // Category Edit / Create Form
  const [categoryFormData, setCategoryFormData] = useState<{
    id?: string;
    name: string;
    iconName: string;
    color: string;
    description: string;
  }>({
    name: '',
    iconName: 'ShoppingBag',
    color: 'from-blue-500 to-indigo-600',
    description: ''
  });
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Product Form
  const [newProduct, setNewProduct] = useState({
    name: '',
    image: '',
    slotType: 'clothing',
    categoryId: DEFAULT_STORE_CATEGORIES[0].id,
    cost: 15000,
    prestige: 15,
    description: '',
    isExclusive: false
  });

  // Smart Set Importer
  const [setImageUrl, setSetImageUrl] = useState('');
  const [setCategoryId, setSetCategoryId] = useState(DEFAULT_STORE_CATEGORIES[0].id);
  const [setAnalysisResults, setSetAnalysisResults] = useState<any[]>([]);
  const [isAnalyzingSet, setIsAnalyzingSet] = useState(false);

  // Mall / User Data
  const [mallData, setMallData] = useState<any>({
    luxuryLevel: 1,
    totalSpent: 0,
    purchasedIds: [],
    loyaltyPoints: 0
  });

  const isAdmin = Boolean(profile && profile.role === 'Admin');

  // 1. Listen to Categories in Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'store_categories'), async (snapshot) => {
      if (snapshot.empty) {
        // Automatically seed default categories if collection is empty, only if current user has Admin role
        if (isAdmin) {
          try {
            const batch = DEFAULT_STORE_CATEGORIES.map(cat => 
              setDoc(doc(db, 'store_categories', cat.id), {
                ...cat,
                createdAt: serverTimestamp()
              })
            );
            await Promise.all(batch);
            setCategories(DEFAULT_STORE_CATEGORIES);
          } catch (e) {
            // Fallback to local default categories
            setCategories(DEFAULT_STORE_CATEGORIES);
          }
        } else {
          // Regular users simply read local defaults without trying to write to Firestore
          setCategories(DEFAULT_STORE_CATEGORIES);
        }
      } else {
        const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoreCategory));
        setCategories(loaded);
        // Ensure activeCategoryId exists in loaded categories
        if (!loaded.some(c => c.id === activeCategoryId) && loaded.length > 0) {
          setActiveCategoryId(loaded[0].id);
        }
      }
    }, (error) => {
      // If error or unauthenticated, fallback to defaults
      console.warn("Could not fetch store_categories, using defaults", error);
      setCategories(DEFAULT_STORE_CATEGORIES);
    });

    return () => unsub();
  }, [isAdmin, activeCategoryId]);

  // 2. Listen to Custom Products (Removed restrictive fashion_ prefix filter)
  useEffect(() => {
    const q = query(collection(db, 'custom_products'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setCustomProducts(products);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'custom_products');
    });
    return () => unsub();
  }, []);

  // 3. Listen to User Mall Data
  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = onSnapshot(doc(db, 'mall_data', profile.uid), (snapshot) => {
      if (snapshot.exists()) {
        setMallData(snapshot.data());
      } else {
        const initialData = {
          luxuryLevel: 1,
          totalSpent: 0,
          purchasedIds: [],
          loyaltyPoints: 0,
          email: profile.email || ''
        };
        setDoc(doc(db, 'mall_data', profile.uid), initialData);
        setMallData(initialData);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `mall_data/${profile.uid}`);
    });
    return () => unsub();
  }, [profile?.uid, profile?.email]);

  const activeCategory = useMemo(() => {
    return categories.find(c => c.id === activeCategoryId) || categories[0] || DEFAULT_STORE_CATEGORIES[0];
  }, [categories, activeCategoryId]);

  // Combined Products
  const combinedProducts = useMemo(() => {
    const seen = new Set();
    return customProducts.filter(p => {
      if (!p.id) return false;
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [customProducts]);

  // Filtered Products for the active category
  const filteredProducts = useMemo(() => {
    return combinedProducts.filter(p => {
      const matchesCategory = p.categoryId === activeCategory.id || 
        // Fallback backward compatibility for legacy clothing
        (activeCategory.id === 'tailor_clothing' && p.categoryId?.startsWith('fashion_'));
      const matchesSearch = !searchQuery || 
        (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [combinedProducts, activeCategory.id, searchQuery]);

  // Personalized Deal
  useEffect(() => {
    if (!profile || !mallData) return;

    setPersonalizedDeal((currentDeal: any) => {
      if (currentDeal) {
        const originalId = currentDeal.id.replace('deal_', '');
        if (!mallData.purchasedIds?.includes(originalId)) {
          return currentDeal;
        }
      }

      const available = combinedProducts.filter(p => !mallData.purchasedIds?.includes(p.id));
      if (available.length === 0) return null;

      const exclusive = available.filter(p => p.isExclusive);
      const pool = exclusive.length > 0 ? exclusive : available;
      const product = pool[Math.floor(Math.random() * pool.length)];

      return { 
        ...product, 
        name: `${product.isExclusive ? 'عرض حصري' : 'عرض خاص'}: ${product.name}`,
        cost: Math.floor((product.cost || 10000) * 0.75),
        id: 'deal_' + product.id,
        originalId: product.id
      };
    });
  }, [profile?.uid, mallData.purchasedIds, combinedProducts]);

  // Player's Owned Items (ممتلكاتي)
  const myOwnedItems = useMemo(() => {
    if (!mallData?.purchasedIds || mallData.purchasedIds.length === 0) return [];
    const purchasedSet = new Set(mallData.purchasedIds);
    return combinedProducts.filter(p => purchasedSet.has(p.id));
  }, [mallData?.purchasedIds, combinedProducts]);

  // Filtered Owned Items
  const filteredMyItems = useMemo(() => {
    return myOwnedItems.filter(item => {
      const isEquipped = Object.values(profile?.equipped || {}).includes(item.id);
      if (inventoryFilter === 'equipped' && !isEquipped) return false;
      if (inventoryFilter === 'unequipped' && isEquipped) return false;

      if (inventorySearch) {
        const q = inventorySearch.toLowerCase();
        return item.name?.toLowerCase().includes(q) || 
               getSlotLabel(item.slotType).toLowerCase().includes(q);
      }
      return true;
    });
  }, [myOwnedItems, inventoryFilter, inventorySearch, profile?.equipped]);

  // Buying a product
  const buyProduct = async (product: any) => {
    if (!profile || !profile.uid) return;

    if (product.isExclusive && !profile.vipLevel && !isAdmin) {
      toast.error('هذا المنتج مخصص لأعضاء VIP فقط');
      return;
    }

    const cost = Number(product.cost || 0);
    if ((profile.cleanMoney || 0) < cost) {
      toast.error('ليس لديك أموال نظيفة كافية لإتمام الشراء!');
      return;
    }

    try {
      const userRef = doc(db, 'users', profile.uid);
      const mallRef = doc(db, 'mall_data', profile.uid);
      const actualProductId = product.originalId || String(product.id).replace('deal_', '');

      await updateDoc(userRef, {
        cleanMoney: increment(-cost),
        prestige: increment(Number(product.prestige || 0))
      });

      await setDoc(mallRef, {
        purchasedIds: arrayUnion(actualProductId),
        totalSpent: increment(cost),
        loyaltyPoints: increment(Math.floor(cost / 1000)),
        luxuryLevel: increment(1),
        lastPurchaseAt: serverTimestamp()
      }, { merge: true });

      toast.success(`تم شراء ${product.name} بنجاح! يمكنك الآن إدارته في قسم "ممتلكاتي".`);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, 'mall_data');
    }
  };

  // Equip from Store / My Items
  const handleEquipProduct = async (product: any) => {
    if (!product.slotType || product.slotType === 'none') {
      toast.info('هذا العنصر عبارة عن مقتنى فاخر غير مخصص للتجهيز على الجسد.');
      return;
    }
    let targetSlot = product.slotType;
    if (targetSlot === 'weapon1' && profile?.equipped?.weapon1) {
      targetSlot = 'weapon2';
    }
    try {
      await equipItem(targetSlot as any, product.id);
      toast.success(`تم تجهيز ${product.name} في خانة ${getSlotLabel(targetSlot)} بنجاح!`);
    } catch (e) {
      toast.error('تعذر تجهيز العنصر');
    }
  };

  // Unequip from Store / My Items
  const handleUnequipProduct = async (product: any) => {
    const equippedEntry = Object.entries(profile?.equipped || {}).find(([_, id]) => id === product.id);
    if (!equippedEntry) return;
    try {
      await unequipItem(equippedEntry[0] as any);
      toast.success(`تم نزع ${product.name} وإعادته إلى الخزينة.`);
    } catch (e) {
      toast.error('تعذر نزع العنصر');
    }
  };

  // Sell owned item
  const handleSellProduct = async (product: any) => {
    if (!profile?.uid || !mallData) return;
    const isEquipped = Object.values(profile.equipped || {}).includes(product.id);
    if (isEquipped) {
      toast.error('يرجى نزع المنتج أولاً قبل بيعه');
      return;
    }
    try {
      const sellPrice = Math.floor((product.cost || 10000) * 0.5);
      const userRef = doc(db, 'users', profile.uid);
      const mallRef = doc(db, 'mall_data', profile.uid);

      await updateDoc(userRef, {
        cleanMoney: increment(sellPrice)
      });
      await updateDoc(mallRef, {
        purchasedIds: (mallData.purchasedIds || []).filter((id: string) => id !== product.id)
      });
      toast.success(`تم بيع ${product.name} واسترداد ${formatMoney(sellPrice)}`);
    } catch (e) {
      toast.error('حدث خطأ أثناء بيع العنصر');
    }
  };

  // Action Loading States (Prevent double submission)
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [isImportingSet, setIsImportingSet] = useState(false);

  // Save / Edit Product
  const handleSaveProduct = async () => {
    if (!isAdmin || profile?.role !== 'Admin') {
      toast.error('عذراً، هذه الصلاحية محصورة فقط باللاعبين الحاصلين على رتبة مدير');
      setShowAddModal(false);
      return;
    }
    if (isSavingProduct) return;
    if (!newProduct.name?.trim() || !newProduct.image?.trim()) {
      toast.error('يرجى إدخال اسم المنتج ورابط الصورة');
      return;
    }
    setIsSavingProduct(true);
    try {
      if (editingProductId) {
        const docRef = doc(db, 'custom_products', editingProductId);
        const productData = {
          ...newProduct,
          name: newProduct.name.trim(),
          image: newProduct.image.trim(),
          layerImage: newProduct.image.trim(),
          updatedAt: serverTimestamp()
        };
        await updateDoc(docRef, productData);
        toast.success('تم تعديل المنتج بنجاح');
      } else {
        const newDocRef = doc(collection(db, 'custom_products'));
        const productData = {
          ...newProduct,
          name: newProduct.name.trim(),
          image: newProduct.image.trim(),
          id: newDocRef.id,
          layerImage: newProduct.image.trim(),
          icon: 'Star',
          createdAt: serverTimestamp()
        };
        await setDoc(newDocRef, productData);
        toast.success('تم إضافة المنتج بنجاح إلى المتجر');
      }
      setShowAddModal(false);
      setEditingProductId(null);
      setNewProduct({
        name: '',
        image: '',
        slotType: 'clothing',
        categoryId: activeCategoryId || DEFAULT_STORE_CATEGORIES[0].id,
        cost: 15000,
        prestige: 15,
        description: '',
        isExclusive: false
      });
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء حفظ المنتج');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const confirmDeleteProduct = async () => {
    if (!isAdmin || profile?.role !== 'Admin' || !productToDelete) {
      if (!isAdmin || profile?.role !== 'Admin') toast.error('عذراً، هذه الصلاحية محصورة فقط باللاعبين الحاصلين على رتبة مدير');
      setProductToDelete(null);
      return;
    }
    if (isDeletingProduct) return;
    setIsDeletingProduct(true);
    try {
      await deleteDoc(doc(db, 'custom_products', productToDelete));
      toast.success('تم حذف المنتج بنجاح من المتجر');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء حذف المنتج');
    } finally {
      setIsDeletingProduct(false);
      setProductToDelete(null);
    }
  };

  const openEditModal = (product: any) => {
    if (!isAdmin || profile?.role !== 'Admin') {
      toast.error('عذراً، هذه الصلاحية محصورة فقط باللاعبين الحاصلين على رتبة مدير');
      return;
    }
    setNewProduct({
      name: product.name || '',
      image: product.image || product.layerImage || '',
      slotType: product.slotType || 'clothing',
      categoryId: product.categoryId || activeCategoryId,
      cost: product.cost || 10000,
      prestige: product.prestige || 10,
      description: product.description || '',
      isExclusive: !!product.isExclusive
    });
    setEditingProductId(product.id);
    setShowAddModal(true);
  };

  // Toggle Exclusive status
  const toggleExclusive = async (product: any) => {
    if (!isAdmin || profile?.role !== 'Admin') {
      toast.error('عذراً، هذه الصلاحية محصورة فقط باللاعبين الحاصلين على رتبة مدير');
      return;
    }
    try {
      const docRef = doc(db, 'custom_products', product.id);
      await updateDoc(docRef, { isExclusive: !product.isExclusive, updatedAt: serverTimestamp() });
      toast.success(product.isExclusive ? 'تم إزالة العرض الحصري' : 'تم تعيين كعرض حصري');
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث حالة المنتج');
    }
  };

  // --- Category Management Handlers ---
  const handleOpenAddCategory = () => {
    if (!isAdmin || profile?.role !== 'Admin') {
      toast.error('عذراً، هذه الصلاحية محصورة فقط باللاعبين الحاصلين على رتبة مدير');
      return;
    }
    setCategoryFormData({
      name: '',
      iconName: 'ShoppingBag',
      color: 'from-blue-500 to-indigo-600',
      description: ''
    });
    setIsEditingCategory(false);
    setShowCategoryModal(true);
  };

  const handleOpenEditCategory = (cat: StoreCategory) => {
    if (!isAdmin || profile?.role !== 'Admin') {
      toast.error('عذراً، هذه الصلاحية محصورة فقط باللاعبين الحاصلين على رتبة مدير');
      return;
    }
    setCategoryFormData({
      id: cat.id,
      name: cat.name,
      iconName: cat.iconName || 'ShoppingBag',
      color: cat.color || 'from-blue-500 to-indigo-600',
      description: cat.description || ''
    });
    setIsEditingCategory(true);
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    if (!isAdmin || profile?.role !== 'Admin') {
      toast.error('عذراً، هذه الصلاحية محصورة فقط باللاعبين الحاصلين على رتبة مدير');
      setShowCategoryModal(false);
      return;
    }
    if (isSavingCategory) return;
    if (!categoryFormData.name.trim()) {
      toast.error('يرجى كتابة اسم القسم');
      return;
    }

    setIsSavingCategory(true);
    try {
      if (isEditingCategory && categoryFormData.id) {
        const catRef = doc(db, 'store_categories', categoryFormData.id);
        await updateDoc(catRef, {
          name: categoryFormData.name.trim(),
          iconName: categoryFormData.iconName,
          color: categoryFormData.color,
          description: categoryFormData.description?.trim() || '',
          updatedAt: serverTimestamp()
        });
        toast.success(`تم تحديث قسم "${categoryFormData.name}" بنجاح`);
      } else {
        const catId = 'cat_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
        const catRef = doc(db, 'store_categories', catId);
        await setDoc(catRef, {
          id: catId,
          name: categoryFormData.name.trim(),
          iconName: categoryFormData.iconName,
          color: categoryFormData.color,
          description: categoryFormData.description?.trim() || '',
          createdAt: serverTimestamp()
        });
        setActiveCategoryId(catId);
        toast.success(`تم إنشاء قسم "${categoryFormData.name}" بنجاح`);
      }
      setShowCategoryModal(false);
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء حفظ القسم');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!isAdmin || profile?.role !== 'Admin' || !categoryToDelete) {
      if (!isAdmin || profile?.role !== 'Admin') toast.error('عذراً، هذه الصلاحية محصورة فقط باللاعبين الحاصلين على رتبة مدير');
      setCategoryToDelete(null);
      return;
    }
    if (isDeletingCategory) return;
    setIsDeletingCategory(true);
    try {
      await deleteDoc(doc(db, 'store_categories', categoryToDelete));
      toast.success('تم حذف القسم بنجاح');
      if (activeCategoryId === categoryToDelete) {
        const remaining = categories.filter(c => c.id !== categoryToDelete);
        if (remaining.length > 0) {
          setActiveCategoryId(remaining[0].id);
        }
      }
    } catch (e) {
      toast.error('حدث خطأ أثناء حذف القسم');
    } finally {
      setIsDeletingCategory(false);
      setCategoryToDelete(null);
    }
  };

  // Smart Set Importer
  const handleAnalyzeSet = async () => {
    if (!isAdmin || profile?.role !== 'Admin') {
      toast.error('عذراً، هذه الصلاحية محصورة فقط باللاعبين الحاصلين على رتبة مدير');
      return;
    }
    if (!setImageUrl.trim()) {
      toast.error('يرجى إدخال رابط صورة الطقم');
      return;
    }
    setIsAnalyzingSet(true);
    setTimeout(() => {
      const url = setImageUrl.toLowerCase();
      const results = [];
      if (url.includes('suit') || url.includes('formal')) {
        results.push({ name: 'سترة رسمية فاخرة', slotType: 'clothing', image: setImageUrl.trim() });
        results.push({ name: 'بنطال رسمي متناسق', slotType: 'clothing', image: setImageUrl.trim() });
      } else if (url.includes('sport') || url.includes('track')) {
        results.push({ name: 'قميص رياضي عصري', slotType: 'clothing', image: setImageUrl.trim() });
        results.push({ name: 'بنطال رياضي مريح', slotType: 'clothing', image: setImageUrl.trim() });
      } else {
        results.push({ name: 'طقم كامل مخصص', slotType: 'clothing', image: setImageUrl.trim() });
      }
      setSetAnalysisResults(results);
      setIsAnalyzingSet(false);
      toast.success(`تم العثور على ${results.length} قطع في الطقم`);
    }, 1200);
  };

  const handleImportSet = async () => {
    if (!isAdmin || profile?.role !== 'Admin') {
      toast.error('عذراً، هذه الصلاحية محصورة فقط باللاعبين الحاصلين على رتبة مدير');
      setShowSetModal(false);
      return;
    }
    if (isImportingSet) return;
    if (setAnalysisResults.length === 0) {
      toast.error('لا توجد قطع جاهزة للاستيراد');
      return;
    }

    // Strict validation
    const validItems = setAnalysisResults.filter(item => 
      item && typeof item.name === 'string' && item.name.trim().length > 0 &&
      item.image && typeof item.image === 'string' && item.image.trim().length > 0
    );

    if (validItems.length === 0) {
      toast.error('بيانات الطقم غير صالحة، يرجى التأكد من اسم وصورة المنتجات');
      return;
    }

    // Anti-duplicate protection: avoid importing same item twice in the category
    const uniqueItems = validItems.filter(item => 
      !customProducts.some(p => p.name.trim() === item.name.trim() && p.categoryId === setCategoryId)
    );

    if (uniqueItems.length === 0) {
      toast.error('جميع هذه المنتجات مستوردة بالفعل في هذا القسم مسبقاً لمنع التكرار');
      return;
    }

    setIsImportingSet(true);
    try {
      const batch = [];
      for (const item of uniqueItems) {
        const newDocRef = doc(collection(db, 'custom_products'));
        const productData = {
          id: newDocRef.id,
          name: item.name.trim(),
          image: item.image.trim(),
          layerImage: item.image.trim(),
          slotType: item.slotType || 'clothing',
          categoryId: setCategoryId,
          cost: 75000,
          prestige: 75,
          icon: 'Sparkles',
          isExclusive: true,
          createdAt: serverTimestamp()
        };
        batch.push(setDoc(newDocRef, productData));
      }
      await Promise.all(batch);
      toast.success(`تم استيراد ${uniqueItems.length} منتج بنجاح كمنتجات حصرية`);
      setShowSetModal(false);
      setSetImageUrl('');
      setSetAnalysisResults([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'custom_products');
    } finally {
      setIsImportingSet(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans relative pb-16" dir="rtl">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />

      {/* Header */}
      <header className="bg-zinc-950/80 backdrop-blur-2xl border-b border-white/5 p-4 lg:p-8 flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-5 w-full lg:w-auto">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 flex items-center justify-center shadow-2xl shadow-orange-500/20 ring-1 ring-white/20">
            <ShoppingBag className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl lg:text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
                المتجر
              </h1>
              <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 text-[10px] font-black uppercase tracking-widest">
                العلامات الفاخرة
              </span>
            </div>
            <p className="text-zinc-500 text-xs font-bold mt-1">
              متجر المدينة المركزي للأزياء، المجوهرات، المركبات والمقتنيات الثمينة
            </p>
          </div>
        </div>

        {/* Top Player Mall Stats */}
        <div className="flex flex-wrap items-center gap-3 lg:gap-6 w-full lg:w-auto">
          <MallStat icon={Trophy} label="نقاط الولاء" value={mallData.loyaltyPoints?.toLocaleString() || '0'} color="text-yellow-500" />
          <MallStat icon={Wallet} label="إجمالي الإنفاق" value={formatMoney(mallData.totalSpent || 0)} color="text-green-500" />
          <MallStat icon={Package} label="قطع ممتلكاتي" value={`${myOwnedItems.length} قطعة`} color="text-blue-400" />
        </div>
      </header>

      {/* TOP SECTION: قسم ممتلكاتي Switcher & Quick Banner */}
      <section className="bg-zinc-900/60 border-b border-white/5 p-3 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Main View Tabs: تصفح المتجر vs ممتلكاتي */}
          <div className="flex items-center bg-black/60 p-1.5 rounded-2xl border border-white/10 w-full sm:w-auto shadow-inner">
            <button
              onClick={() => setActiveView('store')}
              className={clsx(
                "flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-xl font-black text-sm transition-all",
                activeView === 'store'
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              )}
            >
              <ShoppingCart size={18} />
              <span>معروضات المتجر</span>
              <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded-md font-mono text-zinc-300">
                {combinedProducts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveView('my_items')}
              className={clsx(
                "flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-xl font-black text-sm transition-all relative",
                activeView === 'my_items'
                  ? "bg-gradient-to-r from-amber-500 to-yellow-600 text-black shadow-lg shadow-amber-500/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Crown size={18} />
              <span>قسم ممتلكاتي</span>
              <span className={clsx(
                "text-[10px] px-2 py-0.5 rounded-md font-mono font-black",
                activeView === 'my_items' ? "bg-black/30 text-black" : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
              )}>
                {myOwnedItems.length}
              </span>
            </button>
          </div>

          {/* Quick Helper Button or Profile Link */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => navigate('/character')}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-xl text-xs font-bold border border-white/5 flex items-center gap-2 transition-all"
            >
              <Shirt size={14} className="text-yellow-400" />
              <span>خزانة وتجهيزات الشخصية</span>
              <ArrowRight size={14} className="rotate-180" />
            </button>
          </div>
        </div>
      </section>

      {/* VIEW 1: قسم ممتلكاتي (My Possessions) */}
      {activeView === 'my_items' ? (
        <section className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full relative z-10 space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-white/10 rounded-3xl p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 blur-3xl rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Crown size={32} />
              </div>
              <div>
                <h2 className="text-2xl lg:text-3xl font-black text-white">مقتنياتي وخزانتي الخاصة</h2>
                <p className="text-zinc-400 text-sm mt-1">
                  جميع القطع والمنتجات التي قمت باقتنائها من المتجر، مع إمكانية التجهيز المباشر وتنسيق المظهر
                </p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5">
              <button
                onClick={() => setInventoryFilter('all')}
                className={clsx(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  inventoryFilter === 'all' ? "bg-amber-500 text-black shadow-md font-black" : "text-zinc-400 hover:text-white"
                )}
              >
                الكل ({myOwnedItems.length})
              </button>
              <button
                onClick={() => setInventoryFilter('equipped')}
                className={clsx(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  inventoryFilter === 'equipped' ? "bg-emerald-500 text-black shadow-md font-black" : "text-zinc-400 hover:text-white"
                )}
              >
                المجهزة حالياً
              </button>
              <button
                onClick={() => setInventoryFilter('unequipped')}
                className={clsx(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  inventoryFilter === 'unequipped' ? "bg-zinc-700 text-white shadow-md font-black" : "text-zinc-400 hover:text-white"
                )}
              >
                في الخزينة
              </button>
            </div>
          </div>

          {/* Search Bar for Inventory */}
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              value={inventorySearch}
              onChange={e => setInventorySearch(e.target.value)}
              placeholder="ابحث في ممتلكاتك بالاسم أو مكان التجهيز..."
              className="w-full bg-zinc-900/70 border border-white/10 rounded-2xl py-3.5 pr-12 pl-4 text-white placeholder:text-zinc-500 outline-none focus:border-amber-500 transition-all text-sm font-bold"
            />
          </div>

          {/* Items Grid */}
          {filteredMyItems.length === 0 ? (
            <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-16 text-center space-y-4">
              <Package className="w-16 h-16 text-zinc-600 mx-auto" />
              <h3 className="text-xl font-bold text-white">لا توجد عناصر مطابقة في ممتلكاتك</h3>
              <p className="text-zinc-500 text-sm max-w-md mx-auto">
                {myOwnedItems.length === 0 
                  ? 'لم تقم بشراء أي عناصر من المتجر بعد. تصفح الأقسام الفاخرة لاقتناء أفضل القطع!' 
                  : 'جرّب تعديل البحث أو التصفية لعرض القطع.'}
              </p>
              {myOwnedItems.length === 0 && (
                <button
                  onClick={() => setActiveView('store')}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-sm transition-all"
                >
                  تصفح المتجر الآن
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredMyItems.map(item => {
                const equippedEntry = Object.entries(profile?.equipped || {}).find(([_, id]) => id === item.id);
                const isEquipped = !!equippedEntry;
                const slotLabel = getSlotLabel(item.slotType);
                const groupLabel = getSlotGroupLabel(item.slotType);

                return (
                  <div 
                    key={item.id}
                    className={clsx(
                      "bg-zinc-900/40 border rounded-3xl p-5 flex flex-col justify-between transition-all group relative overflow-hidden",
                      isEquipped ? "border-amber-500/40 shadow-xl shadow-amber-500/5 bg-zinc-900/70" : "border-white/5 hover:border-white/10"
                    )}
                  >
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-300">
                        {groupLabel} &bull; {slotLabel}
                      </span>
                      {isEquipped ? (
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <Check size={12} />
                          مجهز الآن
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-400">
                          في الخزينة
                        </span>
                      )}
                    </div>

                    {/* Image */}
                    <div className="h-48 rounded-2xl bg-black/40 flex items-center justify-center p-3 overflow-hidden relative mb-4">
                      {item.image ? (
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Package className="w-12 h-12 text-zinc-600" />
                      )}
                    </div>

                    {/* Name & Details */}
                    <div className="space-y-1 mb-4">
                      <h4 className="font-black text-white text-base truncate">{item.name}</h4>
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>القيمة: {formatMoney(item.cost || 0)}</span>
                        <span className="text-yellow-400 font-bold">+{item.prestige || 0} جاه</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      {item.slotType && item.slotType !== 'none' ? (
                        isEquipped ? (
                          <button
                            onClick={() => handleUnequipProduct(item)}
                            className="w-full py-2.5 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                          >
                            <X size={14} />
                            نزع من المظهر
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEquipProduct(item)}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                          >
                            <Check size={14} />
                            تجهيز على الشخصية
                          </button>
                        )
                      ) : (
                        <div className="text-center py-2 text-[11px] text-zinc-500 font-bold">
                          مقتنى مميز في الحساب
                        </div>
                      )}

                      {!isEquipped && (
                        <button
                          onClick={() => handleSellProduct(item)}
                          className="w-full py-2 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 rounded-xl text-[11px] font-bold transition-all"
                        >
                          بيع بنصف السعر ({formatMoney(Math.floor((item.cost || 10000) * 0.5))})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        /* VIEW 2: معروضات المتجر (Store Catalog with Sidebar Categories) */
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10">
          {/* Categories Sidebar */}
          <aside className="w-full lg:w-80 border-e border-white/5 bg-zinc-950/40 backdrop-blur-xl p-4 lg:p-6 space-y-4 overflow-x-auto lg:overflow-y-auto flex lg:flex-col shrink-0">
            <div className="flex items-center justify-between px-2">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                أقسام المتجر
              </p>
              {isAdmin && (
                <button
                  onClick={handleOpenAddCategory}
                  className="p-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                  title="إضافة قسم جديد"
                >
                  <Plus size={14} />
                  <span>قسم جديد</span>
                </button>
              )}
            </div>

            {/* Category Buttons */}
            <div className="flex lg:flex-col gap-2 w-full">
              {categories.map((cat) => {
                const Icon = CATEGORY_ICON_MAP[cat.iconName] || ShoppingBag;
                const isActive = activeCategoryId === cat.id;

                return (
                  <div key={cat.id} className="relative group/cat shrink-0 lg:w-full">
                    <button
                      onClick={() => setActiveCategoryId(cat.id)}
                      className={clsx(
                        "flex items-center gap-3.5 p-3.5 rounded-2xl transition-all w-full text-start relative overflow-hidden",
                        isActive 
                          ? "bg-white/10 text-white shadow-xl ring-1 ring-white/10" 
                          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                      )}
                    >
                      {isActive && (
                        <motion.div 
                          layoutId="cat-active-pill" 
                          className={clsx("absolute inset-0 bg-gradient-to-r opacity-15", cat.color || 'from-blue-500 to-indigo-600')} 
                        />
                      )}
                      
                      <div className={clsx(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0",
                        isActive 
                          ? clsx("bg-gradient-to-br text-white shadow-md", cat.color || 'from-blue-500 to-indigo-600') 
                          : "bg-white/5 group-hover/cat:bg-white/10 text-zinc-400"
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-sm block truncate">{cat.name}</span>
                        {cat.description && (
                          <span className="text-[10px] text-zinc-500 block truncate">{cat.description}</span>
                        )}
                      </div>

                      {isActive && <ChevronLeft className="hidden lg:block w-4 h-4 ms-auto text-zinc-400 shrink-0" />}
                    </button>

                    {/* Admin Category Quick Edit / Delete */}
                    {isAdmin && (
                      <div className="hidden group-hover/cat:flex absolute left-2 top-1/2 -translate-y-1/2 items-center gap-1 z-20 bg-black/80 backdrop-blur-md p-1 rounded-xl border border-white/10">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenEditCategory(cat); }}
                          className="p-1 hover:text-blue-400 text-zinc-400 transition-colors"
                          title="تعديل القسم"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setCategoryToDelete(cat.id); }}
                          className="p-1 hover:text-red-400 text-zinc-400 transition-colors"
                          title="حذف القسم"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Admin Category Management Footer */}
            {isAdmin && (
              <div className="pt-4 border-t border-white/5 hidden lg:block">
                <button
                  onClick={handleOpenAddCategory}
                  className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-bold border border-white/5 flex items-center justify-center gap-2 transition-all"
                >
                  <FolderPlus size={16} className="text-blue-400" />
                  <span>إضافة قسم جديد للمتجر</span>
                </button>
              </div>
            )}
          </aside>

          {/* Main Store Content */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Search & Actions Bar */}
            <div className="p-4 lg:p-8 border-b border-white/5 flex flex-col sm:flex-row items-center gap-4 bg-zinc-950/20">
              <div className="relative flex-1 w-full">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`ابحث في قسم ${activeCategory.name} أو عن منتج فاخر...`}
                  className="w-full bg-zinc-900/60 border border-white/10 rounded-2xl py-3.5 pr-12 pl-4 font-bold text-sm text-white focus:border-amber-500 outline-none transition-all placeholder:text-zinc-600"
                />
              </div>

              {isAdmin && (
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button 
                    type="button"
                    onClick={() => setShowSetModal(true)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-2xl border border-indigo-500/40 transition-all font-bold text-xs shadow-lg shadow-indigo-600/20"
                  >
                    <Sparkles size={16} />
                    <span>استيراد طقم</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setNewProduct({
                        name: '',
                        image: '',
                        slotType: 'clothing',
                        categoryId: activeCategoryId,
                        cost: 15000,
                        prestige: 15,
                        description: '',
                        isExclusive: false
                      });
                      setEditingProductId(null);
                      setShowAddModal(true);
                    }}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black rounded-2xl transition-all font-black text-xs shadow-lg shadow-orange-500/20"
                  >
                    <Plus size={16} />
                    <span>إضافة منتج</span>
                  </button>
                </div>
              )}
            </div>

            {/* Products Grid */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8">
              {/* Personalized Deal Banner */}
              {personalizedDeal && !searchQuery && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative group"
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-700 animate-pulse" />
                  <div className="relative bg-zinc-950 border border-amber-500/30 rounded-[2rem] p-6 lg:p-8 flex flex-col lg:flex-row items-center gap-8 overflow-hidden shadow-2xl">
                    <div className="w-full lg:w-72 h-60 flex items-center justify-center relative rounded-2xl overflow-hidden bg-zinc-900 shrink-0">
                      <img 
                        src={personalizedDeal.image || undefined} 
                        alt={personalizedDeal.name}
                        className="w-full h-full object-contain transition-transform duration-700 hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-4 right-4">
                        <span className="px-3 py-1 bg-amber-500 text-black font-black rounded-xl text-xs uppercase shadow-lg">
                          عرض خاص -25%
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4 text-center lg:text-start">
                      <div>
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          {getSlotGroupLabel(personalizedDeal.slotType)} &bull; {getSlotLabel(personalizedDeal.slotType)}
                        </span>
                        <h2 className="text-2xl lg:text-3xl font-black text-white mt-2">
                          {personalizedDeal.name}
                        </h2>
                        {personalizedDeal.description && (
                          <p className="text-zinc-400 text-sm mt-1">{personalizedDeal.description}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6">
                        <div>
                          <span className="text-[10px] font-bold text-zinc-500 block">السعر المميز</span>
                          <span className="text-2xl font-black text-green-400">{formatMoney(personalizedDeal.cost)}</span>
                        </div>
                        <div className="w-px h-8 bg-white/10 hidden sm:block" />
                        <div>
                          <span className="text-[10px] font-bold text-zinc-500 block">الجاه المكتسب</span>
                          <span className="text-2xl font-black text-yellow-400">+{personalizedDeal.prestige}</span>
                        </div>
                      </div>

                      <div className="flex justify-center lg:justify-start">
                        <button 
                          onClick={() => buyProduct(personalizedDeal)}
                          className="bg-amber-500 hover:bg-amber-400 text-black px-8 py-3 rounded-xl font-black text-sm transition-all shadow-xl shadow-amber-500/20 active:scale-95 flex items-center gap-2"
                        >
                          <CreditCard size={18} />
                          اقتناء الآن
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Products Heading */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <span>{activeCategory.name}</span>
                    <span className="text-xs font-bold text-zinc-500">({filteredProducts.length} منتجات)</span>
                  </h3>
                  {activeCategory.description && (
                    <p className="text-xs text-zinc-400 mt-0.5">{activeCategory.description}</p>
                  )}
                </div>
              </div>

              {/* Products Grid */}
              {filteredProducts.length === 0 ? (
                <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-16 text-center space-y-4">
                  <ShoppingBag className="w-16 h-16 text-zinc-600 mx-auto" />
                  <h3 className="text-lg font-bold text-white">لا توجد منتجات معروضة حالياً في هذا القسم</h3>
                  <p className="text-zinc-500 text-sm max-w-sm mx-auto">
                    {isAdmin ? 'يمكنك كمسؤول إضافة أول منتج إلى هذا القسم بالضغط على "إضافة منتج".' : 'ترقب وصول بضائع جديدة قريباً من كبرى العلامات الفاخرة.'}
                  </p>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setNewProduct({
                          name: '',
                          image: '',
                          slotType: 'clothing',
                          categoryId: activeCategoryId,
                          cost: 15000,
                          prestige: 15,
                          description: '',
                          isExclusive: false
                        });
                        setEditingProductId(null);
                        setShowAddModal(true);
                      }}
                      className="px-6 py-2.5 bg-amber-500 text-black font-black rounded-xl text-xs"
                    >
                      إضافة منتج الآن
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                  <AnimatePresence mode="popLayout">
                    {filteredProducts.map((product) => {
                      const isOwned = mallData.purchasedIds?.includes(String(product.id).replace('deal_', ''));
                      const slotLabel = getSlotLabel(product.slotType);
                      const groupLabel = getSlotGroupLabel(product.slotType);

                      return (
                        <motion.div
                          key={product.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="group bg-zinc-900/40 border border-white/5 rounded-[2rem] overflow-hidden hover:bg-zinc-900/70 hover:border-white/10 transition-all flex flex-col shadow-xl relative"
                        >
                          <div className="relative h-60 flex items-center justify-center bg-black/40 overflow-hidden p-4">
                            <img 
                              src={product.image || undefined} 
                              alt={product.name}
                              className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                            
                            {/* Slot Badge */}
                            <div className="absolute top-4 right-4 px-3 py-1 bg-black/70 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black text-zinc-300">
                              {groupLabel}: {slotLabel}
                            </div>

                            {/* VIP / Exclusive */}
                            {product.isExclusive && (
                              <div className="absolute top-12 right-4 px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-600 text-black text-[10px] font-black rounded-full shadow-lg flex items-center gap-1 uppercase tracking-widest">
                                <Crown size={12} />
                                VIP
                              </div>
                            )}

                            {/* Admin Controls */}
                            {isAdmin && (
                              <div className="absolute top-4 left-4 flex gap-1.5 z-20">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); toggleExclusive(product); }}
                                  className={`p-2 backdrop-blur-md rounded-full text-white transition-colors ${product.isExclusive ? 'bg-yellow-500/80 hover:bg-yellow-500' : 'bg-zinc-800/80 hover:bg-zinc-700'}`}
                                  title={product.isExclusive ? "إزالة من العروض الحصرية" : "تعيين كعرض حصري"}
                                >
                                  <Star size={13} />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); openEditModal(product); }}
                                  className="p-2 bg-blue-600/80 hover:bg-blue-600 backdrop-blur-md rounded-full text-white transition-colors"
                                  title="تعديل المنتج"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setProductToDelete(product.id); }}
                                  className="p-2 bg-red-600/80 hover:bg-red-600 backdrop-blur-md rounded-full text-white transition-colors"
                                  title="حذف المنتج"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                            <div>
                              <div className="flex justify-between items-start gap-2 mb-1">
                                <h3 className="text-base font-black text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                                  {product.name}
                                </h3>
                                <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-md shrink-0">
                                  +{product.prestige || 10} جاه
                                </span>
                              </div>
                              {product.description && (
                                <p className="text-zinc-500 text-xs line-clamp-2">{product.description}</p>
                              )}
                            </div>

                            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-zinc-500 font-bold block">السعر</span>
                                <span className="text-base font-black text-green-400">
                                  {formatMoney(product.cost || 0)}
                                </span>
                              </div>

                              {isOwned ? (
                                <button 
                                  onClick={() => setActiveView('my_items')}
                                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
                                >
                                  <Check size={14} className="text-emerald-400" />
                                  <span>في ممتلكاتي</span>
                                </button>
                              ) : (
                                <button 
                                  onClick={() => buyProduct(product)}
                                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black px-5 py-2.5 rounded-xl font-black text-xs transition-all active:scale-95 flex items-center gap-1.5 shadow-lg shadow-orange-500/20"
                                >
                                  <ShoppingCart size={14} />
                                  <span>شراء</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </main>
        </div>
      )}

      {/* --- MODAL 1: ADD / EDIT PRODUCT MODAL --- */}
      <AnimatePresence>
        {showAddModal && isAdmin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl my-8"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                <div>
                  <h2 className="text-xl font-black text-white">
                    {editingProductId ? 'تعديل منتج في المتجر' : 'إضافة منتج جديد للمتجر'}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">حدد قسم المتجر ومكان التجهيز للشخصية</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                {/* Product Name */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">اسم المنتج</label>
                  <input 
                    type="text" 
                    value={newProduct.name}
                    onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-amber-500 outline-none text-sm font-bold"
                    placeholder="مثال: رولكس دايتونا الذهبية أو بدلة توم فورد"
                  />
                </div>

                {/* Store Category Select + Quick Add Category Button */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-zinc-400">قسم المتجر</label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryModal(true);
                        setIsEditingCategory(false);
                        setCategoryFormData({
                          name: '',
                          iconName: 'ShoppingBag',
                          color: 'from-blue-500 to-indigo-600',
                          description: ''
                        });
                      }}
                      className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      <Plus size={12} />
                      + إضافة قسم جديد
                    </button>
                  </div>
                  <select 
                    value={newProduct.categoryId}
                    onChange={e => setNewProduct({...newProduct, categoryId: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-amber-500 outline-none text-sm font-bold"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Character Equipment Slot (قسم الشخصية > التجهيزات الحالية) */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">
                    مكان التجهيز (حسب قسم الشخصية &gt; التجهيزات الحالية)
                  </label>
                  <select 
                    value={newProduct.slotType}
                    onChange={e => setNewProduct({...newProduct, slotType: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-amber-500 outline-none text-sm font-bold"
                  >
                    {EQUIPMENT_SLOT_GROUPS.map(group => (
                      <optgroup key={group.groupId} label={`-- ${group.groupLabel} --`}>
                        {group.slots.map(slot => (
                          <option key={slot.id} value={slot.id}>
                            {slot.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    الخانة المختارة تحدد مكان ارتداء وتجهيز القطعة على جسد الشخصية.
                  </p>
                </div>

                {/* Image URL */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">رابط صورة المنتج</label>
                  <input 
                    type="text" 
                    value={newProduct.image}
                    onChange={e => setNewProduct({...newProduct, image: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-amber-500 outline-none text-sm font-bold"
                    placeholder="https://..."
                  />
                  {newProduct.image && (
                    <div className="mt-2 w-20 h-20 bg-black/40 rounded-xl border border-white/10 p-1 flex items-center justify-center overflow-hidden">
                      <img src={newProduct.image} alt="Preview" className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>

                {/* Price & Prestige */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5">السعر بالدولار ($)</label>
                    <input 
                      type="number" 
                      value={newProduct.cost}
                      onChange={e => setNewProduct({...newProduct, cost: Math.max(0, Number(e.target.value))})}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-amber-500 outline-none text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5">نقاط الجاه (Prestige)</label>
                    <input 
                      type="number" 
                      value={newProduct.prestige}
                      onChange={e => setNewProduct({...newProduct, prestige: Math.max(0, Number(e.target.value))})}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-amber-500 outline-none text-sm font-bold"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">وصف المنتج (اختياري)</label>
                  <textarea 
                    value={newProduct.description}
                    onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                    rows={2}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-amber-500 outline-none text-sm"
                    placeholder="وصف مختصر للقطعة..."
                  />
                </div>

                {/* VIP Exclusive Toggle */}
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="isExclusive"
                    checked={newProduct.isExclusive}
                    onChange={e => setNewProduct({...newProduct, isExclusive: e.target.checked})}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <label htmlFor="isExclusive" className="text-xs font-bold text-zinc-300 cursor-pointer">
                    عرض حصري لأعضاء VIP فقط
                  </label>
                </div>

                {/* Submit Button */}
                <button 
                  onClick={handleSaveProduct}
                  disabled={isSavingProduct}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black py-3.5 rounded-xl mt-4 transition-all shadow-lg shadow-orange-500/20 text-sm disabled:opacity-50"
                >
                  {isSavingProduct ? 'جاري الحفظ...' : (editingProductId ? 'حفظ تعديلات المنتج' : 'إضافة المنتج إلى المتجر')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODAL 2: CATEGORY MANAGEMENT (ADD / EDIT CATEGORY) --- */}
      <AnimatePresence>
        {showCategoryModal && isAdmin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/5">
                <h3 className="text-lg font-black text-white">
                  {isEditingCategory ? 'تعديل قسم بالمتجر' : 'إضافة قسم جديد للمتجر'}
                </h3>
                <button onClick={() => setShowCategoryModal(false)} className="text-zinc-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">اسم القسم</label>
                  <input 
                    type="text" 
                    value={categoryFormData.name}
                    onChange={e => setCategoryFormData({...categoryFormData, name: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none text-sm font-bold"
                    placeholder="مثال: الإلكترونيات، الإكسسوارات الذهبية..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">أيقونة القسم</label>
                  <div className="grid grid-cols-5 gap-2 max-h-36 overflow-y-auto p-1 bg-black/40 rounded-xl border border-white/5">
                    {Object.keys(CATEGORY_ICON_MAP).map(iconKey => {
                      const IconComp = CATEGORY_ICON_MAP[iconKey];
                      const isSelected = categoryFormData.iconName === iconKey;
                      return (
                        <button
                          key={iconKey}
                          type="button"
                          onClick={() => setCategoryFormData({...categoryFormData, iconName: iconKey})}
                          className={clsx(
                            "p-2.5 rounded-lg flex items-center justify-center transition-all",
                            isSelected ? "bg-amber-500 text-black shadow-md scale-105" : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                          )}
                        >
                          <IconComp size={18} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">اللون والتدريج</label>
                  <select 
                    value={categoryFormData.color}
                    onChange={e => setCategoryFormData({...categoryFormData, color: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none text-sm font-bold"
                  >
                    {CATEGORY_COLORS.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">وصف القسم (اختياري)</label>
                  <input 
                    type="text" 
                    value={categoryFormData.description}
                    onChange={e => setCategoryFormData({...categoryFormData, description: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none text-sm"
                    placeholder="وصف ترويجي مختصر..."
                  />
                </div>

                <button 
                  onClick={handleSaveCategory}
                  disabled={isSavingCategory}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 rounded-xl mt-3 transition-all text-sm shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {isSavingCategory ? 'جاري الحفظ...' : (isEditingCategory ? 'تحديث بيانات القسم' : 'إنشاء القسم وتفعيله')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODAL 3: DELETE PRODUCT CONFIRMATION --- */}
      <AnimatePresence>
        {productToDelete && isAdmin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} />
              </div>
              <h2 className="text-xl font-black mb-2">تأكيد الحذف</h2>
              <p className="text-zinc-400 text-sm mb-6">هل أنت متأكد من حذف هذا المنتج من المتجر؟ لا يمكن التراجع عن هذا الإجراء.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-colors text-sm"
                >
                  إلغاء
                </button>
                <button 
                  onClick={confirmDeleteProduct}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-colors text-sm"
                >
                  حذف
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODAL 4: DELETE CATEGORY CONFIRMATION --- */}
      <AnimatePresence>
        {categoryToDelete && isAdmin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} />
              </div>
              <h2 className="text-xl font-black mb-2">حذف قسم من المتجر</h2>
              <p className="text-zinc-400 text-sm mb-6">هل أنت متأكد من حذف هذا القسم؟ لن يتم حذف المنتجات ولكن ستفقد تصنيفها.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setCategoryToDelete(null)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-colors text-sm"
                >
                  إلغاء
                </button>
                <button 
                  onClick={confirmDeleteCategory}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-colors text-sm"
                >
                  حذف القسم
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODAL 5: SMART SET IMPORTER --- */}
      <AnimatePresence>
        {showSetModal && isAdmin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-6 lg:p-8 w-full max-w-xl shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                    <Sparkles size={22} />
                  </div>
                  <h2 className="text-xl font-black">مستورد الأطقم الذكي</h2>
                </div>
                <button onClick={() => setShowSetModal(false)} className="text-zinc-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">رابط صورة الطقم الكامل</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={setImageUrl}
                      onChange={e => setSetImageUrl(e.target.value)}
                      className="flex-1 bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-indigo-500 outline-none font-bold text-sm"
                      placeholder="https://..."
                    />
                    <button
                      onClick={handleAnalyzeSet}
                      disabled={isAnalyzingSet || !setImageUrl}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-xl transition-all font-bold text-xs flex items-center gap-2"
                    >
                      {isAnalyzingSet ? <RefreshCw className="animate-spin" size={14} /> : <Search size={14} />}
                      تحليل
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">قسم المتجر المستهدف</label>
                  <select 
                    value={setCategoryId}
                    onChange={e => setSetCategoryId(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-indigo-500 outline-none font-bold text-sm"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {setAnalysisResults.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <p className="text-xs font-bold text-zinc-300">القطع المكتشفة ({setAnalysisResults.length}):</p>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {setAnalysisResults.map((item, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/10 p-3 rounded-xl">
                          <p className="font-black text-white text-xs truncate">{item.name}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5 uppercase font-bold">{item.slotType}</p>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={handleImportSet}
                      disabled={isImportingSet}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl mt-2 transition-all shadow-xl shadow-emerald-500/20 text-xs disabled:opacity-50"
                    >
                      {isImportingSet ? 'جاري استيراد القطع...' : 'تأكيد استيراد جميع القطع كمنتجات منفصلة'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MallStat({ icon: Icon, label, value, color }: any) {
  return (
    <div className="flex items-center gap-3 bg-white/5 px-4 py-2.5 rounded-2xl border border-white/10">
      <div className={clsx("p-2 rounded-xl bg-black/30", color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <span className="block text-[8px] text-zinc-500 font-black uppercase tracking-widest">{label}</span>
        <span className={clsx("text-xs lg:text-sm font-black truncate block", color)}>{value}</span>
      </div>
    </div>
  );
}
