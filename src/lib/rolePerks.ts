import { UserProfile, Role } from '../store/useAuthStore';

export interface ActiveRolePerks {
  // Trader perks
  traderProfitBonusPercent: number; // e.g. 20 * level
  traderTaxDiscountPercent: number; // e.g. 15 * level
  traderMarketDiscountPercent: number; // e.g. 12 * level
  traderVaultProtectionPercent: number; // e.g. 25 * level

  // Thief perks
  thiefCrimeSuccessBonusPercent: number; // e.g. 15 * level
  thiefAlarmBypassPercent: number; // e.g. 20 * level
  thiefDoubleLootPercent: number; // e.g. 25 * level
  thiefCooldownReductionPercent: number; // e.g. 30 * level

  // Smuggler perks
  smugglerTravelReductionPercent: number; // e.g. 25 * level
  smugglerCustomsProtectionPercent: number; // e.g. 20 * level
  smugglerCargoBonusPercent: number; // e.g. 30 * level
  smugglerTradeProfitBonusPercent: number; // e.g. 20 * level

  // Boss perks
  bossReputationBonusPercent: number; // e.g. 15 * level
  bossAttackBonusPercent: number; // e.g. 12 * level
  bossImmunityBailPercent: number; // e.g. 20 * level
  bossSpoilsBonusPercent: number; // e.g. 25 * level

  // Criminal perks
  crimAttackBonusPercent: number; // e.g. 18 * level
  crimPrisonReductionPercent: number; // e.g. 25 * level
  crimIntimidationDebuffPercent: number; // e.g. 15 * level
  crimRecoverySpeedPercent: number; // e.g. 35 * level
}

export function getActiveRolePerks(profile: UserProfile | null | undefined): ActiveRolePerks {
  const skills = profile?.roleSkills?.skills || {};

  return {
    // Trader
    traderProfitBonusPercent: (skills['trader_foresight'] || 0) * 20,
    traderTaxDiscountPercent: (skills['trader_tax_evasion'] || 0) * 15,
    traderMarketDiscountPercent: (skills['trader_monopoly'] || 0) * 12,
    traderVaultProtectionPercent: (skills['trader_fortified_vaults'] || 0) * 25,

    // Thief
    thiefCrimeSuccessBonusPercent: (skills['thief_shadow_fingers'] || 0) * 15,
    thiefAlarmBypassPercent: (skills['thief_alarm_bypass'] || 0) * 20,
    thiefDoubleLootPercent: (skills['thief_double_loot'] || 0) * 25,
    thiefCooldownReductionPercent: (skills['thief_quick_escape'] || 0) * 30,

    // Smuggler
    smugglerTravelReductionPercent: (skills['smuggler_corridors'] || 0) * 25,
    smugglerCustomsProtectionPercent: (skills['smuggler_customs_evasion'] || 0) * 20,
    smugglerCargoBonusPercent: (skills['smuggler_cargo_capacity'] || 0) * 30,
    smugglerTradeProfitBonusPercent: (skills['smuggler_black_brokerage'] || 0) * 20,

    // Boss
    bossReputationBonusPercent: (skills['boss_authority'] || 0) * 15,
    bossAttackBonusPercent: (skills['boss_command'] || 0) * 12,
    bossImmunityBailPercent: (skills['boss_immunity'] || 0) * 20,
    bossSpoilsBonusPercent: (skills['boss_spoils'] || 0) * 25,

    // Criminal
    crimAttackBonusPercent: (skills['crim_iron_fist'] || 0) * 18,
    crimPrisonReductionPercent: (skills['crim_prison_resilience'] || 0) * 25,
    crimIntimidationDebuffPercent: (skills['crim_intimidation'] || 0) * 15,
    crimRecoverySpeedPercent: (skills['crim_rapid_recovery'] || 0) * 35,
  };
}

export interface PerkBadge {
  id: string;
  label: string;
  value: string;
  color: string;
  description: string;
}

