import { DistrictTurf, TurfWarLog } from '../types/turfTypes';
import { UserProfile } from '../store/useAuthStore';
import { getActiveRolePerks } from '../lib/rolePerks';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  onSnapshot, 
  runTransaction, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { soundEngine } from './soundEngine';

export const INITIAL_TURF_DISTRICTS: DistrictTurf[] = [
  {
    id: 'karrada',
    name: 'حي الكرادة (شارع العرصات والفنادق)',
    nameEn: 'Al-Karrada Commercial Strip',
    subtitle: 'نوادي ليلية، فنادق راقية، ومطاعم كبار الشخصيات',
    description: 'شريان الحياة الترفيهي والتجاري في بغداد، يضم كبرى صالات الألعاب والشركات الاستثمارية ونقاط جمع الكاش.',
    image: 'https://images.unsplash.com/photo-1541971875076-8f970d573be6?q=80&w=1000&auto=format&fit=crop',
    controllerName: 'كارتل الكرادة الذهبي',
    controllerId: 'npc_syndicate_karrada',
    controllerType: 'npc_syndicate',
    controlPercent: 85,
    dailyRevenue: 320000,
    accumulatedTax: 160000,
    lastTaxCollected: Date.now() - 1000 * 60 * 60 * 12,
    defensePower: 8500,
    garrisonCount: 24,
    fortificationLevel: 3,
    businessesCount: 42,
    districtPerk: '+20% أرباح إضافية من كافة الشركات والممتلكات الاستثمارية',
    color: 'border-amber-500/50',
    accentColor: 'text-amber-400',
    status: 'peace'
  },
  {
    id: 'mansour',
    name: 'حي المنصور (المربع الدبلوماسي والمولات)',
    nameEn: 'Al-Mansour Luxury District',
    subtitle: 'معارض السيارات الفارهة والمقرات السرية المحصنة',
    description: 'منطقة الأثرياء وأصحاب النفوذ السياسي، مقرات حراسة مدججة وتداولات بالملايين يومياً.',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1000&auto=format&fit=crop',
    controllerName: 'عصابة النسر الأسود',
    controllerId: 'npc_syndicate_mansour',
    controllerType: 'npc_syndicate',
    controlPercent: 90,
    dailyRevenue: 450000,
    accumulatedTax: 280000,
    lastTaxCollected: Date.now() - 1000 * 60 * 60 * 15,
    defensePower: 12000,
    garrisonCount: 35,
    fortificationLevel: 4,
    businessesCount: 55,
    districtPerk: '-15% خصم على مشتريات السوق ومول المدينة الفاخر',
    color: 'border-blue-500/50',
    accentColor: 'text-blue-400',
    status: 'peace'
  },
  {
    id: 'bataween',
    name: 'عكد البتاوين (ممرات الظل وتجارة السلاح)',
    nameEn: 'Al-Bataween Alleys',
    subtitle: 'أزقة ضيقة، أوكار المافيا، وسوق البنادق المهربة',
    description: 'الملاذ الحصين للمجرمين والهاربين من العدالة، حيث تسري صفقات السلاح غير المرخص بعيداً عن أعين الشرطة.',
    image: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?q=80&w=1000&auto=format&fit=crop',
    controllerName: 'كتيبة الظل المسلحة',
    controllerId: 'npc_syndicate_bataween',
    controllerType: 'npc_syndicate',
    controlPercent: 75,
    dailyRevenue: 220000,
    accumulatedTax: 95000,
    lastTaxCollected: Date.now() - 1000 * 60 * 60 * 8,
    defensePower: 9200,
    garrisonCount: 28,
    fortificationLevel: 3,
    businessesCount: 30,
    districtPerk: '+25% قوة هجومية في كافة اشتباكات الشوارع',
    color: 'border-red-500/50',
    accentColor: 'text-red-400',
    status: 'contested'
  },
  {
    id: 'shorja',
    name: 'سوق الشورجة (قلب السيولة والتبادل النقدي)',
    nameEn: 'Al-Shorja Wholesale Hub',
    subtitle: 'أقدم أسواق العاصمة، خزائن السيولة ومكاتب الصرافة',
    description: 'أكبر مركز لتدوير الأموال النقدية والعملات الصعبة، حيث تُدار صفقات الاستيراد والتصدير والغسيل الضخم.',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1000&auto=format&fit=crop',
    controllerName: 'تحالف تجار الشورجة',
    controllerId: 'npc_syndicate_shorja',
    controllerType: 'npc_syndicate',
    controlPercent: 95,
    dailyRevenue: 520000,
    accumulatedTax: 390000,
    lastTaxCollected: Date.now() - 1000 * 60 * 60 * 18,
    defensePower: 10500,
    garrisonCount: 30,
    fortificationLevel: 4,
    businessesCount: 70,
    districtPerk: '-20% تخفيض مباشر على عمولة غسيل الأموال وتحويل الكاش',
    color: 'border-emerald-500/50',
    accentColor: 'text-emerald-400',
    status: 'peace'
  },
  {
    id: 'kadhimiya',
    name: 'حي الكاظمية (سوق الصاغة والذهب المهرب)',
    nameEn: 'Al-Kadhimiya Gold Bazaar',
    subtitle: 'محال الصاغة، المسكوكات النادرة، والسبائك غير المدموغة',
    description: 'المركز التاريخي لتجارة الذهب والمعادن الثمينة والتحف الأثرية، حراسة مشددة على مدار الساعة.',
    image: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?q=80&w=1000&auto=format&fit=crop',
    controllerName: 'نقابة صاغة الكاظمية',
    controllerId: 'npc_syndicate_kadhimiya',
    controllerType: 'npc_syndicate',
    controlPercent: 80,
    dailyRevenue: 340000,
    accumulatedTax: 180000,
    lastTaxCollected: Date.now() - 1000 * 60 * 60 * 10,
    defensePower: 7800,
    garrisonCount: 20,
    fortificationLevel: 3,
    businessesCount: 38,
    districtPerk: '+30% أرباح إضافية عند تداول سبائك الذهب في السوق السوداء',
    color: 'border-yellow-500/50',
    accentColor: 'text-yellow-400',
    status: 'peace'
  },
  {
    id: 'jadriya',
    name: 'حي الجادرية (فلل النخبة وضفاف دجلة)',
    nameEn: 'Al-Jadriya Riverside Fortresses',
    subtitle: 'فلل رئاسية محاطة بالأسوار وموانئ اليخوت النهرية',
    description: 'أكثر مناطق المدينة أماناً وتحصيناً، مساكن كبار القادة والمسؤولين مع أنظمة أمنية فائقة الحداثة.',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1000&auto=format&fit=crop',
    controllerName: 'لواء النخبة الرئاسي',
    controllerId: 'npc_syndicate_jadriya',
    controllerType: 'npc_syndicate',
    controlPercent: 92,
    dailyRevenue: 480000,
    accumulatedTax: 310000,
    lastTaxCollected: Date.now() - 1000 * 60 * 60 * 16,
    defensePower: 14500,
    garrisonCount: 40,
    fortificationLevel: 5,
    businessesCount: 45,
    districtPerk: '+35% دفاع عام وحصانة كاملة لمنازلك ضد اقتحامات الخصوم',
    color: 'border-purple-500/50',
    accentColor: 'text-purple-400',
    status: 'peace'
  },
  {
    id: 'old_karkh',
    name: 'الكرخ القديم (أرصفة التهريب النهري والمخازن)',
    nameEn: 'Old Karkh Riverfront',
    subtitle: 'زوارق ليلية، مستودعات بضائع، وممرات عبر دجلة',
    description: 'منطقة لوجستية استراتيجية للتهريب الليلي عبر النهر، تفلت بسهولة من نقاط التفتيش البرية.',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1000&auto=format&fit=crop',
    controllerName: 'مافيا الزوارق النهرية',
    controllerId: 'npc_syndicate_karkh',
    controllerType: 'npc_syndicate',
    controlPercent: 70,
    dailyRevenue: 280000,
    accumulatedTax: 120000,
    lastTaxCollected: Date.now() - 1000 * 60 * 60 * 7,
    defensePower: 7000,
    garrisonCount: 18,
    fortificationLevel: 2,
    businessesCount: 25,
    districtPerk: '+25% سعة حمولة إضافية للبضائع المهربة والممنوعات',
    color: 'border-cyan-500/50',
    accentColor: 'text-cyan-400',
    status: 'contested'
  },
  {
    id: 'rusafa',
    name: 'حي الرصافة (ساحات النقل والأسواق الشعبية)',
    nameEn: 'Al-Rusafa Transit Hub',
    subtitle: 'محطات سيارات الأجرة، كراجات شحن، وشبكات نقل عابرة',
    description: 'العقدة المركزية لحركة المرور والشحن السريع، وتأمين تنقلات الأفراد والأسلحة بسرية تامة.',
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1000&auto=format&fit=crop',
    controllerName: 'اتحاد نقابات النقل السرية',
    controllerId: 'npc_syndicate_rusafa',
    controllerType: 'npc_syndicate',
    controlPercent: 82,
    dailyRevenue: 250000,
    accumulatedTax: 140000,
    lastTaxCollected: Date.now() - 1000 * 60 * 60 * 11,
    defensePower: 6800,
    garrisonCount: 20,
    fortificationLevel: 2,
    businessesCount: 32,
    districtPerk: '-25% تسريع أوقات السفر الدولي وتخفيض فترات انتظار العمليات',
    color: 'border-orange-500/50',
    accentColor: 'text-orange-400',
    status: 'peace'
  }
];

