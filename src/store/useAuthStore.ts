import { create } from 'zustand';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { toast } from 'sonner';
import { doc, getDoc, setDoc, onSnapshot, updateDoc, Timestamp, collection, query, where, getDocs, increment, serverTimestamp, writeBatch, getFirestore } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser, getRedirectResult } from 'firebase/auth';
import { googleProvider } from '../lib/firebase';
import i18n from '../i18n/config';
import { getRealisticAvatar, formatNumber, safeToMillis } from '../lib/utils';
import { MARKET_ITEMS } from '../lib/items';
import { ALL_PRODUCTS } from '../lib/mallItems';

export type Role = 'Boss' | 'Trader' | 'Thief' | 'Smuggler' | 'Criminal' | 'Admin' | 'Deputy' | 'Random';
export type Rank = 'None' | 'Silver' | 'Bronze' | 'Diamond';

export interface BuiltProperty {
  id: string;
  type: 'headquarters' | 'bank' | 'weapon_stash' | 'drug_factory' | 'safe_house' | 'laundromat' | 'garage' | 'casino' | 'hotel' | 'ammunition_factory';
  city: string;
  tileId: number;
  level: number;
  upgrades?: Record<string, number>;
  workers?: number;
  inventory?: Record<string, number>;
  lastProfitCollection?: number;
  managerId?: string; // ID of the family member managing this property
  lastAutomationRun?: number; // Timestamp of the last automation run
  activityLog?: string[]; // Log of recent activities
}

export interface GangMember {
  id: string;
  name: string;
  image: string;
  primaryWeapon: string | null;
  secondaryWeapon: string | null;
  armor: string | null;
  salary: number;
  power: number;
  health: number;
}

export type VisaType = 'None' | 'Classic' | 'Platinum' | 'Signature' | 'Infinite';

export interface Vehicle {
  id: string;
  name: string;
  image: string;
  armorLevel: number; // 0 to 5
  power: number;
}

export interface Crew {
  id: string;
  name: string;
  members: GangMember[]; // Up to 5
  vehicleId: string | null; // ID of the vehicle
}

export interface Guard {
  id: string;
  name: string;
  country: string;
  image: string;
  health: number;
  stats: { strength: number; endurance: number; speed: number; toughness: number };
  equipped: {
    weapon?: string | null;
    armor?: string | null;
    phone?: string | null;
    poison?: string | null;
    stimulant?: string | null;
  };
  salaryPaidUntil: number;
  assignedCarId?: string | null;
  isPlayer?: boolean;
  playerId?: string;
}

export interface ProtectionCar {
  id: string;
  carItemId: string;
  health: number;
  assignedGuards: string[];
}

export interface MilitiaSoldier {
  id: string;
  name: string;
  image: string;
  stats: {
    strength: number;
    speed: number;
    defense: number;
    endurance: number;
  };
  health: number;
  level: number;
  rank?: string;
  hasArmor?: boolean;
  hasWeapon?: boolean;
  isSpecialForces?: boolean;
  lastHealTime?: number;
  equipped?: {
    weapon?: string;
    armor?: string;
    clothing?: string;
  };
}

export interface MilitiaVehicle {
  id: string;
  itemId: string;
  health: number;
  lastMaintenance?: number;
}

export interface MilitiaSquad {
  id: string;
  name: string;
  leaderId: string; // ID of a soldier
  soldierIds: string[]; // Up to 4 other soldiers
  vehicleId: string | null;
  power: number;
}

export interface TrainingTask {
  id: string;
  type: 'train' | 'promote';
  soldierIds: string[];
  finishTime: number;
  stats?: {
    strength: number;
    speed: number;
    defense: number;
    endurance: number;
  };
  targetRank?: string;
  targetRankId?: string;
  isCompleted?: boolean;
}

