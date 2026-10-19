import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Flame, 
  Clock, 
  Coins, 
  Trophy, 
  ShieldAlert, 
  Play, 
  Square, 
  RotateCcw, 
  Sparkles, 
  Plus, 
  Building2, 
  Crosshair, 
  TrendingUp, 
  Swords, 
  Users, 
  Save, 
  CheckCircle2, 
  Calendar,
  AlertTriangle,
  Zap,
  DollarSign
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  GlobalLiveEvent, 
  LiveEventsService, 
  PRESET_GLOBAL_EVENTS, 
  GlobalEventType, 
  LiveEventSettings 
} from '../../services/liveEventsService';
import { formatMoney, formatNumber } from '../../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import PlayerAvatar from '../PlayerAvatar';

interface LiveEventManagerProps {
  adminName?: string;
}

export const LiveEventManager: React.FC<LiveEventManagerProps> = ({ adminName = 'المدير العام' }) => {
  const [currentEvent, setCurrentEvent] = useState<GlobalLiveEvent | null>(null);
  const [settings, setSettings] = useState<LiveEventSettings>({
    autoDaily: true,
    intervalHours: 6,
    autoTimes: ['14:00', '20:00'],
    defaultDurationMinutes: 45,
    defaultCash: 1500000,
    defaultGold: 500
  });

  // Form states for launching/customizing
  const [selectedPreset, setSelectedPreset] = useState<number>(0);
  const [title, setTitle] = useState(PRESET_GLOBAL_EVENTS[0].title);
  const [description, setDescription] = useState(PRESET_GLOBAL_EVENTS[0].description);
  const [type, setType] = useState<GlobalEventType>(PRESET_GLOBAL_EVENTS[0].type);
  const [rewardCash, setRewardCash] = useState<number>(PRESET_GLOBAL_EVENTS[0].rewardCash);
  const [rewardGold, setRewardGold] = useState<number>(PRESET_GLOBAL_EVENTS[0].rewardGold);
  const [rewardReputation, setRewardReputation] = useState<number>(PRESET_GLOBAL_EVENTS[0].rewardReputation);
  const [durationMinutes, setDurationMinutes] = useState<number>(PRESET_GLOBAL_EVENTS[0].defaultDuration);

  // Auto daily states
  const [autoDaily, setAutoDaily] = useState<boolean>(true);
  const [intervalHours, setIntervalHours] = useState<number>(6);
  const [defaultDuration, setDefaultDuration] = useState<number>(45);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Subscribe to current live event in real-time
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'global_events', 'current'), (snapshot) => {
      if (snapshot.exists()) {
        setCurrentEvent(snapshot.data() as GlobalLiveEvent);
      } else {
        setCurrentEvent(null);
      }
    });

    LiveEventsService.getSettings().then(s => {
      setSettings(s);
      setAutoDaily(s.autoDaily ?? true);
      setIntervalHours(s.intervalHours || 6);
      setDefaultDuration(s.defaultDurationMinutes || 45);
    }).catch(console.error);

    return () => unsub();
  }, []);

  // Countdown timer for active event
  useEffect(() => {
    if (!currentEvent || !currentEvent.active) {
      setTimeLeft('');
      return;
    }

    const updateTimer = () => {
      const remaining = currentEvent.expiresAt - Date.now();
      if (remaining <= 0) {
        setTimeLeft('انتهت مدة الحدث');
        return;
      }
      const mins = Math.floor(remaining / (1000 * 60));
      const secs = Math.floor((remaining % (1000 * 60)) / 1000);
      setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [currentEvent]);

  // Handle Preset selection
  const handleSelectPreset = (index: number) => {
    setSelectedPreset(index);
    const p = PRESET_GLOBAL_EVENTS[index];
    setTitle(p.title);
    setDescription(p.description);
    setType(p.type);
    setRewardCash(p.rewardCash);
    setRewardGold(p.rewardGold);
    setRewardReputation(p.rewardReputation);
    setDurationMinutes(p.defaultDuration);
  };

  // Launch event
  const handleLaunchEvent = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error('يرجى كتابة عنوان ووصف للحدث المباشر');
      return;
    }

    setIsSubmitting(true);
    try {
      await LiveEventsService.launchEvent({
        title: title.trim(),
        description: description.trim(),
        type,
        rewardCash: Number(rewardCash) || 0,
        rewardGold: Number(rewardGold) || 0,
        rewardReputation: Number(rewardReputation) || 0,
        durationMinutes: Number(durationMinutes) || 30,
        adminName
      });
      toast.success('🚀 تم إطلاق الحدث المباشر العاجل في المدينة بنجاح!');
    } catch (e: any) {
      console.error(e);
      toast.error('فشل في إطلاق الحدث المباشر');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stop event
  const handleStopEvent = async () => {
    setIsSubmitting(true);
    try {
      await LiveEventsService.stopEvent();
      toast.success('🛑 تم إيقاف وإنهاء الحدث المباشر فوراً');
    } catch (e) {
      toast.error('فشل في إيقاف الحدث');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Extend event
  const handleExtendEvent = async (mins: number) => {
    try {
      await LiveEventsService.extendEvent(mins);
      toast.success(`⏱️ تم تمديد وقت الحدث بـ ${mins} دقيقة إضافية`);
    } catch (e) {
      toast.error('فشل في تمديد الحدث');
    }
  };

  // Reset claims
  const handleResetClaims = async () => {
    try {
      await LiveEventsService.resetClaims();
      toast.success('🔄 تم مسح قائمة المستحوذين، يمكن للاعبين الاستحواذ مجدداً');
    } catch (e) {
      toast.error('فشل في إعادة تعيين القائمة');
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    try {
      await LiveEventsService.saveSettings({
        autoDaily,
        intervalHours: Number(intervalHours) || 6,
        defaultDurationMinutes: Number(defaultDuration) || 45,
        defaultCash: Number(rewardCash) || 1500000,
        defaultGold: Number(rewardGold) || 500
      });
      toast.success('💾 تم حفظ إعدادات التشغيل التلقائي اليومي بنجاح!');
    } catch (e) {
      toast.error('فشل في حفظ الإعدادات');
    }
  };

  const isEventActive = currentEvent && currentEvent.active && currentEvent.expiresAt > Date.now();

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Top Header Card */}
      <div className="relative rounded-3xl bg-gradient-to-r from-red-950/80 via-zinc-950 to-amber-950/70 border border-red-500/30 p-6 shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 shadow-lg">
              <Radio size={30} className={isEventActive ? "animate-pulse" : ""} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={clsx(
                  "px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1",
                  isEventActive 
                    ? "bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse" 
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                )}>
                  {isEventActive ? '🔴 بث مباشر نشط الآن في المدينة' : '⚪ لا يوجد حدث نشط حالياً'}
                </span>
                {isEventActive && timeLeft && (
                  <span className="bg-black/60 text-amber-400 font-mono text-xs px-2.5 py-0.5 rounded-md border border-white/10 flex items-center gap-1">
                    <Clock size={12} />
                    متبقي: {timeLeft}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                إدارة الأحداث المباشرة العاجلة في المدينة
              </h2>
              <p className="text-xs text-zinc-400">
                إطلاق فوري، تحديد التوقيت والمدة، ضبط المكافآت (كاش وذهب وسمعة)، والجدولة التلقائية اليومية.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
            {isEventActive ? (
              <button
                onClick={handleStopEvent}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-red-900/50 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Square size={16} />
                <span>إيقاف الحدث فوراً 🛑</span>
              </button>
            ) : (
              <button
                onClick={handleLaunchEvent}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Play size={16} />
                <span>إطلاق الحدث الآن 🚀</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Event Monitor (If Active) */}
      {isEventActive && currentEvent && (
        <div className="bg-zinc-900/90 border-2 border-amber-500/40 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
            <div>
              <div className="text-[11px] text-amber-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Flame size={14} className="text-red-500" />
                الحدث الجاري حالياً على شاشات جميع اللاعبين
              </div>
              <h3 className="text-lg font-black text-white">{currentEvent.title}</h3>
              <p className="text-xs text-zinc-300 max-w-2xl mt-1 leading-relaxed">{currentEvent.description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-zinc-950 px-4 py-2 rounded-2xl border border-zinc-800 text-center">
                <div className="text-[10px] text-zinc-400 font-bold">المكافأة النقدية</div>
                <div className="text-sm font-black text-emerald-400">{formatMoney(currentEvent.rewardCash || 0)}</div>
              </div>

              {currentEvent.rewardGold && (
                <div className="bg-zinc-950 px-4 py-2 rounded-2xl border border-zinc-800 text-center">
                  <div className="text-[10px] text-zinc-400 font-bold">المكافأة الذهبية</div>
                  <div className="text-sm font-black text-amber-400">{currentEvent.rewardGold} ذهبة 🪙</div>
                </div>
              )}

              <div className="bg-zinc-950 px-4 py-2 rounded-2xl border border-zinc-800 text-center">
                <div className="text-[10px] text-zinc-400 font-bold">المستحوذين</div>
                <div className="text-sm font-black text-blue-400">{currentEvent.claimedBy?.length || 0} لاعب</div>
              </div>
            </div>
          </div>

          {/* Quick Modifier Controls */}
          <div className="pt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">تحكم فوري:</span>
              <button
                onClick={() => handleExtendEvent(15)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>تمديد +15 دقيقة</span>
              </button>
              <button
                onClick={() => handleExtendEvent(30)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>تمديد +30 دقيقة</span>
              </button>
              <button
                onClick={handleResetClaims}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>إعادة تصفير المستحوذين</span>
              </button>
            </div>

            <div className="text-zinc-500 text-[11px]">
              أُطلق بواسطة: <span className="text-zinc-300 font-bold">{currentEvent.launchedBy || 'النظام'}</span> | البداية: {new Date(currentEvent.startedAt).toLocaleTimeString('ar-EG')}
            </div>
          </div>

          {/* Claimers list if any */}
          {currentEvent.claimedDetails && currentEvent.claimedDetails.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-800/80">
              <div className="text-xs font-bold text-zinc-400 mb-2.5 flex items-center gap-2">
                <Users size={14} className="text-blue-400" />
                <span>سجل اللاعبين المستحوذين على الغنائم ({currentEvent.claimedDetails.length}):</span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1">
                {currentEvent.claimedDetails.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs">
                    <PlayerAvatar photoURL={c.photoURL} displayName={c.displayName} size="sm" />
                    <div>
                      <div className="font-bold text-white text-[11px]">{c.displayName}</div>
                      <div className="text-[9px] text-zinc-500">{new Date(c.claimedAt).toLocaleTimeString('ar-EG')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1 & 2: Launch / Customize Event */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preset Selection Cards */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                <span>اختر قالباً جاهزاً أو قم بتخصيصه</span>
              </h3>
              <span className="text-[11px] text-zinc-400 font-bold">{PRESET_GLOBAL_EVENTS.length} قوالب أحداث عاجلة</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRESET_GLOBAL_EVENTS.map((preset, idx) => {
                const isSelected = selectedPreset === idx;
                return (
                  <div
                    key={preset.type}
                    onClick={() => handleSelectPreset(idx)}
                    className={clsx(
                      "p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between text-right",
                      isSelected
                        ? "bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/10 scale-[1.01]"
                        : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-950"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-white">{preset.title.split('!')[0]}!</span>
                        {isSelected && <CheckCircle2 size={16} className="text-amber-400 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800/50 text-[10px]">
                      <span className="text-emerald-400 font-black">{formatMoney(preset.rewardCash)}</span>
                      <span className="text-amber-400 font-black">{preset.rewardGold} ذهبة 🪙</span>
                      <span className="text-zinc-500 font-mono">{preset.defaultDuration} دقيقة</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Customization Form */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Zap size={16} className="text-red-500" />
              <span>تخصيص تفاصيل ومكافأة الحدث المطلوب إطلاقه</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">عنوان الحدث العاجل</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: هبوط شحنة سبائك ذهبية في الميناء..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">وصف الحدث وتفاصيله الميدانية</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="اكتب وصفاً جذاباً يشعل المنافسة بين اللاعبين..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-medium leading-relaxed"
                />
              </div>

              {/* Rewards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-emerald-400 mb-1 flex items-center gap-1">
                    <DollarSign size={14} />
                    <span>مكافأة الكاش ($)</span>
                  </label>
                  <input
                    type="number"
                    value={rewardCash}
                    onChange={(e) => setRewardCash(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-black focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-400 mb-1 flex items-center gap-1">
                    <Coins size={14} />
                    <span>مكافأة الذهب (🪙)</span>
                  </label>
                  <input
                    type="number"
                    value={rewardGold}
                    onChange={(e) => setRewardGold(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-amber-400 font-black focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-400 mb-1 flex items-center gap-1">
                    <Trophy size={14} />
                    <span>نقاط السمعة / الخبرة</span>
                  </label>
                  <input
                    type="number"
                    value={rewardReputation}
                    onChange={(e) => setRewardReputation(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-blue-400 font-black focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Duration Setting */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  <Clock size={14} className="text-amber-400" />
                  <span>تحديد مدة استمرار الحدث بالدقائق:</span>
                </label>
                
                <div className="flex flex-wrap gap-2">
                  {[10, 15, 20, 30, 45, 60, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={clsx(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer",
                        durationMinutes === mins
                          ? "bg-red-600 text-white shadow"
                          : "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white"
                      )}
                    >
                      {mins} دقيقة
                    </button>
                  ))}
                  <div className="flex items-center gap-1 mr-auto">
                    <input
                      type="number"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Math.max(1, Number(e.target.value)))}
                      className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white text-center font-bold"
                    />
                    <span className="text-zinc-500 text-xs">دقيقة مخصصة</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleLaunchEvent}
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 bg-gradient-to-r from-red-600 via-red-500 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-red-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-95"
                >
                  <Play size={16} />
                  <span>إطلاق الحدث المباشر الآن في المدينة 🚀</span>
                </button>

                {isEventActive && (
                  <button
                    type="button"
                    onClick={handleStopEvent}
                    disabled={isSubmitting}
                    className="px-5 py-3.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-red-400 font-black rounded-2xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Square size={16} />
                    <span>إيقاف</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Daily Auto-Schedule & Banner Preview */}
        <div className="space-y-6">
          {/* Automatic Daily Settings Card */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Calendar size={16} className="text-amber-400" />
                <span>الجدولة التلقائية اليومية</span>
              </h3>
              
              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => setAutoDaily(!autoDaily)}
                className={clsx(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  autoDaily ? "bg-emerald-600" : "bg-zinc-800"
                )}
              >
                <span
                  className={clsx(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    autoDaily ? "translate-x-0" : "-translate-x-5"
                  )}
                />
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              عند تفعيل الجدولة التلقائية، يقوم النظام بتدوير وإطلاق أحداث عاجلة في شوارع المدينة تلقائياً دون الحاجة لتدخل إداري يومي.
            </p>

            <div className="space-y-3 pt-2 border-t border-zinc-800/80">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">تكرار الإطلاق التلقائي</label>
                <select
                  value={intervalHours}
                  onChange={(e) => setIntervalHours(Number(e.target.value))}
                  disabled={!autoDaily}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-amber-500 disabled:opacity-50"
                >
                  <option value={2}>كل ساعتين (مكثف جداً)</option>
                  <option value={4}>كل 4 ساعات</option>
                  <option value={6}>كل 6 ساعات (موصى به)</option>
                  <option value={8}>كل 8 ساعات</option>
                  <option value={12}>مرتين يومياً (كل 12 ساعة)</option>
                  <option value={24}>مرة واحدة يومياً (كل 24 ساعة)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">المدة الافتراضية للحدث التلقائي</label>
                <select
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(Number(e.target.value))}
                  disabled={!autoDaily}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-amber-500 disabled:opacity-50"
                >
                  <option value={20}>20 دقيقة</option>
                  <option value={30}>30 دقيقة</option>
                  <option value={45}>45 دقيقة (افتراضي)</option>
                  <option value={60}>ساعة كاملة (60 دقيقة)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleSaveSettings}
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 border border-zinc-700 transition-colors cursor-pointer mt-2"
              >
                <Save size={14} />
                <span>حفظ إعدادات التلقائي اليومي</span>
              </button>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Radio size={16} className="text-amber-400" />
                <span>معاينة حية لشكل البانر لدى اللاعبين</span>
              </h3>
              <span className="text-[10px] text-zinc-500">Live Preview</span>
            </div>

            <div className="rounded-2xl bg-gradient-to-r from-red-950/80 via-zinc-950 to-amber-950/80 border border-amber-500/50 p-3.5 text-right space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600/30 text-red-400 text-[9px] font-black">
                  <Flame size={10} className="text-red-500" />
                  حدث مباشر عاجل بالمدينة
                </span>
                <span className="text-[10px] text-amber-400 font-mono font-bold">
                  متبقي: {durationMinutes}:00
                </span>
              </div>
              <div className="font-black text-xs text-white line-clamp-1">{title}</div>
              <div className="text-[10px] text-zinc-300 line-clamp-2 leading-relaxed">{description}</div>
              <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px]">
                <span className="text-amber-400 font-black">{formatMoney(rewardCash)}</span>
                <span className="bg-amber-500 text-black px-2.5 py-1 rounded-lg font-black text-[10px]">
                  استحوذ على الغنائم
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
