import { doc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../store/useAuthStore';
import { PoliceRaidEvent } from '../types/npcTypes';
import { IRAQI_POLICE_BARKS } from './npcDialogues';
import { MARKET_ITEMS } from '../lib/items';

export interface ContrabandItemResult {
  id: string;
  name: string;
  count: number;
  category: 'drugs' | 'weapons' | 'tools';
  estimatedFine: number;
}

export class PoliceEngine {
  // فحص المخزون الفعلي للاعب وتحديد العناصر المحظورة
  public static scanPlayerContraband(profile: UserProfile): ContrabandItemResult[] {
    const contraband: ContrabandItemResult[] = [];
    if (!profile.inventory) return contraband;

    const hasWeaponLicense = !!(profile.documents?.weapon || profile.documents?.weaponLicense);

    // 1. المخدرات والسموم (ممنوعة بالكامل دائماً)
    if (profile.inventory.drugs) {
      Object.entries(profile.inventory.drugs).forEach(([drugId, count]) => {
        if (count > 0) {
          const itemMeta = MARKET_ITEMS.drugs.find(d => d.id === drugId);
          const name = itemMeta ? itemMeta.name : `مادة محظورة (${drugId})`;
          const unitFine = itemMeta ? Math.floor(itemMeta.price * 1.5) : 3000;
          contraband.push({
            id: drugId,
            name,
            count,
            category: 'drugs',
            estimatedFine: unitFine * count
          });
        }
      });
    }

    // 2. الأسلحة غير المرخصة (إذا لم يكن يحمل رخصة سلاح)
    if (!hasWeaponLicense && profile.inventory.weapons) {
      Object.entries(profile.inventory.weapons).forEach(([weaponId, count]) => {
        if (count > 0) {
          const itemMeta = MARKET_ITEMS.weapons.find(w => w.id === weaponId);
          const name = itemMeta ? itemMeta.name : `سلاح ناري غير مرخص (${weaponId})`;
          const unitFine = itemMeta ? Math.floor(itemMeta.price * 0.8) : 5000;
          contraband.push({
            id: weaponId,
            name,
            count,
            category: 'weapons',
            estimatedFine: unitFine * count
          });
        }
      });
    }

    // 3. أدوات السطو الممنوعة (Basic Lockpick / Vault Drill)
    if (profile.inventory.tools) {
      Object.entries(profile.inventory.tools).forEach(([toolId, count]) => {
        if (count > 0 && (toolId === 't1' || toolId === 't3')) {
          const itemMeta = MARKET_ITEMS.tools.find(t => t.id === toolId);
          const name = itemMeta ? itemMeta.name : `أداة سطو (${toolId})`;
          contraband.push({
            id: toolId,
            name,
            count,
            category: 'tools',
            estimatedFine: 2000 * count
          });
        }
      });
    }

    return contraband;
  }

  // حساب درجة الشبهة التراكمية (0 - 100)
  public static calculateSuspicion(profile: UserProfile, contraband: ContrabandItemResult[]): number {
    let score = 0;
    
    // نجوم المطلوبية الحالية
    const stars = profile.wantedStars || (profile.wanted ? 2 : 0);
    score += stars * 18;

    // كمية الممنوعات الموجودة
    const totalContrabandCount = contraband.reduce((acc, curr) => acc + curr.count, 0);
    score += Math.min(totalContrabandCount * 8, 40);

    // سجل الجرائم
    if (profile.crimes) {
      score += Math.min((profile.crimes.theft + profile.crimes.kills) * 2, 20);
    }

    // Role skill perks: Boss Immunity, Thief Alarm Bypass, Smuggler Customs Evasion
    const bossImmunity = (profile.roleSkills?.skills?.['boss_immunity'] || 0) * 8;
    const thiefBypass = (profile.roleSkills?.skills?.['thief_alarm_bypass'] || 0) * 6;
    const smugglerCustoms = (profile.roleSkills?.skills?.['smuggler_customs_evasion'] || 0) * 6;
    score = Math.max(0, score - (bossImmunity + thiefBypass + smugglerCustoms));

    return Math.min(Math.max(score, 5), 100);
  }

  // توليد حدث مداهمة أمنية مفاجئة
  public static generateRaidEvent(profile: UserProfile): PoliceRaidEvent {
    const contraband = this.scanPlayerContraband(profile);
    const suspicion = this.calculateSuspicion(profile, contraband);

    const officers = [
      'المقدم رائد الساعدي - قوى الأمن الداخلي',
      'الرائد دريد الكرخي - فوج التدخل السريع',
      'النقيب وسام التميمي - مكافحة الجريمة المنظمة',
      'الملازم أول صفاء الربيعي - دوريات النجدة',
      'العقيد هيثم الزبيدي - جهاز الأمن الوطني'
    ];
    const officerName = officers[Math.floor(Math.random() * officers.length)];

    const totalFine = contraband.reduce((acc, c) => acc + c.estimatedFine, 0);
    const stars = profile.wantedStars || (profile.wanted ? 1 : 0);
    const requiredBribe = Math.max(50000, Math.floor((stars * 75000) + (totalFine * 0.4)));

    const reasons = [
      'إخبارية عاجلة وبلاغ عن نشاطات مشبوهة في هذا الزقاق!',
      'تطويق أمني مفاجئ للاشتباه بوجود أسلحة ومواد مهربة!',
      'مداهمة تكتيكية لملاحقة المطلوبين قضائياً في المنطقة!',
      'نصب سيطرة مفاجئة وتفتيش أمني دقيق للأزقة الخلفية!'
    ];
    const reason = reasons[Math.floor(Math.random() * reasons.length)];

    return {
      id: `raid_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      reason,
      officerName,
      detectedContraband: contraband,
      totalFine,
      requiredBribe,
      suspicionLevel: suspicion
    };
  }

  // تنفيذ المصادرة الفعلية للممنوعات وتحديث قاعدة بيانات اللاعب
  public static async executeConfiscation(
    profile: UserProfile, 
    raid: PoliceRaidEvent
  ): Promise<{ success: boolean; message: string; confiscatedCount: number; newStars: number }> {
    try {
      const userRef = doc(db, 'users', profile.uid);
      const updatedInventory = { ...profile.inventory };
      let confiscatedCount = 0;

      // تفريغ المخدرات المكتشفة
      if (updatedInventory.drugs) {
        const newDrugs = { ...updatedInventory.drugs };
        raid.detectedContraband.filter(c => c.category === 'drugs').forEach(c => {
          confiscatedCount += c.count;
          delete newDrugs[c.id];
        });
        updatedInventory.drugs = newDrugs;
      }

      // تفريغ الأسلحة غير المرخصة
      if (updatedInventory.weapons) {
        const newWeapons = { ...updatedInventory.weapons };
        raid.detectedContraband.filter(c => c.category === 'weapons').forEach(c => {
          confiscatedCount += c.count;
          delete newWeapons[c.id];
        });
        updatedInventory.weapons = newWeapons;
      }

      // تفريغ أدوات السطو الممنوعة
      if (updatedInventory.tools) {
        const newTools = { ...updatedInventory.tools };
        raid.detectedContraband.filter(c => c.category === 'tools').forEach(c => {
          confiscatedCount += c.count;
          delete newTools[c.id];
        });
        updatedInventory.tools = newTools;
      }

      // حساب رفع النجوم والغرامة
      const currentStars = profile.wantedStars || 0;
      let newStars = currentStars;
      if (confiscatedCount > 0) {
        newStars = Math.min(5, Math.max(currentStars + 1, Math.min(5, Math.ceil(confiscatedCount / 2) + 1)));
      }

      // خصم الغرامة بأمان من رصيد الكاش أو البنك
      let fineDeduction = 0;
      if (raid.totalFine > 0) {
        const availableCash = profile.cleanMoney || 0;
        fineDeduction = Math.min(availableCash, raid.totalFine);
      }

      const updates: any = {
        inventory: updatedInventory,
        wantedStars: newStars,
        wanted: newStars > 0
      };

      if (fineDeduction > 0) {
        updates.cleanMoney = increment(-fineDeduction);
      }

      await updateDoc(userRef, updates);

      const msg = confiscatedCount > 0
        ? `تمت مصادرة ${confiscatedCount} قطعة محظورة وفرض غرامة بقيمة ${fineDeduction.toLocaleString()} دولار!`
        : 'تم التفتيش ومخزنك نظيف بالكامل، تم إخلاء سبيلك دون أي مخالفة!';

      return {
        success: true,
        message: msg,
        confiscatedCount,
        newStars
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      return {
        success: false,
        message: 'حدث خطأ أثناء إجراءات المصادرة',
        confiscatedCount: 0,
        newStars: profile.wantedStars || 0
      };
    }
  }

  // دفع الرشوة للضابط
  public static async payBribe(profile: UserProfile, raid: PoliceRaidEvent): Promise<{ success: boolean; message: string }> {
    const cost = raid.requiredBribe;
    const available = profile.cleanMoney || 0;

    if (available < cost) {
      return { success: false, message: 'ليس لديك أموال نظيفة كافية لدفع الرشوة المطلوبة للضابط!' };
    }

    try {
      const userRef = doc(db, 'users', profile.uid);
      const currentStars = profile.wantedStars || 0;
      const newStars = Math.max(0, currentStars - 1);

      await updateDoc(userRef, {
        cleanMoney: increment(-cost),
        wantedStars: newStars,
        wanted: newStars > 0
      });

      const acceptBark = IRAQI_POLICE_BARKS.bribeAccepted[Math.floor(Math.random() * IRAQI_POLICE_BARKS.bribeAccepted.length)];
      return {
        success: true,
        message: `تم دفع ${cost.toLocaleString()} دولار رشوة للضابط! "${acceptBark}"`
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      return { success: false, message: 'فشلت معالجة الرشوة' };
    }
  }

  // محاولة الشردة والهروب
  public static async attemptFlee(profile: UserProfile): Promise<{ success: boolean; message: string; damageTaken?: number; jailed?: boolean }> {
    const gymSpeed = profile.gymStats?.speed || 10;
    const levelBonus = (profile.level || 1) * 0.5;
    const fleeChance = Math.min(75, Math.max(25, 40 + (gymSpeed * 0.5) + levelBonus));

    const roll = Math.random() * 100;
    const userRef = doc(db, 'users', profile.uid);

    if (roll < fleeChance) {
      // نجاح الهروب
      return {
        success: true,
        message: 'نجحت بالشردة والقفز عبر الأسطح والأزقة الضيقة! أضعت الدورية بالكامل!'
      };
    } else {
      // فشل الهروب: إطلاق نار ورصاص مطاطي وضرر جسدي
      const damage = Math.floor(Math.random() * 25) + 25;
      const currentHealth = profile.health || 100;
      const newHealth = Math.max(1, currentHealth - damage);
      const currentStars = profile.wantedStars || 0;
      const newStars = Math.min(5, currentStars + 2);

      await updateDoc(userRef, {
        health: newHealth,
        wantedStars: newStars,
        wanted: true
      });

      return {
        success: false,
        message: `فشلت في الهروب! أطلقت الشرطة الرصاص المطاطي وأصابتك بضرر ${damage} HP، وارتفعت نجوم المطلوبية إلى ${newStars}!`,
        damageTaken: damage
      };
    }
  }

  // اعتقال ونقل اللاعب إلى السجن المركزي
  public static async arrestAndImprison(profile: UserProfile, minutes: number = 10, reason: string = 'مقاومة السلطات وحيازة ممنوعات'): Promise<boolean> {
    try {
      const userRef = doc(db, 'users', profile.uid);
      const jailDuration = minutes * 60 * 1000;
      const jailEnd = Date.now() + jailDuration;

      await updateDoc(userRef, {
        isImprisoned: true,
        jailTimeEnd: jailEnd,
        wantedStars: 0,
        wanted: false
      });

      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      return false;
    }
  }
}
