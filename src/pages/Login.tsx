import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore, Role } from '../store/useAuthStore';
import { 
  Shield, 
  Skull, 
  Briefcase, 
  Car, 
  Users, 
  UserCheck, 
  Flame, 
  Camera, 
  Calendar, 
  Globe, 
  User, 
  RotateCcw,
  CheckCircle2,
  FileCheck,
  Maximize2,
  X,
  Copy,
  Check
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { OfficialDocument } from '../components/OfficialDocument';
import { COUNTRIES } from '../constants/countries';

const ROLES_INFO: { id: Role; title: string; desc: string; icon: any; color: string; bg: string; perk: string }[] = [
  { 
    id: 'Boss', 
    title: 'الزعيم (Boss)', 
    desc: 'القائد الأعلى للعصابة، يتمتع بهيبة مطلقة وسيطرة قوية في الشوارع.', 
    icon: Shield, 
    color: 'text-red-500', 
    bg: 'bg-red-500/10',
    perk: '+50 سمعة مبدئية وقوة هجومية إضافية في المعارك'
  },
  { 
    id: 'Trader', 
    title: 'التاجر (Trader)', 
    desc: 'خبير الأسواق والصفقات الكبرى، يضاعف أرباح الشركات والعقارات.', 
    icon: Briefcase, 
    color: 'text-blue-500', 
    bg: 'bg-blue-500/10',
    perk: '+1,000,000$ أموال إضافية عند البدء وأرباح تجارية أعلى'
  },
  { 
    id: 'Thief', 
    title: 'اللص (Thief)', 
    desc: 'محترف التسلل والسرقات الليلية، ينهب الخزائن والسيارات بحرفية.', 
    icon: Car, 
    color: 'text-orange-500', 
    bg: 'bg-orange-500/10',
    perk: '+30% نسبة نجاح ومكاسب في السرقات والسطو'
  },
  { 
    id: 'Smuggler', 
    title: 'المهرب (Smuggler)', 
    desc: 'ملك الشحن والممنوعات في السوق السوداء، حركة أسرع عبر المدن.', 
    icon: Users, 
    color: 'text-purple-500', 
    bg: 'bg-purple-500/10',
    perk: 'خصومات على الشحن وسرعة فائقة في صفقات الممنوعات'
  },
  { 
    id: 'Criminal', 
    title: 'المجرم (Criminal)', 
    desc: 'عنصر قتالي شرس، صلابة ودفاع حديدي في مواجهات العصابات.', 
    icon: Skull, 
    color: 'text-zinc-400', 
    bg: 'bg-zinc-800',
    perk: 'دفاع قتالي قوي وتقليل مدة العقوبات والسجون'
  },
];

// 10 NPC Characters from the Underground World (صور شخصيات NPCs في عالم الخفاء)
// 5 Men NPCs (5 رجال)
export const MALE_NPC_CHARACTERS = [
  {
    id: 'male_npc_1',
    name: 'ثري عالم الخفاء (Wealthy Boss)',
    url: '/images/npcs/male_wealthy.jpg',
    tag: 'رجل أعمال ونفوذ'
  },
  {
    id: 'male_npc_2',
    name: 'متمرد قبضاي (Aggressive Enforcer)',
    url: '/images/npcs/male_aggressive.jpg',
    tag: 'مقاتل وزعيم الأزقة'
  },
  {
    id: 'male_npc_3',
    name: 'الميداني المحترف (Street Operative)',
    url: '/images/npcs/male_regular.jpg',
    tag: 'خبير العصابات الميداني'
  },
  {
    id: 'male_npc_4',
    name: 'المخطط الهادئ (Natural Mastermind)',
    url: '/images/npcs/male_natural.jpg',
    tag: 'العقل المدبر والوسيط'
  },
  {
    id: 'male_npc_5',
    name: 'ابن الأحياء الشعبية (Underground Brawler)',
    url: '/images/npcs/male_poor.jpg',
    tag: 'المكافح والفدائي'
  }
];

// 5 Women NPCs (5 نساء)
export const FEMALE_NPC_CHARACTERS = [
  {
    id: 'female_npc_1',
    name: 'ثرية بغدادية (Wealthy Elite)',
    url: '/images/npcs/female_wealthy.jpg',
    tag: 'سيدة الأعمال والنفوذ'
  },
  {
    id: 'female_npc_2',
    name: 'متمردة أزقة (Aggressive Rebel)',
    url: '/images/npcs/female_aggressive.jpg',
    tag: 'مقاتلة شوارع شرسة'
  },
  {
    id: 'female_npc_3',
    name: 'الميدانية الخبيرة (Covert Operative)',
    url: '/images/npcs/female_regular.jpg',
    tag: 'محترفة العمليات والتسلل'
  },
  {
    id: 'female_npc_4',
    name: 'العقل المدبر (Natural Strategist)',
    url: '/images/npcs/female_natural.jpg',
    tag: 'استخبارات وتخطيط'
  },
  {
    id: 'female_npc_5',
    name: 'ابنة الشوارع المكافحة (Underground Fighter)',
    url: '/images/npcs/female_poor.jpg',
    tag: 'الشجاعة والميدانية'
  }
];

// Synthesize camera mechanical shutter sound using Web Audio API
const playCameraSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // First click (shutter opening)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(800, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.05);
    gain1.gain.setValueAtTime(0.8, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.06);

    // Second click (shutter release)
    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(650, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.07);
        gain2.gain.setValueAtTime(0.6, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.07);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.08);
      } catch (err) {
        // Ignore audio errors
      }
    }, 110);
  } catch (e) {
    // Ignore audio initialization errors
  }
};