export interface Militia {
  id: string;
  ownerId?: string;
  name: string;
  image: string;
  type: 'aggressive' | 'government' | 'external';
  leader?: {
    name: string;
    image: string;
  };
  generalId?: string;
  soldiers: MilitiaSoldier[];
  vehicles: MilitiaVehicle[];
  squads: MilitiaSquad[];
  trainingTasks?: TrainingTask[];
  resources: {
    corruptionMoney: number;
    gold: number;
    ammo: number;
    food: number;
    fuel: number;
    water: number;
    medicine: number;
  };
  lastConsumptionTime?: number;
  lastSalaryPaidTime?: number;
  lastAttackTime?: number;
  controlledResources: {
    oilFields: number;
    ports: number;
    extortion: number;
  };
  alliances?: string[];
  incomingRequests?: { fromUid: string, fromName: string, timestamp: number }[];
  outgoingRequests?: string[];
  supportLogs?: { type: string, amount: number, targetName?: string, fromName?: string, direction?: 'incoming' | 'outgoing', timestamp: number }[];
  attackLogs?: { targetName: string, result: 'win' | 'loss', loot?: any, timestamp: number }[];
  defenseLogs?: { attackerName: string, result: 'win' | 'loss', lost?: any, timestamp: number }[];
  controlPoints: {
    oilFields: { level: number; strength: number; lastAttack: number };
    ports: { level: number; strength: number; lastAttack: number };
    extortion: { level: number; strength: number; lastAttack: number };
  };
  operationLogs: {
    id: string;
    type: 'oilFields' | 'ports' | 'extortion' | 'ai_action' | 'ai_support';
    success: boolean;
    message?: string;
    reward?: any;
    losses?: any;
    timestamp: number;
  }[];
  aiSettings?: {
    founderAIEnabled: boolean;
    autoBuyResources: boolean;
    autoHealSoldiers: boolean;
    autoMaintainGear: boolean;
    autoRepairVehicles: boolean;
    autoTraining: boolean;
    autoBaseUpgrade: boolean;
    autoAttacks: boolean;
    lastAIAction: number;
    currentOrder: string;
    commandHistory: string[];
    fieldIntel: string;
  };
  inventory: {
    weapons: Record<string, number>;
    armor: Record<string, number>;
    clothing: Record<string, number>;
    equipment: Record<string, number>;
    logistics: Record<string, number>;
    vehicles: Record<string, number>;
    aircraft?: Record<string, number>;
    intelligence?: Record<string, number>;
    fortifications?: Record<string, number>;
  };
  gqh?: {
    level: number;
    image: string;
    hasCommCenter: boolean;
    facilities?: {
      intelligenceLevel: number;
      medicalLevel: number;
      logisticsLevel: number;
      trainingLevel: number;
    };
    founder?: {
      id: string;
      name: string;
      description: string;
      image: string;
    };
    stats?: {
      damageDealt: number;
      damageReceived: number;
      intelLevel: number;
    };
  };
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  email: string;
  role: Role;
  level: number;
  reputation: number;
  cleanMoney: number;
  dirtyMoney: number;
  dirtyVaultBalance?: number;
  bankBalance: number;
  gold?: number;
  country?: string;
  birthdate?: string;
  alias?: string;
  nickname?: string;
  motto?: string;
  visaCard?: {
    type: VisaType;
    number: string;
    issuedAt: number;
  };
  vipLevel?: 'silver' | 'gold' | 'diamond' | 'demon' | null;
  lastTravelAt?: number;
  travelingUntil?: number | null;
  documents?: {
    idCard?: boolean;
    passport?: boolean;
    driverLicense?: boolean;
    weaponLicense?: boolean;
    clearance?: boolean;
    license?: boolean;
    weapon?: boolean;
  };
  investments?: {
    amount: number;
    lastClaimed: number;
  };
  crimes: {
    theft: number;
    kills: number;
    operations: number;
  };
  equipped?: {
    weapon1?: string | null;
    weapon2?: string | null;
    armor?: string | null;
    vehicle?: string | null;
    stimulant?: string | null;
    poison?: string | null;
    phone?: string | null;
    sim?: string | null;
    hats?: string | null;
    glasses?: string | null;
    clothing?: string | null;
    shoes?: string | null;
    socks?: string | null;
    acc_head?: string | null;
    acc_neck?: string | null;
    acc_chest?: string | null;
    acc_arms?: string | null;
    acc_hands?: string | null;
    acc_waist?: string | null;
    acc_back?: string | null;
    acc_feet?: string | null;
    computer?: string | null;
    juggernaut?: string | null;
    // Legacy/Other
    hat?: string | null;
    jacket?: string | null;
    shirt?: string | null;
    pants?: string | null;
    tie?: string | null;
    accessory?: string | null;
  };
  health?: number;
  gymStats?: {
    strength: number;
    endurance: number;
    speed: number;
    toughness: number;
  };
  power?: number;
  defense?: number;
  mafiaRelationships?: Record<string, number>;
  gymLevel?: number;
  energy?: number;
  maxEnergy?: number;
  lastEnergyUpdate?: number;
  fatigue?: number;
  armorHealth?: number;
  heat?: number;
  wanted?: boolean;
  wantedStars?: number;
  bounty?: number;
  isImprisoned?: boolean;
  jailTimeEnd?: number | null;
  isBanned?: boolean;
  lastTrainAt?: number | null;
  hospitalizedUntil?: number | null;
  lastActive?: number;
  killedBy?: string | null;
  bloodType?: string;
  hasPrivateDoctor?: boolean;
  privateDoctorUntil?: number | null;
  hasPrivateSurgeryRoom?: boolean;
  hasPrivateAmbulance?: boolean;
  hasMedicalInsurance?: boolean;
  warrants?: boolean;
  policeRank?: Rank;
  govRank?: Rank;
  education?: number;
  lastEducationTime?: number;
  familyGymLevel?: number;
  lastFamilyGymTime?: number;
  managedPropertyId?: string;
  salary?: number;
  age?: number;
  phoneNumber?: string;
  phoneWallpaper?: string;
  savedOutfits?: { id: string; name: string; items: Record<string, string> }[];
  inventory?: {
    cars: Record<string, number>;
    bikes: number;
    weapons: Record<string, number>;
    drugs: Record<string, number>;
    transportedDrugs?: Record<string, number>;
    armor: Record<string, number>;
    tools: Record<string, number>;
    supplements?: Record<string, number>;
    phones?: Record<string, number>;
    sims?: Record<string, number>;
    computers?: Record<string, number>;
    gold?: number;
    antiques?: number;
    electronics?: number;
    labs?: Record<string, number>;
  };
  computerStatus?: {
    isOn: boolean;
    powerBoost: boolean;
    defenseBoost: boolean;
  };
  family?: {
    lastCollection?: number;
    wives: {
      id: string;
      name: string;
      image: string;
      age: number;
      traits: string[];
      traitKey?: string;
      country: string;
      countryKey?: string;
      assignedVehicleId?: string;
      education?: number;
      lastEducationTime?: number;
      gymLevel?: number;
      lastGymTime?: number;
      health: number;
      mood?: number;
      items?: string[];
      managedPropertyId?: string;
      salary?: number;
      seedIndex?: number;
      children: {
        id: string;
        name: string;
        image?: string;
        birthTimestamp: number;
        health: number;
        mood?: number;
        education?: number;
        lastEducationTime?: number;
        gymLevel?: number;
        lastGymTime?: number;
        traits?: string[];
        managedPropertyId?: string;
        salary?: number;
        gender: 'boy' | 'girl';
        seedIndex?: number;
        assignedVehicleId?: string;
        items?: string[];
      }[];
    }[];
  };
  familyFinances?: {
    income: number;
    expenses: number;
    lastUpdate: number;
  };
  agents?: string[];
  land?: Record<string, number>;
  ownedTiles?: Record<string, number[]>;
  builtProperties?: BuiltProperty[];
  hasPrivateJet?: boolean;
  crew?: GangMember[]; // Legacy
  crews?: Crew[]; // New crew system
  gangLevel?: number;
  gangId?: string;
  gangName?: string;
  gangRank?: string;
  gangColor?: string;
  gangRole?: 'leader' | 'underboss' | 'captain' | 'soldier' | 'recruit';
  lastTradeTime?: number;
  properties: string[];
  gangMembers: number;
  familyMembers: number;
  city: string;
  currentCity?: string; // Add this to fix Admin.tsx error
  vehicles: Vehicle[]; // Updated to Vehicle[]
  ministerRole?: string;
  nameChangeHistory?: number[];
  countryChangeHistory?: number[];
  welcomeMessageSeen?: boolean;
  lastDailyRewardClaim?: string;
  dailyRewardDay?: number;
  lastBigChestClaim?: string;
  lastSpinDate?: string;
  influence?: {
    type: 'silver' | 'bronze' | 'diamond';
    expiresAt: number;
  };
  createdAt: any;
  lastLoginAt: any;
  inSafeHouse?: boolean;
  gender?: 'male' | 'female';
  generatedAvatarUrl?: string;
  isAvatarPinned?: boolean;
  hasESim?: boolean;
  activeMission?: {
    type: string;
    targetId?: string;
    targetName: string;
    quantity?: number;
    reward: number;
    reputation?: number;
    status: 'pending' | 'accepted' | 'completed';
    missionText?: string;
    description?: string;
    characterId?: string;
    title?: string;
    successChance?: number;
  } | null;
  protection?: {
    guards: Guard[];
    cars: ProtectionCar[];
    lastUpkeepPaid?: number;
  };
  militia?: Militia | null;
  hasMilitia?: boolean;
  laundering?: {
    activeFrontId: string;
    fronts: Record<string, {
      owned: boolean;
      level: number;
      totalLaundered: number;
      lastLaunderedAt?: number;
    }>;
    history?: {
      id: string;
      frontId: string;
      frontName: string;
      dirtyAmount: number;
      cleanAmount: number;
      feeAmount: number;
      feePercent: number;
      timestamp: number;
    }[];
  };
}

