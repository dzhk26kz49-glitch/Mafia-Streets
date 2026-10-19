import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatMoney } from '../lib/utils';
import { useAuthStore } from '../store/useAuthStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { toast } from 'sonner';
import { getActiveRolePerks } from '../lib/rolePerks';
import { 
  Globe, Package, ArrowRight, ArrowLeft, ShieldCheck, Lock, 
  TrendingUp, TrendingDown, AlertCircle, Clock, Radio, ArrowRightLeft,
  Coins, Skull, Crosshair, Landmark, Zap, Shield, Sparkles, UserCheck, DollarSign,
  Gavel, ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundEngine } from '../services/soundEngine';
import { BlackMarketService } from '../services/blackMarketService';
import { CommodityItem } from '../types/blackMarketTypes';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

export interface SmugglingGood {
  id: string; // e.g. 'pure_cocaine'
  type: string; // inventory category key: 'drugs' | 'weapons' | 'gold' | 'electronics' | 'antiques'
  name: string;
  nameEn: string;
  unit: string;
  commodityId: string; // maps to CommodityItem.id
  countryStock: number; // supply quota available at port
}

export interface SmugglingCountry {
  id: string;
  name: string;
  nameEn: string;
  flag: string;
  agentName: string;
  agentRole: string;
  agentAvatar: string;
  profitMarginPercent: number; // e.g. 35%, 45%, 30%, 55%, 40%
  riskLevel: 'منخفض' | 'متوسط' | 'مرتفع' | 'شديد الخطورة';
  riskColor: string;
  description: string;
  goods: SmugglingGood[];
}

