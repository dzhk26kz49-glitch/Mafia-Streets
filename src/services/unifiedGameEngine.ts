import { db } from '../lib/firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc, 
  collection, 
  addDoc, 
  increment, 
  serverTimestamp, 
  runTransaction 
} from 'firebase/firestore';
import { UserProfile, useAuthStore } from '../store/useAuthStore';
import { getActiveRolePerks, ActiveRolePerks } from '../lib/rolePerks';
import { getVIPMultiplier, getVIPCooldownReduction } from '../lib/vip';
import { soundEngine } from './soundEngine';
import { toast } from 'sonner';

export type GameCurrency = 'cleanMoney' | 'dirtyMoney' | 'bankBalance' | 'dirtyVaultBalance' | 'gold' | 'corruptionMoney';

export interface FinancialTransactionParams {
  uid: string;
  type: 'credit' | 'debit' | 'transfer';
  currency: GameCurrency;
  amount: number;
  category: 'crime' | 'trade' | 'property' | 'market' | 'bank' | 'heist' | 'reward' | 'hospital' | 'gym' | 'militia' | 'casino' | 'tax' | 'contract';
  description: string;
  source?: string;
  targetUid?: string;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

export interface InventoryChangeParams {
  uid: string;
  category: 'weapons' | 'cars' | 'armor' | 'drugs' | 'tools' | 'supplements' | 'antiques' | 'electronics';
  itemId: string;
  quantity: number;
  action: 'add' | 'remove';
  metadata?: Record<string, any>;
}

export interface CrimeResolutionParams {
  uid: string;
  crimeType: string;
  level: number;
  baseReward: number;
  baseSuccessChance: number;
  baseJailMinutes: number;
  wantedStarsOnSuccess?: number;
  wantedStarsOnFailure?: number;
}

export interface ConsolidatedEconomyModifiers {
  perks: ActiveRolePerks;
  vipMultiplier: number;
  vipCooldownReduction: number;
  propertyProfitMultiplier: number;
  marketDiscountPercent: number;
  crimeSuccessBonusPercent: number;
  attackPowerMultiplier: number;
  defenseMultiplier: number;
  smugglingProfitBonusPercent: number;
  bailDiscountPercent: number;
  prisonTimeReductionPercent: number;
  launderingBonusPercent: number;
}

export type GameEventType = 
  | 'TRANSACTION_EXECUTED'
  | 'INVENTORY_CHANGED'
  | 'CRIME_RESOLVED'
  | 'PROPERTY_PROFIT_COLLECTED'
  | 'TURF_INFLUENCE_CHANGED'
  | 'LEGAL_STATUS_CHANGED'
  | 'DAILY_REWARD_CLAIMED'
  | 'CONTRACT_PROGRESS';

export interface GameEvent {
  id: string;
  type: GameEventType;
  uid: string;
  timestamp: number;
  data: Record<string, any>;
}

type EventListener = (event: GameEvent) => void;

class UnifiedGameEngineService {
  private eventListeners: Map<GameEventType, Set<EventListener>> = new Map();
  private idempotencyLock: Map<string, number> = new Map();

  constructor() {
    // Clean up locks periodically
    if (typeof window !== 'undefined') {
      window.setInterval(() => {
        const now = Date.now();
        for (const [key, timestamp] of this.idempotencyLock.entries()) {
          if (now - timestamp > 60000) {
            this.idempotencyLock.delete(key);
          }
        }
      }, 30000);
    }
  }

  /**
   * Subscribe to game events across sectors
   */
  public subscribe(eventType: GameEventType, listener: EventListener): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(listener);

    return () => {
      this.eventListeners.get(eventType)?.delete(listener);
    };
  }