interface AuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  loggingIn: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  createProfile: (role: Role, nickname: string) => Promise<void>;
  setWelcomeMessageSeen: () => Promise<void>;
  equipItem: (type: string, itemId: string) => Promise<void>;
  batchEquipItems: (items: { type: string; itemId: string }[]) => Promise<void>;
  saveOutfit: (name: string) => Promise<void>;
  deleteOutfit: (id: string) => Promise<void>;
  unequipItem: (type: string) => Promise<void>;
  takeDamage: (amount: number) => Promise<void>;
  heal: (cost: number) => Promise<void>;
  repairArmor: (cost: number) => Promise<void>;
  hirePrivateDoctor: () => Promise<void>;
  buySurgeryRoom: () => Promise<void>;
  buyAmbulance: () => Promise<void>;
  calculatePower: (profile: UserProfile) => number;
  calculateDefense: (profile: UserProfile) => number;
  calculateGuardsPower: (profile: UserProfile) => number;
  calculateGuardsDefense: (profile: UserProfile) => number;
  updateComputerStatus: (status: Partial<{ isOn: boolean; powerBoost: boolean; defenseBoost: boolean }>) => Promise<void>;
  train: (stat: 'strength' | 'endurance' | 'speed' | 'toughness', cost: number, energyCost: number, gain: number) => Promise<void>;
  useSupplement: (itemId: string) => Promise<void>;
  buyAndUseSupplement: (itemId: string) => Promise<void>;
  setInSafeHouse: (inSafeHouse: boolean) => Promise<void>;
  updateActiveMission: (mission: UserProfile['activeMission']) => Promise<void>;
  convertGoldToCorruptionMoney: (amount: number) => Promise<void>;
  customProducts: any[];
  overrides: Record<string, any>;
  processing: boolean;
  quotaExceeded: boolean;
  globalSettings: any | null;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateGlobalSettings: (settings: any) => Promise<void>;
  addAdminLog: (action: string, targetId: string, details: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  let unsubscribeProfile: (() => void) | null = null;
  let unsubscribeCustomProducts: (() => void) | null = null;
  let unsubscribeOverrides: (() => void) | null = null;
  let unsubscribeGlobalSettings: (() => void) | null = null;
  let syncTimeout: NodeJS.Timeout | null = null;
  let isSyncing = false;
  let hasSyncedPublicProfile = false;
  let quotaExceededInternal = false;

  onAuthStateChanged(auth, async (user) => {
    // Handle redirect result to catch any errors from signInWithRedirect
    getRedirectResult(auth).catch((error) => {
      console.error('Redirect login error:', error);
      if (error.code === 'auth/unauthorized-domain') {
        toast.error(i18n.t('errors.unauthorizedDomain') || 'Unauthorized domain.');
      } else {
        toast.error(i18n.t('errors.loginError') || 'Login failed.');
      }
    });

    if (user) {
      set({ user, loading: true, loggingIn: false });
      hasSyncedPublicProfile = false;

      // Listen to custom products
      if (!unsubscribeCustomProducts) {
        const q = query(collection(db, 'custom_products'));
        unsubscribeCustomProducts = onSnapshot(q, (snapshot) => {
          const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          set({ customProducts: products });
        }, (error) => {
          console.error("Error in custom_products snapshot:", error);
        });
      }

      // Listen to overrides
      if (!unsubscribeOverrides) {
        const q = query(collection(db, 'market_overrides'));
        unsubscribeOverrides = onSnapshot(q, (snapshot) => {
          const data: Record<string, any> = {};
          snapshot.docs.forEach(doc => {
            data[doc.id] = doc.data();
          });
          set({ overrides: data });
        }, (error) => {
          console.error("Error in market_overrides snapshot:", error);
        });
      }

      // Listen to Global Settings
      if (!unsubscribeGlobalSettings) {
        unsubscribeGlobalSettings = onSnapshot(doc(db, 'global_settings', 'main'), (docSnap) => {
          if (docSnap.exists()) {
            set({ globalSettings: docSnap.data() });
          } else {
            set({ globalSettings: null });
          }
        }, (error) => {
          console.error("Error in global_settings snapshot:", error);
        });
      }
      
      // If doc does not exist, it simply means this is a new player
      const targetUid = user.uid;
      const docRef = doc(db, 'users', targetUid);
      
      let lastSetTime = 0;
      unsubscribeProfile = onSnapshot(docRef, async (docSnap) => {
        if (docSnap.exists()) {
          const rawData = docSnap.data() as UserProfile;
          let data = { ...rawData, uid: targetUid };
          
          const now = Date.now();
          // Rate limit background calculation state updates to 2 times per second
          const shouldThrottle = now - lastSetTime < 500;
          
          // Energy & Fatigue Regeneration
          const lastUpdate = data.lastEnergyUpdate || now;
          const elapsedMinutes = Math.floor((now - lastUpdate) / (5 * 60 * 1000)); // 1 energy every 5 mins
          
          if (elapsedMinutes > 0) {
            const maxEnergy = data.maxEnergy || 100;
            const currentEnergy = data.energy || 0;
            const newEnergy = Math.min(maxEnergy, currentEnergy + elapsedMinutes);
            
            const fatigueReduction = elapsedMinutes * 2;
            const newFatigue = Math.max(0, (data.fatigue || 0) - fatigueReduction);

            data = {
              ...data,
              energy: newEnergy,
              fatigue: newFatigue,
              lastEnergyUpdate: now
            };
          }

          // Check for jail time expiration
          const jailTime = safeToMillis(data.jailTimeEnd);
          if (data.isImprisoned && jailTime && jailTime < Date.now()) {
            try {
              await updateDoc(docRef, {
                isImprisoned: false,
                jailTimeEnd: null
              });
              await updateDoc(doc(db, 'users_public', user.uid), {
                isImprisoned: false,
                jailTimeEnd: null
              });
              // The next snapshot will have the updated data
              return; 
            } catch (e) {
              console.error("Failed to release from jail:", e);
            }
          }

          // Check for hospitalization expiration & Automatic Healing
          const hospUntil = (data.hospitalizedUntil as any)?.toMillis?.() || data.hospitalizedUntil;
          if (data.city === 'hospital' && hospUntil) {
            const now = Date.now();
            if (now >= hospUntil) {
              try {
                await updateDoc(docRef, {
                  health: 100,
                  hospitalizedUntil: null,
                  killedBy: null,
                  city: 'baghdad'
                });
                return;
              } catch (e) {
                console.error("Failed to release from hospital:", e);
              }
            } else {
              // Calculate current health based on time remaining
              // Default: 2% per minute = 100% in 50 minutes
              // Private Doctor: 100% in 5 minutes (20% per minute)
              const remainingMinutes = (hospUntil - now) / 60000;
              const healingRate = data.hasPrivateDoctor ? 20 : 2;
              const currentHealth = Math.floor(100 - (remainingMinutes * healingRate));
              
              if (currentHealth !== data.health) {
                data = { ...data, health: Math.max(0, currentHealth) };
              }
            }
          }
          
          if (data.militia?.soldiers) {
            const now = Date.now();
            let changed = false;
            
            // Background Processing for Training Tasks
            if (data.militia.trainingTasks && data.militia.trainingTasks.length > 0) {
              const completedTasks = data.militia.trainingTasks.filter(t => t.finishTime <= now && !t.isCompleted);
              if (completedTasks.length > 0) {
                let updatedSoldiers = [...data.militia.soldiers];
                
                completedTasks.forEach(task => {
                  updatedSoldiers = updatedSoldiers.map(s => {
                    if (task.soldierIds.includes(s.id)) {
                      if (task.type === 'train' && task.stats) {
                        return {
                          ...s,
                          stats: {
                            strength: Math.min(100000, s.stats.strength + (task.stats.strength || 0)),
                            speed: Math.min(100000, s.stats.speed + (task.stats.speed || 0)),
                            defense: Math.min(100000, s.stats.defense + (task.stats.defense || 0)),
                            endurance: Math.min(100000, s.stats.endurance + (task.stats.endurance || 0))
                          }
                        };
                      } else if (task.type === 'promote' && task.targetRank) {
                        // Level up LVL with rank
                        return {
                          ...s,
                          rank: task.targetRank,
                          level: (s.level || 1) + 1,
                          stats: {
                            // Boost stats similarly to how they were boosted in handlePromoteSoldier
                            strength: Math.min(100000, Math.floor(s.stats.strength * 1.2)),
                            defense: Math.min(100000, Math.floor(s.stats.defense * 1.2)),
                            speed: Math.min(100000, Math.floor(s.stats.speed * 1.2)),
                            endurance: Math.min(100000, Math.floor(s.stats.endurance * 1.2))
                          }
                        };
                      }
                    }
                    return s;
                  });
                });

                const remainingTasks = data.militia.trainingTasks.filter(t => t.finishTime > now);
                
                try {
                  const batch = writeBatch(db);
                  
                  // Update user document
                  batch.update(docRef, {
                    'militia.soldiers': updatedSoldiers,
                    'militia.trainingTasks': remainingTasks
                  });
                  
                  // Update militia document if id exists
                  if (data.militia.id) {
                    const militiaRef = doc(db, 'militias', data.militia.id);
                    batch.update(militiaRef, {
                      soldiers: updatedSoldiers,
                      trainingTasks: remainingTasks
                    });
                  }
                  
                  await batch.commit();
                  return; // Next snapshot will have updated data
                } catch (e) {
                  console.error("Failed to process training tasks:", e);
                }
              }
            }

            // Healing Logic
            const updatedSoldiers = data.militia.soldiers.map(s => {
              const baseSoldier = {
                ...s,
                hasArmor: s.hasArmor || false,
                hasWeapon: s.hasWeapon || false
              };
              
              if (s.health < 100) {
                const lastHeal = s.lastHealTime || now;
                const elapsedMs = now - lastHeal;
                const healInterval = 5 * 60 * 1000; // 5 minutes for full heal
                
                if (elapsedMs >= 60000) { // Update every minute to reduce write frequency
                  const healAmount = (elapsedMs / healInterval) * 100;
                  if (healAmount >= 1) {
                    changed = true;
                    return {
                      ...baseSoldier,
                      health: Math.min(100, s.health + healAmount),
                      lastHealTime: now
                    };
                  }
                }
              }
              return baseSoldier;
            });

            // Consumption Logic: 10 units of food/water per soldier per hour
            // Directly using logistics inventory as the source of truth
            const inventory = data.militia.inventory || { 
              weapons: {}, 
              armor: {}, 
              clothing: {}, 
              equipment: {}, 
              logistics: {},
              vehicles: {} 
            };
            const logistics: Record<string, number> = { ...(inventory.logistics || {}) };
            
            let corruptionMoney = Number(data.militia.resources?.corruptionMoney || 0);
            let foodUnits = Number(logistics.m_log_6 || 0);
            let waterUnits = Number(logistics.m_log_7 || 0);
            let ammoUnits = Number(logistics.m_log_4 || 0);
            let fuelUnits = Number(logistics.m_log_5 || 0);
            let medicineUnits = Number(logistics.m_log_3 || 0);

            const lastCons = data.militia.lastConsumptionTime || now;
            const elapsedConsMs = now - lastCons;
            
            if (elapsedConsMs >= 60000) { // Check every minute
              const soldierCount = data.militia.soldiers.length;
              
              // Consumption: 10 units of food/water per soldier per hour
              const consumptionPerSoldierPerHour = 10;
              const totalConsumptionPerHour = soldierCount * consumptionPerSoldierPerHour;
              const hourMs = 60 * 60 * 1000;
              const consumptionUnitsThisPeriod = (elapsedConsMs / hourMs) * totalConsumptionPerHour;
              
              if (consumptionUnitsThisPeriod > 0) {
                logistics.m_log_6 = Math.max(0, foodUnits - consumptionUnitsThisPeriod);
                logistics.m_log_7 = Math.max(0, waterUnits - consumptionUnitsThisPeriod);
                
                // Update local unit variables
                foodUnits = logistics.m_log_6;
                waterUnits = logistics.m_log_7;
                
                data.militia.lastConsumptionTime = now;
                changed = true;
              }
            }

            // Sync back to main resource object for UI consumption
            data.militia.resources = {
                ...data.militia.resources,
                corruptionMoney: corruptionMoney,
                food: Math.floor(foodUnits),
                water: Math.floor(waterUnits),
                medicine: Math.floor(medicineUnits),
                ammo: Math.floor(ammoUnits),
                fuel: Math.floor(fuelUnits)
            };


            // 10-minute Random Attacks on Control Points
            const lastAttack = data.militia.lastAttackTime || now;
            const elapsedAttackMs = now - lastAttack;
            const attackInterval = 10 * 60 * 1000; // 10 minutes

            if (elapsedAttackMs >= attackInterval) {
              const controlPoints = data.militia.controlPoints || {
                oilFields: { level: 1, strength: 100, lastAttack: 0 },
                ports: { level: 1, strength: 100, lastAttack: 0 },
                extortion: { level: 1, strength: 100, lastAttack: 0 }
              };
              
              const types: ('oilFields' | 'ports' | 'extortion')[] = ['oilFields', 'ports', 'extortion'];
              const type = types[Math.floor(Math.random() * types.length)];
              const cp = controlPoints[type];
              
              // Calculate Militia Power
              let totalPower = data.militia.squads?.reduce((acc, s) => acc + (s.power || 0), 0) || 0;
              data.militia.soldiers.forEach(s => {
                totalPower += ((s.stats?.strength || 0) + (s.stats?.defense || 0)) * 0.1;
              });
              
              const requiredPower = (Number(cp.level) || 1) * 500;
              const success = totalPower > requiredPower * (0.8 + Math.random() * 0.4);
              const level = Number(cp.level) || 1;
              
              const newLog = {
                id: Math.random().toString(36).substring(7),
                type,
                success,
                timestamp: now,
                reward: success ? { 
                  corruptionMoney: Math.floor(level * 50000), 
                  ammo: level * 100 // 100 rounds
                } : null,
                losses: !success ? { 
                  soldiers: Math.floor(Math.random() * 2) 
                } : { 
                  ammo: level * 50 // 50 rounds
                }
              };

              if (success) {
                corruptionMoney += (newLog.reward?.corruptionMoney || 0);
                ammoUnits += (newLog.reward?.ammo || 0);
                logistics.m_log_4 = ammoUnits;
                controlPoints[type].level = (Number(controlPoints[type].level) || 1) + 0.1;
              } else {
                ammoUnits = Math.max(0, ammoUnits - (newLog.losses?.ammo || 0));
                logistics.m_log_4 = ammoUnits;
              }

              data.militia.operationLogs = [newLog, ...(data.militia.operationLogs || [])].slice(0, 50);
              data.militia.lastAttackTime = now;
              changed = true;
            }

            // Salary Logic
            const lastSalary = data.militia.lastSalaryPaidTime || now;
            const elapsedSalaryMs = now - lastSalary;
            const dayMs = 24 * 60 * 60 * 1000;
            
            if (elapsedSalaryMs >= 60000) {
              const soldierCount = data.militia.soldiers.length;
              const totalSalaryPerDay = soldierCount * 10000;
              const salaryThisPeriod = (elapsedSalaryMs / dayMs) * totalSalaryPerDay;
              
              if (salaryThisPeriod > 0) {
                corruptionMoney = Math.max(0, corruptionMoney - salaryThisPeriod);
                data.militia.lastSalaryPaidTime = now;
                changed = true;
              }
            }

            // Vehicle Damage
            const updatedVehicles = (data.militia.vehicles || []).map(v => {
              if (Math.random() > 0.98) {
                changed = true;
                return { ...v, health: Math.max(0, (v.health || 100) - (Math.floor(Math.random() * 2) + 1)) };
              }
              return v;
            });

            // Final sync of resources object for this frame
            if (changed) {
              const updatedMilitia = {
                ...data.militia,
                soldiers: updatedSoldiers,
                vehicles: updatedVehicles,
                inventory: {
                  ...inventory,
                  logistics,
                  vehicles: inventory.vehicles || {}
                },
                resources: {
                  ...data.militia.resources,
                  ammo: Math.floor(ammoUnits),
                  fuel: Math.floor(fuelUnits),
                  corruptionMoney,
                  gold: data.militia.resources?.gold || 0,
                  food: Math.floor(foodUnits),
                  water: Math.floor(waterUnits),
                  medicine: Math.floor(medicineUnits)
                },
                lastConsumptionTime: now,
                lastSalaryPaidTime: now,
                lastAttackTime: data.militia.lastAttackTime || now,
                controlPoints: data.militia.controlPoints || {
                  oilFields: { level: 1, strength: 100, lastAttack: 0 },
                  ports: { level: 1, strength: 100, lastAttack: 0 },
                  extortion: { level: 1, strength: 100, lastAttack: 0 }
                },
                operationLogs: data.militia.operationLogs || []
              };

              data = {
                ...data,
                militia: updatedMilitia
              };

              // NO AUTO-SYNC TO FIRESTORE HERE. 
              // We only update the local Zustand state.
              // This completely avoids background quota consumption.
            }
          }

          // Sync to users_public if needed (Debounced/Throttled)
          const wealth = (data.cleanMoney || 0) + (data.dirtyMoney || 0) + (data.bankBalance || 0) + (data.dirtyVaultBalance || 0);
          
          // Calculate real combat stats for public profile
          const realPower = get().calculatePower(data);
          const realDefense = get().calculateDefense(data);

          const currentPublicData = {
            uid: targetUid,
            displayName: data.displayName || 'Unknown',
            displayNameLower: (data.displayName || 'Unknown').toLowerCase(),
            photoURL: data.photoURL || null,
            level: data.level || 1,
            role: data.role || 'Criminal',
            reputation: data.reputation || 0,
            gangId: data.gangId || null,
            gangRole: data.gangRole || null,
            city: data.city || 'baghdad',
            wealth: wealth,
            kills: data.crimes?.kills || 0,
            hospitalizedUntil: data.hospitalizedUntil || null,
            createdAt: data.createdAt || null,
            ownedTiles: data.ownedTiles || {},
            isImprisoned: data.isImprisoned || false,
            jailTimeEnd: data.jailTimeEnd || null,
            wantedStars: data.wantedStars || 0,
            birthdate: data.birthdate || null,
            country: data.country || null,
            health: data.health || 100,
            phoneNumber: data.equipped?.sim || data.phoneNumber || null,
            hasESim: data.hasESim || false,
            inSafeHouse: data.inSafeHouse || false,
            defense: realDefense,
            power: realPower,
            equipped: data.equipped || {},
            militia: data.militia || null,
            hasMilitia: !!data.militia,
            lastActive: serverTimestamp()
          };
          
          const prevProfile = get().profile;
          const prevWealth = (prevProfile?.cleanMoney || 0) + (prevProfile?.dirtyMoney || 0) + (prevProfile?.bankBalance || 0) + (prevProfile?.dirtyVaultBalance || 0);
          
          // Only sync wealth if it changed significantly to prevent constant writes
          const wealthChangedSignificantly = Math.abs(prevWealth - wealth) > 1000000;

          const lastSyncTime = (window as any).lastPublicSync || 0;
          const minSyncInterval = 600000; // 10 minutes minimum between syncs for automated stats
          
          // Helper to check if equipped changed without JSON.stringify
          const hasEquippedChanged = () => {
            if (!prevProfile?.equipped || !currentPublicData.equipped) return prevProfile?.equipped !== currentPublicData.equipped;
            const keys1 = Object.keys(prevProfile.equipped);
            const keys2 = Object.keys(currentPublicData.equipped);
            if (keys1.length !== keys2.length) return true;
            for (const key of keys1) {
              if ((prevProfile.equipped as any)[key] !== (currentPublicData.equipped as any)[key]) return true;
            }
            return false;
          };

          const isCriticalChange = prevProfile?.displayName !== currentPublicData.displayName ||
                                  prevProfile?.role !== currentPublicData.role ||
                                  prevProfile?.militia?.name !== currentPublicData.militia?.name ||
                                  prevProfile?.hasMilitia !== currentPublicData.hasMilitia ||
                                  prevProfile?.gangId !== currentPublicData.gangId ||
                                  prevProfile?.isImprisoned !== currentPublicData.isImprisoned ||
                                  prevProfile?.jailTimeEnd !== currentPublicData.jailTimeEnd ||
                                  prevProfile?.wantedStars !== currentPublicData.wantedStars;

          const needsSync = !hasSyncedPublicProfile || 
              isCriticalChange ||
              (now - lastSyncTime > minSyncInterval && (
                prevProfile?.photoURL !== currentPublicData.photoURL ||
                prevProfile?.level !== currentPublicData.level ||
                prevProfile?.reputation !== currentPublicData.reputation ||
                prevProfile?.city !== currentPublicData.city ||
                wealthChangedSignificantly ||
                prevProfile?.hospitalizedUntil !== currentPublicData.hospitalizedUntil ||
                prevProfile?.crimes?.kills !== currentPublicData.kills ||
                prevProfile?.isImprisoned !== currentPublicData.isImprisoned ||
                prevProfile?.jailTimeEnd !== currentPublicData.jailTimeEnd ||
                prevProfile?.wantedStars !== currentPublicData.wantedStars ||
                prevProfile?.health !== currentPublicData.health ||
                prevProfile?.defense !== currentPublicData.defense ||
                prevProfile?.power !== currentPublicData.power ||
                hasEquippedChanged()
              ));

          if (needsSync && !isSyncing && !quotaExceededInternal) {
            if (syncTimeout) clearTimeout(syncTimeout);
            
            syncTimeout = setTimeout(async () => {
              if (isSyncing || quotaExceededInternal) return;
              isSyncing = true;
              try {
                await setDoc(doc(db, 'users_public', targetUid), currentPublicData, { merge: true });
                hasSyncedPublicProfile = true;
                (window as any).lastPublicSync = Date.now();
              } catch (e: any) {
                if (e.message?.includes('resource-exhausted') || e.code === 'resource-exhausted') {
                    console.warn("Quota exceeded for public sync - disabling background sync for session");
                    quotaExceededInternal = true;
                    set({ quotaExceeded: true });
                } else {
                    console.error("Failed to sync users_public:", e);
                }
              } finally {
                isSyncing = false;
              }
            }, 60000); // Debounce to 60 seconds
          }
          
          if (shouldThrottle) {
            set({ profile: data, loading: false });
          } else {
            lastSetTime = now;
            set({ profile: data, loading: false });
          }
        } else {
          // No profile found, handle auto-creation for founders/admins
          const adminEmails = [
            'imvu2024k@gmail.com',
            'soft4net2016@gmail.com',
            'disneydesign2016@gmail.com',
            'zoomnet5@gmail.com',
            'imvu2024d@gmail.com',
            'mx779969@gmail.com',
            'j7primemustafa@gmail.com'
          ];
          
          if (user?.email && adminEmails.includes(user.email)) {
            const founderName = user.email === 'soft4net2016@gmail.com' ? '𝑀𝓊𝓈𝓉𝒶𝒻𝒶' : 'Admin';
            get().createProfile('Admin', founderName).catch(console.error);
          } else {
            set({ profile: null, loading: false });
          }
        }
      }, (error) => {
        const errorMessage = (error instanceof Error ? error.message : String(error)) || '';
        if (errorMessage.includes('resource-exhausted') || errorMessage.includes('Quota limit exceeded') || errorMessage.includes('Quota exceeded') || errorMessage.includes('quota metric')) {
          quotaExceededInternal = true;
          set({ quotaExceeded: true, loading: false });
          toast.error('Firebase Quota Exceeded: تم بلوغ الحد اليومي المجاني للكتابة. يرجى الانتظار لحين إعادة التعيين.', {
            id: 'quota-error'
          });
          return;
        }
        set({ loading: false });
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      });
    } else {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      if (unsubscribeCustomProducts) {
        unsubscribeCustomProducts();
        unsubscribeCustomProducts = null;
      }
      if (unsubscribeOverrides) {
        unsubscribeOverrides();
        unsubscribeOverrides = null;
      }
      if (unsubscribeGlobalSettings) {
        unsubscribeGlobalSettings();
        unsubscribeGlobalSettings = null;
      }
      set({ user: null, profile: null, loading: false });
    }
  });

  return {
    user: null,
    profile: null,
    loading: true,
    loggingIn: false,
    customProducts: [],
    overrides: {},
    processing: false,
    quotaExceeded: false,
    globalSettings: null,
    login: async () => {
      const { loggingIn } = get();
      if (loggingIn) return;

      try {
        // Call popup first to maximize user gesture preservation in iframes
        const popupPromise = signInWithPopup(auth, googleProvider);
        set({ loggingIn: true });
        await popupPromise;
      } catch (error: any) {
        if (error.code === 'auth/popup-blocked') {
          // Don't log to console as error since we handle it gracefully in the UI
          // Set a custom error property so the UI can react
          throw new Error('POPUP_BLOCKED');
        }
        
        if (error.code === 'auth/popup-closed-by-user') {
          toast.info(i18n.t('errors.popupClosed') || 'تم إغلاق نافذة تسجيل الدخول');
        } else if (error.code === 'auth/unauthorized-domain' || error.message?.includes('unauthorized-domain')) {
          const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
          toast.error(`النطاق (${currentHost}) غير مصرح به في Firebase Auth. يرجى إضافته إلى Authorized Domains.`);
        } else if (error.code === 'auth/network-request-failed') {
          toast.error(i18n.t('errors.offline'));
        } else {
          console.warn("Login attempt result:", error?.code || error?.message);
          toast.error(i18n.t('errors.loginError'));
        }
      } finally {
        set({ loggingIn: false });
      }
    },
    logout: async () => {
      try {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        if (unsubscribeCustomProducts) {
          unsubscribeCustomProducts();
          unsubscribeCustomProducts = null;
        }
        if (unsubscribeOverrides) {
          unsubscribeOverrides();
          unsubscribeOverrides = null;
        }
        if (unsubscribeGlobalSettings) {
          unsubscribeGlobalSettings();
          unsubscribeGlobalSettings = null;
        }
        set({ user: null, profile: null, loading: false });
        await signOut(auth);
      } catch (error) {
        console.error("Logout failed:", error);
      }
    },
    createProfile: async (role: Role, nickname: string) => {
      const { user } = get();
      if (!user) return;

      const adminEmails = [
        'imvu2024k@gmail.com',
        'soft4net2016@gmail.com',
        'disneydesign2016@gmail.com',
        'zoomnet5@gmail.com'
      ];
      const isAdmin = adminEmails.includes(user.email || '');

      const validRoles: Role[] = ['Boss', 'Trader', 'Thief', 'Smuggler', 'Criminal'];
      let assignedRole: Role = role;

      if (role === 'Admin' && !isAdmin) {
        toast.error('ممنوع تعيين او اختيار رتبة (مدير) فقد صلاحيات المدير للعبة حصراً من لوحة الادارة');
        const randomIndex = Math.floor(Math.random() * validRoles.length);
        assignedRole = validRoles[randomIndex];
      }

      if (role === 'Random' || !role || (!validRoles.includes(role) && role !== 'Admin')) {
        if (isAdmin && role === 'Admin') {
          assignedRole = 'Admin';
        } else {
          const randomIndex = Math.floor(Math.random() * validRoles.length);
          assignedRole = validRoles[randomIndex];
        }
      }
      
      let requestedName = (isAdmin && assignedRole === 'Admin') ? '𝑀𝓊𝓈𝓉𝒶𝒻𝒶' : (nickname.trim() || user.displayName || 'Unknown Player');

      // Check if display name is already taken
      const nameQuery = query(collection(db, 'users_public'), where('displayName', '==', requestedName));
      const nameSnapshot = await getDocs(nameQuery);
      
      if (!nameSnapshot.empty) {
        // If it's an admin and '𝑀𝓊𝓈𝓉𝒶𝒻𝒶' is taken, try a unique variant or their nickname
        if (isAdmin && requestedName === '𝑀𝓊𝓈𝓉𝒶𝒻𝒶') {
          requestedName = nickname.trim() || user.displayName || `Admin_${user.uid.slice(0, 4)}`;
          // Re-check for the fallback name
          const fallbackQuery = query(collection(db, 'users_public'), where('displayName', '==', requestedName));
          const fallbackSnapshot = await getDocs(fallbackQuery);
          if (!fallbackSnapshot.empty) {
            // If even fallback is taken (unlikely), append UID
            requestedName = `${requestedName}_${user.uid.slice(0, 4)}`;
          }
        } else {
          throw new Error('هذا الاسم موجود بالفعل');
        }
      }

      const settingsDoc = await getDoc(doc(db, 'server_settings', 'backup'));
      const settingsData = settingsDoc.data();
      const startingMoney = settingsData?.startingMoney || 5000000;

      const newProfile: UserProfile = {
        uid: user.uid,
        displayName: requestedName,
        photoURL: user.photoURL || getRealisticAvatar(user.uid, 'male', 25),
        email: user.email || '',
        role: isAdmin && assignedRole === 'Admin' ? 'Admin' : assignedRole,
        level: 1,
        reputation: 0,
        cleanMoney: startingMoney, // Starting money: 5M
        dirtyMoney: 0, // Starting money: 0
        bankBalance: 0,
        investments: {
          amount: 0,
          lastClaimed: Date.now()
        },
        crimes: {
          theft: 0,
          kills: 0,
          operations: 0,
        },
        health: 100,
        gymStats: {
          strength: 0,
          endurance: 0,
          speed: 0,
          toughness: 0
        },
        gymLevel: 5,
        energy: 100,
        maxEnergy: 100,
        lastEnergyUpdate: Date.now(),
        fatigue: 0,
        heat: 0,
        wanted: false,
        wantedStars: 0,
        bounty: 0,
        isImprisoned: false,
        jailTimeEnd: null,
        warrants: false,
        policeRank: 'None',
        govRank: 'None',
        familyGymLevel: 0,
        lastFamilyGymTime: 0,
        equipped: {
          weapon1: null,
          weapon2: null,
          armor: null,
          vehicle: null,
          stimulant: null,
          hat: null,
          jacket: null,
          shirt: null,
          pants: null,
          tie: null,
          shoes: null,
          accessory: null,
        },
        inventory: { cars: {}, bikes: 0, weapons: {}, drugs: {}, transportedDrugs: {}, armor: {}, tools: {}, gold: 0, antiques: 0, electronics: 0, supplements: {}, labs: {} },
        family: { wives: [] },
        agents: [],
        land: { baghdad: 0, damascus: 0, beirut: 0, cairo: 0, dubai: 0 },
        ownedTiles: { baghdad: [], damascus: [], beirut: [], cairo: [], dubai: [] },
        builtProperties: [],
        crew: [],
        gangLevel: 1,
        properties: [],
        gangMembers: 0,
        familyMembers: 0,
        city: 'baghdad',
        vehicles: [],
        nameChangeHistory: [],
        countryChangeHistory: [],
        welcomeMessageSeen: false,
        createdAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
        hasESim: false,
        gender: 'male'
      };

      try {
        await setDoc(doc(db, 'users', user.uid), newProfile);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
      }
    },
    setWelcomeMessageSeen: async () => {
      const { profile } = get();
      if (!profile) return;
      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, { welcomeMessageSeen: true });
    },
    equipItem: async (type, itemId) => {
      const { profile } = get();
      if (!profile) return;
      const docRef = doc(db, 'users', profile.uid);
      
      const updates: any = {
        [`equipped.${type}`]: itemId
      };

      if (type === 'armor') {
        const armor = MARKET_ITEMS.armor.find(a => a.id === itemId);
        if (armor) {
          updates.armorHealth = armor.power;
        }
      }

      await updateDoc(docRef, updates);
    },
    batchEquipItems: async (items) => {
      const { profile } = get();
      if (!profile) return;
      const docRef = doc(db, 'users', profile.uid);
      
      const updates: any = {};
      items.forEach(({ type, itemId }) => {
        updates[`equipped.${type}`] = itemId;
        
        if (type === 'armor') {
          const armor = MARKET_ITEMS.armor.find(a => a.id === itemId);
          if (armor) {
            updates.armorHealth = armor.power;
          }
        }
      });

      await updateDoc(docRef, updates);
    },
    saveOutfit: async (name) => {
      const { profile } = get();
      if (!profile || !profile.equipped) return;
      const docRef = doc(db, 'users', profile.uid);
      
      const newOutfit = {
        id: Math.random().toString(36).substring(7),
        name,
        items: { ...profile.equipped }
      };

      const currentOutfits = profile.savedOutfits || [];
      await updateDoc(docRef, {
        savedOutfits: [...currentOutfits, newOutfit]
      });
    },
    deleteOutfit: async (id) => {
      const { profile } = get();
      if (!profile || !profile.savedOutfits) return;
      const docRef = doc(db, 'users', profile.uid);
      
      const updatedOutfits = profile.savedOutfits.filter(o => o.id !== id);
      await updateDoc(docRef, {
        savedOutfits: updatedOutfits
      });
    },
    unequipItem: async (type) => {
      const { profile } = get();
      if (!profile) return;
      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, {
        [`equipped.${type}`]: null
      });
    },
    takeDamage: async (amount) => {
      const { profile } = get();
      if (!profile) return;
      
      let newHealth = profile.health || 100;
      let newArmorHealth = profile.armorHealth || 0;

      if (newArmorHealth > 0) {
        if (newArmorHealth >= amount) {
          newArmorHealth -= amount;
        } else {
          const remainingDamage = amount - newArmorHealth;
          newArmorHealth = 0;
          newHealth = Math.max(0, newHealth - remainingDamage);
        }
      } else {
        newHealth = Math.max(0, newHealth - amount);
      }

      const docRef = doc(db, 'users', profile.uid);
      const updates: any = {
        health: newHealth,
        armorHealth: newArmorHealth
      };
      
      if (newHealth <= 0) {
        updates.city = 'hospital';
        updates.health = 0;
        // 0 to 100% in 50 minutes (2% per minute)
        updates.hospitalizedUntil = Date.now() + (50 * 60 * 1000);
      } else {
        // If they take damage but aren't hospitalized, we might still want to set a recovery time
        // but for now let's only hospitalize at 0 health or if they choose to enter.
      }
      
      await updateDoc(docRef, updates);
    },
    heal: async (cost) => {
      const { profile, processing } = get();
      if (!profile || processing) return;
      if (profile.cleanMoney < cost) {
        toast.error(i18n.t('common.insufficientFunds'));
        return;
      }
      set({ processing: true });
      const docRef = doc(db, 'users', profile.uid);
      try {
        await updateDoc(docRef, {
          health: 100,
          cleanMoney: increment(-cost),
          city: 'baghdad',
          hospitalizedUntil: null,
          killedBy: null
        });
        toast.success(i18n.t('hospital.healSuccess'));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      } finally {
        set({ processing: false });
      }
    },
    repairArmor: async (cost) => {
      const { profile, processing } = get();
      if (!profile || processing) return;
      
      const equippedArmor = MARKET_ITEMS.armor.find(a => a.id === profile.equipped?.armor);
      if (!equippedArmor) return;

      set({ processing: true });
      const docRef = doc(db, 'users', profile.uid);
      try {
        await updateDoc(docRef, {
          armorHealth: equippedArmor.power,
          cleanMoney: increment(-cost)
        });
        toast.success(i18n.t('properties.repairArmorSuccess'));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      } finally {
        set({ processing: false });
      }
    },
    hirePrivateDoctor: async () => {
      const { profile, processing } = get();
      if (!profile || processing) return;
      const cost = 100000000;
      if (profile.cleanMoney < cost) {
        toast.error(i18n.t('common.noMoney'));
        return;
      }
      set({ processing: true });
      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          hasPrivateDoctor: true,
          cleanMoney: increment(-cost)
        });
        toast.success(i18n.t('common.success'));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      } finally {
        set({ processing: false });
      }
    },
    buySurgeryRoom: async () => {
      const { profile, processing } = get();
      if (!profile || processing) return;
      const cost = 100000000;
      if (profile.cleanMoney < cost) {
        toast.error(i18n.t('common.noMoney'));
        return;
      }
      set({ processing: true });
      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          hasPrivateSurgeryRoom: true,
          cleanMoney: increment(-cost)
        });
        toast.success(i18n.t('common.success'));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      } finally {
        set({ processing: false });
      }
    },
    buyAmbulance: async () => {
      const { profile, processing } = get();
      if (!profile || processing) return;
      const cost = 10000000;
      if (profile.cleanMoney < cost) {
        toast.error(i18n.t('common.noMoney'));
        return;
      }
      set({ processing: true });
      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          hasPrivateAmbulance: true,
          cleanMoney: increment(-cost)
        });
        toast.success(i18n.t('common.success'));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      } finally {
        set({ processing: false });
      }
    },
    updateGlobalSettings: async (settings) => {
      const { profile } = get();
      if (!profile || profile.role !== 'Admin') return;
      const settingsRef = doc(db, 'global_settings', 'main');
      await setDoc(settingsRef, {
        ...settings,
        lastUpdated: Date.now(),
        updatedBy: profile.displayName
      }, { merge: true });
    },
    addAdminLog: async (action, targetId, details) => {
      const { profile } = get();
      if (!profile || profile.role !== 'Admin') return;
      const logRef = doc(collection(db, 'admin_logs'));
      await setDoc(logRef, {
        id: logRef.id,
        adminId: profile.uid,
        adminName: profile.displayName,
        action,
        targetId,
        details,
        timestamp: Date.now()
      });
    },
    calculatePower: (profile: UserProfile) => {
      if (!profile) return 0;
      const { customProducts = [], overrides = {} } = get();
      const combinedProducts = [...ALL_PRODUCTS, ...customProducts];
      
      let power = (profile.level || 1) * 10;
      
      // Base stats (Strength and Speed contribute to Attack)
      if (profile.gymStats) {
        power += (profile.gymStats.strength || 0) + 
                 (profile.gymStats.speed || 0);
      }

      // Add family gym strength (partial contribution to attack)
      const getGymStrengthGain = (level: number) => {
        const gains = [0, 10, 50, 100, 200, 500, 600, 700, 800, 900, 1500, 1600, 1700, 1800, 1900, 2500, 2600, 2770, 2800, 2900, 5000];
        return gains[level] || 0;
      };
      
      if (profile.familyGymLevel) {
        power += getGymStrengthGain(profile.familyGymLevel) * 0.5;
      }

      if (profile.family?.wives) {
        profile.family.wives.forEach(wife => {
          if (wife.gymLevel) {
            power += getGymStrengthGain(wife.gymLevel) * 0.25;
          }
          if (wife.children) {
            wife.children.forEach(child => {
              if (child.gymLevel) {
                power += getGymStrengthGain(child.gymLevel) * 0.15;
              }
            });
          }
        });
      }

      // Equipment (Weapons and Stimulants)
      if (profile.equipped) {
        if (profile.equipped.weapon1) {
          const w = MARKET_ITEMS.weapons.find(i => i.id === profile.equipped?.weapon1);
          if (w) power += overrides[w.id]?.power || w.power;
          else power += 50;
        }
        if (profile.equipped.weapon2) {
          const w = MARKET_ITEMS.weapons.find(i => i.id === profile.equipped?.weapon2);
          if (w) power += overrides[w.id]?.power || w.power;
          else power += 30;
        }
        if (profile.equipped.stimulant) {
          const s = MARKET_ITEMS.supplements.find(i => i.id === profile.equipped?.stimulant);
          if (s && s.power) power += overrides[s.id]?.power || s.power;
        }
        if (profile.equipped.poison) {
          const d = MARKET_ITEMS.drugs.find(i => i.id === profile.equipped?.poison);
          if (d && d.power) power += overrides[d.id]?.power || d.power;
        }
        if (profile.equipped.computer && profile.computerStatus?.isOn && profile.computerStatus?.powerBoost) {
          const computerId = profile.equipped.computer;
          const baseId = computerId.split('_')[0];
          const product = combinedProducts.find(p => p.id === computerId || p.id === baseId);
          if (product && product.power) {
            power += product.power;
          } else {
            const c = MARKET_ITEMS.computers.find(i => i.id === baseId || i.id === computerId);
            if (c) power += overrides[c.id]?.power || (c as any).power || 500;
            else power += 500;
          }
        }
      }

      // Add protection (guards attack)
      if (profile.protection && profile.protection.guards) {
        profile.protection.guards.forEach(guard => {
          // Base power per guard
          power += 1000;
          
          // Guard stats
          power += (guard.stats?.strength || 0) + (guard.stats?.speed || 0);
          
          if (guard.equipped?.weapon) {
            const w = MARKET_ITEMS.weapons.find(i => i.id === guard.equipped?.weapon);
            if (w) power += overrides[w.id]?.power || w.power;
          }
          if (guard.equipped?.stimulant) {
            const s = MARKET_ITEMS.supplements.find(i => i.id === guard.equipped?.stimulant);
            if (s && (s as any).power) power += overrides[s.id]?.power || (s as any).power;
          }
          if (guard.equipped?.poison) {
            const d = MARKET_ITEMS.drugs.find(i => i.id === guard.equipped?.poison);
            if (d && (d as any).power) power += overrides[d.id]?.power || (d as any).power;
          }
        });
      }
      
      return Math.floor(power);
    },
    calculateDefense: (profile: UserProfile) => {
      if (!profile) return 0;
      const { customProducts = [], overrides = {} } = get();
      const combinedProducts = [...ALL_PRODUCTS, ...customProducts];
      
      let defense = (profile.level || 1) * 10;

      // Base stats (Toughness and Endurance contribute to Defense)
      if (profile.gymStats) {
        defense += (profile.gymStats.toughness || 0) + 
                   (profile.gymStats.endurance || 0);
      }
      
      // Education
      if (profile.education) {
        defense += Math.min(profile.education * 1000, 5000);
      }
      
      if (profile.family?.wives) {
        profile.family.wives.forEach(wife => {
          if (wife.education) defense += Math.min(wife.education * 1000, 5000);
          if (wife.children) {
            wife.children.forEach(child => {
              if (child.education) defense += Math.min(child.education * 1000, 5000);
            });
          }
        });
      }

      // Equipment (Armor, Vehicle, Computer)
      if (profile.equipped) {
        if (profile.equipped.armor) {
          const a = MARKET_ITEMS.armor.find(i => i.id === profile.equipped?.armor);
          if (a) defense += overrides[a.id]?.power || a.power;
          else defense += 100;
        }
        if (profile.equipped.vehicle) {
          const v = MARKET_ITEMS.cars.find(i => i.id === profile.equipped?.vehicle);
          if (v) defense += overrides[v.id]?.power || v.power || 200;
          else defense += 200;
        }
        if (profile.equipped?.computer && profile.computerStatus?.isOn && profile.computerStatus?.defenseBoost) {
          const computerId = profile.equipped.computer;
          const baseId = computerId.split('_')[0];
          const product = combinedProducts.find(p => p.id === computerId || p.id === baseId);
          if (product && product.power) {
            defense += product.power;
          } else {
            const c = MARKET_ITEMS.computers.find(i => i.id === baseId || i.id === computerId);
            if (c) defense += overrides[c.id]?.power || (c as any).power || 500;
            else defense += 500;
          }
        }
      }

      // Add protection (guards defense and cars)
      if (profile.protection) {
        if (profile.protection.guards) {
          profile.protection.guards.forEach(guard => {
            // Base defense per guard
            defense += 1000;
            
            defense += (guard.stats?.toughness || 0) + (guard.stats?.endurance || 0);
            if (guard.equipped?.armor) {
              const a = MARKET_ITEMS.armor.find(i => i.id === guard.equipped?.armor);
              if (a) defense += overrides[a.id]?.power || a.power;
            }
          });
        }
        if (profile.protection.cars) {
          profile.protection.cars.forEach(car => {
            const c = MARKET_ITEMS.cars.find(i => i.id === car.carItemId);
            if (c) defense += overrides[c.id]?.power || c.power || 0;
          });
        }
      }
      
      return Math.floor(defense);
    },
    calculateGuardsPower: (profile: UserProfile) => {
      if (!profile || !profile.protection?.guards) return 0;
      const { overrides = {} } = get();
      let power = 0;
      profile.protection.guards.forEach(guard => {
        power += 1000; // Base
        power += (guard.stats?.strength || 0) + (guard.stats?.speed || 0);
        if (guard.equipped?.weapon) {
          const w = MARKET_ITEMS.weapons.find(i => i.id === guard.equipped?.weapon);
          if (w) power += overrides[w.id]?.power || w.power;
        }
        if (guard.equipped?.stimulant) {
          const s = MARKET_ITEMS.supplements.find(i => i.id === guard.equipped?.stimulant);
          if (s && (s as any).power) power += overrides[s.id]?.power || (s as any).power;
        }
        if (guard.equipped?.poison) {
          const d = MARKET_ITEMS.drugs.find(i => i.id === guard.equipped?.poison);
          if (d && (d as any).power) power += overrides[d.id]?.power || (d as any).power;
        }
      });
      return Math.floor(power);
    },
    calculateGuardsDefense: (profile: UserProfile) => {
      if (!profile || !profile.protection?.guards) return 0;
      const { overrides = {} } = get();
      let defense = 0;
      profile.protection.guards.forEach(guard => {
        defense += 1000; // Base
        defense += (guard.stats?.toughness || 0) + (guard.stats?.endurance || 0);
        if (guard.equipped?.armor) {
          const a = MARKET_ITEMS.armor.find(i => i.id === guard.equipped?.armor);
          if (a) defense += overrides[a.id]?.power || a.power;
        }
      });
      return Math.floor(defense);
    },
    updateComputerStatus: async (status) => {
      const { profile } = get();
      if (!profile) return;
      const docRef = doc(db, 'users', profile.uid);
      const currentStatus = profile.computerStatus || { isOn: false, powerBoost: false, defenseBoost: false };
      
      // If turning ON, also enable boosts if they were off
      let newStatus = { ...currentStatus, ...status };
      if (status.isOn === true) {
        newStatus.powerBoost = true;
        newStatus.defenseBoost = true;
      }

      await updateDoc(docRef, {
        computerStatus: newStatus
      });
    },
    train: async (stat, cost, energyCost, gain) => {
      const { profile, processing } = get();
      if (!profile || processing) return;

      const now = Date.now();
      const lastTrain = profile.lastTrainAt || 0;
      const cooldown = 10 * 1000; // 10 seconds
      
      if (now - lastTrain < cooldown) {
        const remaining = Math.ceil((cooldown - (now - lastTrain)) / 1000);
        toast.error(i18n.t('gym.cooldown', { seconds: remaining }));
        return;
      }

      if ((profile.cleanMoney || 0) < cost) {
        toast.error(i18n.t('common.insufficientFunds'));
        return;
      }

      const currentEnergy = profile.energy || 0;
      if (currentEnergy < energyCost) {
        toast.error(i18n.t('gym.insufficientEnergy'));
        return;
      }

      set({ processing: true });
      const docRef = doc(db, 'users', profile.uid);
      const currentStatValue = profile.gymStats?.[stat] || 0;
      const newStatValue = currentStatValue + gain;
      
      const totalStats = (profile.gymStats?.strength || 0) + 
                         (profile.gymStats?.endurance || 0) + 
                         (profile.gymStats?.speed || 0) + 
                         (profile.gymStats?.toughness || 0) + gain;
      
      const newGymLevel = Math.min(20, 5 + Math.floor(totalStats / 100));
      const newFatigue = Math.min(100, (profile.fatigue || 0) + 5);
      
      let healthUpdate = profile.health || 100;
      if (newFatigue > 80 && Math.random() > 0.5) {
        healthUpdate = Math.max(0, healthUpdate - 10);
        toast.warning(i18n.t('gym.overtrained'));
      }

      try {
        await updateDoc(docRef, {
          cleanMoney: increment(-cost),
          energy: increment(-energyCost),
          fatigue: newFatigue,
          health: healthUpdate,
          [`gymStats.${stat}`]: newStatValue,
          gymLevel: newGymLevel,
          lastEnergyUpdate: now,
          lastTrainAt: now
        });
        toast.success(i18n.t('gym.trainSuccess', { stat: i18n.t(`gym.stats.${stat}`) }));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      } finally {
        set({ processing: false });
      }
    },
    useSupplement: async (itemId) => {
      const { profile, processing } = get();
      if (!profile || !profile.inventory?.supplements || processing) return;

      const supplement = MARKET_ITEMS.supplements.find(s => s.id === itemId);
      if (!supplement) return;

      const quantity = profile.inventory.supplements[itemId] || 0;
      if (quantity <= 0) {
        toast.error(i18n.t('common.noItem'));
        return;
      }

      set({ processing: true });
      const docRef = doc(db, 'users', profile.uid);
      const newEnergy = Math.min(profile.maxEnergy || 100, (profile.energy || 0) + (supplement as any).energy);
      
      const newSupplements = { ...profile.inventory.supplements };
      if (newSupplements[itemId] > 1) {
        newSupplements[itemId] -= 1;
      } else {
        delete newSupplements[itemId];
      }

      try {
        await updateDoc(docRef, {
          energy: newEnergy,
          'inventory.supplements': newSupplements,
          lastEnergyUpdate: Date.now()
        });
        toast.success(i18n.t('gym.supplementSuccess', { name: supplement.name }));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      } finally {
        set({ processing: false });
      }
    },
    buyAndUseSupplement: async (itemId) => {
      const { profile, processing } = get();
      if (!profile || processing) return;

      const supplement = MARKET_ITEMS.supplements.find(s => s.id === itemId);
      if (!supplement) return;

      const currentQuantity = profile.inventory?.supplements?.[itemId] || 0;
      const docRef = doc(db, 'users', profile.uid);
      const now = Date.now();

      set({ processing: true });

      try {
        if (currentQuantity > 0) {
          // Use existing
          const newEnergy = Math.min(profile.maxEnergy || 100, (profile.energy || 0) + (supplement as any).energy);
          const newSupplements = { ...(profile.inventory?.supplements || {}) };
          if (newSupplements[itemId] > 1) {
            newSupplements[itemId] -= 1;
          } else {
            delete newSupplements[itemId];
          }

          await updateDoc(docRef, {
            energy: newEnergy,
            'inventory.supplements': newSupplements,
            lastEnergyUpdate: now
          });
          toast.success(i18n.t('gym.supplementSuccess', { name: supplement.name }));
        } else {
          // Buy and use
          if ((profile.cleanMoney || 0) < supplement.price) {
            toast.error(i18n.t('common.insufficientFunds'));
            return;
          }

          const newEnergy = Math.min(profile.maxEnergy || 100, (profile.energy || 0) + (supplement as any).energy);
          await updateDoc(docRef, {
            cleanMoney: increment(-supplement.price),
            energy: newEnergy,
            lastEnergyUpdate: now
          });
          toast.success(i18n.t('gym.boughtAndUsed', { name: supplement.name }));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      } finally {
        set({ processing: false });
      }
    },
    setInSafeHouse: async (inSafeHouse: boolean) => {
      const { profile } = get();
      if (!profile) return;
      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, { inSafeHouse });
    },
    updateProfile: async (data: Partial<UserProfile>) => {
      const { profile } = get();
      if (!profile) return;
      const docRef = doc(db, 'users', profile.uid);
      try {
        await updateDoc(docRef, data);
        set(state => ({
          profile: state.profile ? { ...state.profile, ...data } : null
        }));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      }
    },
    updateActiveMission: async (mission: UserProfile['activeMission']) => {
      const { profile } = get();
      if (!profile) return;
      const docRef = doc(db, 'users', profile.uid);
      try {
        await updateDoc(docRef, { activeMission: mission });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      }
    },
    convertGoldToCorruptionMoney: async (amount: number) => {
      const { profile, processing } = get();
      if (!profile || !profile.militia || processing) return;
      
      const playerGold = profile.gold || 0;
      if (playerGold < amount) {
        toast.error(i18n.t('common.noGold'));
        return;
      }
      
      set({ processing: true });
      const docRef = doc(db, 'users', profile.uid);
      try {
        const corruptionMoneyGain = amount * 100000;
        await updateDoc(docRef, {
          gold: increment(-amount),
          'militia.resources.corruptionMoney': increment(corruptionMoneyGain)
        });
        toast.success(`تم تحويل ${amount} ذهب إلى ${formatNumber(corruptionMoneyGain)} أموال فساد`);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      } finally {
        set({ processing: false });
      }
    }
  };
});

