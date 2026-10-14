export type NPCPersonality = 
  | 'peaceful'      // 1. مسالم
  | 'social'        // 2. اجتماعي
  | 'aggressive'    // 3. عدواني
  | 'wealthy'       // 4. ثري
  | 'poor'          // 5. فقير
  | 'gambler'       // 6. مقامر
  | 'thief'         // 7. يحاول السرقة (نشال)
  | 'cautious'      // 8. حذر يخاف الشرطة
  | 'rebel'         // 9. متمرد يقاوم الاعتقال
  | 'worker';       // 10. يعمل ويجمع الأموال

export type NPCActivity = 
  | 'wandering'           // يتجول
  | 'working'             // يعمل
  | 'talking'             // يتحدث
  | 'trading'             // يتاجر
  | 'fighting'            // يقاتل
  | 'fleeing'             // يهرب
  | 'resting'             // يرتاح
  | 'police_interaction'  // يتفاعل مع الشرطة
  | 'bodyguarding';       // يقوم بمهام الحماية والسند

export type NPCMood = 
  | 'cheerful'    // رايق ومتونس
  | 'angry'       // معصب وعصبي
  | 'suspicious'  // شاكك ويتلفت
  | 'greedy'      // طماع ويدور مصالح
  | 'fearful'     // خايف من السيطرات
  | 'loyal';      // مخلص ووفي للاعب

export interface NPCInventoryItem {
  id: string;
  name: string;
  category: 'weapon' | 'drug' | 'tool' | 'luxury' | 'medical' | 'intel';
  categoryArabic: string;
  price: number;       // السعر الذي يبيع به الـ NPC للاعب
  buyPrice: number;    // السعر الذي يشتري به الـ NPC من اللاعب
  stock: number;
  desc: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface NPCCharacter {
  id: string;
  name: string;
  nickname: string;
  gender: 'male' | 'female';
  genderArabic: string;
  image: string;
  personality: NPCPersonality;
  personalityArabic: string;
  specialty: string;        // التخصص الدقيق في عالم الخفاء
  cash: number;             // المحفظة المالية الحقيقية الحية
  health: number;
  maxHealth: number;
  aggression: number;       // 1 to 10
  caution: number;          // 1 to 10
  intelligence: number;     // 1 to 10
  district: string;
  activity: NPCActivity;
  activityArabic: string;
  statusText: string;
  mood: NPCMood;
  moodArabic: string;
  x: number;                // نسبة التموضع الأفقي (5 - 95)
  y: number;                // نسبة التموضع العمودي (10 - 85)
  targetX?: number;
  targetY?: number;

  // نظام المقاييس الأربعة المتقدم للعلاقات
  affection: number;          // مقياس المودة (0 - 100)
  trust: number;              // مقياس الثقة (0 - 100)
  respect: number;            // مقياس الاحترام (0 - 100)
  conflict: number;           // مقياس الخلاف والعداوة (0 - 100)
  isKnockedOut?: boolean;     // هل هو مغمى عليه إثر شجار
  policeReportsCount?: number;// عدد البلاغات المرفوعة للشرطة

  // نظام الصداقة والعلاقات (0 - 100)
  friendship: number;
  friendshipRank: string;
  isHiredProtector: boolean;
  protectionBonus: {
    damageAbsorption: number;  // نسبة امتصاص ضرر الشجار (مثلاً 30%)
    counterDamageBonus: number;// بونص الضرر الإضافي في العراك
    raidDefense: number;       // مساعدة في تشتيت الشرطة
  };
  protectionCost: number;     // تكلفة الاستئجار أو مجاني إذا كان أخو وسند

  // نظام الهدايا المفضلة
  favoriteGifts: {
    type: 'cash' | 'weapon' | 'drug' | 'medical' | 'luxury' | 'tea';
    bonus: number;
    reactionText: string;
  }[];

  // مخزن البضائع المتنوعة والخاصة بكل شخصية
  uniqueInventory: NPCInventoryItem[];

  historyWithPlayer: {
    fights: number;
    trades: number;
    betsWon: number;
    betsLost: number;
    giftsReceived: number;
    timesProtected: number;
    policeReports: number;
    lastInteraction: number;
    affinity: number; // -100 to 100
  };
  recentEvents: string[];

  // سلف وقروض الشارع المتاحة من الشخصية
  loanAvailable: number;
  loanGranted: number;
}

export interface CityBuilding {
  id: string;
  name: string;
  district: string;
  type: 'commercial' | 'industrial' | 'residential' | 'entertainment' | 'infrastructure';
  x: number;       // percentage from left (0 - 100)
  y: number;       // percentage from top (0 - 100)
  width: number;   // percentage
  height: number;  // percentage
  purchasePrice: number;
  dailyRent: number;
  dailyRevenue: number;
  ownerType: 'player' | 'other_player' | 'npc' | 'unowned';
  ownerName: string;
  ownerId?: string;
  tenantName?: string;
  tenantId?: string;
  isRented: boolean;
  rentExpiresAt?: number;
  accumulatedRent: number;
  description: string;
  iconType: string;
  colorScheme: string;
}

export interface PoliceRaidEvent {
  id: string;
  timestamp: number;
  reason: string;
  officerName: string;
  detectedContraband: {
    id: string;
    name: string;
    count: number;
    category: 'drugs' | 'weapons' | 'tools';
    estimatedFine: number;
  }[];
  totalFine: number;
  requiredBribe: number;
  suspicionLevel: number;
}
