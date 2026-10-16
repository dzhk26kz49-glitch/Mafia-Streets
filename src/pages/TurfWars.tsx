import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { DistrictTurf } from '../types/turfTypes';
import { TurfService, INITIAL_TURF_DISTRICTS } from '../services/turfService';
import { formatMoney, formatNumber } from '../lib/utils';
import { 
  Swords, 
  Shield, 
  MapPin, 
  TrendingUp, 
  Building2, 
  Users, 
  Coins, 
  DollarSign, 
  Sparkles, 
  Crown, 
  Flame, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  Crosshair, 
  Lock, 
  Unlock, 
  RefreshCw 
} from 'lucide-react';
import { toast } from 'sonner';
import { collection, onSnapshot, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function TurfWars() {
  const { profile, calculatePower, calculateDefense } = useAuthStore();
  const [districts, setDistricts] = useState<DistrictTurf[]>(INITIAL_TURF_DISTRICTS);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictTurf | null>(null);
  const [isAttacking, setIsAttacking] = useState<boolean>(false);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<'all' | 'mine' | 'rivals'>('all');

  // Player combat stats
  const myCombatPower = profile ? calculatePower(profile) : 1000;
  const myCombatDefense = profile ? calculateDefense(profile) : 1000;

  // Real-time Firestore Sync
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'turf_districts'), (snapshot) => {
      if (!snapshot.empty) {
        const liveDistricts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DistrictTurf));
        const map = new Map<string, DistrictTurf>();
        INITIAL_TURF_DISTRICTS.forEach(d => map.set(d.id, d));
        liveDistricts.forEach(d => map.set(d.id, { ...map.get(d.id), ...d }));
        setDistricts(Array.from(map.values()));
      }
    });
    return () => unsub();
  }, []);

  // Filtered districts
  const filteredDistricts = useMemo(() => {
    if (!profile) return districts;
    const myId = profile.gangId || profile.uid;
    if (filterType === 'mine') {
      return districts.filter(d => d.controllerId === myId);
    }
    if (filterType === 'rivals') {
      return districts.filter(d => d.controllerId !== myId);
    }
    return districts;
  }, [districts, filterType, profile]);

  // Statistics
  const controlledByMe = useMemo(() => {
    if (!profile) return [];
    const myId = profile.gangId || profile.uid;
    return districts.filter(d => d.controllerId === myId);
  }, [districts, profile]);

  const totalDailyRevenue = useMemo(() => {
    return controlledByMe.reduce((acc, d) => acc + d.dailyRevenue, 0);
  }, [controlledByMe]);

  const totalAccumulatedTax = useMemo(() => {
    return controlledByMe.reduce((acc, d) => acc + TurfService.calculateLiveAccumulatedTax(d), 0);
  }, [controlledByMe]);

  // Launch Attack
  const handleLaunchAttack = async (district: DistrictTurf) => {
    if (!profile) return;
    setIsAttacking(true);
    try {
      await TurfService.launchTurfWar(district, profile, myCombatPower);
    } finally {
      setIsAttacking(false);
    }
  };

  const [collectingDistrictId, setCollectingDistrictId] = useState<string | null>(null);

  // Collect Tax
  const handleCollectTax = async (district: DistrictTurf) => {
    if (!profile || collectingDistrictId === district.id) return;
    setCollectingDistrictId(district.id);
    try {
      await TurfService.collectDistrictTax(district, profile);
    } finally {
      setCollectingDistrictId(null);
    }
  };

  // Fortify Garrison
  const handleFortify = async (district: DistrictTurf) => {
    if (!profile) return;
    setIsProcessingAction(true);
    try {
      await TurfService.fortifyDistrict(district, profile);
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 text-right max-w-7xl mx-auto" dir="rtl">
      
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-black border border-red-600/30 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-600/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/10 border border-red-600/30 text-red-500 text-xs font-bold">
              <Swords size={14} />
              <span>خريطة النفوذ الإقليمي وحرب الشوارع</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              السيطرة على أحياء بغداد والإتاوات ⚔️
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
              اخترق نفوذ العصابات المنافسة في شوارع الكرادة والمنصور والبتاوين، ابنِ حراساتك الخاصة، وافرض إتاوات الحماية على المحال والشركات لجني أرباح يومية هائلة.
            </p>
          </div>

          {/* Player Turf Empire Stats Card */}
          <div className="grid grid-cols-2 gap-3 bg-black/60 border border-white/10 rounded-2xl p-4 shadow-xl shrink-0 backdrop-blur-xl">
            <div className="p-2 border-l border-white/10 text-left">
              <div className="text-[10px] font-bold text-zinc-400">الأحياء الخاضعة لك</div>
              <div className="text-xl font-black text-emerald-400">
                {controlledByMe.length} / {districts.length}
              </div>
            </div>
            <div className="p-2 text-left">
              <div className="text-[10px] font-bold text-zinc-400">الدخل اليومي للإتاوات</div>
              <div className="text-xl font-black text-amber-400">
                {formatMoney(totalDailyRevenue)}
              </div>
            </div>
          </div>
        </div>

        {/* Combat readiness info bar */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs font-bold text-zinc-300">
            <span className="flex items-center gap-1.5 text-red-400">
              <Crosshair size={14} />
              قوتك الهجومية: <strong className="text-white font-mono">{formatNumber(myCombatPower)}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-blue-400">
              <Shield size={14} />
              قوة دفاعك: <strong className="text-white font-mono">{formatNumber(myCombatDefense)}</strong>
            </span>
          </div>

          {totalAccumulatedTax > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
              <span>إجمالي الإتاوات غير المحصلة:</span>
              <strong className="font-mono text-sm">{formatMoney(totalAccumulatedTax)}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
        {[
          { id: 'all', label: `كافة الأحياء (${districts.length})`, icon: MapPin },
          { id: 'mine', label: `أحيائي المسيطر عليها (${controlledByMe.length})`, icon: Crown },
          { id: 'rivals', label: `أحياء العصابات المنافسة (${districts.length - controlledByMe.length})`, icon: Swords }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = filterType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={clsx(
                "flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs transition-all cursor-pointer",
                isActive
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                  : "bg-zinc-900/60 text-zinc-400 hover:text-white border border-white/5"
              )}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Districts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {filteredDistricts.map((district) => {
          const myId = profile?.gangId || profile?.uid;
          const isController = district.controllerId === myId;
          const liveTax = TurfService.calculateLiveAccumulatedTax(district);

          return (
            <div 
              key={district.id}
              className={clsx(
                "rounded-3xl overflow-hidden border bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-black transition-all shadow-xl flex flex-col justify-between group",
                district.color
              )}
            >
              <div>
                {/* District Image Header */}
                <div className="relative aspect-[16/8] overflow-hidden bg-black">
                  <img 
                    src={district.image} 
                    alt={district.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

                  {/* Controller Badge */}
                  <div className="absolute top-4 right-4">
                    <span className={clsx(
                      "px-3 py-1 rounded-full text-xs font-black backdrop-blur-md border shadow-lg flex items-center gap-1.5",
                      isController 
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" 
                        : "bg-red-500/20 text-red-400 border-red-500/40"
                    )}>
                      {isController ? <Crown size={13} /> : <Shield size={13} />}
                      <span>{isController ? 'منطقة تحت سيطرتك' : `المسيطر: ${district.controllerName}`}</span>
                    </span>
                  </div>

                  {/* Control % Meter Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-black bg-black/80 text-amber-400 border border-amber-500/30">
                      نفوذ: {district.controlPercent}%
                    </span>
                  </div>

                  {/* Title & Subtitle */}
                  <div className="absolute bottom-4 inset-x-4">
                    <h3 className="text-xl font-black text-white drop-shadow-md mb-0.5">
                      {district.name}
                    </h3>
                    <p className="text-xs text-zinc-300 font-medium">
                      {district.subtitle}
                    </p>
                  </div>
                </div>

                {/* District Stats & Details */}
                <div className="p-6 space-y-4">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {district.description}
                  </p>

                  {/* Control Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-zinc-400">مستوى السيطرة الميدانية:</span>
                      <span className={isController ? "text-emerald-400 font-mono" : "text-amber-400 font-mono"}>
                        {district.controlPercent}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden p-0.5">
                      <div 
                        className={clsx(
                          "h-full rounded-full transition-all duration-500",
                          isController ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-gradient-to-r from-red-600 to-amber-500"
                        )}
                        style={{ width: `${district.controlPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-0.5">
                      <span className="text-[10px] text-zinc-500 block">الدخل اليومي للإتاوات</span>
                      <span className="text-sm font-black text-amber-400 font-mono">
                        {formatMoney(district.dailyRevenue)}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-0.5">
                      <span className="text-[10px] text-zinc-500 block">دفاعات الحي والحراسة</span>
                      <span className="text-sm font-black text-blue-400 font-mono">
                        {formatNumber(district.defensePower)} ({district.garrisonCount} حارس)
                      </span>
                    </div>
                  </div>

                  {/* District Perk */}
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-zinc-900 to-amber-500/5 border border-amber-500/20 flex items-start gap-2.5">
                    <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="font-bold text-amber-400 block mb-0.5">ميزة الحي الاستراتيجية:</span>
                      <span className="text-zinc-200">{district.districtPerk}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-6 pt-0 space-y-2">
                {isController ? (
                  <div className="space-y-2">
                    <button
                      disabled={collectingDistrictId === district.id}
                      onClick={() => handleCollectTax(district)}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Coins size={16} />
                      <span>{collectingDistrictId === district.id ? 'جاري التحصيل...' : `تحصيل إتاوات الحي المتراكمة (${formatMoney(liveTax)}) 💵`}</span>
                    </button>

                    <button
                      disabled={isProcessingAction || district.fortificationLevel >= 5}
                      onClick={() => handleFortify(district)}
                      className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-white/5"
                    >
                      <Shield size={14} className="text-blue-400" />
                      <span>ترقية التحصينات للمستوى {district.fortificationLevel + 1} ({formatMoney((district.fortificationLevel + 1) * 200000)})</span>
                    </button>
                  </div>
                ) : (
                  <button
                    disabled={isAttacking}
                    onClick={() => handleLaunchAttack(district)}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Swords size={16} />
                    <span>شن حرب نفوذ لاقتحام الحي ⚔️</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
