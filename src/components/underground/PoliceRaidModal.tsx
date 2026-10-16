import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Siren, 
  ShieldAlert, 
  AlertTriangle, 
  DollarSign, 
  Footprints, 
  Swords, 
  CheckCircle, 
  XCircle,
  FileWarning,
  Lock
} from 'lucide-react';
import { PoliceRaidEvent } from '../../types/npcTypes';
import { PoliceEngine } from '../../services/policeEngine';
import { useAuthStore } from '../../store/useAuthStore';
import { toast } from 'sonner';
import { formatMoney } from '../../lib/utils';
import { IRAQI_POLICE_BARKS } from '../../services/npcDialogues';
import { soundEngine } from '../../services/soundEngine';

interface PoliceRaidModalProps {
  raid: PoliceRaidEvent | null;
  onClose: () => void;
}

export const PoliceRaidModal: React.FC<PoliceRaidModalProps> = ({ raid, onClose }) => {
  const { profile } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [actionDone, setActionDone] = useState(false);

  useEffect(() => {
    if (raid) {
      soundEngine.playPoliceSirenSound();
    }
  }, [raid?.id]);

  if (!raid || !profile) return null;

  const handleConfiscate = async () => {
    setIsProcessing(true);
    const res = await PoliceEngine.executeConfiscation(profile, raid);
    setIsProcessing(false);
    setActionDone(true);
    setResultMessage(res.message);
    if (res.confiscatedCount > 0) {
      toast.warning(`تمت مصادرة الممنوعات ورفع النجوم!`);
    } else {
      toast.success('تفتيش سليم، لم يتم العثور على ممنوعات!');
    }
  };

  const handleBribe = async () => {
    setIsProcessing(true);
    const res = await PoliceEngine.payBribe(profile, raid);
    setIsProcessing(false);
    if (res.success) {
      setActionDone(true);
      setResultMessage(res.message);
      toast.success('تم قبول الرشوة وإخلاء سبيلك!');
    } else {
      toast.error(res.message);
    }
  };

  const handleFlee = async () => {
    setIsProcessing(true);
    const res = await PoliceEngine.attemptFlee(profile);
    setIsProcessing(false);
    setActionDone(true);
    setResultMessage(res.message);
    if (res.success) {
      toast.success('شردت بنجاح!');
    } else {
      toast.error('أصيبت أثناء محاولة الهروب!');
    }
  };

  const handleResist = async () => {
    setIsProcessing(true);
    const arrested = await PoliceEngine.arrestAndImprison(profile, 15, 'مقاومة مداهمة أمنية والاشتباك مع الشرطة');
    setIsProcessing(false);
    setActionDone(true);
    if (arrested) {
      setResultMessage('قاومت القوة الأمنية فتم إطلاق النار عليك وتقييدك وإرسالك إلى السجن المركزي فوراً!');
      toast.error('تم اعتقالك وإيداعك السجن!');
    } else {
      setResultMessage('فشلت معالجة الإجراء.');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-xl bg-zinc-950 border-2 border-red-600/80 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.35)] text-white"
        >
          {/* شريط الإضاءة البوليسية الوامضة */}
          <div className="h-2 w-full bg-gradient-to-r from-red-600 via-blue-600 to-red-600 animate-pulse" />

          <div className="p-6 space-y-6">
            {/* الهيدر */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-600/20 text-red-500 rounded-xl border border-red-500/30 animate-pulse">
                  <Siren className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-red-500">
                    مداهمة أمنية مفاجئة!
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {raid.officerName}
                  </p>
                </div>
              </div>
              <div className="text-left">
                <span className="text-xs text-zinc-500 block">مستوى الشبهة</span>
                <span className="text-sm font-black text-amber-400 font-mono">
                  {raid.suspicionLevel}%
                </span>
              </div>
            </div>

            {/* صوت وبلاغ الضابط */}
            <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-xl">
              <p className="text-red-200 text-sm font-medium leading-relaxed">
                "{raid.reason}"
              </p>
              <p className="text-xs text-zinc-400 mt-2 italic">
                الضابط: "اثبت بمكانك ولا تتحرك! إيدك فوك راسك عدنا أمر تفتيش للمنطقة!"
              </p>
            </div>

            {/* قائمة الممنوعات المكتشفة في المخزن */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-400 flex items-center gap-2">
                <FileWarning className="w-4 h-4 text-amber-500" />
                نتائج مسح المخزون الفعلي للاعب:
              </h4>

              {raid.detectedContraband.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {raid.detectedContraband.map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="font-bold text-zinc-200">{item.name}</span>
                        <span className="text-zinc-500">(الكمية: {item.count})</span>
                      </div>
                      <div className="text-red-400 font-mono font-bold">
                        غرامة: {formatMoney(item.estimatedFine)}
                      </div>
                    </div>
                  ))}
                  <div className="p-2 bg-black/40 rounded-lg flex justify-between text-xs text-zinc-300 font-bold">
                    <span>إجمالي الغرامة المقدرة:</span>
                    <span className="text-red-400 font-mono">{formatMoney(raid.totalFine)}</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-xl flex items-center gap-3 text-emerald-400 text-xs">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span>لم يتم رصد أي مخدرات أو أسلحة غير مرخصة في مخزنك حالياً.</span>
                </div>
              )}
            </div>

            {/* نتيجة الإجراء إن اكتمل */}
            {actionDone && resultMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-zinc-900 border border-zinc-700 rounded-xl text-center space-y-2"
              >
                <p className="text-sm text-zinc-200 font-medium leading-relaxed">
                  {resultMessage}
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  إغلاق ومتابعة اللعب
                </button>
              </motion.div>
            )}

            {/* الأزرار التفاعلية الأربعة */}
            {!actionDone && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  disabled={isProcessing}
                  onClick={handleConfiscate}
                  className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-right flex flex-col gap-1 transition-all disabled:opacity-50"
                >
                  <div className="flex items-center gap-2 text-zinc-200 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-blue-400" />
                    خضوع للتفتيش والمصادرة
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    {raid.detectedContraband.length > 0 ? 'تسليم الممنوعات ودفع الغرامة' : 'فحص المخزن وإخلاء سبيلك'}
                  </span>
                </button>

                <button
                  disabled={isProcessing || (profile.cleanMoney || 0) < raid.requiredBribe}
                  onClick={handleBribe}
                  className="p-3 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-700/60 rounded-xl text-right flex flex-col gap-1 transition-all disabled:opacity-40"
                >
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                    <DollarSign className="w-4 h-4 text-amber-400" />
                    رشوة الضابط ({formatMoney(raid.requiredBribe)})
                  </div>
                  <span className="text-[11px] text-amber-400/80">
                    التغاضي عن التفتيش ومسح الشبهة
                  </span>
                </button>

                <button
                  disabled={isProcessing}
                  onClick={handleFlee}
                  className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-right flex flex-col gap-1 transition-all disabled:opacity-50"
                >
                  <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
                    <Footprints className="w-4 h-4 text-purple-400" />
                    شردة وهروب عبر الأسطح
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    تعتمد على سرعتك (مخاطرة بإطلاق النار)
                  </span>
                </button>

                <button
                  disabled={isProcessing}
                  onClick={handleResist}
                  className="p-3 bg-red-950/40 hover:bg-red-900/60 border border-red-700/60 rounded-xl text-right flex flex-col gap-1 transition-all disabled:opacity-50"
                >
                  <div className="flex items-center gap-2 text-red-300 font-bold text-xs">
                    <Swords className="w-4 h-4 text-red-400" />
                    مقاومة والاشتباك مع القوة
                  </div>
                  <span className="text-[11px] text-red-400/80">
                    مخاطرة قصوى بالسجن المركزي 15 دقيقة
                  </span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