export class TurfService {
  // حساب الضرائب المتراكمة الحية بناءً على الوقت المنقضي
  public static calculateLiveAccumulatedTax(district: DistrictTurf): number {
    const now = Date.now();
    const hoursElapsed = Math.max(0, (now - district.lastTaxCollected) / (1000 * 60 * 60));
    const hourlyRate = district.dailyRevenue / 24;
    const addedTax = Math.floor(hoursElapsed * hourlyRate);
    return Math.min(district.dailyRevenue * 2, district.accumulatedTax + addedTax);
  }

  // شن هجوم حرب نفوذ على الحي (Launch Turf War Attack)
  public static async launchTurfWar(
    district: DistrictTurf, 
    profile: UserProfile,
    playerCombatPower: number
  ): Promise<{ success: boolean; damageDealt: number; controlGained: number; lootWon: number; newControlPercent: number; isTakeover: boolean }> {
    if (!profile) throw new Error('يجب تسجيل الدخول أولاً');
    
    // Check if player is already the controller
    const isPlayerController = district.controllerId === profile.uid || (profile.gangId && district.controllerId === profile.gangId);
    if (isPlayerController && district.controlPercent >= 100) {
      toast.info('أنت تفرض سيطرتك المطلقة 100% على هذا الحي بالفعل!');
      return { success: false, damageDealt: 0, controlGained: 0, lootWon: 0, newControlPercent: 100, isTakeover: false };
    }

    const perks = getActiveRolePerks(profile);
    // Multiply power with role perks
    let effectivePower = playerCombatPower;
    if (perks.bossAttackBonusPercent > 0) {
      effectivePower = Math.floor(effectivePower * (1 + (perks.bossAttackBonusPercent / 100)));
    }
    if (perks.crimAttackBonusPercent > 0) {
      effectivePower = Math.floor(effectivePower * (1 + (perks.crimAttackBonusPercent / 100)));
    }

    // Power ratio vs garrison defense
    const defense = district.defensePower;
    const powerRatio = effectivePower / Math.max(1, defense);
    const randomRoll = Math.random() * 0.4 + 0.8; // 0.8 to 1.2
    const battleScore = powerRatio * randomRoll;

    const isWin = battleScore >= 0.75; // Attacker wins if they achieve good combat score

    if (!isWin) {
      toast.error(`فشل الهجوم على ${district.name}! دفاعات الحي وحراسه صدوا هجومك وألحقوا بك خسائر.`);
      return {
        success: false,
        damageDealt: Math.floor(effectivePower * 0.3),
        controlGained: 0,
        lootWon: 0,
        newControlPercent: district.controlPercent,
        isTakeover: false
      };
    }

    // Win calculation
    const controlGained = Math.min(35, Math.floor(battleScore * 25));
    const accumulatedTax = this.calculateLiveAccumulatedTax(district);
    let lootWon = Math.floor(accumulatedTax * 0.6); // Loot 60% of current accumulated protection money
    
    // Boss Spoils bonus
    if (perks.bossSpoilsBonusPercent > 0) {
      lootWon = Math.floor(lootWon * (1 + (perks.bossSpoilsBonusPercent / 100)));
    }

    let newControlPercent = district.controlPercent;
    let isTakeover = false;

    if (isPlayerController) {
      // Re-enforcing control
      newControlPercent = Math.min(100, district.controlPercent + controlGained);
    } else {
      // Attacking other syndicate
      if (district.controlPercent - controlGained <= 20) {
        // Complete Takeover!
        isTakeover = true;
        newControlPercent = 50 + controlGained;
      } else {
        newControlPercent = district.controlPercent - controlGained;
      }
    }

    try {
      const turfRef = doc(db, 'turf_districts', district.id);
      const userRef = doc(db, 'users', profile.uid);

      const updates: any = {
        accumulatedTax: Math.max(0, accumulatedTax - lootWon),
        lastTaxCollected: Date.now()
      };

      if (isTakeover) {
        updates.controllerId = profile.gangId || profile.uid;
        updates.controllerName = profile.gangName || profile.displayName || 'عصابة جديدة';
        updates.controllerType = profile.gangId ? 'gang' : 'player';
        updates.controlPercent = Math.min(100, newControlPercent);
        updates.status = 'peace';
      } else if (!isPlayerController) {
        updates.controlPercent = Math.max(10, newControlPercent);
        updates.status = 'contested';
      } else {
        updates.controlPercent = Math.min(100, newControlPercent);
      }

      await setDoc(turfRef, {
        ...district,
        ...updates
      }, { merge: true });

      // Award player with loot and reputation
      let repAward = 400;
      if (perks.bossReputationBonusPercent > 0) {
        repAward = Math.floor(repAward * (1 + (perks.bossReputationBonusPercent / 100)));
      }

      await updateDoc(userRef, {
        dirtyMoney: increment(lootWon),
        reputation: increment(repAward)
      });

      if (isTakeover) {
        toast.success(`🎉 انتصار تاريخي! فرضت سيطرتك الكاملة على ${district.name} وأصبحت الزعيم الحاكم للحي!`);
      } else {
        toast.success(`انتصرت في حرب الشوارع! غنمت ${lootWon.toLocaleString()} كاش ونزعت ${controlGained}% من نفوذ الخصم! ⚔️`);
      }

      return {
        success: true,
        damageDealt: Math.floor(effectivePower * 0.8),
        controlGained,
        lootWon,
        newControlPercent,
        isTakeover
      };
    } catch (e: any) {
      console.error(e);
      toast.error('حدث خطأ أثناء معالجة نتيجة المعركة');
      return { success: false, damageDealt: 0, controlGained: 0, lootWon: 0, newControlPercent: district.controlPercent, isTakeover: false };
    }
  }

