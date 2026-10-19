import { doc, getDoc, setDoc, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../store/useAuthStore';
import { toast } from 'sonner';
import { soundEngine } from './soundEngine';

export type GlobalEventType = 
  | 'gold_shipment' 
  | 'bank_heist' 
  | 'weapons_drop' 
  | 'economic_crisis' 
  | 'black_market_surge' 
  | 'martial_law' 
  | 'gang_clash'
  | 'custom';

export interface ClaimRecord {
  uid: string;
  displayName: string;
  photoURL?: string;
  claimedAt: number;
}

export interface GlobalLiveEvent {
  id: string;
  title: string;
  description: string;
  type: GlobalEventType;
  rewardGold?: number;
  rewardCash?: number;
  rewardReputation?: number;
  startedAt: number;
  expiresAt: number;
  durationMinutes: number;
  claimedBy: string[]; // array of user UIDs
  claimedDetails?: ClaimRecord[];
  active: boolean;
  launchedBy?: string;
  isDailyAuto?: boolean;
}

export interface LiveEventSettings {
  autoDaily: boolean;
  intervalHours: number; // e.g. every 6 hours
  autoTimes?: string[]; // e.g. ['12:00', '18:00', '22:00']
  defaultDurationMinutes: number;
  defaultCash: number;
  defaultGold: number;
  lastAutoSpawn?: number;
}

export const PRESET_GLOBAL_EVENTS: {
  type: GlobalEventType;
  title: string;
  description: string;
  rewardCash: number;
  rewardGold: number;
  rewardReputation: number;
  defaultDuration: number;
  icon: string;
}[] = [
  {
    type: 'gold_shipment',
    title: 'هبوط شحنة سبائك ذهبية غير محروسة في الميناء! 🪙',
    description: 'تنافس مفتوح لأول من يصل ويستحوذ على الشحنة المهربة في أرصفة الميناء السرية بالعاصمة!',
    rewardCash: 1500000,
    rewardGold: 1000,
    rewardReputation: 150,
    defaultDuration: 30,
    icon: 'Coins'
  },
  {
    type: 'bank_heist',
    title: 'عملية سطو كبرى على خزينة البنك المركزي! 🏦',
    description: 'ثغرة أمنية في أنظمة الحماية لخزائن الاحتياطي النقدي! سارع لاقتحام النظام وتقاسم الغنائم المنهوبة!',
    rewardCash: 3000000,
    rewardGold: 500,
    rewardReputation: 250,
    defaultDuration: 20,
    icon: 'Building2'
  },
  {
    type: 'weapons_drop',
    title: 'هبوط طائرة شحن أسلحة ثقيلة بمدرج مهجور! 🛩️',
    description: 'صناديق ذخيرة ورشاشات عسكرية مهربة ألقيت في المنطقة المحرمة، بادر بالاستيلاء عليها وتأمين عتادك!',
    rewardCash: 2000000,
    rewardGold: 300,
    rewardReputation: 200,
    defaultDuration: 45,
    icon: 'Crosshair'
  },
  {
    type: 'economic_crisis',
    title: 'اضطراب مفاجئ وطفرة سيولة في أسواق العاصمة! 📈',
    description: 'حركة تداولات غير مسبوقة وضخ أموال في البورصة، مكافآت وتوزيعات أرباح فورية لكل من يتحرك الآن!',
    rewardCash: 1200000,
    rewardGold: 200,
    rewardReputation: 100,
    defaultDuration: 60,
    icon: 'TrendingUp'
  },
  {
    type: 'black_market_surge',
    title: 'موجة توريد حارقة في السوق السوداء والمزادات! 🏛️',
    description: 'دخول شحنات سرية ونادرة إلى أسواق التهريب، استفد من السيولة الموزعة وصفقات الغنائم المباشرة.',
    rewardCash: 800000,
    rewardGold: 400,
    rewardReputation: 120,
    defaultDuration: 40,
    icon: 'Flame'
  },
  {
    type: 'martial_law',
    title: 'إعلان الأحكام العرفية وحظر التجوال الأمني بالمدينة! 🚨',
    description: 'استنفار أمني ومطاردات شرسة في كل القطاعات! مكافأة سرية ضخمة لمن يخترق الحصار ويكسر حظر التجوال.',
    rewardCash: 2500000,
    rewardGold: 600,
    rewardReputation: 300,
    defaultDuration: 25,
    icon: 'ShieldAlert'
  },
  {
    type: 'gang_clash',
    title: 'معركة شوارع طاحنة بين كبار عائلات المافيا! ⚔️',
    description: 'اشتباكات ملحمية في الأحياء الجنوبية، تحرك لفرض السيطرة ونهب غنائم المعركة الميدانية!',
    rewardCash: 1800000,
    rewardGold: 350,
    rewardReputation: 350,
    defaultDuration: 35,
    icon: 'Swords'
  }
];

export class LiveEventsService {
  // Check or spawn an event automatically if daily auto is enabled
  public static async checkAndSpawnEvent(): Promise<GlobalLiveEvent | null> {
    try {
      const eventRef = doc(db, 'global_events', 'current');
      const snap = await getDoc(eventRef);
      const now = Date.now();

      if (snap.exists()) {
        const data = snap.data() as GlobalLiveEvent;
        if (data.active && data.expiresAt > now) {
          return {
            ...data,
            claimedBy: data.claimedBy || [],
            claimedDetails: data.claimedDetails || []
          };
        }
      }

      // Check settings to see if autoDaily is active
      const settingsRef = doc(db, 'global_events', 'settings');
      const settingsSnap = await getDoc(settingsRef);
      let autoDaily = true;
      let intervalHours = 6;
      let defaultDuration = 45;

      if (settingsSnap.exists()) {
        const s = settingsSnap.data() as LiveEventSettings;
        autoDaily = s.autoDaily ?? true;
        intervalHours = s.intervalHours || 6;
        defaultDuration = s.defaultDurationMinutes || 45;

        // If autoDaily is disabled, do not automatically launch
        if (!autoDaily) {
          return null;
        }

        // If an event was spawned recently within the interval, don't spawn
        if (s.lastAutoSpawn && (now - s.lastAutoSpawn < intervalHours * 3600 * 1000)) {
          return null;
        }
      }

      // Spawn a random preset event automatically
      const randomPreset = PRESET_GLOBAL_EVENTS[Math.floor(Math.random() * PRESET_GLOBAL_EVENTS.length)];
      const durationMs = defaultDuration * 60 * 1000;

      const newEvent: GlobalLiveEvent = {
        id: `auto_${randomPreset.type}_${now}`,
        title: randomPreset.title,
        description: randomPreset.description,
        type: randomPreset.type,
        rewardCash: randomPreset.rewardCash,
        rewardGold: randomPreset.rewardGold,
        rewardReputation: randomPreset.rewardReputation,
        startedAt: now,
        expiresAt: now + durationMs,
        durationMinutes: defaultDuration,
        claimedBy: [],
        claimedDetails: [],
        active: true,
        isDailyAuto: true,
        launchedBy: 'النظام التلقائي'
      };

      await setDoc(eventRef, newEvent);
      await setDoc(settingsRef, {
        autoDaily: true,
        intervalHours,
        defaultDurationMinutes: defaultDuration,
        lastAutoSpawn: now
      }, { merge: true });

      return newEvent;
    } catch (e) {
      console.error('Error checking global live events:', e);
      return null;
    }
  }

  // Admin Launch Custom/Preset Live Event
  public static async launchEvent(params: {
    title: string;
    description: string;
    type: GlobalEventType;
    rewardCash: number;
    rewardGold: number;
    rewardReputation: number;
    durationMinutes: number;
    adminName: string;
  }): Promise<GlobalLiveEvent> {
    const now = Date.now();
    const durationMs = Math.max(5, params.durationMinutes) * 60 * 1000;

    const newEvent: GlobalLiveEvent = {
      id: `live_${params.type}_${now}`,
      title: params.title,
      description: params.description,
      type: params.type,
      rewardCash: params.rewardCash,
      rewardGold: params.rewardGold,
      rewardReputation: params.rewardReputation,
      startedAt: now,
      expiresAt: now + durationMs,
      durationMinutes: params.durationMinutes,
      claimedBy: [],
      claimedDetails: [],
      active: true,
      launchedBy: params.adminName || 'الإدارة المركزية'
    };

    const eventRef = doc(db, 'global_events', 'current');
    await setDoc(eventRef, newEvent);

    try {
      soundEngine.playLevelUpSound();
    } catch (_) {}

    return newEvent;
  }

  // Admin Stop Active Live Event
  public static async stopEvent(): Promise<void> {
    const eventRef = doc(db, 'global_events', 'current');
    await updateDoc(eventRef, {
      active: false
    });
  }

  // Admin Extend Active Event Duration
  public static async extendEvent(additionalMinutes: number): Promise<void> {
    const eventRef = doc(db, 'global_events', 'current');
    const snap = await getDoc(eventRef);
    if (!snap.exists()) return;
    const current = snap.data() as GlobalLiveEvent;
    const newExpiresAt = Math.max(Date.now(), current.expiresAt) + additionalMinutes * 60 * 1000;
    const newDuration = (current.durationMinutes || 30) + additionalMinutes;
    await updateDoc(eventRef, {
      expiresAt: newExpiresAt,
      durationMinutes: newDuration,
      active: true
    });
  }

  // Admin Reset Claim List
  public static async resetClaims(): Promise<void> {
    const eventRef = doc(db, 'global_events', 'current');
    await updateDoc(eventRef, {
      claimedBy: [],
      claimedDetails: []
    });
  }

  // Save Settings for Daily / Automatic Event Triggering
  public static async saveSettings(settings: Partial<LiveEventSettings>): Promise<void> {
    const settingsRef = doc(db, 'global_events', 'settings');
    await setDoc(settingsRef, settings, { merge: true });
  }

  // Load Settings
  public static async getSettings(): Promise<LiveEventSettings> {
    const settingsRef = doc(db, 'global_events', 'settings');
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
      return snap.data() as LiveEventSettings;
    }
    return {
      autoDaily: true,
      intervalHours: 6,
      autoTimes: ['14:00', '20:00'],
      defaultDurationMinutes: 45,
      defaultCash: 1500000,
      defaultGold: 500
    };
  }

  // Player Claim Reward for active event
  public static async claimEventReward(event: GlobalLiveEvent, profile: UserProfile): Promise<boolean> {
    if (!profile) {
      toast.error('يجب تسجيل الدخول أولاً للمشاركة');
      return false;
    }

    if (!event || !event.active || event.expiresAt < Date.now()) {
      toast.error('انتهى وقت هذا الحدث المباشر!');
      return false;
    }

    const claimedList = event.claimedBy || [];
    if (claimedList.includes(profile.uid)) {
      toast.info('لقد قمت بالاستحواذ على مكافأة هذا الحدث مسبقاً!');
      return false;
    }

    try {
      const eventRef = doc(db, 'global_events', 'current');
      const userRef = doc(db, 'users', profile.uid);

      const claimRecord: ClaimRecord = {
        uid: profile.uid,
        displayName: profile.displayName || 'مقاتل',
        photoURL: profile.photoURL || undefined,
        claimedAt: Date.now()
      };

      const updatedClaimedBy = [...claimedList, profile.uid];
      const updatedDetails = [...(event.claimedDetails || []), claimRecord];

      const eventUpdates: any = {
        claimedBy: updatedClaimedBy,
        claimedDetails: updatedDetails
      };

      const userUpdates: any = {
        cleanMoney: increment(event.rewardCash || 500000)
      };
      if (event.rewardGold && event.rewardGold > 0) {
        userUpdates.gold = increment(event.rewardGold);
      }
      if (event.rewardReputation && event.rewardReputation > 0) {
        userUpdates.reputation = increment(event.rewardReputation);
      }

      await updateDoc(eventRef, eventUpdates);
      await updateDoc(userRef, userUpdates);

      soundEngine.playBlackMarketDealSound();
      
      const rewardsSummary: string[] = [];
      if (event.rewardCash) rewardsSummary.push(`$${event.rewardCash.toLocaleString()}`);
      if (event.rewardGold) rewardsSummary.push(`${event.rewardGold} ذهبة 🪙`);
      if (event.rewardReputation) rewardsSummary.push(`+${event.rewardReputation} سمعة ⭐`);

      toast.success(`🎉 تم الاستحواذ بنجاح! حصلت على: ${rewardsSummary.join(' + ')}!`);
      return true;
    } catch (e) {
      console.error(e);
      toast.error('فشل في استلام مكافأة الحدث');
      return false;
    }
  }
}
