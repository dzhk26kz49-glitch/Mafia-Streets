import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { getActiveBuffBadges } from '../lib/rolePerks';
import { Sparkles, ArrowRight, Zap, Crown, TrendingUp, ShieldAlert, Compass, ChevronLeft } from 'lucide-react';
import clsx from 'clsx';

const ROLE_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  Boss: { label: 'الزعيم', icon: Crown, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  Trader: { label: 'التاجر', icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  Thief: { label: 'اللص', icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  Smuggler: { label: 'المهرب', icon: Compass, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
  Criminal: { label: 'المجرم', icon: ShieldAlert, color: 'text-zinc-300', bg: 'bg-zinc-700/20 border-zinc-600/30' },
  Admin: { label: 'الإدارة العليا', icon: Crown, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' }
};

export default function RoleActivePerksBar() {
  const { profile } = useAuthStore();
  if (!profile) return null;

  const role = profile.role || 'Trader';
  const meta = ROLE_META[role] || ROLE_META.Trader;
  const RoleIcon = meta.icon;
  const badges = getActiveBuffBadges(profile);
  const skillPoints = profile.roleSkills?.skillPoints ?? 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-white/10 p-4 shadow-xl">
      <div className="absolute top-0 end-0 -mt-6 -me-6 w-32 h-32 bg-red-600/5 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Role & Title */}
        <div className="flex items-center gap-3">
          <div className={clsx("p-2.5 rounded-xl border flex items-center justify-center shadow-lg", meta.bg)}>
            <RoleIcon size={22} className={meta.color} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">تأثير واختصاص الشخصية</span>
              <span className={clsx("text-xs font-black px-2 py-0.5 rounded-full border", meta.bg, meta.color)}>
                {meta.label}
              </span>
              {skillPoints > 0 && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                  {skillPoints} نقطة مهارة متاحة ⭐
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-300 font-medium mt-0.5">
              الميزات الاستراتيجية النشطة المفعلة حالياً في جميع عملياتك:
            </p>
          </div>
        </div>

        {/* Action Link to Skills Tree */}
        <Link 
          to="/role-skills"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs transition-all hover:border-red-500/40 group shrink-0"
        >
          <Sparkles size={14} className="text-amber-400 group-hover:rotate-12 transition-transform" />
          <span>شجرة المهارات والعقود</span>
          <ChevronLeft size={14} className="text-zinc-400 group-hover:-translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Badges Grid */}
      <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-2 items-center">
        {badges.length > 0 ? (
          badges.map(b => (
            <div 
              key={b.id} 
              title={b.description}
              className={clsx(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm",
                b.color
              )}
            >
              <span className="text-white/80">{b.label}:</span>
              <span className="font-black text-sm tracking-wide">{b.value}</span>
            </div>
          ))
        ) : (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="text-amber-400">💡</span>
            <span>لم تقم بترقية مهارات دورك بعد! ادخل إلى شجرة المهارات واستثمر نقاطك لتفعيل مضاعفات الأرباح والحصانة.</span>
            <Link to="/role-skills" className="text-blue-400 hover:underline font-bold">
              ابدأ الترقية الآن
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
