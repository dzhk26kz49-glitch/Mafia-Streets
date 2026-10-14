import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Truck, 
  Coins, 
  TrendingUp, 
  Swords, 
  Shield, 
  Users, 
  UserCheck, 
  Flame, 
  Sparkles, 
  Eye, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  HandCoins, 
  Award, 
  Plus, 
  ArrowRight, 
  Activity, 
  Building2, 
  Crosshair, 
  Target, 
  Siren, 
  Send,
  Zap,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { 
  NPCWorkMission, 
  DispatchMissionType, 
  NPCPartnership, 
  PvPOperation, 
  PvPOperationType, 
  HeistPlan, 
  UndergroundSkill 
} from '../../types/npcExpandedTypes';
import { NPCCharacter } from '../../types/npcTypes';
import { NPCOperationsEngine, HEIST_PLANS } from '../../services/npcOperationsEngine';
import { useAuthStore } from '../../store/useAuthStore';
import { formatMoney } from '../../lib/utils';
import { toast } from 'sonner';

interface NPCOperationsHubProps {
  npcs: NPCCharacter[];
  skills: UndergroundSkill[];
  onSkillsUpdated: (newSkills: UndergroundSkill[]) => void;
  onArrestNpc: (npcId: string, npcName: string, reason: string) => void;
  onEnlargeImage: (npc: any) => void;
  initialTab?: 'dispatch' | 'partnerships' | 'pvp' | 'heists' | 'skills';
  activeTab?: 'dispatch' | 'partnerships' | 'pvp' | 'heists' | 'skills';
  onTabChange?: (tab: 'dispatch' | 'partnerships' | 'pvp' | 'heists' | 'skills') => void;
  hideTabBar?: boolean;
}

