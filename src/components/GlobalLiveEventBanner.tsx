import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Sparkles, 
  Clock, 
  Coins, 
  Trophy, 
  Radio, 
  Zap, 
  Users,
  ShieldAlert
} from 'lucide-react';
import { GlobalLiveEvent, LiveEventsService } from '../services/liveEventsService';
import { useAuthStore } from '../store/useAuthStore';
import { formatMoney } from '../lib/utils';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import { soundEngine } from '../services/soundEngine';

export const GlobalLiveEventBanner: React.FC = () => {
  const { profile } = useAuthStore();
  const [currentEvent, setCurrentEvent] = useState<GlobalLiveEvent | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [hasPlayedArrivalSound, setHasPlayedArrivalSound] = useState<string>('');

  // Sync active event in real-time from Firestore
  useEffect(() => {
    // Check and spawn initially if daily auto is enabled
    LiveEventsService.checkAndSpawnEvent().catch(console.error);

    const unsub = onSnapshot(doc(db, 'global_events', 'current'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as GlobalLiveEvent;
        setCurrentEvent({
          ...data,
          claimedBy: data.claimedBy || [],
          claimedDetails: data.claimedDetails || []
        });

        // Trigger arrival sound once when a new event is detected
        if (data.active && data.expiresAt > Date.now() && data.id !== hasPlayedArrivalSound) {
          setHasPlayedArrivalSound(data.id);
          try {
            soundEngine.playSirenSound();
          } catch (_) {}
        }
      } else {
        setCurrentEvent(null);
      }
    });

    // Interval to ensure event freshness and auto-daily checks
    const interval = setInterval(() => {
      LiveEventsService.checkAndSpawnEvent().catch(console.error);
    }, 60000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [hasPlayedArrivalSound]);

  // Countdown timer
  useEffect(() => {
    if (!currentEvent || !currentEvent.active) return;

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
  const claimCount = currentEvent.claimedBy?.length || 0;

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
        className="relative mx-3 sm:mx-4 lg:mx-8 mt-2 mb-4 rounded-3xl bg-gradient-to-r from-red-950/90 via-zinc-950/95 to-amber-950/90 border-2 border-red-500/60 p-4 sm:p-5 shadow-[0_0_40px_rgba(239,68,68,0.35)] overflow-hidden z-30"
        dir="rtl"
      >
        {/* Glowing aura */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 text-right">
            <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl bg-red-600/20 border border-red-500/50 flex items-center justify-center text-red-500 shrink-0 shadow-lg animate-pulse">
              <Radio size={26} />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-600/30 text-red-400 border border-red-500/40 text-[10px] font-black uppercase tracking-wider animate-pulse">
                  <Flame size={12} className="text-red-500" />
                  حدث مباشر عاجل في المدينة!
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-black/70 text-amber-400 font-mono text-[11px] font-bold border border-white/10">
                  <Clock size={12} />
                  الوقت المتبقي: {timeLeft}
                </span>
                {claimCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 text-[10px] font-bold border border-blue-500/30">
                    <Users size={11} />
                    {claimCount} لاعب استحوذ
                  </span>
                )}
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
          <div className="shrink-0 flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-white/10">
            <div className="text-right md:text-left">
              <div className="text-[10px] font-bold text-zinc-400">مكافأة الاستحواذ:</div>
              <div className="text-xs sm:text-sm font-black text-amber-400 flex items-center gap-1.5">
                {currentEvent.rewardCash ? <span>{formatMoney(currentEvent.rewardCash)}</span> : null}
                {currentEvent.rewardGold ? <span>+ {currentEvent.rewardGold} ذهبة 🪙</span> : null}
                {currentEvent.rewardReputation ? <span className="text-blue-400 text-[11px]">(+{currentEvent.rewardReputation} سمعة)</span> : null}
              </div>
            </div>

            <button
              disabled={isClaiming || hasClaimed}
              onClick={handleClaimReward}
              className={clsx(
                "px-5 sm:px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer",
                hasClaimed
                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 cursor-default shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  : "bg-gradient-to-r from-red-600 via-amber-500 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-red-600/30 hover:scale-105 active:scale-95"
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
