import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Store, 
  Plane, 
  ShoppingBag, 
  Building2, 
  ArrowRightLeft, 
  ShieldCheck, 
  Sparkles, 
  Coins, 
  TrendingUp, 
  AlertTriangle, 
  History, 
  CheckCircle2, 
  ChevronRight, 
  Percent, 
  Zap, 
  Clock, 
  Lock, 
  ArrowDownRight,
  Info,
  DollarSign,
  Briefcase
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { formatMoney } from '../../lib/utils';
import { toast } from 'sonner';
import { soundEngine } from '../../services/soundEngine';

export interface FrontBusiness {
  id: string;
  name: string;
  tier: number;
  price: number;
  baseCut: number; // Base percentage deducted (e.g., 35% for Supermarket, 15% for Holding Company)
  upgradeCost: number; // Cost per upgrade level
  maxLevel: number;
  description: string;
  features: string[];
  icon: React.ElementType;
  color: string;
  borderColor: string;
  gradient: string;
  badge: string;
}

export const LAUNDERING_FRONTS: FrontBusiness[] = [
  {
    id: 'supermarket',
    name: 'سوبر ماركت الحارة',
    tier: 1,
    price: 2000000, // 2 مليون
    baseCut: 35, // 35%
    upgradeCost: 500000, // 500 ألف لكل مستوى
    maxLevel: 5,
    description: 'واجهة تجارية محلية تعتمد على فواتير المواد الاستهلاكية وحركة الزبائن اليومية لتدوير الكاش.',
    features: [
      'فواتير كاش متكررة صغيرة ومتوسطة',
      'نسبة خصم تبدأ من 35% وتنخفض مع الترقية',
      'تكلفة صيانة منخفضة وسهولة إدارة'
    ],
    icon: Store,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/40 hover:border-emerald-500',
    gradient: 'from-emerald-950/40 via-zinc-900 to-zinc-950',
    badge: 'واجهة المستوى 1'
  },
  {
    id: 'travel_agency',
    name: 'شركة سياحة وسفر دولية',
    tier: 2,
    price: 6000000, // 6 مليون
    baseCut: 28, // 28%
    upgradeCost: 1200000, // 1.2 مليون لكل مستوى
    maxLevel: 5,
    description: 'تذاكر طيران خارجية وحجوزات فنادق عابرة للحدود تتيح تدوير مبالغ أكبر بمرونة وأمان أعلى.',
    features: [
      'حوالات خارجية وتذاكر سفر دولية وهمية',
      'نسبة خصم تبدأ من 28% وتنخفض مع الترقية',
      'تمويه ذكي يقلل من شبهات الشرطة والرقابة'
    ],
    icon: Plane,
    color: 'text-sky-400',
    borderColor: 'border-sky-500/40 hover:border-sky-500',
    gradient: 'from-sky-950/40 via-zinc-900 to-zinc-950',
    badge: 'واجهة المستوى 2'
  },
  {
    id: 'mall',
    name: 'مول تجاري وسنتر تسوق',
    tier: 3,
    price: 14000000, // 14 مليون
    baseCut: 21, // 21%
    upgradeCost: 2500000, // 2.5 مليون لكل مستوى
    maxLevel: 5,
    description: 'عشرات المتاجر وبوتيكات الماركات الفاخرة وإيجارات شهرية تبتلع ملايين الكاش بضمانات معتمدة.',
    features: [
      'سيولة نقدية ضخمة عبر عشرات المتاجر والمطاعم',
      'نسبة خصم تبدأ من 21% وتنخفض مع الترقية',
      'قدرة استيعابية واسعة لأموال العمليات الكبرى'
    ],
    icon: ShoppingBag,
    color: 'text-purple-400',
    borderColor: 'border-purple-500/40 hover:border-purple-500',
    gradient: 'from-purple-950/40 via-zinc-900 to-zinc-950',
    badge: 'واجهة المستوى 3'
  },
  {
    id: 'holding_company',
    name: 'شركة قابضة ومحافظ استثمار',
    tier: 4,
    price: 30000000, // 30 مليون
    baseCut: 15, // 15% (User requirement: حتى 15% شركة قابضة)
    upgradeCost: 5000000, // 5 مليون لكل مستوى
    maxLevel: 5,
    description: 'أعلى وأرقى واجهة مالية؛ شركات ومحافظ وأسهم قابضة تبيض الملايين بأدنى نسبة عمولة في عالم الخفاء.',
    features: [
      'هياكل شركات قابضة وملاذات مالية معقدة',
      'أقل نسبة خصم تبدأ من 15% وتصل إلى 11%',
      'تبييض مالي فوري بأعلى المعايير دون قيود'
    ],
    icon: Building2,
    color: 'text-amber-400',
    borderColor: 'border-amber-500/40 hover:border-amber-500',
    gradient: 'from-amber-950/40 via-zinc-900 to-zinc-950',
    badge: 'الواجهة الأرقى (Tier 4)'
  }
];

