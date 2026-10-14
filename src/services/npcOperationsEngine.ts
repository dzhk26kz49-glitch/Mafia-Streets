import { 
  NPCWorkMission, 
  DispatchMissionType, 
  NPCPartnership, 
  PvPOperation, 
  PvPOperationType, 
  HeistPlan, 
  ActiveHeistCrew, 
  HeistTier, 
  UndergroundPrisonInmate, 
  UndergroundSkill 
} from '../types/npcExpandedTypes';
import { NPCCharacter } from '../types/npcTypes';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, increment, limit, query } from 'firebase/firestore';

// خطط السطو الكبرى الثلاثة
export const HEIST_PLANS: HeistPlan[] = [
  {
    id: 'jewelry',
    title: 'سطو على معرض مجوهرات وصاغة الكرادة',
    subtitle: 'عملية خاطفة لسرقة سبائك ذهبية وأطقم ألماس بلجيكي',
    location: 'حي الكرادة والعرصات',
    riskLevel: 'medium',
    baseLootMin: 350000,
    baseLootMax: 750000,
    prepCost: 50000,
    requiredRoles: [
      { roleId: 'leader', roleName: 'قائد الاقتحام والسيطرة', description: 'يقتحم المحل ويسيطر على الحراس', recommendedPersonalities: ['aggressive', 'rebel'] },
      { roleId: 'driver', roleName: 'سائق الهروب السريع', description: 'تأمين مركبة سريعة وطريق خروج آمن', recommendedPersonalities: ['worker', 'social'] },
      { roleId: 'stealth', roleName: 'خبير تفكيك أجهزة الإنذار', description: 'تعطيل كاميرات المراقبة وأقفال الخزائن', recommendedPersonalities: ['poor', 'thief', 'cautious'] }
    ]
  },
  {
    id: 'armored_truck',
    title: 'اعتراض شاحنة البنك المركزي المصفحة',
    subtitle: 'كمين محكم في طريق سريع للاستيلاء على سيولة نقدية ضخمة',
    location: 'جسر الجادرية السريع',
    riskLevel: 'high',
    baseLootMin: 1200000,
    baseLootMax: 2800000,
    prepCost: 150000,
    requiredRoles: [
      { roleId: 'leader', roleName: 'قائد الكمين الناري', description: 'إيقاف الشاحنة بقوة السلاح وإخضاع الحراسة', recommendedPersonalities: ['aggressive'] },
      { roleId: 'driver', roleName: 'سائق شاحنة الهروب الثقيل', description: 'تجاوز حواجز الشرطة والمفارز', recommendedPersonalities: ['worker'] },
      { roleId: 'stealth', roleName: 'خبير تشويش الإشارات اللاسلكية', description: 'قطع اتصالات الدورية مع غرفة العمليات', recommendedPersonalities: ['poor', 'peaceful'] },
      { roleId: 'financier', roleName: 'الممول ومخطط المسار السري', description: 'توفير التجهيزات الثقيلة وشراء الصمت', recommendedPersonalities: ['wealthy'] }
    ]
  },
  {
    id: 'black_market_vault',
    title: 'اقتحام الخزينة المركزية لسوق الشورجة',
    subtitle: 'أعظم عملية سطو في تاريخ المدينة، ملايين الدولارات والسبائك',
    location: 'سراديب سوق الشورجة القديم',
    riskLevel: 'extreme',
    baseLootMin: 4500000,
    baseLootMax: 9000000,
    prepCost: 400000,
    requiredRoles: [
      { roleId: 'leader', roleName: 'زعيم العملية الميدانية', description: 'قيادة الطاقم وإدارة المواجهة الحاسمة', recommendedPersonalities: ['aggressive'] },
      { roleId: 'driver', roleName: 'خبير القوارب والمسارات النهرية', description: 'الهروب عبر نهر دجلة تحت جنح الظلام', recommendedPersonalities: ['worker'] },
      { roleId: 'stealth', roleName: 'عين الأزقة وخبير المفاتيح', description: 'فتح الأبواب الفولاذية دون إطلاق جرس الإنذار', recommendedPersonalities: ['poor', 'thief'] },
      { roleId: 'financier', roleName: 'قرش التبييض والتصريف', description: 'تصريف الغنائم والسبائك فوراً إلى كاش نقي', recommendedPersonalities: ['wealthy'] }
    ]
  }
];

