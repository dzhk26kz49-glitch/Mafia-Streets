import React, { useState, useEffect, useRef } from 'react';
import { 
  FlaskConical, Users, TrendingUp, ShoppingCart, ShieldAlert, 
  Plus, ArrowUpCircle, Timer, Zap, AlertTriangle, 
  Truck, Store, DollarSign, Briefcase, Microscope,
  ChevronRight, Info, Settings, Hammer, Trash2, Edit2, Star, UserCircle, Package
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore, Role } from '../store/useAuthStore';
import { doc, onSnapshot, updateDoc, increment, setDoc, serverTimestamp, arrayUnion, collection } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { MARKET_ITEMS } from '../lib/items';
import { formatMoney } from '../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

const LAB_LEVELS = [
  { level: 1, name: 'بدائي', cost: 0, speedMult: 1, volumeMult: 1, failureChance: 0.2 },
  { level: 2, name: 'متوسط', cost: 50000000, speedMult: 1.5, volumeMult: 1.5, failureChance: 0.15 },
  { level: 3, name: 'متقدم', cost: 250000000, speedMult: 2, volumeMult: 2, failureChance: 0.1 },
  { level: 4, name: 'احترافي', cost: 1000000000, speedMult: 3, volumeMult: 3, failureChance: 0.05 },
];

const STAFF_TYPES = {
  worker: { name: 'عامل', hireCost: 10000000, dailySalary: 100000, speedBonus: 0.1 },
  chemist: { name: 'كيميائي', hireCost: 50000000, dailySalary: 500000, qualityBonus: 0.1, riskReduction: 0.05 },
};

const MALE_NAMES = ['أحمد', 'محمد', 'علي', 'عمر', 'خالد', 'طارق', 'يوسف', 'حسن', 'حسين', 'مصطفى'];
const FEMALE_NAMES = ['فاطمة', 'مريم', 'سارة', 'نور', 'ليلى', 'زينب', 'هدى', 'منى', 'ياسمين', 'آية'];