export const MoneyLaunderingHub: React.FC = () => {
  const { profile, updateProfile } = useAuthStore();
  const [launderAmount, setLaunderAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'terminal' | 'fronts' | 'history'>('terminal');

  const dirtyMoney = profile?.dirtyMoney || 0;
  const cleanMoney = profile?.cleanMoney || 0;

  // Retrieve user's laundering state
  const launderingData = profile?.laundering || {
    activeFrontId: '',
    fronts: {},
    history: []
  };

  const activeFrontConfig = LAUNDERING_FRONTS.find(f => f.id === launderingData.activeFrontId);
  const activeFrontState = launderingData.fronts[launderingData.activeFrontId];

  // Calculate current effective laundering fee for a front
  const getEffectiveCut = (front: FrontBusiness, level = 1): number => {
    // Each level beyond level 1 reduces cut by 1%
    let cut = front.baseCut - (Math.max(1, level) - 1) * 1;
    // Trader Tax Evasion perk (-15% fee per level)
    const traderTaxLvl = profile?.roleSkills?.skills?.['trader_tax_evasion'] || 0;
    if (traderTaxLvl > 0) {
      cut = Math.floor(cut * (1 - (traderTaxLvl * 0.15)));
    }
    return Math.max(3, cut);
  };

  const traderTaxLvl = profile?.roleSkills?.skills?.['trader_tax_evasion'] || 0;
  const defaultCut = traderTaxLvl > 0 ? Math.floor(45 * (1 - (traderTaxLvl * 0.15))) : 45;

  const currentCutPercent = activeFrontConfig 
    ? getEffectiveCut(activeFrontConfig, activeFrontState?.level || 1)
    : defaultCut; // Default penalty cut if no front business owned

  // Amount calculation
  const numericAmount = Math.max(0, parseInt(launderAmount.replace(/,/g, ''), 10) || 0);
  const feeAmount = Math.floor(numericAmount * (currentCutPercent / 100));
  const cleanReceived = numericAmount - feeAmount;

  // Handle purchasing a front business
  const handleBuyFront = async (front: FrontBusiness) => {
    if (!profile) return;
    if (cleanMoney < front.price) {
      toast.error(`تحتاج إلى ${formatMoney(front.price)} من الأموال النظيفة لشراء هذه الواجهة!`);
      return;
    }

    try {
      const updatedFronts = {
        ...(launderingData.fronts || {}),
        [front.id]: {
          owned: true,
          level: 1,
          totalLaundered: 0,
          lastLaunderedAt: Date.now()
        }
      };

      const newActiveFrontId = launderingData.activeFrontId || front.id;

      await updateProfile({
        cleanMoney: cleanMoney - front.price,
        laundering: {
          ...launderingData,
          activeFrontId: newActiveFrontId,
          fronts: updatedFronts
        }
      });

      toast.success(`تم شراء واجهة "${front.name}" بنجاح! جاهزة الآن لغسيل الأموال.`);
    } catch (error) {
      toast.error('حدث خطأ أثناء إتمام عملية الشراء');
    }
  };

  // Handle setting active front
  const handleSetActiveFront = async (frontId: string) => {
    if (!profile) return;
    try {
      await updateProfile({
        laundering: {
          ...launderingData,
          activeFrontId: frontId
        }
      });
      const front = LAUNDERING_FRONTS.find(f => f.id === frontId);
      toast.success(`تم اعتماد "${front?.name}" كواجهتك الرسمية لغسيل الأموال`);
    } catch (error) {
      toast.error('فشل في تعيين الواجهة');
    }
  };

  // Handle upgrading a front business
  const handleUpgradeFront = async (front: FrontBusiness) => {
    if (!profile) return;
    const currentFrontState = launderingData.fronts[front.id];
    const currentLevel = currentFrontState?.level || 1;

    if (currentLevel >= front.maxLevel) {
      toast.info('هذه الواجهة وصلت إلى أقصى مستوى من التطوير (المستوى 5)');
      return;
    }

    if (cleanMoney < front.upgradeCost) {
      toast.error(`تكلفة ترقية المستوى هي ${formatMoney(front.upgradeCost)} من الأموال النظيفة!`);
      return;
    }

    try {
      const nextLevel = currentLevel + 1;
      const updatedFronts = {
        ...(launderingData.fronts || {}),
        [front.id]: {
          ...currentFrontState,
          level: nextLevel
        }
      };

      await updateProfile({
        cleanMoney: cleanMoney - front.upgradeCost,
        laundering: {
          ...launderingData,
          fronts: updatedFronts
        }
      });

      const newCut = getEffectiveCut(front, nextLevel);
      toast.success(`تمت ترقية "${front.name}" إلى المستوى ${nextLevel}! انخفضت نسبة العمولة إلى ${newCut}%.`);
    } catch (error) {
      toast.error('حدث خطأ أثناء ترقية الواجهة');
    }
  };

  // Execute Money Laundering Operation
  const handleExecuteLaundering = async () => {
    if (!profile) return;
    if (numericAmount <= 0) {
      toast.error('يرجى تحديد المبلغ المراد غسيله');
      return;
    }

    if (numericAmount > dirtyMoney) {
      toast.error('لا تملك هذا المبلغ الكافي من الأموال القذرة!');
      return;
    }

    if (!activeFrontConfig) {
      toast.error('يجب عليك امتلاك واجهة تجارية أولاً للبدء بغسيل الأموال!');
      setActiveTab('fronts');
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate real underground transaction processing delay
      await new Promise(r => setTimeout(r, 1000));

      const newDirtyMoney = Math.max(0, dirtyMoney - numericAmount);
      const newCleanMoney = cleanMoney + cleanReceived;

      const currentFrontState = launderingData.fronts[activeFrontConfig.id] || {
        owned: true,
        level: 1,
        totalLaundered: 0
      };

      const updatedFronts = {
        ...(launderingData.fronts || {}),
        [activeFrontConfig.id]: {
          ...currentFrontState,
          totalLaundered: (currentFrontState.totalLaundered || 0) + cleanReceived,
          lastLaunderedAt: Date.now()
        }
      };

      const newHistoryRecord = {
        id: 'wash_' + Date.now().toString(36),
        frontId: activeFrontConfig.id,
        frontName: activeFrontConfig.name,
        dirtyAmount: numericAmount,
        cleanAmount: cleanReceived,
        feeAmount: feeAmount,
        feePercent: currentCutPercent,
        timestamp: Date.now()
      };

      const updatedHistory = [newHistoryRecord, ...(launderingData.history || [])].slice(0, 20);

      await updateProfile({
        dirtyMoney: newDirtyMoney,
        cleanMoney: newCleanMoney,
        laundering: {
          ...launderingData,
          fronts: updatedFronts,
          history: updatedHistory
        }
      });

      soundEngine.playCashSound();
      setLaunderAmount('');
      toast.success(
        `تم تبييض ${formatMoney(numericAmount)} أموال قذرة! استلمت ${formatMoney(cleanReceived)} نقداً نظيفاً في رصيدك (الخصم: ${currentCutPercent}%).`
      );
    } catch (error) {
      toast.error('تعثرت عملية الغسيل، يرجى المحاولة لاحقاً');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner / Financial Overview */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-amber-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs font-black">
              <Coins size={14} className="animate-spin-slow" />
              <span>قسم غسيل وتبييض الأموال (عالم الخفاء)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
              <span>تحويل الأموال القذرة إلى أموال رسمية</span>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
                السوق السوداء
              </span>
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
              استخدم واجهات الأعمال المشروعة لتدوير عائدات الجرائم والسرقات إلى كاش نظيف قابل للاستثمار والشراء دون شبهات أمنية.
            </p>
          </div>

          {/* Quick Balances */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="bg-red-950/20 border border-red-500/30 rounded-2xl p-4 min-w-[140px] text-center">
              <span className="text-[11px] font-bold text-red-400 block mb-1">الأموال القذرة الحالية</span>
              <span className="text-lg sm:text-xl font-black text-red-300 font-mono">
                {formatMoney(dirtyMoney)}
              </span>
            </div>
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 min-w-[140px] text-center">
              <span className="text-[11px] font-bold text-emerald-400 block mb-1">الأموال النظيفة</span>
              <span className="text-lg sm:text-xl font-black text-emerald-300 font-mono">
                {formatMoney(cleanMoney)}
              </span>
            </div>
          </div>
        </div>

        {/* Active Front Status Bar */}
        <div className="mt-6 pt-5 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-amber-400">
              <Briefcase size={18} />
            </div>
            <div>
              <span className="text-[11px] text-zinc-500 font-bold block">الواجهة المعتمدة حالياً:</span>
              <span className="text-sm font-black text-white">
                {activeFrontConfig ? activeFrontConfig.name : 'لا توجد واجهة معتمدة بعد'}
              </span>
            </div>
          </div>

          {activeFrontConfig && (
            <div className="flex items-center gap-4">
              <div className="text-center sm:text-right">
                <span className="text-[10px] text-zinc-500 font-bold block">المستوى الحالي</span>
                <span className="text-xs font-black text-amber-400">
                  المستوى {activeFrontState?.level || 1} / 5
                </span>
              </div>
              <div className="text-center sm:text-right">
                <span className="text-[10px] text-zinc-500 font-bold block">نسبة الخصم الصافية</span>
                <span className="text-sm font-black text-rose-400 font-mono">
                  {currentCutPercent}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('terminal')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all ${
            activeTab === 'terminal'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40 border border-amber-400/40'
              : 'bg-zinc-900/70 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <ArrowRightLeft size={16} />
          <span>منصة الغسيل الفوري</span>
        </button>

        <button
          onClick={() => setActiveTab('fronts')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all ${
            activeTab === 'fronts'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40 border border-amber-400/40'
              : 'bg-zinc-900/70 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <Store size={16} />
          <span>واجهات غسيل الأموال (4)</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all ${
            activeTab === 'history'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40 border border-amber-400/40'
              : 'bg-zinc-900/70 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <History size={16} />
          <span>سجل التبييض</span>
        </button>
      </div>

      {/* TAB 1: TERMINAL / LAUNDERING OPERATION */}
      {activeTab === 'terminal' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Action Box */}
          <div className="lg:col-span-7 bg-zinc-950/80 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
                  <Coins size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">إجراء تحويل وتبييض الكاش</h3>
                  <p className="text-xs text-zinc-500">اختر المبلغ الذي ترغب في تحويله من أموالك القذرة</p>
                </div>
              </div>
              <div className="text-left">
                <span className="text-[10px] text-zinc-500 block">العمولة الحالية</span>
                <span className="text-base font-black text-rose-400 font-mono">{currentCutPercent}%</span>
              </div>
            </div>

            {/* Input Amount */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-zinc-400">
                مبلغ الأموال القذرة المراد غسيلها ($):
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={launderAmount}
                  onChange={(e) => setLaunderAmount(e.target.value)}
                  placeholder="0"
                  max={dirtyMoney}
                  min={0}
                  className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-4 text-xl sm:text-2xl font-black text-white font-mono placeholder:text-zinc-700 focus:border-amber-500 focus:outline-none transition-all"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
                  كاش قذر
                </span>
              </div>

              {/* Quick % buttons */}
              <div className="flex items-center gap-2 pt-1">
                {[0.25, 0.5, 0.75, 1].map((pct) => {
                  const targetVal = Math.floor(dirtyMoney * pct);
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setLaunderAmount(String(targetVal))}
                      className="flex-1 py-2 rounded-xl text-xs font-black bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/5 transition-all"
                    >
                      {pct === 1 ? 'كامل المبلغ' : `${pct * 100}%`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Real-Time Mathematical Breakdown */}
            <div className="bg-black/50 border border-white/5 rounded-2xl p-5 space-y-3 font-mono">
              <div className="flex items-center justify-between text-xs sm:text-sm text-zinc-400">
                <span>المبلغ القذر المدخل:</span>
                <span className="font-bold text-red-400">{formatMoney(numericAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-xs sm:text-sm text-zinc-400">
                <span>نسبة عمولة الواجهة ({currentCutPercent}%):</span>
                <span className="font-bold text-rose-500">-{formatMoney(feeAmount)}</span>
              </div>
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-sm sm:text-base font-black text-white">
                <span className="text-zinc-300">صافي الأموال النظيفة المستلمة:</span>
                <span className="text-emerald-400 text-lg sm:text-xl font-bold">
                  +{formatMoney(cleanReceived)}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleExecuteLaundering}
              disabled={isProcessing || numericAmount <= 0 || numericAmount > dirtyMoney || !activeFrontConfig}
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition-all shadow-xl ${
                !activeFrontConfig
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : numericAmount <= 0 || numericAmount > dirtyMoney
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black shadow-amber-900/30 active:scale-[0.98]'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>جاري تبييض الأموال عبر الواجهة...</span>
                </>
              ) : !activeFrontConfig ? (
                <>
                  <Lock size={18} />
                  <span>يلزم اختيار واجهة غسيل أولاً</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>بدء غسيل الأموال الآن (+{formatMoney(cleanReceived)})</span>
                </>
              )}
            </button>
          </div>

          {/* Side Info & Tips */}
          <div className="lg:col-span-5 space-y-6">
            {/* Active Front Details Card */}
            {activeFrontConfig ? (
              <div className={`rounded-3xl p-6 border ${activeFrontConfig.borderColor} bg-gradient-to-br ${activeFrontConfig.gradient} shadow-xl space-y-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl bg-black/40 ${activeFrontConfig.color}`}>
                      <activeFrontConfig.icon size={24} />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 font-bold block">{activeFrontConfig.badge}</span>
                      <h4 className="text-base font-black text-white">{activeFrontConfig.name}</h4>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold">
                    نشطة حالياً
                  </span>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  {activeFrontConfig.description}
                </p>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
                  <div className="bg-black/30 p-2.5 rounded-xl text-center">
                    <span className="text-[10px] text-zinc-500 block">مستوى الواجهة</span>
                    <span className="font-black text-white">⭐️ المستوى {activeFrontState?.level || 1}</span>
                  </div>
                  <div className="bg-black/30 p-2.5 rounded-xl text-center">
                    <span className="text-[10px] text-zinc-500 block">العمولة الصافية</span>
                    <span className="font-black text-amber-400">{currentCutPercent}%</span>
                  </div>
                </div>

                {/* Upgrade Button */}
                {(activeFrontState?.level || 1) < activeFrontConfig.maxLevel ? (
                  <button
                    onClick={() => handleUpgradeFront(activeFrontConfig)}
                    className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 border border-white/10"
                  >
                    <TrendingUp size={14} className="text-amber-400" />
                    <span>ترقية إلى المستوى {(activeFrontState?.level || 1) + 1} ({formatMoney(activeFrontConfig.upgradeCost)})</span>
                  </button>
                ) : (
                  <div className="py-2.5 text-center text-xs font-bold text-amber-400/80 bg-amber-500/10 rounded-xl border border-amber-500/20">
                    تم الوصول إلى الحد الأقصى للمستوى (Max Level)
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-3xl p-6 border border-dashed border-amber-500/30 bg-amber-500/5 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                  <Store size={28} />
                </div>
                <div>
                  <h4 className="text-base font-black text-white">لا تمتلك واجهة غسيل معتمدة</h4>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                    لتحويل أموالك القذرة بأمان وبأقل نسبة عمولة، توجه إلى قائمة الواجهات واختر سوبر ماركت أو شركة قابضة.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('fronts')}
                  className="px-6 py-2.5 bg-amber-500 text-black font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-all"
                >
                  استعراض واجهات غسيل الأموال
                </button>
              </div>
            )}

            {/* Rules and Explanation */}
            <div className="bg-zinc-950/60 border border-white/5 rounded-3xl p-5 space-y-3">
              <h4 className="text-xs font-black text-white flex items-center gap-2">
                <Info size={16} className="text-amber-400" />
                <span>قوانين تبييض الأموال في المدينة:</span>
              </h4>
              <ul className="text-[11px] text-zinc-400 space-y-2 list-disc list-inside leading-relaxed">
                <li>الواجهات الأغلى سعراً تقدم أدنى نسبة خصم للعمولة (من 35% إلى 15%).</li>
                <li>كل واجهة تحتوي على 5 مستويات ترقية؛ كل ترقية تقلل العمولة بنسبة 1% إضافية.</li>
                <li>الأموال النظيفة الناتجة تودع مباشرة في رصيدك الكاش وتكون آمنة من تفتيش ومداهمات الشرطة.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FRONTS SHOWCASE & UPGRADES */}
      {activeTab === 'fronts' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Store className="text-amber-400" size={22} />
                <span>واجهات غسيل الأموال المتاحة (التدرج من المستوى 1 إلى 4)</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                كل واجهة أعلى سعراً تقدم عمولة أقل ونسبة خصم أفضل لأموالك القذرة
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {LAUNDERING_FRONTS.map((front) => {
              const frontState = launderingData.fronts[front.id];
              const isOwned = !!frontState?.owned;
              const isActive = launderingData.activeFrontId === front.id;
              const level = frontState?.level || 1;
              const effectiveCut = getEffectiveCut(front, level);
              const canAfford = cleanMoney >= front.price;
              const canAffordUpgrade = cleanMoney >= front.upgradeCost;

              return (
                <div
                  key={front.id}
                  className={`relative rounded-3xl border ${front.borderColor} bg-gradient-to-br ${front.gradient} p-6 flex flex-col justify-between space-y-5 transition-all shadow-xl group`}
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-3.5 rounded-2xl bg-black/40 ${front.color} border border-white/5`}>
                          <front.icon size={26} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-zinc-300 font-bold">
                              {front.badge}
                            </span>
                            {isActive && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
                                الواجهة النشطة
                              </span>
                            )}
                          </div>
                          <h4 className="text-lg font-black text-white mt-1">{front.name}</h4>
                        </div>
                      </div>

                      {/* Percentage Badge */}
                      <div className="text-left bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                        <span className="text-[10px] text-zinc-500 block">نسبة الخصم</span>
                        <span className="text-base font-black text-rose-400 font-mono">
                          {isOwned ? `${effectiveCut}%` : `${front.baseCut}%`}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {front.description}
                    </p>

                    {/* Features List */}
                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                      {front.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[11px] text-zinc-400">
                          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>

                    {/* Level / Upgrade Progress if owned */}
                    {isOwned && (
                      <div className="bg-black/40 rounded-2xl p-4 border border-white/5 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-zinc-400">مستوى الواجهة والتطوير:</span>
                          <span className="text-amber-400">المستوى {level} / {front.maxLevel}</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                            style={{ width: `${(level / front.maxLevel) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-1">
                          <span>الخصم الحالي: {effectiveCut}%</span>
                          {level < front.maxLevel && (
                            <span className="text-emerald-400 font-bold">
                              المستوى القادم: {effectiveCut - 1}% (-1%)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Area */}
                  <div className="pt-4 border-t border-white/10 space-y-2">
                    {!isOwned ? (
                      <button
                        onClick={() => handleBuyFront(front)}
                        disabled={!canAfford}
                        className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                          canAfford
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-lg shadow-amber-900/30'
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        <Coins size={16} />
                        <span>شراء الواجهة ({formatMoney(front.price)})</span>
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {!isActive ? (
                          <button
                            onClick={() => handleSetActiveFront(front.id)}
                            className="py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black transition-all border border-white/10"
                          >
                            تعيين كواجهة نشطة
                          </button>
                        ) : (
                          <div className="py-3 bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-black text-center border border-emerald-500/30">
                            الواجهة المعتمدة
                          </div>
                        )}

                        {level < front.maxLevel ? (
                          <button
                            onClick={() => handleUpgradeFront(front)}
                            disabled={!canAffordUpgrade}
                            className={`py-3 rounded-xl text-xs font-black transition-all border ${
                              canAffordUpgrade
                                ? 'bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white border-amber-500/40'
                                : 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                            }`}
                          >
                            ترقية ({formatMoney(front.upgradeCost)})
                          </button>
                        ) : (
                          <div className="py-3 bg-amber-500/10 text-amber-400 rounded-xl text-xs font-black text-center border border-amber-500/20">
                            أقصى مستوى
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

      {/* TAB 3: LAUNDERING HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-zinc-950/80 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20">
                <History size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">سجل عمليات التبييض السابقة</h3>
                <p className="text-xs text-zinc-500">تفاصيل المبالغ المحولة والعمولات المقتطعة</p>
              </div>
            </div>
          </div>

          {(!launderingData.history || launderingData.history.length === 0) ? (
            <div className="py-16 text-center text-zinc-500 space-y-2">
              <History size={40} className="mx-auto text-zinc-700 animate-pulse" />
              <p className="text-sm font-bold">لم تقم بأي عمليات غسيل أموال حتى الآن</p>
              <p className="text-xs text-zinc-600">ستظهر هنا تفاصيل كل عملية تبييض تتم بنجاح عبر واجهاتك التجارية.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-500">
                    <th className="pb-3 font-bold">التاريخ والتوقيت</th>
                    <th className="pb-3 font-bold">الواجهة المستخدمة</th>
                    <th className="pb-3 font-bold">المبلغ القذر</th>
                    <th className="pb-3 font-bold">العمولة المقتطعة</th>
                    <th className="pb-3 font-bold">الكاش النظيف المستلم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {launderingData.history.map((record: any) => (
                    <tr key={record.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 text-zinc-400">
                        {new Date(record.timestamp).toLocaleString('ar-EG', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3.5 font-sans font-black text-white">
                        {record.frontName}
                      </td>
                      <td className="py-3.5 font-bold text-red-400">
                        {formatMoney(record.dirtyAmount)}
                      </td>
                      <td className="py-3.5 font-bold text-rose-500">
                        -{formatMoney(record.feeAmount)} ({record.feePercent}%)
                      </td>
                      <td className="py-3.5 font-bold text-emerald-400">
                        +{formatMoney(record.cleanAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