export default function Login() {
  const { t } = useTranslation();
  const { user, profile, createProfile, loggingIn, loading } = useAuthStore();
  
  // Registration flow state
  const [step, setStep] = useState<'form' | 'id_card'>('form');
  const [isFlashing, setIsFlashing] = useState(false);
  
  // Profile customization fields
  const [selectedRole, setSelectedRole] = useState<Role>('Boss');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [selectedAvatar, setSelectedAvatar] = useState(MALE_NPC_CHARACTERS[0].url);
  const [nickname, setNickname] = useState('');
  const [birthdate, setBirthdate] = useState('1995-05-15');
  const [country, setCountry] = useState('iq');
  const [generatedDocNum, setGeneratedDocNum] = useState('');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  // Zoom / Enlarge modal state
  const [zoomedImage, setZoomedImage] = useState<{ name: string; url: string; tag: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user && !profile && user.displayName && !nickname) {
      setNickname(user.displayName);
    }
    if (user && !generatedDocNum) {
      const randomSuffix = Math.floor(10000 + Math.random() * 90000);
      setGeneratedDocNum(`ID-${country.toUpperCase()}-${user.uid.slice(0, 4).toUpperCase()}-${randomSuffix}`);
    }
  }, [user, profile, country]);

  useEffect(() => {
    // Reset avatar default to matching NPC set when gender changes
    if (gender === 'male') {
      setSelectedAvatar(MALE_NPC_CHARACTERS[0].url);
    } else {
      setSelectedAvatar(FEMALE_NPC_CHARACTERS[0].url);
    }
  }, [gender]);

  const handleLogin = () => {
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    useAuthStore.setState({ loggingIn: true });
    
    signInWithPopup(auth, googleProvider)
      .then(() => {
        useAuthStore.setState({ loggingIn: false });
      })
      .catch((error: any) => {
        if (error.code === 'auth/popup-blocked') {
          toast.loading('جاري تحويلك لتسجيل الدخول...');
          signInWithRedirect(auth, googleProvider).catch(() => {
             toast.error('فشل التحويل لتسجيل الدخول.');
             useAuthStore.setState({ loggingIn: false });
          });
        } else if (error.code === 'auth/popup-closed-by-user') {
          toast.info('تم إغلاق نافذة تسجيل الدخول.');
          useAuthStore.setState({ loggingIn: false });
        } else {
          toast.error('فشل تسجيل الدخول. تأكد من إعدادات الحساب.');
          useAuthStore.setState({ loggingIn: false });
        }
      });
  };

  // Trigger camera flash and move to ID Card Preview
  const handleProceedToIDCard = () => {
    if (!nickname.trim()) {
      toast.error('يرجى إدخال اسم اللاعب في المدينة');
      return;
    }
    if (!birthdate) {
      toast.error('يرجى اختيار تاريخ الميلاد');
      return;
    }

    // Play camera audio & trigger flash visual
    playCameraSound();
    setIsFlashing(true);

    setTimeout(() => {
      setIsFlashing(false);
      setStep('id_card');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 450);
  };

  // Final confirmation: create profile and enter game
  const handleFinalizeRegistration = async () => {
    setIsCreatingProfile(true);
    try {
      await createProfile(
        selectedRole, 
        nickname, 
        gender, 
        selectedAvatar, 
        { birthdate, country }
      );
      toast.success('تم إصدار بطاقة الهوية وتأسيس حسابك بنجاح! مرحباً بك في عالم المافيا.');
    } catch (error: any) {
      toast.error(error.message || t('common.failed'));
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleCopyUrl = (url: string) => {
    const fullUrl = window.location.origin + url;
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(url);
    toast.success('تم نسخ رابط الصورة بنجاح!');
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const getCountryName = (code: string) => {
    const found = COUNTRIES.find(c => c.code === code);
    return found?.nameAr || found?.name || 'العراق';
  };

  if (user && profile) {
    return <Navigate to="/" />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4" />
      </div>
    );
  }

  // Registration step for new authenticated users
  if (user && !profile) {
    const charactersList = gender === 'male' ? MALE_NPC_CHARACTERS : FEMALE_NPC_CHARACTERS;
    const currentRoleInfo = ROLES_INFO.find(r => r.id === selectedRole) || ROLES_INFO[0];
    const RoleIcon = currentRoleInfo.icon;

    // Temporary profile structure for OfficialDocument ID preview
    const previewProfile = {
      uid: user.uid,
      displayName: nickname || 'لاعب جديد',
      photoURL: selectedAvatar,
      country: country,
      birthdate: birthdate || '1995-05-15',
      docNumber: generatedDocNum || `ID-${country.toUpperCase()}-001`,
      createdAt: new Date(),
      role: selectedRole
    };

    const idCardDoc = {
      id: 'idCard',
      header: 'بطاقة الهوية الوطنية / NATIONAL ID',
      subHeader: 'بطاقة الهوية الوطنية',
      color: 'from-blue-700 to-blue-900',
      icon: User
    };

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden py-10">
        
        {/* Full-screen camera flash burst overlay */}
        {isFlashing && (
          <div 
            className="fixed inset-0 z-50 pointer-events-none bg-white transition-opacity duration-300"
            style={{
              animation: 'cameraFlashAnim 0.45s ease-out forwards'
            }}
          />
        )}

        <style>{`
          @keyframes cameraFlashAnim {
            0% { opacity: 0.95; }
            30% { opacity: 1; }
            100% { opacity: 0; }
          }
        `}</style>

        {/* IMAGE ZOOM / LIGHTBOX MODAL */}
        {zoomedImage && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setZoomedImage(null)}>
            <div 
              className="relative max-w-lg w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4 text-right"
              onClick={(e) => e.stopPropagation()}
              dir="rtl"
            >
              {/* Close Button */}
              <button 
                onClick={() => setZoomedImage(null)}
                className="absolute top-4 left-4 p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="text-center">
                <span className="text-xs font-bold text-red-500 uppercase tracking-widest">{zoomedImage.tag}</span>
                <h3 className="text-xl font-black text-white mt-1">{zoomedImage.name}</h3>
              </div>

              {/* Large Square Image Preview */}
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-zinc-800 shadow-2xl bg-zinc-900">
                <img 
                  src={zoomedImage.url} 
                  alt={zoomedImage.name} 
                  className="w-full h-full object-cover" 
                />
              </div>

              {/* URL Display with Copy Button */}
              <div className="bg-black/80 border border-zinc-800/80 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="text-right overflow-hidden flex-1">
                  <span className="text-[10px] text-zinc-500 block">رابط الصورة المباشر في عالم الخفاء:</span>
                  <span className="text-xs font-mono text-zinc-300 block truncate" dir="ltr">
                    {window.location.origin + zoomedImage.url}
                  </span>
                </div>
                <button
                  onClick={() => handleCopyUrl(zoomedImage.url)}
                  className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-zinc-700/60 flex items-center gap-1.5 text-xs font-bold transition-all shrink-0 cursor-pointer"
                >
                  {copiedUrl === zoomedImage.url ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span className="text-emerald-400">تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>نسخ الرابط</span>
                    </>
                  )}
                </button>
              </div>

              {/* Select Button Inside Modal */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setSelectedAvatar(zoomedImage.url);
                    setZoomedImage(null);
                    toast.success(`تم اختيار صورة: ${zoomedImage.name}`);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserCheck size={18} />
                  <span>اعتماد هذه الشخصية</span>
                </button>
                <button
                  onClick={() => setZoomedImage(null)}
                  className="px-4 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl font-bold transition-colors cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: Customization Form */}
        {step === 'form' && (
          <div className="max-w-3xl w-full space-y-6 bg-zinc-950/90 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl shadow-2xl relative z-10 text-right" dir="rtl">
            
            <div className="text-center flex flex-col items-center">
              <img src="/logo.jpg" alt="Mafia Streets Logo" className="w-24 h-24 rounded-2xl shadow-2xl object-cover mb-3" />
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-500 to-red-600 uppercase mb-1">
                MAFIA STREETS
              </h1>
              <h2 className="text-base sm:text-lg font-bold text-white">
                تخصيص الهوية واختيار الشخصية
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                اختر شخصيتك من بين 10 شخصيات NPCs في عالم الخفاء (5 رجال و5 نساء)
              </p>
            </div>

            {/* Nickname & Country in a Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-zinc-300 mb-2">
                  اسم اللاعب / الاسم الرمزي
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="اكتب اسمك هنا..."
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 font-bold text-sm"
                  maxLength={20}
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-zinc-300 mb-2 flex items-center gap-1.5">
                  <Globe size={14} className="text-amber-500" />
                  <span>الدولة / الجنسية</span>
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 font-bold text-sm cursor-pointer"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-zinc-950 text-white">
                      {c.nameAr} ({c.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Birthdate & Gender in a Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-zinc-300 mb-2 flex items-center gap-1.5">
                  <Calendar size={14} className="text-blue-500" />
                  <span>تاريخ الميلاد</span>
                </label>
                <input
                  type="date"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  max="2008-01-01"
                  min="1940-01-01"
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-zinc-300 mb-2">
                  الجنس (5 شخصيات NPCs رجال / 5 شخصيات NPCs نساء)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`py-3 px-3 rounded-xl font-bold border transition-all flex items-center justify-center gap-2 text-sm cursor-pointer ${
                      gender === 'male' 
                        ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/30' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    <span>رجال (5 شخصيات NPCs)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`py-3 px-3 rounded-xl font-bold border transition-all flex items-center justify-center gap-2 text-sm cursor-pointer ${
                      gender === 'female' 
                        ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/30' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    <span>نساء (5 شخصيات NPCs)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 10 NPC Characters Selector as Square Tiles (مربعات لاختيار صورة الشخصية) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-zinc-200">
                    مربعات اختيار صورة الشخصية ({gender === 'male' ? '5 شخصيات NPCs رجال' : '5 شخصيات NPCs نساء'})
                  </label>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    اختر المربع المناسب لشخصيتك، أو اضغط زر التكبير 🔍 لمعاينتها بحجم كبير
                  </p>
                </div>
                <span className="text-[11px] px-2.5 py-1 bg-red-600/10 border border-red-500/20 text-red-400 rounded-lg font-bold">
                  {charactersList.length} مربعات متاحة
                </span>
              </div>

              {/* Square Tiles Grid (شبكة المربعات) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                {charactersList.map((char) => {
                  const isSelected = selectedAvatar === char.url;
                  return (
                    <div
                      key={char.id}
                      onClick={() => setSelectedAvatar(char.url)}
                      className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer group shadow-lg ${
                        isSelected 
                          ? 'border-red-500 ring-4 ring-red-500/50 scale-[1.04] shadow-2xl shadow-red-600/40 z-10' 
                          : 'border-zinc-800 hover:border-zinc-600 hover:scale-[1.02] opacity-80 hover:opacity-100'
                      }`}
                    >
                      {/* Full-bleed Square Image */}
                      <img 
                        src={char.url} 
                        alt={char.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      />

                      {/* Top Action Bar inside Square (Zoom & Copy Buttons) */}
                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-20 pointer-events-auto">
                        {/* Zoom Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setZoomedImage(char);
                          }}
                          title="تكبير الصورة"
                          className="px-2 py-1 rounded-lg bg-black/75 hover:bg-red-600 text-white text-[10px] font-bold transition-all shadow-md backdrop-blur-md flex items-center gap-1 cursor-pointer border border-white/10"
                        >
                          <Maximize2 size={11} />
                          <span>تكبير</span>
                        </button>

                        {/* Copy Link Icon */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyUrl(char.url);
                          }}
                          title="نسخ الرابط"
                          className="p-1 rounded-lg bg-black/75 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all shadow-md backdrop-blur-md cursor-pointer border border-white/10"
                        >
                          {copiedUrl === char.url ? (
                            <Check size={12} className="text-emerald-400" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>

                      {/* Selected Badge in Center/Corner */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-red-600/20 border-2 border-red-500 flex items-center justify-center pointer-events-none">
                          <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xl ring-2 ring-white/50">
                            <UserCheck size={22} />
                          </div>
                        </div>
                      )}

                      {/* Bottom Info Gradient Overlay inside Square */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2 text-right pt-6 pointer-events-none">
                        <h4 className="text-[11px] font-black text-white leading-tight truncate drop-shadow-md">
                          {char.name}
                        </h4>
                        <span className="text-[9px] text-zinc-300 block truncate drop-shadow-md">
                          {char.tag}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Direct URLs summary bar */}
              <div className="mt-3 p-3 bg-black/60 border border-zinc-900 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">الصورة المحددة حالياً:</span>
                  <span className="font-mono text-amber-400 font-bold truncate max-w-xs" dir="ltr">
                    {selectedAvatar}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyUrl(selectedAvatar)}
                  className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-zinc-800 flex items-center gap-1.5 text-[11px] font-bold cursor-pointer transition-colors"
                >
                  <Copy size={12} />
                  <span>نسخ الرابط المباشر</span>
                </button>
              </div>
            </div>

            {/* Strategic Character Role Selection with Perks */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-zinc-300 mb-2">
                اختر طابع الشخصية والدور الاستراتيجي (يؤثر على سير اللعب والمميزات)
              </label>
              <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                {ROLES_INFO.map((role) => {
                  const Icon = role.icon;
                  const isSelected = selectedRole === role.id;
                  return (
                    <div
                      key={role.id}
                      onClick={() => setSelectedRole(role.id)}
                      className={`w-full p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                        isSelected 
                          ? 'border-red-500 bg-red-500/10 shadow-lg shadow-red-600/20' 
                          : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${role.bg} ${role.color}`}>
                            <Icon size={20} />
                          </div>
                          <div>
                            <h3 className="font-black text-white text-sm sm:text-base">{role.title}</h3>
                            <p className="text-[11px] text-zinc-400">{role.desc}</p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-red-500 bg-red-500' : 'border-zinc-700'
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </div>
                      <div className="bg-black/50 px-3 py-1 rounded-lg border border-zinc-800/80 flex items-center gap-2 text-[11px] text-amber-400">
                        <Flame size={12} className="text-amber-500 shrink-0" />
                        <span><strong>المميزة الاستراتيجية:</strong> {role.perk}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Continue Button with Camera Action */}
            <button
              onClick={handleProceedToIDCard}
              className="w-full bg-gradient-to-r from-red-600 via-orange-600 to-red-600 hover:from-red-500 hover:to-orange-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-red-600/30 text-base cursor-pointer flex items-center justify-center gap-3 group active:scale-95"
            >
              <Camera size={20} className="group-hover:scale-110 transition-transform" />
              <span>استمرار والتقاط صورة الهوية 📸</span>
            </button>
          </div>
        )}

        {/* STEP 2: Camera Flash & Official ID Card Reveal */}
        {step === 'id_card' && (
          <div className="max-w-2xl w-full space-y-6 bg-zinc-950/95 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl shadow-2xl relative z-10 text-right animate-in fade-in zoom-in-95 duration-500" dir="rtl">
            
            {/* Header Badge */}
            <div className="text-center flex flex-col items-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black mb-3">
                <CheckCircle2 size={16} />
                <span>تم التقاط الصورة وإصدار الوثيقة الرسمية بنجاح</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                بطاقة الهوية الوطنية للمدينة
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                نموذج الوثيقة الرسمية المعتمد في سجلات المافيا والجمهورية
              </p>
            </div>

            {/* The Authentic National ID Card (Matches Documents / Government.tsx) */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl p-1 bg-black/40 border border-white/10">
              <div className="transform transition-transform hover:scale-[1.01]">
                <OfficialDocument 
                  doc={idCardDoc} 
                  profile={previewProfile} 
                  getCountryName={getCountryName} 
                />
              </div>
            </div>

            {/* Strategic Role & Perks Summary */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${currentRoleInfo.bg} ${currentRoleInfo.color}`}>
                    <RoleIcon size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold block">الطابع والدور المعتمد</span>
                    <h4 className="text-base font-black text-white">{currentRoleInfo.title}</h4>
                  </div>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-zinc-500 font-bold block">رقم الهوية</span>
                  <span className="text-xs font-mono font-bold text-amber-400">{previewProfile.docNumber}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl">
                <Flame size={15} className="text-amber-500 shrink-0" />
                <span><strong>المميزة الممنوحة:</strong> {currentRoleInfo.perk}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-black/40 p-2 rounded-xl border border-zinc-800/60">
                  <span className="text-[10px] text-zinc-500 block">الدولة</span>
                  <span className="font-bold text-white">{getCountryName(country)}</span>
                </div>
                <div className="bg-black/40 p-2 rounded-xl border border-zinc-800/60">
                  <span className="text-[10px] text-zinc-500 block">الميلاد</span>
                  <span className="font-bold text-white font-mono">{birthdate}</span>
                </div>
                <div className="bg-black/40 p-2 rounded-xl border border-zinc-800/60">
                  <span className="text-[10px] text-zinc-500 block">رأس المال البدئي</span>
                  <span className="font-bold text-green-400 font-mono">
                    {selectedRole === 'Trader' ? '6,000,000$' : '5,000,000$'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons: Continue to Home / Edit Info */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleFinalizeRegistration}
                disabled={isCreatingProfile}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-xl shadow-green-600/30 text-base cursor-pointer flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
              >
                {isCreatingProfile ? (
                  <span>جاري تسجيل الهوية ودخول المدينة...</span>
                ) : (
                  <>
                    <FileCheck size={20} />
                    <span>استمرار إلى الصفحة الرئيسية 🏛️</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setStep('form')}
                disabled={isCreatingProfile}
                type="button"
                className="px-5 py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold rounded-2xl border border-zinc-800 transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <RotateCcw size={16} />
                <span>تعديل البيانات</span>
              </button>
            </div>
          </div>
        )}

      </div>
    );
  }

  // Standard Login Screen for Unauthenticated Visitors
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <div className="max-w-md w-full space-y-6 bg-zinc-950/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl relative z-10 text-center flex flex-col items-center">
        <img src="/logo.jpg" alt="Mafia Streets Logo" className="w-36 h-36 rounded-2xl shadow-2xl object-cover mb-4" />
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-500 to-red-600 uppercase mb-2">
          MAFIA STREETS
        </h1>
        <p className="text-zinc-400 text-sm mb-6">لعبة استراتيجية المافيا الكبرى</p>
        <button
          onClick={handleLogin}
          disabled={loggingIn}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-200 text-black font-bold py-4 px-4 rounded-xl transition-colors cursor-pointer"
        >
          {loggingIn ? (
            <span>جاري تسجيل الدخول...</span>
          ) : (
            <>
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>تسجيل الدخول عبر Gmail</span>
            </>
          )}
        </button>

        {/* Legal Disclaimer */}
        <div className="mt-6 pt-6 border-t border-zinc-900 text-right" dir="rtl">
          <h3 className="text-xs font-bold text-zinc-400 mb-2">{t('disclaimerTitle', 'إخلاء مسؤولية قانوني')}</h3>
          <div className="bg-black/50 p-3 rounded-xl border border-zinc-900 text-[11px] text-zinc-500 max-h-32 overflow-y-auto leading-relaxed whitespace-pre-line">
            {t('disclaimerText', 'تُعد لعبة MAFIA STREETS عملاً خيالياً لأغراض الترفيه فقط، ولا تمثل أو تعكس الواقع بأي شكل من الأشكال. إن جميع الشخصيات، الأحداث، المواقع، والحوارات الواردة في اللعبة هي من نسج الخيال، وأي تشابه مع أشخاص أو أحداث حقيقية هو محض صدفة غير مقصودة.\n\nباستخدامك لهذه اللعبة، فإنك توافق صراحةً على أن استخدامك لها يتم على مسؤوليتك الشخصية بالكامل، ولا تتحمل إدارة اللعبة أو مطوروها أو ناشروها أي مسؤولية قانونية أو تعويضية عن أي أضرار مباشرة أو غير مباشرة قد تنشأ عن استخدام اللعبة أو سوء استخدامها أو تفسير محتواها.\n\nلا تتحمل إدارة اللعبة أي مسؤولية عن أي محتوى يتم إدراكه أو تفسيره بشكل مخالف لغرضه الترفيهي، كما لا تتحمل أي مسؤولية عن تصرفات المستخدمين داخل اللعبة أو خارجها.\n\nهذه اللعبة مخصصة حصراً للأشخاص الذين تبلغ أعمارهم 18 عاماً فما فوق. وبمجرد قيامك بالتسجيل أو استخدام اللعبة، فإنك تقرّ وتتعهد بأنك قد بلغت السن القانونية (18 عاماً أو أكثر). ولا تتحمل إدارة اللعبة أي مسؤولية عن دخول القاصرين أو استخدامهم للعبة بأي شكل من الأشكال، وتُعد مسؤولية التحقق من العمر تقع على المستخدم نفسه أو ولي أمره.\n\nتحتفظ إدارة اللعبة بالحق في تعديل هذا الإخلاء أو شروط الاستخدام في أي وقت دون إشعار مسبق، ويُعد استمرارك في استخدام اللعبة موافقة ضمنية على أي تحديثات يتم إجراؤها.')}
          </div>
        </div>
      </div>
    </div>
  );
}