export const SMUGGLING_COUNTRIES: SmugglingCountry[] = [
  {
    id: 'colombia',
    name: 'كولومبيا (موانئ كارتاخينا وبوغوتا)',
    nameEn: 'Colombia Cartagena Ports',
    flag: '🇨🇴',
    agentName: 'دون دييغو سانتوس',
    agentRole: 'وسيط كارتل ميديلين البحري',
    agentAvatar: '/images/npcs/male_godfather.jpg',
    profitMarginPercent: 35,
    riskLevel: 'متوسط',
    riskColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    description: 'المصدر الأكبر لأجود أنواع الممنوعات الخام، صفقات سريعة وسلاسل إمداد بحرية مباشرة.',
    goods: [
      {
        id: 'pure_cocaine',
        type: 'drugs',
        name: 'شحنات الكوكايين الكولومبي النقي (98%)',
        nameEn: 'Pure Colombian Cocaine',
        unit: 'كيلوغرام خام',
        commodityId: 'pure_cocaine',
        countryStock: 120
      }
    ]
  },
  {
    id: 'russia',
    name: 'روسيا (مستودعات فلاديفوستوك وسانت بطرسبرغ)',
    nameEn: 'Russia Military Docks',
    flag: '🇷🇺',
    agentName: 'الجنرال فيكتور فولكوف',
    agentRole: 'مسؤول لوجستيات المافيا الحمراء',
    agentAvatar: '/images/npcs/male_veteran.jpg',
    profitMarginPercent: 45,
    riskLevel: 'مرتفع',
    riskColor: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    description: 'ترسانة تسليح أوروبية متطورة، بنادق قنص وأسلحة ثقيلة تدر أرباحاً هائلة لكبار الزعماء.',
    goods: [
      {
        id: 'heavy_weapons',
        type: 'weapons',
        name: 'شحنات أسلحة هجومية وقناصات ثقيلة',
        nameEn: 'Heavy Weapons Arsenal',
        unit: 'صندوق تكتيكي مع ذخيرة',
        commodityId: 'heavy_weapons',
        countryStock: 65
      }
    ]
  },
  {
    id: 'uae',
    name: 'الإمارات (موانئ جبل علي ومكاتب دبي الحرة)',
    nameEn: 'UAE Free Zone & Bullion Hub',
    flag: '🇦🇪',
    agentName: 'الشيخ راشد الخالدي',
    agentRole: 'خبير السبائك والمعالجات التكتيكية',
    agentAvatar: '/images/npcs/male_wealthy.jpg',
    profitMarginPercent: 30,
    riskLevel: 'منخفض',
    riskColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    description: 'ملاذ آمن لتسييل الأموال واستيراد السبائك السويسرية المعتمدة ورقاقات التشفير العسكري.',
    goods: [
      {
        id: 'smuggled_gold',
        type: 'gold',
        name: 'سبائك الذهب السويسري المهرب (24k)',
        nameEn: 'Swiss Smuggled Gold',
        unit: 'أونصة 24k',
        commodityId: 'smuggled_gold',
        countryStock: 160
      },
      {
        id: 'military_chips',
        type: 'electronics',
        name: 'رقاقات تشفير إلكترونية وأجهزة تجسس',
        nameEn: 'Military Microchips',
        unit: 'وحدة معالجة وتشفير',
        commodityId: 'military_chips',
        countryStock: 110
      }
    ]
  },
  {
    id: 'egypt',
    name: 'مصر (أنفاق بورسعيد وسوق الآثار التاريخي)',
    nameEn: 'Egypt Port Said Antiquities',
    flag: '🇪🇬',
    agentName: 'الحاج مصطفى السويفي',
    agentRole: 'عميد شبكة تجار التحف والمخطوطات',
    agentAvatar: '/images/npcs/male_wealthy.jpg',
    profitMarginPercent: 55,
    riskLevel: 'شديد الخطورة',
    riskColor: 'text-red-400 bg-red-500/10 border-red-500/30',
    description: 'أعلى هامش ربحي في عالم التهريب (+55%)، مقتنيات بابلية ومخطوطات تاريخية يبحث عنها الأثرياء.',
    goods: [
      {
        id: 'babylon_antiques',
        type: 'antiques',
        name: 'قطع أثرية ومخطوطات تاريخية نادرة',
        nameEn: 'Ancient Babylon Artifacts',
        unit: 'قطعة موثقة',
        commodityId: 'babylon_antiques',
        countryStock: 35
      }
    ]
  },
  {
    id: 'lebanon',
    name: 'لبنان (مرفأ بيروت وممرات البقاع الحرة)',
    nameEn: 'Lebanon Beirut Smuggling Corridor',
    flag: '🇱🇧',
    agentName: 'كابتن طوني صقر',
    agentRole: 'منسق الشحن والجمارك المتوسطية',
    agentAvatar: '/images/npcs/male_godfather.jpg',
    profitMarginPercent: 40,
    riskLevel: 'متوسط',
    riskColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    description: 'محطة العبور الاستراتيجية لتبادل الأسلحة الغربية وشحنات المخدرات السريعة في حوض المتوسط.',
    goods: [
      {
        id: 'pure_cocaine',
        type: 'drugs',
        name: 'شحنات مخدرات بحرية سريعة',
        nameEn: 'Fast Transit Narcotics',
        unit: 'كيلوغرام خام',
        commodityId: 'pure_cocaine',
        countryStock: 80
      },
      {
        id: 'heavy_weapons',
        type: 'weapons',
        name: 'بنادق وذخائر تكتيكية غربية',
        nameEn: 'Tactical Western Firearms',
        unit: 'صندوق تكتيكي',
        commodityId: 'heavy_weapons',
        countryStock: 50
      }
    ]
  }
];

const COOLDOWN_MS = 10000;

