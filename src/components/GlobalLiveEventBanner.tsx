import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Sparkles, 
  Clock, 
  Coins, 
  Trophy, 
  Radio, 
  Zap, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { GlobalLiveEvent, LiveEventsService } from '../services/liveEventsService';
import { useAuthStore } from '../store/useAuthStore';
import { formatMoney } from '../lib/utils';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';

export const GlobalLiveEventBanner: React.FC = () => {
  const { profile } = useAuthStore();
  const [currentEvent, setCurrentEvent] = useState<GlobalLiveEvent | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isClaiming, setIsClaiming] = useState<boolean>(false);

  // Sync active event in real-time from Firestore
  useEffect(() => {
    // Check and spawn initially if needed
    LiveEventsService.checkAndSpawnEvent().catch(console.error);

    const unsub = onSnapshot(doc(db, 'global_events', 'current'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as GlobalLiveEvent;
        setCurrentEvent({
          ...data,
          claimedBy: data.claimedBy || []
        });
      }
    });

    // Interval to ensure event freshness
    const interval = setInterval(() => {
      LiveEventsService.checkAndSpawnEvent().catch(console.error);
    }, 60000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!currentEvent) return;

    const updateTimer = () => {
      const remaining = currentEvent.expiresAt - Date.now();
      if (remaining <= 0) {
        setTimeLeft('انتهى الحدث');
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

  if (!currentEvent || !currentEvent.active || currentEvent.expiresAt < Date.now()) {
    return null;
  }

  const hasClaimed = profile && currentEvent.claimedBy?.includes(profile.uid);

  const handleClaimReward = async () => {
    if (!profile || isClaiming || hasClaimed) return;
    setIsClaiming(true);
    try {
      await LiveEventsService.claimEventReward(currentEvent, profile);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.98 }}
        className="relative mx-4 lg:mx-8 mt-4 mb-2 rounded-3xl bg-gradient-to-r from-red-950/80 via-zinc-950/90 to-amber-950/80 border-2 border-amber-500/50 p-4 sm:p-5 shadow-[0_0_30px_rgba(245,158,11,0.25)] overflow-hidden z-30"
        dir="rtl"
      >
        {/* Background glow animations */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-right">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg animate-pulse">
              <Radio size={24} />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 text-[10px] font-black uppercase tracking-wider">
                  <Flame size={12} className="text-red-500 animate-bounce" />
                  حدث مباشر عاجل في المدينة
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 text-amber-400 font-mono text-[11px] font-bold border border-white/10">
                  <Clock size={12} />
                  متبقي: {timeLeft}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
                {currentEvent.title}
              </h2>
              <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
                {currentEvent.description}
              </p>
            </div>
          </div>

          {/* Action / Claim Button */}
          <div className="shrink-0 flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="text-left hidden sm:block">
              <div className="text-[10px] font-bold text-zinc-400">مكافأة الفوز المباشر</div>
              <div className="text-sm font-black text-amber-400">
                {currentEvent.rewardGold ? `${currentEvent.rewardGold} ذهبة` : ''} {currentEvent.rewardCash ? formatMoney(currentEvent.rewardCash) : ''}
              </div>
            </div>

            <button
              disabled={isClaiming || hasClaimed}
              onClick={handleClaimReward}
              className={clsx(
                "w-full md:w-auto px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer",
                hasClaimed
                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 cursor-default"
                  : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-amber-500/25 hover:scale-105 active:scale-95"
              )}
            >
              <Trophy size={16} />
              <span>{hasClaimed ? 'تم الاستحواذ بنجاح ✓' : 'استحوذ على الغنائم الآن! ⚡'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
