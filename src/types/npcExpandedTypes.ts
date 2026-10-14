import { NPCCharacter } from './npcTypes';

// أنواع مهام الشحن والعمل لصالح اللاعب
export type DispatchMissionType = 
  | 'cargo_shipping'     // 1. شحن ونقل بضائع سرية
  | 'rent_collection'    // 2. تحصيل إيجارات وأموال السوق
  | 'police_scout'       // 3. رصد استخباري ومراقبة أمنية
  | 'warehouse_guard';   // 4. حراسة مستودعات وتأمين الشارع

export interface NPCWorkMission {
  id: string;
  type: DispatchMissionType;
  title: string;
  description: string;
  assignedNpcId: string;
  assignedNpcName: string;
  assignedNpcImage: string;
  startTime: number;
  durationSeconds: number;
  rewardCash: number;
  rewardReputation: number;
  successRate: number; // 0 - 100
  riskOfArrest: number; // 0 - 100
  cost: number;
  status: 'in_progress' | 'completed' | 'failed' | 'arrested';
  resultLog?: string;
}

// أنظمة الشراكة التجارية وتوليد الأرباح
export interface NPCPartnership {
  npcId: string;
  businessName: string;
  businessType: string;
  investedCapital: number;
  level: number;
  hourlyRevenue: number;
  accumulatedProfit: number;
  lastCollectedAt: number;
  startedAt: number;
  partnershipBonusText: string;
}

// عمليات ضد ومع اللاعبين الحقيقيين
export type PvPOperationType = 
  | 'sabotage_vehicle'    // تعطيل سيارة اللاعب
  | 'pickpocket_player'   // سرقة جزء من كاش اللاعب
  | 'police_snitch'       // بلاغ كيدي للشرطة لرفع نجوم المطلوبية
  | 'intel_spy'           // تجسس وكشف تفاصيل رصيد ومستودع اللاعب
  | 'friendly_aid';       // إرسال دعم وهدية للاعب صديق

export interface PvPOperation {
  id: string;
  type: PvPOperationType;
  executorNpcId: string;
  executorNpcName: string;
  targetPlayerUid: string;
  targetPlayerName: string;
  targetPlayerAvatar?: string;
  cost: number;
  startedAt: number;
  durationSeconds: number;
  status: 'pending' | 'success' | 'failed' | 'detected';
  rewardLoot?: number;
  message: string;
}

// عمليات السطو الكبرى
export type HeistTier = 'jewelry' | 'armored_truck' | 'black_market_vault';

export interface HeistPlan {
  id: HeistTier;
  title: string;
  subtitle: string;
  location: string;
  riskLevel: 'medium' | 'high' | 'extreme';
  baseLootMin: number;
  baseLootMax: number;
  requiredRoles: {
    roleId: 'leader' | 'driver' | 'stealth' | 'financier';
    roleName: string;
    description: string;
    recommendedPersonalities: string[];
  }[];
  prepCost: number;
}

export interface ActiveHeistCrew {
  heistId: HeistTier;
  assignments: Record<string, string>; // roleId -> npcId
  status: 'planning' | 'executing' | 'escaped' | 'busted';
  lootCollected?: number;
  outcomeText?: string;
  timestamp: number;
}

// سجن أزقة بغداد لعالم الخفاء للـ NPCs
export interface UndergroundPrisonInmate {
  id: string;
  npcId: string;
  npcName: string;
  npcImage: string;
  npcNickname: string;
  gender: 'male' | 'female';
  personality: string;
  personalityArabic: string;
  arrestReason: string;
  cellNumber: string;
  arrestedAt: number;
  sentenceMinutes: number; // مدة المحكومية بالدقائق
  bailAmount: number;      // مبلغ الكفالة للإفراج القانوني
  breakoutDifficulty: number; // صعوبة التهريب (0 - 100)
  inmateQuote: string;
}

// شجرة مهارات عالم الخفاء للاعب
export interface UndergroundSkill {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  costPerLevel: number;
  iconName: string;
  category: 'logistics' | 'heists' | 'negotiation' | 'combat' | 'stealth';
  effectDescription: string;
}
