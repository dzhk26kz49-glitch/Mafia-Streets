import React, { useEffect, useState } from 'react';
import { 
  Heart, 
  ShoppingCart, 
  Check, 
  Clock, 
  Skull, 
  Users, 
  Stethoscope, 
  Activity, 
  ShieldAlert, 
  User, 
  Droplet, 
  Calendar, 
  Syringe,
  Truck,
  Building2,
  Cross,
  Bed,
  Scissors,
  Edit2,
  Pill,
  QrCode,
  ShieldCheck,
  Fingerprint,
  FlaskConical,
  Shield,
  Coins,
  Award,
  Zap,
  Sparkles,
  UserCheck,
  FileText,
  CheckCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatMoney, safeToDate } from '../lib/utils';
import { getVIPDiscount } from '../lib/vip';
import { getActiveRolePerks } from '../lib/rolePerks';
import PlayerAvatar from '../components/PlayerAvatar';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';
import { doc, updateDoc, collection, query, where, orderBy, limit, onSnapshot, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';

const DRUGS = [
  {
    id: 'paracetamol',
    nameKey: 'hospital.drugs.paracetamol',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=400',
    price: 5000,
    heal: 10,
    description: 'مسكن سريع للألام الخفيفة وإعادة النشاط الحركي.'
  },
  {
    id: 'ibuprofen',
    nameKey: 'hospital.drugs.ibuprofen',
    image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&q=80&w=400',
    price: 15000,
    heal: 25,
    description: 'مضاد التهاب قوي يقلل من فترة التعافي في العناية المركزة.'
  },
  {
    id: 'cetirizine',
    nameKey: 'hospital.drugs.cetirizine',
    image: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&q=80&w=400',
    price: 25000,
    heal: 15,
    description: 'مهدئ للأعصاب ومضاد للحساسية الناتجة عن الإصابات.'
  },
  {
    id: 'dextromethorphan',
    nameKey: 'hospital.drugs.dextromethorphan',
    image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&q=80&w=400',
    price: 50000,
    heal: 30,
    description: 'شراب طبي متطور لتجديد الخلايا التالفة في الجهاز التنفسي.'
  },
  {
    id: 'amoxicillin',
    nameKey: 'hospital.drugs.amoxicillin',
    image: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&q=80&w=400',
    price: 100000,
    heal: 50,
    description: 'مضاد حيوي فائق الفعالية يعيد بناء 50% من الصحة فوراً.'
  }
];

const INSURANCE_PLANS = [
  { id: 'bronze', name: 'التأمين البرونزي', cost: 500000, discount: 20, desc: 'تخفيض 20% على تكاليف العلاج وحماية أولية.' },
  { id: 'silver', name: 'التأمين الفضي', cost: 2000000, discount: 40, desc: 'تخفيض 40% وتجاوز طابور الانتظار في الطوارئ.' },
  { id: 'gold', name: 'التأمين الذهبي', cost: 7500000, discount: 65, desc: 'تخفيض 65% وتغطية شاملة للعمليات الجراحية.' },
  { id: 'platinum', name: 'التأمين البلاتيني الملكي', cost: 20000000, discount: 90, desc: 'علاج شبه مجاني (تخفيض 90%) ورعاية فائقة VIP.' }
];

const MEDICAL_STAFF = [
  { id: 'surgeon', name: 'جراح الاعصاب د. فهد', role: 'رئيس الجراحين', salary: 250000, bonus: 'تسريع التعافي بنسبة 35%', image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400' },
  { id: 'nurse', name: 'الممرضة الرئيسية سارة', role: 'رئيسة التمريض', salary: 100000, bonus: 'تقليل تكلفة العلاج 20%', image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400' },
  { id: 'specialist', name: 'أخصائي الصدمات د. رمزي', role: 'خبير طوارئ', salary: 500000, bonus: 'منع الوفاة الحرجة تماماً', image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400' }
];

const RESEARCH_TECH = [
  { id: 'nano_serum', name: 'سيروم النانو الحيوي', cost: 15000000, perk: 'زيادة الحد الأقصى للصحة بنسبة +20%' },
  { id: 'cell_regen', name: 'تجديد الخلايا الجذعية', cost: 35000000, perk: 'مضاعفة سرعة الاستشفاء التلقائي' },
  { id: 'pain_block', name: 'حاصرات الألم العصبية', cost: 50000000, perk: 'تخفيض الضرر الناجم عن الاشتباكات بنسبة 15%' }
];

const SECTIONS = [
  { id: 'emergency', icon: Activity, color: 'blue', labelKey: 'hospital.emergency', image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=1200' },
  { id: 'pharmacy', icon: Pill, color: 'emerald', labelKey: 'hospital.pharmacy', image: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&q=80&w=1200' },
  { id: 'insurance', icon: Shield, color: 'amber', labelKey: 'التأمين الطبي', image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=1200' },
  { id: 'staff', icon: Users, color: 'purple', labelKey: 'الطاقم الطبي والخبراء', image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1200' },
  { id: 'research', icon: FlaskConical, color: 'rose', labelKey: 'أبحاث البيوتكنولوجي', image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&q=80&w=1200' },
  { id: 'blackmarket', icon: ShieldAlert, color: 'red', labelKey: 'عيادة السوق السوداء', image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&q=80&w=1200' }
];

const getColorClasses = (color: string, isActive: boolean) => {
  switch(color) {
    case 'blue':
      return isActive ? 'bg-blue-500/20 border-blue-500/60 text-blue-400 shadow-[0_0_20px_rgba(0,0,0,0.4)] scale-102' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white';
    case 'emerald':
      return isActive ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400 shadow-[0_0_20px_rgba(0,0,0,0.4)] scale-102' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white';
    case 'amber':
      return isActive ? 'bg-amber-500/20 border-amber-500/60 text-amber-400 shadow-[0_0_20px_rgba(0,0,0,0.4)] scale-102' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white';
    case 'purple':
      return isActive ? 'bg-purple-500/20 border-purple-500/60 text-purple-400 shadow-[0_0_20px_rgba(0,0,0,0.4)] scale-102' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white';
    case 'rose':
      return isActive ? 'bg-rose-500/20 border-rose-500/60 text-rose-400 shadow-[0_0_20px_rgba(0,0,0,0.4)] scale-102' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white';
    case 'red':
      return isActive ? 'bg-red-500/20 border-red-500/60 text-red-400 shadow-[0_0_20px_rgba(0,0,0,0.4)] scale-102' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white';
    default:
      return isActive ? 'bg-blue-500/20 border-blue-500/60 text-blue-400 shadow-[0_0_20px_rgba(0,0,0,0.4)] scale-102' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white';
  }
};

const getTextColor = (color: string) => {
  switch(color) {
    case 'blue': return 'text-blue-500';
    case 'emerald': return 'text-emerald-500';
    case 'amber': return 'text-amber-500';
    case 'purple': return 'text-purple-500';
    case 'rose': return 'text-rose-500';
    case 'red': return 'text-red-500';
    default: return 'text-blue-500';
  }
};

export default function Hospital() {
  const { t } = useTranslation();
  const { 
    profile, 
    heal, 
    hirePrivateDoctor, 
    buySurgeryRoom, 
    buyAmbulance, 
    processing 
  } = useAuthStore();
  const [activeTab, setActiveTab] = useState('emergency');
  const [recoveringPlayers, setRecoveringPlayers] = useState<any[]>([]);
  const [cemeteryKills, setCemeteryKills] = useState<any[]>([]);
  const [sectionImages, setSectionImages] = useState<Record<string, string>>({
    emergency: SECTIONS[0].image,
    pharmacy: SECTIONS[1].image,
    insurance: SECTIONS[2].image,
    staff: SECTIONS[3].image,
    research: SECTIONS[4].image,
    blackmarket: SECTIONS[5].image
  });
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');

  const health = profile?.health ?? 100;

  // Automatic Discharge Check: if health is 100% and city is hospital, instantly discharge back to baghdad
  useEffect(() => {
    if (profile && profile.city === 'hospital' && health >= 100) {
      const autoDischarge = async () => {
        try {
          const docRef = doc(db, 'users', profile.uid);
          await updateDoc(docRef, {
            city: 'baghdad',
            hospitalizedUntil: null,
            killedBy: null
          });
          toast.success('تم تعافيك تماماً وخروجك من المستشفى إلى العاصمة بغداد بنجاح! 🏥✨');
        } catch (e) {
          console.error("Auto discharge error:", e);
        }
      };
      autoDischarge();
    }
  }, [health, profile?.city, profile?.uid]);

  useEffect(() => {
    if (profile?.city === 'hospital') {
      if (health < 30) setActiveTab('emergency');
    }
  }, [health, profile?.city]);

  // Query only players whose health < 100 so that fully healed patients automatically disappear from the recovery ward
  useEffect(() => {
    const q = query(
      collection(db, 'users_public'), 
      where('city', '==', 'hospital'), 
      where('health', '<', 100), 
      limit(20)
    );
    const unsubscribeRecovering = onSnapshot(q, (snapshot) => {
      setRecoveringPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const killsQ = query(collection(db, 'kills'), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribeCemetery = onSnapshot(killsQ, (snapshot) => {
      setCemeteryKills(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeRecovering();
      unsubscribeCemetery();
    };
  }, []);

  const handleHeal = async () => {
    if (!profile) return;
    if (health >= 100) {
      toast.error(t('hospital.alreadyFull'));
      return;
    }
    const perks = getActiveRolePerks(profile);
    let cost = health === 0 ? 100000 : 10000;
    cost = Math.floor(cost * getVIPDiscount(profile.vipLevel as any));
    if (perks.crimRecoverySpeedPercent > 0) {
      cost = Math.floor(cost * (1 - Math.min(0.7, (perks.crimRecoverySpeedPercent / 100) * 0.5)));
    }
    await heal(cost);
  };

  const handleBuyDrug = async (drug: typeof DRUGS[0]) => {
    if (!profile) return;
    if (profile.cleanMoney < drug.price) {
      toast.error(t('common.noMoney'));
      return;
    }

    try {
      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, {
        cleanMoney: increment(-drug.price),
        [`inventory.drugs.${drug.id}`]: increment(1)
      });
      toast.success(t('common.success'));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const handleUseDrug = async (drug: typeof DRUGS[0]) => {
    if (!profile || !profile.inventory?.drugs?.[drug.id]) return;
    if (health >= 100) {
      toast.error(t('hospital.alreadyFull'));
      return;
    }

    try {
      const perks = getActiveRolePerks(profile);
      let healAmount = drug.heal;
      if (perks.crimRecoverySpeedPercent > 0) {
        healAmount = Math.floor(healAmount * (1 + (perks.crimRecoverySpeedPercent / 100)));
      }

      const docRef = doc(db, 'users', profile.uid);
      const newHealth = Math.min(100, health + healAmount);
      const shouldDischarge = newHealth >= 100;

      await updateDoc(docRef, {
        health: newHealth,
        [`inventory.drugs.${drug.id}`]: increment(-1),
        hospitalizedUntil: shouldDischarge ? null : profile.hospitalizedUntil,
        city: shouldDischarge ? 'baghdad' : profile.city
      });

      if (shouldDischarge) {
        toast.success('تم شفاؤك بنجاح وعودتك إلى بغداد! 🏥✨');
      } else {
        toast.success(t('common.success') + ` (استعادة +${healAmount}% صحة)`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const handleBuyInsurance = async (plan: typeof INSURANCE_PLANS[0]) => {
    if (!profile) return;
    if (profile.cleanMoney < plan.cost) {
      toast.error(t('common.noMoney'));
      return;
    }
    try {
      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, {
        cleanMoney: increment(-plan.cost),
        hospitalInsurance: plan.id
      });
      toast.success(`تم تفعيل ${plan.name} بنجاح! 🛡️`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const handleHireStaff = async (staffMember: typeof MEDICAL_STAFF[0]) => {
    if (!profile) return;
    if (profile.cleanMoney < staffMember.salary) {
      toast.error(t('common.noMoney'));
      return;
    }
    try {
      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, {
        cleanMoney: increment(-staffMember.salary),
        [`hospitalStaff.${staffMember.id}`]: true
      });
      toast.success(`تم تعيين ${staffMember.name} بنجاح! 🩺`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const handleResearchTech = async (tech: typeof RESEARCH_TECH[0]) => {
    if (!profile) return;
    if (profile.cleanMoney < tech.cost) {
      toast.error(t('common.noMoney'));
      return;
    }
    try {
      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, {
        cleanMoney: increment(-tech.cost),
        [`medicalResearch.${tech.id}`]: true
      });
      toast.success(`تم استكمال أبحاث ${tech.name} بنجاح! 🧬`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const handleUpdateImage = () => {
    if (!newImageUrl) return;
    setSectionImages(prev => ({ ...prev, [activeTab]: newImageUrl }));
    setIsEditingImage(false);
    setNewImageUrl('');
    toast.success(t('common.success'));
  };

  // Recovery time proportional to health: Time remaining = (100 - health) * factor
  const getProportionalRecoveryTime = () => {
    if (!profile?.hospitalizedUntil) return null;
    const remaining = Math.max(0, profile.hospitalizedUntil - Date.now());
    if (remaining === 0) return null;
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')} (${100 - health}% متبقي)`;
  };

  const currentSection = SECTIONS.find(s => s.id === activeTab) || SECTIONS[0];

  return (
    <div className="text-white space-y-8 max-w-7xl mx-auto pb-24 px-4 text-xs md:text-sm">
      {/* Header Banner */}
      <div className="relative rounded-[2.5rem] overflow-hidden border border-red-500/30 bg-gradient-to-r from-zinc-950 via-zinc-900 to-red-950/40 p-6 md:p-8 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-600/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-red-600/20 text-red-500 rounded-2xl border border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.3)] backdrop-blur-xl">
              <Cross size={32} className="animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-red-500/10 text-red-400 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-red-500/20 uppercase tracking-widest">
                  المركز الطبي المركزي
                </span>
                <span className="bg-emerald-500/10 text-emerald-400 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-widest">
                  مفتوح 24/7
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter italic">
                {t('hospital.title')}
              </h2>
              <p className="text-zinc-400 text-xs md:text-sm font-medium max-w-lg">
                {t('hospital.desc')} - رعاية متقدمة، طوارئ، وعيادات سرية لرجال المافيا.
              </p>
            </div>
          </div>

          {/* Health Status Bar HUD */}
          <div className="bg-zinc-900/80 backdrop-blur-xl p-4 rounded-2xl border border-zinc-800 flex items-center gap-4 shadow-xl">
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#27272a" strokeWidth="10" />
                <circle 
                  cx="50" cy="50" r="42" 
                  fill="none" 
                  stroke={health > 30 ? "#22c55e" : "#ef4444"} 
                  strokeWidth="10" 
                  strokeDasharray={`${health * 2.638} 263.8`} 
                  strokeLinecap="round"
                  className="transition-all duration-1000" 
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xs font-black tracking-tighter">{health}%</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-bold uppercase tracking-wider">
                <Heart size={12} className="text-red-500 animate-bounce" />
                <span>{t('family.health')}</span>
              </div>
              {profile?.hospitalizedUntil && getProportionalRecoveryTime() ? (
                <div className="flex items-center gap-1.5 text-red-400 text-[11px] font-black">
                  <Clock size={12} />
                  <span>التعافي: {getProportionalRecoveryTime()}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-black">
                  <CheckCircle size={12} />
                  <span>صحة مكتملة (جاهز)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Font Size 12px - 14px disciplined) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveTab(section.id)}
            className={`flex items-center gap-2.5 p-3.5 rounded-2xl font-black uppercase tracking-tight transition-all duration-300 border text-xs ${getColorClasses(section.color, activeTab === section.id)}`}
          >
            <section.icon size={18} />
            <span className="truncate">{t(section.labelKey) || section.labelKey}</span>
          </button>
        ))}
      </div>

      {/* Section Hero Banner */}
      <div className="relative h-[260px] rounded-[2.5rem] overflow-hidden border border-zinc-800 group shadow-xl">
        <img 
          src={sectionImages[activeTab]} 
          alt="" 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
        
        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between z-10">
          <div>
            <h3 className="text-xl md:text-2xl font-black uppercase italic text-white mb-1.5 tracking-tight">
              {t(currentSection.labelKey) || currentSection.labelKey}
            </h3>
            <div className="flex items-center gap-2 text-zinc-300 font-bold text-xs">
              <Activity size={14} className={getTextColor(currentSection.color)} />
              <span>قسم معتمد رسمياً لدى نقابة أطباء المافيا</span>
            </div>
          </div>
          
          <button 
            onClick={() => setIsEditingImage(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-zinc-900/80 backdrop-blur-xl border border-zinc-700 rounded-xl hover:bg-zinc-800 transition-colors text-white font-black text-[11px] uppercase tracking-widest shadow-lg"
          >
            <Edit2 size={14} />
            <span>تغيير الخلفية</span>
          </button>
        </div>
      </div>

      {/* Tab Content Components */}
      <div className="space-y-6">
        {/* 1. Emergency Trauma Center */}
        {activeTab === 'emergency' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-[2.5rem] p-6 md:p-8 space-y-5 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/20 text-blue-500 rounded-xl border border-blue-500/30">
                  <Activity size={22} />
                </div>
                <div>
                  <h4 className="text-base md:text-lg font-black italic uppercase">قسم الطوارئ والعناية المركزة</h4>
                  <p className="text-zinc-400 text-xs font-medium">علاج فوري للإصابات الخطيرة وتخفيف المخاطر</p>
                </div>
              </div>

              <div className="bg-zinc-950/60 p-5 rounded-2xl border border-zinc-800/80 space-y-3">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-zinc-400">حالة المريض الحالية:</span>
                  <span className={health > 50 ? 'text-emerald-400 font-black' : 'text-red-400 font-black animate-pulse'}>
                    {health > 50 ? 'مستقرة نسبياً' : 'حرجة للغاية! تتطلب تدخلاً فورياً'}
                  </span>
                </div>
                <div className="w-full bg-zinc-900 h-3 rounded-full overflow-hidden p-0.5 border border-zinc-800">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${health > 50 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]'}`} 
                    style={{ width: `${health}%` }}
                  />
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  وقت التعافي يتناسب طردياً مع مقدار الصحة المفقودة (وقت = صحة). بمجرد بلوغ الصحة 100% يغادر اللاعب المستشفى تلقائياً.
                </p>
              </div>

              <button
                onClick={handleHeal}
                disabled={health >= 100 || processing}
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-tight text-xs transition-all flex items-center justify-center gap-2.5 shadow-xl ${
                  health >= 100 
                    ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40 hover:scale-[1.01]'
                }`}
              >
                <Heart size={18} className="text-red-400" />
                <span>{health >= 100 ? 'الصحة مكتملة 100%' : `علاج فوري شامل (${formatMoney(Math.floor((health === 0 ? 100000 : 10000) * getVIPDiscount(profile?.vipLevel as any)))})`}</span>
              </button>
            </div>

            {/* Recovery Ward sidebar (Fully Healed Players Disappear Automatically) */}
            <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-[2.5rem] p-6 md:p-8 space-y-5 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Bed size={20} className="text-blue-400" />
                  <h4 className="text-sm md:text-base font-black italic uppercase">عنبر المرضى</h4>
                </div>
                <span className="bg-blue-500/20 text-blue-400 text-[11px] font-black px-2.5 py-0.5 rounded-lg border border-blue-500/30">
                  {recoveringPlayers.length} نزيل
                </span>
              </div>
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                {recoveringPlayers.length === 0 ? (
                  <div className="text-center py-10 text-zinc-600 font-bold uppercase text-[11px]">
                    لا توجد حالات طوارئ نشطة حالياً
                  </div>
                ) : (
                  recoveringPlayers.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
                      <div className="flex items-center gap-2.5">
                        <PlayerAvatar photoURL={p.photoURL} displayName={p.displayName} vipLevel={p.vipLevel} size="sm" />
                        <div>
                          <div className="font-black text-xs">{p.displayName}</div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">قيد التعافي</div>
                        </div>
                      </div>
                      <span className="text-red-400 font-black text-xs">{p.health}%</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. Pharmacy */}
        {activeTab === 'pharmacy' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {DRUGS.map((drug) => (
              <motion.div
                key={drug.id}
                whileHover={{ y: -4 }}
                className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-[2rem] overflow-hidden flex flex-col shadow-xl group text-xs"
              >
                <div className="relative h-48 bg-zinc-950 p-4 flex items-center justify-center overflow-hidden">
                  <img src={drug.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
                  <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow">
                    +{drug.heal}% صحة
                  </div>
                </div>
                
                <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="text-sm md:text-base font-black italic mb-1 tracking-tight">{t(drug.nameKey) || drug.nameKey}</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">{drug.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-black text-xs md:text-sm">
                        <Coins size={14} />
                        <span>{formatMoney(drug.price)}</span>
                      </div>
                      <div className="bg-zinc-800/80 px-2.5 py-0.5 rounded-lg border border-zinc-700 text-[10px] font-black text-zinc-300">
                        المخزون: {profile?.inventory?.drugs?.[drug.id] || 0}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => handleBuyDrug(drug)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-black uppercase text-[11px] tracking-tight transition-all shadow-md shadow-emerald-900/30 flex items-center justify-center gap-1.5"
                    >
                      <ShoppingCart size={14} />
                      <span>شراء</span>
                    </button>
                    {profile?.inventory?.drugs?.[drug.id] > 0 && (
                      <button
                        onClick={() => handleUseDrug(drug)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-black uppercase text-[11px] tracking-tight transition-all border border-zinc-700 flex items-center justify-center gap-1.5"
                      >
                        <Check size={14} />
                        <span>استخدام</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* 3. Insurance Plans */}
        {activeTab === 'insurance' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {INSURANCE_PLANS.map((plan) => (
              <div key={plan.id} className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-[2.5rem] p-6 md:p-8 space-y-4 shadow-xl relative overflow-hidden group text-xs">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-bl-full pointer-events-none group-hover:bg-amber-500/20 transition-colors" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                      <Shield size={22} />
                    </div>
                    <div>
                      <h4 className="text-sm md:text-base font-black italic">{plan.name}</h4>
                      <p className="text-[11px] text-amber-400 font-bold">تخفيض {plan.discount}% على فواتير المستشفى</p>
                    </div>
                  </div>
                  <span className="text-sm md:text-base font-black text-amber-400">{formatMoney(plan.cost)}</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">{plan.desc}</p>
                <button
                  onClick={() => handleBuyInsurance(plan)}
                  disabled={profile?.hospitalInsurance === plan.id}
                  className={`w-full py-3.5 rounded-xl font-black uppercase text-[11px] tracking-wider transition-all shadow-lg ${
                    profile?.hospitalInsurance === plan.id
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 cursor-default'
                      : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/40'
                  }`}
                >
                  {profile?.hospitalInsurance === plan.id ? 'التأمين مفعل حالياً' : 'اشترك في الباقة الآن'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 4. Medical Staff */}
        {activeTab === 'staff' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MEDICAL_STAFF.map((staff) => (
              <div key={staff.id} className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-[2.5rem] p-6 flex flex-col items-center text-center shadow-xl group text-xs">
                <div className="w-24 h-24 rounded-full border-4 border-purple-500/30 overflow-hidden mb-4 shadow-xl group-hover:scale-105 transition-transform">
                  <img src={staff.image} alt="" className="w-full h-full object-cover" />
                </div>
                <h4 className="text-sm md:text-base font-black italic mb-0.5">{staff.name}</h4>
                <span className="text-purple-400 text-[10px] font-bold uppercase tracking-widest mb-2.5">{staff.role}</span>
                <p className="text-[11px] text-zinc-400 mb-5 bg-zinc-950/60 px-3 py-1.5 rounded-lg border border-zinc-800">{staff.bonus}</p>
                <button
                  onClick={() => handleHireStaff(staff)}
                  disabled={profile?.hospitalStaff?.[staff.id]}
                  className={`w-full py-3.5 rounded-xl font-black uppercase text-[11px] tracking-wider transition-all shadow-lg ${
                    profile?.hospitalStaff?.[staff.id]
                      ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/40'
                  }`}
                >
                  {profile?.hospitalStaff?.[staff.id] ? 'تم التعيين' : `تعيين (${formatMoney(staff.salary)})`}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 5. Biotech Research */}
        {activeTab === 'research' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {RESEARCH_TECH.map((tech) => (
              <div key={tech.id} className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-[2.5rem] p-6 space-y-4 shadow-xl flex flex-col justify-between text-xs">
                <div className="space-y-3">
                  <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30 w-fit">
                    <FlaskConical size={22} />
                  </div>
                  <h4 className="text-sm md:text-base font-black italic">{tech.name}</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">{tech.perk}</p>
                </div>
                <div className="space-y-3 pt-3 border-t border-zinc-800">
                  <div className="text-rose-400 font-black text-xs md:text-sm">{formatMoney(tech.cost)}</div>
                  <button
                    onClick={() => handleResearchTech(tech)}
                    disabled={profile?.medicalResearch?.[tech.id]}
                    className={`w-full py-3.5 rounded-xl font-black uppercase text-[11px] tracking-wider transition-all shadow-lg ${
                      profile?.medicalResearch?.[tech.id]
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 cursor-default'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40'
                    }`}
                  >
                    {profile?.medicalResearch?.[tech.id] ? 'تم استكمال الأبحاث' : 'بدء الأبحاث'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 6. Black Market Clinic */}
        {activeTab === 'blackmarket' && (
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-red-500/30 rounded-[2.5rem] p-6 md:p-8 space-y-6 shadow-xl text-xs">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-600/20 text-red-500 rounded-xl border border-red-500/30">
                <ShieldAlert size={26} />
              </div>
              <div>
                <h4 className="text-lg md:text-xl font-black italic uppercase text-red-400">عيادة السوق السوداء السرية</h4>
                <p className="text-zinc-400 text-xs font-medium">إجراءات طبية محظورة وسريعة للمجرمين المطلوبين أمنياً</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-zinc-950/80 p-6 rounded-2xl border border-zinc-800 space-y-3">
                <h5 className="text-sm md:text-base font-black italic">زرع الأعضاء السرية</h5>
                <p className="text-[11px] text-zinc-400 leading-relaxed">استبدال الأنسجة التالفة بأعضاء مجهولة المصدر لاستعادة 100% صحة فوراً دون دخول السجلات الرسمية.</p>
                <button 
                  onClick={async () => {
                    if (!profile || profile.cleanMoney < 250000) {
                      toast.error('لا توجد أموال كافية (التكلفة: 250,000$)');
                      return;
                    }
                    try {
                      await updateDoc(doc(db, 'users', profile.uid), {
                        cleanMoney: increment(-250000),
                        health: 100,
                        hospitalizedUntil: null,
                        city: 'baghdad'
                      });
                      toast.success('تمت عملية الزرع السرية بنجاح وتم شفائك وخروجك لبغداد! 🥷✨');
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="w-full bg-red-600 hover:bg-red-500 text-white py-3.5 rounded-xl font-black uppercase text-[11px] tracking-wider transition-all shadow-lg shadow-red-900/40"
                >
                  عملية زرع فورية (250,000$)
                </button>
              </div>

              <div className="bg-zinc-950/80 p-6 rounded-2xl border border-zinc-800 space-y-3">
                <h5 className="text-sm md:text-base font-black italic">محو السجل الطبي الأمني</h5>
                <p className="text-[11px] text-zinc-400 leading-relaxed">إزالة كافة السجلات والبلاغات الأمنية من أرشيف المستشفى والشرطة لحماية هويتك.</p>
                <button
                  onClick={async () => {
                    if (!profile || profile.cleanMoney < 500000) {
                      toast.error('لا توجد أموال كافية (التكلفة: 500,000$)');
                      return;
                    }
                    try {
                      await updateDoc(doc(db, 'users', profile.uid), {
                        cleanMoney: increment(-500000),
                        killedBy: null
                      });
                      toast.success('تم محو سجلك الطبي والأمني بالكامل بنجاح! 🔒');
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3.5 rounded-xl font-black uppercase text-[11px] tracking-wider transition-all border border-zinc-700"
                >
                  محو السجل الأمني (500,000$)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cemetery Section */}
      <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-xl text-xs">
        <div className="p-6 border-b border-zinc-800 bg-zinc-950/40 flex items-center gap-3">
          <Skull size={22} className="text-zinc-500" />
          <h4 className="text-sm md:text-base font-black italic uppercase tracking-wider text-zinc-300">مقبرة ضحايا العصابات في العاصمة</h4>
        </div>
        
        <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-5">
          {cemeteryKills.length > 0 ? (
            <div className="divide-y divide-zinc-800/50">
              {cemeteryKills.map((kill) => (
                <div key={kill.id} className="py-3.5 px-4 hover:bg-white/5 transition-colors flex items-center justify-between rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                      <Skull size={20} />
                    </div>
                    <div>
                      <div className="flex flex-col md:flex-row md:items-center gap-1.5 mb-1">
                        <span className="text-white font-black italic text-sm">{kill.victimName}</span>
                        <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">لقي حتفه على يد</span>
                        <span className="text-red-500 font-black italic text-sm">{kill.killerName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                        <Clock size={10} />
                        {safeToDate(kill.timestamp).toLocaleString('ar-EG')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center">
              <Skull size={40} className="mx-auto text-zinc-800 mb-3" />
              <p className="text-zinc-500 font-black uppercase tracking-widest text-[11px]">المقبرة هادئة اليوم.. لا توجد وفيات مسجلة.</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Image Modal */}
      <AnimatePresence>
        {isEditingImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 text-xs">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingImage(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-zinc-900 border border-zinc-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl space-y-5"
            >
              <h3 className="text-base font-black uppercase italic">تحديث صورة القسم</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">رابط الصورة (URL)</label>
                  <input
                    type="text"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-3 text-white focus:border-red-500 transition-colors outline-none font-bold text-xs"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setIsEditingImage(false)}
                    className="flex-1 py-3 rounded-xl font-black uppercase text-[11px] text-zinc-400 hover:text-white transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleUpdateImage}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-black uppercase text-[11px] tracking-wider shadow-md shadow-red-900/40"
                  >
                    حفظ التغييرات
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
