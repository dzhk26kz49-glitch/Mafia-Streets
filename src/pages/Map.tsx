import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatMoney } from '../lib/utils';
import { useAuthStore } from '../store/useAuthStore';
import { doc, updateDoc, collection, onSnapshot, setDoc, getDocs, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { toast } from 'sonner';
import { 
  Map as MapIcon, 
  Plane, 
  MapPin, 
  Building, 
  Building2, 
  Factory, 
  Home, 
  Warehouse, 
  Store, 
  ArrowLeft, 
  X, 
  Sword, 
  Edit2, 
  Image as ImageIcon, 
  Save, 
  Landmark,
  Key,
  DollarSign,
  CheckCircle,
  Clock,
  ExternalLink,
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Flame,
  Dices,
  Car,
  Filter,
  Eye,
  ShoppingBag,
  Coins,
  ChevronRight,
  TrendingUp,
  Award,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Truck,
  Crosshair,
  Siren
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { INITIAL_CITY_BUILDINGS, CityBuildingsEngine, cleanFirestoreData } from '../services/cityBuildingsData';
import type { CityBuilding } from '../types/npcTypes';
import { UndergroundWorld } from '../components/underground/UndergroundWorld';

// رابط صورة الخريطة الجوية 3/4 الجديدة المعتمدة
const NEW_MAP_IMAGE_URL = 'https://up6.cc/2026/10/179191159069711.jpeg';
const LOCAL_MAP_IMAGE_URL = '/images/city_map_v2.jpg';
const FALLBACK_MAP_IMAGE_URL = '/images/city_map_aerial.jpg';

const DEFAULT_CITIES = [
  { id: 'baghdad', name: 'بغداد (العاصمة)', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSlxsZEqcKqofZjQbpuOG0dPoDONwvV8d7Bl_r2iHZyOrMSnN7J3DVFznQw&s=10' },
  { id: 'damascus', name: 'دمشق', image: 'https://www.independentarabia.com/sites/default/files/styles/1368x911/public/article/mainimage/2025/01/29/1088297-616635319.jpg' },
  { id: 'beirut', name: 'بيروت', image: 'https://static.srpcdigital.com/styles/1037xauto/public/2024-08/740062.jpeg.webp' },
  { id: 'cairo', name: 'القاهرة', image: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&q=80&w=1000' },
  { id: 'dubai', name: 'دبي', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=1000' },
];

const DISTRICT_FILTERS = [
  { id: 'all', name: 'الكل (كافة المقاطعات)' },
  { id: 'حي ناطحات السحاب', name: '🏙️ حي ناطحات السحاب والمصارف' },
  { id: 'مجمع الملاهي والترفيه', name: '🎡 مجمع الملاهي والألعاب' },
  { id: 'حوض الميناء والمستودعات', name: '⚓ حوض الميناء والمستودعات' },
  { id: 'شبكة القنوات المائية', name: '🌊 شبكة القنوات والكورنيش' },
  { id: 'الحي السكني والحدائق', name: '🏡 الحي السكني والفلل' },
  { id: 'المربع الأمني والترفيه الليلي', name: '🎰 المربع الأمني وكازينو المدينة' },
];

export default function InfluenceMap() {
  const { t } = useTranslation();
  const { profile, user } = useAuthStore();

  // التبويب النشط الرئيسي: خريطة المدينة والنفوذ، عالم الخفاء والـ NPCs، محفظة عقاراتي، المدن الدولية
  const [activeMainTab, setActiveMainTab] = useState<
    'city_map' | 'underground' | 'my_properties' | 'world_cities'
  >('city_map');

  const [undergroundInitialTab, setUndergroundInitialTab] = useState<
    'roster' | 'laundering' | 'dispatch' | 'partnerships' | 'pvp' | 'heists' | 'prison' | 'skills'
  >('roster');

  // خريطة المدينة والمباني التفاعلية
  const [cityBuildings, setCityBuildings] = useState<CityBuilding[]>(INITIAL_CITY_BUILDINGS);
  const [selectedBuilding, setSelectedBuilding] = useState<CityBuilding | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [rentDurationDays, setRentDurationDays] = useState<number>(3);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

  // إعدادات المدن القديمة والسفر
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [cityOverrides, setCityOverrides] = useState<Record<string, string>>({});
  const [editingCity, setEditingCity] = useState<string | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [govData, setGovData] = useState<any>(null);

  const isAdmin = profile?.role === 'Admin';

  // حالة تكبير الخريطة إلى حجم أكبر 3/4
  const [isMapExpanded, setIsMapExpanded] = useState<boolean>(false);
  const [expandedZoom, setExpandedZoom] = useState<number>(1);

  // إغلاق نافذة التكبير بالزر Esc ومنع تمرير الصفحة خلفها
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMapExpanded(false);
      }
    };
    if (isMapExpanded) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isMapExpanded]);

  // مزامنة حالة المباني من فايربيس مع الحفاظ على معايرة إحداثيات مقاس 3/4
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'city_maps', 'baghdad'), (snap) => {
      if (snap.exists() && snap.data()?.buildings) {
        const remote = snap.data().buildings as CityBuilding[];
        // دمج مواقع ومقاسات 3/4 الجديدة مع ملكيات وحجوزات اللاعبين في فايربيس
        const merged = INITIAL_CITY_BUILDINGS.map(initBld => {
          const found = remote.find(r => r.id === initBld.id);
          if (found) {
            return {
              ...initBld,
              ownerType: found.ownerType,
              ownerId: found.ownerId,
              ownerName: found.ownerName,
              isRented: found.isRented,
              tenantId: found.tenantId,
              tenantName: found.tenantName,
              rentExpiresAt: found.rentExpiresAt,
              accumulatedRent: found.accumulatedRent ?? initBld.accumulatedRent
            };
          }
          return initBld;
        });
        setCityBuildings(merged);
      } else {
        setCityBuildings(INITIAL_CITY_BUILDINGS);
      }
    }, () => {
      // استخدام القائمة الافتراضية محلياً عند عدم التوفر
      setCityBuildings(INITIAL_CITY_BUILDINGS);
    });

    const unsubGov = onSnapshot(doc(db, 'government', 'current'), (d) => {
      if (d.exists()) setGovData(d.data());
    });

    const unsubCities = onSnapshot(collection(db, 'city_overrides'), (snap) => {
      const data: Record<string, string> = {};
      snap.docs.forEach(d => { data[d.id] = d.data().image; });
      setCityOverrides(data);
    });

    return () => {
      unsub();
      unsubGov();
      unsubCities();
    };
  }, []);

  // تحديث المبنى المختار عند تغير البيانات
  useEffect(() => {
    if (selectedBuilding) {
      const updated = cityBuildings.find(b => b.id === selectedBuilding.id);
      if (updated) setSelectedBuilding(updated);
    }
  }, [cityBuildings]);

  // فلترة المباني المعروضة
  const filteredBuildings = useMemo(() => {
    if (selectedDistrict === 'all') return cityBuildings;
    return cityBuildings.filter(b => b.district === selectedDistrict);
  }, [cityBuildings, selectedDistrict]);

  // قائمة عقارات اللاعب المملوكة والمستأجرة
  const myOwnedBuildings = useMemo(() => {
    if (!profile) return [];
    return cityBuildings.filter(b => b.ownerType === 'player' && b.ownerId === profile.uid);
  }, [cityBuildings, profile]);

  const myRentedBuildings = useMemo(() => {
    if (!profile) return [];
    return cityBuildings.filter(b => b.isRented && b.tenantId === profile.uid);
  }, [cityBuildings, profile]);

  // إجمالي الإيرادات اليومية للعقارات
  const totalDailyRevenue = useMemo(() => {
    const ownedRevenue = myOwnedBuildings.reduce((sum, b) => sum + (b.isRented ? b.dailyRent : b.dailyRevenue), 0);
    const rentedRevenue = myRentedBuildings.reduce((sum, b) => sum + b.dailyRevenue, 0);
    return ownedRevenue + rentedRevenue;
  }, [myOwnedBuildings, myRentedBuildings]);

  // إجمالي عوائد الإيجار المتراكمة القابلة للتحصيل
  const totalAccumulatedRent = useMemo(() => {
    return myOwnedBuildings.reduce((sum, b) => sum + (b.accumulatedRent || 0), 0);
  }, [myOwnedBuildings]);

  // إحصائيات ونسب النفوذ والسيطرة الإقليمية بالمقاطعات
  const districtInfluenceStats = useMemo(() => {
    const districts = [
      { id: 'حي ناطحات السحاب', name: 'حي ناطحات السحاب والمصارف', icon: '🏙️' },
      { id: 'مجمع الملاهي والترفيه', name: 'مجمع الملاهي والألعاب', icon: '🎡' },
      { id: 'حوض الميناء والمستودعات', name: 'حوض الميناء والمستودعات', icon: '⚓' },
      { id: 'شبكة القنوات المائية', name: 'شبكة القنوات والكورنيش', icon: '🌊' },
      { id: 'الحي السكني والحدائق', name: 'الحي السكني والفلل', icon: '🏡' },
      { id: 'المربع الأمني والترفيه الليلي', name: 'المربع الأمني وكازينو المدينة', icon: '🎰' },
    ];

    return districts.map(d => {
      const buildingsInDistrict = cityBuildings.filter(b => b.district === d.id);
      const total = buildingsInDistrict.length || 1;
      const myOwned = buildingsInDistrict.filter(b => b.ownerType === 'player' && b.ownerId === profile?.uid).length;
      const myRented = buildingsInDistrict.filter(b => b.isRented && b.tenantId === profile?.uid).length;
      const myControlled = myOwned + myRented;
      const influencePct = Math.round((myControlled / total) * 100);

      let status = 'خاضع لسيطرة نقابات الظل';
      if (influencePct >= 75) status = 'سيطرة ونفوذ مطلق لعائلتك 👑';
      else if (influencePct >= 50) status = 'نفوذ الأغلبية والسيطرة تحتك 🛡️';
      else if (influencePct >= 25) status = 'وجود ونفوذ تجاري متصاعد ⚡';

      return {
        ...d,
        total,
        myOwned,
        myRented,
        myControlled,
        influencePct,
        status
      };
    });
  }, [cityBuildings, profile?.uid]);

  // شراء عقار
  const handleBuyBuilding = async (bld: CityBuilding) => {
    if (!profile || isProcessingAction) return;

    if (profile.cleanMoney < bld.purchasePrice) {
      toast.error(`رصيدك غير كافٍ! سعر الشراء هو ${formatMoney(bld.purchasePrice)}`);
      return;
    }

    setIsProcessingAction(true);
    const res = await CityBuildingsEngine.purchaseBuilding(
      'baghdad',
      bld.id,
      profile.uid,
      profile.displayName,
      profile.cleanMoney
    );
    setIsProcessingAction(false);

    if (res.success) {
      toast.success(res.message);
      // تحديث فوري محلي
      setCityBuildings(prev => prev.map(b => b.id === bld.id ? {
        ...b,
        ownerType: 'player',
        ownerName: profile.displayName,
        ownerId: profile.uid,
        isRented: false
      } : b));
    } else {
      toast.error(res.message);
    }
  };

  // استئجار عقار حقيقي
  const handleRentBuilding = async (bld: CityBuilding) => {
    if (!profile || isProcessingAction) return;

    const totalCost = bld.dailyRent * rentDurationDays;
    if (profile.cleanMoney < totalCost) {
      toast.error(`تكلفة الإيجار لـ ${rentDurationDays} أيام هي ${formatMoney(totalCost)} ورصيدك لا يكفي!`);
      return;
    }

    setIsProcessingAction(true);
    const res = await CityBuildingsEngine.rentBuilding(
      'baghdad',
      bld.id,
      profile.uid,
      profile.displayName,
      rentDurationDays,
      profile.cleanMoney
    );
    setIsProcessingAction(false);

    if (res.success) {
      toast.success(res.message);
      setCityBuildings(prev => prev.map(b => b.id === bld.id ? {
        ...b,
        isRented: true,
        tenantName: profile.displayName,
        tenantId: profile.uid,
        rentExpiresAt: Date.now() + rentDurationDays * 86400000
      } : b));
    } else {
      toast.error(res.message);
    }
  };

  // تحصيل عوائد الإيجار لعقار محدد
  const handleCollectRent = async (bld: CityBuilding) => {
    if (!profile || isProcessingAction) return;

    setIsProcessingAction(true);
    const res = await CityBuildingsEngine.collectRent('baghdad', bld.id, profile.uid);
    setIsProcessingAction(false);

    if (res.success) {
      toast.success(res.message);
      setCityBuildings(prev => prev.map(b => b.id === bld.id ? {
        ...b,
        accumulatedRent: 0
      } : b));
    } else {
      toast.error(res.message);
    }
  };

  // تحصيل كل العوائد المتراكمة دفعة واحدة
  const handleCollectAllRent = async () => {
    if (!profile || isProcessingAction || totalAccumulatedRent <= 0) return;

    setIsProcessingAction(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(totalAccumulatedRent)
      });

      const updated = cityBuildings.map(b => {
        if (b.ownerId === profile.uid) {
          return { ...b, accumulatedRent: 0 };
        }
        return b;
      });

      await setDoc(doc(db, 'city_maps', 'baghdad'), { buildings: cleanFirestoreData(updated) }, { merge: true });
      setCityBuildings(updated);
      toast.success(`تم تحصيل كافة عوائد الإيجار المتراكمة بنجاح! (+${formatMoney(totalAccumulatedRent)})`);
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء تحصيل العوائد');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // السفر للمدن الدولية القديمة
  const handleTravel = async (cityId: string) => {
    if (!profile) return;
    if (profile.city === cityId) return;

    if (!profile.documents?.passport) {
      toast.error(t('map.passportRequired') || 'جواز السفر مطلوب للسفر بين المدن!');
      return;
    }

    const travelFees: Record<string, number> = {
      baghdad: 5000,
      damascus: 4500,
      beirut: 6000,
      cairo: 8000,
      dubai: 15000
    };

    const price = profile.hasPrivateJet ? 0 : (travelFees[cityId] || 1000);
    if (profile.cleanMoney < price) {
      toast.error('رصيدك لا يكفي لتذكرة السفر!');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(-price),
        city: cityId,
        lastTravelAt: Date.now()
      });
      toast.success(`تم السفر بنجاح إلى ${cityId}!`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-white" dir="rtl">
      {/* الترويسة الرئيسية وقسم التنقل العلوي */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-3xl pointer-events-none rounded-full" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 shadow-lg">
            <MapIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              المدينة &gt; الخريطة والنفوذ
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                محاكاة حقيقية 3D
              </span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              خريطة تفاعلية شاملة، استئجار وشراء مباني حقيقية، تلوين شفاف، ونظام NPCs وشخصيات خفاء ذكي.
            </p>
          </div>
        </div>

        {/* مؤشرات سريعة لمحفظة اللاعب العقارية */}
        <div className="flex items-center gap-3 relative z-10 w-full md:w-auto justify-end">
          <div className="px-4 py-2.5 bg-black/40 rounded-2xl border border-white/5 text-center">
            <span className="text-[10px] text-zinc-400 block font-bold">عقاراتي</span>
            <span className="text-sm font-black text-emerald-400 font-mono">
              {myOwnedBuildings.length} ملك · {myRentedBuildings.length} مستأجر
            </span>
          </div>

          <div className="px-4 py-2.5 bg-black/40 rounded-2xl border border-white/5 text-center">
            <span className="text-[10px] text-zinc-400 block font-bold">العائد اليومي</span>
            <span className="text-sm font-black text-amber-400 font-mono">
              {formatMoney(totalDailyRevenue)}
            </span>
          </div>
        </div>
      </div>

      {/* شريط التبويبات الرئيسي لصفحة المدينة والخريطة */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs font-black">
        <button
          onClick={() => setActiveMainTab('city_map')}
          className={`py-3 px-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeMainTab === 'city_map'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <MapIcon size={16} />
          <span>الخريطة والنفوذ</span>
        </button>

        <button
          onClick={() => {
            setUndergroundInitialTab('roster');
            setActiveMainTab('underground');
          }}
          className={`py-3 px-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeMainTab === 'underground'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-950/40'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Users size={16} />
          <span>عالم الخفاء (NPCs)</span>
        </button>

        <button
          onClick={() => setActiveMainTab('my_properties')}
          className={`py-3 px-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeMainTab === 'my_properties'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Building2 size={16} />
          <span>عقاراتي ({myOwnedBuildings.length + myRentedBuildings.length})</span>
        </button>

        <button
          onClick={() => setActiveMainTab('world_cities')}
          className={`py-3 px-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeMainTab === 'world_cities'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/40'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Plane size={16} />
          <span>المدن الدولية</span>
        </button>
      </div>

      {/* 1. تبويب خريطة المدينة والنفوذ الكبرى */}
      {activeMainTab === 'city_map' && (
        <div className="space-y-5">
          {/* لوحة نسب السيطرة والنفوذ بالمقاطعات (District Influence & Control) */}
          <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <ShieldCheck className="text-emerald-400" size={18} />
                  نفوذ وسيطرة عائلتك الإقليمية بمقاطعات المدينة
                </h3>
                <p className="text-[11px] text-zinc-400">
                  كل عقار تشتريه أو تستأجره يعزز نفوذك الإقليمي ويوفر حماية إضافية لشحناتك ضد قطاع الطرق والشرطة.
                </p>
              </div>
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-full">
                إجمالي عقاراتك: {myOwnedBuildings.length + myRentedBuildings.length} عقار
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {districtInfluenceStats.map((d) => (
                <div key={d.id} className="p-3.5 bg-black/50 border border-zinc-800/80 rounded-2xl space-y-2 hover:border-zinc-700 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white flex items-center gap-1.5 truncate">
                      <span>{d.icon}</span>
                      <span className="truncate">{d.name.split(' ')[0]} {d.name.split(' ')[1] || ''}</span>
                    </span>
                    <span className="text-xs font-mono font-black text-emerald-400">
                      {d.influencePct}%
                    </span>
                  </div>

                  {/* شريط التقدم للنفوذ */}
                  <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                    <div 
                      className="bg-gradient-to-r from-emerald-600 to-teal-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, d.influencePct)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1">
                    <span className="truncate">{d.myControlled} من {d.total} مبانٍ تحت سيطرتك</span>
                    <button
                      onClick={() => setSelectedDistrict(d.id)}
                      className="text-amber-400 hover:text-amber-300 font-bold shrink-0"
                    >
                      تحديد المقاطعة ←
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* شريط فلاتر المقاطعات والأحياء */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide text-xs">
            <span className="text-zinc-400 font-bold flex items-center gap-1 shrink-0 ps-1">
              <Filter size={14} />
              المقاطعة:
            </span>
            {DISTRICT_FILTERS.map(d => (
              <button
                key={d.id}
                onClick={() => setSelectedDistrict(d.id)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all shrink-0 ${
                  selectedDistrict === d.id
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>

          {/* لوحة الخريطة الجوية الحقيقية بمقاس 3/4 مع المباني التفاعلية والتلوين الشفاف */}
          <div className="relative bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl max-w-4xl mx-auto">
            {/* مؤشرات رادارية وزر التكبير العلوي */}
            <div className="absolute top-4 start-4 z-20 flex items-center gap-2">
              <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl text-[11px] font-mono text-emerald-400 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>رادار النفوذ الحي: {filteredBuildings.length} عقار تفاعلي (مقاس 3/4)</span>
              </div>
            </div>

            {/* مفتاح الألوان وزر التكبير الأكبر */}
            <div className="absolute top-4 end-4 z-20 flex items-center gap-2">
              <button
                onClick={() => setIsMapExpanded(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-950/60 transition-all active:scale-95 border border-emerald-400/40"
                title="فتح الخريطة بأكبر حجم 3/4 ملء الشاشة"
              >
                <Maximize2 size={14} />
                <span>تكبير الخريطة (أكبر حجم 3/4)</span>
              </button>

              <div className="hidden lg:flex items-center gap-3 bg-black/80 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl text-[10px] font-bold">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-zinc-300">ملكك</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-zinc-300">مستأجر</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-zinc-300">مؤجر لآخرين</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
                  <span className="text-zinc-300">شاغر للبيع</span>
                </div>
              </div>
            </div>

            {/* الصورة الجوية للخريطة بمقاس 3/4 مع إمكانية النقر للتكبير */}
            <div 
              className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-950 cursor-pointer group"
              onClick={() => setIsMapExpanded(true)}
            >
              <img 
                src={NEW_MAP_IMAGE_URL} 
                alt="خريطة المدينة 3/4 الجوية" 
                className="w-full h-full object-cover select-none group-hover:scale-[1.01] transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = LOCAL_MAP_IMAGE_URL;
                }}
              />

              {/* طبقة تظليل تكتيكية خفيفة */}
              <div className="absolute inset-0 bg-black/10 pointer-events-none" />

              {/* تلميح سفلي للنقر والتكبير */}
              <div className="absolute bottom-3 end-3 z-20 pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity">
                <span className="px-3 py-1.5 bg-black/85 backdrop-blur-md border border-white/10 text-[11px] font-bold text-zinc-300 rounded-xl flex items-center gap-1.5 shadow-xl">
                  <ZoomIn size={13} className="text-emerald-400" />
                  انقر على الخريطة لتكبيرها لأكبر حجم 3/4
                </span>
              </div>

              {/* المباني والمربعات التفاعلية مع التلوين الشفاف */}
              {filteredBuildings.map((bld) => {
                const isSelected = selectedBuilding?.id === bld.id;
                const isOwnedByMe = bld.ownerType === 'player' && bld.ownerId === profile?.uid;
                const isRentedByMe = bld.isRented && bld.tenantId === profile?.uid;
                const isRentedByOthers = bld.isRented && bld.tenantId !== profile?.uid;

                // التلوين الشفاف بناءً على حالة الملكية والاستئجار
                let colorClasses = 'bg-black/30 border-white/20 text-white hover:bg-white/20';
                if (isOwnedByMe) {
                  colorClasses = 'bg-emerald-500/35 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]';
                } else if (isRentedByMe) {
                  colorClasses = 'bg-blue-500/35 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)]';
                } else if (isRentedByOthers) {
                  colorClasses = 'bg-amber-500/35 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]';
                } else if (bld.ownerType === 'npc') {
                  colorClasses = 'bg-purple-500/30 border-purple-400/60 hover:bg-purple-500/40';
                }

                return (
                  <button
                    key={bld.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBuilding(bld);
                    }}
                    style={{
                      left: `${bld.x}%`,
                      top: `${bld.y}%`,
                      width: `${bld.width}%`,
                      height: `${bld.height}%`
                    }}
                    className={`absolute rounded-xl border-2 transition-all cursor-pointer group flex flex-col items-center justify-center p-1 backdrop-blur-[2px] ${colorClasses} ${
                      isSelected ? 'ring-4 ring-amber-400 scale-105 z-30' : 'hover:scale-105 z-10'
                    }`}
                    title={`${bld.name} - ${bld.ownerName}`}
                  >
                    {/* وسم اسم المبنى والمالك يظهر عند التحويم */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 whitespace-nowrap px-2.5 py-1 bg-black/90 border border-white/10 rounded-lg text-[10px] text-white shadow-xl pointer-events-none z-40">
                      <span className="font-bold">{bld.name}</span>
                      <span className="text-zinc-400 ms-1">({bld.ownerName})</span>
                    </div>

                    <Building2 className={`w-4 h-4 md:w-5 md:h-5 drop-shadow-md ${isOwnedByMe ? 'text-emerald-300' : isRentedByMe ? 'text-blue-300' : 'text-white'}`} />
                    <span className="text-[9px] md:text-[10px] font-black truncate max-w-full drop-shadow-md text-white mt-0.5">
                      {bld.name.split(' ')[0]}
                    </span>

                    {/* علامة الملكية المصغرة */}
                    {isOwnedByMe && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border border-black shadow" />
                    )}
                    {isRentedByMe && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-black shadow" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* نافذة تفاصيل العقار عند الضغط عليه (Real Estate Modal / Drawer) */}
          {selectedBuilding && (
            <div className="p-6 bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
                    <Building2 size={26} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-white">{selectedBuilding.name}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {selectedBuilding.district}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">{selectedBuilding.description}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedBuilding(null)}
                  className="text-zinc-500 hover:text-white p-1 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              {/* شبكة معلومات المالك والمستأجر والمالية */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 my-5 text-xs">
                {/* 1. المالك الحالي */}
                <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-zinc-500 block font-bold">المالك الحالي</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-bold text-white text-sm">
                      {selectedBuilding.ownerType === 'player' && selectedBuilding.ownerId === profile?.uid
                        ? 'أنت (الملكية الكاملة)'
                        : selectedBuilding.ownerName}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 block">
                    {selectedBuilding.ownerType === 'unowned' ? 'عقار حكومي متاح للشراء' : 'مسجل في الطابو الرسمي'}
                  </span>
                </div>

                {/* 2. المستأجر الحالي */}
                <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-zinc-500 block font-bold">حالة الإيجار</span>
                  <div className="flex items-center gap-2">
                    <Key size={14} className={selectedBuilding.isRented ? 'text-blue-400' : 'text-zinc-500'} />
                    <span className="font-bold text-white text-sm">
                      {selectedBuilding.isRented
                        ? (selectedBuilding.tenantId === profile?.uid ? 'مؤجر لك أنت' : selectedBuilding.tenantName)
                        : 'شاغر ومتاح للإيجار'}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 block">
                    {selectedBuilding.isRented ? 'عقد إيجار نشط' : 'يمكن استئجاره الآن'}
                  </span>
                </div>

                {/* 3. الإيجار اليومي */}
                <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-zinc-500 block font-bold">تكلفة الإيجار اليومي</span>
                  <span className="font-black text-amber-400 font-mono text-sm block">
                    {formatMoney(selectedBuilding.dailyRent)}
                  </span>
                  <span className="text-[10px] text-zinc-500 block">يدفع مقدماً للمالك</span>
                </div>

                {/* 4. سعر الشراء والعائد */}
                <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-zinc-500 block font-bold">سعر الشراء الكلي</span>
                  <span className="font-black text-emerald-400 font-mono text-sm block">
                    {formatMoney(selectedBuilding.purchasePrice)}
                  </span>
                  <span className="text-[10px] text-zinc-500 block">
                    عائد يومي: {formatMoney(selectedBuilding.dailyRevenue)}
                  </span>
                </div>
              </div>

              {/* أزرار الإجراءات الحقيقية للعقار */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/5">
                {/* زر تحصيل أرباح الإيجار للمالك */}
                {selectedBuilding.ownerType === 'player' && selectedBuilding.ownerId === profile?.uid ? (
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="bg-black/50 px-4 py-2 rounded-xl border border-white/5">
                      <span className="text-[10px] text-zinc-400 block">أرباح الإيجار المتراكمة:</span>
                      <span className="text-sm font-black text-emerald-400 font-mono">
                        {formatMoney(selectedBuilding.accumulatedRent || 0)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleCollectRent(selectedBuilding)}
                      disabled={isProcessingAction || (selectedBuilding.accumulatedRent || 0) <= 0}
                      className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg"
                    >
                      <Coins size={16} />
                      تحصيل عوائد الإيجار
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    {/* خيارات مدة الإيجار */}
                    <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-xl border border-white/5 text-xs">
                      <span className="text-[10px] text-zinc-500 ps-2 font-bold">المدة:</span>
                      {[1, 3, 7].map(days => (
                        <button
                          key={days}
                          onClick={() => setRentDurationDays(days)}
                          className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all ${
                            rentDurationDays === days
                              ? 'bg-blue-600 text-white'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {days} أيام
                        </button>
                      ))}
                    </div>

                    {/* زر الاستئجار */}
                    <button
                      onClick={() => handleRentBuilding(selectedBuilding)}
                      disabled={isProcessingAction || (selectedBuilding.isRented && selectedBuilding.tenantId !== profile?.uid)}
                      className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg"
                    >
                      <Key size={16} />
                      استئجار العقار ({formatMoney(selectedBuilding.dailyRent * rentDurationDays)})
                    </button>

                    {/* زر شراء العقار */}
                    <button
                      onClick={() => handleBuyBuilding(selectedBuilding)}
                      disabled={isProcessingAction}
                      className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg"
                    >
                      <Building2 size={16} />
                      شراء العقار بالكامل ({formatMoney(selectedBuilding.purchasePrice)})
                    </button>
                  </div>
                )}

                {/* زر الانتقال لشخصيات الـ NPCs في هذا المبنى */}
                <button
                  onClick={() => {
                    setUndergroundInitialTab('roster');
                    setActiveMainTab('underground');
                  }}
                  className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ms-auto"
                >
                  <Users size={16} className="text-amber-400" />
                  شخصيات الـ NPCs في هذه المنطقة
                  <ChevronRight size={14} className="rtl:rotate-180" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. تبويب عالم خفاء المدينة للـ NPCs بكافة أقسامه وأنظمته */}
      {activeMainTab === 'underground' && (
        <UndergroundWorld initialSubTab={undergroundInitialTab} />
      )}

      {/* 3. تبويب عقاراتي وعوائد الإيجار */}
      {activeMainTab === 'my_properties' && (
        <div className="space-y-6">
          {/* لوحة المحفظة العقارية الشاملة */}
          <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Building2 className="text-purple-400" size={24} />
                محفظتي العقارية وسجل الإيجارات
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                إدارة أملاكك المستأجرة والمملوكة، ومتابعة الأرباح وعوائد الإيجار اليومية القادمة من الـ NPCs والتجار.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-left bg-black/40 px-4 py-2.5 rounded-2xl border border-white/5">
                <span className="text-[10px] text-zinc-400 block font-bold">أرباح متراكمة جاهزة</span>
                <span className="text-base font-black text-emerald-400 font-mono">
                  {formatMoney(totalAccumulatedRent)}
                </span>
              </div>

              <button
                onClick={handleCollectAllRent}
                disabled={isProcessingAction || totalAccumulatedRent <= 0}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-lg"
              >
                <Coins size={16} />
                تحصيل كل العوائد
              </button>
            </div>
          </div>

          {/* العقارات المملوكة */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <CheckCircle className="text-emerald-400" size={16} />
              عقاراتي المملوكة بالكامل ({myOwnedBuildings.length})
            </h3>

            {myOwnedBuildings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myOwnedBuildings.map(b => (
                  <div key={b.id} className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white text-sm">{b.name}</h4>
                        <span className="text-[11px] text-zinc-400">{b.district}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {b.isRented ? 'مؤجر حالياً' : 'شاغر'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-zinc-800">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">عائد الإيجار اليومي</span>
                        <span className="font-bold text-amber-400 font-mono">{formatMoney(b.dailyRent)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">المستأجر</span>
                        <span className="font-bold text-white">{b.tenantName || 'شاغر'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCollectRent(b)}
                      disabled={(b.accumulatedRent || 0) <= 0}
                      className="w-full py-2 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/80 disabled:opacity-40 text-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Coins size={14} />
                      تحصيل عوائد ({formatMoney(b.accumulatedRent || 0)})
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 bg-black/40 border border-zinc-800 rounded-2xl text-center text-zinc-500 text-xs">
                لا تملك أي عقارات حالياً في المدينة. يمكنك تصفح الخريطة وشراء العقارات المتاحة!
              </div>
            )}
          </div>

          {/* العقارات المستأجرة */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Key className="text-blue-400" size={16} />
              عقاراتي المستأجرة بعقد نشط ({myRentedBuildings.length})
            </h3>

            {myRentedBuildings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myRentedBuildings.map(b => (
                  <div key={b.id} className="p-5 bg-zinc-900 border border-blue-900/40 rounded-2xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white text-sm">{b.name}</h4>
                        <span className="text-[11px] text-zinc-400">{b.district}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        مستأجر تحت إدارتك
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-zinc-800">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">العائد اليومي لك</span>
                        <span className="font-bold text-emerald-400 font-mono">{formatMoney(b.dailyRevenue)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">المالك الأصلي</span>
                        <span className="font-bold text-white">{b.ownerName}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 bg-black/40 border border-zinc-800 rounded-2xl text-center text-zinc-500 text-xs">
                لا يوجد لديك أي عقارات مستأجرة حالياً.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. تبويب الرحلات والمدن الدولية */}
      {activeMainTab === 'world_cities' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-6 bg-zinc-950 border border-zinc-800 rounded-3xl">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Plane className="text-amber-400" size={24} />
                الرحلات والتنقل بين العواصم والمدن
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                سافر بين العواصم لتوسيع نفوذك وتهريب البضائع ومقابلة شخصيات وعصابات جديدة.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DEFAULT_CITIES.map((c) => {
              const isCurrent = (profile?.city || 'baghdad') === c.id;

              return (
                <div key={c.id} className={`bg-zinc-900 border ${isCurrent ? 'border-emerald-500/50 ring-1 ring-emerald-500/30' : 'border-zinc-800'} rounded-2xl overflow-hidden relative group`}>
                  <div className="h-44 overflow-hidden relative">
                    <img 
                      src={cityOverrides[c.id] || c.image} 
                      alt={c.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                    
                    <div className="absolute top-3 end-3">
                      {isCurrent && (
                        <span className="px-3 py-1 bg-emerald-500/90 text-black text-xs font-black rounded-full shadow-lg">
                          مدينتك الحالية
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-1.5">
                        <MapPin size={16} className="text-amber-400" />
                        {c.name}
                      </h3>
                      <span className="text-[11px] text-zinc-400">تذكرة الطيران: 5,000 د.ع</span>
                    </div>

                    {!isCurrent && (
                      <button
                        onClick={() => handleTravel(c.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg"
                      >
                        <Plane size={14} />
                        سفر الآن
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* نافذة تكبير الخريطة لأكبر حجم 3/4 مع التقريب والتفاعل الكامل */}
      {isMapExpanded && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4"
          onClick={() => setIsMapExpanded(false)}
        >
          <div 
            className="relative w-full max-w-5xl h-[94vh] max-h-[1100px] bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* شريط التحكم العلوي لنافذة التكبير */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 bg-zinc-900/90 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <MapIcon size={20} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    خريطة المدينة والنفوذ - العرض الأكبر (مقاس 3/4)
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      أكبر حجم 3/4
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 hidden sm:block">
                    انقر على أي مبنى للاستئجار أو الشراء، وتحكم بمستوى التقريب بسهولة
                  </p>
                </div>
              </div>

              {/* أدوات التحكم بالتقريب والإغلاق */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExpandedZoom(prev => Math.min(2.5, prev + 0.25))}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs transition-colors"
                  title="تقريب +"
                >
                  <ZoomIn size={16} />
                </button>
                <span className="text-xs font-mono font-bold text-zinc-300 px-1">
                  {Math.round(expandedZoom * 100)}%
                </span>
                <button
                  onClick={() => setExpandedZoom(prev => Math.max(1, prev - 0.25))}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs transition-colors"
                  title="تصغير -"
                >
                  <ZoomOut size={16} />
                </button>
                <button
                  onClick={() => setExpandedZoom(1)}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs transition-colors"
                  title="إعادة ضبط التقريب"
                >
                  <RotateCcw size={16} />
                </button>

                <button
                  onClick={() => setIsMapExpanded(false)}
                  className="p-2 bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-300 rounded-xl text-xs transition-colors ms-2"
                  title="إغلاق"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* مساحة عرض الخريطة المكبرة بمقاس 3/4 مع إمكانية التمرير والسحب */}
            <div className="flex-1 overflow-auto bg-black flex items-center justify-center p-2 sm:p-4">
              <div 
                className="relative aspect-[3/4] max-h-full max-w-full rounded-2xl overflow-hidden shadow-2xl transition-transform duration-200"
                style={{
                  transform: `scale(${expandedZoom})`,
                  transformOrigin: 'center center',
                  width: expandedZoom > 1 ? `${expandedZoom * 100}%` : 'auto',
                  height: expandedZoom > 1 ? 'auto' : '100%'
                }}
              >
                <img 
                  src={NEW_MAP_IMAGE_URL} 
                  alt="خريطة المدينة 3/4 المكبرة" 
                  className="w-full h-full object-contain select-none"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = LOCAL_MAP_IMAGE_URL;
                  }}
                />

                {/* طبقة تظليل تكتيكية خفيفة */}
                <div className="absolute inset-0 bg-black/15 pointer-events-none" />

                {/* المباني والمربعات التفاعلية في الخريطة المكبرة */}
                {filteredBuildings.map((bld) => {
                  const isSelected = selectedBuilding?.id === bld.id;
                  const isOwnedByMe = bld.ownerType === 'player' && bld.ownerId === profile?.uid;
                  const isRentedByMe = bld.isRented && bld.tenantId === profile?.uid;
                  const isRentedByOthers = bld.isRented && bld.tenantId !== profile?.uid;

                  let colorClasses = 'bg-black/30 border-white/20 text-white hover:bg-white/20';
                  if (isOwnedByMe) {
                    colorClasses = 'bg-emerald-500/35 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]';
                  } else if (isRentedByMe) {
                    colorClasses = 'bg-blue-500/35 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)]';
                  } else if (isRentedByOthers) {
                    colorClasses = 'bg-amber-500/35 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]';
                  } else if (bld.ownerType === 'npc') {
                    colorClasses = 'bg-purple-500/30 border-purple-400/60 hover:bg-purple-500/40';
                  }

                  return (
                    <button
                      key={bld.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBuilding(bld);
                      }}
                      style={{
                        left: `${bld.x}%`,
                        top: `${bld.y}%`,
                        width: `${bld.width}%`,
                        height: `${bld.height}%`
                      }}
                      className={`absolute rounded-xl border-2 transition-all cursor-pointer group flex flex-col items-center justify-center p-1 backdrop-blur-[2px] ${colorClasses} ${
                        isSelected ? 'ring-4 ring-amber-400 scale-105 z-30' : 'hover:scale-105 z-10'
                      }`}
                      title={`${bld.name} - ${bld.ownerName}`}
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 whitespace-nowrap px-2.5 py-1 bg-black/90 border border-white/10 rounded-lg text-[10px] text-white shadow-xl pointer-events-none z-40">
                        <span className="font-bold">{bld.name}</span>
                        <span className="text-zinc-400 ms-1">({bld.ownerName})</span>
                      </div>

                      <Building2 className={`w-4 h-4 md:w-5 md:h-5 drop-shadow-md ${isOwnedByMe ? 'text-emerald-300' : isRentedByMe ? 'text-blue-300' : 'text-white'}`} />
                      <span className="text-[9px] md:text-[10px] font-black truncate max-w-full drop-shadow-md text-white mt-0.5">
                        {bld.name.split(' ')[0]}
                      </span>

                      {isOwnedByMe && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border border-black shadow" />
                      )}
                      {isRentedByMe && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-black shadow" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
