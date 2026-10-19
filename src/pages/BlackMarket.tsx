import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { 
  CommodityItem, 
  LiveAuctionItem, 
  FlashDeal, 
  AuctionRarity 
} from '../types/blackMarketTypes';
import { 
  BlackMarketService, 
  INITIAL_AUCTIONS, 
  INITIAL_FLASH_DEALS, 
  MARKET_NEWS 
} from '../services/blackMarketService';
import { getActiveRolePerks } from '../lib/rolePerks';
import { formatMoney, formatNumber } from '../lib/utils';
import { 
  Flame, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Coins, 
  Shield, 
  Crosshair, 
  Sparkles, 
  Award, 
  Zap, 
  ArrowRightLeft, 
  DollarSign, 
  Gavel, 
  Radio, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  ShoppingBag, 
  History, 
  Send, 
  Crown,
  Eye,
  Plus,
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { soundEngine } from '../services/soundEngine';

const RARITY_THEMES: Record<AuctionRarity, { border: string; bg: string; text: string; badge: string; shadow: string }> = {
  mythic: {
    border: 'border-red-500/60 hover:border-red-500',
    bg: 'from-red-950/40 via-zinc-900 to-black',
    text: 'text-red-400',
    badge: 'أسطوري فائق (Mythic)',
    shadow: 'shadow-red-600/20'
  },
  legendary: {
    border: 'border-amber-500/60 hover:border-amber-500',
    bg: 'from-amber-950/40 via-zinc-900 to-black',
    text: 'text-amber-400',
    badge: 'استثنائي نادر (Legendary)',
    shadow: 'shadow-amber-500/20'
  },
  epic: {
    border: 'border-purple-500/60 hover:border-purple-500',
    bg: 'from-purple-950/40 via-zinc-900 to-black',
    text: 'text-purple-400',
    badge: 'ملحمي ممتاز (Epic)',
    shadow: 'shadow-purple-500/20'
  },
  rare: {
    border: 'border-blue-500/60 hover:border-blue-500',
    bg: 'from-blue-950/40 via-zinc-900 to-black',
    text: 'text-blue-400',
    badge: 'نادر (Rare)',
    shadow: 'shadow-blue-500/20'
  }
};

export default function BlackMarket() {
  const { profile } = useAuthStore();
  const perks = getActiveRolePerks(profile);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'auctions' | 'commodities' | 'flash' | 'secret_storage'>('auctions');
  const [selectedRarity, setSelectedRarity] = useState<string>('all');
  const [commodities, setCommodities] = useState<CommodityItem[]>(() => BlackMarketService.getDynamicCommodityPrices());
  const [auctions, setAuctions] = useState<LiveAuctionItem[]>(INITIAL_AUCTIONS);
  const [flashDeals] = useState<FlashDeal[]>(INITIAL_FLASH_DEALS);
  const [biddingAuctionId, setBiddingAuctionId] = useState<string | null>(null);
  const [customBidAmount, setCustomBidAmount] = useState<string>('');
  const [selectedAuctionDetails, setSelectedAuctionDetails] = useState<LiveAuctionItem | null>(null);
  const [isSubmittingBid, setIsSubmittingBid] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // Update timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update dynamic commodity prices every 30 seconds
  useEffect(() => {
    const commodityInterval = setInterval(() => {
      setCommodities(BlackMarketService.getDynamicCommodityPrices());
    }, 30000);
    return () => clearInterval(commodityInterval);
  }, []);

  // Sync real-time Firestore auctions
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'auctions'), (snapshot) => {
      if (!snapshot.empty) {
        const liveItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LiveAuctionItem));
        // Merge with initial auctions to preserve rich catalog
        const map = new Map<string, LiveAuctionItem>();
        INITIAL_AUCTIONS.forEach(a => map.set(a.id, a));
        liveItems.forEach(a => map.set(a.id, { ...map.get(a.id), ...a }));
        setAuctions(Array.from(map.values()));
      }
    });
    return () => unsub();
  }, []);

  // Format time remaining
  const formatCountdown = (endsAt: number) => {
    const remaining = Math.max(0, endsAt - currentTime);
    if (remaining <= 0) return 'انتهى المزاد';
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Filtered auctions
  const filteredAuctions = useMemo(() => {
    if (selectedRarity === 'all') return auctions;
    return auctions.filter(a => a.rarity === selectedRarity);
  }, [auctions, selectedRarity]);

  // Handle Place Bid
  const handlePlaceBid = async (auction: LiveAuctionItem, amount: number) => {
    if (!profile) return;
    setIsSubmittingBid(true);
    try {
      const success = await BlackMarketService.placeBid(auction, amount, profile);
      if (success) {
        soundEngine.playBlackMarketDealSound();
        setBiddingAuctionId(null);
        setCustomBidAmount('');
      }
    } finally {
      setIsSubmittingBid(false);
    }
  };

  // Handle Claim Winnings
  const handleClaim = async (auction: LiveAuctionItem) => {
    if (!profile) return;
    const ok = await BlackMarketService.claimAuctionReward(auction, profile);
    if (ok) {
      soundEngine.playBlackMarketDealSound();
    }
  };

  // Handle Buy Flash Deal
  const handleBuyDeal = async (deal: FlashDeal) => {
    if (!profile) return;
    const ok = await BlackMarketService.buyFlashDeal(deal, profile);
    if (ok) {
      soundEngine.playBlackMarketDealSound();
    }
  };

  // Handle Using Secret Storage Items
  const handleUseItem = async (itemId: string, category: string) => {
    if (!profile) return;
    try {
      const userRef = doc(db, 'users', profile.uid);
      const updates: any = {};

      if (category === 'tools' || category === 'weapons') {
        const currentCount = (profile.inventory as any)?.[category]?.[itemId] || 0;
        if (currentCount <= 1) {
          updates[`inventory.${category}.${itemId}`] = 0;
        } else {
          updates[`inventory.${category}.${itemId}`] = increment(-1);
        }
      }

      if (itemId === 'auc_radar_jammer' || itemId.includes('jammer')) {
        updates.cleanMoney = increment(250000);
        updates.reputation = increment(150);
        toast.success('تم تشغيل جهاز التشويش العسكري بنجاح! جنيت 250,000 كاش نظيف و +150 هيبة 📡');
      } else if (itemId === 'ap_ammo_crate' || itemId.includes('ammo')) {
        updates.cleanMoney = increment(150000);
        updates.reputation = increment(100);
        toast.success('تم توزيع الذخائر الخارقة! جنيت 150,000 كاش و +100 هيبة ⚔️');
      } else if (itemId === 'bank_master_exploit' || itemId.includes('exploit')) {
        updates.cleanMoney = increment(500000);
        updates.reputation = increment(200);
        toast.success('تم تفعيل ثغرة البنك المركزي وسحب أرباح 500,000 كاش نظيف! 💻');
      } else {
        updates.cleanMoney = increment(100000);
        updates.reputation = increment(50);
        toast.success('تم استخدام العنصر بنجاح وجني أرباح 100,000 كاش! 💼');
      }

      await updateDoc(userRef, updates);
      soundEngine.playBlackMarketDealSound();
    } catch (e) {
      toast.error('فشل في استخدام العنصر');
    }
  };

  return (
    <div className="space-y-8 pb-20 text-right max-w-7xl mx-auto" dir="rtl">
      
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-black border border-amber-500/30 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-red-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
              <Crown size={14} />
              <span>السوق السوداء المركزية ومزادات الظل الدولية</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              بورصة الممنوعات والمزادات السرية 🏛️
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
              الساحة السرية الكبرى لتداول السبائك المشفرة، اقتناء أندر الأسلحة والسيارات الرئاسية المصفحة، ومتابعة أسعار السلع المهربة في شوارع بغداد وعالم الخفاء في الوقت الحقيقي.
            </p>
          </div>

          {/* Quick Balance Hub */}
          <div className="flex items-center gap-3 bg-black/60 border border-white/10 rounded-2xl p-4 shadow-xl shrink-0 backdrop-blur-xl">
            <div className="text-left">
              <div className="text-[10px] font-bold text-zinc-400">رصيدك الكلي المتاح للمزايدة</div>
              <div className="text-lg font-black text-amber-400">
                {formatMoney((profile?.cleanMoney || 0) + (profile?.dirtyMoney || 0))}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Gavel size={20} />
            </div>
          </div>
        </div>

        {/* Live Commodities Ticker Ribbon */}
        <div className="mt-6 pt-5 border-t border-white/10 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-4 min-w-max">
            <span className="text-xs font-black text-zinc-400 flex items-center gap-1.5 shrink-0">
              <Radio size={14} className="text-red-500 animate-pulse" />
              مؤشر الأسعار اللحظي:
            </span>
            {commodities.map((c) => (
              <div 
                key={c.id} 
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold shrink-0"
              >
                <span className="text-zinc-300">{c.name.split(' ')[0]} {c.name.split(' ')[1]}:</span>
                <span className="text-white font-mono">{formatMoney(c.currentPrice)}</span>
                <span className={clsx(
                  "flex items-center text-[10px] font-bold",
                  c.trend === 'up' ? "text-emerald-400" : c.trend === 'down' ? "text-red-400" : "text-zinc-400"
                )}>
                  {c.trend === 'up' ? <TrendingUp size={12} className="ml-0.5" /> : <TrendingDown size={12} className="ml-0.5" />}
                  {c.changePercent > 0 ? `+${c.changePercent}%` : `${c.changePercent}%`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('auctions')}
          className={clsx(
            "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all shrink-0 cursor-pointer",
            activeTab === 'auctions'
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-white/5"
          )}
        >
          <Gavel size={18} />
          <span>المزادات السرية الحية ({auctions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('commodities')}
          className={clsx(
            "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all shrink-0 cursor-pointer",
            activeTab === 'commodities'
              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-white/5"
          )}
        >
          <TrendingUp size={18} />
          <span>بورصة ومؤشر الممنوعات ({commodities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('flash')}
          className={clsx(
            "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all shrink-0 cursor-pointer",
            activeTab === 'flash'
              ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-600/20"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-white/5"
          )}
        >
          <Zap size={18} />
          <span>الصفقات الخاطفة المحسومة ({flashDeals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('secret_storage')}
          className={clsx(
            "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all shrink-0 cursor-pointer",
            activeTab === 'secret_storage'
              ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-600/20"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-white/5"
          )}
        >
          <Package size={18} />
          <span>المخزن السري وغنائم المزادات</span>
        </button>
      </div>

      {/* TAB 1: LIVE AUCTIONS */}
      {activeTab === 'auctions' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex items-center justify-between gap-4 flex-wrap bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-zinc-400 font-bold ml-2">تصفية حسب الندرة:</span>
              {['all', 'mythic', 'legendary', 'epic'].map((rarity) => (
                <button
                  key={rarity}
                  onClick={() => setSelectedRarity(rarity)}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border",
                    selectedRarity === rarity
                      ? "bg-amber-500 text-black border-amber-400 shadow-md"
                      : "bg-zinc-800/60 text-zinc-400 border-white/5 hover:text-white"
                  )}
                >
                  {rarity === 'all' ? 'كافة المزادات' : RARITY_THEMES[rarity as AuctionRarity]?.badge}
                </button>
              ))}
            </div>

            <div className="text-xs text-zinc-400 font-medium">
              يتم تمديد المزاد تلقائياً بـ 3 دقائق إذا تمت المزايدة في الدقائق الأخيرة لمنع القنص السريع.
            </div>
          </div>

          {/* Auctions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredAuctions.map((auction) => {
              const theme = RARITY_THEMES[auction.rarity];
              const isEnded = auction.endsAt <= currentTime;
              const isHighestBidder = auction.highestBidderId === profile?.uid;
              const canClaim = isEnded && isHighestBidder && !auction.winnerClaimed;
              const minNextBid = auction.currentBid + auction.minBidIncrement;

              return (
                <div 
                  key={auction.id}
                  className={clsx(
                    "relative rounded-3xl overflow-hidden border bg-gradient-to-br transition-all duration-300 shadow-2xl flex flex-col justify-between group",
                    theme.bg,
                    theme.border,
                    theme.shadow
                  )}
                >
                  {/* Top Image & Badges */}
                  <div>
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-950">
                      <img 
                        src={auction.image} 
                        alt={auction.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

                      {/* Rarity & Status Badges */}
                      <div className="absolute top-4 right-4 flex items-center gap-2">
                        <span className={clsx(
                          "px-3 py-1 rounded-full text-xs font-black backdrop-blur-md border bg-black/60 shadow-lg",
                          theme.text,
                          theme.border
                        )}>
                          {theme.badge}
                        </span>
                      </div>

                      {/* Timer Countdown Badge */}
                      <div className="absolute top-4 left-4">
                        <div className={clsx(
                          "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold backdrop-blur-md border",
                          isEnded 
                            ? "bg-red-500/20 text-red-400 border-red-500/40" 
                            : "bg-black/80 text-amber-400 border-amber-500/40 animate-pulse"
                        )}>
                          <Clock size={13} />
                          <span>{formatCountdown(auction.endsAt)}</span>
                        </div>
                      </div>

                      {/* Title & Seller Info */}
                      <div className="absolute bottom-4 inset-x-4">
                        <h2 className="text-lg sm:text-xl font-black text-white leading-snug drop-shadow-md mb-1">
                          {auction.title}
                        </h2>
                        <div className="flex items-center gap-2 text-xs text-zinc-300">
                          <img 
                            src={auction.sellerPhoto || '/images/npcs/male_wealthy.jpg'} 
                            alt={auction.sellerName} 
                            className="w-5 h-5 rounded-full object-cover border border-white/20"
                          />
                          <span>طرح بواسطة: <strong className="text-white">{auction.sellerName}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Description & Attributes */}
                    <div className="p-6 space-y-4">
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {auction.description}
                      </p>

                      {/* Perks & Stats */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {auction.attributes.powerBonus && (
                          <div className="p-2.5 rounded-xl bg-red-950/20 border border-red-500/20 flex items-center gap-2">
                            <Crosshair size={15} className="text-red-400 shrink-0" />
                            <span className="text-zinc-300">قوة هجومية: <strong className="text-red-400">+{auction.attributes.powerBonus}</strong></span>
                          </div>
                        )}
                        {auction.attributes.defenseBonus && (
                          <div className="p-2.5 rounded-xl bg-blue-950/20 border border-blue-500/20 flex items-center gap-2">
                            <Shield size={15} className="text-blue-400 shrink-0" />
                            <span className="text-zinc-300">درع وحماية: <strong className="text-blue-400">+{auction.attributes.defenseBonus}</strong></span>
                          </div>
                        )}
                        {auction.attributes.prestigePoints && (
                          <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/20 flex items-center gap-2 col-span-2">
                            <Award size={15} className="text-amber-400 shrink-0" />
                            <span className="text-zinc-300">هيبة ومكانة بالمدينة: <strong className="text-amber-400">+{auction.attributes.prestigePoints} نقطة</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Special Perk Banner */}
                      {auction.attributes.specialPerk && (
                        <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-zinc-900 to-amber-500/5 border border-amber-500/30 flex items-start gap-2.5">
                          <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5" />
                          <div className="text-xs">
                            <span className="font-bold text-amber-400 block mb-0.5">الميزة الاستراتيجية الخاصة:</span>
                            <span className="text-zinc-200">{auction.attributes.specialPerk}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bidding Control Panel */}
                  <div className="p-6 pt-0 space-y-4">
                    {/* Current Bid & Leader */}
                    <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">أعلى مزايدة حالية</div>
                        <div className="text-2xl font-black text-amber-400 font-mono">
                          {formatMoney(auction.currentBid)}
                        </div>
                      </div>

                      <div className="text-left">
                        <div className="text-[10px] font-bold text-zinc-400">المتصدّر الحالي</div>
                        <div className="flex items-center gap-2 justify-end mt-0.5">
                          <span className={clsx(
                            "text-xs font-black",
                            isHighestBidder ? "text-emerald-400" : "text-white"
                          )}>
                            {isHighestBidder ? 'أنت المتصدر 🥇' : auction.highestBidderName || 'لا يوجد مزايد'}
                          </span>
                          {auction.highestBidderPhoto && (
                            <img 
                              src={auction.highestBidderPhoto} 
                              alt="Bidder" 
                              className="w-6 h-6 rounded-full object-cover border border-amber-500/40"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {canClaim ? (
                      <button
                        onClick={() => handleClaim(auction)}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-black text-sm transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer animate-bounce"
                      >
                        <Award size={18} />
                        <span>تهانينا! اضغط لاستلام غنائم المزاد في مخزونك 🏆</span>
                      </button>
                    ) : isEnded ? (
                      <div className="p-3 text-center rounded-xl bg-zinc-800/40 text-xs font-bold text-zinc-500 border border-white/5">
                        انتهى هذا المزاد وتم حسمه لصالح المتصدر
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {biddingAuctionId === auction.id ? (
                          <div className="p-4 rounded-2xl bg-zinc-950 border border-amber-500/40 space-y-3">
                            <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                              <span>أدخل مبلغ المزايدة:</span>
                              <span className="text-amber-400">الحد الأدنى: {formatMoney(minNextBid)}</span>
                            </div>

                            <div className="flex gap-2">
                              <input 
                                type="number"
                                value={customBidAmount}
                                onChange={(e) => setCustomBidAmount(e.target.value)}
                                placeholder={minNextBid.toString()}
                                className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                              />
                              <button
                                disabled={isSubmittingBid}
                                onClick={() => handlePlaceBid(auction, Number(customBidAmount) || minNextBid)}
                                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
                              >
                                {isSubmittingBid ? 'جاري التسجيل...' : 'تأكيد المزايدة'}
                              </button>
                              <button
                                onClick={() => setBiddingAuctionId(null)}
                                className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-xl cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </div>

                            {/* Quick Add Presets */}
                            <div className="flex items-center gap-2 pt-1">
                              {[auction.minBidIncrement, auction.minBidIncrement * 2, auction.minBidIncrement * 5].map((inc) => (
                                <button
                                  key={inc}
                                  onClick={() => setCustomBidAmount((auction.currentBid + inc).toString())}
                                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-mono text-zinc-300 border border-white/5 cursor-pointer"
                                >
                                  +{formatNumber(inc)}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setBiddingAuctionId(auction.id);
                                setCustomBidAmount(minNextBid.toString());
                              }}
                              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <Gavel size={16} />
                              <span>المزايدة الآن ({formatMoney(minNextBid)})</span>
                            </button>

                            <button
                              onClick={() => setSelectedAuctionDetails(auction)}
                              className="px-4 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <History size={16} />
                              <span>السجل ({auction.bidHistory?.length || 0})</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: COMMODITY EXCHANGE */}
      {activeTab === 'commodities' && (
        <div className="space-y-6">
          {/* Market News Flash */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-amber-400">
              <Radio size={14} className="text-red-500 animate-pulse" />
              <span>نشرة استخبارات أسواق المافيا وسوق الشورجة اللحظية:</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MARKET_NEWS.map((news) => (
                <div key={news.id} className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-start gap-3">
                  <div className={clsx(
                    "w-2 h-2 rounded-full mt-1.5 shrink-0",
                    news.impact === 'positive' ? "bg-emerald-400" : news.impact === 'negative' ? "bg-red-400" : "bg-zinc-400"
                  )} />
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-200 leading-relaxed">{news.title}</p>
                    <span className="text-[10px] text-zinc-500 font-mono">{news.timeAgo}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Commodities Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {commodities.map((item) => (
              <div 
                key={item.id}
                className="p-6 rounded-3xl bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 transition-all shadow-xl space-y-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-800 px-2.5 py-1 rounded-full border border-white/5">
                      {item.unit}
                    </span>
                    <span className={clsx(
                      "inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full border",
                      item.trend === 'up' 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                        : "bg-red-500/10 text-red-400 border-red-500/30"
                    )}>
                      {item.trend === 'up' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      {item.changePercent > 0 ? `+${item.changePercent}%` : `${item.changePercent}%`}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white mb-2 leading-snug">
                    {item.name}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                    {item.description}
                  </p>

                  {/* Impact News Callout */}
                  {item.impactNews && (
                    <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] text-zinc-300 leading-relaxed mb-4">
                      <strong className="text-amber-400">تأثير السوق: </strong>
                      {item.impactNews}
                    </div>
                  )}

                  {/* 24h High/Low Stats */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono p-3 rounded-xl bg-black/50 border border-white/5">
                    <div>
                      <span className="text-zinc-500 block text-[10px]">أعلى سعر (24h)</span>
                      <span className="text-emerald-400 font-bold">{formatMoney(item.high24h)}</span>
                    </div>
                    <div className="text-left">
                      <span className="text-zinc-500 block text-[10px]">أدنى سعر (24h)</span>
                      <span className="text-red-400 font-bold">{formatMoney(item.low24h)}</span>
                    </div>
                  </div>
                </div>

                {/* Spot Price & Trade Trigger */}
                <div className="pt-4 border-t border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">سعر التداول الفوري:</span>
                    <span className="text-xl font-black text-amber-400 font-mono">
                      {formatMoney(item.currentPrice)}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      navigate('/trade');
                    }}
                    className="w-full py-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <ArrowRightLeft size={14} className="text-indigo-400" />
                    <span>تداول فوري في قسم التهريب الدولي 🚢</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: FLASH DEALS */}
      {activeTab === 'flash' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-red-950/20 border border-red-600/30 text-xs text-red-300 flex items-center gap-3">
            <Flame size={20} className="text-red-500 shrink-0 animate-bounce" />
            <span>
              الصفقات الخاطفة تصدر بكميات محدودة جداً وتوفر خصماً يصل إلى 50% على أهم المقتنيات النادرة التي تسهل السطو والاشتباكات.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {flashDeals.map((deal) => (
              <div 
                key={deal.id}
                className="rounded-3xl overflow-hidden bg-zinc-900 border border-red-500/30 flex flex-col justify-between shadow-2xl group"
              >
                <div>
                  <div className="relative aspect-[16/10] overflow-hidden bg-black">
                    <img 
                      src={deal.image} 
                      alt={deal.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-red-600 text-white font-black text-xs shadow-lg">
                      خصم {deal.discountPercent}%
                    </div>
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/80 text-amber-400 font-mono text-[11px] border border-amber-500/30">
                      متبقي: {deal.stockRemaining} فقط
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-md">
                      {deal.category}
                    </span>
                    <h3 className="text-base font-black text-white leading-snug">
                      {deal.title}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {deal.description}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0 space-y-3">
                  <div className="p-3 rounded-xl bg-black/50 border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-500 line-through block">
                        {formatMoney(deal.originalPrice)}
                      </span>
                      <span className="text-lg font-black text-emerald-400 font-mono">
                        {formatMoney(deal.dealPrice)}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400">دفع كاش نظيف</span>
                  </div>

                  <button
                    onClick={() => handleBuyDeal(deal)}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Zap size={16} />
                    <span>اقتناء الصفقة الخاطفة فوراً ⚡</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SECRET STORAGE & USABLE ITEMS */}
      {activeTab === 'secret_storage' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/40 via-zinc-950 to-black border border-purple-500/30 flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Package className="text-purple-400" size={22} />
                <span>المخزن السري للمزادات والصفقات الخاطفة</span>
              </h2>
              <p className="text-xs text-zinc-400">
                جميع المعدات، الأدوات العسكرية، والشحنات المكتسبة من المزادات السرية والصفقات الخاطفة قابلة للاستخدام الفوري لتعزيز قوتك وجنيك للأموال.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {profile?.inventory?.tools && Object.entries(profile.inventory.tools).map(([id, count]) => {
              if ((count as number) <= 0) return null;
              return (
                <div key={id} className="bg-zinc-900/60 p-6 rounded-3xl border border-purple-500/30 flex flex-col justify-between gap-4 shadow-xl">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full text-[10px] font-black">
                        أداة تكتيكية سريّة
                      </span>
                      <span className="font-mono text-xs text-zinc-400 font-bold">الكمية: {count as number}</span>
                    </div>
                    <h3 className="text-base font-black text-white">{id}</h3>
                    <p className="text-xs text-zinc-400">أداة محترفة تم اقتناؤها من مزادات الظل أو الصفقات الخاطفة.</p>
                  </div>
                  <button
                    onClick={() => handleUseItem(id, 'tools')}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Zap size={15} />
                    <span>استخدام الأداة / تفعيل الأثر ⚡</span>
                  </button>
                </div>
              );
            })}

            {(!profile?.inventory?.tools || Object.values(profile.inventory.tools).every(v => (v as number) <= 0)) && (
              <div className="col-span-full py-16 text-center text-zinc-500 text-xs font-bold">
                المخزن السري فارغ حالياً. شارك في المزادات السرية الحية أو الصفقات الخاطفة لامتلاك معدات فريدة! 🏛️
              </div>
            )}
          </div>
        </div>
      )}

      {/* BID HISTORY MODAL */}
      <AnimatePresence>
        {selectedAuctionDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-right space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <button 
                  onClick={() => setSelectedAuctionDetails(null)}
                  className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
                <div className="text-right">
                  <h3 className="text-lg font-black text-white">سجل مزايدات المزاد</h3>
                  <p className="text-xs text-zinc-400">{selectedAuctionDetails.title}</p>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {selectedAuctionDetails.bidHistory && selectedAuctionDetails.bidHistory.length > 0 ? (
                  selectedAuctionDetails.bidHistory.map((bid, i) => (
                    <div 
                      key={i}
                      className={clsx(
                        "p-3 rounded-xl border flex items-center justify-between text-xs font-mono",
                        i === 0 ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-black/40 border-white/5 text-zinc-300"
                      )}
                    >
                      <span className="font-black text-sm">{formatMoney(bid.amount)}</span>
                      <div className="flex items-center gap-2 font-sans font-medium text-right">
                        <span>{bid.bidderName} {i === 0 && '🥇'}</span>
                        {bid.bidderPhoto && (
                          <img src={bid.bidderPhoto} alt="" className="w-5 h-5 rounded-full object-cover" />
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500 text-center py-6">لا توجد مزايدات مسجلة بعد لهذا العنصر.</p>
                )}
              </div>

              <button
                onClick={() => setSelectedAuctionDetails(null)}
                className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
