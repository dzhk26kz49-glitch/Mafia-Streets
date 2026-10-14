import { NPCCharacter, NPCPersonality, NPCActivity, NPCMood, NPCInventoryItem } from '../types/npcTypes';
import { 
  IRAQI_NAMES, 
  MALE_IRAQI_NAMES,
  FEMALE_IRAQI_NAMES,
  IRAQI_DISTRICTS, 
  PERSONALITY_METADATA, 
  ACTIVITY_METADATA, 
  MOOD_METADATA,
  FRIENDSHIP_TIERS,
  IRAQI_DIALOGUES 
} from './npcDialogues';
import { MARKET_ITEMS } from '../lib/items';
import { FIXED_50_NPCS } from './fixedNpcRoster';
import { UserProfile } from '../store/useAuthStore';
import { doc, updateDoc, increment, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

const ALL_PERSONALITIES: NPCPersonality[] = [
  'peaceful',
  'social',
  'aggressive',
  'wealthy',
  'poor',
  'gambler',
  'thief',
  'cautious',
  'rebel',
  'worker'
];

export class NPCEngine {
  // حساب رتبة الصداقة بناءً على النقاط
  public static calculateFriendshipRank(points: number): string {
    const tier = FRIENDSHIP_TIERS.find(t => points >= t.min && points <= t.max) || FRIENDSHIP_TIERS[0];
    return tier.rank;
  }

  // حساب نسبة الخصم التجاري بناءً على رتبة الصداقة
  public static calculateDiscount(friendship: number): number {
    const tier = FRIENDSHIP_TIERS.find(t => friendship >= t.min && friendship <= t.max) || FRIENDSHIP_TIERS[0];
    return tier.discount;
  }

  // توليد مخزن بضائع تخصصي مميز لكل شخصية بحسب هويتها ونمطها
  public static generateUniqueInventory(personality: NPCPersonality, index: number): NPCInventoryItem[] {
    switch (personality) {
      case 'aggressive':
      case 'rebel':
        return [
          {
            id: 'w_glock19',
            name: 'مسدس جلوك 19 تكتيكي (9 ملم)',
            category: 'weapon',
            categoryArabic: 'سلاح ناري',
            price: 350000,
            buyPrice: 220000,
            stock: 3,
            desc: 'مسدس نمساوي سريع الاستجابة، خفيف ومناسب للاشتباكات الخاطفة.',
            rarity: 'rare'
          },
          {
            id: 'w_deagle',
            name: 'نسر الصحراء (Desert Eagle .50)',
            category: 'weapon',
            categoryArabic: 'سلاح ناري ثقيل',
            price: 750000,
            buyPrice: 480000,
            stock: 1,
            desc: 'مسدس عيار ثقيل ذو صوت مدوٍ وضرر فتاك يقلب موازين الشارع.',
            rarity: 'epic'
          },
          {
            id: 'w_vest',
            name: 'سترة واقية من الرصاص عسكرية (Kevlar)',
            category: 'tool',
            categoryArabic: 'دروع وحماية',
            price: 280000,
            buyPrice: 170000,
            stock: 2,
            desc: 'سترة مضادة لشظايا ورصاص المسدسات، تخفف أضرار العراك والمداهمات.',
            rarity: 'rare'
          },
          {
            id: 'w_knuckles',
            name: 'قبضة حديد مصلدة (Brass Knuckles)',
            category: 'weapon',
            categoryArabic: 'سلاح شجار أبيض',
            price: 45000,
            buyPrice: 25000,
            stock: 5,
            desc: 'تزيد من قوة لكمات الشارع وتحدث ارتجاجاً فورياً للخصم.',
            rarity: 'common'
          }
        ];

      case 'wealthy':
        return [
          {
            id: 'lux_goldbar',
            name: 'سبيكة ذهب سويسري عيار 24 (100 غرام)',
            category: 'luxury',
            categoryArabic: 'معادن ثمينة',
            price: 1200000,
            buyPrice: 950000,
            stock: 2,
            desc: 'استثمار مضمون وملاذ آمن لتبييض وتخزين الأموال الضخمة.',
            rarity: 'legendary'
          },
          {
            id: 'lux_rolex',
            name: 'ساعة رولكس دايتونا ذهبية أصلية',
            category: 'luxury',
            categoryArabic: 'مقتنيات ثمينة',
            price: 850000,
            buyPrice: 620000,
            stock: 1,
            desc: 'ساعة مهربة فاخرة ترفع الهيبة والوجاهة في مجالس التجّار.',
            rarity: 'epic'
          },
          {
            id: 'lux_antique',
            name: 'مسكوكة عباسية أثرية نادرة',
            category: 'luxury',
            categoryArabic: 'تحف وآثار',
            price: 450000,
            buyPrice: 310000,
            stock: 3,
            desc: 'قطعة أثرية يطلبها كبار هواة الآثار في السوق السوداء.',
            rarity: 'rare'
          }
        ];

      case 'thief':
      case 'cautious':
        return [
          {
            id: 't_lockpick_master',
            name: 'طقم مفاتيح لولبية احترافية (Master Picks)',
            category: 'tool',
            categoryArabic: 'أدوات سطو',
            price: 85000,
            buyPrice: 50000,
            stock: 4,
            desc: 'تفتح أقفال المحلات والمنازل بهدوء ودون إحداث ضجيج.',
            rarity: 'rare'
          },
          {
            id: 't_jammer',
            name: 'مشوش رادار ولاسلكي الدوريات (RF Jammer)',
            category: 'intel',
            categoryArabic: 'تقنيات أمنية',
            price: 420000,
            buyPrice: 270000,
            stock: 1,
            desc: 'يعطل أجهزة رصد الشرطة في المنطقة ويقلل فرصة المداهمات بنسبة 50%.',
            rarity: 'epic'
          },
          {
            id: 't_fake_stamps',
            name: 'أختام تصديق معاملات وتزوير سريعة',
            category: 'tool',
            categoryArabic: 'تزوير ومستندات',
            price: 190000,
            buyPrice: 110000,
            stock: 2,
            desc: 'تساعد على استخراج تصاريح مزورة في حالات الطوارئ.',
            rarity: 'rare'
          }
        ];

      case 'gambler':
        return [
          {
            id: 'g_lucky_dice',
            name: 'نرد عاجي مبارك (Lucky Street Dice)',
            category: 'tool',
            categoryArabic: 'أدوات مقامرة',
            price: 120000,
            buyPrice: 70000,
            stock: 2,
            desc: 'يزيد الحظ في رهانات الطرة والكتبة والزار بالأزقة.',
            rarity: 'rare'
          },
          {
            id: 'g_silver_coin',
            name: 'عملة فضية ثقيلة للرهانات السريعة',
            category: 'luxury',
            categoryArabic: 'عملات رهان',
            price: 60000,
            buyPrice: 35000,
            stock: 4,
            desc: 'عملة خاصة لألعاب الطرة والكتبة العادلة مع كبار الحارة.',
            rarity: 'common'
          }
        ];

      case 'social':
      case 'peaceful':
        return [
          {
            id: 'm_medkit',
            name: 'حقيبة إسعافات جراحية للشوارع',
            category: 'medical',
            categoryArabic: 'علاج وطبابة',
            price: 55000,
            buyPrice: 30000,
            stock: 6,
            desc: 'تعيد 60 نقطة صحة فورية بعد الشجارات دون الحاجة للذهاب للمستشفى.',
            rarity: 'common'
          },
          {
            id: 'm_adrenaline',
            name: 'أمبولة أدرينالين وطاقة بدنية سريعة',
            category: 'medical',
            categoryArabic: 'منشطات حيوية',
            price: 80000,
            buyPrice: 45000,
            stock: 4,
            desc: 'تمنح طاقة وسرعة قصوى تساعد في الهروب السريع من دوريات الشرطة.',
            rarity: 'rare'
          },
          {
            id: 'intel_patrol_map',
            name: 'مخطط تحركات دوريات الشرطة اليومية',
            category: 'intel',
            categoryArabic: 'استخبارات شوارع',
            price: 250000,
            buyPrice: 150000,
            stock: 1,
            desc: 'يخفض فوراً مستوى الشبهة بمقدار 25% بفضل معرفة مسارات السيطرات.',
            rarity: 'epic'
          }
        ];

      case 'poor':
      case 'worker':
      default:
        return [
          {
            id: 'w_wrench',
            name: 'سبانة حديد ثقيلة (Pipe Wrench)',
            category: 'tool',
            categoryArabic: 'عدة وميكانيك',
            price: 25000,
            buyPrice: 12000,
            stock: 4,
            desc: 'تصلح المركبات وتستخدم كأداة دفاع شخصي صلبة.',
            rarity: 'common'
          },
          {
            id: 'm_bandages',
            name: 'ضمادات وشاش معقم ميداني',
            category: 'medical',
            categoryArabic: 'إسعافات أولية',
            price: 15000,
            buyPrice: 8000,
            stock: 8,
            desc: 'تعالج الجروح السطحية وتعيد 25 نقطة صحة.',
            rarity: 'common'
          },
          {
            id: 'tea_special',
            name: 'جاي مهيل أصلي وسكاير سومر',
            category: 'luxury',
            categoryArabic: 'ضيافة وأمزجة',
            price: 10000,
            buyPrice: 5000,
            stock: 12,
            desc: 'تروق المزاج وتزيد من ألفة وصداقة أهل الشارع عند تقديمها كهدية.',
            rarity: 'common'
          }
        ];
    }
  }

  // توليد شخصية NPC عشوائية متكاملة بالكامل مع تمييز دقيق بين الذكر والأنثى بالاسم والصورة
  public static generateNPC(index: number = 0, specificPersonality?: NPCPersonality, specificGender?: 'male' | 'female'): NPCCharacter {
    const personality = specificPersonality || ALL_PERSONALITIES[index % ALL_PERSONALITIES.length];
    
    // توزيع متوازن بين الذكور والإناث (فردي أنثى، زوجي ذكر)
    const gender = specificGender || (index % 2 === 1 ? 'female' : 'male');
    const namePool = gender === 'female' ? FEMALE_IRAQI_NAMES : MALE_IRAQI_NAMES;
    const nameData = namePool[Math.floor(Math.random() * namePool.length)];
    const district = IRAQI_DISTRICTS[Math.floor(Math.random() * IRAQI_DISTRICTS.length)];
    const meta = PERSONALITY_METADATA[personality];

    // تحديد الميزانية المالية الحقيقية الحية والصحة والسمات بحسب الشخصية
    let cash = 120000;
    let maxHealth = 100;
    let aggression = 5;
    let caution = 5;
    let intelligence = 5;
    let specialty = 'كاسب في الأزقة';
    let protectionCost = 50000;

    switch (personality) {
      case 'wealthy':
        // أرقام مالية حقيقية بالملايين
        cash = Math.floor(Math.random() * 5000000) + 1800000;
        maxHealth = 110;
        aggression = 3;
        caution = 8;
        intelligence = 9;
        specialty = 'قرش السوق وتجارة السبائك والتحف';
        protectionCost = 150000;
        break;
      case 'poor':
        cash = Math.floor(Math.random() * 20000) + 4000;
        maxHealth = 85;
        aggression = 3;
        caution = 7;
        intelligence = 6;
        specialty = 'درويش الحارة وعين الميدان';
        protectionCost = 15000;
        break;
      case 'aggressive':
        cash = Math.floor(Math.random() * 600000) + 350000;
        maxHealth = 145;
        aggression = 9;
        caution = 2;
        intelligence = 5;
        specialty = 'قبضاي أزقة ومسلح ثقيل وعتوي نزال';
        protectionCost = 75000;
        break;
      case 'gambler':
        cash = Math.floor(Math.random() * 1800000) + 450000;
        maxHealth = 105;
        aggression = 5;
        caution = 3;
        intelligence = 8;
        specialty = 'محترف روليت وطرة كتبة ورهانات مفتوحة';
        protectionCost = 60000;
        break;
      case 'thief':
        cash = Math.floor(Math.random() * 150000) + 40000;
        maxHealth = 95;
        aggression = 6;
        caution = 9;
        intelligence = 8;
        specialty = 'نشال محترف وخبير فتح أقفال وخزائن';
        protectionCost = 45000;
        break;
      case 'rebel':
        cash = Math.floor(Math.random() * 550000) + 200000;
        maxHealth = 150;
        aggression = 8;
        caution = 4;
        intelligence = 7;
        specialty = 'متمرد شوارع ومقاوم سيطرات ومهرب سلاح';
        protectionCost = 80000;
        break;
      case 'worker':
        cash = Math.floor(Math.random() * 220000) + 90000;
        maxHealth = 120;
        aggression = 4;
        caution = 6;
        intelligence = 6;
        specialty = 'كادح ومهندس ميكانيك وتجهيزات ورش';
        protectionCost = 35000;
        break;
      case 'cautious':
        cash = Math.floor(Math.random() * 250000) + 85000;
        maxHealth = 95;
        aggression = 2;
        caution = 10;
        intelligence = 8;
        specialty = 'خبير تمويه واستخبارات وتفادي المداهمات';
        protectionCost = 40000;
        break;
      case 'social':
        cash = Math.floor(Math.random() * 380000) + 120000;
        maxHealth = 100;
        aggression = 4;
        caution = 5;
        intelligence = 8;
        specialty = 'مختار الزقاق ووسيط صفقات وإشاعات الحارة';
        protectionCost = 50000;
        break;
      case 'peaceful':
      default:
        cash = Math.floor(Math.random() * 200000) + 70000;
        maxHealth = 100;
        aggression = 2;
        caution = 7;
        intelligence = 7;
        specialty = 'حكيم الزاوية وعطار أدوية وأعشاب';
        protectionCost = 30000;
        break;
    }

    // تكييف المسمى التخصصي عند كون الشخصية أنثى
    if (nameData.gender === 'female') {
      switch (personality) {
        case 'wealthy':
          specialty = 'سيدة أعمال وقرشة أسواق وتجارة الذهب والسبائك';
          break;
        case 'poor':
          specialty = 'درويشة الحارة وعين الميدان السري';
          break;
        case 'aggressive':
          specialty = 'قبضاية شوارع ومسلحة ثقيلة وعتوية نزال';
          break;
        case 'gambler':
          specialty = 'محترفة روليت وطرة كتبة ورهانات مفتوحة';
          break;
        case 'thief':
          specialty = 'نشالة محترفة وخبيرة فتح أقفال وخزائن';
          break;
        case 'rebel':
          specialty = 'متمردة أزقة ومقاومة سيطرات ومهربة سلاح';
          break;
        case 'worker':
          specialty = 'كادحة ومهندسة ميكانيك وتجهيزات ورش';
          break;
        case 'cautious':
          specialty = 'خبيرة تمويه واستخبارات وتفادي المداهمات';
          break;
        case 'social':
          specialty = 'مختارة الزقاق ووسيطة صفقات وإشاعات الحارة';
          break;
        case 'peaceful':
        default:
          specialty = 'حكيمة الزاوية وصيدلانية أعشاب وأدوية';
          break;
      }
    }

    const activities: NPCActivity[] = ['wandering', 'working', 'talking', 'resting', 'trading'];
    const activity = activities[Math.floor(Math.random() * activities.length)];

    const moods: NPCMood[] = ['cheerful', 'angry', 'suspicious', 'greedy', 'fearful', 'loyal'];
    const mood = moods[Math.floor(Math.random() * moods.length)];

    const initialX = Math.floor(Math.random() * 80) + 10;
    const initialY = Math.floor(Math.random() * 70) + 15;

    // تجهيز الهدايا المفضلة لكل نمط
    const favoriteGifts = [
      { type: 'tea' as const, bonus: 15, reactionText: 'فدوة لعمرك! جاي مهيل يروق الراس ويعدل المزاج!' },
      { type: 'cash' as const, bonus: 25, reactionText: 'عاشت إيدك يا أصيل، ما تقصر وكفو منك والله!' },
      { type: 'weapon' as const, bonus: 30, reactionText: 'الله! هاي الهدية المعدلة! طلعت مو هين يا ذيب الحارة!' },
      { type: 'medical' as const, bonus: 20, reactionText: 'تسلم حبيبي، والله هاي تداوي الجروح وتنقذ الأرواح!' }
    ];

    const uniqueInventory = this.generateUniqueInventory(personality, index);

    // سلف وقروض الشارع
    const loanAvailable = Math.floor(cash * 0.25);

    const verb = nameData.gender === 'female' ? 'ظهرت' : 'ظهر';
    const pronoun = nameData.gender === 'female' ? 'وهي' : 'وهو';

    return {
      id: `npc_${personality}_${Date.now()}_${Math.floor(Math.random() * 1000)}_${index}`,
      name: `${nameData.name}`,
      nickname: nameData.nickname,
      gender: nameData.gender,
      genderArabic: nameData.gender === 'female' ? 'أنثى' : 'ذكر',
      image: nameData.image,
      personality,
      personalityArabic: meta.title,
      specialty,
      cash,
      health: maxHealth,
      maxHealth,
      aggression,
      caution,
      intelligence,
      district,
      activity,
      activityArabic: ACTIVITY_METADATA[activity],
      statusText: this.getRandomBark(personality, activity),
      mood,
      moodArabic: MOOD_METADATA[mood].title,
      x: initialX,
      y: initialY,

      // نظام المقاييس الأربعة المتقدم
      affection: Math.floor(Math.random() * 25) + 15,
      trust: Math.floor(Math.random() * 20) + 10,
      respect: Math.floor(Math.random() * 25) + 20,
      conflict: personality === 'aggressive' ? 30 : 5,
      isKnockedOut: false,
      policeReportsCount: 0,

      // نظام الصداقة
      friendship: Math.floor(Math.random() * 20) + 5, // يبدأ بين 5 و 25
      friendshipRank: this.calculateFriendshipRank(15),
      isHiredProtector: false,
      protectionBonus: {
        damageAbsorption: 35,
        counterDamageBonus: 15,
        raidDefense: 25
      },
      protectionCost,
      favoriteGifts,
      uniqueInventory,

      historyWithPlayer: {
        fights: 0,
        trades: 0,
        betsWon: 0,
        betsLost: 0,
        giftsReceived: 0,
        timesProtected: 0,
        policeReports: 0,
        lastInteraction: Date.now(),
        affinity: 0
      },
      recentEvents: [`${verb} في ${district} ${pronoun} ${ACTIVITY_METADATA[activity]}`],
      loanAvailable,
      loanGranted: 0
    };
  }

  // قائمة الـ 10 شخصيات NPC المعتمدة
  public static generateInitialRoster(): NPCCharacter[] {
    return FIXED_50_NPCS;
  }

  // تحميل قائمة الـ NPCs مع المزامنة بين Firestore و LocalStorage
  public static async loadRoster(): Promise<NPCCharacter[]> {
    try {
      // 1. محاولة جلب القائمة المحدثة مركزياً من Firestore
      const snap = await getDoc(doc(db, 'gameData', 'npcs_roster'));
      if (snap.exists() && snap.data()?.characters && Array.isArray(snap.data().characters)) {
        const cloudCharacters = snap.data().characters as NPCCharacter[];
        if (cloudCharacters.length > 0) {
          try {
            localStorage.setItem('saved_fixed_10_npcs', JSON.stringify(cloudCharacters));
          } catch (e) {
            console.warn(e);
          }
          return cloudCharacters;
        }
      }
    } catch (err) {
      console.warn('Could not load NPCs from Firestore:', err);
    }

    // 2. استخدام النسخة المحفوظة محلياً إن وجدت
    try {
      const saved = localStorage.getItem('saved_fixed_10_npcs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn(e);
    }

    // 3. القائمة الافتراضية
    return this.generateInitialRoster();
  }

  // حفظ وتحديث شخصيات الـ NPCs إلى Firestore و LocalStorage وإرسال إشعار فوري
  public static async saveRoster(characters: NPCCharacter[]): Promise<boolean> {
    // 1. التحديث المحلي الفوري
    try {
      localStorage.setItem('saved_fixed_10_npcs', JSON.stringify(characters));
    } catch (e) {
      console.warn(e);
    }

    // 2. بث إشعار لكافة مكونات التطبيق لتحديث الشاشات فوراً
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('npc_roster_updated', { detail: characters }));
    }

    // 3. الحفظ في Firestore للسيرفر وقاعدة البيانات
    try {
      await setDoc(doc(db, 'gameData', 'npcs_roster'), {
        characters,
        updatedAt: Date.now()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('Failed to sync NPCs roster to Firestore:', err);
      return false;
    }
  }

  // إعادة تعيين الـ NPCs إلى التشكيلة الأصلية
  public static async resetRosterToDefault(): Promise<NPCCharacter[]> {
    const defaultRoster = this.generateInitialRoster();
    await this.saveRoster(defaultRoster);
    return defaultRoster;
  }

  // تحديث سلوك ومواقع وأموال شخصيات الـ NPC تلقائياً لمحاكاة الحياة المستمرة
  public static tickSimulation(npcs: NPCCharacter[]): NPCCharacter[] {
    return npcs.map(npc => {
      // 1. حركة عشوائية طفيفة داخل الزقاق
      const deltaX = (Math.random() - 0.5) * 8;
      const deltaY = (Math.random() - 0.5) * 6;
      const newX = Math.min(92, Math.max(8, npc.x + deltaX));
      const newY = Math.min(85, Math.max(12, npc.y + deltaY));

      // 2. تغيير محتمل للنشاط (احتمال 20%) إذا لم يكن حماية حالياً
      let newActivity = npc.activity;
      let newStatus = npc.statusText;

      if (npc.isHiredProtector) {
        newActivity = 'bodyguarding';
        newStatus = `مرافقك الشخصي ويراقب تحركات المارة لحمايتك!`;
      } else if (Math.random() < 0.20 && npc.activity !== 'fighting') {
        const candidateActivities: NPCActivity[] = ['wandering', 'talking', 'working', 'resting', 'trading'];
        newActivity = candidateActivities[Math.floor(Math.random() * candidateActivities.length)];
        newStatus = this.getRandomBark(npc.personality, newActivity);
      }

      // 3. تقلبات مالية حية واقعية (أرباح وخسائر في الشارع)
      let dynamicCash = npc.cash;
      if (Math.random() < 0.25) {
        const deltaCash = Math.floor((Math.random() - 0.45) * (npc.cash * 0.05));
        dynamicCash = Math.max(1000, npc.cash + deltaCash);
      }

      // استعادة طفيفة للصحة إذا كان مصاباً
      const newHealth = Math.min(npc.maxHealth, npc.health + (npc.activity === 'resting' ? 6 : 2));

      return {
        ...npc,
        x: newX,
        y: newY,
        activity: newActivity,
        activityArabic: ACTIVITY_METADATA[newActivity],
        statusText: newStatus,
        cash: dynamicCash,
        health: newHealth
      };
    });
  }

  // الحصول على عبارة عفوية باللهجة العراقية
  public static getRandomBark(personality: NPCPersonality, activity: NPCActivity): string {
    const list = IRAQI_DIALOGUES[personality];
    if (activity === 'trading') {
      return list.onTrade[Math.floor(Math.random() * list.onTrade.length)];
    }
    if (activity === 'talking') {
      return list.chat[Math.floor(Math.random() * list.chat.length)];
    }
    return list.greetings[Math.floor(Math.random() * list.greetings.length)];
  }

  // نظام إرسال الهدايا للـ NPC (كاش أو مواد) لزيادة الصداقة
  public static async sendGiftToNPC(
    profile: UserProfile,
    npc: NPCCharacter,
    giftType: 'cash_small' | 'cash_large' | 'tea' | 'medical' | 'weapon'
  ): Promise<{
    success: boolean;
    friendshipGained: number;
    newFriendship: number;
    newRank: string;
    message: string;
    cost: number;
  }> {
    let cost = 10000;
    let baseBonus = 15;
    let reaction = 'تسلم يا غالي، كلك ذوق وكرم!';

    if (giftType === 'cash_small') {
      cost = 25000;
      baseBonus = 15;
      reaction = 'عزيمة محترمة على جاي وكرم أصيل! مشكور يا طيب!';
    } else if (giftType === 'cash_large') {
      cost = 150000;
      baseBonus = 35;
      reaction = 'يابه شنو هذا الكرم الحاتمي؟! والله طلعت أخو دنيا وسند!';
    } else if (giftType === 'tea') {
      cost = 10000;
      baseBonus = 12;
      reaction = 'الله يبرد على كلبك! استكان جاي مهيل يعدل الطاسات!';
    } else if (giftType === 'medical') {
      cost = 50000;
      baseBonus = 22;
      reaction = 'تسلم، والله هاي الأدوية إجت بوقتها، الشارع مليان طك وطكوك!';
    } else if (giftType === 'weapon') {
      cost = 180000;
      baseBonus = 30;
      reaction = 'سلاح هدية؟! وداعتك هذا ينحط عالعين والراس! من اليوم ظهرك محمي!';
    }

    if ((profile.cleanMoney || 0) < cost) {
      return {
        success: false,
        friendshipGained: 0,
        newFriendship: npc.friendship,
        newRank: npc.friendshipRank,
        message: 'ليس لديك كاش كافٍ لتقديم هذه الهدية!',
        cost: 0
      };
    }

    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        cleanMoney: increment(-cost)
      });

      const newFriendship = Math.min(100, npc.friendship + baseBonus);
      const newRank = this.calculateFriendshipRank(newFriendship);

      return {
        success: true,
        friendshipGained: baseBonus,
        newFriendship,
        newRank,
        message: `${npc.name}: "${reaction}" (ارتفعت الصداقة بمقدار +${baseBonus}% وأصبحت: ${newRank})`,
        cost
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      return {
        success: false,
        friendshipGained: 0,
        newFriendship: npc.friendship,
        newRank: npc.friendshipRank,
        message: 'تعذر تقديم الهدية بسبب خطأ في الشبكة',
        cost: 0
      };
    }
  }

  // نظام توظيف أو إلغاء الحماية الشخصية (Bodyguard)
  public static async toggleProtection(
    profile: UserProfile,
    npc: NPCCharacter,
    hire: boolean
  ): Promise<{ success: boolean; message: string; costDeducted: number }> {
    if (!hire) {
      return {
        success: true,
        message: `تم إلغاء مرافقة ${npc.name}، وعاد لممارسة نشاطه المعتاد في الحارة.`,
        costDeducted: 0
      };
    }

    // التحقق من الصداقة: إذا كانت الصداقة عالية (>= 70) تكون الحماية مجانية كأخوة
    const isFreeBrother = npc.friendship >= 70;
    const fee = isFreeBrother ? 0 : npc.protectionCost;

    if (!isFreeBrother && npc.friendship < 35) {
      return {
        success: false,
        message: `${npc.name}: "ما أعرفك كفاية حتى أصير حمايتك وأخاطر بروحي وياك! حسّن صداقتك وياي أول!"`,
        costDeducted: 0
      };
    }

    if (fee > 0 && (profile.cleanMoney || 0) < fee) {
      return {
        success: false,
        message: `أجر توظيف ${npc.name} كحماية شخصية هو ${fee.toLocaleString()} دولار، وليس لديك كاش كافٍ!`,
        costDeducted: 0
      };
    }

    try {
      if (fee > 0) {
        const userRef = doc(db, 'users', profile.uid);
        await updateDoc(userRef, {
          cleanMoney: increment(-fee)
        });
      }

      const msg = isFreeBrother
        ? `${npc.name}: "أنت أخويا وحزام ظهري! حمايتي الك مجانية وما آخذ منك ولا فلس! أمشي كدامي والشارع أمان!"`
        : `${npc.name}: "استلمت المعلوم (${fee.toLocaleString()}$)! من هسة اني ظهرك وسندك، وأي واحد يندك بيك ياكله الساطور!"`;

      return {
        success: true,
        message: msg,
        costDeducted: fee
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      return { success: false, message: 'فشل تفعيل الحماية', costDeducted: 0 };
    }
  }

  // شراء بضاعة متخصصة من مخزن الـ NPC مع تطبيق خصم الصداقة
  public static async buyItemFromNPC(
    profile: UserProfile,
    npc: NPCCharacter,
    item: NPCInventoryItem
  ): Promise<{ success: boolean; message: string; finalPrice: number }> {
    const discountPercent = this.calculateDiscount(npc.friendship);
    const finalPrice = Math.floor(item.price * (1 - discountPercent / 100));

    if ((profile.cleanMoney || 0) < finalPrice) {
      return { 
        success: false, 
        message: `ليس لديك كاش كافٍ لشراء ${item.name}! السعر بعد خصم الصداقة (${discountPercent}%): ${finalPrice.toLocaleString()} دولار.`,
        finalPrice 
      };
    }

    try {
      const userRef = doc(db, 'users', profile.uid);
      const updatedInventory: NonNullable<UserProfile['inventory']> = {
        cars: {},
        bikes: 0,
        weapons: {},
        drugs: {},
        armor: {},
        tools: {},
        ...(profile.inventory || {})
      };

      if (item.category === 'drug') {
        const drugs = { ...(updatedInventory.drugs || {}) };
        drugs[item.id] = (drugs[item.id] || 0) + 1;
        updatedInventory.drugs = drugs;
      } else if (item.category === 'weapon') {
        const weapons = { ...(updatedInventory.weapons || {}) };
        weapons[item.id] = (weapons[item.id] || 0) + 1;
        updatedInventory.weapons = weapons;
      } else {
        const tools = { ...(updatedInventory.tools || {}) };
        tools[item.id] = (tools[item.id] || 0) + 1;
        updatedInventory.tools = tools;
      }

      await updateDoc(userRef, {
        cleanMoney: increment(-finalPrice),
        inventory: updatedInventory
      });

      return {
        success: true,
        message: `اشتريت "${item.name}" بسعر ${finalPrice.toLocaleString()} دولار (بخصم صداقة ${discountPercent}%)! أضيفت إلى مخزنك.`,
        finalPrice
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      return { success: false, message: 'فشلت عملية الشراء', finalPrice };
    }
  }

  // بيع عنصر من مخزن اللاعب إلى الـ NPC مقابل كاش حقيقي من محفظة الـ NPC
  public static async sellItemToNPC(
    profile: UserProfile,
    npc: NPCCharacter,
    item: NPCInventoryItem
  ): Promise<{ success: boolean; message: string; payout: number }> {
    const payout = item.buyPrice || Math.floor(item.price * 0.65);

    if (npc.cash < payout) {
      return {
        success: false,
        message: `${npc.name}: "محفظتي ما تكفي أشتري هاي البضاعة هسة! عندي بس ${npc.cash.toLocaleString()}$ كاش!"`,
        payout: 0
      };
    }

    try {
      const userRef = doc(db, 'users', profile.uid);
      const updatedInventory: NonNullable<UserProfile['inventory']> = {
        cars: {},
        bikes: 0,
        weapons: {},
        drugs: {},
        armor: {},
        tools: {},
        ...(profile.inventory || {})
      };

      // خصم القطعة من مخزن اللاعب
      let found = false;
      const drugs = { ...(updatedInventory.drugs || {}) };
      const weapons = { ...(updatedInventory.weapons || {}) };
      const tools = { ...(updatedInventory.tools || {}) };

      if (item.category === 'drug' && drugs[item.id] && drugs[item.id] > 0) {
        drugs[item.id] -= 1;
        if (drugs[item.id] === 0) delete drugs[item.id];
        updatedInventory.drugs = drugs;
        found = true;
      } else if (item.category === 'weapon' && weapons[item.id] && weapons[item.id] > 0) {
        weapons[item.id] -= 1;
        if (weapons[item.id] === 0) delete weapons[item.id];
        updatedInventory.weapons = weapons;
        found = true;
      } else if (tools[item.id] && tools[item.id] > 0) {
        tools[item.id] -= 1;
        if (tools[item.id] === 0) delete tools[item.id];
        updatedInventory.tools = tools;
        found = true;
      }

      if (!found) {
        return {
          success: false,
          message: `ليس لديك هذه القطعة في مخزنك لبيعها لـ ${npc.name}!`,
          payout: 0
        };
      }

      await updateDoc(userRef, {
        cleanMoney: increment(payout),
        inventory: updatedInventory
      });

      return {
        success: true,
        message: `بعت "${item.name}" لـ ${npc.name} واستلمت ${payout.toLocaleString()} دولار كاش من محفظته!`,
        payout
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      return { success: false, message: 'فشلت عملية البيع', payout: 0 };
    }
  }

  // طلب سلفة مالية سريعة من الـ NPC الصديق
  public static async requestStreetLoan(
    profile: UserProfile,
    npc: NPCCharacter,
    amount: number
  ): Promise<{ success: boolean; message: string }> {
    if (npc.friendship < 45) {
      return {
        success: false,
        message: `${npc.name}: "ما انطي سلف لغريب! لما نصير صحبان وأخوة أتدلل بعيوني!"`
      };
    }

    if (npc.cash < amount) {
      return {
        success: false,
        message: `${npc.name}: "والله ما عندي هذا المبلغ هسة، كاشي كدامك ${npc.cash.toLocaleString()}$!"`
      };
    }

    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        cleanMoney: increment(amount)
      });

      return {
        success: true,
        message: `${npc.name}: "تفضل هاي ${amount.toLocaleString()}$ سلفة من حزام ظهرك، لا تشيل هم رجعها لما ترتاح أمورك!"`
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      return { success: false, message: 'فشلت معالجة السلفة' };
    }
  }

  // تنفيذ نزال وعراك بين اللاعب وشخصية الـ NPC مع تدخل الحماية الحية إن وجدت
  public static async executeBrawlPunch(
    profile: UserProfile, 
    npc: NPCCharacter,
    activeProtector?: NPCCharacter | null
  ): Promise<{
    playerHitDamage: number;
    npcCounterDamage: number;
    updatedNpcHealth: number;
    npcKnockedOut: boolean;
    playerKnockedOut: boolean;
    rewardCash: number;
    playerCashLoss: number;
    message: string;
    witnessReportedPolice: boolean;
    protectorIntervenedText?: string;
  }> {
    // قوة ضربة اللاعب مستندة إلى عتاده وصالته الرياضية ومستواه + دعم الحماية
    const playerStrength = (profile.gymStats?.strength || 10) + ((profile.level || 1) * 3);
    let playerHitDamage = Math.floor(Math.random() * 25) + 22 + Math.floor(playerStrength * 0.4);

    let protectorIntervenedText: string | undefined = undefined;
    if (activeProtector && activeProtector.id !== npc.id) {
      const bonusDmg = activeProtector.protectionBonus.counterDamageBonus;
      playerHitDamage += bonusDmg;
      protectorIntervenedText = `حمايتك ${activeProtector.name} سدد لكمة داعمة (+${bonusDmg} ضرر)!`;
    }

    const updatedNpcHealth = Math.max(0, npc.health - playerHitDamage);
    const npcKnockedOut = updatedNpcHealth === 0;

    let npcCounterDamage = 0;
    let playerKnockedOut = false;
    let rewardCash = 0;
    let playerCashLoss = 0;
    let witnessReportedPolice = false;

    const userRef = doc(db, 'users', profile.uid);

    if (npcKnockedOut) {
      // فوز اللاعب وسقوط الـ NPC وأخذ جزء حقيقي من محفظته
      rewardCash = Math.min(npc.cash, Math.floor(Math.random() * (npc.cash * 0.4)) + 5000);
      
      // احتمال بلاغ شهود على الشجار للشرطة (30% فرصة)
      witnessReportedPolice = Math.random() < 0.30;
      const currentStars = profile.wantedStars || 0;
      const newStars = witnessReportedPolice ? Math.min(5, currentStars + 1) : currentStars;

      await updateDoc(userRef, {
        cleanMoney: increment(rewardCash),
        wantedStars: newStars,
        wanted: newStars > 0
      });

      const winBark = IRAQI_DIALOGUES[npc.personality].onLose[Math.floor(Math.random() * IRAQI_DIALOGUES[npc.personality].onLose.length)];
      return {
        playerHitDamage,
        npcCounterDamage: 0,
        updatedNpcHealth: 0,
        npcKnockedOut: true,
        playerKnockedOut: false,
        rewardCash,
        playerCashLoss: 0,
        message: `سددت لكمة حاسمة (${playerHitDamage} ضرر) وأسقطت ${npc.name} أرضاً! وغنمت من محفظته ${rewardCash.toLocaleString()} دولار! الـ NPC: "${winBark}"`,
        witnessReportedPolice,
        protectorIntervenedText
      };
    } else {
      // رد الضربة من الـ NPC
      const baseNpcPower = (npc.aggression * 3.5) + Math.floor(Math.random() * 15);
      let effectiveCounterDamage = Math.max(6, Math.floor(baseNpcPower));

      // إذا كان لدى اللاعب حماية نشطة يمتص جزءاً من الضرر!
      if (activeProtector && activeProtector.id !== npc.id) {
        const absorbPercent = activeProtector.protectionBonus.damageAbsorption;
        const absorbed = Math.floor(effectiveCounterDamage * (absorbPercent / 100));
        effectiveCounterDamage = Math.max(3, effectiveCounterDamage - absorbed);
        protectorIntervenedText = (protectorIntervenedText ? protectorIntervenedText + ' · ' : '') + `حمايتك ${activeProtector.name} امتص ${absorbed} من ضرر الضربة!`;
      }

      npcCounterDamage = effectiveCounterDamage;
      const currentPlayerHealth = profile.health || 100;
      const newPlayerHealth = Math.max(0, currentPlayerHealth - npcCounterDamage);

      if (newPlayerHealth === 0) {
        playerKnockedOut = true;
        playerCashLoss = Math.min(profile.cleanMoney || 0, Math.floor(Math.random() * 15000) + 3000);

        await updateDoc(userRef, {
          health: 20,
          cleanMoney: increment(-playerCashLoss),
          hospitalizedUntil: Date.now() + (60 * 1000)
        });

        const loseBark = IRAQI_DIALOGUES[npc.personality].onWin[Math.floor(Math.random() * IRAQI_DIALOGUES[npc.personality].onWin.length)];
        return {
          playerHitDamage,
          npcCounterDamage,
          updatedNpcHealth,
          npcKnockedOut: false,
          playerKnockedOut: true,
          rewardCash: 0,
          playerCashLoss,
          message: `سددت ${playerHitDamage} ضرر، لكن ${npc.name} رد بضربة قاضية (${npcCounterDamage} ضرر) وأسقطك أرضاً! خسرت ${playerCashLoss.toLocaleString()} دولار. "${loseBark}"`,
          witnessReportedPolice: false,
          protectorIntervenedText
        };
      } else {
        await updateDoc(userRef, {
          health: newPlayerHealth
        });

        const hitBark = IRAQI_DIALOGUES[npc.personality].onFight[Math.floor(Math.random() * IRAQI_DIALOGUES[npc.personality].onFight.length)];
        return {
          playerHitDamage,
          npcCounterDamage,
          updatedNpcHealth,
          npcKnockedOut: false,
          playerKnockedOut: false,
          rewardCash: 0,
          playerCashLoss: 0,
          message: `أصبت ${npc.name} بضرر ${playerHitDamage}، وتلقيت رداً بقيمة ${npcCounterDamage}! "${hitBark}"`,
          witnessReportedPolice: false,
          protectorIntervenedText
        };
      }
    }
  }

  // تشغيل لعبة رهان سريعة ومباشرة مع محفظة الـ NPC الحية
  public static async executeStreetBet(
    profile: UserProfile, 
    npc: NPCCharacter, 
    betAmount: number, 
    choice: 'heads' | 'tails'
  ): Promise<{ won: boolean; amountWon: number; amountLost: number; message: string }> {
    const available = profile.cleanMoney || 0;
    if (available < betAmount) {
      return { won: false, amountWon: 0, amountLost: 0, message: 'رصيدك غير كافٍ لهذا الرهان!' };
    }

    if (npc.cash < betAmount) {
      return { 
        won: false, 
        amountWon: 0, 
        amountLost: 0, 
        message: `${npc.name}: "محفظتي ما تكفي هذا الرهان الضخم! عندي بس ${npc.cash.toLocaleString()}$ كاش!"` 
      };
    }

    const roll = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = roll === choice;
    const userRef = doc(db, 'users', profile.uid);

    if (won) {
      await updateDoc(userRef, {
        cleanMoney: increment(betAmount)
      });
      const resultText = roll === 'heads' ? 'طرة' : 'كتبة';
      return {
        won: true,
        amountWon: betAmount,
        amountLost: 0,
        message: `النتيجة طلعت ${resultText}! فزت بالرهان وكسبت ${betAmount.toLocaleString()} دولار كاش من جيب ${npc.name}!`
      };
    } else {
      await updateDoc(userRef, {
        cleanMoney: increment(-betAmount)
      });
      const resultText = roll === 'heads' ? 'طرة' : 'كتبة';
      return {
        won: false,
        amountWon: 0,
        amountLost: betAmount,
        message: `النتيجة طلعت ${resultText}! حظ أوفر، خسرت ${betAmount.toLocaleString()} دولار أخذها ${npc.name} لمحفظته!`
      };
    }
  }

  // إبلاغ الشرطة وربطه بنظام الشرطة الذكي والمداهمات
  public static async reportToPolice(
    npc: NPCCharacter, 
    profile: UserProfile, 
    reporter: 'npc' | 'player'
  ): Promise<{ success: boolean; message: string; raidTriggered: boolean }> {
    const userRef = doc(db, 'users', profile.uid);

    if (reporter === 'npc') {
      // الـ NPC يبلغ الشرطة عن اللاعب بسبب الشجار أو كثرة المشاكل
      const currentStars = profile.wantedStars || 0;
      const newStars = Math.min(5, currentStars + 1);

      try {
        await updateDoc(userRef, {
          wantedStars: newStars,
          wanted: true
        });
      } catch (err) {
        console.error(err);
      }

      // إطلاق حدث المداهمة التكتيكية الفورية في اللعبة
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('trigger-police-raid'));
      }

      return {
        success: true,
        raidTriggered: true,
        message: `صاح ${npc.name} بأعلى صوته بالشارع: "دوريااات النجدة! سيطرة 55 تعالوا هذا المطلوب المشبوه هنا!" ورفع عليك بلاغ رسمي، وانطلقت صفارات الإنذار لمداهمتك فوراً!`
      };
    } else {
      // اللاعب يبلغ الشرطة عن الـ NPC (كمخبر أو للتخلص من تهديده)
      try {
        // مكافأة أمنية صغيرة للاعب وخفض الشبهة
        await updateDoc(userRef, {
          cleanMoney: increment(25000)
        });
      } catch (err) {
        console.error(err);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('trigger-police-raid'));
      }

      return {
        success: true,
        raidTriggered: true,
        message: `اتصلت بالنجدة وبلغت عن أنشطة ${npc.name} وممنوعاته! داهمت المفرزة موقعه فوراً وصادرت جزءاً من بضاعته، وحصلت على مكافأة إخبارية قدرها 25,000 د.ع!`
      };
    }
  }

  // إعطاء مال وهدايا نقدية لـ NPC لرفع المودة والثقة والاحترام
  public static async giveCashGift(
    npc: NPCCharacter,
    profile: UserProfile,
    amount: number
  ): Promise<{ success: boolean; message: string; deltaAffection: number; deltaTrust: number; deltaRespect: number }> {
    if ((profile.cleanMoney || 0) < amount) {
      return {
        success: false,
        message: 'رصيدك لا يكفي لإعطاء هذه الهدية المالية!',
        deltaAffection: 0,
        deltaTrust: 0,
        deltaRespect: 0
      };
    }

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(-amount)
      });
    } catch (err) {
      console.error(err);
    }

    // حساب نسبة الزيادة بناءً على المبلغ
    const ratio = Math.min(30, Math.floor(amount / 25000));
    const deltaAffection = Math.min(35, 10 + ratio);
    const deltaTrust = Math.min(30, 8 + ratio);
    const deltaRespect = Math.min(25, 12 + ratio);

    let reaction = `ابتسم ${npc.name} وقال بلهجة عراقية: "رحم الله والديك يا معدل! كفو منك والله ما تقصر، هاية ما أنساها إلك دوم!"`;
    if (amount >= 500000) {
      reaction = `شهق ${npc.name} وانبهر: "شنو هاي يا ذهب صافي؟! نص مليون كاش بإيدي؟! وداعتك صرت أخو وعزيز وتاج راسي!"`;
    }

    return {
      success: true,
      message: reaction,
      deltaAffection,
      deltaTrust,
      deltaRespect
    };
  }

  // بيع بضاعة أو سيارة أو أسلحة من اللاعب إلى الـ NPC بالمال الحقيقي
  public static async sellPlayerItemToNPC(
    npc: NPCCharacter,
    profile: UserProfile,
    item: { id: string; name: string; category: string; price: number },
    sellPrice: number
  ): Promise<{ success: boolean; message: string }> {
    if (npc.cash < sellPrice) {
      return {
        success: false,
        message: `${npc.name}: "ماعندي سيولة تكفي اشتري ${item.name}! محفظتي بيها بس ${npc.cash.toLocaleString()} د.ع حالياً!"`
      };
    }

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(sellPrice)
      });
    } catch (err) {
      console.error(err);
    }

    return {
      success: true,
      message: `تمت الصفقة بنجاح! بعت [${item.name}] إلى ${npc.name} واستلمت ${sellPrice.toLocaleString()} د.ع كاش أضيفت لمحفظتك!`
    };
  }

  // إهداء عنصر حقيقي من مستودع ومخزن اللاعب إلى الـ NPC (سلاح، سيارات، هواتف، كمبيوترات، ممنوعات، أدوات...)
  public static async giftWarehouseItemToNPC(
    npc: NPCCharacter,
    profile: UserProfile,
    item: { id: string; name: string; category: string; price?: number }
  ): Promise<{
    success: boolean;
    message: string;
    reactionText: string;
    deltaAffection: number;
    deltaTrust: number;
    deltaRespect: number;
    deltaFriendship: number;
    deltaConflict: number;
  }> {
    const userRef = doc(db, 'users', profile.uid);

    // التحقق وخصم العنصر من مستودع اللاعب في قاعدة البيانات
    try {
      if (item.category === 'bikes') {
        await updateDoc(userRef, {
          'inventory.bikes': increment(-1)
        });
      } else {
        await updateDoc(userRef, {
          [`inventory.${item.category}.${item.id}`]: increment(-1)
        });
      }
    } catch (err) {
      console.error('Error decrementing warehouse item:', err);
    }

    // حساب نسبة الزيادة بالعلاقات بناءً على نوع وقيمة العنصر
    const isFemale = npc.gender === 'female';
    let deltaAffection = 25;
    let deltaTrust = 20;
    let deltaRespect = 30;
    let deltaFriendship = 35;
    let deltaConflict = -30;

    let reactionText = '';
    switch (item.category) {
      case 'cars':
        deltaAffection = 40;
        deltaTrust = 35;
        deltaRespect = 45;
        deltaFriendship = 45;
        deltaConflict = -45;
        reactionText = isFemale
          ? `شهقت ${npc.name} بانبهار عظيم: "فدوة لعينك يا بطل! أهديتني سيارة [${item.name}] من مستودعك؟! والله ما شفت أرجل ولا أكرم منك، هاي الوقفة ما أنساها طول عمري!"`
          : `صاح ${npc.name} ودمعت عيونه من الفرحة: "الله أكبر يا ذيب! سيارة [${item.name}] كاملة هدية إلي؟! وداعتك إنت مو بس صاحب، إنت ضلعي وحزام ظهري وتاج راسي للموت!"`;
        break;

      case 'weapons':
        deltaAffection = 30;
        deltaTrust = 25;
        deltaRespect = 40;
        deltaFriendship = 38;
        deltaConflict = -35;
        reactionText = isFemale
          ? `ابتسمت ${npc.name} بحماس وهي تعاين السلاح: "عاشت إيدك يا معدل! سلاح [${item.name}] من المستودع يخلي أي متعدي يحسب ألف حساب، كفو منك!"`
          : `هز ${npc.name} السلاح بصدر رحب: "يا حي الله الأصيل! [${item.name}] بيدي راح يحمينا ويقلب موازين الشارع، والله إنت السند الحقيقي!"`;
        break;

      case 'phones':
      case 'computers':
        deltaAffection = 32;
        deltaTrust = 30;
        deltaRespect = 35;
        deltaFriendship = 36;
        deltaConflict = -30;
        reactionText = isFemale
          ? `ابتسمت ${npc.name} وقالت بامتنان: "تسلم يا غالي! جهاز [${item.name}] راقي ويفيدنا جداً بالتواصل وتنسيق الشغل بأمان، مشكور من القلب!"`
          : `قال ${npc.name} بفرحة: "عاشت إيدك يا معلم! [${item.name}] جهاز ناري راح يسهل كل صفقاتنا وخططنا بالشارع، كفو والله!"`;
        break;

      case 'drugs':
        deltaAffection = 28;
        deltaTrust = 22;
        deltaRespect = 30;
        deltaFriendship = 32;
        deltaConflict = -25;
        reactionText = isFemale
          ? `أخذت ${npc.name} البضاعة بحذر وقالت: "هاي البضاعة تسوى ذهب بأزقة الشورجة، راح تشغلنا صفقات ممتازة، عاشت إيدك يا حبيب!"`
          : `ضحك ${npc.name} ودس البضاعة بجيبه: "الله يبيض وجهك! هاي البضاعة تسوى ملايين بالسوق السري، ما تقصر يا بعد روحي!"`;
        break;

      case 'armor':
        deltaAffection = 30;
        deltaTrust = 30;
        deltaRespect = 35;
        deltaFriendship = 35;
        deltaConflict = -30;
        reactionText = isFemale
          ? `شكرتك ${npc.name}: "سترة [${item.name}] أمان ودرع حقيقي بمداهمات الكرخ، تسلم وتعيش يا سند!"`
          : `لبس ${npc.name} الدرع وهو مرتاح: "عاشت إيدك! هذا الدرع ينقذ الروح بأي اشتباك مفاجئ، كفو منك يا خويي!"`;
        break;

      default:
        deltaAffection = 22;
        deltaTrust = 18;
        deltaRespect = 25;
        deltaFriendship = 28;
        deltaConflict = -20;
        reactionText = isFemale
          ? `ابتسمت ${npc.name} وقالت: "رحم الله والديك يا أصيل على [${item.name}]، هدية غالية من شخص عزيز!"`
          : `قال ${npc.name} بمحبة: "مشكور وما تقصر يا ذهب! هدية [${item.name}] على راسي وتزيد الخوة والمعزة بيناتنا!"`;
        break;
    }

    return {
      success: true,
      message: `تم إهداء [${item.name}] بنجاح من مستودعك الخاص إلى ${npc.name}!`,
      reactionText,
      deltaAffection,
      deltaTrust,
      deltaRespect,
      deltaFriendship,
      deltaConflict
    };
  }
}