  // تحصيل إتاوات وأموال حماية الحي
  public static async collectDistrictTax(district: DistrictTurf, profile: UserProfile): Promise<number> {
    if (!profile) return 0;
    const isController = district.controllerId === profile.uid || (profile.gangId && district.controllerId === profile.gangId);
    if (!isController) {
      toast.error('لست الزعيم المسيطر على هذا الحي لتحصيل إتاواته!');
      return 0;
    }

    try {
      const turfRef = doc(db, 'turf_districts', district.id);
      const userRef = doc(db, 'users', profile.uid);

      let finalTax = 0;

      await runTransaction(db, async (transaction) => {
        const turfSnap = await transaction.get(turfRef);
        const currentData = turfSnap.exists() ? (turfSnap.data() as DistrictTurf) : district;

        const now = Date.now();
        const lastCollected = currentData.lastTaxCollected || district.lastTaxCollected;
        const hoursElapsed = Math.max(0, (now - lastCollected) / (1000 * 60 * 60));
        const dailyRev = currentData.dailyRevenue || district.dailyRevenue;
        const hourlyRate = dailyRev / 24;
        const addedTax = Math.floor(hoursElapsed * hourlyRate);
        const accumulated = currentData.accumulatedTax ?? district.accumulatedTax;
        const availableTax = Math.min(dailyRev * 2, accumulated + addedTax);

        if (availableTax < 5000) {
          throw new Error('الإتاوات المجمعة حالياً قليلة جداً، انتظر بعض الوقت لجمع مبالغ محرزة.');
        }

        const perks = getActiveRolePerks(profile);
        finalTax = availableTax;
        if (perks.traderProfitBonusPercent > 0) {
          finalTax = Math.floor(finalTax * (1 + (perks.traderProfitBonusPercent / 100)));
        }

        transaction.set(turfRef, {
          ...district,
          ...currentData,
          accumulatedTax: 0,
          lastTaxCollected: now
        }, { merge: true });

        transaction.update(userRef, {
          cleanMoney: increment(finalTax)
        });
      });

      const perks = getActiveRolePerks(profile);
      const bonusText = perks.traderProfitBonusPercent > 0 ? ` (شامل +${perks.traderProfitBonusPercent}% حنكة التاجر 📈)` : '';
      soundEngine.playCashSound();
      toast.success(`تم تحصيل ${finalTax.toLocaleString()} كاش نظيف من إتاوات وحماية ${district.name}! 💰${bonusText}`);
      return finalTax;
    } catch (e: any) {
      toast.error(e.message || 'فشل في تحصيل الإتاوات');
      return 0;
    }
  }

