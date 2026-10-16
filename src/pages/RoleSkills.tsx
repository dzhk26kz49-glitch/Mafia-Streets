import React, { useState, useEffect } from 'react';
import { useAuthStore, Role } from '../store/useAuthStore';
import { 
  ROLE_SKILL_TREES, 
  ROLE_CONTRACTS_CATALOG, 
  RoleSkillDef, 
  RoleContractTemplate 
} from '../constants/roleSkills';
import { 
  Crown, 
  Shield, 
  Award, 
  Flame, 
  TrendingUp, 
  DollarSign, 
  Lock, 
  Briefcase, 
  Zap, 
  EyeOff, 
  Key, 
  FastForward, 
  Compass, 
  Anchor, 
  PackageCheck, 
  Globe2, 
  Swords, 
  Skull, 
  HeartHandshake, 
  Activity,
  Sparkles,
  CheckCircle2,
  Clock,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Gift,
  ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney } from '../lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const ICON_MAP: Record<string, any> = {
  Crown,
  Shield,
  Award,
  Flame,
  TrendingUp,
  DollarSign,
  Lock,
  Briefcase,
  Zap,
  EyeOff,
  Key,
  FastForward,
  Compass,
  Anchor,
  PackageCheck,
  Globe2,
  Swords,
  Skull,
  HeartHandshake,
  Activity
};

