import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../store/useAuthStore';
import { toast } from 'sonner';
import { soundEngine } from './soundEngine';

export interface GlobalLiveEvent {
  id: string;
  title: string;
  description: string;
  type: 'gold_shipment' | 'economic_crisis' | 'black_market_surge' | 'martial_law';
  rewardGold?: number;
  rewardCash?: number;
  startedAt: number;
  expiresAt: number;
  claimedBy: string[]; // array of user UIDs
  active: boolean;
}

export const PRESET_GLOBAL_EVENTS: Omit<GlobalLiveEvent, 'startedAt' | 'expiresAt' | 'claimedBy' | 'active'>[] = [
  {
    id: 'event_gold_shipment',
    title: 'هبوط شحنة سبائك ذهبية غير محروسة في الميناء! 🪙',
    description: 'تنافس مفتوح لأول من يصل ويستحوذ على الشحنة المهربة في أرصفة الميناء السرية!',
    type: 'gold_shipment',
    rewardGold: 1500,
    rewardCash: 1250000
  },
  {
    id: 'event_economic_crisis',
    title: 'أزمة اقتصادية في البورصة والأسواق! 📈',
    description: 'حركة تداولات غير مسبوقة، أرباح الشركات ومكاتب الصرافة تتضاعف بنسبة 100% (2x) خلال الساعة القادمة!',
    type: 'economic_crisis',
    rewardCash: 850000
  },
  {
    id: 'event_black_market_surge',
    title: 'موجة توريد كبرى في السوق السوداء والمزادات! 🏛️',
    description: 'تخفيضات وصفقات سريعة بنسبة 50% على أندر الأسلحة والسيارات المصفحة في السوق السوداء.',
    type: 'black_market_surge',
    rewardCash: 500000
  },
  {
    id: 'event_martial_law',
    title: 'إعلان الأحكام العرفية وحظر التجوال الأمني! 🚨',
    description: 'استنفار أمني شامل في العاصمة، مكافأة خاصة لمن ينجح في التسلل ومراوغة دوريات الشرطة.',
    type: 'martial_law',
    rewardCash: 600000
  }
];

export class LiveEventsService {
  // Check or spawn a global live event if none active
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
            claimedBy: data.claimedBy || []
          };
        }
      }

      // If expired or none exists, spawn a random event
      const randomPreset = PRESET_GLOBAL_EVENTS[Math.floor(Math.random() * PRESET_GLOBAL_EVENTS.length)];
      const durationMs = 1000 * 60 * 45; // 45 minutes active duration

      const newEvent: GlobalLiveEvent = {
        ...randomPreset,
        id: randomPreset.id + '_' + now,
        startedAt: now,
        expiresAt: now + durationMs,
        claimedBy: [],
        active: true
      };

      await setDoc(eventRef, newEvent);
      return newEvent;
    } catch (e) {
      console.error('Error checking global live events:', e);
      return null;
    }
  }

  // Claim reward for active event (e.g. Gold shipment race)
  public static async claimEventReward(event: GlobalLiveEvent, profile: UserProfile): Promise<boolean> {
    if (!profile) {
      toast.error('يجب تسجيل الدخول أولاً');
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

      const updatedClaimedBy = [...claimedList, profile.uid];

      const updates: any = {
        claimedBy: updatedClaimedBy
      };

      const userUpdates: any = {
        cleanMoney: increment(event.rewardCash || 500000)
      };
      if (event.rewardGold) {
        userUpdates.gold = increment(event.rewardGold);
      }

      await updateDoc(eventRef, updates);
      await updateDoc(userRef, userUpdates);

      soundEngine.playBlackMarketDealSound();
      toast.success(`🎉 تم الاستحواذ بنجاح! حصلت على ${event.rewardGold ? event.rewardGold + ' ذهبة' : ''} ${event.rewardCash ? event.rewardCash.toLocaleString() + ' كاش' : ''} من غنائم الحدث المباشر!`);
      return true;
    } catch (e) {
      console.error(e);
      toast.error('فشل في استلام مكافأة الحدث');
      return false;
    }
  }
}