export function getActiveBuffBadges(profile: UserProfile | null | undefined): PerkBadge[] {
  if (!profile) return [];
  const perks = getActiveRolePerks(profile);
  const badges: PerkBadge[] = [];

  // Trader
  if (perks.traderProfitBonusPercent > 0) {
    badges.push({
      id: 'trader_profit',
      label: 'أرباح العقارات',
      value: `+${perks.traderProfitBonusPercent}%`,
      color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30',
      description: 'زيادة مباشرة في دخل الشركات والممتلكات'
    });
  }
  if (perks.traderMarketDiscountPercent > 0) {
    badges.push({
      id: 'trader_discount',
      label: 'خصم الأسواق',
      value: `-${perks.traderMarketDiscountPercent}%`,
      color: 'text-blue-400 border-blue-500/40 bg-blue-950/30',
      description: 'خصم على مشتريات السوق والمول'
    });
  }
  if (perks.traderTaxDiscountPercent > 0) {
    badges.push({
      id: 'trader_tax',
      label: 'تخفيض الغسيل',
      value: `-${perks.traderTaxDiscountPercent}%`,
      color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/30',
      description: 'تخفيض عمولة غسيل الأموال في الواجهات'
    });
  }
  if (perks.traderVaultProtectionPercent > 0) {
    badges.push({
      id: 'trader_vault',
      label: 'حماية الخزائن',
      value: `+${perks.traderVaultProtectionPercent}%`,
      color: 'text-indigo-400 border-indigo-500/40 bg-indigo-950/30',
      description: 'حماية الأرصدة ضد السرقة والسطو'
    });
  }

  // Thief
  if (perks.thiefCrimeSuccessBonusPercent > 0) {
    badges.push({
      id: 'thief_success',
      label: 'نجاح السرقات',
      value: `+${perks.thiefCrimeSuccessBonusPercent}%`,
      color: 'text-orange-400 border-orange-500/40 bg-orange-950/30',
      description: 'رفع احتمالية نجاح الجرائم والسطو'
    });
  }
  if (perks.thiefDoubleLootPercent > 0) {
    badges.push({
      id: 'thief_loot',
      label: 'غنيمة مضاعفة',
      value: `${perks.thiefDoubleLootPercent}%`,
      color: 'text-amber-400 border-amber-500/40 bg-amber-950/30',
      description: 'فرصة الحصول على أضعاف أموال وذهب السطو'
    });
  }
  if (perks.thiefAlarmBypassPercent > 0) {
    badges.push({
      id: 'thief_stealth',
      label: 'تخفي الشبهات',
      value: `-${perks.thiefAlarmBypassPercent}%`,
      color: 'text-yellow-400 border-yellow-500/40 bg-yellow-950/30',
      description: 'تقليص نجوم وشبهات المداهمات الأمنية'
    });
  }
  if (perks.thiefCooldownReductionPercent > 0) {
    badges.push({
      id: 'thief_cooldown',
      label: 'تسريع السطو',
      value: `-${perks.thiefCooldownReductionPercent}%`,
      color: 'text-red-400 border-red-500/40 bg-red-950/30',
      description: 'تقليص فترات الانتظار بعد الجرائم'
    });
  }

  // Smuggler
  if (perks.smugglerTradeProfitBonusPercent > 0) {
    badges.push({
      id: 'smuggler_profit',
      label: 'أرباح التهريب',
      value: `+${perks.smugglerTradeProfitBonusPercent}%`,
      color: 'text-purple-400 border-purple-500/40 bg-purple-950/30',
      description: 'زيادة صافي عوائد مبيعات السوق السوداء'
    });
  }
  if (perks.smugglerTravelReductionPercent > 0) {
    badges.push({
      id: 'smuggler_travel',
      label: 'سرعة السفر',
      value: `-${perks.smugglerTravelReductionPercent}%`,
      color: 'text-violet-400 border-violet-500/40 bg-violet-950/30',
      description: 'تقليص زمن السفر الدولي والرحلات'
    });
  }
  if (perks.smugglerCustomsProtectionPercent > 0) {
    badges.push({
      id: 'smuggler_customs',
      label: 'تمويه الجمارك',
      value: `+${perks.smugglerCustomsProtectionPercent}%`,
      color: 'text-fuchsia-400 border-fuchsia-500/40 bg-fuchsia-950/30',
      description: 'حماية الممنوعات من التفتيش والمصادرة'
    });
  }

  // Boss
  if (perks.bossAttackBonusPercent > 0) {
    badges.push({
      id: 'boss_command',
      label: 'قوة الهجوم',
      value: `+${perks.bossAttackBonusPercent}%`,
      color: 'text-rose-400 border-rose-500/40 bg-rose-950/30',
      description: 'تعزيز قوة الاشتباكات والحراس'
    });
  }
  if (perks.bossReputationBonusPercent > 0) {
    badges.push({
      id: 'boss_rep',
      label: 'مضاعف السمعة',
      value: `+${perks.bossReputationBonusPercent}%`,
      color: 'text-amber-300 border-amber-500/40 bg-amber-950/30',
      description: 'كسب هيبة وسمعة إضافية من كل نشاط'
    });
  }
  if (perks.bossSpoilsBonusPercent > 0) {
    badges.push({
      id: 'boss_spoils',
      label: 'غنائم النصر',
      value: `+${perks.bossSpoilsBonusPercent}%`,
      color: 'text-red-500 border-red-500/40 bg-red-950/30',
      description: 'انتزاع غنائم كاش مضاعفة عند الفوز'
    });
  }
  if (perks.bossImmunityBailPercent > 0) {
    badges.push({
      id: 'boss_bail',
      label: 'تخفيض الكفالات',
      value: `-${perks.bossImmunityBailPercent}%`,
      color: 'text-teal-400 border-teal-500/40 bg-teal-950/30',
      description: 'تخفيض كفالات ورشاوى الخروج من السجن'
    });
  }

  // Criminal
  if (perks.crimAttackBonusPercent > 0) {
    badges.push({
      id: 'crim_iron_fist',
      label: 'القبضة الحديدية',
      value: `+${perks.crimAttackBonusPercent}%`,
      color: 'text-red-400 border-red-500/40 bg-red-950/30',
      description: 'قوة قتالية حاسمة ودفاع مباشر'
    });
  }
  if (perks.crimIntimidationDebuffPercent > 0) {
    badges.push({
      id: 'crim_intimidation',
      label: 'ترهيب الخصوم',
      value: `-${perks.crimIntimidationDebuffPercent}%`,
      color: 'text-zinc-200 border-zinc-600/40 bg-zinc-900',
      description: 'كسر دفاعات الخصم في بداية المعركة'
    });
  }
  if (perks.crimPrisonReductionPercent > 0) {
    badges.push({
      id: 'crim_prison',
      label: 'صلابة السجون',
      value: `-${perks.crimPrisonReductionPercent}%`,
      color: 'text-orange-300 border-orange-500/40 bg-orange-950/30',
      description: 'تقليص أوقات الحبس والعقوبات'
    });
  }
  if (perks.crimRecoverySpeedPercent > 0) {
    badges.push({
      id: 'crim_recovery',
      label: 'سرعة الاستشفاء',
      value: `+${perks.crimRecoverySpeedPercent}%`,
      color: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/30',
      description: 'استعادة سريعة للطاقة والصحة'
    });
  }

  return badges;
}
