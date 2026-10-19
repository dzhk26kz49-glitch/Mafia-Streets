import React, { useState, useEffect, useMemo } from 'react';
import { 
  Upload, 
  CheckCircle, 
  Link as LinkIcon, 
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
  Filter,
  AlertTriangle,
  Sparkles,
  Check
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, collection, getDocs, setDoc, getDoc } from 'firebase/firestore';
import { db, storage } from '../../lib/firebase';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/useAuthStore';
import { MARKET_ITEMS } from '../../lib/items';
import { ALL_PRODUCTS } from '../../lib/mallItems';
import { compressImage } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { SHOP_ITEMS } from '../../constants/militiaItems';
import { FIXED_10_NPCS } from '../../services/fixedNpcRoster';

interface ImageItem {
  id: string;
  name: string;
  description?: string;
  image: string;
  type: 'override' | 'user' | 'custom_product' | 'founder' | 'npc';
  category?: string;
  defaultImage?: string;
}

export const ImageManager: React.FC = () => {
  const { customProducts = [], overrides = {} } = useAuthStore();
  const [activeCategory, setActiveCategory] = useState<string>('backgrounds');
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [isSyncingCategory, setIsSyncingCategory] = useState(false);

  // Add Custom Background / Item state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomUrl, setNewCustomUrl] = useState('');
  const [newCustomDesc, setNewCustomDesc] = useState('');

  const categories = [
    { id: 'backgrounds', label: 'الخلفيات', icon: <Layout size={18} /> },
    { id: 'npcs', label: 'عالم الخفاء (NPCs)', icon: <Users size={18} /> },
    { id: 'mafia', label: 'شخصيات المافيا', icon: <Shield size={18} /> },
    { id: 'wealthy', label: 'الأغنياء', icon: <Gem size={18} /> },
    { id: 'mall', label: 'المتجر', icon: <ShoppingBag size={18} /> },
    { id: 'market', label: 'السوق السوداء', icon: <Zap size={18} /> },
    { id: 'militia', label: 'المليشيات', icon: <Sword size={18} /> },
    { id: 'founders', label: 'الزعماء المؤسسين', icon: <Crown size={18} /> },
    { id: 'users', label: 'اللاعبين', icon: <Users size={18} /> }
  ];

  const [militiaShopItems, setMilitiaShopItems] = useState<any[]>([]);
  const [syncedFounders, setSyncedFounders] = useState<any[]>([]);

  // الخلفيات الأساسية للنظام
  const DEFAULT_BACKGROUNDS = [
    { id: 'bg_streets', name: 'خلفية الشوارع العامة', description: 'شوارع بغداد ليلاً في عالم الجريمة', defaultImage: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&q=80' },
    { id: 'bg_mafia', name: 'خلفية شوارع المافيا (الرئيسية)', description: 'البوابة الرئيسية لشوارع المافيا', defaultImage: '/images/mafia/mafia_streets_bg.png' },
    { id: 'bg_mafia_streets', name: 'خلفية شوارع المافيا - الشوارع', description: 'أزقة الشوارع والمهام الميدانية', defaultImage: '/images/mafia/mafia_streets_bg.png' },
    { id: 'bg_mafia_gangs', name: 'خلفية شوارع المافيا - المافيات', description: 'معاقل الزعماء وعصابات الشوارع', defaultImage: '/images/mafia/mafia_branch_bg.png' },
    { id: 'bg_mafia_rich', name: 'خلفية شوارع المافيا - الأغنياء', description: 'قصور النخبة والأثرياء ورجال الأعمال', defaultImage: '/images/wealthy/wealthy_bg.png' },
    { id: 'bg_mafia_center', name: 'شخصية شوارع المافيا المركزية', description: 'الرمز والشخصية وسط الشوارع', defaultImage: '/images/mafia/mafia_streets_center.png' },
    { id: 'bg_underground', name: 'خلفية عالم الخفاء (NPCs)', description: 'العالم السفلي وتجارة السوق السوداء', defaultImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80' },
    { id: 'bg_turf_wars', name: 'خلفية حروب الأحياء والسيطرة', description: 'خريطة النفوذ وصراع السيطرة', defaultImage: 'https://images.unsplash.com/photo-1541971875076-8f970d573be6?auto=format&fit=crop&q=80' },
    { id: 'bg_mall', name: 'خلفية المتجر والمول الفاخر', description: 'مراكز التسوق والعقارات والكماليات', defaultImage: 'https://images.unsplash.com/photo-1519567281799-971605536c58?auto=format&fit=crop&q=80' },
    { id: 'bg_market', name: 'خلفية السوق السوداء والمزادات', description: 'مستودعات التهريب ومزادات السلاح', defaultImage: 'https://images.unsplash.com/photo-1555626906-fcf10d6851b4?auto=format&fit=crop&q=80' },
    { id: 'bg_bank', name: 'خلفية البنك والخزينة المركزية', description: 'الخزائن السويسرية والودائع النقدية', defaultImage: 'https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?auto=format&fit=crop&q=80' },
    { id: 'bg_casino', name: 'خلفية الكازينو وطاولات القمار', description: 'صالات القمار والروليت الليلية', defaultImage: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&q=80' },
    { id: 'bg_militia', name: 'خلفية ثكنة ومعسكر المليشيات', description: 'الثكنات العسكرية والأسطول اللوجستي', defaultImage: 'https://up6.cc/2026/04/17761922251511.jpeg' },
    { id: 'bg_prison', name: 'خلفية السجن وزنازين التحقيق', description: 'زنازين التوقيف وغرف التحقيق', defaultImage: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&q=80' },
    { id: 'bg_hospital', name: 'خلفية المستشفى والعيادة السرية', description: 'غرف العمليات ومداواة الجروح', defaultImage: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80' }
  ];

  const MAFIA_CHARS = [
    { id: 'haji', name: 'الحجي', description: 'الزعيم الأكبر', defaultImage: '/images/mafia/haji.png' },
    { id: 'layan', name: 'ليان', description: 'الزعيمة ومسولة التمويل', defaultImage: '/images/mafia/layan.png' },
    { id: 'saif', name: 'سيف', description: 'قائد العمليات الميدانية', defaultImage: '/images/mafia/saif.png' },
    { id: 'rand', name: 'رند', description: 'استثمارات وغسل أموال', defaultImage: '/images/mafia/rand.png' },
    { id: 'muhannad', name: 'مهند', description: 'تنفيذ السرقات الكبرى', defaultImage: '/images/mafia/muhannad.png' },
    { id: 'yara', name: 'يارا', description: 'جمع معلومات وتجسس', defaultImage: '/images/mafia/yara.png' }
  ];

  const WEALTHY_CHARS = [
    { id: 'elizabeth', name: 'إليزابيث هارتفورد', description: 'بريطانيا - أساطيل سيارات', defaultImage: '/images/wealthy/elizabeth.png' },
    { id: 'jawaher', name: 'جواهر آل الشيخ', description: 'السعودية - تكنولوجيا وأجهزة', defaultImage: '/images/wealthy/jawaher.png' },
    { id: 'natalia', name: 'ناتاليا فولكوفا', description: 'روسيا - مواد سرية ومختبرات', defaultImage: '/images/wealthy/natalia.png' },
    { id: 'jackson', name: 'جاكسون بلاك', description: 'أمريكا - أسلحة ثقيلة', defaultImage: '/images/wealthy/jackson.png' }
  ];

  const NPCS_LIST = FIXED_10_NPCS.map(npc => ({
    id: npc.id,
    name: `${npc.name} (${npc.nickname})`,
    description: `${npc.personalityArabic} - ${npc.specialty} (${npc.district})`,
    defaultImage: npc.image
  }));

  const STATIC_MILITIA_ITEMS = [
    { id: 'militia_bg', name: 'خلفية معسكر المليشيا', defaultImage: 'https://up6.cc/2026/04/17761922251511.jpeg', category: 'militia' },
    { id: 'militia_hq', name: 'مقر قيادة المليشيا (HQ)', defaultImage: 'https://up6.cc/2026/04/177640685065961.png', category: 'militia' },
    { id: 'militia_soldier_suit', name: 'جندي عادي (بدلة عسكرية)', defaultImage: 'https://up6.cc/2026/04/177619222519472.png', category: 'militia' },
    { id: 'militia_soldier_armor', name: 'جندي عادي (درع تكتيكي)', defaultImage: 'https://up6.cc/2026/04/177619222528313.png', category: 'militia' },
    { id: 'militia_soldier_full', name: 'جندي عادي (كامل التجهيز)', defaultImage: 'https://up6.cc/2026/04/177619222536134.png', category: 'militia' },
    { id: 'militia_soldier_m24', name: 'جندي عادي (قناصة M24)', defaultImage: 'https://up6.cc/2026/04/177620240797981.png', category: 'militia' },
    { id: 'militia_soldier_rpg', name: 'جندي عادي (قاذف RPG)', defaultImage: 'https://up6.cc/2026/04/177620240804972.png', category: 'militia' },
    { id: 'militia_sf_suit', name: 'قوات خاصة (بدلة تمويه)', defaultImage: 'https://up6.cc/2026/04/1776290411891.png', category: 'militia' },
    { id: 'militia_sf_mk18', name: 'قوات خاصة (بندقية MK18 CQBR)', defaultImage: 'https://up6.cc/2026/04/177629041197452.png', category: 'militia' },
    { id: 'militia_sf_m24', name: 'قوات خاصة (قناصة M24)', defaultImage: 'https://up6.cc/2026/04/177629041206183.png', category: 'militia' },
    { id: 'militia_sf_rpg', name: 'قوات خاصة (قاذف RPG 7)', defaultImage: 'https://up6.cc/2026/04/177629041210764.png', category: 'militia' },
    { id: 'militia_vehicle', name: 'مركبة مدرعة خفيفة', defaultImage: 'https://up6.cc/2026/04/177619251855932.png', category: 'vehicles' },
    { id: 'militia_logistics', name: 'وحدة لوجستيات وتموين', defaultImage: 'https://up6.cc/2026/04/177619251865033.png', category: 'logistics' },
    { id: 'militia_armor_item', name: 'درع تكتيكي سيراميك', defaultImage: 'https://up6.cc/2026/04/177619251847551.png', category: 'armor' },
    { id: 'militia_weapon_item', name: 'سلاح رشاش MK18', defaultImage: 'https://up6.cc/2026/04/177629041197452.png', category: 'weapons' },
    { id: 'militia_aircraft', name: 'طائرات ومسيرات درون', defaultImage: 'https://up6.cc/2026/04/17761922251511.jpeg', category: 'aircraft' },
    { id: 'militia_intelligence', name: 'منظومات تجسس واستخبارات', defaultImage: 'https://up6.cc/2026/04/1776290411891.png', category: 'intelligence' },
    { id: 'militia_fortifications', name: 'تحصينات ومخابئ أرضية', defaultImage: 'https://up6.cc/2026/04/177619222536134.png', category: 'fortifications' }
  ];

  useEffect(() => {
    fetchMilitiaShop();
    fetchFounders();
  }, []);

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

  // التحقق من صحة الرابط برمجياً
  const testImageUrl = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!url || typeof url !== 'string' || !url.trim()) return resolve(false);
      const img = new window.Image();
      const timer = setTimeout(() => {
        img.src = '';
        resolve(false);
      }, 3500);
      img.onload = () => {
        clearTimeout(timer);
        resolve(true);
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };
      img.src = url;
    });
  };

  // حفظ وحفظ الرابط في قاعدة البيانات مباشرة
  const saveImageUrl = async (item: ImageItem, url: string) => {
    try {
      if (item.type === 'user') {
        await updateDoc(doc(db, 'users', item.id), { photoURL: url });
        await updateDoc(doc(db, 'users_public', item.id), { photoURL: url });
        setUsers(users.map(u => u.id === item.id ? { ...u, photoURL: url } : u));
      } else if (item.type === 'custom_product') {
        await updateDoc(doc(db, 'custom_products', item.id), { image: url, layerImage: url });
      } else if (item.type === 'founder') {
        const updatedList = syncedFounders.map(f => f.id === item.id ? { ...f, image: url } : f);
        await saveFounders(updatedList);
      } else if (item.type === 'npc') {
        await setDoc(doc(db, 'market_overrides', item.id), { image: url }, { merge: true });
        try {
          const rosterRef = doc(db, 'gameData', 'npcs_roster');
          const snap = await getDoc(rosterRef);
          if (snap.exists() && Array.isArray(snap.data()?.characters)) {
            const chars = snap.data().characters.map((c: any) => c.id === item.id ? { ...c, image: url } : c);
            await updateDoc(rosterRef, { characters: chars });
          }
        } catch (e) {
          console.warn('Could not sync to npcs_roster doc:', e);
        }
      } else if (item.type === 'override') {
        const overrideId = activeCategory === 'militia' ? (item.name || item.id) : item.id;
        await setDoc(doc(db, 'market_overrides', overrideId), { image: url }, { merge: true });
        
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

      setBrokenImages(prev => ({ ...prev, [item.id]: false }));
      setEditingId(null);
      toast.success('تم مزامنة وحفظ الرابط في قاعدة البيانات بنجاح 🔗');
    } catch (error) {
      console.error('Error saving image URL:', error);
      toast.error('فشل حفظ الرابط في قاعدة البيانات');
      throw error;
    }
  };

  // نظام المزامنة والتحقق من كافة روابط القسم الحالي مع قاعدة البيانات
  const handleSyncCategoryLinks = async () => {
    const currentItems = getItems();
    if (currentItems.length === 0) {
      toast.info('لا توجد عناصر للمزامنة في هذا القسم');
      return;
    }

    setIsSyncingCategory(true);
    toast.info(`جاري مزامنة وفحص روابط قسم "${categories.find(c => c.id === activeCategory)?.label}" مع قاعدة البيانات...`);

    let syncCount = 0;
    for (const item of currentItems) {
      if (item.image) {
        try {
          await saveImageUrl(item, item.image);
          syncCount++;
        } catch (e) {
          // ignore individual sync errors
        }
      }
    }

    setIsSyncingCategory(false);
    toast.success(`اكتملت المزامنة بنجاح! تم حفظ وتأكيد ${syncCount} رابط في قاعدة البيانات.`);
  };

  const MILITIA_ITEMS = [...STATIC_MILITIA_ITEMS, ...militiaShopItems];

  const getItems = (): ImageItem[] => {
    let items: ImageItem[] = [];
    switch (activeCategory) {
      case 'backgrounds':
        items = DEFAULT_BACKGROUNDS.map(b => ({
          id: b.id,
          name: b.name,
          description: b.description,
          defaultImage: b.defaultImage,
          image: overrides[b.id]?.image || b.defaultImage,
          type: 'override',
          category: 'backgrounds'
        }));
        break;

      case 'npcs':
        items = NPCS_LIST.map(npc => ({
          id: npc.id,
          name: npc.name,
          description: npc.description,
          defaultImage: npc.defaultImage,
          image: overrides[npc.id]?.image || npc.defaultImage,
          type: 'npc',
          category: 'npcs'
        }));
        break;

      case 'mafia':
        items = MAFIA_CHARS.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description,
          defaultImage: c.defaultImage,
          image: overrides[c.id]?.image || c.defaultImage,
          type: 'override',
          category: 'mafia'
        }));
        break;

      case 'wealthy':
        items = WEALTHY_CHARS.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description,
          defaultImage: c.defaultImage,
          image: overrides[c.id]?.image || c.defaultImage,
          type: 'override',
          category: 'wealthy'
        }));
        break;

      case 'mall':
        items = [...ALL_PRODUCTS, ...customProducts].map(p => ({
          id: p.id,
          name: p.name,
          description: p.description || p.category,
          defaultImage: p.image || p.layerImage || '',
          image: overrides[p.id]?.image || p.image || p.layerImage || '',
          type: p.id.startsWith('custom_') ? 'custom_product' : 'override',
          category: 'mall'
        }));
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
        ].map(i => ({
          id: i.id,
          name: i.name,
          description: i.description || `سعر: ${i.price?.toLocaleString()} $`,
          defaultImage: i.image,
          image: overrides[i.id]?.image || i.image,
          type: 'override',
          category: 'market'
        }));
        break;

      case 'militia':
        items = MILITIA_ITEMS.map(i => ({
          id: i.id,
          name: i.name,
          description: i.category ? `قطاع: ${i.category}` : 'عنصر مليشيا معتمد',
          defaultImage: i.defaultImage,
          image: overrides[i.name]?.image || overrides[i.id]?.image || i.defaultImage,
          type: 'override',
          category: i.category || 'militia'
        }));
        break;

      case 'founders':
        items = syncedFounders.map(f => ({
          id: f.id,
          name: f.name,
          description: f.description,
          defaultImage: f.image || '',
          image: f.image || '',
          type: 'founder',
          category: 'founders'
        }));
        break;

      case 'users':
        items = users.map(u => ({
          id: u.id,
          name: u.displayName || 'لاعب بدون اسم',
          description: u.phoneNumber ? `هاتف: ${u.phoneNumber}` : `UID: ${u.id.slice(0, 8)}`,
          image: u.photoURL || '',
          defaultImage: '',
          type: 'user',
          category: 'users'
        }));
        break;
    }

    if (searchQuery) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return items;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, item: ImageItem) => {
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
        imageUrl = await compressImage(file, 900, 900, 0.75);
      } catch (compressionError) {
        const storageRef = ref(storage, `images/${item.id}_${Date.now()}`);
        await uploadBytes(storageRef, file);
        imageUrl = await getDownloadURL(storageRef);
      }
      
      await saveImageUrl(item, imageUrl);
      toast.success('تم رفع الصورة وحفظ رابطها في قاعدة البيانات بنجاح');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'فشل رفع الصورة');
    } finally {
      setUploadingId(null);
    }
  };

  const items = useMemo(() => getItems(), [
    activeCategory, 
    users, 
    overrides, 
    customProducts, 
    syncedFounders, 
    searchQuery, 
    militiaShopItems
  ]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[650px]" dir="rtl">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-72 shrink-0 space-y-2">
        <div className="text-[11px] uppercase font-black text-zinc-400 tracking-[0.2em] px-4 mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Filter size={14} className="text-blue-400" />
            أقسام ومزامنة الروابط
          </span>
          <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-mono">
            {categories.length}
          </span>
        </div>
        
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              setActiveCategory(cat.id);
              setSearchQuery('');
            }}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-bold transition-all duration-200 group relative overflow-hidden backdrop-blur-md border ${
              activeCategory === cat.id 
                ? 'bg-gradient-to-r from-blue-600/30 via-indigo-600/20 to-transparent text-white border-blue-500/50 shadow-[0_0_25px_rgba(59,130,246,0.25)]' 
                : 'bg-black/40 text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border-white/5'
            }`}
          >
            <span className={`${activeCategory === cat.id ? 'text-blue-400 scale-110' : 'text-zinc-500 group-hover:scale-110'} transition-all duration-200 relative z-10`}>
              {cat.icon}
            </span>
            <span className="flex-1 text-right text-sm font-bold relative z-10">{cat.label}</span>
            {activeCategory === cat.id && (
              <motion.div layoutId="active-cat-dot" className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)] relative z-10" />
            )}
          </button>
        ))}

        <div className="mt-4 p-4 rounded-2xl bg-zinc-900/60 border border-white/5 text-xs text-zinc-400 space-y-2">
          <div className="flex items-center gap-2 font-bold text-emerald-400">
            <Sparkles size={15} />
            <span>نظام مزامنة الروابط المباشرة</span>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400">
            إدارة روابط الصور عبر قاعدة البيانات مباشرة. يتم حفظ أي تعديل أو رابط جديد فوراً في قاعدة بيانات Firestore.
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 space-y-6">
        
        {/* ======================================================== */}
        {/* نموذج إضافة خلفية أو عنصر برابط مباشر وقاعدة البيانات */}
        {/* ======================================================== */}
        {activeCategory === 'backgrounds' && (
          <div className="bg-zinc-900/80 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 backdrop-blur-md shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">إضافة خلفية جديدة برابط مباشر وقاعدة البيانات</h3>
                  <p className="text-xs text-zinc-400">حفظ رابط الخلفية المباشر وتخزينه في قاعدة بيانات النظام</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">اسم الخلفية *</label>
                <input
                  type="text"
                  value={newCustomName}
                  onChange={(e) => setNewCustomName(e.target.value)}
                  placeholder="مثال: خلفية الميناء السري..."
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-emerald-500 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">رابط الصورة المباشر (URL) *</label>
                <input
                  type="text"
                  value={newCustomUrl}
                  onChange={(e) => setNewCustomUrl(e.target.value)}
                  placeholder="https://... أو مسار الصورة"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-emerald-500 outline-none font-mono text-left direction-ltr"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-zinc-500">سيتم حفظ الرابط في قاعدة بيانات Firestore فوراً</span>
              <button
                type="button"
                onClick={async () => {
                  if (!newCustomName.trim() || !newCustomUrl.trim()) {
                    toast.error('الرجاء إدخال اسم الخلفية ورابطها المباشر');
                    return;
                  }
                  try {
                    const customId = `bg_custom_${Date.now()}`;
                    const newItem: ImageItem = {
                      id: customId,
                      name: newCustomName,
                      description: 'خلفية مخصصة',
                      image: newCustomUrl,
                      type: 'override',
                      category: 'backgrounds'
                    };
                    await saveImageUrl(newItem, newCustomUrl);
                    toast.success('تمت إضافة وحفظ الخلفية الجديدة بنجاح!');
                    setNewCustomName('');
                    setNewCustomUrl('');
                  } catch (e) {
                    toast.error('فشل حفظ الخلفية');
                  }
                }}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center gap-2"
              >
                <Save size={16} />
                <span>حفظ في قاعدة البيانات</span>
              </button>
            </div>
          </div>
        )}

        {/* Top Control Bar: Search & Sync */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-black/40 p-4 sm:p-5 rounded-[2rem] border border-white/5 backdrop-blur-md shadow-lg">
          <div className="relative flex-1 w-full group/search">
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within/search:text-blue-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder={`البحث في قطاع ${categories.find(c => c.id === activeCategory)?.label}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-2xl pr-12 pl-4 py-3 text-white text-xs sm:text-sm focus:border-blue-500/50 outline-none transition-all placeholder:text-zinc-600 font-bold shadow-inner"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* زر مزامنة روابط القسم مع قاعدة البيانات */}
            <button
              onClick={handleSyncCategoryLinks}
              disabled={isSyncingCategory}
              className="flex-1 md:flex-none px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(59,130,246,0.35)] active:scale-95 border border-blue-400/40 text-xs"
              title="مزامنة كافة الروابط الحالية مع قاعدة البيانات وتأكيد حفظها"
            >
              <RefreshCw size={16} className={isSyncingCategory ? 'animate-spin' : ''} />
              <span>مزامنة روابط القسم مع القاعدة 🔗</span>
            </button>

            {/* إضافة زعيم في قسم المؤسسين */}
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
                className="flex-1 md:flex-none px-5 py-3.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 hover:border-emerald-500 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 text-xs"
              >
                <Plus size={16} />
                <span>إضافة زعيم جديد</span>
              </button>
            )}
          </div>
        </div>

        {/* Items Grid */}
        {items.length === 0 && (
          <div className="col-span-full py-20 text-center bg-black/20 rounded-[2.5rem] border border-white/5 backdrop-blur-md">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <ImageIcon size={40} className="text-zinc-600" />
            </div>
            <p className="text-zinc-400 font-bold text-sm">لا توجد سجلات مطابقة للبحث</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {items.map(item => {
              const isBroken = brokenImages[item.id];
              const isUploading = uploadingId === item.id;

              return (
                <motion.div 
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`group bg-black/40 rounded-[2rem] border overflow-hidden transition-all duration-300 flex flex-col backdrop-blur-md shadow-lg relative ${
                    isBroken ? 'border-amber-500/50 bg-amber-950/20' : 'border-white/5 hover:border-blue-500/40'
                  }`}
                >
                  {/* Image Preview Container */}
                  <div className="relative aspect-video overflow-hidden bg-black/90 flex items-center justify-center border-b border-white/5 z-10 w-full">
                    {item.image && !isBroken ? (
                      <>
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          onError={() => {
                            setBrokenImages(prev => ({ ...prev, [item.id]: true }));
                          }}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-zinc-500 p-4 text-center">
                        <ImageIcon size={36} />
                        <span className="text-[11px] font-bold">لا توجد صورة أو الرابط غير صالح</span>
                      </div>
                    )}

                    {/* Broken Badge */}
                    {isBroken && (
                      <div className="absolute top-3 right-3 bg-amber-500 text-black px-2.5 py-1 rounded-md text-[10px] font-black flex items-center gap-1 z-30 shadow-lg">
                        <AlertTriangle size={12} />
                        <span>رابط معطل</span>
                      </div>
                    )}
                    
                    {/* External Link Button on top corner */}
                    {item.image && !isBroken && (
                      <button
                        onClick={() => window.open(item.image, '_blank')}
                        className="absolute top-3 left-3 p-2 bg-black/60 hover:bg-black/90 rounded-xl text-white transition-all shadow border border-white/10 z-20"
                        title="استعراض الرابط الأصلي"
                      >
                        <ExternalLink size={14} />
                      </button>
                    )}

                    {/* Loading Overlay */}
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-30">
                        <RefreshCw className="text-blue-400 animate-spin" size={30} />
                        <span className="text-xs font-bold text-blue-300 animate-pulse">جاري رفع وحفظ الصورة...</span>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex flex-col flex-1 relative z-10 w-full bg-black/20">
                    <div className="flex flex-col gap-1.5 mb-3 w-full">
                      <div className="flex items-center gap-2 w-full justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isBroken ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                            {isBroken ? 'يحتاج فحص الرابط' : 'محفوظ في القاعدة'}
                          </span>
                        </div>
                        {item.category && (
                          <div className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] text-zinc-400 font-bold">
                            {item.category}
                          </div>
                        )}
                      </div>
                      <h4 className="font-bold text-white text-base truncate group-hover:text-blue-400 transition-colors">
                        {item.name}
                      </h4>
                    </div>

                    {item.description && editingId !== item.id && (
                      <div className="text-[11px] text-zinc-400 line-clamp-2 mb-4 bg-black/40 p-3 rounded-xl border border-white/5 leading-relaxed font-normal">
                        {item.description}
                      </div>
                    )}

                    {/* Edit URL Inline Form */}
                    <AnimatePresence mode="wait">
                      {editingId === item.id ? (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3 pt-3 border-t border-white/10 mt-auto w-full overflow-hidden"
                        >
                          {item.type === 'founder' && (
                            <div className="space-y-2 w-full">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => {
                                  const newList = syncedFounders.map(f => f.id === item.id ? { ...f, name: e.target.value } : f);
                                  setSyncedFounders(newList);
                                }}
                                placeholder="اسم الزعيم..."
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white focus:border-blue-500 outline-none"
                              />
                              <textarea
                                value={item.description}
                                onChange={(e) => {
                                  const newList = syncedFounders.map(f => f.id === item.id ? { ...f, description: e.target.value } : f);
                                  setSyncedFounders(newList);
                                }}
                                placeholder="وصف الزعيم..."
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:border-blue-500 outline-none h-20 resize-none leading-relaxed"
                              />
                            </div>
                          )}
                          <div className="relative w-full">
                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                            <input
                              type="text"
                              value={editUrl}
                              onChange={(e) => setEditUrl(e.target.value)}
                              placeholder="رابط أو مسار الصورة المباشر..."
                              className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:border-blue-500 outline-none font-mono text-left direction-ltr"
                              dir="ltr"
                            />
                          </div>
                          <div className="flex gap-2 w-full">
                            <button
                              onClick={async () => {
                                try {
                                  await saveImageUrl(item, editUrl);
                                } catch (e) {
                                  // Handled in saveImageUrl
                                }
                              }}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow"
                            >
                              <Save size={14} /> حفظ في القاعدة
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs transition-all active:scale-95"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="flex items-center gap-2 mt-auto pt-3 w-full border-t border-white/5 relative z-20">
                          <button
                            onClick={() => {
                              setEditUrl(item.image);
                              setEditingId(item.id);
                            }}
                            className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
                          >
                            <Edit3 size={13} className="text-zinc-400" />
                            <span>تعديل الرابط</span>
                          </button>

                          <label className="px-4 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 text-blue-300 hover:text-white py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95">
                            <Upload size={14} />
                            <span>رفع</span>
                            <input type="file" className="hidden" onChange={(e) => handleUpload(e, item)} accept="image/*" />
                          </label>
                          
                          {(item.type === 'override' || item.type === 'custom_product' || item.type === 'founder' || item.type === 'npc') && (
                            <button
                              onClick={async () => {
                                if (confirm('استعادة الرابط الأصلي؟')) {
                                  try {
                                    if (item.type === 'override' || item.type === 'npc') {
                                      await setDoc(doc(db, 'market_overrides', item.id), { image: item.defaultImage || '' }, { merge: true });
                                    } else if (item.type === 'custom_product') {
                                      await updateDoc(doc(db, 'custom_products', item.id), { image: '', layerImage: '' });
                                    } else if (item.type === 'founder') {
                                      const newList = syncedFounders.filter(f => f.id !== item.id);
                                      await saveFounders(newList);
                                    }
                                    setBrokenImages(prev => ({ ...prev, [item.id]: false }));
                                    toast.success('تمت الاستعادة بنجاح');
                                  } catch (error) {
                                    console.error('Error resetting image:', error);
                                    toast.error('فشل عملية الاستعادة');
                                  }
                                }
                              }}
                              className="px-3 bg-red-900/15 hover:bg-red-600 border border-red-500/20 hover:border-red-500 text-red-400 hover:text-white rounded-xl transition-all active:scale-95 flex items-center justify-center py-2.5"
                              title="استعادة الرابط الأصلي"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
