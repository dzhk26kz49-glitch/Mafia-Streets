import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Music, 
  Play, 
  Pause, 
  Siren, 
  Coins, 
  Briefcase, 
  Sliders, 
  Sparkles, 
  Radio,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { soundEngine } from '../services/soundEngine';
import { motion, AnimatePresence } from 'framer-motion';

interface AudioAtmosphereControlProps {
  variant?: 'floating' | 'header';
}

export const AudioAtmosphereControl: React.FC<AudioAtmosphereControlProps> = ({ variant = 'header' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.25);
  const [isMuted, setIsMuted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = soundEngine.subscribe((playing, vol, muted) => {
      setIsPlaying(playing);
      setVolume(vol);
      setIsMuted(muted);
    });

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggleMusic = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.toggleBackgroundMusic();
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.toggleMute();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    soundEngine.setVolume(parseFloat(e.target.value));
  };

  // Quick SFX preview triggers
  const handleTestCash = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playCashSound();
  };

  const handleTestSiren = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playPoliceSirenSound();
  };

  const handleTestBlackMarket = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playBlackMarketDealSound();
  };

  return (
    <div className="relative inline-block" ref={panelRef} dir="rtl">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 backdrop-blur-md cursor-pointer select-none ${
          isPlaying && !isMuted
            ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
            : isMuted
            ? 'bg-zinc-900/60 border-zinc-800 text-zinc-500'
            : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10'
        }`}
        title="المؤثرات الصوتية والموسيقى السينمائية"
      >
        {/* Animated equalizer wave when music is active */}
        {isPlaying && !isMuted ? (
          <div className="flex items-end gap-0.5 h-3.5 w-3.5">
            <span className="w-1 bg-amber-400 rounded-full animate-[pulse_0.7s_ease-in-out_infinite]" style={{ height: '60%' }} />
            <span className="w-1 bg-amber-400 rounded-full animate-[pulse_0.5s_ease-in-out_infinite]" style={{ height: '100%' }} />
            <span className="w-1 bg-amber-400 rounded-full animate-[pulse_0.9s_ease-in-out_infinite]" style={{ height: '40%' }} />
          </div>
        ) : (
          <Music size={15} className={isPlaying ? 'text-amber-400' : 'text-zinc-400'} />
        )}

        <span className="text-xs font-black hidden sm:inline">
          {isPlaying && !isMuted ? 'Mafia Lo-Fi' : 'الصوت السينمائي'}
        </span>

        {isMuted ? (
          <VolumeX size={14} className="text-red-400" />
        ) : (
          <Volume2 size={14} className={isPlaying ? 'text-amber-400' : 'text-zinc-400'} />
        )}
      </button>

      {/* Popover Settings & SFX Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 start-0 sm:start-auto sm:end-0 z-[100] w-72 bg-zinc-950/95 border border-amber-500/30 rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl text-right text-white"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <Radio size={16} className="text-amber-400 animate-pulse" />
                <span className="text-xs font-black text-amber-400">نظام المؤثرات والأجواء السينمائية</span>
              </div>
              <button
                onClick={handleToggleMute}
                className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                  isMuted 
                    ? 'bg-red-500/20 border-red-500/40 text-red-400' 
                    : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white'
                }`}
                title={isMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت كلياً'}
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
            </div>

            {/* Background Music Card */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 mb-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-400" />
                    <span>موسيقى المافيا (Mafia Noir Lo-Fi)</span>
                  </h4>
                  <p className="text-[10px] text-zinc-400">أجواء خافتة غامضة من شوارع بغداد وعالم الخفاء</p>
                </div>

                <button
                  onClick={handleToggleMusic}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isPlaying && !isMuted
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  title={isPlaying ? 'إيقاف الموسيقى' : 'تشغيل الموسيقى'}
                >
                  {isPlaying && !isMuted ? <Pause size={14} /> : <Play size={14} className="mr-0.5" />}
                </button>
              </div>

              {/* Volume Slider */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>مستوى صوت الموسيقى</span>
                  <span className="font-mono text-amber-400">{Math.round(volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-full accent-amber-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Interactive Sound Effects Section */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-zinc-400 block px-1">
                المؤثرات الصوتية التفاعلية الواقعية:
              </span>

              <div className="grid grid-cols-1 gap-1.5">
                {/* 1. Cash Counting */}
                <button
                  onClick={handleTestCash}
                  className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/5 hover:border-emerald-500/30 transition-all text-xs group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Coins size={13} />
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-white block text-[11px]">صوت عدّ النقود الورقية 💵</span>
                      <span className="text-[9px] text-zinc-500">في البنك، الخزنة السويسرية، وغسيل الأموال</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                    تجربة ▶
                  </span>
                </button>

                {/* 2. Police Siren */}
                <button
                  onClick={handleTestSiren}
                  className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/5 hover:border-red-500/30 transition-all text-xs group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
                      <Siren size={13} />
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-white block text-[11px]">سارينة الشرطة التكتيكية 🚨</span>
                      <span className="text-[9px] text-zinc-500">عند ارتفاع النجوم وبدء المداهمات الأمنية</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-red-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                    تجربة ▶
                  </span>
                </button>

                {/* 3. Black Market Deal */}
                <button
                  onClick={handleTestBlackMarket}
                  className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/5 hover:border-amber-500/30 transition-all text-xs group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Briefcase size={13} />
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-white block text-[11px]">صفقات السوق السوداء 💼</span>
                      <span className="text-[9px] text-zinc-500">محقبة الممنوعات، المزادات، وتهريب الشحنات</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                    تجربة ▶
                  </span>
                </button>
              </div>
            </div>

            {/* Footer status */}
            <div className="mt-3 pt-2.5 border-t border-white/10 text-center text-[10px] text-zinc-500 font-mono">
              محرك Web Audio API الواقعي • بدون أي تأخير
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