export default function Trade() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const perks = getActiveRolePerks(profile);

  const [timeLeft, setTimeLeft] = useState(0);
  const [buyQuantities, setBuyQuantities] = useState<Record<string, number>>({});
  const [commodities, setCommodities] = useState<CommodityItem[]>(() => BlackMarketService.getDynamicCommodityPrices());
  const [selectedFilter, setSelectedFilter] = useState<'all' | string>('all');
  const [isProcessingTrade, setIsProcessingTrade] = useState(false);

  // Update dynamic commodity prices periodically to sync with Black Market
  useEffect(() => {
    const interval = setInterval(() => {
      setCommodities(BlackMarketService.getDynamicCommodityPrices());
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  // Map commodity by ID for instant spot price lookup
  const commodityMap = useMemo(() => {
    const map = new Map<string, CommodityItem>();
    commodities.forEach(c => map.set(c.id, c));
    return map;
  }, [commodities]);

  // Cooldown countdown
  useEffect(() => {
    if (!profile?.lastTradeTime) return;

    const effectiveCooldown = perks.smugglerTravelReductionPercent > 0 
      ? Math.max(2000, Math.floor(COOLDOWN_MS * (1 - (perks.smugglerTravelReductionPercent / 100))))
      : COOLDOWN_MS;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = now - profile.lastTradeTime!;
      if (diff < effectiveCooldown) {
        setTimeLeft(Math.ceil((effectiveCooldown - diff) / 1000));
      } else {
        setTimeLeft(0);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [profile?.lastTradeTime, perks.smugglerTravelReductionPercent]);

  // Appoint country agent
  const handleAppointAgent = async (country: SmugglingCountry) => {
    if (!profile) return;
    const cost = 50000;
    if ((profile.cleanMoney || 0) < cost) {
      toast.error('تحتاج إلى 50,000 كاش نظيف لتعيين الوكيل المعتمد!');
      return;
    }

    try {
      const newAgents = [...(profile.agents || []), country.id];
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: (profile.cleanMoney || 0) - cost,
        agents: newAgents
      });
      soundEngine.playBlackMarketDealSound();
      toast.success(`تم اعتماد الوكيل "${country.agentName}" بنجاح في ${country.name}! أرباح البيع الآن +${country.profitMarginPercent}% 🤝`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error('فشل في تعيين الوكيل');
    }
  };

  // Helper to read player stock for an item category
  const getPlayerStock = (type: string): number => {
    const inventory = profile?.inventory;
    if (!inventory) return 0;
    const isObjectCategory = ['drugs', 'weapons', 'armor', 'tools'].includes(type);
    if (isObjectCategory) {
      return (inventory as any)[type]?.['all'] || 0;
    }
    const stock = (inventory as any)[type];
    return typeof stock === 'object' ? (stock?.all || 0) : (stock || 0);
  };

  // Helper to get spot price from dynamic Black Market
  const getGoodSpotPrice = (good: SmugglingGood): number => {
    const commodity = commodityMap.get(good.commodityId);
    return commodity ? commodity.currentPrice : 25000;
  };

  // Helper to calculate agent sell price per unit
  const calculateAgentSellPrice = (good: SmugglingGood, country: SmugglingCountry): number => {
    const spot = getGoodSpotPrice(good);
    const hasAgent = profile?.agents?.includes(country.id);
    
    // If agent appointed: country margin + smuggler role bonus
    // If no agent: baseline standard 10% margin
    const baseMargin = hasAgent ? (country.profitMarginPercent / 100) : 0.10;
    const smugglerBonus = (perks.smugglerTradeProfitBonusPercent || 0) / 100;
    const totalMultiplier = 1 + baseMargin + smugglerBonus;

    return Math.floor(spot * totalMultiplier);
  };

  // Handle Trade (Buy or Sell)
  const handleExecuteTrade = async (
    good: SmugglingGood, 
    country: SmugglingCountry, 
    action: 'buy' | 'sell' | 'sellAll',
    quantity: number = 1
  ) => {
    if (!profile || isProcessingTrade) return;

    const perks = getActiveRolePerks(profile);
    const effectiveCooldown = perks.smugglerTravelReductionPercent > 0 
      ? Math.max(2000, Math.floor(COOLDOWN_MS * (1 - (perks.smugglerTravelReductionPercent / 100))))
      : COOLDOWN_MS;

    if (profile.lastTradeTime && Date.now() - profile.lastTradeTime < effectiveCooldown) {
      const remaining = Math.ceil((effectiveCooldown - (Date.now() - profile.lastTradeTime)) / 1000);
      toast.error(`انتظر ${remaining} ثانية لتفريغ وتجهيز سفن الشحن!`);
      return;
    }

    const currentStock = getPlayerStock(good.type);
    const isObjectCategory = ['drugs', 'weapons', 'armor', 'tools'].includes(good.type);
    const updatePath = isObjectCategory ? `inventory.${good.type}.all` : `inventory.${good.type}`;
    const spotPrice = getGoodSpotPrice(good);
    const sellPricePerUnit = calculateAgentSellPrice(good, country);

    setIsProcessingTrade(true);

    try {
      if (action === 'buy') {
        const qtyToBuy = Math.max(1, quantity);
        const totalCost = spotPrice * qtyToBuy;

        if ((profile.dirtyMoney || 0) < totalCost) {
          toast.error(`ليس لديك كاش قذر كافٍ لإتمام الصفقة! تحتاج إلى ${formatMoney(totalCost)} كاش قذر.`);
          return;
        }

        await updateDoc(doc(db, 'users', profile.uid), {
          dirtyMoney: (profile.dirtyMoney || 0) - totalCost,
          [updatePath]: currentStock + qtyToBuy,
          lastTradeTime: Date.now()
        });

        soundEngine.playBlackMarketDealSound();
        toast.success(`تم استيراد ${qtyToBuy} ${good.unit} من ${country.name} بمبلغ ${formatMoney(totalCost)} كاش قذر! 📦`);
      } else {
        // Sell action
        const qtyToSell = action === 'sellAll' ? currentStock : Math.min(currentStock, quantity);

        if (qtyToSell <= 0) {
          toast.error(`ليس لديك أي مخزون من ${good.name} لتصريفه!`);
          return;
        }

        const totalEarned = sellPricePerUnit * qtyToSell;
        const profitMargin = country.profitMarginPercent + (perks.smugglerTradeProfitBonusPercent || 0);

        await updateDoc(doc(db, 'users', profile.uid), {
          dirtyMoney: (profile.dirtyMoney || 0) + totalEarned,
          [updatePath]: currentStock - qtyToSell,
          lastTradeTime: Date.now()
        });

        soundEngine.playBlackMarketDealSound();
        const agentNote = profile?.agents?.includes(country.id)
          ? ` بواسطة الوكيل ${country.agentName} (+${profitMargin}% أرباح صافية)`
          : ' (بدون وكيل معتمد)';

        toast.success(`تم تصريف ${qtyToSell} ${good.unit} في ${country.name} واستلام ${formatMoney(totalEarned)} كاش قذر${agentNote}! 💰`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error('تعثرت عملية الشحن والتخليص');
    } finally {
      setIsProcessingTrade(false);
    }
  };

  // Bulk liquidation of all country goods via agent
  const handleBulkSellCountryGoods = async (country: SmugglingCountry) => {
    if (!profile || isProcessingTrade) return;

    let totalSold = 0;
    let totalRevenue = 0;
    const inventoryUpdates: any = {};

    country.goods.forEach((good) => {
      const stock = getPlayerStock(good.type);
      if (stock > 0) {
        const unitSell = calculateAgentSellPrice(good, country);
        totalRevenue += unitSell * stock;
        totalSold += stock;
        const isObjectCategory = ['drugs', 'weapons', 'armor', 'tools'].includes(good.type);
        const path = isObjectCategory ? `inventory.${good.type}.all` : `inventory.${good.type}`;
        inventoryUpdates[path] = 0;
      }
    });

    if (totalSold <= 0) {
      toast.info(`لا يتوفر لديك أي بضائع تابعة لموانئ ${country.name} لتصريفها حالياً.`);
      return;
    }

    setIsProcessingTrade(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        dirtyMoney: (profile.dirtyMoney || 0) + totalRevenue,
        ...inventoryUpdates,
        lastTradeTime: Date.now()
      });

      soundEngine.playCashSound();
      toast.success(`قام الوكيل "${country.agentName}" بتصفية كامل شحنات ${country.name} (${totalSold} شحنة) وتوريد ${formatMoney(totalRevenue)} كاش لخزنتك! 🏛️`);
    } catch (e) {
      toast.error('فشل في تصريف شحنات الوكيل');
    } finally {
      setIsProcessingTrade(false);
    }
  };

  const filteredCountries = useMemo(() => {
    if (selectedFilter === 'all') return SMUGGLING_COUNTRIES;
    return SMUGGLING_COUNTRIES.filter(c => c.id === selectedFilter);
  }, [selectedFilter]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 text-right" dir="rtl">
      
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-black border border-indigo-500/30 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-600/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold">
              <Globe size={14} />
              <span>شبكة التهريب الدولي وتجارة الموانئ الحرة</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              التهريب الدولي وبورصة الممنوعات 🚢
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
              اربط عملياتك مباشرة مع مؤشر أسعار السوق السوداء اللحظي، عيّن وكلاء سريين في 5 دول كبرى، وحقق أعلى هوامش أرباح تتفاوت من كولومبيا وحتى سوق الآثار التاريخي في مصر.
            </p>
          </div>

          {/* Quick Hub Balances & Cooldown */}
          <div className="flex flex-wrap items-center gap-3 bg-black/60 border border-white/10 rounded-2xl p-4 shadow-xl shrink-0 backdrop-blur-xl">
            <AnimatePresence>
              {timeLeft > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-indigo-600/20 px-4 py-2 rounded-xl border border-indigo-500/30 flex items-center gap-2 text-indigo-300"
                >
                  <Clock size={16} className="animate-spin text-indigo-400" />
                  <span className="text-xs font-black font-mono">{timeLeft}s شحن</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="text-left px-2">
              <div className="text-[10px] font-bold text-zinc-400">الكاش القذر للتجارة</div>
              <div className="text-lg font-black text-red-400 font-mono">
                {formatMoney(profile?.dirtyMoney || 0)}
              </div>
            </div>

            <Link
              to="/black-market"
              className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
            >
              <Gavel size={14} />
              <span>مؤشر السوق السوداء</span>
            </Link>
          </div>
        </div>

        {/* Live Contraband Exchange Ticker Ribbon */}
        <div className="mt-6 pt-5 border-t border-white/10 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-3 min-w-max">
            <span className="text-xs font-black text-zinc-400 flex items-center gap-1.5 shrink-0 bg-zinc-900 px-3 py-1.5 rounded-xl border border-white/10">
              <Radio size={14} className="text-red-500 animate-pulse" />
              مؤشر أسعار الممنوعات اللحظي (مرتبط بالبورصة):
            </span>
            {commodities.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold shrink-0 hover:border-indigo-500/40 transition-colors"
              >
                <span className="text-zinc-300">{item.name.split(' ')[0]} {item.name.split(' ')[1]}:</span>
                <span className="text-white font-mono">{formatMoney(item.currentPrice)}</span>
                <span className={clsx(
                  "flex items-center text-[10px] font-bold",
                  item.trend === 'up' ? "text-emerald-400" : item.trend === 'down' ? "text-red-400" : "text-zinc-400"
                )}>
                  {item.trend === 'up' ? <TrendingUp size={12} className="ml-0.5" /> : <TrendingDown size={12} className="ml-0.5" />}
                  {item.changePercent > 0 ? `+${item.changePercent}%` : `${item.changePercent}%`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Country Filters Switcher */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedFilter('all')}
            className={clsx(
              "px-5 py-2.5 rounded-2xl font-black text-xs transition-all cursor-pointer whitespace-nowrap",
              selectedFilter === 'all'
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-zinc-900/60 text-zinc-400 hover:text-white border border-white/5"
            )}
          >
            كافة موانئ العالم ({SMUGGLING_COUNTRIES.length})
          </button>
          {SMUGGLING_COUNTRIES.map((c) => {
            const hasAgent = profile?.agents?.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => setSelectedFilter(c.id)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs transition-all cursor-pointer whitespace-nowrap border",
                  selectedFilter === c.id
                    ? "bg-indigo-600 text-white border-indigo-400 shadow-md"
                    : "bg-zinc-900/60 text-zinc-400 hover:text-white border-white/5"
                )}
              >
                <span>{c.flag}</span>
                <span>{c.name.split(' ')[0]}</span>
                {hasAgent && <span className="w-2 h-2 rounded-full bg-emerald-400 ml-1" title="وكيل معتمد" />}
              </button>
            );
          })}
        </div>

        {/* Smuggler perk status badge */}
        {perks.smugglerTradeProfitBonusPercent > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold">
            <Sparkles size={14} className="text-purple-400" />
            <span>بونص اختصاص المهرب مفعل: +{perks.smugglerTradeProfitBonusPercent}% ربح إضافي لكافة الموانئ!</span>
          </div>
        )}
      </div>

      {/* Countries and Smuggling Goods Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {filteredCountries.map((country, idx) => {
          const hasAgent = profile?.agents?.includes(country.id);
          const totalProfitMargin = country.profitMarginPercent + (perks.smugglerTradeProfitBonusPercent || 0);

          return (
            <motion.div 
              key={country.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className={clsx(
                "rounded-3xl border bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-black p-6 sm:p-7 shadow-2xl flex flex-col justify-between transition-all",
                hasAgent ? "border-indigo-500/30 hover:border-indigo-500/60" : "border-white/10 opacity-90"
              )}
            >
              <div className="space-y-6">
                {/* Country Header Info */}
                <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl sm:text-5xl drop-shadow-md select-none">{country.flag}</span>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-white">{country.name}</h2>
                      <p className="text-xs text-zinc-400 mt-0.5">{country.description}</p>
                    </div>
                  </div>

                  {/* Agent Profit Margin Badge */}
                  <div className="text-left shrink-0">
                    <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">هامش ربح الوكيل</span>
                    <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
                      +{totalProfitMargin}%
                    </span>
                  </div>
                </div>

                {/* Secret Agent Panel */}
                <div className={clsx(
                  "p-4 rounded-2xl border flex items-center justify-between gap-4",
                  hasAgent 
                    ? "bg-emerald-950/20 border-emerald-500/30" 
                    : "bg-black/50 border-white/10"
                )}>
                  <div className="flex items-center gap-3">
                    <img 
                      src={country.agentAvatar} 
                      alt={country.agentName} 
                      className="w-12 h-12 rounded-xl object-cover border border-white/20 shadow-md"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-white">{country.agentName}</h4>
                        <span className={clsx(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                          hasAgent ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-zinc-800 text-zinc-400 border-zinc-700"
                        )}>
                          {hasAgent ? 'وكيل معتمد ومفعل ✓' : 'غير معين'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">{country.agentRole}</p>
                    </div>
                  </div>

                  {!hasAgent ? (
                    <button
                      onClick={() => handleAppointAgent(country)}
                      className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <UserCheck size={14} />
                      <span>اعتماد الوكيل (50k كاش)</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={clsx("px-2.5 py-1 rounded-lg text-[10px] font-bold border", country.riskColor)}>
                        مستوى الخطورة: {country.riskLevel}
                      </span>
                    </div>
                  )}
                </div>

                {/* Country Smuggling Goods List */}
                <div className="space-y-4">
                  {country.goods.map((good) => {
                    const spotBuyPrice = getGoodSpotPrice(good);
                    const agentSellPrice = calculateAgentSellPrice(good, country);
                    const playerStock = getPlayerStock(good.type);
                    const qty = buyQuantities[`${country.id}-${good.id}`] || 1;
                    const commodity = commodityMap.get(good.commodityId);

                    return (
                      <div 
                        key={good.id} 
                        className="p-5 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors space-y-4"
                      >
                        {/* Good Header & Live Prices */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-indigo-400 shrink-0">
                              <Package size={20} />
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-white">{good.name}</h3>
                              <div className="flex items-center gap-3 mt-0.5 text-xs">
                                <span className="text-zinc-400">
                                  مخزون الميناء: <strong className="text-white font-mono">{good.countryStock} {good.unit}</strong>
                                </span>
                                <span className="w-1 h-1 rounded-full bg-zinc-600" />
                                <span className="text-indigo-400 font-bold">
                                  مخزونك في الحقيبة: <strong className="font-mono text-white text-sm">{playerStock}</strong>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Prices Preview */}
                          <div className="flex items-center gap-4 bg-zinc-900/60 px-3 py-2 rounded-xl border border-white/5 self-end sm:self-auto">
                            <div className="text-right">
                              <span className="text-[10px] text-zinc-400 block font-bold">سعر الشراء الفوري</span>
                              <span className="text-sm font-black text-amber-400 font-mono">
                                {formatMoney(spotBuyPrice)}
                              </span>
                            </div>
                            <div className="w-px h-6 bg-zinc-800" />
                            <div className="text-left">
                              <span className="text-[10px] text-emerald-400 block font-bold">سعر البيع بالوكيل</span>
                              <span className="text-sm font-black text-emerald-400 font-mono">
                                {formatMoney(agentSellPrice)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Trade Actions Controls */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-white/5">
                          {/* Quantity Selector */}
                          <div className="flex items-center gap-1.5 bg-zinc-900 border border-white/10 rounded-xl px-2.5 py-1 w-full sm:w-auto justify-between sm:justify-start">
                            <span className="text-[10px] font-bold text-zinc-400">الكمية:</span>
                            <div className="flex items-center gap-1">
                              {[1, 5, 10].map(val => (
                                <button
                                  key={val}
                                  onClick={() => setBuyQuantities(prev => ({ ...prev, [`${country.id}-${good.id}`]: val }))}
                                  className={clsx(
                                    "px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer",
                                    qty === val ? "bg-indigo-600 text-white" : "bg-black/40 text-zinc-400 hover:text-white"
                                  )}
                                >
                                  {val}
                                </button>
                              ))}
                              <input 
                                type="number" 
                                min="1" 
                                max="100"
                                value={qty}
                                onChange={(e) => {
                                  const v = Math.min(100, Math.max(1, parseInt(e.target.value) || 1));
                                  setBuyQuantities(prev => ({ ...prev, [`${country.id}-${good.id}`]: v }));
                                }}
                                className="w-10 bg-black/60 rounded text-center text-xs font-mono font-bold text-white border border-white/10 outline-none"
                              />
                            </div>
                          </div>

                          {/* Buy & Sell Buttons */}
                          <div className="grid grid-cols-2 gap-2 w-full flex-1">
                            <button
                              disabled={timeLeft > 0 || isProcessingTrade}
                              onClick={() => handleExecuteTrade(good, country, 'buy', qty)}
                              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <ArrowLeft size={14} />
                              <span>شراء شحنة ({formatMoney(spotBuyPrice * qty)})</span>
                            </button>

                            <button
                              disabled={timeLeft > 0 || playerStock <= 0 || isProcessingTrade}
                              onClick={() => handleExecuteTrade(good, country, 'sell', qty)}
                              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <ArrowRight size={14} />
                              <span>بيع عبر الوكيل ({formatMoney(agentSellPrice * Math.min(playerStock, qty))})</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Country Bulk Action Footer */}
              {hasAgent && (
                <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                  <div className="text-xs text-zinc-400">
                    <span>تصفية كامل مخزون موانئ {country.name.split(' ')[0]} مع الوكيل {country.agentName.split(' ')[0]}</span>
                  </div>
                  <button
                    disabled={timeLeft > 0 || isProcessingTrade}
                    onClick={() => handleBulkSellCountryGoods(country)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-emerald-500/30 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <DollarSign size={14} />
                    <span>تصفية شاملة للبضائع دفعة واحدة 💰</span>
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Strategic Intelligence Footer */}
      <div className="bg-gradient-to-r from-indigo-950/40 via-zinc-900 to-black border border-indigo-500/20 p-6 rounded-3xl flex items-start gap-4">
        <AlertCircle className="text-indigo-400 shrink-0 mt-1" size={22} />
        <div className="space-y-1.5 text-xs text-zinc-300 leading-relaxed">
          <h4 className="font-bold text-white text-sm">نظام التهريب وسلاسل التوريد الدولية:</h4>
          <p>
            1. يتم تحديث مؤشر أسعار الممنوعات اللحظي كل 25 ثانية استناداً إلى حركة الطلب والعرض في بورصة السوق السوداء.
          </p>
          <p>
            2. تعيين الوكيل السري في أي دولة يمنحك التخليص الفوري وهامش ربح استثنائي يتراوح من <strong>+30% في الإمارات</strong> وحتى <strong>+55% في مصر</strong> لمبيعات الآثار والمخطوطات النادرة.
          </p>
          <p>
            3. تفعيل رتبة المهرب يمنحك بونصاً إضافياً يتضاعف مع هوامش أرباح الدول لتصل إلى أرباح قياسية عند تصريف الصفقات الكبرى.
          </p>
        </div>
      </div>

    </div>
  );
}
