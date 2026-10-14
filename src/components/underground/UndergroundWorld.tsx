import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  MapPin, 
  Swords, 
  Dices, 
  ShoppingBag, 
  MessageSquare, 
  Eye, 
  ShieldAlert, 
  Heart, 
  DollarSign, 
  Zap, 
  RotateCcw,
  Sparkles,
  Siren,
  HelpCircle,
  Activity,
  Award,
  Gift,
  ShieldCheck,
  Shield,
  Coffee,
  HandCoins,
  BadgePercent,
  CheckCircle,
  AlertTriangle,
  Smile,
  Frown,
  Flame,
  ArrowRightLeft,
  ChevronDown,
  UserCheck,
  Package,
  Car,
  Smartphone,
  Monitor,
  Wrench,
  Pill,
  Maximize2,
  ZoomIn,
  ZoomOut,
  X,
  LayoutGrid,
  Radio,
  Truck,
  Coins,
  Crosshair,
  Lock,
  Unlock
} from 'lucide-react';
import { NPCCharacter, NPCPersonality, PoliceRaidEvent, NPCInventoryItem } from '../../types/npcTypes';
import { NPCEngine } from '../../services/npcEngine';
import { PoliceEngine } from '../../services/policeEngine';
import { MARKET_ITEMS } from '../../lib/items';
import { 
  PERSONALITY_METADATA, 
  ACTIVITY_METADATA, 
  MOOD_METADATA, 
  FRIENDSHIP_TIERS, 
  IRAQI_DISTRICTS 
} from '../../services/npcDialogues';
import { useAuthStore } from '../../store/useAuthStore';
import { formatMoney } from '../../lib/utils';
import { toast } from 'sonner';
import { PoliceRaidModal } from './PoliceRaidModal';
import { NPCOperationsHub } from './NPCOperationsHub';
import { UndergroundPrison } from './UndergroundPrison';
import { MoneyLaunderingHub } from './MoneyLaunderingHub';
import { NPCOperationsEngine } from '../../services/npcOperationsEngine';
import { UndergroundPrisonInmate, UndergroundSkill } from '../../types/npcExpandedTypes';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export interface UndergroundWorldProps {
  initialSubTab?: 'roster' | 'laundering' | 'dispatch' | 'partnerships' | 'pvp' | 'heists' | 'prison' | 'skills';
}

