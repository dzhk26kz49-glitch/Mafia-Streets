import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Siren, 
  Star, 
  CreditCard, 
  Award, 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  AlertTriangle,
  FileWarning,
  CheckCircle,
  Lock,
  DollarSign,
  UserCheck,
  Scale,
  ExternalLink,
  FileText,
  Globe,
  Car,
  Shield
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatMoney } from '../lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { PoliceEngine, ContrabandItemResult } from '../services/policeEngine';

export default function Police() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [now, setNow] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const jailEnd = profile?.jailTimeEnd || 0;
  const isJailed = jailEnd > now;
  const timeRemaining = isJailed ? Math.ceil((jailEnd - now) / 1000) : 0;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  // فحص المخزن الفعلي للشبهات
  const detectedContraband = profile ? PoliceEngine.scanPlayerContraband(profile) : [];
  const suspicion = profile ? PoliceEngine.calculateSuspicion(profile, detectedContraband) : 0;
  const wantedStars = profile?.wantedStars || (profile?.wanted ? 1 : 0);

  // حساب كلفة الرشوة: 1 مليون دينار عن كل نجمة
  const effectiveStars = Math.max(1, wantedStars);
  const bribePrice = effectiveStars * 1000000;

  // تسوية المطلوبية ودفع الرشوة للضابط: 1 مليون على كل نجمة، نسبة نجاح 50%
  const handleBribe = async () => {
    if (isSubmitting) return;
    if (!profile) return;

    if (wantedStars <= 0 && !profile.wanted) {
      toast.info('سجلك نظيف وما عليك أي مطلوبية حالياً حبيبي!');
      return;
    }

    if (profile.cleanMoney < bribePrice) {
      toast.error('ماعندك كاش كافي! الرشوة تكلف مليون دينار عن كل نجمة، دَبّر فلوسك وتعال!');
      return;
    }

    setIsSubmitting(true);
    try {
      // فرصة النجاح 50%
      const isSuccess = Math.random() < 0.5;

      if (isSuccess) {
        // نجاح الرشوة: خصم المبلغ وتصفير النجوم والمطلوبية
        await updateDoc(doc(db, 'users', profile.uid), {
          wanted: false,
          wantedStars: 0,
          cleanMoney: increment(-bribePrice),
          displayName: `${profile.displayName.replace(/\s*\(هوية جديدة\)/g, '')} (هوية جديدة)`
        });
        toast.success('عاشت إيدك! مشت الرشوة والواسطة كمل الشغلة، قيدك انمسح من الحاسبة وهسه إنت نضيف وما عليك أي شبهة حبيبي!');
      } else {
        // فشل الرشوة: خصم المبلغ ورفض الواسطة وبقاء النجوم
        await updateDoc(doc(db, 'users', profile.uid), {
          cleanMoney: increment(-bribePrice)
        });
        toast.error('الضابط أخذ الفلوس وطرّد الواسطة وصاح: "شنو عبالك الداخلية لعبة بيدك ولك؟! وداعت أمي ما تمشي يمي!" وخسرت المليون وما نلغت النجوم!');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error('صار خلل بالاتصال بالشبكة الأمنية، حاول مرة ثانية');
    } finally {
      setIsSubmitting(false);
    }
  };

  const DocumentItem = ({ icon: Icon, label, isOwned }: { icon: any, label: string, isOwned: boolean }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-black/40 rounded-xl border border-white/5 gap-3 hover:border-white/10 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg shrink-0 ${isOwned ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-500'}`}>
          <Icon size={18} />
        </div>
        <div>
          <span className={`text-xs font-bold block ${isOwned ? 'text-white' : 'text-zinc-400'}`}>
            {label}
          </span>
          <span className="text-[10px] text-zinc-500 block">
            {isOwned ? 'سارية المفعول ومسجلة في النظام' : 'غير صادرة - قيد النقص'}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end">
        {isOwned ? (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[11px] font-black shadow-sm">
            <CheckCircle size={13} className="text-emerald-400" />
            <span>مملوكة</span>
          </div>
        ) : (
          <button
            onClick={() => navigate('/government?tab=documents')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-lg text-[11px] font-black transition-all shadow-md group cursor-pointer"
            title="الانتقال إلى المبنى الحكومي السيادي لإصدار الوثيقة"
          >
            <span>إصدار في المبنى الحكومي</span>
            <ExternalLink size={12} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );

  const starLevels = [
    { stars: 0, title: 'غير مطلوب (مواطن عادي)', desc: 'لا توجد ملاحقة أمنية، الوضع الأمني مستقر.' },
    { stars: 1, title: 'اشتباه أو مخالفة بسيطة', desc: 'مراقبة هادئة في الأزقة وتدقيق روتيني بالهويات.' },
    { stars: 2, title: 'محاولة إيقاف وتحرٍ', desc: 'الدوريات تبحث عنك وتوقف المشبوهين في قطاعك.' },
    { stars: 3, title: 'مطاردة ومداهمات نشطة', desc: 'كبسات تكتيكية مفاجئة ومحاولات إلقاء قبض فورية.' },
    { stars: 4, title: 'تعزيزات أمنية وتطويق', desc: 'مفارز إضافية وإغلاق المنافذ وفرق التدخل السريع.' },
    { stars: 5, title: 'مطلوب أمني عالي الخطورة', desc: 'أمر إطلاق نار واعتقال قصري وإحالة فورية للسجن المركزي.' }
  ];

  return (
    <div className="text-white space-y-6 max-w-6xl mx-auto" dir="rtl">
      {/* صورة رجل الشرطة والترويسة بالأعلى */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-900/40 bg-gradient-to-r from-blue-950/70 via-zinc-950 to-blue-950/50 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_60%)] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-6 gap-6">
          <div className="flex items-center gap-5 w-full md:w-auto">
            {/* صورة رجل الشرطة المرفوعة من المستخدم */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.4)] bg-zinc-900">
                <img 
                  src="https://up6.cc/2026/10/179188165378921.png" 
                  alt="رجل الشرطة" 
                  className="w-full h-full object-cover object-top"
                  onError={(e) => {
                    // Fallback to policeman icon if external image fails to load
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="absolute -bottom-1 -right-1 p-1.5 bg-blue-600 rounded-full border-2 border-zinc-950 text-white shadow-md">
                <Siren size={14} />
              </div>
            </div>

            <div>
              <h2 
                className="font-black text-white uppercase tracking-tight"
                style={{ fontSize: '16px', lineHeight: '22px' }}
              >
                مركز قيادة الشرطة والأمن الداخلي
              </h2>
              <p className="text-xs text-zinc-400 mt-1">نظام المطلوبية والرشاوي والنفوذ الأمني ومصادرة الممنوعات</p>
              
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <ShieldCheck size={12} />
                  قسم الشرطة داخل الحكومة
                </span>
                <span className="text-[11px] text-zinc-500">
                  المداهمات تحدث تلقائياً داخل اللعبة
                </span>
              </div>
            </div>
          </div>

          {/* مؤشرات سريعة للحالة الأمنية */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
            <div className="px-4 py-2 bg-black/40 rounded-xl border border-white/5 text-center">
              <span className="text-[10px] text-zinc-400 block font-bold">النجوم</span>
              <span className={`text-base font-black ${wantedStars > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                {wantedStars} / 5
              </span>
            </div>

            <div className="px-4 py-2 bg-black/40 rounded-xl border border-white/5 text-center">
              <span className="text-[10px] text-zinc-400 block font-bold">الشبهة</span>
              <span className={`text-base font-black ${suspicion > 50 ? 'text-red-400' : 'text-emerald-400'}`}>
                {suspicion}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* قسم تعديل الرشاوي والنفوذ الأمني (1 مليون لكل نجمة و50% نسبة نجاح) */}
      <div className="p-6 rounded-2xl border bg-gradient-to-b from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Scale size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                مكتب التسويات والرشاوي والنفوذ الأمني
                <span className="text-[11px] px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full font-bold border border-amber-500/30">
                  نسبة النجاح: 50%
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                تصفير سجل المطلوبية وشطب النجوم من حاسبة الأمن الداخلي عبر دفع الإتاوة والرشوة للضباط
              </p>
            </div>
          </div>

          <div className="text-left bg-black/40 px-3.5 py-2 rounded-xl border border-white/5">
            <span className="text-[10px] text-zinc-400 block">تسعيرة شطب النجمة الواحدة</span>
            <span className="text-xs font-black text-emerald-400 font-mono">1,000,000 د.ع (مليون دينار)</span>
          </div>
        </div>

        {wantedStars > 0 || profile?.wanted ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-right">
                <div className="flex items-center justify-center sm:justify-start gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-5 h-5 ${i < wantedStars ? 'text-amber-400 fill-amber-400 animate-pulse' : 'text-zinc-700'}`} 
                    />
                  ))}
                  <span className="text-xs font-bold text-red-400 ms-2">({wantedStars} نجوم مطلوبية)</span>
                </div>
                <p className="text-xs text-zinc-300">
                  كلفة تصفير النجوم بالكامل: <span className="text-amber-400 font-mono font-black">{formatMoney(bribePrice)}</span> (مليون عن كل نجمة)
                </p>
                <p className="text-[11px] text-amber-400/80">
                  ⚠️ تنبيه: نسبة النجاح 50% فقط! إذا ما مشت الرشوة تروح الفلوس عليك ويبقى اسمك مطلوب!
                </p>
              </div>

              <button 
                onClick={handleBribe}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <DollarSign size={16} />
                دفع رشوة للضابط ({formatMoney(bribePrice)})
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-emerald-400 w-5 h-5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-emerald-400">سجلك الأمني نظيف تماماً</h4>
                <p className="text-[11px] text-zinc-400">لا توجد عليك أي نجوم مطلوبية حالياً، ولست بحاجة لدفع أي رشاوي.</p>
              </div>
            </div>
            <span className="text-xs font-mono text-zinc-500">0 نجوم</span>
          </div>
        )}
      </div>

      {/* لوحة مراقبة الشبهة ومسح المخزون الفعلي */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* مقياس الشبهة */}
        <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              مقياس الشبهة الأمني
            </span>
            <span className="text-sm font-mono font-black text-amber-400">{suspicion}%</span>
          </div>
          <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                suspicion > 60 ? 'bg-red-600' : suspicion > 30 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${suspicion}%` }}
            />
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            يرتفع المقياس بحمل المخدرات أو أسلحة بدون تصريح، والاشتباك مع الـ NPCs. تظهر المداهمات التكتيكية تلقائياً للاعب أثناء اللعب عند ارتفاع الشبهة والنجوم.
          </p>
        </div>

        {/* فحص الممنوعات المكتشفة في المخزن */}
        <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl md:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-400" />
              تقرير المسح الراداري للمخزن (المواد الخاضعة للمصادرة):
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">
              {detectedContraband.length} نوع محظور
            </span>
          </div>

          {detectedContraband.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1 text-xs">
              {detectedContraband.map((item) => (
                <div key={item.id} className="p-2.5 bg-zinc-900/90 rounded-xl border border-red-950/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="font-bold text-zinc-200">{item.name}</span>
                    <span className="text-zinc-500">({item.count})</span>
                  </div>
                  <span className="text-red-400 font-mono text-[11px]">
                    {formatMoney(item.estimatedFine)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>مخزنك خالي تماماً من المواد المحظورة أو أنك تملك رخصة سلاح رسمية.</span>
            </div>
          )}
        </div>
      </div>

      {/* مستويات المطلوبية الستة (Wanted System Table) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-black text-zinc-200 flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-400" />
          قوانين ومستويات المطلوبية الأمنية (Wanted Level System)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {starLevels.map((lvl) => {
            const isCurrent = wantedStars === lvl.stars;

            return (
              <div 
                key={lvl.stars}
                className={`p-4 rounded-xl border text-xs transition-all ${
                  isCurrent 
                    ? 'bg-red-950/40 border-red-600 shadow-md ring-1 ring-red-500/30' 
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    {[...Array(lvl.stars)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    ))}
                    {lvl.stars === 0 && <span className="text-[10px] text-zinc-500">0 نجوم</span>}
                  </div>
                  {isCurrent && (
                    <span className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold">
                      مستواك الحالي
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-zinc-200 mb-1">{lvl.title}</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">{lvl.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* حالة السجن والأوراق الرسمية */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className={`p-8 rounded-xl border ${isJailed ? 'bg-red-950/50 border-red-900' : 'bg-zinc-900 border-zinc-800'} text-center`}>
          <h3 className="text-2xl font-bold mb-4">{t('police.jailStatus')}</h3>
          {isJailed ? (
            <div>
              <p className="text-red-400 text-lg mb-2">{t('police.jailed')}</p>
              <div className="text-5xl font-black text-red-500 tracking-widest font-mono">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </div>
            </div>
          ) : (
            <p className="text-green-400 text-xl font-bold">{t('police.free')}</p>
          )}
        </div>

        <div className="mafia-card space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
            <h3 className="text-xl font-black flex items-center gap-2 text-white">
              <CreditCard className="text-blue-500" size={22} />
              الوثائق الرسمية والأوراق الثبوتية
            </h3>
            <button
              onClick={() => navigate('/government?tab=documents')}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition-colors self-start sm:self-auto"
            >
              المبنى الحكومي السيادي &gt; الوثائق
              <ExternalLink size={12} />
            </button>
          </div>

          <div className="space-y-2.5">
            <DocumentItem 
              icon={CreditCard} 
              label="بطاقة الهوية" 
              isOwned={!!(profile?.documents?.idCard || (profile?.documents as any)?.id)} 
            />
            <DocumentItem 
              icon={Award} 
              label="جواز السفر" 
              isOwned={!!profile?.documents?.passport} 
            />
            <DocumentItem 
              icon={ShieldCheck} 
              label="رخصة القيادة" 
              isOwned={!!(profile?.documents?.driverLicense || profile?.documents?.license)} 
            />
            <DocumentItem 
              icon={Siren} 
              label="تصريح السلاح" 
              isOwned={!!(profile?.documents?.weaponLicense || profile?.documents?.weapon)} 
            />
            <DocumentItem 
              icon={FileText} 
              label="براءة الذمة" 
              isOwned={!!profile?.documents?.clearance} 
            />
          </div>

          <p className="text-[11px] text-zinc-500 pt-1 leading-relaxed">
            * عدم امتلاك تصريح السلاح يعرض أسلحتك للمصادرة أثناء التفتيش والمداهمات، ويتم استخراج كافة الوثائق الرسمية من قسم الوثائق في المبنى الحكومي السيادي.
          </p>
        </div>
      </div>
    </div>
  );
}
