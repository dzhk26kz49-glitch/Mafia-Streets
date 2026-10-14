import React, { useState } from 'react';
import { 
  Siren, 
  ShieldAlert, 
  Key, 
  DoorClosed, 
  Users, 
  Coins, 
  Swords, 
  Sparkles, 
  HelpCircle, 
  Lock, 
  Unlock, 
  AlertTriangle,
  ZoomIn,
  MessageSquare,
  Clock,
  ExternalLink
} from 'lucide-react';
import { UndergroundPrisonInmate, UndergroundSkill } from '../../types/npcExpandedTypes';
import { NPCOperationsEngine } from '../../services/npcOperationsEngine';
import { useAuthStore } from '../../store/useAuthStore';
import { formatMoney } from '../../lib/utils';
import { toast } from 'sonner';

interface UndergroundPrisonProps {
  inmates: UndergroundPrisonInmate[];
  skills: UndergroundSkill[];
  onInmateReleased: (inmate: UndergroundPrisonInmate) => void;
  onEnlargeImage: (npc: any) => void;
}

export const UndergroundPrison: React.FC<UndergroundPrisonProps> = ({
  inmates,
  skills,
  onInmateReleased,
  onEnlargeImage
}) => {
  const { profile, updateProfile } = useAuthStore();
  const [visitingInmate, setVisitingInmate] = useState<UndergroundPrisonInmate | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // دفع الكفالة القانونية
  const handlePayBail = async (inmate: UndergroundPrisonInmate) => {
    if (!profile) return;
    if ((profile.cleanMoney || 0) < inmate.bailAmount) {
      toast.error(`أموالك غير كافية لدفع الكفالة! تحتاج إلى ${formatMoney(inmate.bailAmount)}.`);
      return;
    }

    setIsProcessing(true);
    const result = NPCOperationsEngine.payBailout(inmate.id, profile.cleanMoney || 0);

    if (result.success && result.releasedInmate) {
      // خصم الكاش من اللاعب
      await updateProfile({
        cleanMoney: Math.max(0, (profile.cleanMoney || 0) - inmate.bailAmount)
      });
      toast.success(result.message);
      onInmateReleased(result.releasedInmate);
    } else {
      toast.error(result.message);
    }
    setIsProcessing(false);
  };

  // محاولة تهريب السجين واقتحام الزنزانة
  const handleBreakout = async (inmate: UndergroundPrisonInmate) => {
    if (!profile || isProcessing) return;

    setIsProcessing(true);
    const result = NPCOperationsEngine.attemptPrisonBreakout(inmate.id, skills);

    if (result.success && result.escapedInmate) {
      toast.success(result.message);
      onInmateReleased(result.escapedInmate);
    } else {
      toast.error(result.message);
      if (result.raisedStars) {
        // رفع نجوم المطلوبية كعقوبة لكشف التهريب
        const currentStars = profile.wantedStars || 0;
        await updateProfile({
          wantedStars: Math.min(5, currentStars + 1),
          wanted: true
        });
        toast.warning('ارتفعت نجوم المطلوبية لديك (+1 ★) بسبب محاولة اقتحام السجن!');
      }
    }
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* لوحة ترويسة السجن الأمني */}
      <div className="p-6 bg-gradient-to-r from-red-950/70 via-zinc-950 to-zinc-950 border-2 border-red-900/60 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 end-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-red-500/20 text-red-400 rounded-2xl border border-red-500/40 shadow-lg animate-pulse">
              <Siren size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  سجن أزقة بغداد لعالم الخفاء
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-red-500/20 text-red-300 border border-red-500/40">
                  حراسة مشددة
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                الزنازين الأمنية المخصصة لاحتجاز شخصيات الـ NPCs إثر المداهمات أو الاشتباكات أو البلاغات الكيدية.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-black/60 rounded-2xl border border-red-900/50 text-center">
              <span className="text-[10px] text-zinc-400 block font-bold">المحتجزون حالياً</span>
              <span className="text-base font-black text-red-400 font-mono">
                {inmates.length} مسجون
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* قائمة الزنازين والسجناء */}
      {inmates.length === 0 ? (
        <div className="p-12 text-center bg-zinc-950 border border-zinc-800 rounded-3xl space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-lg">
            <Unlock size={28} />
          </div>
          <h3 className="text-lg font-black text-white">جميع الزنازين خالية حالياً!</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            كافة شخصيات الـ NPCs الـ 10 أحرار ويتجولون في أزقة المدينة بسلام، أو يقومون بمهامهم التجارية واللوجستية.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inmates.map((inmate) => (
            <div 
              key={inmate.id}
              className="bg-zinc-950 border-2 border-red-900/40 rounded-3xl p-5 relative overflow-hidden shadow-xl flex flex-col justify-between group hover:border-red-600/60 transition-all"
            >
              <div className="absolute top-0 start-0 w-2 h-full bg-red-600" />

              <div className="space-y-4">
                {/* معلومات السجين والزنزانة */}
                <div className="flex items-start gap-4">
                  {/* صورة السجين بنسبة 3/4 مع زر التكبير المباشر */}
                  <div 
                    onClick={() => onEnlargeImage({
                      name: inmate.npcName,
                      nickname: inmate.npcNickname,
                      image: inmate.npcImage,
                      personalityArabic: inmate.personalityArabic,
                      genderArabic: inmate.gender === 'male' ? 'ذكر' : 'أنثى',
                      specialty: inmate.arrestReason,
                      statusText: inmate.inmateQuote,
                      district: inmate.cellNumber,
                      cash: inmate.bailAmount
                    })}
                    className="relative aspect-[3/4] w-20 sm:w-24 rounded-2xl overflow-hidden shrink-0 border-2 border-red-500/40 shadow-lg cursor-zoom-in group/img"
                    title="انقر لتكبير صورة السجين 🔍"
                  >
                    <img 
                      src={inmate.npcImage} 
                      alt={inmate.npcName} 
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn size={20} className="text-white drop-shadow" />
                    </div>
                    {/* قضبان سجن رسومية فوق الصورة */}
                    <div className="absolute inset-0 flex justify-evenly pointer-events-none opacity-40">
                      <div className="w-0.5 h-full bg-zinc-300" />
                      <div className="w-0.5 h-full bg-zinc-300" />
                      <div className="w-0.5 h-full bg-zinc-300" />
                    </div>
                  </div>

                  {/* بيانات المحكومية والتهمة */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="text-base font-black text-white truncate">
                          {inmate.npcName}
                        </h4>
                        <span className="text-xs text-zinc-400 font-bold">"{inmate.npcNickname}"</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {inmate.cellNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950/80 text-red-300 border border-red-800 font-bold">
                        {inmate.personalityArabic}
                      </span>
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <Clock size={11} />
                        المحكومية: {inmate.sentenceMinutes} دقيقة
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-300 bg-red-950/30 p-2 rounded-xl border border-red-900/30 line-clamp-2 leading-relaxed">
                      <span className="text-red-400 font-bold">التهمة:</span> {inmate.arrestReason}
                    </p>
                  </div>
                </div>

                {/* كلام السجين من داخل الزنزانة */}
                <div className="p-3 bg-black/60 rounded-2xl border border-white/5 text-xs text-zinc-300 italic flex items-start gap-2">
                  <MessageSquare size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>"{inmate.inmateQuote}"</span>
                </div>
              </div>

              {/* أزرار الإجراءات: كفالة، تهريب، زيارة */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 pt-4 border-t border-zinc-800/80">
                {/* 1. دفع الكفالة */}
                <button
                  disabled={isProcessing || (profile?.cleanMoney || 0) < inmate.bailAmount}
                  onClick={() => handlePayBail(inmate)}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-lg active:scale-95"
                >
                  <Coins size={14} />
                  <span>دفع كفالة ({formatMoney(inmate.bailAmount)})</span>
                </button>

                {/* 2. عملية تهريب تكتيكية */}
                <button
                  disabled={isProcessing}
                  onClick={() => handleBreakout(inmate)}
                  className="py-2.5 px-3 bg-red-900/80 hover:bg-red-800 text-red-200 border border-red-700/60 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-lg active:scale-95"
                  title="محاولة تهريب تكتيكية خطرة"
                >
                  <Swords size={14} />
                  <span>تهريب واقتحام (مجاناً)</span>
                </button>

                {/* 3. زيارة الزنزانة */}
                <button
                  onClick={() => setVisitingInmate(inmate)}
                  className="col-span-2 sm:col-span-1 py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <DoorClosed size={14} />
                  <span>زيارة الزنزانة</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* نافذة زيارة السجين المنبثقة */}
      {visitingInmate && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setVisitingInmate(null)}
        >
          <div 
            className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-16 rounded-xl overflow-hidden border border-zinc-700">
                  <img src={visitingInmate.npcImage} alt={visitingInmate.npcName} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{visitingInmate.npcName}</h3>
                  <span className="text-xs text-zinc-400 font-bold">"{visitingInmate.npcNickname}" · {visitingInmate.cellNumber}</span>
                </div>
              </div>
              <button 
                onClick={() => setVisitingInmate(null)}
                className="text-zinc-400 hover:text-white p-2 rounded-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-zinc-900/80 rounded-2xl border border-zinc-800 text-sm text-zinc-200 leading-relaxed italic">
              "{visitingInmate.inmateQuote}"
            </div>

            <div className="text-xs space-y-2 text-zinc-400">
              <div className="flex justify-between">
                <span>سبب التوقيف:</span>
                <span className="text-white font-bold">{visitingInmate.arrestReason}</span>
              </div>
              <div className="flex justify-between">
                <span>قيمة الكفالة القانونية:</span>
                <span className="text-emerald-400 font-bold font-mono">{formatMoney(visitingInmate.bailAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>صعوبة الاقتحام والتهريب:</span>
                <span className="text-amber-400 font-bold">{visitingInmate.breakoutDifficulty}%</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  handlePayBail(visitingInmate);
                  setVisitingInmate(null);
                }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all shadow-md"
              >
                دفع الكفالة الآن ({formatMoney(visitingInmate.bailAmount)})
              </button>
              <button
                onClick={() => setVisitingInmate(null)}
                className="px-5 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold"
              >
                إنهاء الزيارة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