const generateRandomStaff = (type: 'worker' | 'chemist') => {
  const isMale = Math.random() > 0.5;
  const gender = isMale ? 'male' : 'female';
  const nameList = isMale ? MALE_NAMES : FEMALE_NAMES;
  const name = nameList[Math.floor(Math.random() * nameList.length)] + ' ' + MALE_NAMES[Math.floor(Math.random() * MALE_NAMES.length)];
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    name,
    type,
    gender,
    experience: 1,
    imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}&gender=${gender}`
  };
};

const SUPERMARKET_COST = 100000000;
const LAUNDER_LIMIT_DAILY = 50000000; // 50M limit for laundering

export default function Labs() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [labData, setLabData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('manufacturing');
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [productionConfig, setProductionConfig] = useState<{item: any, amount: number} | null>(null);
  const [rawChemicalsAmount, setRawChemicalsAmount] = useState(1);
  const [launderAmount, setLaunderAmount] = useState(1000000);
  const [marketOverrides, setMarketOverrides] = useState<Record<string, any>>({});

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'market_overrides'), (snapshot) => {
      const data: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        data[doc.id] = doc.data();
      });
      setMarketOverrides(data);
    }, (error) => {
      console.error('Error fetching market overrides:', error);
    });
    return () => unsubscribe();
  }, []);

  const labItems = React.useMemo(() => {
    return MARKET_ITEMS.labs.map(item => {
      if (marketOverrides[item.id]) {
        return { ...item, ...marketOverrides[item.id] };
      }
      return item;
    });
  }, [marketOverrides]);

  const drugItems = React.useMemo(() => {
    return MARKET_ITEMS.drugs.map(item => {
      if (marketOverrides[item.id]) {
        return { ...item, ...marketOverrides[item.id] };
      }
      return item;
    });
  }, [marketOverrides]);

  const isInitializingLab = useRef(false);

  useEffect(() => {
    if (!profile?.uid) return;

    const unsub = onSnapshot(doc(db, 'labs', profile.uid), (docSnap) => {
      if (docSnap.exists()) {
        setLabData(docSnap.data());
      } else if (!isInitializingLab.current) {
        // Initialize lab if not exists
        isInitializingLab.current = true;
        const initialLab = {
          level: 1,
          workers: 0,
          chemists: 0,
          equipmentLevel: 0,
          toolsLevel: 0,
          isMobile: false,
          hasSupermarket: false,
          supermarketLaunderedToday: 0,
          lastLaunderReset: Date.now(),
          activeProduction: null,
          upgrades: {
            quality: 0,
            riskReduction: 0,
            productionVolume: 0
          },
          staffList: [],
          storage: {},
          equipment: {} // Stores purchased equipment and their durability { itemId: { durability: 100 } }
        };
        setDoc(doc(db, 'labs', profile.uid), initialLab).catch(err => {
          console.error("Failed to initialize lab:", err);
          isInitializingLab.current = false;
        });
        setLabData(initialLab);
      }
    });

    return () => unsub();
  }, [profile?.uid]);

  // Timer for active production
  useEffect(() => {
    if (!labData?.activeProduction) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const end = labData.activeProduction.startTime + labData.activeProduction.duration;
      const remaining = Math.max(0, Math.floor((end - now) / 1000));
      
      if (remaining === 0) {
        completeProduction();
        clearInterval(interval);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [labData?.activeProduction]);

  const isCompletingRef = useRef(false);

  const completeProduction = async () => {
    if (!profile || !labData?.activeProduction || isCompletingRef.current) return;
    
    isCompletingRef.current = true;
    const { itemId, amount, quality, risk } = labData.activeProduction;
    
    // Check for failure/raid based on risk
    const isRaid = Math.random() < risk;
    
    try {
      // Decrease equipment durability
      const currentEquipment = labData.equipment || {};
      const updatedEquipment: any = {};
      let equipmentBroken = false;

      Object.keys(currentEquipment).forEach(eqId => {
        if (eqId === 'raw_chemicals') {
          updatedEquipment[eqId] = currentEquipment[eqId];
          return;
        }
        const durabilityLoss = Math.floor(Math.random() * 5) + 5; // Lose 5-10% durability per production
        const newDurability = Math.max(0, currentEquipment[eqId].durability - durabilityLoss);
        if (newDurability === 0 && currentEquipment[eqId].durability > 0) {
          equipmentBroken = true;
          toast.error(`تعطلت إحدى المعدات (${labItems.find(i => i.id === eqId)?.name})! يجب استبدالها.`);
        }
        updatedEquipment[eqId] = { durability: newDurability };
      });

      if (isRaid) {
        toast.error('تمت مداهمة المختبر! فقدت الإنتاج وبعض العمال هربوا.');
        await updateDoc(doc(db, 'labs', profile.uid), {
          activeProduction: null,
          workers: Math.max(0, labData.workers - 1),
          equipment: updatedEquipment
        });
      } else {
        const item = drugItems.find(d => d.id === itemId);
        toast.success(`اكتمل الإنتاج! حصلت على ${amount} من ${item?.name || itemId}`);
        
        // Update both Lab Storage and User Inventory for consistency
        await updateDoc(doc(db, 'labs', profile.uid), {
          activeProduction: null,
          equipment: updatedEquipment,
          [`storage.${itemId}.amount`]: increment(Number(amount) || 0)
        });

        // Also add to user's main inventory (Secret Stash)
        await updateDoc(doc(db, 'users', profile.uid), {
          [`inventory.drugs.${itemId}`]: increment(Number(amount) || 0)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `labs/${profile.uid}`);
    } finally {
      isCompletingRef.current = false;
    }
  };

  const startProduction = async (item: any, amountToUse: number) => {
    if (!profile || !labData || labData.activeProduction || isProcessing) return;
    
    // Check if any equipment is broken
    const currentEquipment = labData.equipment || {};
    const hasBrokenEquipment = Object.entries(currentEquipment).some(([id, eq]: [string, any]) => id !== 'raw_chemicals' && eq.durability <= 0);
    if (hasBrokenEquipment) {
      toast.error('لا يمكن بدء الإنتاج! توجد معدات معطلة يجب استبدالها أولاً.');
      return;
    }

    const rawChemicals = profile.inventory?.labs?.raw_chemicals || 0;
    if (rawChemicals < amountToUse) {
      toast.error('لا تملك هذه الكمية من المواد الخام');
      return;
    }

    // Cost is 20% of the total market value of the produced drugs
    // 1 raw material = 2000 units
    const baseAmountPerRaw = 2000;
    const totalExpectedUnits = baseAmountPerRaw * amountToUse;
    const cost = Math.floor(item.price * totalExpectedUnits * 0.2);
    
    if (profile.dirtyMoney < cost) {
      toast.error('ليس لديك أموال قذرة كافية لتغطية تكاليف الإنتاج');
      return;
    }

    setIsProcessing(true);
    try {
      const labLevel = LAB_LEVELS.find(l => l.level === labData.level) || LAB_LEVELS[0];
      
      // Calculate duration (base 10 mins, reduced by workers and lab level)
      const baseDuration = 10 * 60 * 1000; // 10 mins
      
      // Calculate total worker speed bonus including their experience
      let totalWorkerBonus = 0;
      if (labData.staffList) {
        labData.staffList.forEach((staff: any) => {
          if (staff.type === 'worker') {
            // Base bonus 0.1 + 0.02 per experience level
            totalWorkerBonus += STAFF_TYPES.worker.speedBonus + (staff.experience * 0.02);
          }
        });
      } else {
        totalWorkerBonus = labData.workers * STAFF_TYPES.worker.speedBonus;
      }

      const speedBonus = totalWorkerBonus + (labLevel.speedMult - 1);
      const duration = Math.max(1 * 60 * 1000, baseDuration / (1 + speedBonus));
      
      // Calculate amount (exactly 2000 per raw material)
      const amount = totalExpectedUnits;
      
      // Calculate risk
      let totalChemistRiskReduction = 0;
      let totalChemistQualityBonus = 0;
      if (labData.staffList) {
        labData.staffList.forEach((staff: any) => {
          if (staff.type === 'chemist') {
            // Base bonus + 0.01 per experience level
            totalChemistRiskReduction += STAFF_TYPES.chemist.riskReduction + (staff.experience * 0.01);
            totalChemistQualityBonus += STAFF_TYPES.chemist.qualityBonus + (staff.experience * 0.01);
          }
        });
      } else {
        totalChemistRiskReduction = labData.chemists * STAFF_TYPES.chemist.riskReduction;
        totalChemistQualityBonus = labData.chemists * STAFF_TYPES.chemist.qualityBonus;
      }

      let risk = 0.1 + (labLevel.failureChance) - totalChemistRiskReduction - (labData.upgrades.riskReduction * 0.05);
      if (labData.isMobile) risk *= 0.5;
      risk = Math.max(0.01, Math.min(0.5, risk));

      await updateDoc(doc(db, 'users', profile.uid), {
        dirtyMoney: increment(-cost),
        'inventory.labs.raw_chemicals': increment(-amountToUse)
      });

      await updateDoc(doc(db, 'labs', profile.uid), {
        activeProduction: {
          itemId: item.id,
          startTime: Date.now(),
          duration,
          amount,
          quality: 1 + totalChemistQualityBonus + (labData.upgrades.quality * 0.1),
          risk
        }
      });

      toast.success(`بدأ إنتاج ${item.name} باستخدام ${amountToUse} مواد خام`);
      setProductionConfig(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `labs/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const hireStaff = async (type: 'worker' | 'chemist') => {
    if (!profile || !labData || isProcessing) return;
    const staff = STAFF_TYPES[type];
    
    if (profile.cleanMoney < staff.hireCost) {
      toast.error('ليس لديك أموال نظيفة كافية للتوظيف');
      return;
    }

    setIsProcessing(true);
    try {
      const newStaff = generateRandomStaff(type);
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(-staff.hireCost)
      });
      await updateDoc(doc(db, 'labs', profile.uid), {
        [type === 'worker' ? 'workers' : 'chemists']: increment(1),
        staffList: arrayUnion(newStaff)
      });
      toast.success(`تم توظيف ${staff.name} (${newStaff.name}) بنجاح`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `labs/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const fireStaff = async (staffMember: any) => {
    if (!profile || !labData || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const updatedStaffList = (labData.staffList || []).filter((s: any) => s.id !== staffMember.id);
      await updateDoc(doc(db, 'labs', profile.uid), {
        [staffMember.type === 'worker' ? 'workers' : 'chemists']: increment(-1),
        staffList: updatedStaffList
      });
      toast.success(`تم طرد ${staffMember.name}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `labs/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const upgradeStaffExperience = async (staffMember: any) => {
    if (!profile || !labData || isProcessing) return;
    
    if (staffMember.experience >= 25) {
      toast.error('وصل هذا الموظف للحد الأقصى من الخبرة (25)');
      return;
    }

    const cost = 5000000 * staffMember.experience;
    if (profile.cleanMoney < cost) {
      toast.error('ليس لديك أموال نظيفة كافية لتطوير الخبرة');
      return;
    }

    setIsProcessing(true);
    try {
      const updatedStaffList = (labData.staffList || []).map((s: any) => {
        if (s.id === staffMember.id) {
          return { ...s, experience: s.experience + 1 };
        }
        return s;
      });

      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(-cost)
      });
      await updateDoc(doc(db, 'labs', profile.uid), {
        staffList: updatedStaffList
      });
      toast.success(`تم تطوير خبرة ${staffMember.name}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `labs/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const editStaffImage = async (staffMember: any) => {
    const newUrl = window.prompt('أدخل رابط الصورة الجديد:', staffMember.imageUrl);
    if (!newUrl || !profile || !labData || isProcessing) return;

    setIsProcessing(true);
    try {
      const updatedStaffList = (labData.staffList || []).map((s: any) => {
        if (s.id === staffMember.id) {
          return { ...s, imageUrl: newUrl };
        }
        return s;
      });

      await updateDoc(doc(db, 'labs', profile.uid), {
        staffList: updatedStaffList
      });
      toast.success('تم تحديث الصورة بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `labs/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const upgradeLab = async () => {
    if (!profile || !labData || labData.level >= 4 || isProcessing) return;
    const nextLevel = LAB_LEVELS.find(l => l.level === labData.level + 1);
    if (!nextLevel) return;

    if (profile.cleanMoney < nextLevel.cost) {
      toast.error('ليس لديك أموال نظيفة كافية للترقية');
      return;
    }

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(-nextLevel.cost)
      });
      await updateDoc(doc(db, 'labs', profile.uid), {
        level: increment(1)
      });
      toast.success(`تمت ترقية المختبر إلى المستوى ${nextLevel.name}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `labs/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const buySupermarket = async () => {
    if (!profile || !labData || labData.hasSupermarket || isProcessing) return;
    
    if (profile.cleanMoney < SUPERMARKET_COST) {
      toast.error('ليس لديك أموال نظيفة كافية لإنشاء السوبرماركت');
      return;
    }

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(-SUPERMARKET_COST)
      });
      await updateDoc(doc(db, 'labs', profile.uid), {
        hasSupermarket: true
      });
      toast.success('تم إنشاء السوبرماركت السري بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `labs/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const buyEquipment = async (item: any) => {
    if (!profile || !labData || isProcessing) return;

    if (profile.cleanMoney < item.price) {
      toast.error('ليس لديك أموال نظيفة كافية لشراء هذه المعدات');
      return;
    }

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(-item.price),
        [`inventory.labs.${item.id}`]: increment(1)
      });
      
      await updateDoc(doc(db, 'labs', profile.uid), {
        [`equipment.${item.id}`]: {
          durability: 100
        }
      });
      
      toast.success(`تم شراء ${item.name} بنجاح!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `labs/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const buyRawChemicals = async (item: any, amount: number) => {
    if (!profile || isProcessing || amount < 1) return;
    
    const totalCost = item.price * amount;
    if (profile.cleanMoney < totalCost) {
      toast.error('ليس لديك أموال نظيفة كافية لشراء هذه الكمية');
      return;
    }

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(-totalCost),
        [`inventory.labs.raw_chemicals`]: increment(amount)
      });
      
      toast.success(`تم شراء ${amount} من ${item.name} بنجاح!`);
      setRawChemicalsAmount(1);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const upgradeProductStat = async (statType: 'quality' | 'riskReduction' | 'productionVolume') => {
    if (!profile || !labData || isProcessing) return;
    
    const currentLevel = labData.upgrades[statType] || 0;
    if (currentLevel >= 5) {
      toast.error('وصلت للحد الأقصى من التطوير');
      return;
    }

    const costs = {
      quality: 5000000,
      riskReduction: 10000000,
      productionVolume: 7500000
    };
    
    const cost = costs[statType] * (currentLevel + 1);
    
    if (profile.cleanMoney < cost) {
      toast.error('ليس لديك أموال نظيفة كافية للتطوير');
      return;
    }

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(-cost)
      });
      await updateDoc(doc(db, 'labs', profile.uid), {
        [`upgrades.${statType}`]: increment(1)
      });
      toast.success('تم تطوير المنتج بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `labs/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const upgradeDrug = async (itemId: string, currentLevel: number) => {
    if (!profile || !labData || isProcessing) return;
    
    const cost = currentLevel * 5000000;
    if (profile.dirtyMoney < cost) {
      toast.error('ليس لديك أموال قذرة كافية لتطوير الممنوعات');
      return;
    }

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        dirtyMoney: increment(-cost)
      });
      await updateDoc(doc(db, 'labs', profile.uid), {
        [`storage.${itemId}.level`]: increment(1)
      });
      toast.success('تم تطوير الممنوعات بنجاح! سيزيد سعر بيعها.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `labs/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const sellDrug = async (itemId: string, amountToSell: number, currentLevel: number) => {
    if (!profile || !labData || isProcessing) return;
    
    const currentAmount = labData.storage?.[itemId]?.amount || 0;
    if (currentAmount < amountToSell) {
      toast.error('لا تملك هذه الكمية في المخزن');
      return;
    }

    const item = drugItems.find(d => d.id === itemId);
    if (!item) return;

    // Base price + 20% per level
    const pricePerUnit = Math.floor(item.price * (1 + (currentLevel - 1) * 0.2));
    const totalEarnings = pricePerUnit * amountToSell;

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        dirtyMoney: increment(totalEarnings)
      });
      
      if (currentAmount === amountToSell) {
        // Remove item from storage if all sold
        const newStorage = { ...labData.storage };
        delete newStorage[itemId];
        await updateDoc(doc(db, 'labs', profile.uid), {
          storage: newStorage
        });
      } else {
        await updateDoc(doc(db, 'labs', profile.uid), {
          [`storage.${itemId}.amount`]: increment(-amountToSell)
        });
      }
      
      toast.success(`تم بيع ${amountToSell} من ${item.name} مقابل ${formatMoney(totalEarnings)} أموال قذرة`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `labs/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };
  const launderMoney = async (amount: number) => {
    if (!profile || !labData || !labData.hasSupermarket || isProcessing) return;
    
    if (profile.dirtyMoney < amount) {
      toast.error('ليس لديك أموال قذرة كافية لغسلها');
      return;
    }

    setIsProcessing(true);
    try {
      const fee = 0.2; // 20% fee for laundering
      const cleanAmount = Math.floor(amount * (1 - fee));

      await updateDoc(doc(db, 'users', profile.uid), {
        dirtyMoney: increment(-amount),
        cleanMoney: increment(cleanAmount)
      });

      await updateDoc(doc(db, 'labs', profile.uid), {
        supermarketLaunderedToday: increment(amount)
      });

      toast.success(`تم غسل ${formatMoney(amount)} بنجاح! حصلت على ${formatMoney(cleanAmount)} أموال نظيفة.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `labs/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!labData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const currentLevel = LAB_LEVELS.find(l => l.level === labData.level) || LAB_LEVELS[0];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 relative" dir="rtl">
      {/* Realistic Lab Background */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1579154204601-01588f351e67?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-[0.08] mix-blend-luminosity" />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950/90 to-zinc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/10 via-zinc-950/50 to-zinc-950" />
      </div>

      {/* Lab Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          icon={FlaskConical} 
          label="مستوى المختبر" 
          value={currentLevel.name} 
          subValue={`مستوى ${labData.level}`}
          color="blue"
        />
        <StatCard 
          icon={Users} 
          label="القوى العاملة" 
          value={`${labData.workers + labData.chemists}`} 
          subValue={`${labData.workers} عمال | ${labData.chemists} كيميائيين`}
          color="purple"
        />
        <StatCard 
          icon={TrendingUp} 
          label="سرعة الإنتاج" 
          value={`x${currentLevel.speedMult + (labData.workers * 0.1)}`} 
          subValue="بناءً على العمال والمعدات"
          color="green"
        />
        <StatCard 
          icon={ShieldAlert} 
          label="نسبة الخطر" 
          value={`${Math.round((labData.activeProduction?.risk || 0.1) * 100)}%`} 
          subValue={labData.isMobile ? "مختبر متنقل نشط" : "مختبر ثابت"}
          color="red"
        />
      </div>

      {/* Main Content Tabs */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden">
        <div className="flex border-b border-white/5 overflow-x-auto no-scrollbar">
          <TabButton active={activeTab === 'manufacturing'} onClick={() => setActiveTab('manufacturing')} icon={Microscope} label="التصنيع" />
          <TabButton active={activeTab === 'storage'} onClick={() => setActiveTab('storage')} icon={Package} label="مخزن الممنوعات" />
          <TabButton active={activeTab === 'upgrades'} onClick={() => setActiveTab('upgrades')} icon={ArrowUpCircle} label="التطويرات" />
          <TabButton active={activeTab === 'staff'} onClick={() => setActiveTab('staff')} icon={Users} label="الموظفين" />
          <TabButton active={activeTab === 'equipment'} onClick={() => setActiveTab('equipment')} icon={Hammer} label="المعدات" />
          <TabButton active={activeTab === 'supermarket'} onClick={() => setActiveTab('supermarket')} icon={Store} label="السوبرماركت" />
        </div>

        <div className="p-6 lg:p-10">
          <AnimatePresence mode="wait">
            {activeTab === 'manufacturing' && (
              <motion.div 
                key="manufacturing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {labData.activeProduction ? (
                  <div className="bg-zinc-950 border border-green-500/30 rounded-3xl p-8 flex flex-col items-center text-center space-y-6 relative overflow-hidden">
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-green-500 rounded-full blur-3xl opacity-10" />
                    <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 animate-pulse relative z-10">
                      <FlaskConical size={40} />
                    </div>
                    <div className="relative z-10">
                      <h3 className="text-2xl font-black text-white">جاري الإنتاج حالياً</h3>
                      <p className="text-green-400">يتم تصنيع {drugItems.find(d => d.id === labData.activeProduction.itemId)?.name}</p>
                    </div>
                    <div className="w-full max-w-md bg-white/5 h-4 rounded-full overflow-hidden relative z-10 border border-white/5">
                      <motion.div 
                        className="h-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${((labData.activeProduction.duration - (timeLeft || 0) * 1000) / labData.activeProduction.duration) * 100}%` }}
                      />
                    </div>
                    <div className="text-4xl font-black font-mono tracking-tighter text-white relative z-10">
                      {Math.floor((timeLeft || 0) / 60)}:{(timeLeft || 0) % 60 < 10 ? '0' : ''}{(timeLeft || 0) % 60}
                    </div>
                    {(profile?.role === 'Admin' || (profile?.role as string) === 'owner' || (profile?.role as string) === 'admin') && (
                      <button 
                        onClick={completeProduction}
                        disabled={isProcessing}
                        className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black transition-all relative z-10 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                      >
                        إنتاج فوري (مدير)
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {drugItems.map((item) => (
                      <div key={item.id} className="bg-zinc-950 border border-green-500/20 rounded-3xl p-6 flex flex-col group hover:border-green-500/50 transition-all shadow-lg hover:shadow-[0_0_30px_rgba(34,197,94,0.2)] relative overflow-hidden">
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-green-500 rounded-full blur-3xl opacity-10 group-hover:opacity-30 transition-opacity" />
                        <div className="flex items-center gap-4 mb-6 relative z-10">
                          <img src={item.image} alt={item.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-green-500/30" referrerPolicy="no-referrer" />
                          <div>
                            <h4 className="font-black text-lg text-white">{item.name}</h4>
                            <p className="text-xs text-green-400">تكلفة الإنتاج: {formatMoney(Math.floor(item.price * 2000 * 0.2))} لكل مادة خام</p>
                          </div>
                        </div>
                        <div className="space-y-2 mb-6 relative z-10">
                          <div className="flex justify-between text-xs bg-white/5 p-2 rounded-lg border border-white/5">
                            <span className="text-zinc-400">الكمية المتوقعة:</span>
                            <span className="font-bold text-white">2000 وحدة لكل مادة خام</span>
                          </div>
                          <div className="flex justify-between text-xs bg-white/5 p-2 rounded-lg border border-white/5">
                            <span className="text-zinc-400">وقت التصنيع:</span>
                            <span className="font-bold text-white">~{Math.round(10 / (1 + (labData.workers * 0.1) + (currentLevel.speedMult - 1)))} دقيقة</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            const rawChemicals = profile.inventory?.labs?.raw_chemicals || 0;
                            if (rawChemicals < 1) {
                              toast.error('تحتاج إلى مواد كيميائية خام للبدء. يمكنك شرائها من السوق السوداء.');
                              return;
                            }
                            setProductionConfig({ item, amount: 1 });
                          }}
                          disabled={isProcessing}
                          className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-black transition-all flex items-center justify-center gap-2 relative z-10 shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                        >
                          <FlaskConical size={18} />
                          بدء التصنيع
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'storage' && (
              <motion.div 
                key="storage"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="bg-zinc-950 border border-white/5 rounded-3xl p-8">
                  <h3 className="text-2xl font-black mb-6 flex items-center gap-3 text-blue-500">
                    <Package />
                    مخزن الممنوعات
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(labData.storage || {}).map(([itemId, data]: [string, any]) => {
                      const item = drugItems.find(d => d.id === itemId);
                      if (!item) return null;
                      return (
                        <div key={itemId} className="bg-zinc-900/80 border border-purple-500/20 rounded-2xl p-6 relative group hover:border-purple-500/50 transition-all shadow-lg hover:shadow-[0_0_30px_rgba(168,85,247,0.2)] overflow-hidden">
                          <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500 rounded-full blur-3xl opacity-10 group-hover:opacity-30 transition-opacity" />
                          <div className="flex items-center gap-4 mb-4 relative z-10">
                            <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover border-2 border-purple-500/30" referrerPolicy="no-referrer" />
                            <div>
                              <h4 className="font-black text-lg text-white">{item.name}</h4>
                              <p className="text-xs text-purple-400">الكمية: {data.amount}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-3 relative z-10">
                            <div className="flex items-center justify-between text-sm bg-white/5 p-2 rounded-lg">
                              <span className="text-zinc-400">مستوى التطوير</span>
                              <span className="font-black text-white">مستوى {data.level}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm bg-white/5 p-2 rounded-lg">
                              <span className="text-zinc-400">سعر البيع المتوقع</span>
                              <span className="font-black text-green-400">{formatMoney(Math.floor(item.price * (1 + (data.level - 1) * 0.2)))}</span>
                            </div>
                            <button 
                              onClick={() => upgradeDrug(itemId, data.level)}
                              disabled={isProcessing}
                              className="w-full py-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 border border-purple-500/30 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2"
                            >
                              <ArrowUpCircle size={14} />
                              تطوير ({formatMoney(data.level * 5000000)})
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {Object.keys(labData.storage || {}).length === 0 && (
                      <div className="col-span-full text-center py-12 text-zinc-500">
                        المخزن فارغ. قم بالبدء في التصنيع لملء المخزن.
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'upgrades' && (
              <motion.div 
                key="upgrades"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <UpgradeCard 
                    title="تطوير المختبر"
                    desc={labData.level >= 4 ? "وصلت لأقصى مستوى" : `الترقية إلى مستوى ${LAB_LEVELS[labData.level]?.name}`}
                    cost={LAB_LEVELS[labData.level]?.cost || 0}
                    onUpgrade={upgradeLab}
                    disabled={labData.level >= 4 || isProcessing}
                    icon={FlaskConical}
                  />
                  <div className="bg-zinc-950 border border-white/5 rounded-3xl p-8 space-y-6">
                    <h3 className="text-xl font-black flex items-center gap-3 text-green-500">
                      <TrendingUp />
                      تطويرات المنتجات
                    </h3>
                    <div className="space-y-4">
                      <ProductUpgradeItem 
                        label="جودة المنتج" 
                        level={labData.upgrades.quality} 
                        cost={5000000 * (labData.upgrades.quality + 1)}
                        onUpgrade={() => upgradeProductStat('quality')}
                      />
                      <ProductUpgradeItem 
                        label="تقليل الخطر" 
                        level={labData.upgrades.riskReduction} 
                        cost={10000000 * (labData.upgrades.riskReduction + 1)}
                        onUpgrade={() => upgradeProductStat('riskReduction')}
                      />
                      <ProductUpgradeItem 
                        label="حجم الإنتاج" 
                        level={labData.upgrades.productionVolume} 
                        cost={7500000 * (labData.upgrades.productionVolume + 1)}
                        onUpgrade={() => upgradeProductStat('productionVolume')}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'staff' && (
              <motion.div 
                key="staff"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <StaffCard 
                    type="worker"
                    count={labData.workers}
                    onHire={() => hireStaff('worker')}
                    disabled={isProcessing}
                  />
                  <StaffCard 
                    type="chemist"
                    count={labData.chemists}
                    onHire={() => hireStaff('chemist')}
                    disabled={isProcessing}
                  />
                </div>

                {/* Staff List */}
                <div className="bg-zinc-950 border border-white/5 rounded-3xl p-8">
                  <h3 className="text-2xl font-black mb-6 flex items-center gap-3 neon-text-purple">
                    <Users className="text-purple-500" />
                    قائمة العاملين
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(labData.staffList || []).map((staff: any) => {
                      const isWorker = staff.type === 'worker';
                      return (
                        <div key={staff.id} className={clsx(
                          "bg-zinc-950 border rounded-3xl p-6 relative group transition-all shadow-lg overflow-hidden",
                          isWorker ? "border-blue-500/20 hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]" : "border-green-500/20 hover:border-green-500/50 hover:shadow-[0_0_30px_rgba(34,197,94,0.2)]"
                        )}>
                          <div className={clsx(
                            "absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-10 group-hover:opacity-30 transition-opacity",
                            isWorker ? "bg-blue-500" : "bg-green-500"
                          )} />
                          
                          <div className="absolute top-4 left-4 flex gap-2 z-20">
                            <button 
                              onClick={() => editStaffImage(staff)}
                              className="p-2 bg-zinc-800 text-zinc-400 hover:bg-blue-500 hover:text-white rounded-lg transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                              title="تعديل الصورة"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => fireStaff(staff)}
                              className="p-2 bg-zinc-800 text-zinc-400 hover:bg-red-500 hover:text-white rounded-lg transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                              title="طرد"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-4 mb-6 relative z-10">
                            <div className="relative">
                              <img src={staff.imageUrl} alt={staff.name} className={clsx(
                                "w-16 h-16 rounded-2xl object-cover border-2",
                                isWorker ? "border-blue-500/30" : "border-green-500/30"
                              )} referrerPolicy="no-referrer" />
                              <div className="absolute -bottom-2 -right-2 bg-zinc-950 rounded-xl p-1.5 border border-white/10">
                                {isWorker ? <Hammer size={14} className="text-blue-400" /> : <FlaskConical size={14} className="text-green-400" />}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-black text-lg text-white">{staff.name}</h4>
                              <p className={clsx(
                                "text-xs flex items-center gap-1",
                                isWorker ? "text-blue-400" : "text-green-400"
                              )}>
                                <UserCircle size={12} />
                                {staff.gender === 'male' ? 'ذكر' : 'أنثى'} • {isWorker ? 'عامل' : 'كيميائي'}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3 relative z-10">
                            <div className="flex items-center justify-between text-sm bg-white/5 p-2 rounded-lg">
                              <span className="text-zinc-400 flex items-center gap-1"><Star size={14} className="text-yellow-500" /> الخبرة</span>
                              <span className="font-black text-white">
                                {staff.experience >= 25 ? (
                                  <span className="text-yellow-500">الحد الأقصى (25)</span>
                                ) : (
                                  `مستوى ${staff.experience} / 25`
                                )}
                              </span>
                            </div>
                            <button 
                              onClick={() => upgradeStaffExperience(staff)}
                              disabled={isProcessing || staff.experience >= 25}
                              className={clsx(
                                "w-full py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2",
                                staff.experience >= 25 
                                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                  : isWorker 
                                    ? "bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30" 
                                    : "bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-500/30"
                              )}
                            >
                              <ArrowUpCircle size={14} />
                              {staff.experience >= 25 ? 'وصل للحد الأقصى' : `تطوير الخبرة (${formatMoney(5000000 * staff.experience)})`}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {(!labData.staffList || labData.staffList.length === 0) && (
                      <div className="col-span-full text-center py-12 text-zinc-500">
                        لا يوجد عاملين حالياً. قم بتوظيف عمال أو كيميائيين للبدء.
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'equipment' && (
              <motion.div 
                key="equipment"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Raw Chemicals Section */}
                <div>
                  <h3 className="text-2xl font-black mb-6">المواد الخام</h3>
                  {labItems.filter(i => i.id === 'raw_chemicals').map((item) => (
                    <div key={item.id} className="bg-zinc-950 border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6">
                      <img src={item.image} alt={item.name} className="w-full md:w-48 h-32 object-cover rounded-2xl" referrerPolicy="no-referrer" />
                      <div className="flex-1 space-y-2 text-center md:text-right">
                        <h4 className="font-black text-xl">{item.name}</h4>
                        <p className="text-sm text-zinc-400">{item.description}</p>
                        <div className="flex justify-center md:justify-start items-center gap-4 text-sm mt-2">
                          <span className="text-zinc-500">السعر: {formatMoney(item.price)} للوحدة</span>
                          <span className="text-green-500 font-bold bg-green-500/10 px-3 py-1 rounded-lg">
                            المملوك: {profile?.inventory?.labs?.raw_chemicals || 0}
                          </span>
                        </div>
                      </div>
                      <div className="w-full md:w-72 space-y-4">
                        <input
                          type="number"
                          min="1"
                          value={rawChemicalsAmount}
                          onChange={(e) => setRawChemicalsAmount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-white focus:border-green-500 outline-none transition-all font-black text-center"
                        />
                        <button 
                          className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-black transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                          onClick={() => buyRawChemicals(item, rawChemicalsAmount)}
                          disabled={isProcessing || rawChemicalsAmount < 1}
                        >
                          <ShoppingCart size={18} />
                          شراء ({formatMoney(item.price * rawChemicalsAmount)})
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Equipment Section */}
                <div>
                  <h3 className="text-2xl font-black mb-6">المعدات</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {labItems.filter(i => i.id !== 'raw_chemicals').map((item) => {
                      const equipmentData = labData.equipment?.[item.id];
                      const isOwned = !!equipmentData;
                      const isBroken = isOwned && equipmentData.durability <= 0;

                      return (
                        <div key={item.id} className={clsx(
                          "bg-zinc-950 border rounded-3xl p-6 flex flex-col group transition-all",
                          isBroken ? "border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.1)]" : "border-white/5 hover:border-white/20"
                        )}>
                          <div className="relative">
                            <img src={item.image} alt={item.name} className={clsx(
                              "w-full h-40 object-cover rounded-2xl mb-6 transition-all",
                              isBroken ? "grayscale opacity-50" : ""
                            )} referrerPolicy="no-referrer" />
                            {isBroken && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-red-500/90 text-white px-4 py-2 rounded-xl font-black flex items-center gap-2">
                                  <AlertTriangle size={18} />
                                  معطلة
                                </div>
                              </div>
                            )}
                          </div>
                          <h4 className="font-black text-lg mb-2">{item.name}</h4>
                          
                          {isOwned ? (
                            <div className="mb-6 space-y-2">
                              <div className="flex justify-between text-xs">
                                <span className="text-zinc-400">حالة المعدات</span>
                                <span className={clsx(
                                  "font-bold",
                                  equipmentData.durability > 50 ? "text-green-500" :
                                  equipmentData.durability > 20 ? "text-yellow-500" : "text-red-500"
                                )}>{equipmentData.durability}%</span>
                              </div>
                              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                <div 
                                  className={clsx(
                                    "h-full transition-all",
                                    equipmentData.durability > 50 ? "bg-green-500" :
                                    equipmentData.durability > 20 ? "bg-yellow-500" : "bg-red-500"
                                  )}
                                  style={{ width: `${equipmentData.durability}%` }}
                                />
                              </div>
                              {isBroken && (
                                <p className="text-xs text-red-400 mt-2">يجب استبدال هذه المعدات لمواصلة الإنتاج.</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-zinc-500 mb-6">السعر: {formatMoney(item.price)}</p>
                          )}

                          <button 
                            className={clsx(
                              "mt-auto w-full py-3 rounded-xl font-black transition-all flex items-center justify-center gap-2",
                              isOwned && !isBroken ? "bg-green-500/10 text-green-500 cursor-default" : "bg-green-600 hover:bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                            )}
                            onClick={() => {
                              if (!isOwned || isBroken) {
                                buyEquipment(item);
                              }
                            }}
                            disabled={isProcessing || (isOwned && !isBroken)}
                          >
                            {isOwned && !isBroken ? (
                              <>
                                <Star size={18} />
                                مملوكة
                              </>
                            ) : isBroken ? (
                              <>
                                <Hammer size={18} />
                                استبدال ({formatMoney(item.price)})
                              </>
                            ) : (
                              <>
                                <ShoppingCart size={18} />
                                شراء ({formatMoney(item.price)})
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'supermarket' && (
              <motion.div 
                key="supermarket"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {!labData.hasSupermarket ? (
                  <div className="bg-zinc-950 border border-white/5 rounded-3xl p-12 flex flex-col items-center text-center space-y-6">
                    <div className="w-24 h-24 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                      <Store size={48} />
                    </div>
                    <div className="max-w-md">
                      <h3 className="text-3xl font-black mb-4">السوبرماركت السري</h3>
                      <p className="text-zinc-500 leading-relaxed">
                        قم بإنشاء واجهة قانونية لغسيل أموالك القذرة. السوبرماركت يسمح لك بتحويل أرباح الممنوعات إلى أموال نظيفة بنسبة عمولة 20%.
                      </p>
                    </div>
                    <button 
                      onClick={buySupermarket}
                      disabled={isProcessing}
                      className="px-12 py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-amber-600/20"
                    >
                      إنشاء السوبرماركت ({formatMoney(SUPERMARKET_COST)})
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-8">
                      <div className="bg-zinc-950 border border-white/5 rounded-3xl p-8 space-y-8">
                        <div className="flex items-center justify-between">
                          <h3 className="text-2xl font-black">غسيل الأموال</h3>
                          <div className="px-4 py-1 bg-green-500/10 text-green-500 rounded-full text-xs font-black">نشط</div>
                        </div>
                        
                        <div className="space-y-6">
                          <div className="space-y-4 pt-4">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-bold text-zinc-400">المبلغ المراد غسله (أموال قذرة)</label>
                              <span className="text-xs text-red-500 font-bold">العمولة: 20%</span>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <input
                                type="number"
                                min="1000"
                                max={Math.max(1000, profile?.dirtyMoney || 0)}
                                value={launderAmount}
                                onChange={(e) => setLaunderAmount(Math.max(1000, Math.min(parseInt(e.target.value) || 1000, profile?.dirtyMoney || 0)))}
                                className="w-1/3 bg-zinc-900 border border-white/10 rounded-xl p-3 text-white focus:border-green-500 outline-none transition-all font-black text-center"
                              />
                              <input
                                type="range"
                                min="1000"
                                max={Math.max(1000, profile?.dirtyMoney || 0)}
                                value={launderAmount}
                                onChange={(e) => setLaunderAmount(parseInt(e.target.value))}
                                className="w-2/3 accent-green-500"
                              />
                            </div>

                            <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
                              <div className="flex flex-col">
                                <span className="text-xs text-zinc-500">المال النظيف المتوقع</span>
                                <span className="font-black text-green-500 text-lg">{formatMoney(Math.floor(launderAmount * 0.8))}</span>
                              </div>
                              <button 
                                onClick={() => launderMoney(launderAmount)}
                                disabled={isProcessing || launderAmount < 1000 || launderAmount > (profile?.dirtyMoney || 0)}
                                className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-black transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                              >
                                غسل الأموال
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-zinc-900 to-black border border-white/5 rounded-3xl p-8 flex flex-col justify-center items-center text-center space-y-6">
                        <div className="w-20 h-20 rounded-3xl bg-amber-500/20 flex items-center justify-center text-amber-500 rotate-3">
                          <DollarSign size={40} />
                        </div>
                        <div>
                          <h4 className="text-xl font-black">إحصائيات السوبرماركت</h4>
                          <p className="text-zinc-500 text-sm">إجمالي ما تم غسله</p>
                        </div>
                        <div className="text-4xl font-black text-white tracking-tighter">
                          {formatMoney(labData.supermarketLaunderedToday || 0)}
                        </div>
                        <p className="text-[10px] text-green-500 uppercase tracking-widest font-bold">غسيل أموال غير محدود</p>
                      </div>
                    </div>

                    {/* Sell Drugs Section */}
                    <div className="bg-zinc-950 border border-white/5 rounded-3xl p-8 space-y-6">
                      <div className="flex items-center gap-3 mb-6">
                        <ShoppingCart className="text-green-500" />
                        <h3 className="text-2xl font-black">بيع الممنوعات</h3>
                      </div>
                      <p className="text-sm text-zinc-400 mb-4">قم ببيع الممنوعات المصنعة عبر السوبرماركت لتحويلها إلى أموال قذرة.</p>
                      
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {Object.entries(labData.storage || {}).map(([itemId, data]: [string, any]) => {
                          const item = drugItems.find(d => d.id === itemId);
                          if (!item) return null;
                          const pricePerUnit = Math.floor(item.price * (1 + (data.level - 1) * 0.2));
                          
                          return (
                            <div key={itemId} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex flex-col gap-4">
                              <div className="flex items-center gap-3">
                                <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover" referrerPolicy="no-referrer" />
                                <div>
                                  <h4 className="font-bold text-white">{item.name}</h4>
                                  <p className="text-xs text-zinc-400">الكمية المتاحة: {data.amount}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => sellDrug(itemId, Math.min(1000, data.amount), data.level)}
                                  disabled={isProcessing || data.amount < 1}
                                  className="flex-1 py-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-500/30 rounded-lg text-xs font-black transition-all"
                                >
                                  بيع 1,000
                                </button>
                                <button 
                                  onClick={() => sellDrug(itemId, data.amount, data.level)}
                                  disabled={isProcessing || data.amount < 1}
                                  className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-black transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                                >
                                  بيع الكل
                                </button>
                              </div>
                              <div className="text-center text-xs text-zinc-500">
                                السعر للوحدة: {formatMoney(pricePerUnit)} أموال قذرة
                              </div>
                            </div>
                          );
                        })}
                        {Object.keys(labData.storage || {}).length === 0 && (
                          <div className="text-center py-8 text-zinc-500">
                            لا توجد ممنوعات في المخزن للبيع.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Production Modal */}
      <AnimatePresence>
        {productionConfig && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-green-500/30 rounded-3xl p-8 max-w-md w-full space-y-6 shadow-[0_0_50px_rgba(34,197,94,0.15)] relative overflow-hidden"
            >
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-green-500 rounded-full blur-3xl opacity-10" />
              
              <h3 className="text-2xl font-black text-white relative z-10 flex items-center gap-3">
                <FlaskConical className="text-green-500" />
                إعداد الإنتاج: {productionConfig.item.name}
              </h3>

              <div className="space-y-4 relative z-10">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">كمية المواد الخام المستخدمة</label>
                  <input
                    type="number"
                    min="1"
                    max={profile.inventory?.labs?.raw_chemicals || 0}
                    value={productionConfig.amount}
                    onChange={(e) => setProductionConfig({...productionConfig, amount: parseInt(e.target.value) || 1})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-white focus:border-green-500 outline-none transition-all font-black text-lg"
                  />
                  <p className="text-xs text-zinc-500 mt-2">المتاح في المخزن: {profile.inventory?.labs?.raw_chemicals || 0} مواد خام</p>
                </div>

                <div className="bg-white/5 rounded-xl p-4 space-y-3 border border-white/5">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">الكمية المتوقعة:</span>
                    <span className="font-bold text-white">{2000 * productionConfig.amount} وحدة</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">التكلفة الإجمالية:</span>
                    <span className="font-bold text-red-400">{formatMoney(Math.floor(productionConfig.item.price * 2000 * 0.2) * productionConfig.amount)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 relative z-10">
                <button
                  onClick={() => setProductionConfig(null)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black transition-all"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => startProduction(productionConfig.item, productionConfig.amount)}
                  disabled={isProcessing || productionConfig.amount < 1 || productionConfig.amount > (profile.inventory?.labs?.raw_chemicals || 0)}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-black transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                >
                  تأكيد وبدء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subValue, color }: any) {
  const colors: any = {
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    purple: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    green: 'text-green-500 bg-green-500/10 border-green-500/20',
    red: 'text-red-500 bg-red-500/10 border-red-500/20',
  };

  return (
    <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-[2rem] flex items-center gap-6">
      <div className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border", colors[color])}>
        <Icon size={28} />
      </div>
      <div>
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-xl font-black text-white tracking-tight">{value}</p>
        <p className="text-[10px] text-zinc-600 font-bold">{subValue}</p>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={clsx(
        "flex items-center gap-3 px-8 py-5 font-black text-sm transition-all border-b-2 shrink-0",
        active ? "text-green-500 border-green-500 bg-green-500/5 shadow-[inset_0_-2px_10px_rgba(34,197,94,0.2)]" : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5"
      )}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

function UpgradeCard({ title, desc, cost, onUpgrade, disabled, icon: Icon }: any) {
  return (
    <div className="bg-zinc-950 border border-white/5 rounded-3xl p-8 flex flex-col hover:border-green-500/30 transition-all group">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
          <Icon size={24} />
        </div>
        <div>
          <h3 className="font-black text-xl">{title}</h3>
          <p className="text-xs text-zinc-500">{desc}</p>
        </div>
      </div>
      <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] text-zinc-600 font-black uppercase">التكلفة</span>
          <span className="text-lg font-black text-green-500">{formatMoney(cost)}</span>
        </div>
        <button 
          onClick={onUpgrade}
          disabled={disabled}
          className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-black transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
        >
          ترقية
        </button>
      </div>
    </div>
  );
}

function ProductUpgradeItem({ label, level, cost, onUpgrade }: any) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-green-500/30 transition-all">
      <div>
        <h4 className="font-bold text-sm">{label}</h4>
        <div className="flex gap-1 mt-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={clsx("w-3 h-1 rounded-full", i < level ? "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" : "bg-white/10")} />
          ))}
        </div>
      </div>
      <button 
        onClick={onUpgrade}
        className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg text-[10px] font-black transition-all border border-green-500/20"
      >
        {formatMoney(cost)}
      </button>
    </div>
  );
}

function StaffCard({ type, count, onHire, disabled }: any) {
  const staff = STAFF_TYPES[type];
  const isWorker = type === 'worker';
  return (
    <div className={clsx(
      "bg-zinc-950 border rounded-3xl p-8 flex flex-col relative overflow-hidden group transition-all",
      isWorker ? "border-blue-500/20 hover:border-blue-500/40 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]" : "border-green-500/20 hover:border-green-500/40 hover:shadow-[0_0_30px_rgba(34,197,94,0.15)]"
    )}>
      <div className={clsx(
        "absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40",
        isWorker ? "bg-blue-500" : "bg-green-500"
      )} />
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className={clsx(
            "w-14 h-14 rounded-2xl flex items-center justify-center",
            isWorker ? "bg-blue-500/10 text-blue-500" : "bg-green-500/10 text-green-500"
          )}>
            {isWorker ? <Hammer size={28} /> : <FlaskConical size={28} />}
          </div>
          <div>
            <h3 className="font-black text-xl text-white">{staff.name}</h3>
            <p className="text-xs text-zinc-500">الراتب اليومي: {formatMoney(staff.dailySalary)}</p>
          </div>
        </div>
        <div className={clsx(
          "text-4xl font-black",
          isWorker ? "text-blue-400" : "text-green-400"
        )}>x{count}</div>
      </div>
      
      <div className="space-y-4 mb-8 relative z-10">
        <div className="flex items-center gap-3 text-xs text-zinc-400 bg-white/5 p-3 rounded-xl">
          <Zap size={16} className="text-yellow-500 shrink-0" />
          <span>{isWorker ? 'يزيد سرعة الإنتاج بنسبة 10% لكل عامل (+2% لكل مستوى خبرة)' : 'يزيد الجودة ويقلل المخاطر بنسبة 5% لكل كيميائي (+1% لكل مستوى خبرة)'}</span>
        </div>
      </div>

      <button 
        onClick={onHire}
        disabled={disabled}
        className={clsx(
          "w-full py-4 text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 relative z-10",
          isWorker ? "bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]" : "bg-green-600 hover:bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]"
        )}
      >
        <Plus size={18} />
        توظيف ({formatMoney(staff.hireCost)})
      </button>
    </div>
  );
}