  // ترقية دفاعات وحراس الحي (Fortify Garrison)
  public static async fortifyDistrict(district: DistrictTurf, profile: UserProfile): Promise<boolean> {
    if (!profile) return false;
    const isController = district.controllerId === profile.uid || (profile.gangId && district.controllerId === profile.gangId);
    if (!isController) {
      toast.error('يجب أن تكون المسيطر على الحي لتطوير دفاعاته!');
      return false;
    }

    if (district.fortificationLevel >= 5) {
      toast.info('تحصينات هذا الحي بلغت أقصى مستوى ممكن (المستوى 5)!');
      return false;
    }

    const upgradeCost = (district.fortificationLevel + 1) * 200000;
    if ((profile.cleanMoney || 0) < upgradeCost) {
      toast.error(`تحتاج إلى ${upgradeCost.toLocaleString()} كاش نظيف لترقية حراسة وتحصينات الحي!`);
      return false;
    }

    try {
      const userRef = doc(db, 'users', profile.uid);
      const turfRef = doc(db, 'turf_districts', district.id);

      await updateDoc(userRef, {
        cleanMoney: increment(-upgradeCost)
      });

      const newLevel = district.fortificationLevel + 1;
      const newGarrison = district.garrisonCount + 10;
      const newDefense = Math.floor(district.defensePower * 1.3);

      await setDoc(turfRef, {
        ...district,
        fortificationLevel: newLevel,
        garrisonCount: newGarrison,
        defensePower: newDefense
      }, { merge: true });

      toast.success(`تمت ترقية تحصينات ${district.name} إلى المستوى ${newLevel}! زادت قوة الحماية إلى ${newDefense.toLocaleString()} درع 🛡️`);
      return true;
    } catch (e) {
      toast.error('حدث خطأ أثناء ترقية التحصينات');
      return false;
    }
  }
}
