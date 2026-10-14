import React, { useState, useEffect, useMemo } from 'react';
import { 
  Upload, 
  CheckCircle, 
  Link, 
  RefreshCw, 
  Image as ImageIcon, 
  Search, 
  Edit3, 
  Save, 
  X, 
  Plus,
  Users,
  Shield,
  Gem,
  ShoppingBag,
  Zap,
  Sword,
  Crown,
  Layout,
  ExternalLink,
  Trash2,
  Filter
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, collection, getDocs, setDoc } from 'firebase/firestore';
import { db, storage } from '../../lib/firebase';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/useAuthStore';
import { MARKET_ITEMS } from '../../lib/items';
import { ALL_PRODUCTS } from '../../lib/mallItems';
import { compressImage } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { SHOP_ITEMS } from '../../constants/militiaItems';

export const ImageManager = () => {
  const { customProducts = [], overrides = {} } = useAuthStore();
  const [activeCategory, setActiveCategory] = useState('users');
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');

  const categories = [
    { id: 'users', label: 'اللاعبين', icon: <Users size={18} /> },
    { id: 'mafia', label: 'شخصيات المافيا', icon: <Shield size={18} /> },
    { id: 'wealthy', label: 'الأغنياء', icon: <Gem size={18} /> },
    { id: 'mall', label: 'المتجر', icon: <ShoppingBag size={18} /> },
    { id: 'market', label: 'السوق السوداء', icon: <Zap size={18} /> },
    { id: 'militia', label: 'المليشيات', icon: <Sword size={18} /> },
    { id: 'founders', label: 'الزعماء المؤسسين', icon: <Crown size={18} /> },
    { id: 'backgrounds', label: 'الخلفيات', icon: <Layout size={18} /> }
  ];

  const [militiaShopItems, setMilitiaShopItems] = useState<any[]>([]);
  const [syncedFounders, setSyncedFounders] = useState<any[]>([]);
  const [editingFounder, setEditingFounder] = useState<any>(null);

  const STATIC_MILITIA_ITEMS = [
    { id: 'militia_bg', name: 'خلفية المليشيا', defaultImage: 'https://up6.cc/2026/04/17761922251511.jpeg' },
    { id: 'militia_soldier_suit', name: 'جندي عادي (بدلة)', defaultImage: 'https://up6.cc/2026/04/177619222519472.png' },
    { id: 'militia_soldier_armor', name: 'جندي عادي (درع)', defaultImage: 'https://up6.cc/2026/04/177619222528313.png' },
    { id: 'militia_soldier_full', name: 'جندي عادي (كامل)', defaultImage: 'https://up6.cc/2026/04/177619222536134.png' },
    { id: 'militia_sf_suit', name: 'قوات خاصة (بدلة)', defaultImage: 'https://up6.cc/2026/04/1776290411891.png' },
    { id: 'militia_sf_mk18', name: 'قوات خاصة (MK18 CQBR)', defaultImage: 'https://up6.cc/2026/04/177629041197452.png' },
    { id: 'militia_sf_m24', name: 'قوات خاصة (M24)', defaultImage: 'https://up6.cc/2026/04/177629041206183.png' },
    { id: 'militia_sf_rpg', name: 'قوات خاصة (RPG 7)', defaultImage: 'https://up6.cc/2026/04/177629041210764.png' },
    { id: 'militia_vehicle', name: 'مركبة', defaultImage: 'https://up6.cc/2026/04/177619251855932.png' },
    { id: 'militia_logistics', name: 'لوجستيات', defaultImage: 'https://up6.cc/2026/04/177619251865033.png' },
    { id: 'militia_armor_item', name: 'درع (قطعة)', defaultImage: 'https://up6.cc/2026/04/177619251847551.png' },
    { id: 'militia_weapon_item', name: 'سلاح (قطعة)', defaultImage: 'https://i.ytimg.com/vi/0IWPMawg80c/maxresdefault.jpg' }
  ];

  useEffect(() => {
    const fetchMilitiaShop = async () => {
      try {
        const docSnap = await getDocs(collection(db, 'gameData'));
        const shopDoc = docSnap.docs.find(d => d.id === 'militiaShop');
        if (shopDoc && shopDoc.exists()) {
          const data = shopDoc.data();
          const items: any[] = [];
          Object.entries(data).forEach(([category, categoryItems]: [string, any]) => {
            if (Array.isArray(categoryItems)) {
              categoryItems.forEach(item => {
                items.push({
                  id: item.id,
                  name: item.name,
                  defaultImage: item.image,
                  category: category
                });
              });
            }
          });
          setMilitiaShopItems(items);
        }
      } catch (error) {
        console.error('Error fetching militia shop items:', error);
      }
    };

    fetchMilitiaShop();
    fetchFounders();
  }, []);

  const fetchFounders = async () => {
    try {
      const docSnap = await getDocs(collection(db, 'gameData'));
      const foundersDoc = docSnap.docs.find(d => d.id === 'founders');
      if (foundersDoc && foundersDoc.exists()) {
        setSyncedFounders(foundersDoc.data().list || []);
      }
    } catch (error) {
      console.error('Error fetching founders:', error);
    }
  };

  const saveFounders = async (newList: any[]) => {
    try {
      await setDoc(doc(db, 'gameData', 'founders'), { list: newList });
      setSyncedFounders(newList);
      toast.success('تم تحديث قائمة الزعماء المؤسسين');
    } catch (error) {
      console.error('Error saving founders:', error);
      toast.error('فشل حفظ القائمة');
    }
  };

  const MILITIA_ITEMS = [...STATIC_MILITIA_ITEMS, ...militiaShopItems];

  const MAFIA_CHARS = [
    { id: 'haji', name: 'الحجي', defaultImage: '/images/mafia/haji.png' },
    { id: 'layan', name: 'ليان', defaultImage: '/images/mafia/layan.png' },
    { id: 'saif', name: 'سيف', defaultImage: '/images/mafia/saif.png' },
    { id: 'rand', name: 'رند', defaultImage: '/images/mafia/rand.png' },
    { id: 'muhannad', name: 'مهند', defaultImage: '/images/mafia/muhannad.png' },
    { id: 'yara', name: 'يارا', defaultImage: '/images/mafia/yara.png' }
  ];

  const WEALTHY_CHARS = [
    { id: 'elizabeth', name: 'إليزابيث هارتفورد', defaultImage: '/images/wealthy/elizabeth.png' },
    { id: 'jawaher', name: 'جواهر آل الشيخ', defaultImage: '/images/wealthy/jawaher.png' },
    { id: 'natalia', name: 'ناتاليا فولكوفا', defaultImage: '/images/wealthy/natalia.png' },
    { id: 'jackson', name: 'جاكسون بلاك', defaultImage: '/images/wealthy/jackson.png' }
  ];

  const BACKGROUNDS = [
    { id: 'bg_streets', name: 'خلفية الشوارع', defaultImage: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&q=80' },
    { id: 'bg_mafia', name: 'خلفية شوارع المافيا', defaultImage: '/images/mafia/mafia_streets_bg.png' },
    { id: 'bg_mall', name: 'خلفية المتجر', defaultImage: 'https://images.unsplash.com/photo-1519567281799-971605536c58?auto=format&fit=crop&q=80' },
    { id: 'bg_market', name: 'خلفية السوق السوداء', defaultImage: 'https://images.unsplash.com/photo-1555626906-fcf10d6851b4?auto=format&fit=crop&q=80' },
    { id: 'bg_mafia_rich', name: 'خلفية شوارع المافيا فرع الأغنياء', defaultImage: '/images/wealthy/wealthy_bg.png' },
    { id: 'bg_mafia_streets', name: 'خلفية شوارع المافيا فرع الشوارع', defaultImage: '/images/mafia/mafia_streets_bg.png' },
    { id: 'bg_mafia_gangs', name: 'خلفية شوارع المافيا فرع المافيات', defaultImage: '/images/mafia/mafia_branch_bg.png' },
    { id: 'bg_mafia_center', name: 'صورة شخصية شوارع المافيا الرئيسية', defaultImage: '/images/mafia/mafia_streets_center.png' }
  ];

  useEffect(() => {
    if (activeCategory === 'users') {
      fetchUsers();
    }
  }, [activeCategory]);

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users_public'));
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const getItems = () => {
    let items: any[] = [];
    switch (activeCategory) {
      case 'users':
        items = users.map(u => ({ id: u.id, name: u.displayName || 'بدون اسم', image: u.photoURL || '', type: 'user' }));
        break;
      case 'mafia':
        items = MAFIA_CHARS.map(c => ({ id: c.id, name: c.name, image: overrides[c.id]?.image || c.defaultImage, type: 'override' }));
        break;
      case 'wealthy':
        items = WEALTHY_CHARS.map(c => ({ id: c.id, name: c.name, image: overrides[c.id]?.image || c.defaultImage, type: 'override' }));
        break;
      case 'mall':
        items = [...ALL_PRODUCTS, ...customProducts].map(p => ({ id: p.id, name: p.name, image: overrides[p.id]?.image || p.image || p.layerImage, type: p.id.startsWith('custom_') ? 'custom_product' : 'override' }));
        break;
      case 'market':
        items = [
          ...MARKET_ITEMS.weapons,
          ...MARKET_ITEMS.armor,
          ...MARKET_ITEMS.cars,
          ...MARKET_ITEMS.supplements,
          ...MARKET_ITEMS.phones,
          ...MARKET_ITEMS.tools,
          ...MARKET_ITEMS.computers,
          ...MARKET_ITEMS.drugs
        ].map(i => ({ id: i.id, name: i.name, image: overrides[i.id]?.image || i.image, type: 'override' }));
        break;
      case 'militia':
        items = MILITIA_ITEMS.map(i => ({ 
          id: i.id, 
          name: i.name, 
          image: overrides[i.name]?.image || overrides[i.id]?.image || i.defaultImage, 
          type: 'override',
          category: i.category 
        }));
        break;
      case 'founders':
        items = syncedFounders.map(f => ({ ...f, type: 'founder' }));
        break;
      case 'backgrounds':
        items = BACKGROUNDS.map(b => ({ id: b.id, name: b.name, image: overrides[b.id]?.image || b.defaultImage, type: 'override' }));
        break;
    }

    if (searchQuery) {
      items = items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    return items;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, item: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('الرجاء اختيار ملف صورة صالح');
      return;
    }

    setUploadingId(item.id);

    try {
      let imageUrl: string;
      try {
        imageUrl = await compressImage(file, 800, 800, 0.7);
      } catch (compressionError) {
        console.warn('Compression failed, trying direct upload:', compressionError);
        // Fallback to direct Firebase Storage upload
        const storageRef = ref(storage, `images/${item.id}_${Date.now()}`);
        
        try {
          await uploadBytes(storageRef, file);
          imageUrl = await getDownloadURL(storageRef);
        } catch (storageError) {
          console.error('Storage upload failed:', storageError);
          throw new Error('فشل رفع الصورة إلى التخزين. يرجى التأكد من اتصال الإنترنت أو استخدام صورة أصغر.');
        }
      }
      
      await saveImageUrl(item, imageUrl);
      
      toast.success('تم رفع الصورة بنجاح');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'فشل رفع الصورة');
    } finally {
      setUploadingId(null);
    }
  };

  const saveImageUrl = async (item: any, url: string) => {
    try {
      if (item.type === 'user') {
        await updateDoc(doc(db, 'users', item.id), { photoURL: url });
        await updateDoc(doc(db, 'users_public', item.id), { photoURL: url });
        setUsers(users.map(u => u.id === item.id ? { ...u, photoURL: url } : u));
      } else if (item.type === 'custom_product') {
        await updateDoc(doc(db, 'custom_products', item.id), { image: url, layerImage: url });
      } else if (item.type === 'override') {
        const overrideId = activeCategory === 'militia' ? item.name : item.id;
        await setDoc(doc(db, 'market_overrides', overrideId), { image: url }, { merge: true });
        
        // If it's a militia shop item, update gameData/militiaShop as well
        if (item.category) {
           const shopDocRef = doc(db, 'gameData', 'militiaShop');
           const shopDoc = await getDocs(collection(db, 'gameData')).then(snap => snap.docs.find(d => d.id === 'militiaShop'));
           if (shopDoc && shopDoc.exists()) {
             const data = shopDoc.data();
             if (data[item.category]) {
               const updatedCategory = data[item.category].map((i: any) => 
                 i.id === item.id ? { ...i, image: url } : i
               );
               await updateDoc(shopDocRef, {
                 [item.category]: updatedCategory
               });
             }
           }
        }
      }
      setEditingId(null);
    } catch (error) {
      console.error('Error saving image URL:', error);
      toast.error('فشل حفظ الرابط');
    }
  };

  const items = useMemo(() => getItems(), [activeCategory, users, overrides, customProducts, syncedFounders, searchQuery]);

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[600px]">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 shrink-0 space-y-3">
        <div className="text-[10px] uppercase font-black text-zinc-500 tracking-[0.2em] px-4 mb-4 text-right flex items-center justify-end gap-2">
          <Filter size={12} className="text-zinc-600" />
          تصنيف الصور
        </div>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-[1.5rem] font-bold transition-all duration-300 group relative overflow-hidden backdrop-blur-md border ${
              activeCategory === cat.id 
                ? 'bg-blue-600/10 text-white border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
                : 'bg-black/30 text-zinc-500 hover:bg-white/5 hover:text-zinc-300 border-white/5'
            }`}
          >
            {activeCategory === cat.id && (
               <div className="absolute inset-0 bg-gradient-to-l from-blue-600/20 to-transparent pointer-events-none" />
            )}
            <span className={`${activeCategory === cat.id ? 'text-blue-400 scale-110' : 'group-hover:scale-110'} transition-all duration-300 relative z-10`}>
              {cat.icon}
            </span>
            <span className="flex-1 text-right text-sm tracking-wide relative z-10">{cat.label}</span>
            {activeCategory === cat.id && (
              <motion.div layoutId="active-nav-indicator" className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] relative z-10" />
            )}
          </button>
        ))}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-black/40 p-5 sm:p-6 rounded-[2rem] border border-white/5 backdrop-blur-md shadow-lg">
          <div className="relative flex-1 w-full group/search">
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within/search:text-blue-500 transition-colors" size={20} />
            <input
              type="text"
              placeholder={`البحث في قطاع ${categories.find(c => c.id === activeCategory)?.label}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-2xl pr-14 pl-6 py-4 text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-zinc-600 font-black shadow-inner"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {activeCategory === 'militia' && (
              <button
                onClick={async () => {
                  try {
                    toast.info('جاري مزامنة صور وروابط متجر المليشيات...');
                    const shopDocRef = doc(db, 'gameData', 'militiaShop');
                    
                    // Create a deep copy of SHOP_ITEMS and apply overrides
                    const syncedItems = JSON.parse(JSON.stringify(SHOP_ITEMS));
                    
                    Object.keys(syncedItems).forEach(category => {
                      if (Array.isArray(syncedItems[category])) {
                        syncedItems[category] = syncedItems[category].map((item: any) => {
                          const overrideImage = overrides[item.name]?.image || overrides[item.id]?.image;
                          if (overrideImage) {
                            return { ...item, image: overrideImage };
                          }
                          return item;
                        });
                      }
                    });

                    await setDoc(shopDocRef, syncedItems);
                    toast.success('تمت مزامنة جميع البيانات والصور بنجاح');
                    
                    // Update local items state
                    const items: any[] = [];
                    Object.entries(syncedItems).forEach(([category, categoryItems]: [string, any]) => {
                      if (Array.isArray(categoryItems)) {
                        categoryItems.forEach(item => {
                          items.push({
                            id: item.id,
                            name: item.name,
                            defaultImage: item.image,
                            category: category
                          });
                        });
                      }
                    });
                    setMilitiaShopItems(items);
                  } catch (error) {
                    console.error('Error syncing militia images:', error);
                    toast.error('فشل مزامنة البيانات');
                  }
                }}
                className="flex-1 md:flex-none px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-95 group/btn border border-blue-500/50 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out" />
                <RefreshCw size={18} className="relative z-10" />
                <span className="text-[10px] uppercase tracking-widest relative z-10">استرداد ومزامنة المتجر</span>
              </button>
            )}
            
            {activeCategory === 'founders' && (
              <button 
                onClick={() => {
                  const newFounder = {
                    id: `founder_${Date.now()}`,
                    name: 'زعيم جديد',
                    description: 'وصف الزعيم الجديد...',
                    image: ''
                  };
                  saveFounders([...syncedFounders, newFounder]);
                }}
                className="flex-1 md:flex-none px-8 py-4 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 hover:border-emerald-500 font-black rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95"
              >
                <Plus size={18} />
                <span className="text-[10px] uppercase tracking-widest">إضافة زعيم جديد</span>
              </button>
            )}
          </div>
        </div>

        {items.length === 0 && (
           <div className="col-span-full py-24 text-center bg-black/20 rounded-[3rem] border border-white/5 backdrop-blur-md">
             <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
               <ImageIcon size={48} className="text-zinc-600" />
             </div>
             <p className="text-zinc-500 font-black uppercase tracking-[0.2em] text-sm">لا توجد سجلات مصورة متطابقة</p>
           </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {items.map(item => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="group bg-black/40 rounded-[2rem] border border-white/5 overflow-hidden hover:border-blue-500/30 transition-all duration-500 flex flex-col backdrop-blur-md shadow-lg hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(59,130,246,0.1)] relative"
              >
                {/* Image Preview Container */}
                <div className="relative aspect-video overflow-hidden bg-black flex items-center justify-center border-b border-white/5 z-10 w-full group/img">
                  {item.image ? (
                    <>
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover/img:scale-110" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-300" />
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-zinc-700">
                      <ImageIcon size={48} strokeWidth={1} />
                      <span className="text-[10px] font-black uppercase tracking-widest border border-zinc-800 px-3 py-1 rounded-lg">يفتقر لصورة</span>
                    </div>
                  )}
                  
                  {/* Overlay Controls */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 backdrop-blur-md">
                    <button
                      onClick={() => window.open(item.image, '_blank')}
                      className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all hover:scale-110 active:scale-95 shadow-xl border border-white/10"
                      title="استعراض مكبر"
                    >
                      <ExternalLink size={20} />
                    </button>
                    <label className="p-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-white cursor-pointer transition-all hover:scale-110 active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.4)] border border-blue-500/50 group/upload flex items-center gap-2">
                       <Upload size={20} className="group-hover/upload:-translate-y-1 transition-transform" />
                       <span className="text-xs font-black hidden md:block">رفع ملف</span>
                      <input type="file" className="hidden" onChange={(e) => handleUpload(e, item)} accept="image/*" />
                    </label>
                  </div>

                  {uploadingId === item.id && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-4 z-20">
                      <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/30">
                        <RefreshCw className="text-blue-500 animate-spin" size={32} />
                      </div>
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] animate-pulse">جاري الدمج...</span>
                    </div>
                  )}
                </div>

                <div className="p-6 flex flex-col flex-1 relative z-10 w-full bg-black/20">
                  <div className="flex flex-col gap-2 mb-4 w-full">
                    <div className="flex items-center gap-2 w-full justify-between">
                       <div className="flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
                         <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.2em]">معتمد</span>
                       </div>
                       {item.category && (
                        <div className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-md text-[9px] text-zinc-400 font-black uppercase tracking-widest">
                          قطاع: {item.category}
                        </div>
                      )}
                    </div>
                    <h4 className="font-black text-white uppercase tracking-tight text-lg sm:text-xl truncate group-hover:text-blue-400 transition-colors w-full">
                      {item.name}
                    </h4>
                  </div>

                  {item.type === 'founder' && editingId !== item.id && (
                    <div className="text-[11px] text-zinc-400 line-clamp-2 mb-6 leading-relaxed bg-black/40 p-4 rounded-xl border border-white/5 font-medium shadow-inner text-right">
                      {item.description}
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    {editingId === item.id ? (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 pt-4 border-t border-white/10 mt-auto w-full overflow-hidden"
                      >
                        {item.type === 'founder' && (
                          <div className="space-y-3 w-full">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => {
                                const newList = syncedFounders.map(f => f.id === item.id ? { ...f, name: e.target.value } : f);
                                setSyncedFounders(newList);
                              }}
                              placeholder="اسم الزعيم..."
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-3.5 text-sm font-black text-white focus:border-blue-500 outline-none shadow-inner"
                            />
                            <textarea
                              value={item.description}
                              onChange={(e) => {
                                const newList = syncedFounders.map(f => f.id === item.id ? { ...f, description: e.target.value } : f);
                                setSyncedFounders(newList);
                              }}
                              placeholder="وصف الزعيم السري..."
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-3.5 text-sm font-bold text-white focus:border-blue-500 outline-none h-28 resize-none shadow-inner leading-relaxed"
                            />
                          </div>
                        )}
                        <div className="relative w-full group/link">
                          <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within/link:text-blue-500 transition-colors" size={16} />
                          <input
                            type="text"
                            value={editUrl}
                            onChange={(e) => setEditUrl(e.target.value)}
                            placeholder="مسار/رابط الصورة الخارجي..."
                            className="w-full bg-black/50 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-xs text-white focus:border-blue-500 outline-none font-mono shadow-inner text-left direction-ltr"
                            dir="ltr"
                          />
                        </div>
                        <div className="flex gap-3 w-full">
                          <button
                            onClick={() => {
                              if (item.type === 'founder') {
                                const updatedItem = syncedFounders.find(f => f.id === item.id);
                                saveFounders(syncedFounders.map(f => f.id === item.id ? { ...updatedItem, image: editUrl } : f));
                              } else {
                                saveImageUrl(item, editUrl);
                              }
                              setEditingId(null);
                            }}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                          >
                            <Save size={16} /> اعتماد
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="w-14 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all active:scale-95 flex items-center justify-center"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="flex gap-3 mt-auto pt-4 w-full border-t border-white/5 relative z-20">
                        <button
                          onClick={() => {
                            setEditUrl(item.image);
                            setEditingId(item.id);
                          }}
                          className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white py-3.5 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all flex items-center justify-center gap-2 group/edit active:scale-95"
                        >
                          <Edit3 size={14} className="text-zinc-500 group-hover/edit:text-blue-500 transition-colors" />
                          تعديل المسار / الوصف
                        </button>
                        
                        {(item.type === 'override' || item.type === 'custom_product' || item.type === 'founder') && (
                          <button
                            onClick={async () => {
                              if (confirm('تأكيد مسح هذه البيانات من الأرشيف؟')) {
                                try {
                                  if (item.type === 'override') {
                                    await setDoc(doc(db, 'market_overrides', item.id), { image: '' }, { merge: true });
                                  } else if (item.type === 'custom_product') {
                                    await updateDoc(doc(db, 'custom_products', item.id), { image: '', layerImage: '' });
                                  } else if (item.type === 'founder') {
                                    const newList = syncedFounders.filter(f => f.id !== item.id);
                                    await saveFounders(newList);
                                  }
                                  toast.success('تم الحذف بنجاح');
                                } catch (error) {
                                  console.error('Error deleting image:', error);
                                  toast.error('فشل عملية الحذف');
                                }
                              }
                            }}
                            className="w-14 bg-red-900/20 hover:bg-red-600 border border-red-500/20 hover:border-red-500 text-red-500 hover:text-white rounded-xl transition-all active:scale-95 flex items-center justify-center group/del"
                            title="مسح من الأرشيف"
                          >
                            <Trash2 size={16} className="group-hover/del:scale-110 transition-transform" />
                          </button>
                        )}
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {activeCategory === 'founders' && items.length === 0 && !searchQuery && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-500 gap-4 opacity-50">
              <Crown size={64} strokeWidth={1} />
              <div className="font-black uppercase tracking-widest text-sm">لا يوجد زعماء مؤسسين بعد</div>
            </div>
          )}
          
          {items.length === 0 && searchQuery && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-600 gap-4">
              <Search size={48} strokeWidth={1} />
              <div className="font-bold">لم يتم العثور على نتائج للبحث "{searchQuery}"</div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