export const NPCOperationsHub: React.FC<NPCOperationsHubProps> = ({
  npcs,
  skills,
  onSkillsUpdated,
  onArrestNpc,
  onEnlargeImage,
  initialTab,
  activeTab: activeTabProp,
  onTabChange,
  hideTabBar = false
}) => {
  const { profile, updateProfile } = useAuthStore();
  const [internalActiveTab, setInternalActiveTab] = useState<'dispatch' | 'partnerships' | 'pvp' | 'heists' | 'skills'>(activeTabProp || initialTab || 'dispatch');

  useEffect(() => {
    if (activeTabProp) {
      setInternalActiveTab(activeTabProp);
    } else if (initialTab) {
      setInternalActiveTab(initialTab);
    }
  }, [activeTabProp, initialTab]);

  const currentTab = activeTabProp || internalActiveTab;
  const handleSelectTab = (tab: 'dispatch' | 'partnerships' | 'pvp' | 'heists' | 'skills') => {
    setInternalActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // بيانات المهام والعمل
  const [missions, setMissions] = useState<NPCWorkMission[]>(() => NPCOperationsEngine.getMissions());
  const [selectedNpcForMission, setSelectedNpcForMission] = useState<NPCCharacter>(npcs[0] || {} as NPCCharacter);
  const [selectedMissionType, setSelectedMissionType] = useState<DispatchMissionType>('cargo_shipping');

  // بيانات الشراكات
  const [partnerships, setPartnerships] = useState<NPCPartnership[]>(() => NPCOperationsEngine.getPartnerships());
  const [accumulatedProfits, setAccumulatedProfits] = useState<number>(0);

  // بيانات عمليات ضد ومع اللاعبين
  const [pvpTargetPlayers, setPvpTargetPlayers] = useState<any[]>([]);
  const [selectedPvpTarget, setSelectedPvpTarget] = useState<any>(null);
  const [selectedPvpNpc, setSelectedPvpNpc] = useState<NPCCharacter>(npcs[0] || {} as NPCCharacter);
  const [selectedPvpType, setSelectedPvpType] = useState<PvPOperationType>('sabotage_vehicle');
  const [recentPvPOps, setRecentPvPOps] = useState<PvPOperation[]>([]);

  // بيانات السطو
  const [selectedHeistPlan, setSelectedHeistPlan] = useState<HeistPlan>(HEIST_PLANS[0]);
  const [heistCrew, setHeistCrew] = useState<Record<string, NPCCharacter>>({});
  const [isHeistRunning, setIsHeistRunning] = useState(false);

  // تحديث دوري للمهام وتدفق أرباح الشراكات كل ثانيتين
  useEffect(() => {
    const timer = setInterval(() => {
      // 1. فحص اكتمال المهام
      const checkRes = NPCOperationsEngine.checkAndCompleteMissions(onArrestNpc);
      if (checkRes.completedCount > 0) {
        setMissions(NPCOperationsEngine.getMissions());
        if (checkRes.collectedCash > 0 && profile) {
          updateProfile({
            cleanMoney: (profile.cleanMoney || 0) + checkRes.collectedCash
          });
          toast.success(`تم تحصيل ${formatMoney(checkRes.collectedCash)} من مهام الـ NPCs المكتملة!`);
        }
      }

      // 2. تحديث عداد أرباح الشراكات التراكمي
      const { partnerships: updatedP, totalProfit } = NPCOperationsEngine.calculateAccumulatedProfits();
      setPartnerships(updatedP);
      setAccumulatedProfits(totalProfit);
    }, 2000);

    return () => clearInterval(timer);
  }, [profile, onArrestNpc]);

  // جلب اللاعبين الحقيقيين للـ PvP
  useEffect(() => {
    if (profile?.uid) {
      NPCOperationsEngine.fetchRealPlayers(profile.uid).then(players => {
        setPvpTargetPlayers(players);
        if (players.length > 0 && !selectedPvpTarget) {
          setSelectedPvpTarget(players[0]);
        }
      });
    }
  }, [profile?.uid]);

  // بدء مهمة شحن وعمل
  const handleStartMission = async () => {
    if (!profile || !selectedNpcForMission) return;

    const result = NPCOperationsEngine.startMission(selectedNpcForMission, selectedMissionType, skills);
    if (result.success && result.mission) {
      if (result.mission.cost > 0) {
        await updateProfile({
          cleanMoney: Math.max(0, (profile.cleanMoney || 0) - result.mission.cost)
        });
      }
      setMissions(NPCOperationsEngine.getMissions());
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  // استثمار وتوسيع شراكة تجارية
  const handleInvestInPartnership = async (npc: NPCCharacter, amount: number) => {
    if (!profile) return;
    if ((profile.cleanMoney || 0) < amount) {
      toast.error(`أموالك غير كافية للاستثمار! مطلوب ${formatMoney(amount)}.`);
      return;
    }

    const result = NPCOperationsEngine.investInPartnership(npc, amount, skills);
    if (result.success) {
      await updateProfile({
        cleanMoney: (profile.cleanMoney || 0) - amount
      });
      setPartnerships(NPCOperationsEngine.getPartnerships());
      toast.success(result.message);
    }
  };

  // تحصيل كافة أرباح الشراكات
  const handleCollectAllProfits = async () => {
    if (!profile || accumulatedProfits <= 0) return;

    const { collectedAmount } = NPCOperationsEngine.collectAllPartnershipProfits();
    if (collectedAmount > 0) {
      await updateProfile({
        cleanMoney: (profile.cleanMoney || 0) + collectedAmount
      });
      setAccumulatedProfits(0);
      setPartnerships(NPCOperationsEngine.getPartnerships());
      toast.success(`تم تحصيل ${formatMoney(collectedAmount)} من أرباح الشراكات بنجاح!`);
    }
  };

  // إطلاق عملية ضد/مع لاعب آخر
  const handleLaunchPvPOperation = async () => {
    if (!profile || !selectedPvpTarget || !selectedPvpNpc) return;
    const cost = 30000;
    if ((profile.cleanMoney || 0) < cost) {
      toast.error(`تكلفة تجهيز العملية هي ${formatMoney(cost)}، وأموالك غير كافية!`);
      return;
    }

    const result = NPCOperationsEngine.launchPvPOperation(selectedPvpType, selectedPvpNpc, selectedPvpTarget, cost);
    if (result.success && result.op) {
      await updateProfile({
        cleanMoney: (profile.cleanMoney || 0) - cost
      });
      setRecentPvPOps(prev => [result.op!, ...prev.slice(0, 5)]);
      toast.success(result.message);
    }
  };

  // تنفيذ عملية السطو
  const handleLaunchHeist = async () => {
    if (!profile || isHeistRunning) return;
    if ((profile.cleanMoney || 0) < selectedHeistPlan.prepCost) {
      toast.error(`تكلفة تجهيز السطو هي ${formatMoney(selectedHeistPlan.prepCost)}، وأموالك غير كافية!`);
      return;
    }

    // التحقق من تعيين كافة الأدوار
    const missingRoles = selectedHeistPlan.requiredRoles.filter(r => !heistCrew[r.roleId]);
    if (missingRoles.length > 0) {
      toast.error(`يجب تعيين شخصية لكل دور في الطاقم! ينقصك: ${missingRoles.map(r => r.roleName).join('، ')}.`);
      return;
    }

    setIsHeistRunning(true);
    await updateProfile({
      cleanMoney: (profile.cleanMoney || 0) - selectedHeistPlan.prepCost
    });

    toast.info('بدأت عملية السطو! الطاقم يقتحم الهدف وسط خطة تكتيكية محكمة...');

    setTimeout(async () => {
      const result = NPCOperationsEngine.executeHeist(selectedHeistPlan, heistCrew, skills);
      setIsHeistRunning(false);

      if (result.success) {
        await updateProfile({
          cleanMoney: (profile.cleanMoney || 0) + result.loot
        });
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    }, 3500);
  };

  // ترقية مهارة
  const handleUpgradeSkill = async (skillId: string) => {
    if (!profile) return;
    const skill = skills.find(s => s.id === skillId);
    if (!skill) return;

    const cost = skill.costPerLevel * skill.level;
    if ((profile.cleanMoney || 0) < cost) {
      toast.error(`أموالك غير كافية لترقية المهارة! مطلوب ${formatMoney(cost)}.`);
      return;
    }

    const result = NPCOperationsEngine.upgradeSkill(skillId, profile.cleanMoney || 0);
    if (result.success && result.updatedSkills) {
      await updateProfile({
        cleanMoney: (profile.cleanMoney || 0) - cost
      });
      onSkillsUpdated(result.updatedSkills);
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* التبويبات الفرعية الخمسة لمركز العمليات الضخم (تظهر فقط عند عدم التحكم الخارجي) */}
      {!hideTabBar && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-1.5 bg-zinc-950 border border-zinc-800 rounded-2xl">
          <button
            onClick={() => handleSelectTab('dispatch')}
            className={`py-3 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              currentTab === 'dispatch'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/50'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Truck size={15} />
            شحن ونقل وعمل
          </button>

          <button
            onClick={() => handleSelectTab('partnerships')}
            className={`py-3 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              currentTab === 'partnerships'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Coins size={15} />
            شراكات وأرباح ({formatMoney(accumulatedProfits)})
          </button>

          <button
            onClick={() => handleSelectTab('pvp')}
            className={`py-3 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              currentTab === 'pvp'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-950/50'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Crosshair size={15} />
            عمليات ضد ومع اللاعبين
          </button>

          <button
            onClick={() => handleSelectTab('heists')}
            className={`py-3 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              currentTab === 'heists'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/50'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Flame size={15} />
            سطو وممنوعات
          </button>

          <button
            onClick={() => handleSelectTab('skills')}
            className={`py-3 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              currentTab === 'skills'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-950/50'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Sparkles size={15} />
            شجرة المهارات (5)
          </button>
        </div>
      )}

      {/* 1. تبويب الشحن والنقل والعمل لصالح اللاعب */}
      {currentTab === 'dispatch' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* بطاقة تجهيز وإطلاق المهمة */}
            <div className="lg:col-span-6 bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-5">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Truck className="text-blue-400" size={22} />
                  تكليف الـ NPC بمهمة شحن وعمل ميداني
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  أرسل الشخصيات لنقل شحنات سرية أو جمع إيجارات السوق أو حراسة المستودعات لصالحك.
                </p>
              </div>

              {/* اختيار الشخصية المنفذة من الـ 10 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 block">اختر الشخصية المنفذة للمهمة:</label>
                <div className="grid grid-cols-5 gap-2">
                  {npcs.map(npc => (
                    <button
                      key={npc.id}
                      onClick={() => setSelectedNpcForMission(npc)}
                      className={`p-1.5 rounded-2xl border transition-all flex flex-col items-center gap-1 ${
                        selectedNpcForMission.id === npc.id
                          ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/40'
                          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="w-12 h-14 rounded-xl overflow-hidden border border-zinc-700 shrink-0">
                        <img src={npc.image} alt={npc.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[10px] font-black text-white truncate max-w-full">
                        {npc.name.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* اختيار نوع المهمة */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 block">نوع العملية اللوجستية:</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'cargo_shipping', title: 'شحن ونقل طرد سري', icon: Package, payout: '95,000 د.ع', time: '50 ثانية' },
                    { id: 'rent_collection', title: 'تحصيل إيجارات وأموال', icon: Coins, payout: '160,000 د.ع', time: '70 ثانية' },
                    { id: 'police_scout', title: 'رصد دوريات الشرطة', icon: Eye, payout: '65,000 د.ع', time: '45 ثانية' },
                    { id: 'warehouse_guard', title: 'حراسة مستودعات وتأمين', icon: Shield, payout: '210,000 د.ع', time: '90 ثانية' }
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedMissionType(item.id as DispatchMissionType)}
                        className={`p-3 rounded-2xl border text-right transition-all flex items-start gap-2.5 ${
                          selectedMissionType === item.id
                            ? 'bg-blue-600/20 border-blue-500 shadow-md'
                            : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="p-2 bg-black/40 rounded-xl text-blue-400 shrink-0">
                          <Icon size={16} />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-xs">{item.title}</h4>
                          <span className="text-[10px] text-emerald-400 block font-mono font-bold mt-0.5">عائد: {item.payout}</span>
                          <span className="text-[9px] text-zinc-500 block">الوقت: {item.time}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* زر إطلاق المهمة */}
              <button
                onClick={handleStartMission}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-950/50 active:scale-95"
              >
                <Send size={15} />
                إطلاق مهمة {selectedNpcForMission.name} لصالحك الآن ⚡
              </button>
            </div>

            {/* قائمة المهام الميدانية الجارية والمكتملة */}
            <div className="lg:col-span-6 bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Activity className="text-emerald-400" size={18} />
                    رادار المهام الجارية للمسؤولين ({missions.length})
                  </h3>
                  <span className="text-[10px] text-zinc-500 font-bold">تحديث حي تلقائي</span>
                </div>

                <div className="space-y-3 mt-4 max-h-[460px] overflow-y-auto pe-1 scrollbar-thin scrollbar-thumb-zinc-800">
                  {missions.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 text-xs space-y-2">
                      <Truck className="w-10 h-10 mx-auto text-zinc-700" />
                      <p>لا توجد مهام نشطة حالياً. اختر شخصية واضغط إطلاق المهمة أعلاه!</p>
                    </div>
                  ) : (
                    missions.map(m => {
                      const elapsed = Math.floor((Date.now() - m.startTime) / 1000);
                      const remaining = Math.max(0, m.durationSeconds - elapsed);
                      const progress = Math.min(100, Math.floor((elapsed / m.durationSeconds) * 100));

                      return (
                        <div 
                          key={m.id}
                          className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-12 rounded-xl overflow-hidden border border-zinc-700 shrink-0">
                                <img src={m.assignedNpcImage} alt={m.assignedNpcName} className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-white">{m.title}</h4>
                                <span className="text-[10px] text-zinc-400">{m.assignedNpcName}</span>
                              </div>
                            </div>

                            <div className="text-left">
                              <span className="text-[11px] font-black text-emerald-400 font-mono block">
                                +{formatMoney(m.rewardCash)}
                              </span>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                                m.status === 'in_progress' ? 'bg-blue-500/20 text-blue-300' :
                                m.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                                m.status === 'arrested' ? 'bg-red-500/20 text-red-300' : 'bg-zinc-800 text-zinc-400'
                              }`}>
                                {m.status === 'in_progress' ? `جاري العمل (${remaining} ث)` :
                                 m.status === 'completed' ? 'مكتمل بنجاح' :
                                 m.status === 'arrested' ? 'تم توقيفه بالسجن' : 'تعثرت المهمة'}
                              </span>
                            </div>
                          </div>

                          {/* شريط التقدم الزمني */}
                          {m.status === 'in_progress' && (
                            <div className="w-full h-1.5 bg-black rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          )}

                          {m.resultLog && (
                            <p className="text-[10px] text-zinc-400 bg-black/40 p-2 rounded-xl border border-white/5 italic">
                              {m.resultLog}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. تبويب الشراكات الاستثمارية وتوليد الأرباح الحية */}
      {currentTab === 'partnerships' && (
        <div className="space-y-6">
          {/* لوحة تحصيل العوائد السريعة */}
          <div className="p-6 bg-gradient-to-r from-emerald-950/80 via-zinc-950 to-zinc-950 border border-emerald-900/50 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Coins className="text-emerald-400" size={24} />
                خزينة عوائد الشراكات الاستثمارية
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                استثمر رؤوس أموال مع شخصيات الـ NPCs لتأسيس مشاريع تجارية تدر عليك أرباحاً تلقائية مستمرة.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-black/50 px-4 py-2.5 rounded-2xl border border-emerald-500/30 text-center">
                <span className="text-[10px] text-zinc-400 block font-bold">أرباح متراكمة جاهزة</span>
                <span className="text-base font-black text-emerald-400 font-mono">
                  {formatMoney(accumulatedProfits)}
                </span>
              </div>

              <button
                disabled={accumulatedProfits <= 0}
                onClick={handleCollectAllProfits}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-lg active:scale-95"
              >
                <HandCoins size={16} />
                تحصيل كافة الأرباح كاش
              </button>
            </div>
          </div>

          {/* شبكة المشاريع الاستثمارية للشخصيات الـ 10 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {npcs.map(npc => {
              const part = partnerships.find(p => p.npcId === npc.id);
              const isPartner = !!part;
              const investCost = isPartner ? 150000 : 80000;

              return (
                <div 
                  key={npc.id}
                  className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-4 flex flex-col justify-between hover:border-emerald-500/40 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-16 rounded-2xl overflow-hidden border border-zinc-700 shrink-0 shadow-md">
                        <img src={npc.image} alt={npc.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-black text-white truncate">{npc.name}</h4>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                            isPartner ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            {isPartner ? `مستوى ${part.level}` : 'غير مستثمر'}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-amber-400 block mt-0.5">
                          {part?.businessName || `مشروع ${npc.name} التجاري`}
                        </span>
                        <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">{npc.specialty}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800/80 text-xs space-y-1.5 font-mono">
                      <div className="flex justify-between">
                        <span className="text-zinc-400 text-[11px]">العائد الساعي:</span>
                        <span className="font-bold text-emerald-400">
                          {isPartner ? `${formatMoney(part.hourlyRevenue)} / ساعة` : 'يتطلب استثماراً'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 text-[11px]">الأرباح غير المحصلة:</span>
                        <span className="font-bold text-amber-400 font-mono">
                          {isPartner ? formatMoney(part.accumulatedProfit || 0) : '0 د.ع'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleInvestInPartnership(npc, investCost)}
                    className={`w-full py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md ${
                      isPartner
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <Plus size={14} />
                    {isPartner ? `توسيع الشراكة (+${formatMoney(investCost)})` : `بدء الشراكة (${formatMoney(investCost)})`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. تبويب عمليات ضد ومع اللاعبين الحقيقيين */}
      {currentTab === 'pvp' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* بطاقة تجهيز عقد الاستهداف ضد لاعب */}
            <div className="lg:col-span-7 bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-5">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Crosshair className="text-amber-400" size={22} />
                  إطلاق عقود الـ NPCs ضد ومع اللاعبين الحقيقيين
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  كلف شخصياتك بالتجسس على منافسيك، تعطيل سياراتهم، نشل أموالهم، أو تقديم بلاغ كيدي للشرطة لمداهمتهم!
                </p>
              </div>

              {/* اختيار اللاعب المستهدف من سيرفر اللعبة */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 block">اختر اللاعب المستهدف:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {pvpTargetPlayers.map(p => (
                    <button
                      key={p.uid}
                      onClick={() => setSelectedPvpTarget(p)}
                      className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                        selectedPvpTarget?.uid === p.uid
                          ? 'bg-amber-600/20 border-amber-500 ring-2 ring-amber-500/30'
                          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-white">
                          {p.displayName.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-white truncate">{p.displayName}</h4>
                          <span className="text-[10px] text-zinc-500 block">{p.role}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-amber-400 font-mono mt-2 block font-bold">
                        {p.wantedStars ? `${p.wantedStars} ★ مطلوب` : 'سجل نظيف'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* اختيار الشخصية المنفذة للعقد */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 block">اختر الشخصية المنفذة:</label>
                <div className="grid grid-cols-5 gap-2">
                  {npcs.map(npc => (
                    <button
                      key={npc.id}
                      onClick={() => setSelectedPvpNpc(npc)}
                      className={`p-1.5 rounded-2xl border transition-all flex flex-col items-center gap-1 ${
                        selectedPvpNpc.id === npc.id
                          ? 'bg-amber-600/20 border-amber-500 ring-2 ring-amber-500/40'
                          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="w-12 h-14 rounded-xl overflow-hidden border border-zinc-700 shrink-0">
                        <img src={npc.image} alt={npc.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[10px] font-black text-white truncate max-w-full">
                        {npc.name.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* اختيار نوع العقد الموجه */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 block">نوع العملية الميدانية:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'sabotage_vehicle', title: 'تعطيل سيارة اللاعب', desc: 'إتلاف المحرك والإطارات وتأخير تحركاته', icon: Swords },
                    { id: 'pickpocket_player', title: 'نشل أموال اللاعب', desc: 'سرقة جزء من كاشه في السوق وإيداعه لك', icon: HandCoins },
                    { id: 'police_snitch', title: 'بلاغ كيدي للشرطة', desc: 'رفع نجوم المطلوبية واستدعاء مداهمة له', icon: Siren },
                    { id: 'intel_spy', title: 'تجسس واستخبارات', desc: 'كشف ممتلكات وأرصدة اللاعب بدقة', icon: Eye },
                    { id: 'friendly_aid', title: 'إرسال دعم وهدية', desc: 'إرسال طرد دعم وضيافة للاعب صديق', icon: Sparkles }
                  ].map(op => {
                    const Icon = op.icon;
                    return (
                      <button
                        key={op.id}
                        onClick={() => setSelectedPvpType(op.id as PvPOperationType)}
                        className={`p-3 rounded-2xl border text-right transition-all flex items-start gap-2.5 ${
                          selectedPvpType === op.id
                            ? 'bg-amber-600/20 border-amber-500 shadow-md'
                            : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="p-2 bg-black/40 rounded-xl text-amber-400 shrink-0">
                          <Icon size={16} />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-xs">{op.title}</h4>
                          <p className="text-[10px] text-zinc-400 mt-0.5">{op.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleLaunchPvPOperation}
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-amber-950/50 active:scale-95"
              >
                <Target size={16} />
                تنفيذ العقد بواسطة {selectedPvpNpc.name} ضد {selectedPvpTarget?.displayName} (30,000 د.ع)
              </button>
            </div>

            {/* سجل العمليات المنفذة مؤخراً */}
            <div className="lg:col-span-5 bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Activity className="text-amber-400" size={18} />
                سجل عقود الشوارع المنفذة
              </h3>

              <div className="space-y-3">
                {recentPvPOps.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-xs space-y-2">
                    <Crosshair className="w-10 h-10 mx-auto text-zinc-700" />
                    <p>لم تنفذ أي عقود ضد اللاعبين مؤخراً. اختر هدفاً واضغط تنفيذ العقد!</p>
                  </div>
                ) : (
                  recentPvPOps.map(op => (
                    <div key={op.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{op.targetPlayerName}</span>
                        <span className="text-[10px] text-amber-400 font-mono">المنفذ: {op.executorNpcName}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">{op.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. تبويب السطو المسلح والممنوعات الكبرى */}
      {currentTab === 'heists' && (
        <div className="space-y-6">
          {/* اختيار لوحة السطو من الخطط الثلاث */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {HEIST_PLANS.map(plan => (
              <button
                key={plan.id}
                onClick={() => {
                  setSelectedHeistPlan(plan);
                  setHeistCrew({});
                }}
                className={`p-5 rounded-3xl border text-right transition-all flex flex-col justify-between space-y-4 ${
                  selectedHeistPlan.id === plan.id
                    ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/40 shadow-xl'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                      plan.riskLevel === 'medium' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                      plan.riskLevel === 'high' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                      'bg-red-500/20 text-red-300 border-red-500/30'
                    }`}>
                      مستوى الخطورة: {plan.riskLevel}
                    </span>
                    <span className="text-xs text-zinc-500 font-bold">{plan.location}</span>
                  </div>
                  <h4 className="text-base font-black text-white">{plan.title}</h4>
                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{plan.subtitle}</p>
                </div>

                <div className="pt-2 border-t border-zinc-800/80 w-full flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-500">الغنيمة المتوقعة:</span>
                  <span className="font-bold text-emerald-400">{formatMoney(plan.baseLootMax)}</span>
                </div>
              </button>
            ))}
          </div>

          {/* غرفة تجهيز وتعيين طاقم السطو المختار */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-6">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Flame className="text-purple-400" size={22} />
                تجهيز طاقم السطو: {selectedHeistPlan.title}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                عين شخصية NPC مناسبة لكل دور تكتيكي لرفع نسبة نجاح العملية وتفادي مداهمات قوات سوات.
              </p>
            </div>

            {/* فتحات تعيين الأدوار */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {selectedHeistPlan.requiredRoles.map(role => {
                const assigned = heistCrew[role.roleId];

                return (
                  <div key={role.roleId} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-purple-400 font-bold block">{role.roleName}</span>
                      <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">{role.description}</p>
                    </div>

                    {assigned ? (
                      <div className="flex items-center gap-3 p-2 bg-black/50 rounded-xl border border-zinc-700">
                        <div className="w-10 h-12 rounded-lg overflow-hidden border border-zinc-600 shrink-0">
                          <img src={assigned.image} alt={assigned.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white block truncate">{assigned.name}</span>
                          <span className="text-[10px] text-emerald-400 font-bold">{assigned.personalityArabic}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-black/30 border border-dashed border-zinc-700 rounded-xl text-center text-zinc-500 text-[11px]">
                        لم يتم تعيين شخصية بعد
                      </div>
                    )}

                    {/* قائمة لاختيار NPC لهذا الدور */}
                    <select
                      value={assigned?.id || ''}
                      onChange={(e) => {
                        const targetNpc = npcs.find(n => n.id === e.target.value);
                        if (targetNpc) {
                          setHeistCrew(prev => ({ ...prev, [role.roleId]: targetNpc }));
                        }
                      }}
                      className="bg-black/60 border border-zinc-700 rounded-xl px-2.5 py-2 text-xs text-zinc-300 focus:outline-none focus:border-purple-500 font-bold"
                    >
                      <option value="">-- اختر الشخصية لهذا الدور --</option>
                      {npcs.map(npc => (
                        <option key={npc.id} value={npc.id}>
                          {npc.name} ({npc.personalityArabic})
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            {/* زر تنفيذ السطو */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-800">
              <div className="text-xs text-zinc-400">
                تكلفة التجهيزات والأسلحة: <span className="font-bold text-white font-mono">{formatMoney(selectedHeistPlan.prepCost)}</span>
              </div>

              <button
                disabled={isHeistRunning}
                onClick={handleLaunchHeist}
                className="w-full sm:w-auto px-8 py-3.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition-all shadow-xl shadow-purple-950/50 flex items-center justify-center gap-2"
              >
                {isHeistRunning ? 'العملية قيد الاقتحام والتنفيذ الآن...' : 'بدء تنفيذ عملية السطو الكبرى ⚡'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. تبويب شجرة المهارات والترقيات لعالم الخفاء */}
      {currentTab === 'skills' && (
        <div className="space-y-6">
          <div className="p-6 bg-gradient-to-r from-teal-950/80 via-zinc-950 to-zinc-950 border border-teal-900/50 rounded-3xl">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Sparkles className="text-teal-400" size={24} />
              شجرة مهارات وترقيات عالم الخفاء
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              طوّر مهاراتك القيادية والتكتيكية لتسريع الشحن، تعظيم أرباح الشراكات، ورفع نسب نجاح السطو والتملص من الشرطة.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map(skill => {
              const upgradeCost = skill.costPerLevel * skill.level;
              const isMax = skill.level >= skill.maxLevel;

              return (
                <div 
                  key={skill.id}
                  className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-4 flex flex-col justify-between hover:border-teal-500/40 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-teal-500/10 text-teal-400 rounded-2xl border border-teal-500/20">
                          <Zap size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white">{skill.name}</h4>
                          <span className="text-[10px] text-zinc-400 font-bold">المستوى: {skill.level} / {skill.maxLevel}</span>
                        </div>
                      </div>

                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                        isMax ? 'bg-amber-500/20 text-amber-300' : 'bg-teal-500/20 text-teal-300'
                      }`}>
                        {isMax ? 'أقصى مستوى' : `ترقية +1`}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed">{skill.description}</p>

                    <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 text-[11px] font-bold text-teal-300">
                      التأثير: {skill.effectDescription}
                    </div>
                  </div>

                  <button
                    disabled={isMax || (profile?.cleanMoney || 0) < upgradeCost}
                    onClick={() => handleUpgradeSkill(skill.id)}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                  >
                    {isMax ? 'المهارة مكتملة بالكامل' : `ترقية المهارة (${formatMoney(upgradeCost)})`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