// المشاريع الاستثمارية المخصصة للشخصيات الـ 10
export const DEFAULT_NPC_BUSINESSES: Record<string, { name: string; type: string; baseHourly: number; bonusText: string }> = {
  npc_male_poor: { name: 'كشك شاي البتاوين المتنقل', type: 'ضيافة وأغذية شعبية', baseHourly: 8000, bonusText: 'تدفق كاش يومي هادئ وشبكة معلومات أزقة' },
  npc_male_wealthy: { name: 'شركة الصرافة والمعادن الثمينة', type: 'استثمار مالي وتداول ذهب', baseHourly: 65000, bonusText: 'أرباح مليونية وسيولة نقدية ضخمة' },
  npc_male_regular: { name: 'كراج الرشيد التكتيكي للصيانة', type: 'خدمات ميكانيك وتعديل سيارات', baseHourly: 22000, bonusText: 'عائد مستقر وصيانة مجانية للسيارات' },
  npc_male_aggressive: { name: 'مكتب قبضايا الحراسة المسلحة', type: 'أمن شوارع وحماية تكتيكية', baseHourly: 35000, bonusText: 'عوائد إتاوات حماية وردع للمداهمات' },
  npc_male_natural: { name: 'مقهى القشلة التراثي', type: 'سياحة ومشروبات تراثية', baseHourly: 18000, bonusText: 'عائد مستمر وخفض دائم لدرجة الشبهة' },
  npc_female_poor: { name: 'مخبز التنور البغدادي الأصيل', type: 'مخبوزات ومؤونة غذائية', baseHourly: 9500, bonusText: 'إيراد يومي بركة ومؤونة صحية مجانية' },
  npc_female_wealthy: { name: 'معرض الألماس والمجوهرات الملكي', type: 'مقتنيات فاخرة واستيراد', baseHourly: 72000, bonusText: 'أعلى نسبة أرباح نقدية وأرصدة ذهبية' },
  npc_female_regular: { name: 'مكتب التدقيق المحاسبي والضرائب', type: 'خدمات محاسبة وتبييض', baseHourly: 25000, bonusText: 'تخفيض كفالات السجن وتدقيق عالي الدقة' },
  npc_female_aggressive: { name: 'فرقة التدخل السريع والقناصة', type: 'حماية شخصية ومطاردات', baseHourly: 38000, bonusText: 'دفاع ناري ضد الخصوم وسيطرة على الشارع' },
  npc_female_natural: { name: 'صيدلية بلسم الحارة للطوارئ', type: 'أدوية ومستلزمات علاجية', baseHourly: 20000, bonusText: 'عائد طبي وإمداد إسعافات سريعة للجروح' }
};

// شجرة المهارات الافتراضية
export const DEFAULT_UNDERGROUND_SKILLS: UndergroundSkill[] = [
  {
    id: 'skill_logistics',
    name: 'مهارة الشحن واللوجستيات',
    description: 'تسريع إنجاز مهام النقل والشحن وزيادة أرباح التوصيل بنسبة 15% لكل مستوى.',
    level: 1,
    maxLevel: 5,
    costPerLevel: 75000,
    iconName: 'Package',
    category: 'logistics',
    effectDescription: 'زيادة سرعة الشحن بنسبة 10% وأرباح +15%'
  },
  {
    id: 'skill_heists',
    name: 'مهارة الاحتراف والسطو',
    description: 'رفع نسبة نجاح عمليات السطو بنسبة 12% وتخفيض فرصة الاعتقال أو المداهمة.',
    level: 1,
    maxLevel: 5,
    costPerLevel: 120000,
    iconName: 'Swords',
    category: 'heists',
    effectDescription: 'فرصة نجاح السطو +12% وحصة إضافية +20%'
  },
  {
    id: 'skill_negotiation',
    name: 'مهارة المفاوض المالي',
    description: 'رفع عائد الشراكات الاستثمارية بنسبة 20% وتخفيض تكلفة كفالات السجن بنسبة 15%.',
    level: 1,
    maxLevel: 5,
    costPerLevel: 90000,
    iconName: 'HandCoins',
    category: 'negotiation',
    effectDescription: 'أرباح الشراكات +20% وتخفيض كفالات السجن -15%'
  },
  {
    id: 'skill_combat',
    name: 'مهارة حماية الشوارع والنزال',
    description: 'زيادة قوة ضربات العراك مع الـ NPCs والخصوم، وزيادة امتصاص درع الحماية.',
    level: 1,
    maxLevel: 5,
    costPerLevel: 80000,
    iconName: 'Shield',
    category: 'combat',
    effectDescription: 'ضرر الضربات +15 نقطة وامتصاص ضرر +10%'
  },
  {
    id: 'skill_stealth',
    name: 'مهارة التخفي وتضليل الشرطة',
    description: 'تقليل وتيرة صعود نجوم المطلوبية وتشتيت مفارز التفتيش الأمني ومحاصرة الشبهة.',
    level: 1,
    maxLevel: 5,
    costPerLevel: 110000,
    iconName: 'Eye',
    category: 'stealth',
    effectDescription: 'تخفيض الشبهة بنسبة 25% وتسهيل تهريب السجناء'
  }
];