export const UndergroundWorld: React.FC<UndergroundWorldProps> = ({ initialSubTab = 'roster' }) => {
  const { profile } = useAuthStore();
  
  // تبويب الأقسام والأنظمة الكبرى لعالم الخفاء
  const [mainSubTab, setMainSubTab] = useState<'roster' | 'laundering' | 'dispatch' | 'partnerships' | 'pvp' | 'heists' | 'prison' | 'skills'>(initialSubTab);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'street' | 'operations' | 'power'>('all');
  const [accumulatedProfits, setAccumulatedProfits] = useState<number>(0);

  useEffect(() => {
    if (initialSubTab) {
      setMainSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // تحديث عداد أرباح الشراكات التراكمي
  useEffect(() => {
    const updateProfits = () => {
      const { totalProfit } = NPCOperationsEngine.calculateAccumulatedProfits();
      setAccumulatedProfits(totalProfit);
    };
    updateProfits();
    const timer = setInterval(updateProfits, 3000);
    return () => clearInterval(timer);
  }, []);

  // إدارة مساجين سجن الخفاء وشجرة المهارات
  const [inmates, setInmates] = useState<UndergroundPrisonInmate[]>(() => NPCOperationsEngine.getInmates());
  const [skills, setSkills] = useState<UndergroundSkill[]>(() => NPCOperationsEngine.getSkills());

  const handleArrestNpc = (npcId: string, npcName: string, reason: string) => {
    const targetNpc = npcs.find(n => n.id === npcId);
    if (targetNpc) {
      NPCOperationsEngine.imprisonNPC(targetNpc, reason);
      setInmates(NPCOperationsEngine.getInmates());
      toast.error(`تم اقتياد ${npcName} إلى سجن أزقة الخفاء! السبب: ${reason}`);
    }
  };

  const handleInmateReleased = (inmate: UndergroundPrisonInmate) => {
    setInmates(NPCOperationsEngine.getInmates());
    toast.success(`أصبح ${inmate.npcName} حراً طليقاً في شوارع المدينة!`);
  };

  const handleSkillsUpdated = (newSkills: UndergroundSkill[]) => {
    setSkills(newSkills);
    NPCOperationsEngine.saveSkills(newSkills);
  };

  // قائمة شخصيات NPC في المدينة وعالم الخفاء
  const [npcs, setNpcs] = useState<NPCCharacter[]>(() => {
    try {
      const saved = localStorage.getItem('saved_fixed_10_npcs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn(e);
    }
    return NPCEngine.generateInitialRoster();
  });
  const [selectedNpc, setSelectedNpc] = useState<NPCCharacter | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('الكل');
  const [selectedPersonalityFilter, setSelectedPersonalityFilter] = useState<string>('all');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [selectedGiftCategory, setSelectedGiftCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'radar'>('grid');
  
  // حالة تكبير صورة الشخصية إلى أكبر حجم (3/4 Lightbox)
  const [enlargedNpc, setEnlargedNpc] = useState<NPCCharacter | null>(null);
  const [enlargedZoom, setEnlargedZoom] = useState<number>(1);

  // إغلاق نافذة تكبير الصورة بزر Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && enlargedNpc) {
        setEnlargedNpc(null);
        setEnlargedZoom(1);
      }
    };
    if (enlargedNpc) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [enlargedNpc]);

  // حفظ تفاعل الشخصيات محلياً ومزامنتها
  useEffect(() => {
    if (npcs && npcs.length > 0) {
      try {
        localStorage.setItem('saved_fixed_10_npcs', JSON.stringify(npcs));
      } catch (e) {
        // ignore
      }
    }
  }, [npcs]);

  // مزامنة حية ومباشرة لشخصيات الـ NPCs بين لوحة الإدارة والمدينة
  useEffect(() => {
    // 1. استماع لأي تحديث فوري قادم من شاشة الإدارة في نفس المتصفح
    const handleRosterUpdate = (event: any) => {
      if (event?.detail && Array.isArray(event.detail) && event.detail.length > 0) {
        setNpcs(event.detail);
      }
    };
    window.addEventListener('npc_roster_updated', handleRosterUpdate);

    // 2. مزامنة حية مع Firestore لسحب الشخصيات المضافة أو المعدلة في الإدارة
    const unsub = onSnapshot(doc(db, 'gameData', 'npcs_roster'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data?.characters && Array.isArray(data.characters) && data.characters.length > 0) {
          setNpcs(data.characters);
          try {
            localStorage.setItem('saved_fixed_10_npcs', JSON.stringify(data.characters));
          } catch (e) {
            // ignore
          }
        }
      } else {
        NPCEngine.loadRoster().then(roster => {
          if (roster && roster.length > 0) {
            setNpcs(roster);
          }
        });
      }
    }, (error) => {
      console.warn('Firestore npcs_roster snapshot warning:', error);
      NPCEngine.loadRoster().then(roster => {
        if (roster && roster.length > 0) {
          setNpcs(roster);
        }
      });
    });

    return () => {
      window.removeEventListener('npc_roster_updated', handleRosterUpdate);
      unsub();
    };
  }, []);
  
  // الحماية الشخصية النشطة (المرافق)
  const [activeProtector, setActiveProtector] = useState<NPCCharacter | null>(null);

  // حالات التفاعل والتبويبات
  const [activeTab, setActiveTab] = useState<'chat' | 'trade' | 'gift' | 'protect' | 'brawl' | 'gamble' | 'pickpocket'>('chat');
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [brawlLog, setBrawlLog] = useState<string[]>([]);
  const [isPunchCooldown, setIsPunchCooldown] = useState(false);
  const [betAmount, setBetAmount] = useState<number>(25000);
  const [betChoice, setBetChoice] = useState<'heads' | 'tails'>('heads');
  const [isBetting, setIsBetting] = useState(false);
  const [isGifting, setIsGifting] = useState(false);
  const [isProcessingLoan, setIsProcessingLoan] = useState(false);

  // نظام المداهمات الأمنية
  const [activeRaid, setActiveRaid] = useState<PoliceRaidEvent | null>(null);

  // محاكاة دورة الحياة المستمرة للـ NPCs كل 5 ثوانٍ
  useEffect(() => {
    const timer = setInterval(() => {
      setNpcs(prev => NPCEngine.tickSimulation(prev));
      
      // احتمال عشوائي للمداهمة عند وجود شبهة عالية
      if (profile && Math.random() < 0.08) {
        const contraband = PoliceEngine.scanPlayerContraband(profile);
        const suspicion = PoliceEngine.calculateSuspicion(profile, contraband);
        if (suspicion >= 40 && !activeRaid) {
          const raid = PoliceEngine.generateRaidEvent(profile);
          setActiveRaid(raid);
        }
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [profile, activeRaid]);

  // تحديث الـ NPC المختار والحماية عند تغير الحالة في المحاكاة
  useEffect(() => {
    if (selectedNpc) {
      const updated = npcs.find(n => n.id === selectedNpc.id);
      if (updated) setSelectedNpc(updated);
    }
    if (activeProtector) {
      const updatedProtector = npcs.find(n => n.id === activeProtector.id);
      if (updatedProtector) setActiveProtector(updatedProtector);
    }
  }, [npcs]);

  // تعيين الشخصية الأولى افتراضياً
  useEffect(() => {
    if (!selectedNpc && npcs.length > 0) {
      setSelectedNpc(npcs[0]);
    }
  }, [npcs, selectedNpc]);

  // فلترة الشخصيات المعروضة (المقاطعة، النمط، الجنس)
  const filteredNpcs = npcs.filter(npc => {
    const matchDistrict = selectedDistrict === 'الكل' || npc.district === selectedDistrict;
    const matchPersonality = selectedPersonalityFilter === 'all' || npc.personality === selectedPersonalityFilter;
    const matchGender = selectedGenderFilter === 'all' || npc.gender === selectedGenderFilter;
    return matchDistrict && matchPersonality && matchGender;
  });

  // حساب درجة الشبهة التراكمية الحالية
  const currentContraband = profile ? PoliceEngine.scanPlayerContraband(profile) : [];
  const suspicionScore = profile ? PoliceEngine.calculateSuspicion(profile, currentContraband) : 0;

  // إرسال هدية إلى الـ NPC لرفع الصداقة
  const handleSendGift = async (giftType: 'cash_small' | 'cash_large' | 'tea' | 'medical' | 'weapon') => {
    if (!profile || !selectedNpc || isGifting) return;

    setIsGifting(true);
    const res = await NPCEngine.sendGiftToNPC(profile, selectedNpc, giftType);
    setIsGifting(false);

    if (res.success) {
      toast.success(res.message);
      // تحديث بيانات الـ NPC محلياً
      setNpcs(prev => prev.map(n => {
        if (n.id === selectedNpc.id) {
          return {
            ...n,
            friendship: res.newFriendship,
            friendshipRank: res.newRank,
            cash: n.cash + (giftType.startsWith('cash') ? res.cost : 0)
          };
        }
        return n;
      }));
    } else {
      toast.error(res.message);
    }
  };

  // إعطاء مال كاش للشخصية لرفع المودة والثقة والاحترام
  const handleGiveCash = async (amount: number) => {
    if (!profile || !selectedNpc) return;
    const res = await NPCEngine.giveCashGift(selectedNpc, profile, amount);
    if (res.success) {
      toast.success(res.message);
      setNpcs(prev => prev.map(n => {
        if (n.id === selectedNpc.id) {
          return {
            ...n,
            cash: n.cash + amount,
            affection: Math.min(100, (n.affection || 20) + res.deltaAffection),
            trust: Math.min(100, (n.trust || 15) + res.deltaTrust),
            respect: Math.min(100, (n.respect || 25) + res.deltaRespect),
            conflict: Math.max(0, (n.conflict || 10) - 15),
            friendship: Math.min(100, n.friendship + res.deltaAffection)
          };
        }
        return n;
      }));
    } else {
      toast.error(res.message);
    }
  };

  // إبلاغ الشرطة عن الـ NPC
  const handleReportPolice = async () => {
    if (!profile || !selectedNpc) return;
    const res = await NPCEngine.reportToPolice(selectedNpc, profile, 'player');
    if (res.success) {
      toast.warning(res.message);
      setNpcs(prev => prev.map(n => {
        if (n.id === selectedNpc.id) {
          return {
            ...n,
            trust: 0,
            affection: 0,
            conflict: 100,
            activity: 'fleeing',
            activityArabic: 'هارب من الشرطة'
          };
        }
        return n;
      }));
    }
  };

  // توظيف أو إلغاء الحماية الشخصية
  const handleToggleProtector = async () => {
    if (!profile || !selectedNpc) return;

    const isCurrent = activeProtector?.id === selectedNpc.id;
    const res = await NPCEngine.toggleProtection(profile, selectedNpc, !isCurrent);

    if (res.success) {
      if (!isCurrent) {
        setActiveProtector({ ...selectedNpc, isHiredProtector: true });
        setNpcs(prev => prev.map(n => n.id === selectedNpc.id ? { ...n, isHiredProtector: true } : n));
        toast.success(res.message);
      } else {
        setActiveProtector(null);
        setNpcs(prev => prev.map(n => n.id === selectedNpc.id ? { ...n, isHiredProtector: false } : n));
        toast.info(res.message);
      }
    } else {
      toast.error(res.message);
    }
  };

  // طلب سلفة مالية
  const handleAskLoan = async () => {
    if (!profile || !selectedNpc || isProcessingLoan) return;

    const amount = Math.min(selectedNpc.cash, selectedNpc.loanAvailable || 50000);
    setIsProcessingLoan(true);
    const res = await NPCEngine.requestStreetLoan(profile, selectedNpc, amount);
    setIsProcessingLoan(false);

    if (res.success) {
      toast.success(res.message);
      setNpcs(prev => prev.map(n => {
        if (n.id === selectedNpc.id) {
          return {
            ...n,
            cash: Math.max(0, n.cash - amount),
            loanAvailable: 0
          };
        }
        return n;
      }));
    } else {
      toast.error(res.message);
    }
  };

  // شراء بضاعة متخصصة من الـ NPC
  const handleBuyItem = async (item: NPCInventoryItem) => {
    if (!profile || !selectedNpc) return;
    const res = await NPCEngine.buyItemFromNPC(profile, selectedNpc, item);
    if (res.success) {
      toast.success(res.message);
      // تحديث كاش ومخزن الـ NPC محلياً
      setNpcs(prev => prev.map(n => {
        if (n.id === selectedNpc.id) {
          return {
            ...n,
            cash: n.cash + res.finalPrice,
            friendship: Math.min(100, n.friendship + 2),
            uniqueInventory: n.uniqueInventory.map(i => i.id === item.id ? { ...i, stock: Math.max(0, i.stock - 1) } : i)
          };
        }
        return n;
      }));
    } else {
      toast.error(res.message);
    }
  };

  // بيع عنصر من مخزن اللاعب إلى الـ NPC
  const handleSellItem = async (item: NPCInventoryItem) => {
    if (!profile || !selectedNpc) return;
    const res = await NPCEngine.sellItemToNPC(profile, selectedNpc, item);
    if (res.success) {
      toast.success(res.message);
      // تحديث كاش الـ NPC محلياً
      setNpcs(prev => prev.map(n => {
        if (n.id === selectedNpc.id) {
          return {
            ...n,
            cash: Math.max(0, n.cash - res.payout),
            friendship: Math.min(100, n.friendship + 3)
          };
        }
        return n;
      }));
    } else {
      toast.error(res.message);
    }
  };

  // تنفيذ اللكمة في الشجار
  const handlePunch = async () => {
    if (!profile || !selectedNpc || isPunchCooldown) return;

    setIsPunchCooldown(true);

    const result = await NPCEngine.executeBrawlPunch(profile, selectedNpc, activeProtector);

    setBrawlLog(prev => [result.message, ...prev.slice(0, 5)]);

    // تحديث صحة وكاش الـ NPC محلياً
    setNpcs(prev => prev.map(n => {
      if (n.id === selectedNpc.id) {
        return {
          ...n,
          health: result.updatedNpcHealth,
          cash: result.npcKnockedOut ? Math.max(0, n.cash - result.rewardCash) : n.cash,
          activity: result.npcKnockedOut ? 'resting' : 'fighting',
          activityArabic: result.npcKnockedOut ? 'أغمي عليه' : 'مشتبك في عراك'
        };
      }
      return n;
    }));

    if (result.npcKnockedOut) {
      toast.success(`أسقطت ${selectedNpc.name} أرضاً وغنمت ${formatMoney(result.rewardCash)} كاش!`);
    } else if (result.playerKnockedOut) {
      toast.error(`أغمي عليك ونقلت للعلاج! خسرت ${formatMoney(result.playerCashLoss)}.`);
    }

    if (result.protectorIntervenedText) {
      toast.info(result.protectorIntervenedText);
    }

    if (result.witnessReportedPolice) {
      toast.warning('شاهد أبلغ الشرطة عن الشجار! ارتفعت نجوم المطلوبية!');
    }

    setTimeout(() => {
      setIsPunchCooldown(false);
    }, 1200);
  };

  // تنفيذ الرهان
  const handlePlayBet = async () => {
    if (!profile || !selectedNpc || isBetting) return;

    setIsBetting(true);
    const result = await NPCEngine.executeStreetBet(profile, selectedNpc, betAmount, betChoice);
    setIsBetting(false);

    if (result.won) {
      toast.success(result.message);
      // خصم الكاش من الـ NPC
      setNpcs(prev => prev.map(n => n.id === selectedNpc.id ? { ...n, cash: Math.max(0, n.cash - betAmount) } : n));
    } else {
      toast.error(result.message);
      // إضافة الكاش للـ NPC
      setNpcs(prev => prev.map(n => n.id === selectedNpc.id ? { ...n, cash: n.cash + betAmount } : n));
    }
  };

  // محاولة نشل الـ NPC
  const handlePickpocket = () => {
    if (!selectedNpc || !profile) return;
    const successRate = Math.max(20, 80 - (selectedNpc.caution * 6));
    const roll = Math.random() * 100;

    if (roll < successRate) {
      const stolen = Math.min(selectedNpc.cash, Math.floor(Math.random() * 25000) + 5000);
      toast.success(`نجحت بخفة يدك وسرقت ${formatMoney(stolen)} من محفظة ${selectedNpc.name}!`);
      setNpcs(prev => prev.map(n => n.id === selectedNpc.id ? { ...n, cash: Math.max(0, n.cash - stolen) } : n));
    } else {
      toast.error(`كشفك ${selectedNpc.name}! بدأ بالشجار معك فوراً!`);
      setActiveTab('brawl');
      handlePunch();
    }
  };

  // عناصر المخزن القابلة للبيع
  const sellableItems: NPCInventoryItem[] = selectedNpc ? [
    ...selectedNpc.uniqueInventory.map(item => ({
      ...item,
      name: `${item.name} (من مخزنك)`
    }))
  ] : [];

  return (
    <div className="space-y-6 text-white pb-12" dir="rtl">
      {/* نافذة المداهمة الأمنية إن وُجدت */}
      <PoliceRaidModal raid={activeRaid} onClose={() => setActiveRaid(null)} />

      {/* شارة الحماية الشخصية النشطة إن وجدت */}
      {activeProtector && (
        <div className="p-4 bg-gradient-to-r from-blue-950/80 via-zinc-900 to-blue-950/80 border-2 border-blue-500/50 rounded-2xl flex items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-blue-400 shrink-0 shadow-md">
              <img src={activeProtector.image} alt={activeProtector.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-blue-400 flex items-center gap-1">
                  <ShieldCheck size={14} />
                  حمايتك الميدانية النشطة
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300">
                  {activeProtector.specialty}
                </span>
              </div>
              <h4 className="text-sm font-black text-white">{activeProtector.name} ("{activeProtector.nickname}")</h4>
              <p className="text-[11px] text-zinc-400">
                يمتص 35% من أضرار الشجارات · ضربة دعم (+15 ضرر) · يشتت انتباه دوريات الشرطة بنسبة 25%
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleProtector}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-colors shrink-0"
          >
            إلغاء المرافقة
          </button>
        </div>
      )}

      {/* بطاقة الرأس والتنظيم الموحد لكافة أقسام عالم الخفاء الـ 7 دون تكرار */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20">
              <Eye className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                عالم الخفاء وأزقة الظل
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-800">
                  7 أنظمة متكاملة
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                الشخصيات، المهمات الميدانية، الشراكات والأرباح، السطو، سجن الخفاء، والـ PvP
              </p>
            </div>
          </div>

          {/* فلترة التصنيفات للتنظيم السريع */}
          <div className="flex items-center gap-1.5 p-1 bg-black/60 border border-zinc-800/80 rounded-2xl overflow-x-auto">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all shrink-0 ${
                categoryFilter === 'all'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              الكل (7)
            </button>
            <button
              onClick={() => setCategoryFilter('street')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all shrink-0 ${
                categoryFilter === 'street'
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              الشارع والشخصيات (2)
            </button>
            <button
              onClick={() => setCategoryFilter('operations')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all shrink-0 ${
                categoryFilter === 'operations'
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              العمليات والتجارة (3)
            </button>
            <button
              onClick={() => setCategoryFilter('power')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all shrink-0 ${
                categoryFilter === 'power'
                  ? 'bg-rose-600/30 text-rose-300 border border-rose-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              النفوذ والترقيات (2)
            </button>
          </div>
        </div>

        {/* شبكة القوائم والأقسام المرتبة بنظام كامل */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            {
              id: 'roster' as const,
              category: 'street' as const,
              label: 'شخصيات الأزقة',
              badge: `${npcs.length}`,
              badgeClass: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
              desc: `${npcs.length} شخصيات للتفاعل والتجارة`,
              icon: Users,
              activeClass: 'bg-blue-600 text-white shadow-lg shadow-blue-950/50 border-blue-400/40',
              iconColor: 'text-blue-400',
            },
            {
              id: 'laundering' as const,
              category: 'operations' as const,
              label: 'غسيل الأموال',
              badge: '35% - 15%',
              badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono',
              desc: 'واجهات تبييض الكاش القذر',
              icon: HandCoins,
              activeClass: 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg shadow-amber-950/50 border-amber-400/40',
              iconColor: 'text-amber-400',
            },
            {
              id: 'prison' as const,
              category: 'street' as const,
              label: 'سجن أزقة الخفاء',
              badge: inmates.length > 0 ? `${inmates.length} موقوف` : undefined,
              badgeClass: 'bg-red-500 text-white animate-pulse',
              desc: 'المساجين والكفالات والتهريب',
              icon: Siren,
              activeClass: 'bg-red-700 text-white shadow-lg shadow-red-950/50 border-red-500/40',
              iconColor: 'text-red-400',
            },
            {
              id: 'dispatch' as const,
              category: 'operations' as const,
              label: 'شحن ونقل وعمل',
              badge: 'مهام',
              badgeClass: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
              desc: 'مهام الشحن والجباية والحراسة',
              icon: Truck,
              activeClass: 'bg-sky-600 text-white shadow-lg shadow-sky-950/50 border-sky-400/40',
              iconColor: 'text-sky-400',
            },
            {
              id: 'partnerships' as const,
              category: 'operations' as const,
              label: 'شراكات واستثمار وتجارة',
              badge: accumulatedProfits > 0 ? formatMoney(accumulatedProfits) : 'أرباح',
              badgeClass: accumulatedProfits > 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
              desc: 'مشاريع تجارية وتوليد أرباح',
              icon: Coins,
              activeClass: 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50 border-emerald-400/40',
              iconColor: 'text-emerald-400',
            },
            {
              id: 'heists' as const,
              category: 'operations' as const,
              label: 'سرقة وسطو وممنوعات',
              badge: 'طواقم',
              badgeClass: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
              desc: 'فرق السطو المسلح على البنوك',
              icon: Flame,
              activeClass: 'bg-purple-600 text-white shadow-lg shadow-purple-950/50 border-purple-400/40',
              iconColor: 'text-purple-400',
            },
            {
              id: 'pvp' as const,
              category: 'power' as const,
              label: 'عمليات ضد ومع اللاعبين',
              badge: 'PvP',
              badgeClass: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
              desc: 'تخريب ومراقبة ومداهمة اللاعبين',
              icon: Crosshair,
              activeClass: 'bg-rose-600 text-white shadow-lg shadow-rose-950/50 border-rose-400/40',
              iconColor: 'text-rose-400',
            },
            {
              id: 'skills' as const,
              category: 'power' as const,
              label: 'شجرة المهارات (5)',
              badge: '5 مسارات',
              badgeClass: 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
              desc: 'ترقيات ونفوذ قدرات الظل',
              icon: Sparkles,
              activeClass: 'bg-teal-600 text-white shadow-lg shadow-teal-950/50 border-teal-400/40',
              iconColor: 'text-teal-400',
            },
          ]
            .filter(tab => categoryFilter === 'all' || tab.category === categoryFilter)
            .map(tab => {
              const IconComp = tab.icon;
              const isActive = mainSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setMainSubTab(tab.id)}
                  className={`p-3 rounded-2xl text-right transition-all flex flex-col justify-between gap-2.5 border text-xs font-black relative overflow-hidden group active:scale-[0.98] ${
                    isActive
                      ? tab.activeClass
                      : 'bg-zinc-900/60 hover:bg-zinc-900 text-zinc-300 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`p-1.5 rounded-xl ${isActive ? 'bg-black/25 text-white' : `bg-black/40 ${tab.iconColor}`}`}>
                      <IconComp size={16} />
                    </span>
                    {tab.badge && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${tab.badgeClass}`}>
                        {tab.badge}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="block text-xs font-black tracking-tight leading-tight">
                      {tab.label}
                    </span>
                    <span className={`block text-[10px] font-normal line-clamp-1 mt-0.5 ${isActive ? 'text-white/80' : 'text-zinc-500'}`}>
                      {tab.desc}
                    </span>
                  </div>
                </button>
              );
            })}
        </div>
      </div>

      {mainSubTab === 'roster' && (
        <>
          {/* لوحة معلومات الشارع والخفاء العلوية */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/5 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-600/5 blur-3xl pointer-events-none rounded-full" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20">
                <Users className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  عالم الخفاء وأزقة الظل
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                    نظام NPC ذكي باحترافية
                  </span>
                </h2>
                <p className="text-xs text-zinc-400">
                  أموال حقيقية بالملايين، تجارة وبضائع مميزة لكل شخصية، نظام صداقة وهدايا، واستئجار حماية وسند بالشوارع.
                </p>
              </div>
            </div>
          </div>

          {/* مقياس الشبهة والنجوم */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider">مقياس الشبهة</div>
                <div className="text-sm font-black font-mono text-amber-400">{suspicionScore}%</div>
              </div>
            </div>

            <div className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center gap-3">
              <Siren className="w-5 h-5 text-red-400" />
              <div>
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider">نجوم المطلوبية</div>
                <div className="text-sm font-black font-mono text-red-400">
                  {profile?.wantedStars || (profile?.wanted ? 1 : 0)} / 5 ★
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* فلاتر الجنس والأنماط والمناطق وطريقة العرض */}
        <div className="mt-6 pt-6 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          {/* فلتر الجنس (الكل 10، رجال 5، نساء 5) */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-bold shrink-0">الشخصيات:</span>
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setSelectedGenderFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-black transition-all ${
                  selectedGenderFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                الكل ({npcs.length})
              </button>
              <button
                onClick={() => setSelectedGenderFilter('male')}
                className={`px-3 py-1.5 rounded-lg font-black transition-all ${
                  selectedGenderFilter === 'male'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                الرجال ({npcs.filter(n => n.gender === 'male').length}) 👨
              </button>
              <button
                onClick={() => setSelectedGenderFilter('female')}
                className={`px-3 py-1.5 rounded-lg font-black transition-all ${
                  selectedGenderFilter === 'female'
                    ? 'bg-pink-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                النساء ({npcs.filter(n => n.gender === 'female').length}) 👩
              </button>
            </div>
          </div>

          {/* تبديل طريقة العرض (دليل وبطاقات الشخصيات 10 vs رادار الأزقة) */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-bold shrink-0">العرض:</span>
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="عرض بطاقات ودليل الشخصيات الـ 10"
              >
                <LayoutGrid size={14} />
                دليل الشخصيات ({npcs.length})
              </button>
              <button
                onClick={() => setViewMode('radar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  viewMode === 'radar'
                    ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="رادار حركة الشخصيات الحية في الأزقة"
              >
                <Radio size={14} className="text-emerald-400" />
                رادار الأزقة
              </button>
            </div>
          </div>

          {/* فلتر نمط الشخصية (الفقير، الغني، العادي، العدواني، طبيعي) */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-bold">النمط:</span>
            <select
              value={selectedPersonalityFilter}
              onChange={(e) => setSelectedPersonalityFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-red-500 font-bold"
            >
              <option value="all">جميع الأنماط الـ 5 المعتمدة</option>
              <option value="poor">1- الفقير (درويش أزقة)</option>
              <option value="wealthy">2- الغني (قرش سوق وملياردير)</option>
              <option value="worker">3- العادي (كادح وحرفي)</option>
              <option value="aggressive">4- العدواني (قبضاي ومسلح)</option>
              <option value="peaceful">5- طبيعي (متزن وحكيم)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ساحة العرض الرئيسية: بطاقات الشخصيات الـ 10 أو الرادار التفاعلي مع لوحة الملف الشخصي */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* العمود الأيمن: دليل البطاقات الـ 10 أو الرادار الحي */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          {viewMode === 'grid' ? (
            /* دليل وبطاقات الشخصيات الـ 10 مع الصور المصغرة بمقاس 3/4 وإمكانية النقر للتكبير */
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                  <Users className="w-4 h-4 text-blue-400" />
                  قائمة شخصيات NPCs المعتمدة ({filteredNpcs.length} شخصية)
                </div>
                <span className="text-[11px] text-zinc-500 font-bold">
                  انقر على أي صورة لتكبيرها لأكبر حجم 🔍
                </span>
              </div>

              {/* شبكة البطاقات المصغرة 2x */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[580px] overflow-y-auto pe-1 scrollbar-thin scrollbar-thumb-zinc-800">
                {filteredNpcs.map((npc) => {
                  const isSelected = selectedNpc?.id === npc.id;

                  return (
                    <div
                      key={npc.id}
                      onClick={() => {
                        setSelectedNpc(npc);
                        setActiveTab('chat');
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                        isSelected
                          ? 'bg-zinc-900 border-emerald-500/80 shadow-lg ring-1 ring-emerald-500/40'
                          : 'bg-zinc-900/60 border-zinc-800/90 hover:border-zinc-700 hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* صورة الشخصية بنسبة 3/4 مع زر التكبير المباشر */}
                        <div 
                          className="relative aspect-[3/4] w-20 rounded-xl overflow-hidden shrink-0 border border-zinc-700/80 group/img shadow-md cursor-zoom-in"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEnlargedNpc(npc);
                          }}
                          title="انقر لتكبير صورة الشخصية لأكبر حجم 🔍"
                        >
                          <img 
                            src={npc.image} 
                            alt={npc.name} 
                            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn size={18} className="text-white drop-shadow" />
                          </div>
                          <span className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 rounded text-[8px] font-bold text-white flex items-center gap-0.5 pointer-events-none">
                            <Maximize2 size={8} />
                            3/4
                          </span>
                        </div>

                        {/* معلومات الشخصية */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-sm font-black text-white truncate">
                              {npc.name}
                            </h4>
                            <span className="text-[10px] text-zinc-400 font-bold shrink-0">
                              "{npc.nickname}"
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                              npc.personality === 'poor' ? 'bg-zinc-800 text-zinc-300 border-zinc-700' :
                              npc.personality === 'wealthy' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                              npc.personality === 'worker' ? 'bg-teal-500/20 text-teal-300 border-teal-500/30' :
                              npc.personality === 'aggressive' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                              'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}>
                              {npc.personalityArabic}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-black/60 text-zinc-400 border border-white/5">
                              {npc.genderArabic}
                            </span>
                          </div>

                          <p className="text-[10px] text-zinc-400 line-clamp-2 leading-tight">
                            {npc.specialty}
                          </p>

                          <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
                            <span className="text-zinc-500 text-[10px]">الكاش:</span>
                            <span className="font-bold text-emerald-400">{formatMoney(npc.cash)}</span>
                          </div>
                        </div>
                      </div>

                      {/* زر فتح الملف والتفاعل */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNpc(npc);
                          setActiveTab('chat');
                        }}
                        className={`w-full mt-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                        }`}
                      >
                        <UserCheck size={12} />
                        {isSelected ? 'الملف مفتوح حالياً' : 'فتح الملف والتفاعل'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ساحة الأزقة الحية (الرادار التفاعلي) */
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between relative min-h-[500px] overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                  <MapPin className="w-4 h-4 text-red-500" />
                  أزقة بغداد السرية - رادار الشخصيات الحية ({filteredNpcs.length} متواجدون الآن)
                </div>
                <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  محاكاة حركة وأموال حية
                </span>
              </div>

              {/* أرضية الخريطة الحية مع مواقع الشخصيات */}
              <div className="relative w-full h-[400px] bg-zinc-900/40 border border-zinc-800/80 rounded-xl overflow-hidden backdrop-blur-sm">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-zinc-800/60" />
                <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-zinc-800/60" />

                <div className="absolute top-3 right-3 text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
                  قطاع البتاوين والشورجة
                </div>
                <div className="absolute bottom-3 left-3 text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
                  الرصيف النهري للكرخ
                </div>

                {filteredNpcs.map((npc) => {
                  const isSelected = selectedNpc?.id === npc.id;
                  const isProtector = activeProtector?.id === npc.id;

                  return (
                    <motion.div
                      key={npc.id}
                      animate={{ left: `${npc.x}%`, top: `${npc.y}%` }}
                      transition={{ duration: 4.8, ease: 'easeInOut' }}
                      onClick={() => {
                        setSelectedNpc(npc);
                        setActiveTab('chat');
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
                    >
                      <div className="relative flex flex-col items-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 whitespace-nowrap px-2.5 py-0.5 bg-black/90 border border-zinc-700 rounded-lg text-[10px] text-zinc-200 pointer-events-none shadow-xl z-30">
                          {npc.name} ({formatMoney(npc.cash)})
                        </div>

                        <div className={`w-11 h-11 rounded-full border-2 overflow-hidden transition-all shadow-lg ${
                          isProtector
                            ? 'border-blue-500 scale-125 ring-4 ring-blue-500/30'
                            : isSelected 
                              ? 'border-red-500 scale-125 ring-4 ring-red-500/30' 
                              : 'border-zinc-700 hover:border-zinc-400 group-hover:scale-110'
                        }`}>
                          <img 
                            src={npc.image} 
                            alt={npc.name} 
                            className="w-full h-full object-cover" 
                          />
                        </div>

                        <span className={`w-2.5 h-2.5 rounded-full absolute -bottom-1 border border-zinc-950 ${
                          isProtector ? 'bg-blue-400 animate-pulse' :
                          npc.activity === 'fighting' ? 'bg-red-500 animate-ping' :
                          npc.activity === 'trading' ? 'bg-emerald-500' :
                          npc.activity === 'talking' ? 'bg-blue-500' : 'bg-amber-500'
                        }`} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <p className="text-[11px] text-zinc-500 mt-3 text-center">
                انقر على أي شخصية لمشاهدة تفاصيلها وتكبير صورتها والتفاعل معها.
              </p>
            </div>
          )}
        </div>

        {/* لوحة تفاصيل وتفاعل الـ NPC المختار (ملف الشخصية) */}
        <div className="lg:col-span-6 bg-zinc-950 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
          {selectedNpc ? (
            <div className="space-y-5">
              {/* ترويسة الشخصية مع صورة 3/4 قابلة للنقر والتكبير */}
              <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3.5">
                  {/* صورة الشخصية مع تلميح التكبير الفوري */}
                  <div 
                    onClick={() => setEnlargedNpc(selectedNpc)}
                    className="relative cursor-pointer group"
                    title="انقر لتكبير صورة الشخصية لأكبر حجم 🔍"
                  >
                    <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-2xl border-2 border-emerald-500/40 group-hover:border-emerald-400 overflow-hidden shrink-0 shadow-xl transition-all relative">
                      <img src={selectedNpc.image} alt={selectedNpc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn size={20} className="text-white drop-shadow-lg" />
                      </div>
                    </div>
                    <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-black/90 border border-emerald-500/40 rounded-full text-[9px] font-bold text-emerald-300 flex items-center gap-0.5 shadow-md">
                      <Maximize2 size={9} />
                      تكبير
                    </span>
                    {activeProtector?.id === selectedNpc.id && (
                      <span className="absolute -top-1 -right-1 p-1 bg-blue-600 rounded-full text-white shadow-md border border-zinc-900" title="حمايتك الشخصية">
                        <ShieldCheck size={12} />
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      {selectedNpc.name}
                      <span className="text-[11px] text-zinc-400 font-normal">"{selectedNpc.nickname}"</span>
                    </h3>
                    <div className="text-xs font-semibold flex items-center gap-2 mt-0.5">
                      <span className={PERSONALITY_METADATA[selectedNpc.personality].color}>
                        {selectedNpc.personalityArabic}
                      </span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-amber-400 text-[11px]">{selectedNpc.specialty}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-medium border border-zinc-700">
                        {selectedNpc.district}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-medium border border-zinc-700">
                        {selectedNpc.genderArabic}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 ${MOOD_METADATA[selectedNpc.mood].color}`}>
                        مزاج: {selectedNpc.moodArabic}
                      </span>
                    </div>
                  </div>
                </div>

                {/* كاش ومحفظة الـ NPC الحقيقية */}
                <div className="text-left font-mono">
                  <span className="text-[10px] text-zinc-500 block">كاش المحفظة الحية</span>
                  <span className="text-sm font-black text-emerald-400">{formatMoney(selectedNpc.cash)}</span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">أموال حقيقية تتأثر بالصفقات</span>
                </div>
              </div>

              {/* مقاييس العلاقة الأربعة المتقدمة (مودة، ثقة، احترام، خلاف) */}
              <div className="p-3.5 bg-zinc-900/90 rounded-2xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-zinc-800 pb-2">
                  <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                    مؤشرات العلاقة والرتبة:
                    <span className="text-amber-400 font-black ms-1">
                      {selectedNpc.friendshipRank}
                    </span>
                  </span>
                  <span className="font-mono text-emerald-400 font-bold text-[11px]">
                    خصم تجاري {NPCEngine.calculateDiscount(selectedNpc.friendship)}%
                  </span>
                </div>

                {/* شبكة المقاييس الأربعة */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                  {/* 1. المودة */}
                  <div className="p-2 bg-black/40 rounded-xl border border-zinc-800/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 flex items-center gap-1">
                        <Heart size={12} className="text-pink-400" />
                        المودة
                      </span>
                      <span className="font-mono font-bold text-pink-400">{selectedNpc.affection || 20}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                      <div className="h-full bg-pink-500 rounded-full transition-all" style={{ width: `${selectedNpc.affection || 20}%` }} />
                    </div>
                  </div>

                  {/* 2. الثقة */}
                  <div className="p-2 bg-black/40 rounded-xl border border-zinc-800/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 flex items-center gap-1">
                        <ShieldCheck size={12} className="text-emerald-400" />
                        الثقة
                      </span>
                      <span className="font-mono font-bold text-emerald-400">{selectedNpc.trust || 15}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${selectedNpc.trust || 15}%` }} />
                    </div>
                  </div>

                  {/* 3. الاحترام */}
                  <div className="p-2 bg-black/40 rounded-xl border border-zinc-800/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 flex items-center gap-1">
                        <Award size={12} className="text-amber-400" />
                        الاحترام
                      </span>
                      <span className="font-mono font-bold text-amber-400">{selectedNpc.respect || 25}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${selectedNpc.respect || 25}%` }} />
                    </div>
                  </div>

                  {/* 4. الخلاف والعداوة */}
                  <div className="p-2 bg-black/40 rounded-xl border border-zinc-800/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 flex items-center gap-1">
                        <Flame size={12} className="text-red-400" />
                        الخلاف
                      </span>
                      <span className="font-mono font-bold text-red-400">{selectedNpc.conflict || 5}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                      <div className="h-full bg-red-600 rounded-full transition-all" style={{ width: `${selectedNpc.conflict || 5}%` }} />
                    </div>
                  </div>
                </div>

                {/* أزرار الإجراءات السريعة: إعطاء مال أو إبلاغ الشرطة */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-800/60 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-zinc-500 font-bold">إعطاء مال:</span>
                    <button
                      onClick={() => handleGiveCash(50000)}
                      className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-300 rounded-lg text-[10px] font-bold transition-all"
                      title="إعطاء 50 ألف دينار لرفع المودة والثقة"
                    >
                      +50,000 د.ع
                    </button>
                    <button
                      onClick={() => handleGiveCash(250000)}
                      className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-300 rounded-lg text-[10px] font-bold transition-all"
                      title="إعطاء 250 ألف دينار لرفع المودة والاحترام"
                    >
                      +250,000 د.ع
                    </button>
                    <button
                      onClick={() => handleGiveCash(1000000)}
                      className="px-2 py-1 bg-amber-950/60 hover:bg-amber-900 border border-amber-800/60 text-amber-300 rounded-lg text-[10px] font-bold transition-all"
                      title="إعطاء مليون دينار كاش ليصبح سنداً وعزيزاً"
                    >
                      +1,000,000 د.ع
                    </button>
                  </div>

                  <button
                    onClick={handleReportPolice}
                    className="flex items-center gap-1 px-2.5 py-1 bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-300 rounded-lg text-[10px] font-bold transition-all"
                    title="إبلاغ الشرطة عن نشاط مشبوه واستدعاء مفرزة تفتيش ومداهمة فورية"
                  >
                    <Siren size={12} className="text-red-400" />
                    إبلاغ الشرطة (مداهمة تكتيكية)
                  </button>
                </div>
              </div>

              {/* شريط الصحة والنشاط الحالي */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-red-500" />
                    الصحة الحالية
                  </span>
                  <span className="font-mono text-zinc-300 font-bold">
                    {selectedNpc.health} / {selectedNpc.maxHealth} HP
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                  <div 
                    className="h-full bg-red-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(0, Math.min(100, (selectedNpc.health / selectedNpc.maxHealth) * 100))}%` }}
                  />
                </div>
              </div>

              {/* كلام الـ NPC باللهجة العراقية */}
              <div className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-xl relative">
                <div className="text-xs font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  حوار {selectedNpc.name}:
                </div>
                <p className="text-xs text-zinc-200 leading-relaxed italic">
                  "{selectedNpc.statusText}"
                </p>
              </div>

              {/* أزرار التبويبات التفاعلية (7 خيارات غنية) */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 p-1 bg-zinc-900 rounded-xl border border-zinc-800 text-[10px]">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`py-2 rounded-lg font-bold transition-all ${
                    activeTab === 'chat' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  سوالف
                </button>
                <button
                  onClick={() => setActiveTab('trade')}
                  className={`py-2 rounded-lg font-bold transition-all ${
                    activeTab === 'trade' ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  تجارة
                </button>
                <button
                  onClick={() => setActiveTab('gift')}
                  className={`py-2 rounded-lg font-bold transition-all ${
                    activeTab === 'gift' ? 'bg-pink-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  هدايا
                </button>
                <button
                  onClick={() => setActiveTab('protect')}
                  className={`py-2 rounded-lg font-bold transition-all ${
                    activeTab === 'protect' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  حماية
                </button>
                <button
                  onClick={() => setActiveTab('brawl')}
                  className={`py-2 rounded-lg font-bold transition-all ${
                    activeTab === 'brawl' ? 'bg-red-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  عراك
                </button>
                <button
                  onClick={() => setActiveTab('gamble')}
                  className={`py-2 rounded-lg font-bold transition-all ${
                    activeTab === 'gamble' ? 'bg-purple-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  رهان
                </button>
                <button
                  onClick={() => setActiveTab('pickpocket')}
                  className={`py-2 rounded-lg font-bold transition-all ${
                    activeTab === 'pickpocket' ? 'bg-amber-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  نشل
                </button>
              </div>

              {/* محتوى التبويب المختار */}
              <div className="min-h-[200px] bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
                {/* 1. السوالف والدردشة + طلب سلفة */}
                {activeTab === 'chat' && (
                  <div className="space-y-3.5 text-xs">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <h4 className="font-bold text-zinc-300">سجل وسمات الشخصية:</h4>
                      <span className="text-[11px] text-amber-400 font-mono">
                        المزاج: {MOOD_METADATA[selectedNpc.mood].desc}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-black/40 rounded-lg border border-zinc-800">
                        <span className="text-zinc-500 block text-[10px]">العدوانية</span>
                        <span className="font-bold text-red-400">{selectedNpc.aggression}/10</span>
                      </div>
                      <div className="p-2 bg-black/40 rounded-lg border border-zinc-800">
                        <span className="text-zinc-500 block text-[10px]">الحذر من الشرطة</span>
                        <span className="font-bold text-yellow-400">{selectedNpc.caution}/10</span>
                      </div>
                      <div className="p-2 bg-black/40 rounded-lg border border-zinc-800">
                        <span className="text-zinc-500 block text-[10px]">الذكاء والخبرة</span>
                        <span className="font-bold text-cyan-400">{selectedNpc.intelligence}/10</span>
                      </div>
                    </div>

                    {/* خيار طلب سلفة سريعة */}
                    <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-white block">سلفة شوارع سريعة</span>
                        <span className="text-[11px] text-zinc-400 block">
                          متاحة للأصدقاء (سقف: {formatMoney(selectedNpc.loanAvailable || 50000)})
                        </span>
                      </div>
                      <button
                        onClick={handleAskLoan}
                        disabled={isProcessingLoan || selectedNpc.friendship < 40}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-colors shrink-0"
                      >
                        {isProcessingLoan ? 'جاري الصرف...' : 'طلب سلفة'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. التجارة المتطورة (شراء بضاعة متخصصة أو بيع) */}
                {activeTab === 'trade' && (
                  <div className="space-y-3 text-xs">
                    {/* محول الشراء والبيع */}
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setTradeMode('buy')}
                          className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                            tradeMode === 'buy' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          شراء من الـ NPC
                        </button>
                        <button
                          onClick={() => setTradeMode('sell')}
                          className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                            tradeMode === 'sell' ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          بيع للـ NPC كاش
                        </button>
                      </div>

                      <span className="text-[11px] text-emerald-400 font-mono">
                        خصم الصداقة: {NPCEngine.calculateDiscount(selectedNpc.friendship)}%
                      </span>
                    </div>

                    {tradeMode === 'buy' ? (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {selectedNpc.uniqueInventory.map(item => {
                          const discount = NPCEngine.calculateDiscount(selectedNpc.friendship);
                          const discountedPrice = Math.floor(item.price * (1 - discount / 100));

                          return (
                            <div 
                              key={item.id}
                              className="p-3 bg-black/50 rounded-xl border border-zinc-800 flex items-center justify-between gap-3"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-zinc-200">{item.name}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                                    {item.categoryArabic}
                                  </span>
                                </div>
                                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{item.desc}</p>
                              </div>

                              <button
                                onClick={() => handleBuyItem(item)}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold font-mono transition-colors shrink-0 flex flex-col items-center"
                              >
                                <span>شراء</span>
                                <span className="text-[10px] opacity-90">{formatMoney(discountedPrice)}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        <p className="text-[11px] text-zinc-400 mb-1">
                          يدفع {selectedNpc.name} كاش فوري من محفظته ({formatMoney(selectedNpc.cash)}):
                        </p>
                        {sellableItems.map(item => (
                          <div 
                            key={item.id}
                            className="p-3 bg-black/50 rounded-xl border border-zinc-800 flex items-center justify-between gap-3"
                          >
                            <div>
                              <span className="font-bold text-zinc-200">{item.name}</span>
                              <span className="text-[10px] text-zinc-400 block mt-0.5">
                                السعر المعروض: {formatMoney(item.buyPrice)}
                              </span>
                            </div>

                            <button
                              onClick={() => handleSellItem(item)}
                              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors shrink-0"
                            >
                              بيع واستلام كاش
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. نظام الهدايا وكسب الصداقة */}
                {activeTab === 'gift' && (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <h4 className="font-bold text-pink-400 flex items-center gap-1.5">
                        <Gift size={16} />
                        إهداء {selectedNpc.name} لكسب المحبة والسند:
                      </h4>
                      <span className="text-[11px] text-zinc-400">
                        الصداقة الحالية: {selectedNpc.friendship}%
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => handleSendGift('tea')}
                        disabled={isGifting}
                        className="p-3 bg-black/40 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-right transition-all flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-white block flex items-center gap-1.5">
                            <Coffee size={14} className="text-amber-500" />
                            جاي مهيل وسكاير سومر
                          </span>
                          <span className="text-[10px] text-zinc-400 block mt-0.5">+12% صداقة وألفة حارة</span>
                        </div>
                        <span className="text-emerald-400 font-mono font-bold">10K</span>
                      </button>

                      <button
                        onClick={() => handleSendGift('cash_small')}
                        disabled={isGifting}
                        className="p-3 bg-black/40 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-right transition-all flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-white block flex items-center gap-1.5">
                            <HandCoins size={14} className="text-emerald-400" />
                            إكرامية كاش خفيفة
                          </span>
                          <span className="text-[10px] text-zinc-400 block mt-0.5">+15% زيادة رصيد ومحبة</span>
                        </div>
                        <span className="text-emerald-400 font-mono font-bold">25K</span>
                      </button>

                      <button
                        onClick={() => handleSendGift('medical')}
                        disabled={isGifting}
                        className="p-3 bg-black/40 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-right transition-all flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-white block flex items-center gap-1.5">
                            <Heart size={14} className="text-rose-400" />
                            حقيبة إسعافات طبية
                          </span>
                          <span className="text-[10px] text-zinc-400 block mt-0.5">+22% تقدير عالي وإنقاذ</span>
                        </div>
                        <span className="text-emerald-400 font-mono font-bold">50K</span>
                      </button>

                      <button
                        onClick={() => handleSendGift('cash_large')}
                        disabled={isGifting}
                        className="p-3 bg-black/40 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-right transition-all flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-white block flex items-center gap-1.5">
                            <DollarSign size={14} className="text-amber-400" />
                            ظرف كاش حاتمي دسم
                          </span>
                          <span className="text-[10px] text-zinc-400 block mt-0.5">+35% أخوة وسند دائم</span>
                        </div>
                        <span className="text-emerald-400 font-mono font-bold">150K</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. نظام الحماية واستئجار السند */}
                {activeTab === 'protect' && (
                  <div className="space-y-3.5 text-xs">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <h4 className="font-bold text-blue-400 flex items-center gap-1.5">
                        <ShieldCheck size={16} />
                        نظام الحماية والسند الميداني:
                      </h4>
                      <span className="text-[11px] text-zinc-400">
                        {selectedNpc.friendship >= 70 ? 'حماية مجانية كأخو وسند' : `أجر التوظيف: ${formatMoney(selectedNpc.protectionCost)}`}
                      </span>
                    </div>

                    <div className="p-3 bg-black/40 rounded-xl border border-zinc-800 space-y-2">
                      <div className="flex items-center gap-2 text-zinc-200">
                        <Shield className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>امتصاص 35% من ضرر النزالات والشجارات في الشارع</span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-200">
                        <Swords className="w-4 h-4 text-red-400 shrink-0" />
                        <span>تسديد ضربات مساعدة مضادة للخصوم تلقائياً (+15 ضرر)</span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-200">
                        <Siren className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>تشتيت انتباه دوريات الشرطة وخفض خطر المداهمات بنسبة 25%</span>
                      </div>
                    </div>

                    <button
                      onClick={handleToggleProtector}
                      className={`w-full py-3 rounded-xl font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2 ${
                        activeProtector?.id === selectedNpc.id
                          ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white'
                      }`}
                    >
                      <UserCheck size={16} />
                      {activeProtector?.id === selectedNpc.id
                        ? 'إلغاء مرافقة الحماية'
                        : selectedNpc.friendship >= 70
                          ? 'طلب مرافقة مجانية (كأخوة وسند)'
                          : `توظيف ${selectedNpc.name} كحماية (${formatMoney(selectedNpc.protectionCost)})`}
                    </button>
                  </div>
                )}

                {/* 5. الشجار والعراك الجسدي المباشر */}
                {activeTab === 'brawl' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-red-400">نزال شوارع مباشر</span>
                      <span className="text-zinc-500">صحتك: {profile?.health || 100} HP</span>
                    </div>

                    {activeProtector && (
                      <div className="p-2 bg-blue-950/40 border border-blue-900/50 rounded-lg text-[11px] text-blue-300 flex items-center gap-2">
                        <ShieldCheck size={14} className="shrink-0" />
                        <span>حمايتك ({activeProtector.name}) جاهز للتدخل وامتصاص الضرر!</span>
                      </div>
                    )}

                    <button
                      disabled={isPunchCooldown || selectedNpc.health <= 0}
                      onClick={handlePunch}
                      className={`w-full py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
                        selectedNpc.health <= 0
                          ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          : isPunchCooldown 
                            ? 'bg-red-950 text-red-400 cursor-wait'
                            : 'bg-red-600 hover:bg-red-500 text-white shadow-lg active:scale-95'
                      }`}
                    >
                      <Swords className="w-4 h-4" />
                      {selectedNpc.health <= 0 
                        ? 'الخصم فاقد للوعي' 
                        : isPunchCooldown 
                          ? 'جاري تجهيز الضربة (انتظار)...' 
                          : 'تسديد لكمة قوية وسلب الكاش (Punch)'}
                    </button>

                    {/* سجل أحداث الشجار الأخير */}
                    {brawlLog.length > 0 && (
                      <div className="space-y-1 max-h-24 overflow-y-auto text-[11px] text-zinc-300 font-mono">
                        {brawlLog.map((log, i) => (
                          <div key={i} className="p-1.5 bg-black/40 rounded border border-zinc-800/80">
                            {log}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 6. الرهان والقمار المالي */}
                {activeTab === 'gamble' && (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-300">طرة لو كتبة (نرد الشارع)</span>
                      <span className="text-zinc-400">محفظة الـ NPC: {formatMoney(selectedNpc.cash)}</span>
                    </div>

                    {/* خيار طرة أو كتبة */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setBetChoice('heads')}
                        className={`py-2 rounded-lg font-bold border transition-all ${
                          betChoice === 'heads'
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        طرة (وجه)
                      </button>
                      <button
                        onClick={() => setBetChoice('tails')}
                        className={`py-2 rounded-lg font-bold border transition-all ${
                          betChoice === 'tails'
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        كتبة (ظهر)
                      </button>
                    </div>

                    {/* خيارات المبالغ السريعة */}
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      {[10000, 25000, 50000, 100000].map(amt => (
                        <button
                          key={amt}
                          onClick={() => setBetAmount(amt)}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono shrink-0 transition-colors ${
                            betAmount === amt 
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' 
                              : 'bg-zinc-900 text-zinc-400'
                          }`}
                        >
                          {amt.toLocaleString()}$
                        </button>
                      ))}
                    </div>

                    <button
                      disabled={isBetting || (profile?.cleanMoney || 0) < betAmount}
                      onClick={handlePlayBet}
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all disabled:opacity-40"
                    >
                      {isBetting ? 'الزار يركص...' : `تأكيد الرهان بـ (${formatMoney(betAmount)})`}
                    </button>
                  </div>
                )}

                {/* 7. النشل وسرقة الجيوب */}
                {activeTab === 'pickpocket' && (
                  <div className="space-y-3 text-xs">
                    <h4 className="font-bold text-amber-400">محاولة نشل محفظة {selectedNpc.name}:</h4>
                    <p className="text-zinc-400 leading-relaxed">
                      محفظته تحتوي على {formatMoney(selectedNpc.cash)}، ودرجة حذره ({selectedNpc.caution}/10). إذا فشلت، سيثور ويبدأ شجاراً فورياً!
                    </p>
                    <button
                      onClick={handlePickpocket}
                      className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-black transition-all active:scale-95 shadow-lg"
                    >
                      مد اليد وسرقة المحفظة خلسة
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500 space-y-3">
              <Users className="w-12 h-12 text-zinc-700" />
              <p className="text-xs">اختر إحدى الشخصيات من الخريطة لعرض ملفها والتفاعل معها.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )}

  {/* 2. مركز العمليات المتكامل (شحن، شراكات، PvP، سطو، مهارات) دون شريط تبويبات مكرر */}
  {['dispatch', 'partnerships', 'pvp', 'heists', 'skills'].includes(mainSubTab) && (
    <NPCOperationsHub 
      npcs={npcs} 
      skills={skills} 
      onSkillsUpdated={handleSkillsUpdated} 
      onArrestNpc={handleArrestNpc} 
      onEnlargeImage={(npc) => setEnlargedNpc(npc)} 
      activeTab={mainSubTab as any}
      onTabChange={(tab) => setMainSubTab(tab)}
      hideTabBar={true} 
    />
  )}

  {/* 3. سجن أزقة الخفاء للمساجين والمداهمات والكفالات */}
  {mainSubTab === 'prison' && (
    <UndergroundPrison 
      inmates={inmates} 
      skills={skills} 
      onInmateReleased={handleInmateReleased} 
      onEnlargeImage={(npc) => setEnlargedNpc(npc)} 
    />
  )}

  {/* 4. قسم غسيل وتبييض الأموال (واجهات تجارية وتحويل الكاش القذر) */}
  {mainSubTab === 'laundering' && (
    <MoneyLaunderingHub />
  )}

      {/* نافذة تكبير صورة شخصية الـ NPC لأكبر حجم 3/4 مع التفاصيل الكاملة */}
      {enlargedNpc && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={() => {
            setEnlargedNpc(null);
            setEnlargedZoom(1);
          }}
        >
          <div 
            className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ترويسة نافذة التكبير */}
            <div className="flex items-center justify-between p-4 bg-zinc-900/90 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-zinc-700 shrink-0">
                  <img src={enlargedNpc.image} alt={enlargedNpc.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-white">{enlargedNpc.name}</h3>
                    <span className="text-xs text-zinc-400 font-bold">"{enlargedNpc.nickname}"</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      enlargedNpc.personality === 'poor' ? 'bg-zinc-800 text-zinc-300 border-zinc-700' :
                      enlargedNpc.personality === 'wealthy' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                      enlargedNpc.personality === 'worker' ? 'bg-teal-500/20 text-teal-300 border-teal-500/30' :
                      enlargedNpc.personality === 'aggressive' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                      'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {enlargedNpc.personalityArabic}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold">
                      {enlargedNpc.genderArabic}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{enlargedNpc.specialty}</p>
                </div>
              </div>

              {/* أدوات التحكم وإغلاق نافذة التكبير */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEnlargedZoom(prev => Math.min(2.5, prev + 0.25))}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs transition-colors"
                  title="تقريب +"
                >
                  <ZoomIn size={16} />
                </button>
                <span className="text-xs font-mono font-bold text-zinc-300 px-1">
                  {Math.round(enlargedZoom * 100)}%
                </span>
                <button
                  onClick={() => setEnlargedZoom(prev => Math.max(1, prev - 0.25))}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs transition-colors"
                  title="تصغير -"
                >
                  <ZoomOut size={16} />
                </button>
                <button
                  onClick={() => setEnlargedZoom(1)}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs transition-colors"
                  title="إعادة ضبط"
                >
                  <RotateCcw size={16} />
                </button>

                <button
                  onClick={() => {
                    setEnlargedNpc(null);
                    setEnlargedZoom(1);
                  }}
                  className="p-2 bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-300 rounded-xl transition-colors ms-2"
                  title="إغلاق (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* مساحة عرض الصورة المكبرة بنسبة 3/4 الأصلية عالية الدقة */}
            <div className="flex-1 overflow-auto bg-black p-3 sm:p-5 flex items-center justify-center">
              <div 
                className="relative aspect-[3/4] max-h-[60vh] sm:max-h-[65vh] w-auto rounded-2xl overflow-hidden shadow-2xl border border-zinc-800/80 transition-transform duration-200"
                style={{
                  transform: `scale(${enlargedZoom})`,
                  transformOrigin: 'center center'
                }}
              >
                <img 
                  src={enlargedNpc.image} 
                  alt={enlargedNpc.name} 
                  className="w-full h-full object-contain select-none"
                />
              </div>
            </div>

            {/* ذيل نافذة التكبير مع تفاصيل الشخصية وزر التفاعل */}
            <div className="p-4 bg-zinc-900/90 border-t border-zinc-800 shrink-0 space-y-2.5">
              <div className="p-2.5 bg-zinc-950/90 rounded-xl border border-zinc-800 text-xs italic text-zinc-300 text-center">
                "{enlargedNpc.statusText}"
              </div>
              <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400 font-bold">المنطقة: <span className="text-white">{enlargedNpc.district}</span></span>
                  <span className="text-zinc-400 font-bold">محفظة الكاش: <span className="text-emerald-400 font-mono font-black">{formatMoney(enlargedNpc.cash)}</span></span>
                </div>
                <button
                  onClick={() => {
                    setSelectedNpc(enlargedNpc);
                    setEnlargedNpc(null);
                    setEnlargedZoom(1);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs transition-all shadow-md flex items-center gap-1.5"
                >
                  <UserCheck size={14} />
                  فتح الملف والتفاعل مع الشخصية
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
