import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatMoney, safeToMillis } from '../lib/utils';
import { getVIPMultiplier } from '../lib/vip';
import { getActiveRolePerks } from '../lib/rolePerks';
import { useAuthStore, BuiltProperty } from '../store/useAuthStore';
import { doc, updateDoc, getDoc, increment, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { MARKET_ITEMS } from '../lib/items';
import { toast } from 'sonner';
import { soundEngine } from '../services/soundEngine';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Shield, 
  Landmark, 
  Crosshair, 
  Beaker, 
  Home, 
  RefreshCw, 
  Wrench, 
  ChevronDown, 
  ChevronUp, 
  Users, 
  CheckCircle, 
  Skull, 
  Briefcase, 
  Zap, 
  Target, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Car,
  MapPin,
  Key,
  Crown,
  Swords,
  Coins,
  Sparkles,
  Lock,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Flame
} from 'lucide-react';
import { CityBuilding } from '../types/npcTypes';
import { INITIAL_CITY_BUILDINGS, CityBuildingsEngine } from '../services/cityBuildingsData';

const CITIES = ['baghdad', 'damascus', 'beirut', 'cairo', 'dubai'];

const PROPERTY_TYPES = [
  { id: 'headquarters', price: 1000000, icon: Shield, color: 'text-red-500', bg: 'bg-red-500/20', border: 'border-red-500/50', glow: 'shadow-red-500/20' },
  { id: 'bank', price: 5000000, icon: Landmark, color: 'text-yellow-500', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', glow: 'shadow-yellow-500/20' },
  { id: 'weapon_stash', price: 500000, icon: Crosshair, color: 'text-orange-500', bg: 'bg-orange-500/20', border: 'border-orange-500/50', glow: 'shadow-orange-500/20' },
  { id: 'drug_factory', price: 750000, icon: Beaker, color: 'text-green-500', bg: 'bg-green-500/20', border: 'border-green-500/50', glow: 'shadow-green-500/20' },
  { id: 'safe_house', price: 250000, icon: Home, color: 'text-blue-500', bg: 'bg-blue-500/20', border: 'border-blue-500/50', glow: 'shadow-blue-500/20' },
  { id: 'laundromat', price: 400000, icon: RefreshCw, color: 'text-teal-500', bg: 'bg-teal-500/20', border: 'border-teal-500/50', glow: 'shadow-teal-500/20' },
  { id: 'garage', price: 300000, icon: Wrench, color: 'text-purple-500', bg: 'bg-purple-500/20', border: 'border-purple-500/50', glow: 'shadow-purple-500/20' },
  { id: 'ammunition_factory', price: 600000, icon: Crosshair, color: 'text-red-500', bg: 'bg-red-500/20', border: 'border-red-500/50', glow: 'shadow-red-500/20' },
  { id: 'casino', price: 10000000, icon: Landmark, color: 'text-yellow-400', bg: 'bg-yellow-400/20', border: 'border-yellow-400/50', glow: 'shadow-yellow-400/20' },
  { id: 'hotel', price: 7500000, icon: Building2, color: 'text-blue-400', bg: 'bg-blue-400/20', border: 'border-blue-400/50', glow: 'shadow-blue-400/20' },
];

const DISTRICTS_INFO = [
  { id: 'حي ناطحات السحاب', name: 'حي ناطحات السحاب والمصارف', icon: '🏙️', color: 'from-amber-500/20 to-zinc-900 border-amber-500/40 text-amber-400' },
  { id: 'مجمع الملاهي والترفيه', name: 'مجمع الملاهي والترفيه', icon: '🎡', color: 'from-pink-500/20 to-zinc-900 border-pink-500/40 text-pink-400' },
  { id: 'حوض الميناء والمستودعات', name: 'حوض الميناء والمستودعات', icon: '⚓', color: 'from-blue-500/20 to-zinc-900 border-blue-500/40 text-blue-400' },
  { id: 'شبكة القنوات المائية', name: 'شبكة القنوات والكورنيش', icon: '🌊', color: 'from-cyan-500/20 to-zinc-900 border-cyan-500/40 text-cyan-400' },
  { id: 'الحي السكني والحدائق', name: 'الحي السكني والفلل', icon: '🏡', color: 'from-emerald-500/20 to-zinc-900 border-emerald-500/40 text-emerald-400' },
  { id: 'المربع الأمني والترفيه الليلي', name: 'المربع الأمني وكازينو المدينة', icon: '🎰', color: 'from-purple-500/20 to-zinc-900 border-purple-500/40 text-purple-400' },
];

export default function Properties() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuthStore();

  // Navigation tab: 'map_turf' (عقارات الخريطة والنفوذ) | 'facilities' (المنشآت التكتيكية) | 'gang_influence' (نفوذ العصابة)
  const [activeMainTab, setActiveMainTab] = useState<'map_turf' | 'facilities' | 'gang_influence'>('map_turf');

  // Map Real Estate states
  const [cityBuildings, setCityBuildings] = useState<CityBuilding[]>(INITIAL_CITY_BUILDINGS);
  const [mapTurfFilter, setMapTurfFilter] = useState<'my_turf' | 'market'>('my_turf');
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState<string>('all');
  const [rentDurationDays, setRentDurationDays] = useState<number>(3);

  // Tactical Built Properties states
  const [selectedCity, setSelectedCity] = useState<string>(profile?.city || 'baghdad');
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const [buildingOnTile, setBuildingOnTile] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [processing, setProcessing] = useState(false);

  // Sync real-time City Map buildings from Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'city_maps', 'baghdad'), (snap) => {
      if (snap.exists() && snap.data()?.buildings) {
        const remote = snap.data().buildings as CityBuilding[];
        const merged = INITIAL_CITY_BUILDINGS.map(initBld => {
          const found = remote.find(r => r.id === initBld.id);
          if (found) {
            return {
              ...initBld,
              ownerType: found.ownerType,
              ownerId: found.ownerId,
              ownerName: found.ownerName,
              isRented: found.isRented,
              tenantId: found.tenantId,
              tenantName: found.tenantName,
              rentExpiresAt: found.rentExpiresAt,
              accumulatedRent: found.accumulatedRent ?? initBld.accumulatedRent,
              gangId: found.gangId,
              gangName: found.gangName,
              securityLevel: found.securityLevel || 1,
              lastRevenueCollection: found.lastRevenueCollection
            };
          }
          return initBld;
        });
        setCityBuildings(merged);
      } else {
        setCityBuildings(INITIAL_CITY_BUILDINGS);
      }
    });

    return () => unsub();
  }, []);

  // Update current time for minute profits
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filtered Map Buildings
  const myMapControlledBuildings = useMemo(() => {
    if (!profile) return [];
    return cityBuildings.filter(b => 
      (b.ownerType === 'player' && b.ownerId === profile.uid) ||
      (b.isRented && b.tenantId === profile.uid)
    );
  }, [cityBuildings, profile]);

  const totalMapAccumulatedRent = useMemo(() => {
    return myMapControlledBuildings.reduce((sum, b) => sum + (b.accumulatedRent || 0), 0);
  }, [myMapControlledBuildings]);

  const totalMapDailyRevenue = useMemo(() => {
    return myMapControlledBuildings.reduce((sum, b) => sum + (b.dailyRevenue || 0), 0);
  }, [myMapControlledBuildings]);

  // District Influence Stats
  const districtInfluenceStats = useMemo(() => {
    return DISTRICTS_INFO.map(d => {
      const buildingsInDistrict = cityBuildings.filter(b => b.district === d.id);
      const total = buildingsInDistrict.length || 1;
      const myOwned = buildingsInDistrict.filter(b => b.ownerType === 'player' && b.ownerId === profile?.uid).length;
      const myRented = buildingsInDistrict.filter(b => b.isRented && b.tenantId === profile?.uid).length;
      const myControlled = myOwned + myRented;
      const influencePct = Math.round((myControlled / total) * 100);

      // Gang influence in this district
      const gangBuildings = profile?.gangId 
        ? buildingsInDistrict.filter(b => b.gangId === profile.gangId) 
        : [];
      const gangInfluencePct = Math.round((gangBuildings.length / total) * 100);

      let status = 'خاضع لسيطرة نقابات الظل';
      if (influencePct >= 75) status = 'نفوذ وهيمنة مطلقة 👑';
      else if (influencePct >= 50) status = 'سيطرة الأغلبية 🛡️';
      else if (influencePct >= 25) status = 'نفوذ تجاري متصاعد ⚡';
      else if (influencePct > 0) status = 'موطئ قدم تجاري 📍';

      return {
        ...d,
        total,
        myControlled,
        influencePct,
        gangInfluencePct,
        status
      };
    });
  }, [cityBuildings, profile]);

  // Overall City Influence
  const overallInfluenceScore = useMemo(() => {
    if (cityBuildings.length === 0) return 0;
    return Math.round((myMapControlledBuildings.length / cityBuildings.length) * 100);
  }, [myMapControlledBuildings, cityBuildings]);

  // Tactical Built Properties calculation
  const builtProperties = profile?.builtProperties || [];
  const cityProperties = builtProperties.filter(p => p.city === selectedCity);
  const ownedTilesInCity = profile?.ownedTiles?.[selectedCity] || [];

  const calculateMinuteProfit = (property: BuiltProperty) => {
    let baseHourly = 0;
    if (property.type === 'casino') baseHourly = 1500;
    else if (property.type === 'hotel') baseHourly = 800;
    else if (property.type === 'drug_factory') baseHourly = 500 + (property.workers || 0) * 20;
    else if (property.type === 'weapon_stash') baseHourly = 800;
    else if (property.type === 'bank') baseHourly = 1200;
    else if (property.type === 'ammunition_factory') baseHourly = 1000;
    else if (property.type === 'headquarters') baseHourly = 2000;
    
    let multiplier = 1 + (property.level - 1) * 0.01;
    if (property.upgrades) {
      Object.values(property.upgrades).forEach(val => {
        multiplier += (Number(val) || 0) * 0.005;
      });
    }

    if (property.managerId) {
      multiplier *= 1.1;
      let manager: any = profile?.family?.wives.find(w => w.id === property.managerId);
      if (!manager) {
        manager = profile?.family?.wives.flatMap(w => w.children).find(c => c.id === property.managerId);
      }
      if (manager && manager.traits?.includes('clever')) {
        multiplier *= 1.2;
      }
    }
    
    return Math.floor((baseHourly * multiplier) / 60);
  };

  const totalFacilitiesHourlyProfit = useMemo(() => {
    return builtProperties.reduce((acc, p) => acc + calculateMinuteProfit(p) * 60, 0);
  }, [builtProperties]);

  // MAP REAL ESTATE ACTIONS
  const handleCollectMapRent = async (bld: CityBuilding) => {
    if (!profile || processing) return;
    setProcessing(true);
    const res = await CityBuildingsEngine.collectRent('baghdad', bld.id, profile.uid);
    setProcessing(false);
    if (res.success) {
      soundEngine.playCashSound();
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  const handleCollectAllMapRents = async () => {
    if (!profile || processing) return;
    setProcessing(true);
    const res = await CityBuildingsEngine.collectAllPlayerRents('baghdad', profile.uid);
    setProcessing(false);
    if (res.success) {
      soundEngine.playCashSound();
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  const handleDonateRentToGang = async (bld: CityBuilding) => {
    if (!profile?.gangId || processing) {
      toast.error('أنت لست منضماً لأي عصابة لتحويل العوائد إليها!');
      return;
    }
    setProcessing(true);
    const res = await CityBuildingsEngine.donateRentToGang('baghdad', bld.id, profile.uid, profile.gangId);
    setProcessing(false);
    if (res.success) {
      soundEngine.playCashSound();
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  const handleUpgradeBuildingSecurity = async (bld: CityBuilding) => {
    if (!profile || processing) return;
    setProcessing(true);
    const res = await CityBuildingsEngine.upgradeSecurity('baghdad', bld.id, profile.uid, profile.cleanMoney);
    setProcessing(false);
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  const handleClaimGangTurf = async (bld: CityBuilding) => {
    if (!profile?.gangId || processing) {
      toast.error('يجب أن تكون عضواً في عصابة لتثبيت رايتها!');
      return;
    }
    setProcessing(true);
    const res = await CityBuildingsEngine.claimGangTurf(
      'baghdad', 
      bld.id, 
      profile.uid, 
      profile.gangId, 
      profile.gangName || 'عصابتنا'
    );
    setProcessing(false);
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  const handleBuyMapBuilding = async (bld: CityBuilding) => {
    if (!profile || processing) return;
    if (profile.cleanMoney < bld.purchasePrice) {
      toast.error(`رصيدك غير كافٍ! سعر العقار هو ${formatMoney(bld.purchasePrice)}`);
      return;
    }
    setProcessing(true);
    const res = await CityBuildingsEngine.purchaseBuilding(
      'baghdad',
      bld.id,
      profile.uid,
      profile.displayName,
      profile.cleanMoney,
      profile.gangId,
      profile.gangName
    );
    setProcessing(false);
    if (res.success) {
      soundEngine.playCashSound();
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  const handleRentMapBuilding = async (bld: CityBuilding) => {
    if (!profile || processing) return;
    const totalCost = bld.dailyRent * rentDurationDays;
    if (profile.cleanMoney < totalCost) {
      toast.error(`تكلفة الإيجار لـ ${rentDurationDays} أيام هي ${formatMoney(totalCost)} ورصيدك لا يكفي!`);
      return;
    }
    setProcessing(true);
    const res = await CityBuildingsEngine.rentBuilding(
      'baghdad',
      bld.id,
      profile.uid,
      profile.displayName,
      rentDurationDays,
      profile.cleanMoney,
      profile.gangId,
      profile.gangName
    );
    setProcessing(false);
    if (res.success) {
      soundEngine.playCashSound();
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  // TACTICAL PROPERTIES ACTIONS
  const handleBuild = async (propType: typeof PROPERTY_TYPES[0], tileId: number) => {
    if (!profile || processing) return;
    if (profile.cleanMoney < propType.price) {
      toast.error(t('common.noMoney'));
      return;
    }

    setProcessing(true);
    const newProperty: BuiltProperty = {
      id: `${propType.id}_${selectedCity}_${tileId}_${Date.now()}`,
      type: propType.id as any,
      city: selectedCity,
      tileId: tileId,
      level: 1,
      upgrades: {},
      workers: 0,
      inventory: {}
    };

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(-propType.price),
        builtProperties: [...builtProperties, newProperty]
      });
      soundEngine.playCashSound();
      toast.success(t('properties.buildSuccess', { property: t(`properties.types.${propType.id}`), city: t(`map.cities.${selectedCity}`) }));
      setBuildingOnTile(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleSell = async (property: BuiltProperty) => {
    if (!profile || processing) return;
    const propType = PROPERTY_TYPES.find(pt => pt.id === property.type)!;
    const sellPrice = Math.floor(propType.price * 0.5);

    setProcessing(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(sellPrice),
        builtProperties: builtProperties.filter(p => p.id !== property.id)
      });
      soundEngine.playCashSound();
      toast.success(t('properties.sellSuccess', { property: t(`properties.types.${property.type}`) }));
      setExpandedProperty(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleUpgrade = async (property: BuiltProperty, upgradeKey: string, cost: number) => {
    if (!profile || processing) return;
    if (profile.cleanMoney < cost) {
      toast.error(t('common.noMoney'));
      return;
    }

    setProcessing(true);
    const updatedProperties = builtProperties.map(p => {
      if (p.id === property.id) {
        const currentLevel = p.upgrades?.[upgradeKey] || 0;
        return {
          ...p,
          upgrades: {
            ...p.upgrades,
            [upgradeKey]: currentLevel + 1
          }
        };
      }
      return p;
    });

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(-cost),
        builtProperties: updatedProperties
      });
      toast.success(t('properties.upgradeSuccess', { upgrade: t(`properties.upgrades.${upgradeKey}`) }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleHireWorker = async (property: BuiltProperty, cost: number) => {
    if (!profile || processing) return;
    if (profile.cleanMoney < cost) {
      toast.error(t('common.noMoney'));
      return;
    }

    setProcessing(true);
    const updatedProperties = builtProperties.map(p => {
      if (p.id === property.id) {
        return { ...p, workers: (p.workers || 0) + 1 };
      }
      return p;
    });

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(-cost),
        builtProperties: updatedProperties
      });
      toast.success(t('properties.hireSuccess'));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleUpgradeLevel = async (property: BuiltProperty) => {
    if (!profile || processing) return;
    const cost = 500000 * property.level;
    if (profile.cleanMoney < cost) {
      toast.error(t('common.noMoney'));
      return;
    }

    setProcessing(true);
    const updatedProperties = builtProperties.map(p => {
      if (p.id === property.id) {
        return { ...p, level: p.level + 1 };
      }
      return p;
    });

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(-cost),
        builtProperties: updatedProperties
      });
      toast.success(t('properties.upgradeSuccess', { upgrade: t('properties.level', { level: property.level + 1 }) }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleSafeHouse = async () => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        inSafeHouse: !profile.inSafeHouse
      });
      toast.success(profile.inSafeHouse ? t('properties.safe_house.exited') : t('properties.safe_house.entered'));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error(t('common.failed'));
    }
  };

  const handleLaunder = async (property: BuiltProperty) => {
    if (!profile || processing) return;
    const baseCapacity = (property.upgrades?.washers || 0) * 10000 + 5000;
    let capacity = baseCapacity * (1 + (property.level - 1) * 0.5);
    if (property.managerId) capacity *= 1.5;

    if (profile.dirtyMoney < capacity) {
      toast.error(t('common.noDirtyMoney'));
      return;
    }

    setProcessing(true);
    try {
      let fee = 0.2 * (1 - (property.level - 1) * 0.05);
      if (property.managerId) fee *= 0.8;
      const cleanAmount = capacity * (1 - Math.max(0.05, fee));
      await updateDoc(doc(db, 'users', profile.uid), {
        dirtyMoney: increment(-capacity),
        cleanMoney: increment(cleanAmount)
      });
      soundEngine.playCashSound();
      toast.success(t('properties.laundromat.washSuccess', { amount: formatNumber(capacity) }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleCollectFacilityProfits = async (property: BuiltProperty) => {
    if (!profile || processing) return;
    const now = Date.now();
    const lastCollection = property.lastProfitCollection || (safeToMillis(profile.createdAt) || Date.now());
    const minutesPassed = Math.floor((now - lastCollection) / (1000 * 60));

    if (minutesPassed < 1) {
      toast.error(t('properties.noProfits'));
      return;
    }

    setProcessing(true);
    const baseMinuteProfit = calculateMinuteProfit(property);
    const perks = getActiveRolePerks(profile);
    const traderMultiplier = 1 + (perks.traderProfitBonusPercent / 100);
    const minuteProfit = Math.floor(baseMinuteProfit * getVIPMultiplier(profile.vipLevel as any) * traderMultiplier);
    const totalProfit = minuteProfit * minutesPassed;

    const updatedProperties = builtProperties.map(p => {
      if (p.id === property.id) {
        return { ...p, lastProfitCollection: now };
      }
      return p;
    });

    if (property.type === 'headquarters') {
      if (!profile.gangId) {
        toast.error(t('properties.headquarters.noGang'));
        setProcessing(false);
        return;
      }
      try {
        const gangRef = doc(db, 'gangs', profile.gangId);
        const gangDoc = await getDoc(gangRef);
        if (gangDoc.exists()) {
          await updateDoc(gangRef, {
            balance: increment(totalProfit)
          });
          await updateDoc(doc(db, 'users', profile.uid), {
            builtProperties: updatedProperties,
            'familyFinances.income': increment(totalProfit),
            'familyFinances.lastUpdate': now
          });
          soundEngine.playCashSound();
          toast.success(t('properties.headquarters.profitsDonated', { amount: formatNumber(totalProfit) }));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `gangs/${profile.gangId}`);
      } finally {
        setProcessing(false);
      }
      return;
    }

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(totalProfit),
        builtProperties: updatedProperties,
        'familyFinances.income': increment(totalProfit),
        'familyFinances.lastUpdate': now
      });
      soundEngine.playCashSound();
      toast.success(t('properties.profitsCollected', { amount: formatNumber(totalProfit) }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setProcessing(false);
    }
  };

  const renderFacilityManagement = (property: BuiltProperty) => {
    const upgradeItem = (name: string, key: string, cost: number) => {
      const currentLevel = property.upgrades?.[key] || 0;
      return (
        <div key={key} className="flex items-center justify-between p-3.5 bg-black/40 rounded-xl border border-white/5">
          <div>
            <p className="font-bold text-white text-xs">{name}</p>
            <p className="text-[10px] text-zinc-500">المستوى الحالي: {currentLevel}</p>
          </div>
          <button
            onClick={() => handleUpgrade(property, key, cost)}
            className="px-3.5 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-xs font-black border border-red-500/30 transition-all flex items-center gap-1.5"
          >
            <TrendingUp size={13} />
            <span>ترقية ({formatMoney(cost)})</span>
          </button>
        </div>
      );
    };

    return (
      <div className="mt-6 pt-6 border-t border-white/5 space-y-4 text-xs">
        {/* أزرار التحصيل والترقية والبيع */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleCollectFacilityProfits(property)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-2 shadow"
          >
            <Coins size={14} />
            تحصيل الأرباح التكتيكية
          </button>

          <button
            onClick={() => handleUpgradeLevel(property)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 shadow"
          >
            <TrendingUp size={14} />
            ترقية المنشأة للمستوى {property.level + 1} ({formatMoney(500000 * property.level)})
          </button>

          <button
            onClick={() => handleSell(property)}
            className="px-4 py-2 bg-zinc-800 hover:bg-red-900 text-zinc-400 hover:text-red-200 rounded-xl font-bold flex items-center gap-2 ms-auto transition-colors"
          >
            <Skull size={14} />
            بيع المنشأة
          </button>
        </div>

        {/* أدوات محددة لكل نوع منشأة */}
        {property.type === 'laundromat' && (
          <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex items-center justify-between">
            <div>
              <h5 className="font-bold text-teal-300">غسيل الأموال القذرة</h5>
              <p className="text-[10px] text-zinc-400">تحويل الأموال المشبوهة لكاش نظامي نظيف بنسبة خصم مخفضة</p>
            </div>
            <button
              onClick={() => handleLaunder(property)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-black transition-all flex items-center gap-2 shadow"
            >
              <RefreshCw size={14} />
              بدء دورة الغسيل
            </button>
          </div>
        )}

        {property.type === 'safe_house' && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between">
            <div>
              <h5 className="font-bold text-blue-300">المخبأ الآمن السري</h5>
              <p className="text-[10px] text-zinc-400">يحميك من الاغتيال والغارات الأمنية أثناء الملاحقات</p>
            </div>
            <button
              onClick={handleToggleSafeHouse}
              className={`px-4 py-2 rounded-xl font-black text-white transition-all flex items-center gap-2 ${
                profile?.inSafeHouse ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              <Home size={14} />
              {profile?.inSafeHouse ? 'الخروج من المخبأ' : 'الدخول للمخبأ والتخفي'}
            </button>
          </div>
        )}

        {/* الترقيات الداخلية */}
        <div className="space-y-2 mt-2">
          {property.type === 'laundromat' && upgradeItem('غسالات أموال صناعية فائقة', 'washers', 150000)}
          {property.type === 'drug_factory' && (
            <>
              {upgradeItem('معدات تقطير متطورة', 'distillation', 250000)}
              <div className="flex items-center justify-between p-3.5 bg-black/40 rounded-xl border border-white/5">
                <div>
                  <p className="font-bold text-white text-xs">توظيف عمال وخبراء كيمياء</p>
                  <p className="text-[10px] text-zinc-500">العمال الحاليون: {property.workers || 0}</p>
                </div>
                <button
                  onClick={() => handleHireWorker(property, 50000)}
                  className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold border border-zinc-700 transition-all"
                >
                  توظيف عامل (+20$/د)
                </button>
              </div>
            </>
          )}
          {property.type === 'weapon_stash' && upgradeItem('منظومة تخزين تحت الأرض', 'vault', 300000)}
          {property.type === 'casino' && upgradeItem('صالة VIP لكبار الشخصيات', 'vip_lounge', 500000)}
          {property.type === 'bank' && upgradeItem('خزائن حديدية مصفحة', 'steel_vault', 1000000)}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen text-white pb-20 select-none">
      {/* Top Breadcrumb & Executive Financial Header */}
      <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950 border-b border-zinc-800/80 px-4 md:px-8 py-6 mb-8 backdrop-blur-xl sticky top-0 z-30 shadow-2xl">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-bold mb-1">
                <span className="text-red-500 font-black">المالية</span>
                <ChevronRight size={14} className="rtl:rotate-180 text-zinc-600" />
                <span className="text-white">المباني وعقارات النفوذ الإقليمي</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                <Building2 className="text-amber-400 w-8 h-8 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]" />
                المباني والسيطرة الإقليمية
              </h1>
            </div>

            {/* Quick Actions & Unified Metrics */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/map"
                className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow"
              >
                <MapPin size={16} className="text-red-400" />
                فتح الخريطة التفاعلية
                <ExternalLink size={12} className="text-zinc-500" />
              </Link>

              {totalMapAccumulatedRent > 0 && (
                <button
                  onClick={handleCollectAllMapRents}
                  disabled={processing}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/30 animate-pulse"
                >
                  <Coins size={16} />
                  تحصيل كافة عوائد الخريطة ({formatMoney(totalMapAccumulatedRent)})
                </button>
              )}
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
            <div className="p-3 bg-black/40 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-500 font-bold block mb-0.5">عقارات الخريطة والنفوذ</span>
              <span className="text-sm md:text-base font-black text-amber-400 flex items-center gap-1.5">
                <Building2 size={14} />
                {myMapControlledBuildings.length} عقار تحت السيطرة
              </span>
            </div>

            <div className="p-3 bg-black/40 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-500 font-bold block mb-0.5">العائد اليومي لعقارات الخريطة</span>
              <span className="text-sm md:text-base font-black text-emerald-400 flex items-center gap-1.5">
                <TrendingUp size={14} />
                {formatMoney(totalMapDailyRevenue)} / يوم
              </span>
            </div>

            <div className="p-3 bg-black/40 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-500 font-bold block mb-0.5">المنشآت والمصانع التكتيكية</span>
              <span className="text-sm md:text-base font-black text-blue-400 flex items-center gap-1.5">
                <Shield size={14} />
                {cityProperties.length} منشأة خاصة
              </span>
            </div>

            <div className="p-3 bg-black/40 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-500 font-bold block mb-0.5">معدل نفوذ المدينة العام</span>
              <span className="text-sm md:text-base font-black text-purple-400 flex items-center gap-1.5">
                <Crown size={14} />
                {overallInfluenceScore}% نفوذ إقليمي
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-6">
        {/* Main Tab Navigation */}
        <div className="flex border-b border-zinc-800 gap-2 pb-2 overflow-x-auto text-xs font-black">
          <button
            onClick={() => setActiveMainTab('map_turf')}
            className={`px-5 py-3 rounded-xl transition-all flex items-center gap-2.5 whitespace-nowrap ${
              activeMainTab === 'map_turf'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <MapPin size={16} />
            <span>عقارات الخريطة والنفوذ الإقليمي</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300">
              {myMapControlledBuildings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab('facilities')}
            className={`px-5 py-3 rounded-xl transition-all flex items-center gap-2.5 whitespace-nowrap ${
              activeMainTab === 'facilities'
                ? 'bg-red-600/15 text-red-400 border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <Shield size={16} />
            <span>المنشآت والمصانع التكتيكية</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-300">
              {cityProperties.length}
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab('gang_influence')}
            className={`px-5 py-3 rounded-xl transition-all flex items-center gap-2.5 whitespace-nowrap ${
              activeMainTab === 'gang_influence'
                ? 'bg-purple-600/15 text-purple-400 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <Crown size={16} />
            <span>نفوذ العصابة وهيمنة المقاطعات</span>
            {profile?.gangName && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/20 text-purple-300 truncate max-w-[120px]">
                {profile.gangName}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: MAP PROPERTIES & TURF INFLUENCE */}
        {activeMainTab === 'map_turf' && (
          <div className="space-y-6">
            {/* District Control Radar Cards */}
            <div className="bg-gradient-to-b from-zinc-900/60 to-zinc-950 p-5 rounded-2xl border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Target size={18} className="text-amber-400" />
                    خريطة النفوذ والسيطرة بالمقاطعات (6 مقاطعات رئيسية)
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    كل عقار تستثمر به أو تستأجره يعزز هيمنة عائلتك وعصابتك ويمنحك تدفقات نقدية وحماية مستمرة.
                  </p>
                </div>

                <Link
                  to="/map"
                  className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <MapPin size={13} />
                  <span>معاينة جوية 3/4</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {districtInfluenceStats.map((d) => (
                  <div key={d.id} className="p-3.5 bg-black/40 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-white flex items-center gap-1.5 text-xs">
                        <span>{d.icon}</span>
                        <span>{d.name}</span>
                      </span>
                      <span className="font-mono font-black text-amber-400">{d.influencePct}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(4, d.influencePct)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                      <span>{d.status}</span>
                      <span>{d.myControlled} من {d.total} عقار</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sub Filter: My Turf vs Map Market */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 bg-black/50 p-1 rounded-xl border border-zinc-800 text-xs">
                <button
                  onClick={() => setMapTurfFilter('my_turf')}
                  className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
                    mapTurfFilter === 'my_turf' ? 'bg-amber-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Building2 size={14} />
                  عقاراتي المستثمرة ({myMapControlledBuildings.length})
                </button>
                <button
                  onClick={() => setMapTurfFilter('market')}
                  className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
                    mapTurfFilter === 'market' ? 'bg-blue-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <DollarSign size={14} />
                  سوق عقارات المدينة (متاح للشراء والإيجار)
                </button>
              </div>

              {/* District Filter Selector */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500 font-bold">المقاطعة:</span>
                <select
                  value={selectedDistrictFilter}
                  onChange={(e) => setSelectedDistrictFilter(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 text-xs"
                >
                  <option value="all">كافة المقاطعات</option>
                  {DISTRICTS_INFO.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Content for My Controlled Turf */}
            {mapTurfFilter === 'my_turf' && (
              <div>
                {myMapControlledBuildings.length === 0 ? (
                  <div className="p-12 text-center bg-black/30 rounded-3xl border border-dashed border-zinc-800 space-y-4">
                    <Building2 className="w-12 h-12 text-zinc-700 mx-auto" />
                    <div>
                      <h4 className="text-lg font-black text-white">لا تملك أي عقارات بالخريطة حتى الآن</h4>
                      <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1">
                        تصفح سوق عقارات المدينة أو افتح الخريطة التفاعلية لشراء الأبراج والمصارف والمصانع وفرض نفوذك الإقليمي!
                      </p>
                    </div>
                    <button
                      onClick={() => setMapTurfFilter('market')}
                      className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black transition-all shadow"
                    >
                      استعراض سوق العقارات للشراء الآن
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myMapControlledBuildings
                      .filter(b => selectedDistrictFilter === 'all' || b.district === selectedDistrictFilter)
                      .map((bld) => {
                        const isOwner = bld.ownerType === 'player' && bld.ownerId === profile?.uid;
                        const hasGang = !!bld.gangName;
                        const security = bld.securityLevel || 1;

                        return (
                          <div
                            key={bld.id}
                            className="bg-gradient-to-b from-zinc-900 to-zinc-950 p-5 rounded-2xl border border-zinc-800 space-y-4 shadow-xl hover:border-amber-500/40 transition-all flex flex-col justify-between"
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                                    <Building2 size={20} />
                                  </div>
                                  <div>
                                    <h4 className="font-black text-white text-sm">{bld.name}</h4>
                                    <span className="text-[10px] text-zinc-400 block">{bld.district}</span>
                                  </div>
                                </div>

                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  isOwner 
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                }`}>
                                  {isOwner ? '👑 ملكية كاملة' : '🔑 مستأجر رسمي'}
                                </span>
                              </div>

                              <p className="text-[11px] text-zinc-400 line-clamp-2">{bld.description}</p>

                              {/* Gang and Security Badges */}
                              <div className="flex flex-wrap items-center gap-2 text-[10px]">
                                {hasGang ? (
                                  <span className="px-2 py-0.5 bg-red-600/20 text-red-300 border border-red-500/30 rounded flex items-center gap-1 font-bold">
                                    <Flame size={12} className="text-red-400" />
                                    راية: {bld.gangName}
                                  </span>
                                ) : profile?.gangId ? (
                                  <button
                                    onClick={() => handleClaimGangTurf(bld)}
                                    disabled={processing}
                                    className="px-2 py-0.5 bg-zinc-800 hover:bg-red-600 text-zinc-300 hover:text-white border border-zinc-700 rounded transition-all flex items-center gap-1 font-bold"
                                  >
                                    <Crown size={12} />
                                    تثبيت راية العصابة
                                  </button>
                                ) : null}

                                <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded flex items-center gap-1 font-mono">
                                  <ShieldCheck size={12} className="text-emerald-400" />
                                  حماية: {security}/5
                                </span>
                              </div>

                              {/* Financial details */}
                              <div className="grid grid-cols-2 gap-2 p-3 bg-black/40 rounded-xl border border-white/5 text-xs">
                                <div>
                                  <span className="text-[10px] text-zinc-500 block">العائد اليومي</span>
                                  <span className="font-black text-emerald-400 font-mono">{formatMoney(bld.dailyRevenue)}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-zinc-500 block">العوائد المتراكمة</span>
                                  <span className="font-black text-amber-400 font-mono">{formatMoney(bld.accumulatedRent || 0)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-2 pt-2 border-t border-white/5">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleCollectMapRent(bld)}
                                  disabled={processing || (bld.accumulatedRent || 0) <= 0}
                                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow"
                                >
                                  <Coins size={14} />
                                  تحصيل العوائد ({formatMoney(bld.accumulatedRent || 0)})
                                </button>

                                {profile?.gangId && (bld.accumulatedRent || 0) > 0 && (
                                  <button
                                    onClick={() => handleDonateRentToGang(bld)}
                                    disabled={processing}
                                    className="py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow"
                                    title="إيداع في خزينة العصابة"
                                  >
                                    <Crown size={14} />
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center justify-between gap-2 text-xs">
                                <button
                                  onClick={() => handleUpgradeBuildingSecurity(bld)}
                                  disabled={processing || security >= 5}
                                  className="text-[11px] text-blue-400 hover:text-blue-300 font-bold transition-colors flex items-center gap-1"
                                >
                                  <Lock size={12} />
                                  {security >= 5 ? 'أقصى حماية' : `ترقية الحماية (${formatMoney(security * 1000000)})`}
                                </button>

                                <Link
                                  to="/map"
                                  className="text-[11px] text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
                                >
                                  <span>موقعه بالخريطة</span>
                                  <ChevronRight size={12} className="rtl:rotate-180" />
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* Content for Map Market */}
            {mapTurfFilter === 'market' && (
              <div className="space-y-4">
                <div className="p-4 bg-zinc-900 border border-blue-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <h4 className="font-black text-white text-sm">سوق الاستثمار العقاري والسيطرة الإقليمية</h4>
                    <p className="text-zinc-400 text-[11px]">
                      اختر عقاراً حقيقياً لشراء ملكيته بالكامل أو استئجاره لعدة أيام لتأمين تدفقات كاش وتوسيع نفوذك.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-400 font-bold">مدة الإيجار:</span>
                    {[1, 3, 7].map(days => (
                      <button
                        key={days}
                        onClick={() => setRentDurationDays(days)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${
                          rentDurationDays === days ? 'bg-blue-600 text-white' : 'bg-black/40 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {days} أيام
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cityBuildings
                    .filter(b => selectedDistrictFilter === 'all' || b.district === selectedDistrictFilter)
                    .map((bld) => {
                      const isMine = (bld.ownerType === 'player' && bld.ownerId === profile?.uid) || (bld.isRented && bld.tenantId === profile?.uid);
                      const isOccupiedByOther = bld.isRented && bld.tenantId !== profile?.uid;

                      return (
                        <div
                          key={bld.id}
                          className="bg-gradient-to-b from-zinc-900 to-zinc-950 p-5 rounded-2xl border border-zinc-800 space-y-4 shadow-xl flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-black text-white text-sm">{bld.name}</h4>
                                <span className="text-[10px] text-zinc-400 block">{bld.district}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300">
                                {bld.type}
                              </span>
                            </div>

                            <p className="text-[11px] text-zinc-400 line-clamp-2">{bld.description}</p>

                            <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-zinc-500">المالك الحالي:</span>
                                <span className="text-white font-bold">{isMine ? 'أنت' : bld.ownerName}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-500">سعر الشراء:</span>
                                <span className="text-emerald-400 font-bold font-mono">{formatMoney(bld.purchasePrice)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-500">الإيجار اليومي:</span>
                                <span className="text-amber-400 font-bold font-mono">{formatMoney(bld.dailyRent)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-500">العائد المقدر:</span>
                                <span className="text-purple-400 font-bold font-mono">{formatMoney(bld.dailyRevenue)} / يوم</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-white/5">
                            {isMine ? (
                              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center text-xs font-bold text-emerald-400">
                                العقار تحت سيطرتك ونفوذك الحالي
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleRentMapBuilding(bld)}
                                  disabled={processing || isOccupiedByOther}
                                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow"
                                >
                                  <Key size={14} />
                                  استئجار ({formatMoney(bld.dailyRent * rentDurationDays)})
                                </button>

                                <button
                                  onClick={() => handleBuyMapBuilding(bld)}
                                  disabled={processing}
                                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow"
                                >
                                  <Building2 size={14} />
                                  شراء كامل
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TACTICAL BUILT PROPERTIES */}
        {activeMainTab === 'facilities' && (
          <div className="space-y-6">
            {/* City Selector for Tactical Facilities */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
                {CITIES.map((city) => (
                  <button
                    key={city}
                    onClick={() => setSelectedCity(city)}
                    className={`px-4 py-2 rounded-xl font-black whitespace-nowrap transition-all uppercase tracking-tight ${
                      selectedCity === city
                        ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {t(`map.cities.${city}`)}
                  </button>
                ))}
              </div>

              <div className="text-xs text-zinc-400 font-bold hidden sm:block">
                إجمالي دخل المنشآت: <span className="text-emerald-400 font-mono">{formatMoney(totalFacilitiesHourlyProfit)} / س</span>
              </div>
            </div>

            {/* Tactical Built Properties List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {ownedTilesInCity.length === 0 ? (
                <div className="col-span-full p-12 bg-black/30 rounded-3xl border border-dashed border-zinc-800 text-center space-y-3">
                  <AlertTriangle className="w-10 h-10 text-zinc-700 mx-auto" />
                  <p className="text-zinc-400 font-bold text-sm">{t('properties.noProperties')}</p>
                </div>
              ) : (
                ownedTilesInCity.map((tileId) => {
                  const builtProp = cityProperties.find(p => p.tileId === tileId);
                  const isBuilt = !!builtProp;
                  const isExpanded = expandedProperty === builtProp?.id;
                  const isBuilding = buildingOnTile === tileId;

                  if (isBuilt && builtProp) {
                    const propType = PROPERTY_TYPES.find(pt => pt.id === builtProp.type)!;
                    return (
                      <div
                        key={`tile-${tileId}`}
                        className={`bg-zinc-900/80 backdrop-blur-md border ${propType.border} rounded-2xl p-6 transition-all shadow-xl relative overflow-hidden`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className={`p-4 rounded-xl ${propType.bg} ${propType.color}`}>
                              <propType.icon className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-black text-white">
                                  {t(`properties.types.${propType.id}`)}
                                </h3>
                                <span className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] font-black text-zinc-400">
                                  مستوى {builtProp.level}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-400 mt-0.5">
                                {t(`properties.desc_types.${propType.id}`)}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => setExpandedProperty(isExpanded ? null : builtProp.id)}
                            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all"
                          >
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        </div>

                        {/* Revenue bar */}
                        <div className="mt-4 flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5 text-xs">
                          <span className="text-zinc-500 font-bold">الأرباح التقديرية الساعية:</span>
                          <span className="font-black text-emerald-400 font-mono">
                            {formatMoney(calculateMinuteProfit(builtProp) * 60)} / س
                          </span>
                        </div>

                        {/* Management Panel */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              {renderFacilityManagement(builtProp)}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`tile-${tileId}`}
                      className="bg-black/30 border border-zinc-800/80 border-dashed rounded-2xl p-6 flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-zinc-800 text-zinc-500 rounded-xl">
                          <Building2 size={24} />
                        </div>
                        <div>
                          <h4 className="font-black text-zinc-300 text-sm">قطعة أرض خالية #{tileId}</h4>
                          <p className="text-xs text-zinc-500">جاهزة لبناء منشأة استثمارية أو أمنية</p>
                        </div>
                      </div>

                      {isBuilding ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                            {PROPERTY_TYPES.map(pt => (
                              <button
                                key={pt.id}
                                onClick={() => handleBuild(pt, tileId)}
                                className="p-2.5 bg-zinc-900 hover:bg-red-600/20 border border-zinc-800 hover:border-red-500 rounded-xl flex items-center justify-between text-xs transition-all"
                              >
                                <span className="font-bold text-white">{t(`properties.types.${pt.id}`)}</span>
                                <span className="text-emerald-400 font-mono text-[10px]">{formatMoney(pt.price)}</span>
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => setBuildingOnTile(null)}
                            className="w-full py-1.5 text-zinc-500 hover:text-white text-xs font-bold"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setBuildingOnTile(tileId)}
                          className="w-full py-3 bg-zinc-800 hover:bg-red-600 text-zinc-200 hover:text-white rounded-xl text-xs font-black transition-all shadow"
                        >
                          + تشييد منشأة جديدة على هذه الأرض
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: GANG INFLUENCE & TURF ALLIANCE */}
        {activeMainTab === 'gang_influence' && (
          <div className="space-y-6">
            {profile?.gangId ? (
              <div className="space-y-6">
                {/* Gang Header Card */}
                <div className="p-6 bg-gradient-to-r from-purple-900/40 via-zinc-900 to-black rounded-3xl border border-purple-500/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-purple-600/20 text-purple-400 rounded-2xl border border-purple-500/40 shadow-inner">
                      <Crown size={32} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-black text-white">{profile.gangName || 'عصابتنا'}</h2>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          تحالف إقليمي
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        تربط عقاراتك مباشرة بنفوذ العصابة بالمدينة لزيادة رصيد الخزينة والدفاعات ضد العصابات المعادية.
                      </p>
                    </div>
                  </div>

                  <Link
                    to="/gangs"
                    className="px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-purple-900/40"
                  >
                    <Users size={16} />
                    غرفة عمليات العصابة المركزية
                    <ChevronRight size={14} className="rtl:rotate-180" />
                  </Link>
                </div>

                {/* Gang Territory Perks */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-5 bg-black/40 rounded-2xl border border-zinc-800 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-black">
                      <Coins size={18} />
                      <span>تدفق مالي تلقائي</span>
                    </div>
                    <p className="text-zinc-400 text-[11px]">
                      تستطيع تحويل عوائد إيجارات عقاراتك إلى خزينة العصابة لدعم ترقياتها ومشتريات الأسلحة والعتاد.
                    </p>
                  </div>

                  <div className="p-5 bg-black/40 rounded-2xl border border-zinc-800 space-y-2">
                    <div className="flex items-center gap-2 text-blue-400 font-black">
                      <ShieldCheck size={18} />
                      <span>حماية إقليمية مشتركة</span>
                    </div>
                    <p className="text-zinc-400 text-[11px]">
                      تثبيت راية العصابة على المباني يمنح دفاعات إضافية لأعضاء العصابة في المقاطعة ويقلل خسائر حروب العصابات.
                    </p>
                  </div>

                  <div className="p-5 bg-black/40 rounded-2xl border border-zinc-800 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-black">
                      <Zap size={18} />
                      <span>مضاعفة كفاءة غسيل الأموال</span>
                    </div>
                    <p className="text-zinc-400 text-[11px]">
                      السيطرة على أكثر من 3 مبانٍ في مقاطعة واحدة يخفض عمولة غسيل الأموال القذرة بنسبة 15% لكافة الأعضاء.
                    </p>
                  </div>
                </div>

                {/* Controlled Buildings by Gang */}
                <div className="bg-zinc-900/60 p-6 rounded-3xl border border-zinc-800 space-y-4">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Flame size={18} className="text-red-500" />
                    عقارات الخريطة الحاملة لراية العصابة ({cityBuildings.filter(b => b.gangId === profile.gangId).length})
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {cityBuildings.filter(b => b.gangId === profile.gangId).length === 0 ? (
                      <div className="col-span-full py-8 text-center text-zinc-500 text-xs">
                        لم يتم تثبيت راية العصابة على أي عقار بعد. يمكنك تثبيت الراية من تبويب "عقارات الخريطة والنفوذ"!
                      </div>
                    ) : (
                      cityBuildings
                        .filter(b => b.gangId === profile.gangId)
                        .map(bld => (
                          <div key={bld.id} className="p-4 bg-black/50 rounded-xl border border-purple-500/20 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white">{bld.name}</span>
                              <span className="text-[10px] text-purple-400">{bld.district}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-zinc-400">
                              <span>المسؤول: {bld.ownerName}</span>
                              <span className="text-emerald-400 font-mono font-bold">{formatMoney(bld.dailyRevenue)}/يوم</span>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center bg-black/40 rounded-3xl border border-dashed border-zinc-800 space-y-4">
                <Crown className="w-12 h-12 text-zinc-700 mx-auto" />
                <div>
                  <h4 className="text-lg font-black text-white">أنت لست منضماً لأي عصابة حالياً</h4>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1">
                    انضم إلى إحدى عصابات المدينة أو أنشئ عصابتك الخاصة لتوحيد العقارات وتوسيع نفوذك المشترك في المقاطعات!
                  </p>
                </div>
                <Link
                  to="/gangs"
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black transition-all shadow inline-block"
                >
                  استعراض العصابات المتاحة
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