export class NPCOperationsEngine {
  // ================= 1. إدارة مهام الشحن والعمل (Work Dispatch) =================
  public static getMissions(): NPCWorkMission[] {
    try {
      const data = localStorage.getItem('underground_npc_missions');
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn(e);
    }
    return [];
  }

  public static saveMissions(missions: NPCWorkMission[]): void {
    try {
      localStorage.setItem('underground_npc_missions', JSON.stringify(missions));
    } catch (e) {
      console.warn(e);
    }
  }

  public static startMission(
    npc: NPCCharacter,
    type: DispatchMissionType,
    skills: UndergroundSkill[]
  ): { success: boolean; message: string; mission?: NPCWorkMission } {
    const existing = this.getMissions();
    const isBusy = existing.some(m => m.assignedNpcId === npc.id && m.status === 'in_progress');
    if (isBusy) {
      return { success: false, message: `${npc.name} منشغل حالياً بمهمة أخرى في أزقة المدينة!` };
    }

    // تعديل بناءً على مهارة الشحن
    const logSkill = skills.find(s => s.id === 'skill_logistics')?.level || 1;
    const durationBonus = 1 - (logSkill * 0.08); // تقليل وقت المهمة
    const rewardMultiplier = 1 + (logSkill * 0.15); // زيادة الأرباح

    let title = '';
    let description = '';
    let baseDuration = 60; // 60 ثانية للتفاعل الحي الممتع
    let baseReward = 85000;
    let baseSuccess = 85;
    let baseRisk = 15;
    let cost = 10000;

    switch (type) {
      case 'cargo_shipping':
        title = `شحن ونقل طرد سري عبر الأزقة`;
        description = `تكليف ${npc.name} بنقل شحنة بضائع حساسة متفادياً دوريات التفتيش إلى الميناء.`;
        baseDuration = 50;
        baseReward = 95000;
        cost = 15000;
        if (npc.personality === 'poor' || npc.personality === 'cautious') baseSuccess += 10;
        break;

      case 'rent_collection':
        title = `تحصيل إيجارات وأموال السوق`;
        description = `التجول في سوق الشورجة والكرخ لجمع حصص الإيجار والأرباح المتأخرة من التجار.`;
        baseDuration = 70;
        baseReward = 160000;
        cost = 25000;
        if (npc.personality === 'wealthy' || npc.personality === 'aggressive') baseSuccess += 10;
        break;

      case 'police_scout':
        title = `رصد تحركات دوريات الشرطة`;
        description = `مراقبة نقاط التفتيش وسيارات النجدة لتأمين مسارات الهروب وتخفيض الشبهة.`;
        baseDuration = 45;
        baseReward = 65000;
        cost = 10000;
        baseRisk = 5;
        if (npc.personality === 'peaceful' || npc.personality === 'poor') baseSuccess += 12;
        break;

      case 'warehouse_guard':
        title = `تأمين وحراسة مستودعات البضائع`;
        description = `حراسة مخازن اللاعب من اللصوص والمداهمات وردع أي محاولة سطو.`;
        baseDuration = 90;
        baseReward = 210000;
        cost = 35000;
        if (npc.personality === 'aggressive' || npc.personality === 'worker') baseSuccess += 12;
        break;
    }

    const durationSeconds = Math.max(25, Math.round(baseDuration * durationBonus));
    const rewardCash = Math.round(baseReward * rewardMultiplier);

    const newMission: NPCWorkMission = {
      id: `mission_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      title,
      description,
      assignedNpcId: npc.id,
      assignedNpcName: npc.name,
      assignedNpcImage: npc.image,
      startTime: Date.now(),
      durationSeconds,
      rewardCash,
      rewardReputation: 25,
      successRate: Math.min(95, baseSuccess),
      riskOfArrest: Math.max(5, baseRisk),
      cost,
      status: 'in_progress'
    };

    this.saveMissions([newMission, ...existing.slice(0, 19)]);

    return {
      success: true,
      message: `تم تكليف ${npc.name} بمهمة [${title}] بنجاح! يستغرق العمل ${durationSeconds} ثانية.`,
      mission: newMission
    };
  }

  public static checkAndCompleteMissions(
    onArrestCallback?: (npcId: string, npcName: string, reason: string) => void
  ): { completedCount: number; collectedCash: number; messages: string[] } {
    const missions = this.getMissions();
    const now = Date.now();
    let completedCount = 0;
    let collectedCash = 0;
    const messages: string[] = [];

    const updated = missions.map(m => {
      if (m.status === 'in_progress' && (now - m.startTime) >= m.durationSeconds * 1000) {
        completedCount++;
        const roll = Math.random() * 100;

        if (roll <= m.successRate) {
          collectedCash += m.rewardCash;
          const msg = `نجح ${m.assignedNpcName} في [${m.title}] وغنم لك ${m.rewardCash.toLocaleString()} د.ع!`;
          messages.push(msg);
          return {
            ...m,
            status: 'completed' as const,
            resultLog: msg
          };
        } else if (Math.random() * 100 <= m.riskOfArrest) {
          const msg = `تم توقيف ${m.assignedNpcName} من قبل دورية شرطة أثناء [${m.title}] واقتياده لسجن عالم الخفاء!`;
          messages.push(msg);
          if (onArrestCallback) {
            onArrestCallback(m.assignedNpcId, m.assignedNpcName, `تم ضبطه متلبساً أثناء تنفيذ: ${m.title}`);
          }
          return {
            ...m,
            status: 'arrested' as const,
            resultLog: msg
          };
        } else {
          const msg = `تعثرت مهمة [${m.title}] بسبب ازدحام السيطرات وانسحب ${m.assignedNpcName} بأمان دون خسائر.`;
          messages.push(msg);
          return {
            ...m,
            status: 'failed' as const,
            resultLog: msg
          };
        }
      }
      return m;
    });

    this.saveMissions(updated);
    return { completedCount, collectedCash, messages };
  }

  // ================= 2. إدارة الشراكات الاستثمارية والأرباح (Partnerships) =================
  public static getPartnerships(): NPCPartnership[] {
    try {
      const data = localStorage.getItem('underground_npc_partnerships');
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn(e);
    }
    return [];
  }

  public static savePartnerships(partnerships: NPCPartnership[]): void {
    try {
      localStorage.setItem('underground_npc_partnerships', JSON.stringify(partnerships));
    } catch (e) {
      console.warn(e);
    }
  }

  public static investInPartnership(
    npc: NPCCharacter,
    investmentAmount: number,
    skills: UndergroundSkill[]
  ): { success: boolean; message: string; partnership?: NPCPartnership } {
    const defaultData = DEFAULT_NPC_BUSINESSES[npc.id] || {
      name: `مشروع ${npc.name} التجاري`,
      type: 'تجارة حرة واستثمار',
      baseHourly: 15000,
      bonusText: 'أرباح تجارية مستمرة'
    };

    const negSkill = skills.find(s => s.id === 'skill_negotiation')?.level || 1;
    const bonusMultiplier = 1 + (negSkill * 0.20);

    const partnerships = this.getPartnerships();
    const existing = partnerships.find(p => p.npcId === npc.id);

    if (existing) {
      // ترقية الشراكة القائمة
      const newLevel = existing.level + 1;
      const addedRevenue = Math.round((defaultData.baseHourly * 0.6) * bonusMultiplier);
      const updated: NPCPartnership = {
        ...existing,
        level: newLevel,
        investedCapital: existing.investedCapital + investmentAmount,
        hourlyRevenue: existing.hourlyRevenue + addedRevenue
      };

      const newList = partnerships.map(p => p.npcId === npc.id ? updated : p);
      this.savePartnerships(newList);

      return {
        success: true,
        message: `تم توسيع وضخ رأس مال جديد في [${existing.businessName}] مع ${npc.name}! المستوى (${newLevel}) وأصبح العائد الساعي ${updated.hourlyRevenue.toLocaleString()} د.ع.`,
        partnership: updated
      };
    } else {
      // تأسيس شراكة جديدة
      const hourlyRevenue = Math.round(defaultData.baseHourly * bonusMultiplier);
      const newPart: NPCPartnership = {
        npcId: npc.id,
        businessName: defaultData.name,
        businessType: defaultData.type,
        investedCapital: investmentAmount,
        level: 1,
        hourlyRevenue,
        accumulatedProfit: 0,
        lastCollectedAt: Date.now(),
        startedAt: Date.now(),
        partnershipBonusText: defaultData.bonusText
      };

      this.savePartnerships([...partnerships, newPart]);

      return {
        success: true,
        message: `تم توقيع عقد شراكة تجارية مع ${npc.name} لتأسيس [${defaultData.name}]! تدر الشراكة ${hourlyRevenue.toLocaleString()} د.ع في الساعة.`,
        partnership: newPart
      };
    }
  }

  public static calculateAccumulatedProfits(): { partnerships: NPCPartnership[]; totalProfit: number } {
    const list = this.getPartnerships();
    const now = Date.now();
    let totalProfit = 0;

    const updated = list.map(p => {
      const elapsedHours = (now - p.lastCollectedAt) / (1000 * 60 * 60);
      // حساب الأرباح (تحسب بالدقائق والثواني لتجربة تفاعلية ممتعة)
      const profit = Math.floor(elapsedHours * p.hourlyRevenue);
      totalProfit += profit;
      return {
        ...p,
        accumulatedProfit: profit
      };
    });

    return { partnerships: updated, totalProfit };
  }

  public static collectAllPartnershipProfits(): { collectedAmount: number; count: number } {
    const { partnerships, totalProfit } = this.calculateAccumulatedProfits();
    const now = Date.now();

    const resetList = partnerships.map(p => ({
      ...p,
      accumulatedProfit: 0,
      lastCollectedAt: now
    }));

    this.savePartnerships(resetList);
    return { collectedAmount: totalProfit, count: partnerships.length };
  }

  // ================= 3. سجن أزقة بغداد لعالم الخفاء (Underground Prison) =================
  public static getInmates(): UndergroundPrisonInmate[] {
    try {
      const data = localStorage.getItem('underground_prison_inmates');
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn(e);
    }

    // مبدئياً وضع سجين أو اثنين لإثراء التجربة فورياً
    const initialInmates: UndergroundPrisonInmate[] = [
      {
        id: 'inmate_1',
        npcId: 'npc_male_aggressive',
        npcName: 'حمودي الصكّار',
        npcImage: 'https://up6.cc/2026/10/179191285835274.jpeg',
        npcNickname: 'العتوي',
        gender: 'male',
        personality: 'aggressive',
        personalityArabic: 'العدواني',
        arrestReason: 'اشتباك مسلح في ساحة الميدان ومقاومة مفرزة أمنية',
        cellNumber: 'زنزانة رقم 04 (حراسة مشددة)',
        arrestedAt: Date.now() - 1000 * 60 * 12,
        sentenceMinutes: 30,
        bailAmount: 180000,
        breakoutDifficulty: 65,
        inmateQuote: 'طلعني من هالقواويص ولك! والله بس أطلع إلا أكسر روس السيطرات كلها!'
      },
      {
        id: 'inmate_2',
        npcId: 'npc_female_poor',
        npcName: 'أم سحر الكادحة',
        npcImage: 'https://up6.cc/2026/10/179191295696841.jpeg',
        npcNickname: 'صبورة الأزقة',
        gender: 'female',
        personality: 'poor',
        personalityArabic: 'الفقير',
        arrestReason: 'الاشتباه بنقل طرد غير مصرح في عكد البتاوين',
        cellNumber: 'زنزانة رقم 02 (توقيف نسائي)',
        arrestedAt: Date.now() - 1000 * 60 * 5,
        sentenceMinutes: 15,
        bailAmount: 45000,
        breakoutDifficulty: 35,
        inmateQuote: 'الله يسامح اللي بلّغ عني.. والله ما شايلة غير خبز وشاي للمساكين، فدوى كفلني يا أصيل!'
      }
    ];

    this.saveInmates(initialInmates);
    return initialInmates;
  }

  public static saveInmates(inmates: UndergroundPrisonInmate[]): void {
    try {
      localStorage.setItem('underground_prison_inmates', JSON.stringify(inmates));
    } catch (e) {
      console.warn(e);
    }
  }

  public static imprisonNPC(
    npc: NPCCharacter,
    reason: string
  ): UndergroundPrisonInmate {
    const inmates = this.getInmates();
    // التأكد من عدم وجوده مسبقاً في السجن
    const found = inmates.find(i => i.npcId === npc.id);
    if (found) return found;

    let bailAmount = 50000;
    let difficulty = 45;
    if (npc.personality === 'wealthy') {
      bailAmount = 350000;
      difficulty = 70;
    } else if (npc.personality === 'aggressive') {
      bailAmount = 200000;
      difficulty = 65;
    } else if (npc.personality === 'poor') {
      bailAmount = 35000;
      difficulty = 30;
    }

    const newInmate: UndergroundPrisonInmate = {
      id: `inmate_${Date.now()}`,
      npcId: npc.id,
      npcName: npc.name,
      npcImage: npc.image,
      npcNickname: npc.nickname,
      gender: npc.gender,
      personality: npc.personality,
      personalityArabic: npc.personalityArabic,
      arrestReason: reason,
      cellNumber: `زنزانة أمنية رقم ${Math.floor(Math.random() * 8) + 1}`,
      arrestedAt: Date.now(),
      sentenceMinutes: Math.floor(Math.random() * 20) + 10,
      bailAmount,
      breakoutDifficulty: difficulty,
      inmateQuote: npc.personality === 'aggressive'
        ? 'وحق هو الله ما أسكتلهم! طلعني بأسرع وقت واطلب عيوني!'
        : npc.personality === 'wealthy'
          ? 'المحامي كاعد يماطل، ادفع الكفالة وتكرم من عندي مضاعف!'
          : 'دخيلك يا خويي، السجن ظلام وما أتحمل برد الزنازين.'
    };

    this.saveInmates([newInmate, ...inmates]);
    return newInmate;
  }

  public static payBailout(
    inmateId: string,
    playerMoney: number
  ): { success: boolean; message: string; releasedInmate?: UndergroundPrisonInmate } {
    const inmates = this.getInmates();
    const inmate = inmates.find(i => i.id === inmateId);
    if (!inmate) return { success: false, message: 'السجين غير موجود في السجلات الأمنية!' };

    if (playerMoney < inmate.bailAmount) {
      return { success: false, message: `أموالك غير كافية لدفع الكفالة! مطلوب ${inmate.bailAmount.toLocaleString()} د.ع` };
    }

    const updated = inmates.filter(i => i.id !== inmateId);
    this.saveInmates(updated);

    return {
      success: true,
      message: `تم دفع كفالة قدرها ${inmate.bailAmount.toLocaleString()} د.ع وإطلاق سراح [${inmate.npcName}] فوراً من سجن الخفاء! ارتفعت مودته وولاؤه لك بنسبة هائلة!`,
      releasedInmate: inmate
    };
  }

  public static attemptPrisonBreakout(
    inmateId: string,
    skills: UndergroundSkill[]
  ): { success: boolean; message: string; escapedInmate?: UndergroundPrisonInmate; raisedStars?: boolean } {
    const inmates = this.getInmates();
    const inmate = inmates.find(i => i.id === inmateId);
    if (!inmate) return { success: false, message: 'السجين غير موجود!' };

    const stealthSkill = skills.find(s => s.id === 'skill_stealth')?.level || 1;
    const combatSkill = skills.find(s => s.id === 'skill_combat')?.level || 1;

    // نسبة النجاح
    const baseSuccess = 100 - inmate.breakoutDifficulty;
    const totalSuccess = Math.min(85, baseSuccess + (stealthSkill * 8) + (combatSkill * 5));
    const roll = Math.random() * 100;

    if (roll <= totalSuccess) {
      // نجاح الهروب
      const updated = inmates.filter(i => i.id !== inmateId);
      this.saveInmates(updated);
      return {
        success: true,
        message: `عملية هروب أسطورية! نجحت في اقتحام وكسر أقفال ${inmate.cellNumber} وتهريب ${inmate.npcName} بنجاح دون ترك أي أثر!`,
        escapedInmate: inmate,
        raisedStars: false
      };
    } else {
      // فشل الهروب وإطلاق صفارات الإنذار
      return {
        success: false,
        message: `دقت صفارات الإنذار في سجن الخفاء! اشتبكت المفارز الأمنية وكشفت محاولة التهريب! ارتفعت نجوم المطلوبية وانسحب الفريق بصعوبة!`,
        raisedStars: true
      };
    }
  }

  // ================= 4. عمليات ضد ومع اللاعبين الحقيقيين (PvP Contracts) =================
  public static async fetchRealPlayers(currentUid: string): Promise<{ uid: string; displayName: string; role: string; cleanMoney?: number; wantedStars?: number }[]> {
    try {
      const q = query(collection(db, 'users'), limit(15));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach(d => {
        if (d.id !== currentUid) {
          const data = d.data();
          list.push({
            uid: d.id,
            displayName: data.displayName || 'لاعب في المدينة',
            role: data.role || 'Boss',
            cleanMoney: data.cleanMoney || 150000,
            wantedStars: data.wantedStars || 0
          });
        }
      });
      if (list.length > 0) return list;
    } catch (e) {
      console.warn('Fallback to local players:', e);
    }

    // لاعبين افتراضيين للمحاكاة الفورية عند عدم توفر اتصال
    return [
      { uid: 'p_101', displayName: 'علي الجابري (الزعيم)', role: 'Boss', cleanMoney: 2400000, wantedStars: 2 },
      { uid: 'p_102', displayName: 'كرار الحنين', role: 'Smuggler', cleanMoney: 850000, wantedStars: 1 },
      { uid: 'p_103', displayName: 'سيف القناص', role: 'Criminal', cleanMoney: 1300000, wantedStars: 4 },
      { uid: 'p_104', displayName: 'أبو فهد البغدادي', role: 'Trader', cleanMoney: 5200000, wantedStars: 0 }
    ];
  }

  public static launchPvPOperation(
    type: PvPOperationType,
    npc: NPCCharacter,
    targetPlayer: { uid: string; displayName: string },
    cost: number
  ): { success: boolean; message: string; op?: PvPOperation } {
    let duration = 30;
    let desc = '';

    switch (type) {
      case 'sabotage_vehicle':
        desc = `تكليف ${npc.name} بتعطيل محرك سيارة ${targetPlayer.displayName} وإتلاف إطاراتها`;
        duration = 35;
        break;
      case 'pickpocket_player':
        desc = `تكليف ${npc.name} بمراقبة ${targetPlayer.displayName} ونشل جزء من أمواله في السوق`;
        duration = 40;
        break;
      case 'police_snitch':
        desc = `تكليف ${npc.name} بتقديم بلاغ استخباراتي عاجل للشرطة ضد ${targetPlayer.displayName} لمداهمته`;
        duration = 25;
        break;
      case 'intel_spy':
        desc = `زرع ${npc.name} كجاسوس سري لكشف تفاصيل محفظة وممتلكات ${targetPlayer.displayName}`;
        duration = 20;
        break;
      case 'friendly_aid':
        desc = `إرسال شحنة دعم وضيافة عبر ${npc.name} إلى ${targetPlayer.displayName}`;
        duration = 30;
        break;
    }

    const op: PvPOperation = {
      id: `pvp_${Date.now()}`,
      type,
      executorNpcId: npc.id,
      executorNpcName: npc.name,
      targetPlayerUid: targetPlayer.uid,
      targetPlayerName: targetPlayer.displayName,
      cost,
      startedAt: Date.now(),
      durationSeconds: duration,
      status: 'pending',
      message: desc
    };

    return {
      success: true,
      message: `انطلق ${npc.name} في عملية [${desc}] بنجاح! ستظهر النتيجة خلال ${duration} ثانية.`,
      op
    };
  }

  // ================= 5. تنفيذ عمليات السطو الكبرى (Heists Execution) =================
  public static executeHeist(
    plan: HeistPlan,
    crew: Record<string, NPCCharacter>,
    skills: UndergroundSkill[]
  ): { success: boolean; loot: number; message: string; arrestedNpcs: string[] } {
    const heistSkill = skills.find(s => s.id === 'skill_heists')?.level || 1;
    const bonusSuccess = heistSkill * 10;

    // حساب قوة الطاقم ومدى ملاءمة الشخصيات للأدوار
    let teamBonus = 0;
    const crewEntries = Object.entries(crew);
    crewEntries.forEach(([roleId, npc]) => {
      const roleDef = plan.requiredRoles.find(r => r.roleId === roleId);
      if (roleDef && roleDef.recommendedPersonalities.includes(npc.personality)) {
        teamBonus += 15;
      }
    });

    let baseRate = 70;
    if (plan.riskLevel === 'high') baseRate = 55;
    if (plan.riskLevel === 'extreme') baseRate = 40;

    const totalRate = Math.min(90, baseRate + teamBonus + bonusSuccess);
    const roll = Math.random() * 100;

    if (roll <= totalRate) {
      // نجاح السطو
      const rawLoot = Math.floor(Math.random() * (plan.baseLootMax - plan.baseLootMin)) + plan.baseLootMin;
      const loot = Math.round(rawLoot * (1 + heistSkill * 0.1));

      return {
        success: true,
        loot,
        message: `تم تنفيذ [${plan.title}] بنجاح ساحق! تم تفكيك الخزائن والهروب بأمان! غنمت حصتك الصافية ${loot.toLocaleString()} د.ع!`,
        arrestedNpcs: []
      };
    } else {
      // فشل السطو ومداهمة الشرطة
      const arrested: string[] = [];
      const leader = crew['leader'];
      if (leader && Math.random() < 0.6) {
        arrested.push(leader.name);
        this.imprisonNPC(leader, `القبض عليه متلبساً أثناء محاولة تنفيذ: ${plan.title}`);
      }

      return {
        success: false,
        loot: 0,
        message: `داهمت قوات سوات ومفارز النجدة موقع [${plan.title}]! فشلت العملية وتم تطويق المكان واقتياد من تورط إلى سجن الخفاء!`,
        arrestedNpcs: arrested
      };
    }
  }

  // ================= 6. شجرة المهارات (Skills Management) =================
  public static getSkills(): UndergroundSkill[] {
    try {
      const data = localStorage.getItem('underground_player_skills');
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn(e);
    }
    return DEFAULT_UNDERGROUND_SKILLS;
  }

  public static saveSkills(skills: UndergroundSkill[]): void {
    try {
      localStorage.setItem('underground_player_skills', JSON.stringify(skills));
    } catch (e) {
      console.warn(e);
    }
  }

  public static upgradeSkill(
    skillId: string,
    playerMoney: number
  ): { success: boolean; message: string; updatedSkills?: UndergroundSkill[] } {
    const skills = this.getSkills();
    const skill = skills.find(s => s.id === skillId);
    if (!skill) return { success: false, message: 'المهارة غير موجودة!' };

    if (skill.level >= skill.maxLevel) {
      return { success: false, message: 'وصلت هذه المهارة إلى أقصى ترقية ممكنة (الحد الأقصى)!' };
    }

    const upgradeCost = skill.costPerLevel * skill.level;
    if (playerMoney < upgradeCost) {
      return { success: false, message: `أموالك غير كافية لترقية المهارة! مطلوب ${upgradeCost.toLocaleString()} د.ع` };
    }

    const updated = skills.map(s => {
      if (s.id === skillId) {
        return {
          ...s,
          level: s.level + 1
        };
      }
      return s;
    });

    this.saveSkills(updated);

    return {
      success: true,
      message: `مبروك! تم ترقية [${skill.name}] إلى المستوى (${skill.level + 1}) بنجاح! زادت قدراتك وتأثيرك في عالم الخفاء.`,
      updatedSkills: updated
    };
  }
}