  /**
   * Emit game event to subscribers and log to activity
   */
  public emit(event: GameEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (err) {
          console.error(`Error in event listener for ${event.type}:`, err);
        }
      });
    }

    // Dispatch native DOM event for loose coupling
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mafia-game-event', { detail: event }));
    }
  }

  /**
   * Check idempotency lock to prevent duplicate submissions / double clicks
   */
  public checkAndAcquireLock(key: string, timeoutMs: number = 2000): boolean {
    const now = Date.now();
    const lastTime = this.idempotencyLock.get(key);
    if (lastTime && now - lastTime < timeoutMs) {
      return false; // locked
    }
    this.idempotencyLock.set(key, now);
    return true;
  }

  /**
   * Get consolidated modifiers from Role Perks, VIP level, and gang/district influence
   */
  public getConsolidatedModifiers(profile: UserProfile | null | undefined): ConsolidatedEconomyModifiers {
    const perks = getActiveRolePerks(profile);
    const vipMultiplier = getVIPMultiplier(profile?.vipLevel as any);
    const vipCooldownReduction = getVIPCooldownReduction(profile?.vipLevel as any);

    // Baseline multipliers
    let propertyProfitMultiplier = vipMultiplier * (1 + (perks.traderProfitBonusPercent / 100));
    let marketDiscountPercent = Math.min(50, perks.traderMarketDiscountPercent);
    let crimeSuccessBonusPercent = perks.thiefCrimeSuccessBonusPercent;
    let attackPowerMultiplier = 1 + (perks.bossAttackBonusPercent / 100) + (perks.crimAttackBonusPercent / 100);
    let defenseMultiplier = 1 + (perks.traderVaultProtectionPercent / 100);
    let smugglingProfitBonusPercent = perks.smugglerTradeProfitBonusPercent;
    let bailDiscountPercent = perks.bossImmunityBailPercent;
    let prisonTimeReductionPercent = perks.crimPrisonReductionPercent;
    let launderingBonusPercent = (perks.traderTaxDiscountPercent || 0);

    // Apply family management bonuses if active
    if (profile?.family?.wives?.length) {
      const activeWives = profile.family.wives;
      const totalEdu = activeWives.reduce((sum, w) => sum + (w.education || 0), 0);
      propertyProfitMultiplier += (totalEdu * 0.01); // Each education level adds +1%
    }

    return {
      perks,
      vipMultiplier,
      vipCooldownReduction,
      propertyProfitMultiplier,
      marketDiscountPercent,
      crimeSuccessBonusPercent,
      attackPowerMultiplier,
      defenseMultiplier,
      smugglingProfitBonusPercent,
      bailDiscountPercent,
      prisonTimeReductionPercent,
      launderingBonusPercent
    };
  }

  /**
   * Execute atomic financial transaction with idempotency and persistent ledger logging
   */
  public async executeFinancialTransaction(
    params: FinancialTransactionParams
  ): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    const { uid, type, currency, amount, category, description, source, targetUid, idempotencyKey, metadata } = params;

    if (amount <= 0 || isNaN(amount)) {
      return { success: false, error: 'المبلغ غير صالح' };
    }

    if (idempotencyKey) {
      const lockAcquired = this.checkAndAcquireLock(`fin_${uid}_${idempotencyKey}`, 2500);
      if (!lockAcquired) {
        return { success: false, error: 'العملية قيد المعالجة بالفعل، يرجى عدم تكرار الضغط.' };
      }
    }

    const userDocRef = doc(db, 'users', uid);

    try {
      const result = await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userDocRef);
        if (!userSnap.exists()) {
          throw new Error('حساب اللاعب غير موجود');
        }

        const userData = userSnap.data() as UserProfile;
        
        let currentBalance = 0;
        let updateField = '';

        if (currency === 'cleanMoney') {
          currentBalance = userData.cleanMoney || 0;
          updateField = 'cleanMoney';
        } else if (currency === 'dirtyMoney') {
          currentBalance = userData.dirtyMoney || 0;
          updateField = 'dirtyMoney';
        } else if (currency === 'bankBalance') {
          currentBalance = userData.bankBalance || 0;
          updateField = 'bankBalance';
        } else if (currency === 'dirtyVaultBalance') {
          currentBalance = userData.dirtyVaultBalance || 0;
          updateField = 'dirtyVaultBalance';
        } else if (currency === 'gold') {
          currentBalance = userData.gold || 0;
          updateField = 'gold';
        } else if (currency === 'corruptionMoney') {
          currentBalance = userData.militia?.resources?.corruptionMoney || 0;
          updateField = 'militia.resources.corruptionMoney';
        }

        if (type === 'debit' && currentBalance < amount) {
          throw new Error(`الرصيد غير كافٍ لإتمام العملية (المطلوب: ${amount}، المتوفر: ${currentBalance})`);
        }

        const delta = type === 'credit' ? amount : -amount;
        const newBalance = currentBalance + delta;

        // Perform balance update
        transaction.update(userDocRef, {
          [updateField]: newBalance
        });

        // If transfer to another user
        if (type === 'transfer' && targetUid) {
          const targetDocRef = doc(db, 'users', targetUid);
          const targetSnap = await transaction.get(targetDocRef);
          if (targetSnap.exists()) {
            transaction.update(targetDocRef, {
              [updateField]: increment(amount)
            });
          }
        }

        return newBalance;
      });

      // Log to unified transactions ledger
      try {
        await addDoc(collection(db, 'financial_ledger'), {
          uid,
          targetUid: targetUid || null,
          type,
          currency,
          amount,
          category,
          description,
          source: source || 'game_action',
          timestamp: serverTimestamp(),
          metadata: metadata || {}
        });
      } catch (logErr) {
        console.warn('Financial ledger logging warning:', logErr);
      }

      // Update local Zustand state safely
      const currentUser = useAuthStore.getState().profile;
      if (currentUser && currentUser.uid === uid) {
        const updateObj: any = {};
        if (currency === 'cleanMoney') updateObj.cleanMoney = result;
        else if (currency === 'dirtyMoney') updateObj.dirtyMoney = result;
        else if (currency === 'bankBalance') updateObj.bankBalance = result;
        else if (currency === 'dirtyVaultBalance') updateObj.dirtyVaultBalance = result;
        else if (currency === 'gold') updateObj.gold = result;

        useAuthStore.setState((state) => ({
          profile: state.profile ? { ...state.profile, ...updateObj } : null
        }));
      }

      // Emit transaction event
      this.emit({
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: 'TRANSACTION_EXECUTED',
        uid,
        timestamp: Date.now(),
        data: { currency, amount, type, category, newBalance: result, description }
      });

      return { success: true, newBalance: result };
    } catch (err: any) {
      console.error('Financial transaction error:', err);
      return { success: false, error: err.message || 'فشلت المعاملة المالية' };
    }
  }

  /**
   * Execute inventory update (purchase, sale, drop, or reward) atomically
   */
  public async executeInventoryChange(
    params: InventoryChangeParams
  ): Promise<{ success: boolean; newCount?: number; error?: string }> {
    const { uid, category, itemId, quantity, action, metadata } = params;

    if (quantity <= 0 || isNaN(quantity)) {
      return { success: false, error: 'الكمية غير صالحة' };
    }

    const userDocRef = doc(db, 'users', uid);

    try {
      const result = await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userDocRef);
        if (!userSnap.exists()) {
          throw new Error('حساب اللاعب غير موجود');
        }

        const userData = userSnap.data() as UserProfile;
        const inventory = userData.inventory || {
          cars: {},
          bikes: 0,
          weapons: {},
          drugs: {},
          armor: {},
          tools: {},
          supplements: {},
          antiques: 0,
          electronics: 0
        };

        const catData = (inventory as any)[category] || {};
        const currentCount = typeof catData === 'object' ? (catData[itemId] || 0) : (catData || 0);

        if (action === 'remove' && currentCount < quantity) {
          throw new Error(`الكمية المتوفرة في المخزن غير كافية (${currentCount})`);
        }

        const newCount = action === 'add' ? currentCount + quantity : currentCount - quantity;

        if (typeof catData === 'object') {
          const updatedCat = { ...catData, [itemId]: newCount };
          if (newCount <= 0 && action === 'remove') {
            delete updatedCat[itemId];
          }
          transaction.update(userDocRef, {
            [`inventory.${category}`]: updatedCat
          });
        } else {
          transaction.update(userDocRef, {
            [`inventory.${category}`]: newCount
          });
        }

        return newCount;
      });

      this.emit({
        id: `inv_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: 'INVENTORY_CHANGED',
        uid,
        timestamp: Date.now(),
        data: { category, itemId, quantity, action, newCount: result, metadata }
      });

      return { success: true, newCount: result };
    } catch (err: any) {
      console.error('Inventory change error:', err);
      return { success: false, error: err.message || 'فشلت معالجة المخزون' };
    }
  }

  /**
   * Resolve a crime or heist with unified role perks, rewards, and legal consequences
   */
  public async resolveCrime(
    profile: UserProfile,
    params: CrimeResolutionParams
  ): Promise<{
    success: boolean;
    reward: number;
    jailMinutes: number;
    wantedStarsDelta: number;
    message: string;
    isDoubleLoot?: boolean;
    evadedArrest?: boolean;
  }> {
    const { uid, crimeType, level, baseReward, baseSuccessChance, baseJailMinutes, wantedStarsOnSuccess = 0, wantedStarsOnFailure = 1 } = params;

    const modifiers = this.getConsolidatedModifiers(profile);

    // Calculate dynamic success chance
    let finalSuccessChance = baseSuccessChance;
    if (modifiers.crimeSuccessBonusPercent > 0) {
      finalSuccessChance = Math.min(0.95, finalSuccessChance * (1 + (modifiers.crimeSuccessBonusPercent / 100)));
    }

    const success = Math.random() < finalSuccessChance;

    if (success) {
      const baseRewardCalc = Math.floor(baseReward * (0.85 + Math.random() * 0.3));
      const levelMultiplier = 1 + ((profile.level || 1) * 0.05);
      let reward = Math.floor(baseRewardCalc * modifiers.vipMultiplier * levelMultiplier);

      let isDoubleLoot = false;
      if (modifiers.perks.thiefDoubleLootPercent > 0 && Math.random() < (modifiers.perks.thiefDoubleLootPercent / 100)) {
        reward *= 2;
        isDoubleLoot = true;
      }

      // Credit dirty money atomically
      await this.executeFinancialTransaction({
        uid,
        type: 'credit',
        currency: 'dirtyMoney',
        amount: reward,
        category: 'crime',
        description: `أرباح عملية إجرامية: ${crimeType}`,
        metadata: { crimeType, level, isDoubleLoot }
      });

      // Update reputation and crime counters
      const updates: any = {
        'crimes.theft': increment(1),
        reputation: increment(level * 100)
      };

      if (wantedStarsOnSuccess > 0) {
        updates.wantedStars = Math.min(5, (profile.wantedStars || 0) + wantedStarsOnSuccess);
        updates.wanted = true;
      }

      await updateDoc(doc(db, 'users', uid), updates);

      this.emit({
        id: `crime_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: 'CRIME_RESOLVED',
        uid,
        timestamp: Date.now(),
        data: { success: true, reward, crimeType, isDoubleLoot }
      });

      return {
        success: true,
        reward,
        jailMinutes: 0,
        wantedStarsDelta: wantedStarsOnSuccess,
        isDoubleLoot,
        message: `تم تنفيذ العملية بنجاح! تم كسب ${reward.toLocaleString()}$ أموال غير مشروعة.`
      };
    } else {
      // Calculate arrest and jail consequences
      let jailMinutes = baseJailMinutes;

      // Wanted stars amplifier
      const currentStars = profile.wantedStars || 0;
      if (currentStars >= 4) jailMinutes *= 1.5;
      else if (currentStars >= 2) jailMinutes *= 1.2;

      // Role mitigations
      if (profile.policeRank === 'Silver') jailMinutes *= 0.75;
      if (profile.policeRank === 'Bronze') jailMinutes *= 0.5;
      if (profile.policeRank === 'Diamond') jailMinutes = 0;

      if (modifiers.prisonTimeReductionPercent > 0) {
        jailMinutes *= Math.max(0.2, 1 - (modifiers.prisonTimeReductionPercent / 100));
      }

      // Thief alarm bypass evasion check
      const evadedArrest = modifiers.perks.thiefAlarmBypassPercent > 0 && Math.random() < (modifiers.perks.thiefAlarmBypassPercent / 100);
      
      const newStars = Math.min(5, currentStars + wantedStarsOnFailure);
      const updates: any = {
        wantedStars: newStars,
        wanted: true
      };

      if (!evadedArrest && jailMinutes > 0) {
        const jailEndMs = Date.now() + Math.ceil(jailMinutes * 60 * 1000);
        updates.isImprisoned = true;
        updates.jailTimeEnd = jailEndMs;
      }

      await updateDoc(doc(db, 'users', uid), updates);

      soundEngine.playPoliceSirenSound();

      this.emit({
        id: `crime_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: 'CRIME_RESOLVED',
        uid,
        timestamp: Date.now(),
        data: { success: false, crimeType, jailMinutes, evadedArrest, newStars }
      });

      return {
        success: false,
        reward: 0,
        jailMinutes: evadedArrest ? 0 : Math.ceil(jailMinutes),
        wantedStarsDelta: wantedStarsOnFailure,
        evadedArrest,
        message: evadedArrest 
          ? 'فشلت العملية ولكن بفضل مهارة تخطي أجهزة الإنذار تمكنت من الإفلات من قبضة الشرطة!'
          : `أطبقت دوريات الشرطة عليك وتم إيداعك السجن لمدة ${Math.ceil(jailMinutes)} دقيقة.`
      };
    }
  }

  /**
   * Advance active contracts when a matching activity is performed
   */
  public async progressRoleContracts(uid: string, actionCategory: string, count: number = 1): Promise<void> {
    const profile = useAuthStore.getState().profile;
    if (!profile || !profile.roleSkills?.contracts?.length) return;

    try {
      let updated = false;
      const updatedContracts = profile.roleSkills.contracts.map(c => {
        if (!c.completed && c.startedAt && c.category === actionCategory) {
          const newProgress = (c.currentCount || 0) + count;
          const isDone = newProgress >= (c.targetCount || 1);
          updated = true;
          return {
            ...c,
            currentCount: newProgress,
            completed: isDone
          };
        }
        return c;
      });

      if (updated) {
        await updateDoc(doc(db, 'users', uid), {
          'roleSkills.contracts': updatedContracts
        });

        useAuthStore.setState(state => ({
          profile: state.profile ? {
            ...state.profile,
            roleSkills: {
              ...state.profile.roleSkills,
              contracts: updatedContracts
            }
          } : null
        }));

        this.emit({
          id: `contract_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          type: 'CONTRACT_PROGRESS',
          uid,
          timestamp: Date.now(),
          data: { actionCategory, count }
        });
      }
    } catch (e) {
      console.warn('Failed to progress role contracts:', e);
    }
  }
}

export const UnifiedGameEngine = new UnifiedGameEngineService();