export default function RoleSkills() {
  const { profile, updateProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'skills' | 'contracts' | 'guide'>('skills');
  const [executingContracts, setExecutingContracts] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now());

  // Keep live timer updated
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentRole: Role = (profile?.role as Role) || 'Boss';
  const treeConfig = ROLE_SKILL_TREES[currentRole] || ROLE_SKILL_TREES.Boss;
  const roleContracts = ROLE_CONTRACTS_CATALOG[currentRole] || ROLE_CONTRACTS_CATALOG.Boss;

  // Initialize or fetch role skills data from profile
  const roleSkillData = profile?.roleSkills || {
    skillPoints: 3, // Initial bonus points
    skills: {},
    contracts: [],
    lastContractsRefresh: Date.now()
  };

  const skillPoints = roleSkillData.skillPoints ?? 3;
  const learnedSkills: Record<string, number> = roleSkillData.skills || {};

  // Auto-initialize profile roleSkills if not yet set
  useEffect(() => {
    if (!profile?.uid) return;
    if (!profile.roleSkills) {
      updateProfile({
        roleSkills: {
          skillPoints: 3,
          skills: {},
          contracts: [],
          lastContractsRefresh: Date.now()
        }
      }).catch(console.error);
    }
  }, [profile?.uid, profile?.roleSkills]);

  // Upgrade a specific skill in the tree
  const handleUpgradeSkill = async (skill: RoleSkillDef) => {
    if (!profile?.uid) return;

    const currentLvl = learnedSkills[skill.id] || 0;
    if (currentLvl >= skill.maxLevel) {
      toast.info('تم الوصول إلى الحد الأقصى لهذه المهارة!');
      return;
    }

    if (skillPoints < skill.costPerLevel) {
      toast.error(`تحتاج إلى ${skill.costPerLevel} نقطة مهارة لترقية هذه المهارة! يمكنك الحصول عليها من العقود اليومية.`);
      return;
    }

    const updatedSkills = {
      ...learnedSkills,
      [skill.id]: currentLvl + 1
    };

    const newSkillPoints = skillPoints - skill.costPerLevel;

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        'roleSkills.skills': updatedSkills,
        'roleSkills.skillPoints': newSkillPoints
      });

      // Local optimistic update
      useAuthStore.setState((state) => ({
        profile: state.profile ? {
          ...state.profile,
          roleSkills: {
            ...state.profile.roleSkills,
            skillPoints: newSkillPoints,
            skills: updatedSkills,
            contracts: state.profile.roleSkills?.contracts || []
          }
        } : null
      }));

      toast.success(`تهانينا! تمت ترقية مهارة [${skill.name}] إلى المستوى ${currentLvl + 1}`);
    } catch (error: any) {
      console.error(error);
      toast.error('فشل في ترقية المهارة، يرجى المحاولة مجدداً');
    }
  };

  // Start executing a contract
  const handleStartContract = (template: RoleContractTemplate) => {
    if (executingContracts[template.id]) return;

    const finishTime = Date.now() + template.durationSeconds * 1000;
    setExecutingContracts(prev => ({
      ...prev,
      [template.id]: finishTime
    }));

    toast.info(`بدأ تنفيذ عقد [${template.title}]... المتبقي ${template.durationSeconds} ثانية`);
  };

  // Claim contract reward
  const handleClaimReward = async (template: RoleContractTemplate) => {
    if (!profile?.uid) return;

    const finishTime = executingContracts[template.id];
    if (!finishTime || now < finishTime) {
      toast.error('العقد لا يزال قيد التنفيذ!');
      return;
    }

    try {
      const currentCash = profile.cleanMoney || 0;
      const currentRep = profile.reputation || 0;
      const newCash = currentCash + template.rewardCash;
      const newRep = currentRep + template.rewardRep;
      const newSkillPoints = skillPoints + template.rewardSkillPoints;

      // Update Firestore
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: newCash,
        reputation: newRep,
        'roleSkills.skillPoints': newSkillPoints
      });

      // Update store
      useAuthStore.setState((state) => ({
        profile: state.profile ? {
          ...state.profile,
          cleanMoney: newCash,
          reputation: newRep,
          roleSkills: {
            ...state.profile.roleSkills,
            skillPoints: newSkillPoints,
            skills: state.profile.roleSkills?.skills || {},
            contracts: state.profile.roleSkills?.contracts || []
          }
        } : null
      }));

      // Remove from executing list
      setExecutingContracts(prev => {
        const copy = { ...prev };
        delete copy[template.id];
        return copy;
      });

      toast.success(`تم استلام مكافأة العقد! +${formatMoney(template.rewardCash)} و +${template.rewardRep} سمعة و +${template.rewardSkillPoints} نقطة مهارة! 🎉`);
    } catch (e: any) {
      console.error(e);
      toast.error('حدث خطأ أثناء استلام المكافأة');
    }
  };

  return (
    <div className="space-y-8 pb-16 text-right" dir="rtl">
      
      {/* Hero Header: Role Mastery Overview */}
      <div className={`relative p-6 sm:p-10 rounded-3xl bg-gradient-to-br ${treeConfig.bgGradient} border border-white/10 shadow-2xl overflow-hidden`}>
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-600/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-amber-500/50 shadow-2xl shrink-0">
              <img 
                src={profile?.photoURL || '/images/npcs/male_wealthy.jpg'} 
                alt="Profile" 
                className="w-full h-full object-cover" 
              />
              <div className="absolute bottom-0 inset-x-0 bg-black/80 py-0.5 text-center text-[9px] font-black text-amber-400">
                {currentRole}
              </div>
            </div>

            <div className="space-y-1 text-center md:text-right">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-amber-400">
                <Sparkles size={13} className="text-amber-400" />
                <span>شجرة تطوير المهارات التكتيكية</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {treeConfig.title}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">
                {treeConfig.subtitle}
              </p>
            </div>
          </div>

          {/* Skill Points Counter Card */}
          <div className="bg-black/60 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-xl shrink-0 backdrop-blur-xl">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles size={26} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-zinc-400 block">نقاط المهارة المتاحة</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-amber-400 font-mono">{skillPoints}</span>
                <span className="text-xs text-zinc-500 font-bold">نقطة</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-8 border-t border-white/10 pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('skills')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'skills'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            <Zap size={16} />
            <span>شجرة المهارات ({treeConfig.skills.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('contracts')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'contracts'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            <Briefcase size={16} />
            <span>عقود العمليات اليومية ({roleContracts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'guide'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            <Award size={16} />
            <span>دليل تأثير المهارات في اللعب</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Skill Tree Nodes */}
      {activeTab === 'skills' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Zap className="text-amber-400" size={18} />
                <span>المهارات التكتيكية المتاحة لشخصيتك</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                طوّر مهاراتك من المستوى 1 إلى 5 لزيادة قوتك وسيطرتك وأرباحك
              </p>
            </div>
            <span className="text-xs text-zinc-500 font-mono">
              مجموع المستويات: {Object.values(learnedSkills).reduce((a, b) => a + b, 0)} / 20
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {treeConfig.skills.map((skill) => {
              const Icon = ICON_MAP[skill.iconName] || Zap;
              const currentLvl = learnedSkills[skill.id] || 0;
              const isMaxed = currentLvl >= skill.maxLevel;
              const canUpgrade = skillPoints >= skill.costPerLevel && !isMaxed;

              return (
                <div
                  key={skill.id}
                  className={`relative p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between space-y-4 ${
                    currentLvl > 0
                      ? 'bg-zinc-950/90 border-amber-500/30 shadow-xl shadow-amber-500/5'
                      : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  {/* Top Bar: Icon, Title, Tier */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                        currentLvl > 0 
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/20' 
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}>
                        <Icon size={26} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-white">{skill.name}</h3>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 border border-white/5">
                            Tier {skill.tier}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-500 font-mono block" dir="ltr">
                          {skill.nameEn}
                        </span>
                      </div>
                    </div>

                    {/* Level Counter */}
                    <div className="text-left shrink-0">
                      <span className="text-[10px] font-bold text-zinc-500 block">المستوى الحالي</span>
                      <span className={`text-base font-black font-mono ${
                        isMaxed ? 'text-emerald-400' : currentLvl > 0 ? 'text-amber-400' : 'text-zinc-500'
                      }`}>
                        {currentLvl} / {skill.maxLevel}
                      </span>
                    </div>
                  </div>

                  {/* Level Pips Bar */}
                  <div className="flex items-center gap-1.5 w-full">
                    {Array.from({ length: skill.maxLevel }).map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                          idx < currentLvl
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-md shadow-amber-500/30'
                            : 'bg-zinc-900 border border-zinc-800'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Description & Effect */}
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                      {skill.description}
                    </p>
                    <div className="bg-black/50 border border-zinc-800/80 rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs text-amber-300">
                      <ArrowUpRight size={14} className="text-amber-500 shrink-0" />
                      <span><strong>الأثر التكتيكي:</strong> {skill.benefitPerLevel}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2 flex items-center justify-between border-t border-zinc-900">
                    <div className="text-xs text-zinc-500">
                      تكلفة الترقية: <strong className="text-amber-400 font-mono">{skill.costPerLevel} نقطة مهارة</strong>
                    </div>

                    <button
                      onClick={() => handleUpgradeSkill(skill)}
                      disabled={!canUpgrade}
                      className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                        isMaxed
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-default'
                          : canUpgrade
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-lg shadow-amber-500/20 active:scale-95'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
                      }`}
                    >
                      {isMaxed ? (
                        <>
                          <CheckCircle2 size={14} />
                          <span>مكتملة الحد الأقصى</span>
                        </>
                      ) : (
                        <>
                          <Zap size={14} />
                          <span>ترقية المهارة (+1)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Role-Exclusive Daily Contracts */}
      {activeTab === 'contracts' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Briefcase className="text-red-500" size={18} />
                <span>عقود العمليات اليومية الحصرية لشخصية ({currentRole})</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                نفّذ العقود الخاصة بدورك للحصول على أموال ونقاط مهارة ترفع بها قدراتك
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
              <Clock size={14} className="text-amber-400" />
              <span>تتجدد العقود يومياً</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {roleContracts.map((contract) => {
              const finishTime = executingContracts[contract.id];
              const isExecuting = !!finishTime && now < finishTime;
              const isReadyToClaim = !!finishTime && now >= finishTime;
              const remainingSeconds = finishTime ? Math.max(0, Math.ceil((finishTime - now) / 1000)) : 0;

              const difficultyColor = 
                contract.difficulty === 'easy' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                contract.difficulty === 'medium' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                'text-red-400 bg-red-500/10 border-red-500/20';

              const difficultyLabel = 
                contract.difficulty === 'easy' ? 'مستوى سهل' :
                contract.difficulty === 'medium' ? 'مستوى متوسط' : 'مستوى خطير';

              return (
                <div
                  key={contract.id}
                  className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4 hover:border-zinc-700 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${difficultyColor}`}>
                        {difficultyLabel}
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono flex items-center gap-1">
                        <Clock size={12} />
                        {contract.durationSeconds} ثانية
                      </span>
                    </div>

                    <h3 className="text-base font-black text-white">{contract.title}</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                      {contract.description}
                    </p>
                  </div>

                  {/* Rewards Breakdown */}
                  <div className="bg-black/50 border border-zinc-800/80 rounded-2xl p-3.5 space-y-2">
                    <span className="text-[10px] font-bold text-zinc-500 block">مكافآت الإنجاز:</span>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800/60">
                        <span className="text-[9px] text-zinc-500 block">نقود نظيفة</span>
                        <span className="font-bold text-emerald-400 font-mono text-[11px]">
                          +{formatMoney(contract.rewardCash)}
                        </span>
                      </div>
                      <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800/60">
                        <span className="text-[9px] text-zinc-500 block">سمعة</span>
                        <span className="font-bold text-amber-400 font-mono text-[11px]">
                          +{contract.rewardRep}
                        </span>
                      </div>
                      <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800/60">
                        <span className="text-[9px] text-zinc-500 block">نقاط مهارة</span>
                        <span className="font-bold text-purple-400 font-mono text-[11px]">
                          +{contract.rewardSkillPoints}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Execution / Claim Button */}
                  <div>
                    {isReadyToClaim ? (
                      <button
                        onClick={() => handleClaimReward(contract)}
                        className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black py-3 px-4 rounded-xl transition-all shadow-xl shadow-green-600/20 text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 animate-pulse"
                      >
                        <Gift size={16} />
                        <span>استلام المكافأة الآن! 🎁</span>
                      </button>
                    ) : isExecuting ? (
                      <div className="w-full bg-zinc-900 border border-amber-500/30 rounded-xl py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-400 mb-1">
                          <RefreshCw size={14} className="animate-spin" />
                          <span>جاري تنفيذ العقد... ({remainingSeconds} ثانية)</span>
                        </div>
                        <div className="w-full h-1.5 bg-black rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 transition-all duration-1000"
                            style={{ 
                              width: `${Math.min(100, ((contract.durationSeconds - remainingSeconds) / contract.durationSeconds) * 100)}%` 
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartContract(contract)}
                        className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-red-600/20 text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      >
                        <Briefcase size={15} />
                        <span>بدء تنفيذ العقد ({contract.durationSeconds} ثانية)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Gameplay Impact Guide */}
      {activeTab === 'guide' && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="border-b border-zinc-800 pb-4">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Award className="text-amber-500" size={22} />
              <span>دليل منظومة المهارات وأثرها على موازين اللعب</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              كيف تُغير مهارات شخصيتك قواعد اللعبة في شوارع المافيا والنزاعات
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
            <div className="bg-black/50 border border-zinc-800/80 p-4 rounded-2xl space-y-2">
              <h4 className="font-bold text-amber-400 text-sm flex items-center gap-2">
                <Swords size={16} />
                <span>حسابات القوة والدفاع المباشر:</span>
              </h4>
              <p className="text-zinc-400">
                ترقيات مهارات الهجوم (مثل القبضة الحديدية للمجرم وأمر العمليات للزعيم) تندمج برمجياً في معادلة القوة الإجمالية للاعب وحراسه، مما يعطيك تفوقاً كاسحاً في نزاعات الشوارع وعمليات الهجوم ضد اللاعبين الآخرين.
              </p>
            </div>

            <div className="bg-black/50 border border-zinc-800/80 p-4 rounded-2xl space-y-2">
              <h4 className="font-bold text-blue-400 text-sm flex items-center gap-2">
                <TrendingUp size={16} />
                <span>أرباح الشركات والاستثمار:</span>
              </h4>
              <p className="text-zinc-400">
                مهارات التاجر (حنكة الأسواق والإعفاء الضريبي) تضاعف مبالغ العوائد عند استلام أرباح الشركات اليومية وتخفض عمولات غسيل الأموال في الخزائن السويسرية، مما يجعل التاجر أسرع من يحقق ثروة مليارية في المدينة.
              </p>
            </div>

            <div className="bg-black/50 border border-zinc-800/80 p-4 rounded-2xl space-y-2">
              <h4 className="font-bold text-orange-400 text-sm flex items-center gap-2">
                <Zap size={16} />
                <span>السطو وسرقة الخزائن:</span>
              </h4>
              <p className="text-zinc-400">
                اللص المحترف يرفع فرصة نجاح السرقات بنسبة تصل إلى +75%، ويتفادى كشف الإنذار ونجوم المطلوبية مما يسمح له بتنفيذ عدة سرقات متتالية دون التعرض للملاحقة من شرطة الدولة.
              </p>
            </div>

            <div className="bg-black/50 border border-zinc-800/80 p-4 rounded-2xl space-y-2">
              <h4 className="font-bold text-purple-400 text-sm flex items-center gap-2">
                <Compass size={16} />
                <span>التهريب والسوق السوداء:</span>
              </h4>
              <p className="text-zinc-400">
                مهارات المهرب تسمح بنقل كميات هائلة من الممنوعات وتفادي نقاط التفتيش في المطارات وتخفيض زمن السفر بين الدول إلى النصف، مع تحقيق هوامش ربح خيالية عند تسليم الشحنات في عالم الخفاء.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
