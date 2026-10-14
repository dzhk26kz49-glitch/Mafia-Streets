import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Shield, Crosshair, Car, Wrench, Pill, Edit2, Image as ImageIcon, Save, X, Landmark, Coffee, Smartphone, RefreshCw, Eye, EyeOff, Gift, Search, User, Loader2, Crown, Monitor, Plus, Package, Zap, Trash2, Download, Check, FlaskConical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatMoney } from '../lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';
import { doc, updateDoc, onSnapshot, collection, setDoc, increment, query, where, getDocs, limit, addDoc, serverTimestamp, deleteDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

import { MARKET_ITEMS } from '../lib/items';

const COMPUTER_SPECS = {
  processors: [
    { name: 'Intel Core i5-13400', power: 1500, price: 200 },
    { name: 'Intel Core i7-13700K', power: 2500, price: 400 },
    { name: 'Intel Core i9-13900K', power: 4000, price: 600 },
    { name: 'AMD Ryzen 5 7600', power: 1600, price: 220 },
    { name: 'AMD Ryzen 7 7700X', power: 2600, price: 350 },
    { name: 'AMD Ryzen 9 7950X', power: 4200, price: 700 },
    { name: 'Apple M2 Pro', power: 2800, price: 500 },
    { name: 'Apple M2 Max', power: 3500, price: 800 },
  ],
  gpus: [
    { name: 'NVIDIA RTX 3060', power: 1200, price: 300 },
    { name: 'NVIDIA RTX 4070', power: 2500, price: 600 },
    { name: 'NVIDIA RTX 4090', power: 6000, price: 1600 },
    { name: 'AMD RX 6700 XT', power: 1300, price: 350 },
    { name: 'AMD RX 7900 XTX', power: 3500, price: 1000 },
    { name: 'Integrated Graphics', power: 200, price: 0 },
  ],
  screens: [
    { name: '24" 1080p 75Hz', power: 100, price: 150 },
    { name: '27" 1440p 144Hz', power: 300, price: 350 },
    { name: '32" 4K 144Hz', power: 600, price: 800 },
    { name: '14" Liquid Retina XDR', power: 400, price: 500 },
    { name: '16" Liquid Retina XDR', power: 500, price: 700 },
  ],
  ram: [
    { name: '16GB DDR5', power: 200, price: 80 },
    { name: '32GB DDR5', power: 500, price: 160 },
    { name: '64GB DDR5', power: 1000, price: 320 },
    { name: '128GB DDR5', power: 2000, price: 640 },
  ],
  storage: [
    { name: '512GB NVMe SSD', power: 100, price: 50 },
    { name: '1TB NVMe SSD', power: 250, price: 100 },
    { name: '2TB NVMe SSD', power: 600, price: 200 },
    { name: '4TB NVMe SSD', power: 1500, price: 500 },
  ]
};

export default function Market() {
  const { t } = useTranslation();
  const { profile, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'drugs' | 'weapons' | 'cars' | 'armor' | 'tools' | 'supplements' | 'phones' | 'computers' | 'labs'>('weapons');
  const [customProducts, setCustomProducts] = useState<any[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    type: '',
    image: '',
    category: 'weapons',
    specs: '',
    processor: '',
    camera: '',
    battery: '',
    screen: '',
    memoryOptions: '',
    simOptions: '',
    power: 0,
    price: 0,
    hidden: false,
    rare: false
  });
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, any>>({});
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [govData, setGovData] = useState<any>(null);
  
  // Gifting state
  const [isGifting, setIsGifting] = useState(false);
  const [giftingItem, setGiftingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [playerSuggestions, setPlayerSuggestions] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessingGift, setIsProcessingGift] = useState(false);
  
  // Phone selection state
  const [selectedMemory, setSelectedMemory] = useState<Record<string, string>>({});
  const [selectedSim, setSelectedSim] = useState<Record<string, string>>({});
  
  // eSIM state
  const [randomPhoneNumber, setRandomPhoneNumber] = useState('');
  const [buying, setBuying] = useState<string | null>(null);

  const generateRandomPhoneNumber = () => {
    const randomNum = Math.floor(Math.random() * 100000000);
    return randomNum.toString().padStart(8, '0');
  };

  useEffect(() => {
    setRandomPhoneNumber(generateRandomPhoneNumber());
  }, []);

  const isAdmin = Boolean(profile && profile.role === 'Admin');

  // Enforce that showHidden is strictly disabled if user is not an Admin
  useEffect(() => {
    if (!isAdmin) {
      setShowHidden(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    const unsubGov = onSnapshot(doc(db, 'government', 'current'), (doc) => {
      if (doc.exists()) setGovData(doc.data());
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'government/current');
    });
    return () => unsubGov();
  }, []);

  useEffect(() => {
    if (!profile) return;

    const unsubscribe = onSnapshot(collection(db, 'market_overrides'), (snapshot) => {
      const data: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        data[doc.id] = doc.data();
      });
      setOverrides(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'market_overrides');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubCustom = onSnapshot(collection(db, 'custom_products'), (snapshot) => {
      const items = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((item: any) => !item.categoryId && !item.slotType); // Strictly filter out Mall products (Mall uses categoryId and slotType)
      setCustomProducts(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'custom_products');
    });
    return () => unsubCustom();
  }, []);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);

  // Soft delete: hides product from regular players while allowing Admin to view via "إظهار المحذوف"
  const handleDeleteProduct = async (item: any) => {
    if (!isAdmin || profile?.role !== 'Admin') {
      toast.error('عذراً، هذه الصلاحية محصورة فقط باللاعبين الحاصلين على رتبة مدير');
      setDeleteConfirm(null);
      return;
    }
    
    const toastId = toast.loading('جاري إخفاء المنتج ونقله إلى قائمة المحذوفات...');
    try {
      const isCustom = customProducts.some(p => p.id === item.id);
      if (isCustom) {
        // Soft delete custom product by setting hidden: true
        await updateDoc(doc(db, 'custom_products', item.id), {
          hidden: true,
          updatedAt: serverTimestamp()
        });
        toast.success('تم إخفاء المنتج وحفظه في قائمة المحذوفات', { id: toastId });
      } else {
        // Soft delete static item by updating market_overrides
        await setDoc(doc(db, 'market_overrides', item.id), {
          ...overrides[item.id],
          hidden: true,
          updatedAt: serverTimestamp()
        }, { merge: true });
        toast.success('تم إخفاء المنتج ونقله إلى قائمة المحذوفات', { id: toastId });
      }
      setDeleteConfirm(null);
    } catch (error) {
      toast.error('فشل في تنفيذ العملية', { id: toastId });
      handleFirestoreError(error, OperationType.DELETE, 'market');
    }
  };

  // Restore product: unhides product back to the Black Market
  const handleResetItem = async (itemId: string) => {
    if (!isAdmin || profile?.role !== 'Admin') {
      toast.error('عذراً، هذه الصلاحية محصورة فقط باللاعبين الحاصلين على رتبة مدير');
      return;
    }
    const toastId = toast.loading('جاري استعادة المنتج إلى السوق...');
    try {
      const isCustom = customProducts.some(p => p.id === itemId);
      if (isCustom) {
        await updateDoc(doc(db, 'custom_products', itemId), {
          hidden: false,
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(doc(db, 'market_overrides', itemId), {
          ...overrides[itemId],
          hidden: false,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      toast.success('تمت استعادة ظهور المنتج في السوق بنجاح', { id: toastId });
    } catch (error) {
      toast.error('فشل في استعادة المنتج', { id: toastId });
      handleFirestoreError(error, OperationType.WRITE, 'market');
    }
  };

  const handleAIAnalysis = () => {
    if (productForm.category !== 'computers') return;
    
    setIsAnalyzing(true);
    
    // Simulate AI thinking
    setTimeout(() => {
      const p = COMPUTER_SPECS.processors.find(x => x.name === productForm.processor);
      const g = COMPUTER_SPECS.gpus.find(x => x.name === productForm.camera);
      const s = COMPUTER_SPECS.screens.find(x => x.name === productForm.screen);
      const r = COMPUTER_SPECS.ram.find(x => x.name === productForm.memoryOptions);
      const st = COMPUTER_SPECS.storage.find(x => x.name === productForm.simOptions);

      const totalPower = (p?.power || 0) + (g?.power || 0) + (s?.power || 0) + (r?.power || 0) + (st?.power || 0);
      const totalPrice = (p?.price || 0) + (g?.price || 0) + (s?.price || 0) + (r?.price || 0) + (st?.price || 0) + 500; // Base price

      setProductForm(prev => ({
        ...prev,
        power: totalPower,
        price: totalPrice,
        specs: `نظام متكامل بقوة ${totalPower} حصان رقمي. تم تحسين الأداء بواسطة الذكاء الاصطناعي.`
      }));
      
      setIsAnalyzing(false);
      toast.success('تم تحليل المواصفات وتحديد القوة والسعر بواسطة الذكاء الاصطناعي');
    }, 1500);
  };

  const handleSaveProduct = async () => {
    if (!isAdmin || profile?.role !== 'Admin') {
      toast.error('عذراً، هذه الصلاحية محصورة فقط باللاعبين الحاصلين على رتبة مدير');
      setIsAddingProduct(false);
      return;
    }
    if (isSavingProduct) return;
    if (!productForm.name || !productForm.price) {
      toast.error('يرجى ملء الحقول الأساسية');
      return;
    }

    setIsSavingProduct(true);
    try {
      const formattedData = {
        ...productForm,
        type: productForm.category === 'phones' ? 'phone' : 
              productForm.category === 'computers' ? 'computer' : 
              productForm.type,
        memoryOptions: typeof productForm.memoryOptions === 'string' 
          ? productForm.memoryOptions.split(',').map(s => s.trim()).filter(Boolean)
          : productForm.memoryOptions,
        simOptions: typeof productForm.simOptions === 'string'
          ? productForm.simOptions.split(',').map(s => s.trim()).filter(Boolean)
          : productForm.simOptions
      };

      if (editingCustomId) {
        // Update existing custom product - maintains existing doc id
        await updateDoc(doc(db, 'custom_products', editingCustomId), {
          ...formattedData,
          updatedAt: serverTimestamp()
        });
        toast.success('تم تحديث المنتج بنجاح');
      } else if (editingItem) {
        // Update static product override - maintains existing doc id
        await setDoc(doc(db, 'market_overrides', editingItem), {
          ...formattedData,
          updatedAt: serverTimestamp()
        }, { merge: true });
        toast.success('تم تحديث مواصفات المنتج بنجاح');
      } else {
        // Add new custom product
        await addDoc(collection(db, 'custom_products'), {
          ...formattedData,
          createdAt: serverTimestamp()
        });
        toast.success('تم إضافة المنتج بنجاح');
      }
      setIsAddingProduct(false);
      setEditingCustomId(null);
      setEditingItem(null);
      setProductForm({
        name: '',
        type: '',
        image: '',
        category: 'weapons',
        specs: '',
        processor: '',
        camera: '',
        battery: '',
        screen: '',
        memoryOptions: '',
        simOptions: '',
        power: 0,
        price: 0,
        hidden: false,
        rare: false
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, editingItem ? 'market_overrides' : 'custom_products');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleBuy = async (item: any) => {
    if (!profile || buying) return;

    // Strict security check: hidden items cannot be bought by non-admins
    const isHidden = Boolean(overrides[item.id]?.hidden || item.hidden);
    if (isHidden && (!isAdmin || profile.role !== 'Admin')) {
      toast.error('هذا المنتج غير متوفر في السوق');
      return;
    }
    
    // Apply Visa discount
    let finalPrice = item.price;
    if (profile.visaCard) {
      const { type } = profile.visaCard;
      if (['Platinum', 'Signature', 'Infinite'].includes(type)) {
        finalPrice = Math.floor(item.price * 0.95); // 5% discount
      }
    }
    
    // Apply Tax Holiday discount
    if (govData?.taxHoliday) {
      finalPrice = Math.floor(finalPrice * 0.90); // 10% discount
    }

    if (item.rare && !profile.vipLevel && profile.role !== 'Admin') {
      toast.error('لا تملك vip');
      return;
    }

    if ((profile.cleanMoney || 0) < finalPrice) {
      toast.error(t('market.noMoney'));
      return;
    }

    setBuying(item.id);
    try {
      let updatePath = '';
      if (item.type === 'drugs') {
        updatePath = `inventory.drugs.${item.id}`;
      } else if (item.type === 'supplement' || item.type === 'supplements') {
        updatePath = `inventory.supplements.${item.id}`;
      } else if (['pistol', 'rifle', 'shotgun', 'sniper', 'heavy'].includes(item.type)) {
        updatePath = `inventory.weapons.${item.id}`;
      } else if (item.type === 'armor') {
        updatePath = `inventory.armor.${item.id}`;
      } else if (item.type === 'tool') {
        updatePath = `inventory.tools.${item.id}`;
      } else if (['normal', 'suv', 'luxury', 'armored', 'sports'].includes(item.type)) {
        updatePath = `inventory.cars.${item.id}`;
      } else if (item.type === 'phone' || item.type === 'computer') {
        const memory = selectedMemory[item.id] || (item.memoryOptions ? item.memoryOptions[0] : '');
        const sim = selectedSim[item.id] || (item.simOptions ? item.simOptions[0] : '');
        const collection = item.type === 'phone' ? 'phones' : 'computers';
        
        // Sanitize memory and sim for path
        const safeMemory = String(memory).replace(/[.#$[\]]/g, '_');
        const safeSim = String(sim).replace(/[.#$[\]]/g, '_');
        
        updatePath = `inventory.${collection}.${item.id}_${safeMemory}_${safeSim}`;
      } else if (item.category) {
        // Fallback to category if type is not specifically handled
        updatePath = `inventory.${item.category}.${item.id}`;
      }

      // Validate updatePath to prevent "Invalid field path" error
      if (!updatePath || updatePath.includes('..') || updatePath.endsWith('.') || updatePath.startsWith('.')) {
        console.error('Invalid update path generated:', updatePath);
        toast.error('خطأ في نوع المنتج - تعذر تحديد مسار التخزين');
        setBuying(null);
        return;
      }

      const updates: any = {
        cleanMoney: increment(-finalPrice)
      };
      updates[updatePath] = increment(1);

      await updateDoc(doc(db, 'users', profile.uid), updates);
      toast.success(t('market.purchaseSuccess', { item: item.name, price: formatMoney(finalPrice) }));
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error(t('common.failed'));
    } finally {
      setBuying(null);
    }
  };

  const handleToggleVisibility = async (itemId: string, currentHidden: boolean) => {
    if (!isAdmin) return;
    try {
      await setDoc(doc(db, 'market_overrides', itemId), {
        hidden: !currentHidden
      }, { merge: true });
      toast.success(!currentHidden ? 'تم إخفاء المنتج' : 'تم إظهار المنتج');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'market_overrides');
    }
  };

  const searchPlayers = async (queryStr: string) => {
    if (queryStr.length < 2) {
      setPlayerSuggestions([]);
      return;
    }
    setIsSearching(true);
    try {
      const q = query(
        collection(db, 'users_public'),
        where('displayName', '>=', queryStr),
        where('displayName', '<=', queryStr + '\uf8ff'),
        limit(5)
      );
      const snapshot = await getDocs(q);
      const players = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() }))
        .filter(p => p.uid !== profile?.uid);
      setPlayerSuggestions(players);
    } catch (error) {
      console.error('Error searching players:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGift = async () => {
    if (!profile || !selectedPlayer || !giftingItem || isProcessingGift) return;

    let finalPrice = giftingItem.price;
    if (profile.visaCard) {
      const { type } = profile.visaCard;
      if (['Platinum', 'Signature', 'Infinite'].includes(type)) {
        finalPrice = Math.floor(giftingItem.price * 0.95);
      }
    }
    if (govData?.taxHoliday) {
      finalPrice = Math.floor(finalPrice * 0.90);
    }

    if (profile.cleanMoney < finalPrice) {
      toast.error(t('market.noMoney'));
      return;
    }

    setIsProcessingGift(true);
    try {
      let updatePath = '';
      if (giftingItem.type === 'drugs') {
        updatePath = `inventory.drugs.${giftingItem.id}`;
      } else if (giftingItem.type === 'supplement' || giftingItem.type === 'supplements') {
        updatePath = `inventory.supplements.${giftingItem.id}`;
      } else if (['pistol', 'rifle', 'shotgun', 'sniper', 'heavy'].includes(giftingItem.type)) {
        updatePath = `inventory.weapons.${giftingItem.id}`;
      } else if (giftingItem.type === 'armor') {
        updatePath = `inventory.armor.${giftingItem.id}`;
      } else if (giftingItem.type === 'tool') {
        updatePath = `inventory.tools.${giftingItem.id}`;
      } else if (['normal', 'suv', 'luxury', 'armored', 'sports'].includes(giftingItem.type)) {
        updatePath = `inventory.cars.${giftingItem.id}`;
      } else if (giftingItem.type === 'phone' || giftingItem.type === 'computer') {
        const memory = selectedMemory[giftingItem.id] || (giftingItem.memoryOptions ? giftingItem.memoryOptions[0] : '');
        const sim = selectedSim[giftingItem.id] || (giftingItem.simOptions ? giftingItem.simOptions[0] : '');
        const collection = giftingItem.type === 'phone' ? 'phones' : 'computers';
        
        // Sanitize memory and sim for path
        const safeMemory = String(memory).replace(/[.#$[\]]/g, '_');
        const safeSim = String(sim).replace(/[.#$[\]]/g, '_');
        
        updatePath = `inventory.${collection}.${giftingItem.id}_${safeMemory}_${safeSim}`;
      } else if (giftingItem.category) {
        // Fallback to category
        updatePath = `inventory.${giftingItem.category}.${giftingItem.id}`;
      }

      if (!updatePath) {
        toast.error('خطأ في نوع المنتج - تعذر تحديد مسار التخزين');
        setIsProcessingGift(false);
        return;
      }

      const response = await fetch('/api/market/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: profile.uid,
          recipientId: selectedPlayer.uid,
          item: {
            ...giftingItem,
            image: overrides[giftingItem.id]?.image || giftingItem.image
          },
          price: finalPrice,
          updatePath
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'فشل إرسال الهدية');

      toast.success(`تم إرسال الهدية إلى ${selectedPlayer.displayName} بنجاح!`);
      setIsGifting(false);
      setGiftingItem(null);
      setSelectedPlayer(null);
      setSearchQuery('');
    } catch (error: any) {
      toast.error(error.message || 'فشل إرسال الهدية');
    } finally {
      setIsProcessingGift(false);
    }
  };

  const tabs = [
    { id: 'drugs', icon: Pill, label: t('market.drugs') },
    { id: 'supplements', icon: Coffee, label: t('gym.supplements') },
    { id: 'weapons', icon: Crosshair, label: t('market.weapons') },
    { id: 'cars', icon: Car, label: t('market.cars') },
    { id: 'armor', icon: Shield, label: t('market.armor') },
    { id: 'tools', icon: Wrench, label: t('market.tools') },
    { id: 'phones', icon: Smartphone, label: t('market.phones') },
    { id: 'computers', icon: Monitor, label: t('market.computers') },
    { id: 'labs', icon: FlaskConical, label: 'المختبرات' },
  ];

  const allItems = useMemo(() => {
    const base: Record<string, any[]> = { 
      ...MARKET_ITEMS
    };
    
    const result: Record<string, any[]> = {};
    
    // Initialize with shallow copies of static item arrays and apply overrides
    Object.keys(base).forEach(key => {
      result[key] = base[key].map(item => {
        const enrichedItem = { ...item, category: key };
        if (overrides[item.id]) {
          return { ...enrichedItem, ...overrides[item.id] };
        }
        return enrichedItem;
      });
    });
    
    // Add custom products to their respective categories
    customProducts.forEach(item => {
      const cat = item.category || 'weapons';
      if (!result[cat]) result[cat] = [];
      
      // Check if item already exists to prevent duplicates if any
      if (!result[cat].find(existing => existing.id === item.id)) {
        result[cat].push(item);
      }
    });
    
    return result;
  }, [customProducts, overrides]);

  return (
    <div className="text-white space-y-6 max-w-6xl mx-auto p-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-purple-500/10 text-purple-500 rounded-2xl neon-border-purple animate-pulse">
            <ShoppingCart size={40} />
          </div>
          <div>
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter neon-text-purple">{t('market.title')}</h2>
            <p className="text-zinc-500 font-bold text-sm tracking-widest uppercase mt-1">Elite Underground Marketplace</p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowHidden(!showHidden)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all border ${
                showHidden 
                  ? 'bg-purple-600/20 border-purple-500 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.3)]' 
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              {showHidden ? <Eye size={16} /> : <EyeOff size={16} />}
              <span>{showHidden ? 'إخفاء المحذوف' : 'إظهار المحذوف'}</span>
            </button>
            <button 
              type="button"
              onClick={() => {
                setEditingCustomId(null);
                setEditingItem(null);
                setProductForm({
                  name: '',
                  type: '',
                  image: '',
                  category: activeTab,
                  specs: '',
                  processor: '',
                  camera: '',
                  battery: '',
                  screen: '',
                  memoryOptions: '',
                  simOptions: '',
                  power: 0,
                  price: 0,
                  hidden: false,
                  rare: false
                });
                setIsAddingProduct(true);
              }}
              className="flex items-center gap-2 neon-button-purple px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider"
            >
              <Plus size={18} />
              <span>{t('market.addProduct')}</span>
            </button>
          </div>
        )}
      </div>

      {govData?.taxHoliday && (
        <div className="bg-emerald-900/40 border border-emerald-500/50 rounded-2xl p-6 flex items-start gap-4 animate-pulse">
          <Landmark className="text-emerald-500 shrink-0 mt-1" size={28} />
          <div>
            <h3 className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-2">{t('map.taxHolidayActive')}</h3>
            <p className="text-emerald-200/80 font-medium">
              {t('market.taxHolidayDesc')}
              <br/>
              <span className="text-emerald-400 font-bold">{t('map.effect')}</span> {t('market.taxHolidayEffect')}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 lg:grid-cols-8 gap-1 mb-10 bg-zinc-900/30 p-1 rounded-xl border border-zinc-800/50 backdrop-blur-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-lg font-black transition-all text-[7px] uppercase tracking-tighter border ${
                activeTab === tab.id 
                  ? 'bg-purple-600/20 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]' 
                  : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              <Icon size={12} className={activeTab === tab.id ? 'neon-text-purple' : ''} />
              <span className="truncate w-full text-center">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
        {(allItems[activeTab] || [])
          .filter((item: any) => {
            const isHidden = Boolean(overrides[item.id]?.hidden || item.hidden);
            // Ordinary members must never see hidden or soft-deleted products
            if (!isAdmin) return !isHidden;
            // Admin only sees hidden products if showHidden is explicitly toggled on
            return showHidden ? true : !isHidden;
          })
          .map((item: any) => {
          let finalPrice = item.price;
          let hasDiscount = false;
          
          if (profile?.visaCard) {
            const { type } = profile.visaCard;
            if (['Platinum', 'Signature', 'Infinite'].includes(type)) {
              finalPrice = Math.floor(item.price * 0.95);
              hasDiscount = true;
            }
          }
          
          if (govData?.taxHoliday) {
            finalPrice = Math.floor(finalPrice * 0.90);
            hasDiscount = true;
          }

          return (
          <div key={item.id} className="bg-zinc-900/80 backdrop-blur-sm rounded-3xl border border-zinc-800 flex flex-col overflow-hidden group hover:neon-border-purple transition-all duration-500 shadow-2xl">
            <div className="relative h-56 overflow-hidden bg-black flex items-center justify-center">
              {overrides[item.id]?.image || item.image ? (
                <img 
                  src={overrides[item.id]?.image || item.image || undefined} 
                  alt={item.name}
                  className={`w-full h-full transition-transform duration-700 group-hover:scale-110 ${activeTab === 'phones' || activeTab === 'computers' ? 'object-contain p-6' : 'object-cover'} ${overrides[item.id]?.hidden ? 'opacity-20 grayscale' : 'opacity-80 group-hover:opacity-100'}`}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Package size={64} className="text-zinc-800 animate-pulse" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-90" />
              
              {isAdmin && overrides[item.id]?.hidden && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10">
                  <div className="bg-red-500/20 border border-red-500/50 px-4 py-2 rounded-full flex items-center gap-2">
                    <EyeOff size={16} className="text-red-500" />
                    <span className="text-red-500 font-bold text-xs uppercase tracking-widest">مخفي عن اللاعبين</span>
                  </div>
                </div>
              )}
              {overrides[item.id]?.hidden && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-red-500/80 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">مخفي عن اللاعبين</div>
                </div>
              )}
              {item.rare && (
                <div className="absolute top-2 start-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-black text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest shadow-lg flex items-center gap-1">
                  <Crown size={12} />
                  VIP
                </div>
              )}
            </div>

            <div className="p-6 flex flex-col justify-between flex-1 relative">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] text-purple-400 font-black uppercase tracking-[0.2em] neon-text-purple">{item.type ? t(`itemTypes.${item.type}`) : t(`market.${activeTab}`)}</div>
                  {item.rare && (
                    <div className="bg-amber-500/10 border border-amber-500/50 text-amber-500 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                      VIP
                    </div>
                  )}
                </div>
                
                <h3 className="text-xl font-black mb-2 tracking-tight group-hover:neon-text-purple transition-colors">{item.name}</h3>
                
                {item.power && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <Zap size={12} className="text-blue-400" />
                      <span className="text-[10px] text-blue-400 font-black uppercase tracking-wider">+{formatNumber(item.power)} Power</span>
                    </div>
                  </div>
                )}

                {item.specs && (
                  <div className="mb-4 p-3 bg-black/40 rounded-2xl border border-zinc-800/50 group-hover:border-purple-500/20 transition-colors">
                    <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">{item.specs}</p>
                  </div>
                )}

                {(item.type === 'phone' || item.type === 'computer' || item.category === 'phones' || item.category === 'computers') && (
                  <div className="space-y-3 mb-4">
                    <div className="grid grid-cols-2 gap-2">
                      {item.processor && (
                        <div className="p-2 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                          <div className="text-[8px] text-zinc-500 font-black uppercase mb-1">{t('market.processor')}</div>
                          <div className="text-[10px] text-zinc-300 font-bold truncate">{item.processor}</div>
                        </div>
                      )}
                      {item.camera && (
                        <div className="p-2 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                          <div className="text-[8px] text-zinc-500 font-black uppercase mb-1">{item.type === 'computer' || item.category === 'computers' ? t('market.gpu') : t('market.camera')}</div>
                          <div className="text-[10px] text-zinc-300 font-bold truncate">{item.camera}</div>
                        </div>
                      )}
                    </div>
                    
                    {item.memoryOptions && item.memoryOptions.length > 0 && (
                      <div>
                        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                          {item.type === 'computer' || item.category === 'computers' ? t('market.ram') : t('market.memory')}
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {item.memoryOptions.map((mem: string) => (
                            <button
                              key={mem}
                              onClick={() => setSelectedMemory({...selectedMemory, [item.id]: mem})}
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all border ${
                                (selectedMemory[item.id] || item.memoryOptions[0]) === mem
                                  ? 'bg-purple-600 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:border-zinc-600'
                              }`}
                            >
                              {mem}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.simOptions && item.simOptions.length > 0 && (
                      <div>
                        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                          {item.type === 'computer' || item.category === 'computers' ? t('market.storage') : t('market.sim')}
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {item.simOptions.map((sim: string) => (
                            <button
                              key={sim}
                              onClick={() => setSelectedSim({...selectedSim, [item.id]: sim})}
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all border ${
                                (selectedSim[item.id] || item.simOptions[0]) === sim
                                  ? 'bg-purple-600 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:border-zinc-600'
                              }`}
                            >
                              {sim}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-auto pt-6 border-t border-zinc-800/50">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-1">{t('map.price')}</span>
                    {hasDiscount ? (
                      <div className="flex flex-col">
                        <span className="text-green-400 font-black text-xl neon-text-cyan leading-none">{formatMoney(finalPrice)}</span>
                        <span className="text-zinc-600 line-through text-[10px] font-bold mt-1">{formatMoney(item.price)}</span>
                      </div>
                    ) : (
                      <span className="text-green-400 font-black text-xl neon-text-cyan leading-none">{formatMoney(item.price)}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {isAdmin && (
                      <div className="flex gap-1">
                        <button 
                          onClick={() => {
                            if (item.createdAt) {
                              setEditingCustomId(item.id);
                              setProductForm({
                                name: item.name,
                                type: item.type,
                                image: item.image,
                                category: item.category,
                                specs: item.specs || '',
                                processor: item.processor || '',
                                camera: item.camera || '',
                                battery: item.battery || '',
                                screen: item.screen || '',
                                memoryOptions: item.memoryOptions ? item.memoryOptions.join(', ') : '',
                                simOptions: item.simOptions ? item.simOptions.join(', ') : '',
                                power: item.power || 0,
                                price: item.price,
                                hidden: item.hidden || false,
                                rare: item.rare || false
                              });
                              setIsAddingProduct(true);
                            } else {
                              setEditingItem(item.id);
                              const currentOverride = overrides[item.id] || {};
                              setProductForm({
                                name: currentOverride.name || item.name,
                                type: currentOverride.type || item.type,
                                image: currentOverride.image || item.image,
                                category: currentOverride.category || activeTab,
                                specs: currentOverride.specs || item.specs || '',
                                processor: currentOverride.processor || item.processor || '',
                                camera: currentOverride.camera || item.camera || '',
                                battery: currentOverride.battery || item.battery || '',
                                screen: currentOverride.screen || item.screen || '',
                                memoryOptions: currentOverride.memoryOptions ? (Array.isArray(currentOverride.memoryOptions) ? currentOverride.memoryOptions.join(', ') : currentOverride.memoryOptions) : (item.memoryOptions ? item.memoryOptions.join(', ') : ''),
                                simOptions: currentOverride.simOptions ? (Array.isArray(currentOverride.simOptions) ? currentOverride.simOptions.join(', ') : currentOverride.simOptions) : (item.simOptions ? item.simOptions.join(', ') : ''),
                                power: currentOverride.power || item.power || 0,
                                price: currentOverride.price || item.price,
                                hidden: currentOverride.hidden || false,
                                rare: currentOverride.rare || item.rare || false
                              });
                              setIsAddingProduct(true);
                            }
                          }}
                          className="p-3 bg-purple-500/20 hover:bg-purple-500 text-purple-500 hover:text-white rounded-2xl transition-all border border-purple-500/50"
                          title="تعديل المنتج"
                        >
                          <Edit2 size={20} />
                        </button>
                        {deleteConfirm === item.id ? (
                          <div className="flex gap-1 animate-in fade-in zoom-in duration-200">
                            <button 
                              onClick={() => handleDeleteProduct(item)}
                              className="p-3 bg-red-600 text-white rounded-2xl transition-all border border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                              title="تأكيد الحذف النهائي"
                            >
                              <Check size={20} />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirm(null)}
                              className="p-3 bg-zinc-800 text-zinc-400 rounded-2xl transition-all border border-zinc-700"
                              title="إلغاء"
                            >
                              <X size={20} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button 
                              onClick={() => setDeleteConfirm(item.id)}
                              className="p-3 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl transition-all border border-red-500/50"
                              title="حذف المنتج"
                            >
                              <Trash2 size={20} />
                            </button>
                            {overrides[item.id] && (
                              <button 
                                onClick={() => handleResetItem(item.id)}
                                className="p-3 bg-blue-500/20 hover:bg-blue-500 text-blue-500 hover:text-white rounded-2xl transition-all border border-blue-500/50"
                                title="استعادة الافتراضي"
                              >
                                <RefreshCw size={20} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <button 
                      onClick={() => {
                        setGiftingItem(item);
                        setIsGifting(true);
                      }}
                      className="p-3 bg-zinc-800/50 hover:bg-purple-600/20 text-purple-400 rounded-2xl transition-all border border-zinc-700/50 hover:border-purple-500/50"
                      title="إهداء"
                    >
                      <Gift size={20} />
                    </button>
                    <button 
                      onClick={() => handleBuy(item)}
                      disabled={buying === item.id}
                      className={`relative overflow-hidden neon-button-purple px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-50 group/btn`}
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        {buying === item.id ? <Loader2 className="animate-spin" size={18} /> : <ShoppingCart size={18} />}
                        {buying === item.id ? t('common.processing') : t('market.buy')}
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )})}
      </div>

      {activeTab === 'phones' && (
        <div className="mt-20 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden group hover:neon-border-purple transition-all duration-700">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none group-hover:bg-purple-500/20 transition-colors" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none group-hover:bg-blue-500/20 transition-colors" />
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="flex-1 text-center lg:text-right">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full mb-6">
                <Zap size={16} className="text-purple-400" />
                <span className="text-[10px] text-purple-400 font-black uppercase tracking-widest">Next-Gen Connectivity</span>
              </div>
              <h3 className="text-5xl font-black text-white uppercase tracking-tighter mb-4 neon-text-purple">
                {t('market.buyEsim')}
              </h3>
              <p className="text-zinc-400 font-bold text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed">{t('market.esimDesc')}</p>
            </div>
            
            <div className="w-full max-w-md">
              <div className="bg-black/60 border border-zinc-800 rounded-[2.5rem] p-10 shadow-inner relative overflow-hidden group/card">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />
                
                <div className="text-center relative z-10">
                  <div className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mb-4">{t('market.yourNewNumber')}</div>
                  <div className="text-5xl font-black text-white tracking-[0.2em] font-mono neon-text-cyan mb-8">{randomPhoneNumber}</div>
                  
                  <button 
                    onClick={() => setRandomPhoneNumber(generateRandomPhoneNumber())}
                    className="flex items-center gap-3 mx-auto text-xs text-purple-400 hover:text-purple-300 font-black uppercase tracking-widest transition-all group/refresh"
                  >
                    <RefreshCw size={18} className="group-hover/refresh:rotate-180 transition-transform duration-500" />
                    {t('market.changeNumber')}
                  </button>
                </div>
              </div>

              <div className="mt-10 flex items-center justify-between bg-zinc-900/80 p-6 rounded-3xl border border-zinc-800">
                <div>
                  <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">{t('map.price')}</div>
                  <div className="text-3xl font-black text-green-400 neon-text-cyan">{formatMoney(1000)}</div>
                </div>
                <button 
                  onClick={async () => {
                    if (!profile || buying === 'esim') return;
                    if (profile.cleanMoney < 1000) {
                      toast.error(t('market.noMoney'));
                      return;
                    }
                    setBuying('esim');
                    try {
                      await updateDoc(doc(db, 'users', profile.uid), {
                        cleanMoney: increment(-1000),
                        phoneNumber: randomPhoneNumber,
                        [`inventory.sims.${randomPhoneNumber}`]: increment(1)
                      });
                      toast.success(t('market.esimBought'));
                    } catch (error) {
                      handleFirestoreError(error, OperationType.WRITE, 'users');
                    } finally {
                      setBuying(null);
                    }
                  }}
                  disabled={buying === 'esim'}
                  className="neon-button-purple px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3"
                >
                  {buying === 'esim' ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
                  {buying === 'esim' ? t('common.processing') : t('market.buyEsimBtn')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isAddingProduct && isAdmin && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingProduct(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-2xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-[3.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden neon-border-purple"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
              
              <div className="p-12 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-12">
                  <div>
                    <h3 className="text-4xl font-black text-white uppercase tracking-tighter neon-text-purple">
                      {editingCustomId || editingItem ? t('market.editProduct') : t('market.addProduct')}
                    </h3>
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Product Configuration Interface v2.0</p>
                  </div>
                  <button 
                    onClick={() => setIsAddingProduct(false)}
                    className="p-4 bg-zinc-800/50 hover:bg-red-500/20 text-zinc-400 hover:text-red-500 rounded-3xl transition-all border border-zinc-700/50"
                  >
                    <X size={28} />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] ml-4">{t('market.productName')}</label>
                      <input 
                        type="text"
                        value={productForm.name}
                        onChange={e => setProductForm({...productForm, name: e.target.value})}
                        className="w-full bg-black/50 border border-zinc-800 rounded-3xl px-6 py-5 focus:outline-none focus:neon-border-purple transition-all text-white font-black text-lg placeholder:text-zinc-800"
                        placeholder="ITEM DESIGNATION"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] ml-4">{t('market.productType')}</label>
                        <input 
                          type="text"
                          value={productForm.type}
                          onChange={e => setProductForm({...productForm, type: e.target.value})}
                          className="w-full bg-black/50 border border-zinc-800 rounded-2xl px-6 py-4 focus:outline-none focus:neon-border-purple transition-all text-white font-bold"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] ml-4">{t('market.productCategory')}</label>
                        <div className="relative">
                          <select 
                            value={productForm.category}
                            onChange={e => setProductForm({...productForm, category: e.target.value})}
                            className="w-full bg-black/50 border border-zinc-800 rounded-2xl px-6 py-4 focus:outline-none focus:neon-border-purple transition-all text-white font-bold appearance-none cursor-pointer"
                          >
                            {tabs.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                          </select>
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                            <Plus size={16} className="rotate-45" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] ml-4">{t('market.productPrice')}</label>
                        <div className="relative">
                          <input 
                            type="number"
                            value={productForm.price}
                            onChange={e => setProductForm({...productForm, price: parseInt(e.target.value) || 0})}
                            className="w-full bg-black/50 border border-zinc-800 rounded-2xl px-6 py-4 focus:outline-none focus:neon-border-purple transition-all text-green-400 font-black text-xl"
                          />
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-700 font-black">$</div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] ml-4">{t('market.productPower')}</label>
                        <div className="relative">
                          <input 
                            type="number"
                            value={productForm.power}
                            onChange={e => setProductForm({...productForm, power: parseInt(e.target.value) || 0})}
                            className="w-full bg-black/50 border border-zinc-800 rounded-2xl px-6 py-4 focus:outline-none focus:neon-border-purple transition-all text-blue-400 font-black text-xl"
                          />
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-700 font-black">PWR</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] ml-4">{t('market.productImage')}</label>
                      <div className="flex gap-4">
                        <input 
                          type="text"
                          value={productForm.image}
                          onChange={e => setProductForm({...productForm, image: e.target.value})}
                          className="flex-1 bg-black/50 border border-zinc-800 rounded-2xl px-6 py-4 focus:outline-none focus:neon-border-purple transition-all text-white font-bold text-sm"
                          placeholder="ASSET_URL_IDENTIFIER"
                        />
                        <div className="w-16 h-16 bg-black rounded-2xl border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0 neon-border-purple">
                          {productForm.image ? <img src={productForm.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <ImageIcon className="text-zinc-800" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] ml-4">{t('market.productSpecs')}</label>
                      <textarea 
                        value={productForm.specs}
                        onChange={e => setProductForm({...productForm, specs: e.target.value})}
                        className="w-full bg-black/50 border border-zinc-800 rounded-[2rem] px-6 py-5 focus:outline-none focus:neon-border-purple transition-all text-white font-medium h-40 resize-none text-sm leading-relaxed"
                        placeholder={t('market.specsPlaceholder')}
                      />
                    </div>

                    {(productForm.category === 'phones' || productForm.category === 'computers') && (
                      <div className="bg-black/40 p-8 rounded-[2.5rem] border border-zinc-800/50 space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl" />
                        
                        <div className="flex items-center justify-between relative z-10">
                          <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em]">Technical Matrix</h4>
                          {productForm.category === 'computers' && (
                            <button 
                              onClick={handleAIAnalysis}
                              disabled={isAnalyzing}
                              className="flex items-center gap-2 text-[9px] font-black text-blue-400 hover:text-blue-300 transition-all uppercase tracking-widest bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20"
                            >
                              {isAnalyzing ? <Loader2 className="animate-spin" size={12} /> : <Zap size={12} />}
                              AI Analysis
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6 relative z-10">
                          <div className="space-y-2">
                            <label className="block text-[8px] font-black text-zinc-600 uppercase tracking-widest ml-2">{t('market.processor')}</label>
                            {productForm.category === 'computers' ? (
                              <select 
                                value={productForm.processor}
                                onChange={e => setProductForm({...productForm, processor: e.target.value})}
                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-[10px] text-white font-black appearance-none cursor-pointer"
                              >
                                <option value="">SELECT_CPU</option>
                                {COMPUTER_SPECS.processors.map(x => <option key={x.name} value={x.name}>{x.name}</option>)}
                              </select>
                            ) : (
                              <input 
                                type="text"
                                value={productForm.processor}
                                onChange={e => setProductForm({...productForm, processor: e.target.value})}
                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-[10px] text-white font-black"
                              />
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="block text-[8px] font-black text-zinc-600 uppercase tracking-widest ml-2">
                              {productForm.category === 'computers' ? t('market.gpu') : t('market.camera')}
                            </label>
                            {productForm.category === 'computers' ? (
                              <select 
                                value={productForm.camera}
                                onChange={e => setProductForm({...productForm, camera: e.target.value})}
                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-[10px] text-white font-black appearance-none cursor-pointer"
                              >
                                <option value="">SELECT_GPU</option>
                                {COMPUTER_SPECS.gpus.map(x => <option key={x.name} value={x.name}>{x.name}</option>)}
                              </select>
                            ) : (
                              <input 
                                type="text"
                                value={productForm.camera}
                                onChange={e => setProductForm({...productForm, camera: e.target.value})}
                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-[10px] text-white font-black"
                              />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 relative z-10">
                          <div className="space-y-2">
                            <label className="block text-[8px] font-black text-zinc-600 uppercase tracking-widest ml-2">{t('market.screen')}</label>
                            {productForm.category === 'computers' ? (
                              <select 
                                value={productForm.screen}
                                onChange={e => setProductForm({...productForm, screen: e.target.value})}
                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-[10px] text-white font-black appearance-none cursor-pointer"
                              >
                                <option value="">SELECT_DISPLAY</option>
                                {COMPUTER_SPECS.screens.map(x => <option key={x.name} value={x.name}>{x.name}</option>)}
                              </select>
                            ) : (
                              <input 
                                type="text"
                                value={productForm.screen}
                                onChange={e => setProductForm({...productForm, screen: e.target.value})}
                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-[10px] text-white font-black"
                              />
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="block text-[8px] font-black text-zinc-600 uppercase tracking-widest ml-2">
                              {productForm.category === 'computers' ? t('market.ram') : t('market.memory')}
                            </label>
                            {productForm.category === 'computers' ? (
                              <select 
                                value={productForm.memoryOptions}
                                onChange={e => setProductForm({...productForm, memoryOptions: e.target.value})}
                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-[10px] text-white font-black appearance-none cursor-pointer"
                              >
                                <option value="">SELECT_RAM</option>
                                {COMPUTER_SPECS.ram.map(x => <option key={x.name} value={x.name}>{x.name}</option>)}
                              </select>
                            ) : (
                              <input 
                                type="text"
                                value={productForm.memoryOptions}
                                onChange={e => setProductForm({...productForm, memoryOptions: e.target.value})}
                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-[10px] text-white font-black"
                                placeholder="e.g. 128GB, 256GB..."
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                      <button 
                        onClick={() => setProductForm({...productForm, hidden: !productForm.hidden})}
                        className={`flex items-center justify-center gap-3 px-6 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all border ${productForm.hidden ? 'bg-red-500/10 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-zinc-800/30 border-zinc-800 text-zinc-500'}`}
                      >
                        {productForm.hidden ? <EyeOff size={18} /> : <Eye size={18} />}
                        {productForm.hidden ? t('market.hidden') : t('market.visible')}
                      </button>
                      <button 
                        onClick={() => setProductForm({...productForm, rare: !productForm.rare})}
                        className={`flex items-center justify-center gap-3 px-6 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all border ${productForm.rare ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-zinc-800/30 border-zinc-800 text-zinc-500'}`}
                      >
                        <Crown size={18} />
                        {productForm.rare ? t('market.vipOnly') : t('market.noVip')}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-16 flex gap-6">
                  <button 
                    onClick={() => setIsAddingProduct(false)}
                    className="flex-1 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white py-6 rounded-[2.5rem] font-black uppercase tracking-[0.3em] transition-all border border-zinc-700/50"
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    onClick={handleSaveProduct}
                    disabled={isSavingProduct}
                    className="flex-[2] neon-button-purple py-6 rounded-[2.5rem] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-[0_0_30px_rgba(168,85,247,0.3)] disabled:opacity-50"
                  >
                    {isSavingProduct ? <Loader2 className="animate-spin" size={28} /> : <Save size={28} />}
                    {isSavingProduct ? (t('common.saving') || 'جاري الحفظ...') : t('common.save')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGifting && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsGifting(false);
                setGiftingItem(null);
                setSelectedPlayer(null);
                setSearchQuery('');
              }}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden neon-border-purple"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
              
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3 neon-text-purple">
                    <Gift size={24} />
                    {t('market.giftItem')}
                  </h3>
                  <button onClick={() => {
                    setIsGifting(false);
                    setGiftingItem(null);
                    setSelectedPlayer(null);
                    setSearchQuery('');
                  }} className="p-2 hover:bg-red-500/20 text-zinc-500 hover:text-red-500 rounded-xl transition-all">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-black/40 rounded-2xl border border-zinc-800 group hover:neon-border-purple transition-all">
                    <div className="w-20 h-20 bg-black rounded-xl overflow-hidden border border-zinc-800 shrink-0">
                      <img src={overrides[giftingItem?.id]?.image || giftingItem?.image || undefined} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <div className="font-black text-white text-lg">{giftingItem?.name}</div>
                      <div className="text-green-400 font-black neon-text-cyan">{formatMoney(giftingItem?.price)}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Search Recipient</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                      <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          searchPlayers(e.target.value);
                        }}
                        placeholder="PLAYER NAME..."
                        className="w-full bg-black border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:neon-border-purple transition-all text-white font-bold"
                      />
                      {isSearching && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <Loader2 className="animate-spin text-purple-500" size={18} />
                        </div>
                      )}
                    </div>

                    <AnimatePresence>
                      {playerSuggestions.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden mt-2 shadow-2xl max-h-48 overflow-y-auto custom-scrollbar"
                        >
                          {playerSuggestions.map((player) => (
                            <button
                              key={player.uid}
                              onClick={() => {
                                setSelectedPlayer(player);
                                setSearchQuery(player.displayName);
                                setPlayerSuggestions([]);
                              }}
                              className="w-full flex items-center gap-3 p-4 hover:bg-purple-500/10 transition-colors border-b border-zinc-900 last:border-0 text-right"
                            >
                              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-500 border border-purple-500/30">
                                <User size={18} />
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-black text-white">{player.displayName}</div>
                                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Level {player.level || 1}</div>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {selectedPlayer && (
                    <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-600 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                          {selectedPlayer.displayName[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-[9px] text-purple-400 font-black uppercase tracking-widest">Recipient</div>
                          <div className="font-black text-white">{selectedPlayer.displayName}</div>
                        </div>
                      </div>
                      <button onClick={() => setSelectedPlayer(null)} className="p-2 hover:bg-red-500/20 text-zinc-500 hover:text-red-500 rounded-lg transition-all">
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleGift}
                    disabled={!selectedPlayer || isProcessingGift}
                    className="w-full py-5 neon-button-purple rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isProcessingGift ? <Loader2 className="animate-spin" size={24} /> : <Gift size={24} />}
                    {t('market.sendGift')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
