import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore, Militia, MilitiaSoldier, MilitiaVehicle, MilitiaSquad } from '../store/useAuthStore';
import { 
  Shield, 
  Users, 
  ShoppingCart, 
  TrendingUp, 
  Wrench, 
  Landmark, 
  Swords, 
  Target, 
  Plus, 
  Image as ImageIcon,
  AlertTriangle,
  Gem,
  X,
  Zap,
  Heart,
  ShieldCheck,
  Fuel,
  Coins,
  ArrowRightLeft,
  Lock,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Anchor,
  Handshake,
  History,
  Trophy,
  XCircle,
  Search,
  Truck,
  Package,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  Flame,
  DollarSign,
  LayoutGrid,
  List,
  Castle,
  Settings,
  UserCheck,
  Radio,
  CheckCircle,
  Building2,
  ArrowUpCircle,
  Droplets,
  Utensils,
  ChevronUp,
  UserPlus,
  ChevronDown,
  Plane,
  Eye
} from 'lucide-react';
import { doc, updateDoc, setDoc, getDoc, deleteDoc, onSnapshot, collection, query, where, getDocs, limit, or, and, orderBy, writeBatch, serverTimestamp, deleteField, increment } from 'firebase/firestore';                
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { toast } from 'sonner';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { formatNumber, formatMoney } from '../lib/utils';
import { MILITIA_IMAGES as DEFAULT_MILITIA_IMAGES, SHOP_ITEMS as DEFAULT_SHOP_ITEMS } from '../constants/militiaItems';

const SOLDIER_NAMES = ['أحمد', 'محمد', 'علي', 'عمر', 'خالد', 'طارق', 'زياد', 'فهد', 'سعد', 'يوسف', 'حسن', 'حسين', 'محمود', 'مصطفى', 'عبدالله'];

const MILITIA_RANKS = [
  { id: 'private', name: 'جندي', powerBonus: 1 },
  { id: 'lieutenant', name: 'ملازم', powerBonus: 1.2 },
  { id: 'first_lieutenant', name: 'ملازم أول', powerBonus: 1.4 },
  { id: 'captain', name: 'نقيب', powerBonus: 1.6 },
  { id: 'major', name: 'رائد', powerBonus: 1.8 },
  { id: 'lieutenant_colonel', name: 'مقدم', powerBonus: 2.1 },
  { id: 'colonel', name: 'عقيد', powerBonus: 2.5 },
  { id: 'brigadier_general', name: 'عميد', powerBonus: 3 },
  { id: 'major_general', name: 'لواء', powerBonus: 4 },
];

const HQ_LEVELS = [
  { level: 1, cost: 0, cap: { soldiers: 100, vehicles: 25, weapons: 100, fuel: 20000, ammo: 20000, food: 20000, water: 20000, medicine: 20000 } },
  { level: 2, cost: 50000000, cap: { soldiers: 120, vehicles: 30, weapons: 120, fuel: 24000, ammo: 24000, food: 24000, water: 24000, medicine: 24000 } },
  { level: 3, cost: 100000000, cap: { soldiers: 144, vehicles: 36, weapons: 144, fuel: 28800, ammo: 28800, food: 28800, water: 28800, medicine: 28800 } },
  { level: 4, cost: 150000000, cap: { soldiers: 173, vehicles: 43, weapons: 173, fuel: 34560, ammo: 34560, food: 34560, water: 34560, medicine: 34560 } },
  { level: 5, cost: 200000000, cap: { soldiers: 207, vehicles: 52, weapons: 207, fuel: 41472, ammo: 41472, food: 41472, water: 41472, medicine: 41472 } }
];

const FACILITIES_CONFIG = [
  { id: 'intelligenceLevel', name: 'مكتب الاستخبارات', description: 'يزيد من القوة الهجومية والدفاعية للمليشيا.', icon: Target, baseCost: 25000000, bonus: '+10% قوة لكل مستوى' },
  { id: 'medicalLevel', name: 'الجناح الطبي', description: 'يسرع من عملية شفاء الجنود المصابين.', icon: Heart, baseCost: 15000000, bonus: '-15% زمن شفاء لكل مستوى' },
  { id: 'logisticsLevel', name: 'المركز اللوجستي', description: 'يزيد من القدرة الاستيعابية للموارد والعتاد.', icon: Package, baseCost: 10000000, bonus: '+20% سعة لكل مستوى' },
  { id: 'trainingLevel', name: 'ثكنات التدريب', description: 'يزيد من كفاءة التدريب وخبرة الجنود.', icon: TrendingUp, baseCost: 20000000, bonus: '+5% نقاط خبرة لكل مستوى' }
];

const DEFAULT_FOUNDERS = [
  {
    id: 'founder_1',
    name: 'حيدر أبو زيد البغدادي',
    description: 'قائد كاريزمي وصاحب نفوذ واسع. يسيطر على القرارات الكبرى. بارع في إدارة التحالفات. يفضل السيطرة الذكية بدل المواجهة المباشرة.',
    image: 'https://up6.cc/2026/04/177629618115511.jpeg'
  },
  {
    id: 'founder_2',
    name: 'جاسم أبو فهد الأنباري',
    description: 'مقاتل صلب وشرس. يتحمل الحروب الطويلة. يعتمد عليه في الخطوط الأمامية. لا يتراجع بسهولة.',
    image: 'https://up6.cc/2026/04/177629618119042.jpeg'
  },
  {
    id: 'founder_3',
    name: 'كرار أبو علي الموصلي',
    description: 'خفي وسريع جدًا. متخصص في التسلل والاغتيالات. يضرب ويختفي بدون أثر. دقيق في تنفيذ المهام.',
    image: 'https://up6.cc/2026/04/177629618122243.jpeg'
  },
  {
    id: 'founder_4',
    name: 'مهند أبو سيف البصري',
    description: 'عقل اقتصادي خطير. يتحكم بالموارد والإمدادات. بارع في الصفقات والتهريب. يفضل الفوز بدون قتال.',
    image: 'https://up6.cc/2026/04/177629618126044.jpeg'
  },
  {
    id: 'founder_5',
    name: 'علاء أبو حسن التكريتي',
    description: 'هجومي وحاسم. يقود المعارك بنفسه. سريع في اتخاذ القرار. يزرع الخوف في الخصوم.',
    image: 'https://up6.cc/2026/04/177629618129775.jpeg'
  }
];

export default function Militias() {
  const { t } = useTranslation();
  const { profile, overrides = {}, convertGoldToCorruptionMoney } = useAuthStore();
  
  const getItemImage = useCallback((item: any) => {
    if (!item) return undefined;
    // 1. Check override by Name (Highest priority for sync as requested)
    if (overrides[item.name]?.image) return overrides[item.name].image;
    // 2. Check override by ID
    if (overrides[item.id]?.image) return overrides[item.id].image;
    // 3. Fallback to item's default image
    return item.image || undefined;
  }, [overrides]);

  const MILITIA_IMAGES = {
    background: overrides['militia_bg']?.image || DEFAULT_MILITIA_IMAGES.aircraft, // Fallback to something default if needed
    soldierSuit: overrides['militia_soldier_suit']?.image || 'https://up6.cc/2026/04/177619222519472.png',
    soldierArmor: overrides['militia_soldier_armor']?.image || 'https://up6.cc/2026/04/177619222528313.png',
    soldierFull: overrides['militia_soldier_full']?.image || 'https://up6.cc/2026/04/177619222536134.png',
    sf_suit: overrides['militia_sf_suit']?.image || DEFAULT_MILITIA_IMAGES.intelligence,
    sf_mk18: overrides['militia_sf_mk18']?.image || 'https://up6.cc/2026/04/177629041197452.png',
    sf_m24: overrides['militia_sf_m24']?.image || 'https://up6.cc/2026/04/177629041206183.png',
    sf_rpg: overrides['militia_sf_rpg']?.image || 'https://up6.cc/2026/04/177629041210764.png',
    vehicle: overrides['militia_vehicle']?.image || DEFAULT_MILITIA_IMAGES.vehicle,
    logistics: overrides['militia_logistics']?.image || DEFAULT_MILITIA_IMAGES.logistics,
    armor: overrides['militia_armor_item']?.image || DEFAULT_MILITIA_IMAGES.armor,
    weapon: overrides['militia_weapon_item']?.image || DEFAULT_MILITIA_IMAGES.weapon,
    light_armor: overrides['militia_light_armor']?.image || DEFAULT_MILITIA_IMAGES.vehicle,
    apc: overrides['militia_apc']?.image || DEFAULT_MILITIA_IMAGES.vehicle,
    tank: overrides['militia_tank']?.image || DEFAULT_MILITIA_IMAGES.vehicle,
    mk18: overrides['militia_mk18']?.image || 'https://up6.cc/2026/04/177629041197452.png',
    m24: overrides['militia_m24']?.image || 'https://up6.cc/2026/04/177629041206183.png',
    rpg: overrides['militia_rpg']?.image || 'https://up6.cc/2026/04/177629041210764.png',
    soldier_rpg: overrides['militia_soldier_rpg']?.image || 'https://up6.cc/2026/04/177629041210764.png',
    soldier_m24: overrides['militia_soldier_m24']?.image || 'https://up6.cc/2026/04/177629041206183.png',
    aircraft: overrides['militia_aircraft']?.image || DEFAULT_MILITIA_IMAGES.aircraft,
    intelligence: overrides['militia_intelligence']?.image || DEFAULT_MILITIA_IMAGES.intelligence,
    fortifications: overrides['militia_fortifications']?.image || DEFAULT_MILITIA_IMAGES.fortifications
  };

  const SHOP_ITEMS = DEFAULT_SHOP_ITEMS;

  const [activeTab, setActiveTab] = useState<'dashboard' | 'soldiers' | 'shop' | 'training' | 'maintenance' | 'bank' | 'combat' | 'resources' | 'hospital' | 'inventory' | 'forces' | 'all_militias' | 'headquarters'>('dashboard');
  const [inventoryTab, setInventoryTab] = useState<'weapons' | 'armor' | 'vehicles' | 'logistics' | 'aircraft' | 'intelligence' | 'fortifications'>('weapons');
  const [inventoryViewMode, setInventoryViewMode] = useState<'grid' | 'list'>('grid');
  const [shopCategory, setShopCategory] = useState<'vehicles' | 'weapons' | 'armor' | 'logistics' | 'aircraft' | 'intelligence' | 'fortifications'>('weapons');
  const [activeSoldiersTab, setActiveSoldiersTab] = useState<'normal' | 'special'>('normal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activityLogs, setActivityLogs] = useState<{ msg: string; time: number; type: string }[]>([]);
  const [showExecutionPreview, setShowExecutionPreview] = useState(false);
  const [potentialActions, setPotentialActions] = useState<any[]>([]);
  const [goldAmount, setGoldAmount] = useState('');
  const [dirtyMoneyToCorruptionAmount, setDirtyMoneyToCorruptionAmount] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showSquadModal, setShowSquadModal] = useState(false);
  const [showGeneralModal, setShowGeneralModal] = useState(false);
  const [showAIBattleModal, setShowAIBattleModal] = useState(false);
  const [militiaShop, setMilitiaShop] = useState<any>(null);
  const [showFounderModal, setShowFounderModal] = useState(false);
  const [showEditFounderModal, setShowEditFounderModal] = useState(false);
  const [militiaSettings, setMilitiaSettings] = useState({ name: '', image: '' });
  const [hqImageInput, setHqImageInput] = useState('');
  const [selectedFounderTemplate, setSelectedFounderTemplate] = useState<any>(null);
  const [customFounders, setCustomFounders] = useState<typeof DEFAULT_FOUNDERS>([]);
  const [newSquad, setNewSquad] = useState({
    name: '',
    leaderId: '',
    soldierIds: [] as string[],
    vehicleId: ''
  });
  const [shopQuantities, setShopQuantities] = useState<Record<string, number>>({});
  const [newItemData, setNewItemData] = useState({
    category: 'weapons',
    name: '',
    image: '',
    price: 0,
    power: 0,
    defense: 0,
    effect: '',
    quantity: 0,
    logisticsType: 'ammo'
  });
  const [editingItem, setEditingItem] = useState<{ category: string, item: any } | null>(null);
  const [editingSquadId, setEditingSquadId] = useState<string | null>(null);
  const [dynamicShopItems, setDynamicShopItems] = useState(SHOP_ITEMS);
  const [showResourceAttackModal, setShowResourceAttackModal] = useState(false);
  const [selectedResourceType, setSelectedResourceType] = useState<keyof Militia['controlledResources'] | null>(null);
  const [resourceAttackUnits, setResourceAttackUnits] = useState({
    squads: 0,
    aircraft: 0,
    intel: 0
  });
  const [otherMilitias, setOtherMilitias] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [soldiersDisplayCount, setSoldiersDisplayCount] = useState(20);
  const [soldiersViewMode, setSoldiersViewMode] = useState<'grid' | 'list'>('grid');
  const [forcesViewMode, setForcesViewMode] = useState<'grid' | 'list'>('grid');
  const [recruitCount, setRecruitCount] = useState<number>(1);
  
  // Training/Promotion Batch State
  const [selectedTrainingSoldiers, setSelectedTrainingSoldiers] = useState<string[]>([]);
  const [trainingIncrements, setTrainingIncrements] = useState({ strength: 0, speed: 0, defense: 0, endurance: 0 });
  const [targetPromotionRank, setTargetPromotionRank] = useState<string>('');
  const [trainingTab, setTrainingTab] = useState<'courses' | 'promotion' | 'active'>('courses');
  const [trainingPaymentCurrency, setTrainingPaymentCurrency] = useState<'corruption' | 'gold'>('corruption');
  const [promotionPaymentCurrency, setPromotionPaymentCurrency] = useState<'corruption' | 'gold'>('corruption');
  const [trainingRankFilter, setTrainingRankFilter] = useState<string>('all');
  const [promotionRankFilter, setPromotionRankFilter] = useState<string>('all');


  // Real-time ticker for active tasks
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const [allianceRequests, setAllianceRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [myAlliances, setMyAlliances] = useState<string[]>([]);
  const [supportData, setSupportData] = useState<{ targetId: string, type: string, amount: number }>({ targetId: '', type: 'ammo', amount: 0 });
  const [supportAmount, setSupportAmount] = useState<number>(0);
  const [newMilitia, setNewMilitia] = useState({
    name: '',
    image: '',
    type: 'aggressive' as Militia['type']
  });
  
  const handleForceDeleteLogisticsItem = async (itemId: string, militiaId: string) => {
    if (profile?.role !== 'Admin') return;
    try {
      const militiaRef = doc(db, 'militias', militiaId);
      const userRef = doc(db, 'users', profile.uid);

      const resMap: any = { 'm_log_4': 'ammo', 'm_log_5': 'fuel', 'm_log_6': 'food', 'm_log_7': 'water', 'm_log_3': 'medicine' };
      const resKey = resMap[itemId.toUpperCase()];

      const updates: any = {
        [`inventory.logistics.${itemId}`]: deleteField()
      };
      if (resKey) {
        updates[`resources.${resKey}`] = 0;
      }

      await updateDoc(militiaRef, updates);

      if (profile.militia?.id === militiaId) {
        const userUpdates: any = {
          [`militia.inventory.logistics.${itemId}`]: deleteField()
        };
        if (resKey) {
          userUpdates[`militia.resources.${resKey}`] = 0;
        }
        await updateDoc(userRef, userUpdates);
      }

      toast.success('تم حذف العنصر بنجاح (إجباري)');
    } catch (error) {
      console.error(error);
      toast.error('فشل حذف العنصر');
    }
  };

  const filteredMilitias = useMemo(() => {
    return otherMilitias.filter(m => {
      const isSelf = m.id === profile?.uid;
      const mName = (m.militia?.name || '').toLowerCase();
      const dName = (m.displayName || '').toLowerCase();
      const sQuery = searchQuery.toLowerCase();
      return !isSelf && (mName.includes(sQuery) || dName.includes(sQuery));
    });
  }, [otherMilitias, profile?.uid, searchQuery]);

  const alliedMilitias = useMemo(() => {
    return filteredMilitias.filter(m => myAlliances.includes(m.id));
  }, [filteredMilitias, myAlliances]);

  const nonAlliedMilitias = useMemo(() => {
    return filteredMilitias.filter(m => !myAlliances.includes(m.id));
  }, [filteredMilitias, myAlliances]);

  const militia = profile?.militia;

  const getHqCapacity = useCallback(() => {
    const level = militia?.gqh?.level || 1;
    const logisticsLevel = militia?.gqh?.facilities?.logisticsLevel || 0;
    const base = HQ_LEVELS[0].cap;
    const hqMultiplier = Math.pow(1.2, level - 1);
    const logisticsMultiplier = 1 + (logisticsLevel * 0.2); // +20% per level
    
    const multiplier = hqMultiplier * logisticsMultiplier;

    return {
      soldiers: Math.floor(base.soldiers * multiplier),
      vehicles: Math.floor(base.vehicles * multiplier),
      weapons: Math.floor(base.weapons * multiplier),
      resources: Math.floor(base.fuel * multiplier)
    };
  }, [militia?.gqh?.level, militia?.gqh?.facilities?.logisticsLevel]);

  useEffect(() => {
    if (militia) {
      setMilitiaSettings({
        name: militia.name || '',
        image: militia.image || ''
      });
      setHqImageInput(militia.gqh?.image || '');
    }
  }, [militia]);

  const handleUpdateMilitiaSettings = async () => {
    if (!profile || !militia) return;
    if (!militiaSettings.name.trim()) {
      toast.error('الاسم لا يمكن أن يكون فارغاً');
      return;
    }
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        'militia.name': militiaSettings.name,
        'militia.image': militiaSettings.image
      });
      toast.success('تم تحديث إعدادات المليشيا بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpgradeHQ = async () => {
    if (!profile || !militia) return;
    const currentLevel = militia.gqh?.level || 1;
    if (currentLevel >= 5) {
      toast.error('لقد وصلت للمستوى الأقصى للمقر (5)');
      return;
    }

    const nextLevelData = HQ_LEVELS.find(l => l.level === currentLevel + 1);
    if (!nextLevelData) return;

    if (militia.resources.corruptionMoney < nextLevelData.cost) {
      toast.error(`تكلفة التطوير ${formatNumber(nextLevelData.cost)} أموال فساد`);
      return;
    }

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        'militia.gqh.level': nextLevelData.level,
        'militia.resources.corruptionMoney': (militia.resources.corruptionMoney || 0) - nextLevelData.cost
      });
      toast.success(`مبروك! تم تطوير المقر العام إلى المستوى ${nextLevelData.level}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpgradeFacility = async (facilityId: string) => {
    if (!profile || !militia) return;
    const facilities = militia.gqh?.facilities || { intelligenceLevel: 0, medicalLevel: 0, logisticsLevel: 0, trainingLevel: 0 };
    const currentLevel = (facilities as any)[facilityId] || 0;
    
    if (currentLevel >= 5) {
      toast.error('لقد وصلت للمستوى الأقصى للمرفق (5)');
      return;
    }

    const config = FACILITIES_CONFIG.find(f => f.id === facilityId);
    if (!config) return;

    const cost = Math.floor(config.baseCost * Math.pow(1.8, currentLevel));

    if (militia.resources.corruptionMoney < cost) {
      toast.error(`تكلفة التطوير ${formatNumber(cost)} أموال فساد`);
      return;
    }

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        [`militia.gqh.facilities.${facilityId}`]: currentLevel + 1,
        'militia.resources.corruptionMoney': (militia.resources.corruptionMoney || 0) - cost
      });
      toast.success(`تم تطوير ${config.name} إلى المستوى ${currentLevel + 1}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectFounder = async (founder: any) => {
    if (!profile || !militia) return;
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        'militia.gqh.founder': founder
      });
      setShowFounderModal(false);
      toast.success(`تم اختيار ${founder.name} كزعيم ومؤسس للمليشيا`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateHQImage = async () => {
    if (!profile || !militia) return;
    if (!hqImageInput.trim()) {
      toast.error('يرجى إدخال رابط الصورة');
      return;
    }
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        'militia.gqh.image': hqImageInput
      });
      toast.success('تم تحديث صور المقر العام');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBuyCommCenterDirect = async () => {
    if (!profile || !militia) return;
    const item = SHOP_ITEMS.logistics.find(i => i.id === 'm_log_2');
    if (!item) return;

    if (militia.resources.corruptionMoney < item.price) {
      toast.error('رصيدك من أموال الفساد غير كافٍ');
      return;
    }

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        'militia.resources.corruptionMoney': (militia.resources.corruptionMoney || 0) - item.price,
        'militia.inventory.logistics.m_log_2': (militia.inventory?.logistics?.m_log_2 || 0) + 1,
        'militia.gqh.hasCommCenter': true
      });
      toast.success('تم تفعيل مركز الاتصالات في المقر العام');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'gameData', 'founders'), (snap) => {
      if (snap.exists()) {
        setCustomFounders(snap.data().list || DEFAULT_FOUNDERS);
      } else {
        setCustomFounders(DEFAULT_FOUNDERS);
      }
    });
    return () => unsub();
  }, []);

  const handleUpdateAdminFounders = async (newList: any[]) => {
    if (profile?.role !== 'Admin') return;
    try {
      await setDoc(doc(db, 'gameData', 'founders'), { list: newList });
      toast.success('تم تحديث قائمة الزعماء المؤسسين عالمياً');
    } catch (error) {
      toast.error('فشل في تحديث قائمة الزعماء');
    }
  };

  const handleSyncResources = async (militiaToSync?: any) => {
    const targetMilitia = militiaToSync || militia;
    if (!profile || !targetMilitia) return;
    setIsSyncing(true);
    try {
      const inv = targetMilitia.inventory?.logistics || {};
      const updates: any = {};
      
      const syncVal = (itemId: string, resKey: string) => {
        // Support both cases during sync
        const units = Number(inv[itemId.toUpperCase()] || inv[itemId.toLowerCase()] || 0);
        updates[`militia.resources.${resKey}`] = units;
      };

      syncVal('m_log_4', 'ammo');
      syncVal('m_log_5', 'fuel');
      syncVal('m_log_6', 'food');
      syncVal('m_log_7', 'water');
      syncVal('m_log_3', 'medicine');

      await updateDoc(doc(db, 'users', profile.uid), updates);
      
      // Also sync to militia document
      const militiaUpdates: any = {};
      Object.keys(updates).forEach(k => {
          militiaUpdates[k.replace('militia.', '')] = updates[k];
      });
      await updateDoc(doc(db, 'militias', targetMilitia.id), militiaUpdates);

      toast.success('تمت مزامنة الموارد بنجاح من المستودع');
    } catch (error) {
      console.error('Error syncing resources:', error);
      toast.error('فشلت المزامنة، حاول مرة أخرى');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePurchaseDeficit = async () => {
    if (!militia || !profile) return;
    setIsProcessing(true);
    
    try {
      const shopMapping = [
        { key: 'ammo', invKey: 'm_log_4', threshold: 1000, shopId: 'm_log_4' },
        { key: 'fuel', invKey: 'm_log_5', threshold: 1000, shopId: 'm_log_5' },
        { key: 'food', invKey: 'm_log_6', threshold: 1000, shopId: 'm_log_6' },
        { key: 'water', invKey: 'm_log_7', threshold: 1000, shopId: 'm_log_7' },
        { key: 'medicine', invKey: 'm_log_3', threshold: 1000, shopId: 'm_log_3' },
      ];

      const userUpdates: any = {};
      const actions: string[] = [];
      
      let currentCorruptionMoneyMutable = Number(militia.resources?.corruptionMoney || 0);

      let totalBought = 0;
      let totalCostSpent = 0;

      for (const item of shopMapping) {
        let currentAmount = Number(militia.resources?.[item.key as keyof typeof militia.resources] || 0);
        let currentInv = Number(militia.inventory?.logistics?.[item.invKey] || 0);

        if (currentAmount < item.threshold) {
          const shopItem = SHOP_ITEMS.logistics.find(i => i.id === item.shopId);
          if (shopItem) {
            const shortage = item.threshold - currentAmount;
            const costPerUnit = shopItem.price / 1000;
            const maxAffordableUnits = Math.floor(currentCorruptionMoneyMutable / costPerUnit);
            
            const unitsToBuy = Math.min(shortage, maxAffordableUnits);
            
            if (unitsToBuy > 0) {
              const cost = Math.ceil(unitsToBuy * costPerUnit);
              currentCorruptionMoneyMutable -= cost;
              
              const newResVal = currentAmount + unitsToBuy;
              const newInvVal = currentInv + unitsToBuy;

              userUpdates[`militia.resources.${item.key}`] = newResVal;
              userUpdates[`militia.inventory.logistics.${item.invKey}`] = newInvVal;
              
              totalCostSpent += cost;
              totalBought += unitsToBuy;
              actions.push(`تم تأمين ${unitsToBuy} وحدة من ${shopItem.name}`);
            }
          }
        }
      }

      if (totalBought === 0) {
        if (shopMapping.some(item => Number(militia.resources?.[item.key as keyof typeof militia.resources] || 0) < item.threshold)) {
             toast.error('لا تملك أموال فساد كافية لشراء أي كمية من الموارد الناقصة');
        } else {
             toast.info('لا يوجد نقص في الموارد الاستراتيجية حالياً');
        }
        setIsProcessing(false);
        return;
      }

      userUpdates['militia.resources.corruptionMoney'] = currentCorruptionMoneyMutable;
      userUpdates['updatedAt'] = serverTimestamp();

      const batch = writeBatch(db);
      const userRef = doc(db, 'users', profile.uid);
      const militiaRef = doc(db, 'militias', militia.id);
      
      batch.update(userRef, userUpdates);
      
      const militiaUpdates: any = {};
      Object.keys(userUpdates).forEach(key => {
        if (key.startsWith('militia.')) {
          militiaUpdates[key.replace('militia.', '')] = userUpdates[key];
        } else {
          militiaUpdates[key] = userUpdates[key];
        }
      });

      if (!militia.ownerId) {
        militiaUpdates['ownerId'] = profile.uid;
        userUpdates['militia.ownerId'] = profile.uid;
      }

      batch.set(militiaRef, militiaUpdates, { merge: true });

      await batch.commit();
      
      actions.forEach(a => addActivityLog(a, 'logistics'));
      toast.success(`عملية ناجحة: تم شراء ${totalBought} وحدة بتكلفة ${formatNumber(totalCostSpent)} من أموال الفساد وتم سد النقص ونقلها للمخزن`);
    } catch (error) {
      console.error('Error buying deficit:', error);
      toast.error('فشل في شراء الموارد');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecruit = async (isSpecialForces: boolean) => {
    if (!militia || !profile) return;
    
    // Config: Cost
    const cost = isSpecialForces ? 1000 * recruitCount : 100000 * recruitCount;
    
    if (isSpecialForces) {
        if ((profile.gold || 0) < cost) {
            toast.error('الذهب غير كافٍ');
            return;
        }
    } else {
        if ((militia.resources.corruptionMoney || 0) < cost) {
            toast.error('أموال الفساد غير كافية');
            return;
        }
    }

    setIsProcessing(true);
    try {
      const newSoldiers = Array.from({ length: recruitCount }).map(() => {
        let selectedWeaponId = '';
        let selectedArmorId = '';
        let image = isSpecialForces ? MILITIA_IMAGES.sf_suit : MILITIA_IMAGES.soldierSuit;
        
        if (isSpecialForces) {
            // Pick a random weapon (MK18, M24, RPG)
            const possibleWeapons = ['m_wep_1', 'm_wep_2', 'm_wep_3'];
            selectedWeaponId = possibleWeapons[Math.floor(Math.random() * possibleWeapons.length)];
            
            // Assign ceramic heavy armor
            selectedArmorId = 'm_arm_2';
            
            // Set image based on weapon
            if (selectedWeaponId === 'm_wep_1') image = MILITIA_IMAGES.sf_mk18;
            if (selectedWeaponId === 'm_wep_2') image = MILITIA_IMAGES.sf_m24;
            if (selectedWeaponId === 'm_wep_3') image = MILITIA_IMAGES.sf_rpg;
        }

        return {
          id: `soldier_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          name: SOLDIER_NAMES[Math.floor(Math.random() * SOLDIER_NAMES.length)],
          image: image,
          stats: {
            strength: isSpecialForces ? 10000 : 50,
            speed: isSpecialForces ? 10000 : 40,
            defense: isSpecialForces ? 10000 : 45,
            endurance: isSpecialForces ? 10000 : 55,
          },
          health: 100,
          level: 1,
          isSpecialForces: isSpecialForces,
          hasArmor: isSpecialForces,
          hasWeapon: isSpecialForces,
          equipped: isSpecialForces ? {
              weapon: selectedWeaponId,
              armor: selectedArmorId
          } : undefined
        };
      });

      const batch = writeBatch(db);
      const userRef = doc(db, 'users', profile.uid);
      const militiaRef = doc(db, 'militias', militia.id);
      
      const militiaUpdateData: any = {
        soldiers: [...(militia.soldiers || []), ...newSoldiers]
      };

      const userUpdateData: any = {
        'militia.soldiers': [...(militia.soldiers || []), ...newSoldiers]
      };

      if (isSpecialForces) {
          batch.update(userRef, { 
            gold: increment(-cost),
            'militia.soldiers': userUpdateData['militia.soldiers']
          });
      } else {
          militiaUpdateData['resources.corruptionMoney'] = increment(-cost);
          userUpdateData['militia.resources.corruptionMoney'] = increment(-cost);
          batch.update(userRef, userUpdateData);
      }
      
      batch.update(militiaRef, militiaUpdateData);
      
      await batch.commit();
      toast.success(`تم تجنيد ${recruitCount} جندي ${isSpecialForces ? 'قوات خاصة وتجهيزهم آلياً' : 'عادي'} بنجاح`);
    } catch (error) {
      console.error('Recruitment error:', error);
      toast.error('فشل عملية التجنيد');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!profile?.uid) return;
    
    // Safety check: if militia exists but soldiers or inventory is missing, initialize it
    if (profile.militia) {
      const updates: any = {};
      let needsUpdate = false;

      if (!profile.militia.soldiers) {
        updates['militia.soldiers'] = [];
        needsUpdate = true;
      }
      if (!profile.militia.vehicles) {
        updates['militia.vehicles'] = [];
        needsUpdate = true;
      }
      if (!profile.militia.inventory) {
        updates['militia.inventory'] = {
          weapons: {},
          armor: {},
          logistics: {},
          clothing: {},
          equipment: {},
          vehicles: {}
        };
        needsUpdate = true;
      } else {
        ['weapons', 'armor', 'logistics', 'clothing', 'equipment', 'vehicles'].forEach(cat => {
          if (!profile.militia!.inventory[cat as keyof typeof profile.militia.inventory]) {
            updates[`militia.inventory.${cat}`] = {};
            needsUpdate = true;
          }
        });
      }

      if (needsUpdate) {
        const docRef = doc(db, 'users', profile.uid);
        updateDoc(docRef, updates).catch(console.error);
      }
    }
  }, [profile?.uid, profile?.militia]);

  const handleCreateSquad = async () => {
    if (!profile || !militia || !newSquad.name || !newSquad.leaderId) return;
    if (newSquad.soldierIds.length > 4) {
      toast.error('الفرقة تتكون من 4 جنود كحد أقصى بالإضافة للقائد');
      return;
    }
    
    setIsProcessing(true);
    try {
      // Check if soldiers or vehicle are already in another squad
      const assignedSoldierIds = (militia.squads || [])
        .filter(sq => sq.id !== editingSquadId)
        .flatMap(sq => [sq.leaderId, ...sq.soldierIds]);
      
      const assignedVehicleIds = (militia.squads || [])
        .filter(sq => sq.id !== editingSquadId)
        .map(sq => sq.vehicleId)
        .filter(Boolean);

      if (assignedSoldierIds.includes(newSquad.leaderId) || newSquad.soldierIds.some(id => assignedSoldierIds.includes(id))) {
        toast.error('أحد الجنود المختارين موجود بالفعل في فرقة أخرى');
        setIsProcessing(false);
        return;
      }

      if (newSquad.vehicleId && assignedVehicleIds.includes(newSquad.vehicleId)) {
        toast.error('هذه المركبة موجودة بالفعل في فرقة أخرى');
        setIsProcessing(false);
        return;
      }

      // Calculate squad power
      const leader = militia.soldiers.find(s => s.id === newSquad.leaderId);
      const soldiers = militia.soldiers.filter(s => newSquad.soldierIds.includes(s.id));
      const vehicle = militia.vehicles.find(v => v.id === newSquad.vehicleId);
      
      let power = (leader?.stats?.strength || 0) * 1.5; // Leader bonus
      
      // Rank bonus
      const leaderRank = MILITIA_RANKS.find(r => r.name === leader?.rank) || MILITIA_RANKS[0];
      power *= leaderRank.powerBonus;

      soldiers.forEach(s => {
        const sRank = MILITIA_RANKS.find(r => r.name === s.rank) || MILITIA_RANKS[0];
        power += ((s.stats?.strength || 0) + (s.stats?.defense || 0)) * sRank.powerBonus;
      });
      
      if (vehicle) power *= 1.2; // Vehicle bonus
      
      const squad: MilitiaSquad = {
        id: editingSquadId || Math.random().toString(36).substring(7),
        name: newSquad.name,
        leaderId: newSquad.leaderId,
        soldierIds: newSquad.soldierIds,
        vehicleId: newSquad.vehicleId || null,
        power: Math.floor(isNaN(power) ? 0 : power)
      };

      let updatedSquads = [...(militia.squads || [])];
      if (editingSquadId) {
        updatedSquads = updatedSquads.map(s => s.id === editingSquadId ? squad : s);
      } else {
        updatedSquads.push(squad);
      }

      await updateDoc(doc(db, 'users', profile.uid), {
        'militia.squads': updatedSquads
      });
      
      setShowSquadModal(false);
      setEditingSquadId(null);
      setNewSquad({ name: '', leaderId: '', soldierIds: [], vehicleId: '' });
      toast.success(editingSquadId ? 'تم تحديث الفرقة بنجاح' : 'تم تكوين الفرقة بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePromoteSoldier = async (soldierId: string) => {
    if (!profile || !militia) return;
    const soldier = militia.soldiers.find(s => s.id === soldierId);
    if (!soldier) return;

    const currentRankIndex = MILITIA_RANKS.findIndex(r => r.name === (soldier.rank || 'جندي'));
    if (currentRankIndex === -1 || currentRankIndex >= MILITIA_RANKS.length - 1) {
      toast.error('وصل الجندي لأعلى رتبة ممكنة (لواء)');
      return;
    }

    const nextRank = MILITIA_RANKS[currentRankIndex + 1];
    const cost = (currentRankIndex + 1) * 500000; // Cost increases with rank
    const trainingLevel = militia.gqh?.facilities?.trainingLevel || 0;
    const statBoost = 1.1 + (trainingLevel * 0.02); // Base 10% + 2% per training level

    if (militia.resources.corruptionMoney < cost) {
      toast.error(`تحتاج إلى ${formatNumber(cost)} أموال فساد للترقية`);
      return;
    }

    setIsProcessing(true);
    try {
      const updatedSoldiers = militia.soldiers.map(s => {
        if (s.id === soldierId) {
          return {
            ...s,
            rank: nextRank.name,
            stats: {
              ...s.stats,
              strength: Math.floor(s.stats.strength * statBoost),
              defense: Math.floor(s.stats.defense * statBoost)
            }
          };
        }
        return s;
      });

      await updateDoc(doc(db, 'users', profile.uid), {
        'militia.soldiers': updatedSoldiers,
        'militia.resources.corruptionMoney': militia.resources.corruptionMoney - cost
      });

      toast.success(`تمت ترقية ${soldier.name} إلى رتبة ${nextRank.name}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLaunderDirtyMoney = async (amount: number) => {
    if (!profile || !militia) return;
    if (profile.dirtyMoney < amount) {
      toast.error('لا تملك هذا المبلغ من الأموال القذرة');
      return;
    }

    setIsProcessing(true);
    try {
      const corruptionMoneyGain = Math.floor(amount * 0.9); // 10% fee for converting dirty to corruption
      await updateDoc(doc(db, 'users', profile.uid), {
        dirtyMoney: profile.dirtyMoney - amount,
        'militia.resources.corruptionMoney': militia.resources.corruptionMoney + corruptionMoneyGain
      });
      toast.success(`تم تحويل ${formatNumber(amount)} أموال قذرة إلى ${formatNumber(corruptionMoneyGain)} أموال فساد`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSquad = async (squadId: string) => {
    if (!profile || !militia) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        'militia.squads': militia.squads.filter(s => s.id !== squadId)
      });
      toast.success('تم حل الفرقة');
    } catch (error) {
      console.error("Error deleting squad:", error);
      toast.error('فشل حل الفرقة');
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'gameData', 'militiaShop'), (docSnap) => {
      let dataToUse = SHOP_ITEMS;
      if (docSnap.exists()) {
        dataToUse = docSnap.data() as typeof SHOP_ITEMS;
      }
      
      // Apply overrides
      const updatedData: any = {};
      Object.keys(dataToUse).forEach(category => {
        updatedData[category] = dataToUse[category as keyof typeof SHOP_ITEMS].map((item: any) => ({
          ...item,
          // Use image from gameData if available, then override, then default item.image
          image: item.image || overrides[item.id]?.image || item.defaultImage
        }));
      });
      
      setDynamicShopItems(updatedData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'gameData/militiaShop');
    });
    return () => unsub();
  }, [overrides]);

  useEffect(() => {
    if (!profile?.uid) return;
    
    // Listen for incoming alliance requests
    const qIncoming = query(
      collection(db, 'militia_requests'),
      where('toUid', '==', profile.uid),
      where('status', '==', 'pending')
    );
    
    const unsubIncoming = onSnapshot(qIncoming, (snapshot) => {
      console.log('Incoming requests snapshot:', snapshot.docs.length);
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllianceRequests(requests);
    }, (error) => {
      console.error('Incoming requests listener error:', error);
      toast.error('خطأ في تحميل طلبات التحالف الواردة');
      handleFirestoreError(error, OperationType.GET, 'militia_requests');
    });

    // Listen for outgoing alliance requests
    const qOutgoing = query(
      collection(db, 'militia_requests'),
      where('fromUid', '==', profile.uid),
      where('status', '==', 'pending')
    );
    
    const unsubOutgoing = onSnapshot(qOutgoing, (snapshot) => {
      console.log('Outgoing requests snapshot:', snapshot.docs.length);
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOutgoingRequests(requests);
    }, (error) => {
      console.error('Outgoing requests listener error:', error);
      toast.error('خطأ في تحميل طلبات التحالف المرسلة');
      handleFirestoreError(error, OperationType.GET, 'militia_requests');
    });

    // Listen for accepted alliances (from me)
    const qAlliancesFrom = query(
      collection(db, 'militia_requests'),
      where('status', '==', 'accepted'),
      where('fromUid', '==', profile.uid)
    );
    
    // Listen for accepted alliances (to me)
    const qAlliancesTo = query(
      collection(db, 'militia_requests'),
      where('status', '==', 'accepted'),
      where('toUid', '==', profile.uid)
    );
    
    let alliancesFrom: string[] = [];
    let alliancesTo: string[] = [];

    const updateAlliances = () => {
      const all = Array.from(new Set([...alliancesFrom, ...alliancesTo]));
      setMyAlliances(prev => {
        if (JSON.stringify(prev) === JSON.stringify(all)) return prev;
        return all;
      });
    };

    const unsubAlliancesFrom = onSnapshot(qAlliancesFrom, (snapshot) => {
      alliancesFrom = snapshot.docs.map(doc => doc.data().toUid);
      updateAlliances();
    }, (error) => {
      console.error('AlliancesFrom listener error:', error);
      toast.error('خطأ في تحميل التحالفات (1)');
      handleFirestoreError(error, OperationType.GET, 'militia_requests');
    });

    const unsubAlliancesTo = onSnapshot(qAlliancesTo, (snapshot) => {
      alliancesTo = snapshot.docs.map(doc => doc.data().fromUid);
      updateAlliances();
    }, (error) => {
      console.error('AlliancesTo listener error:', error);
      toast.error('خطأ في تحميل التحالفات (2)');
      handleFirestoreError(error, OperationType.GET, 'militia_requests');
    });

    return () => {
      unsubIncoming();
      unsubOutgoing();
      unsubAlliancesFrom();
      unsubAlliancesTo();
    };
  }, [profile?.uid]);

  const fetchOtherMilitias = async (specificSearch?: string) => {
    // Cache check to avoid rate limiting
    const now = Date.now();
    const lastFetch = (window as any)._lastMilitiaFetch || {};
    if (!specificSearch && lastFetch.all && now - lastFetch.all < 30000) {
      console.log('Using cached militias');
      return;
    }

    try {
      setIsProcessing(true);
      let militias: any[] = [];
      
      if (specificSearch) {
        // Search by display name
        const qName = query(
          collection(db, 'users_public'),
          where('displayNameLower', '>=', specificSearch.toLowerCase()),
          where('displayNameLower', '<=', specificSearch.toLowerCase() + '\uf8ff'),
          limit(100)
        );
        const sName = await getDocs(qName);
        militias = sName.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)).filter(m => m.militia);
      } else {
        // Fetch all users from users_public who have a militia
        const qAll = query(
          collection(db, 'users_public'),
          where('hasMilitia', '==', true),
          limit(1000)
        );
        const sAll = await getDocs(qAll);
        console.log(`Raw users_public with hasMilitia:true: ${sAll.docs.length}`);
        militias = sAll.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(m => {
            if (!m.militia) {
              console.log(`User ${m.id} has hasMilitia:true but missing militia object`);
              return false;
            }
            return true;
          });
        
        // Update cache
        (window as any)._lastMilitiaFetch = { ...lastFetch, all: now };
      }

      console.log(`Final militias count after filtering: ${militias.length}`);
      setOtherMilitias(militias);
    } catch (error) {
      console.error("Error fetching militias:", error);
      toast.error("حدث خطأ أثناء جلب المليشيات");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'combat' || activeTab === 'all_militias') {
      fetchOtherMilitias();
    }
  }, [activeTab, profile?.uid]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchOtherMilitias();
      return;
    }
    setIsProcessing(true);
    await fetchOtherMilitias(searchQuery);
    setIsProcessing(false);
  };

  const getAllianceRequestId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('_');
  };

  const handleSendAllianceRequest = async (targetUid: string, targetName: string) => {
    console.log('handleSendAllianceRequest triggered', { targetUid, targetName });
    if (!profile) {
      console.error('Profile missing in handleSendAllianceRequest');
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }
    
    const requestId = getAllianceRequestId(profile.uid, targetUid);
    console.log('Generated requestId:', requestId);
    
    setIsProcessing(true);
    try {
      const docRef = doc(db, 'militia_requests', requestId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === 'accepted') {
          toast.error('أنت محالف لهذه المليشيا بالفعل');
          return;
        }
        
        if (data.fromUid === targetUid) {
          // They already sent a request to us, so accept it automatically
          await updateDoc(docRef, { status: 'accepted' });
          toast.success(`تم قبول التحالف مع ${targetName} تلقائياً`);
          await fetchOtherMilitias();
          return;
        }
        
        toast.error('لقد أرسلت طلباً بالفعل لهذه المليشيا');
        return;
      }

      await setDoc(docRef, {
        fromUid: profile.uid,
        fromName: profile.displayName || 'لاعب',
        toUid: targetUid,
        toName: targetName,
        status: 'pending',
        timestamp: Date.now()
      });
      
      toast.success('تم إرسال طلب التحالف');
    } catch (error) {
      console.error('Error sending alliance request:', error);
      handleFirestoreError(error, OperationType.WRITE, `militia_requests`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptAlliance = async (request: any) => {
    console.log('handleAcceptAlliance triggered', request.id);
    if (!profile) {
      console.error('Profile missing in handleAcceptAlliance');
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }
    
    setIsProcessing(true);
    try {
      const requestRef = doc(db, 'militia_requests', request.id);
      await updateDoc(requestRef, {
        status: 'accepted'
      });
      
      // Also update my own public profile to ensure it's synced
      if (profile.militia) {
        try {
          await updateDoc(doc(db, 'users_public', profile.uid), { 
            hasMilitia: true, 
            militia: profile.militia 
          });
        } catch (e) { console.warn('Public profile sync failed', e); }
      }

      toast.success(`تم قبول التحالف مع ${request.fromName}`);
      await fetchOtherMilitias();
    } catch (error: any) {
      console.error('Error in handleAcceptAlliance:', error);
      handleFirestoreError(error, OperationType.UPDATE, `militia_requests/${request.id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectAlliance = async (requestId: string) => {
    console.log('handleRejectAlliance triggered', requestId);
    if (!profile) {
      console.error('Profile missing in handleRejectAlliance');
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }
    setIsProcessing(true);
    try {
      await deleteDoc(doc(db, 'militia_requests', requestId));
      toast.success('تم رفض طلب التحالف');
    } catch (error) {
      console.error('Error rejecting alliance:', error);
      handleFirestoreError(error, OperationType.DELETE, `militia_requests/${requestId}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleForceClearRequests = async () => {
    console.log('handleForceClearRequests triggered');
    if (!profile) return;
    
    setIsProcessing(true);
    try {
      console.log('Starting force clear process');
      const q1 = query(collection(db, 'militia_requests'), where('fromUid', '==', profile.uid));
      const q2 = query(collection(db, 'militia_requests'), where('toUid', '==', profile.uid));
      
      const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      
      const deletePromises = [...s1.docs, ...s2.docs].map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      
      toast.success('تم تنظيف جميع الطلبات بنجاح');
      await fetchOtherMilitias();
    } catch (error) {
      console.error('Error clearing requests:', error);
      toast.error('حدث خطأ أثناء تنظيف الطلبات');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelAlliance = async (targetUid: string) => {
    if (!profile) return;
    setIsProcessing(true);
    try {
      const requestId = getAllianceRequestId(profile.uid, targetUid);
      await deleteDoc(doc(db, 'militia_requests', requestId));
      toast.success('تم إلغاء التحالف / الطلب');
      await fetchOtherMilitias();
    } catch (error) {
      console.error('Error cancelling alliance:', error);
      handleFirestoreError(error, OperationType.DELETE, `militia_requests`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAutoAttack = async () => {
    if (!profile || !militia) return;
    const targets = otherMilitias.filter(t => !myAlliances.includes(t.id) && t.id !== profile.uid);
    if (targets.length === 0) {
      toast.info('لا توجد أهداف متاحة للهجوم التلقائي');
      return;
    }

    toast.info(`بدء الهجوم التلقائي على ${targets.length} مليشيا...`);
    
    for (const target of targets) {
      await handleAttackMilitia(target);
      // Small delay between attacks
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    toast.success('اكتملت عمليات الهجوم التلقائي');
  };

  const handleCreateMilitia = async () => {
    if (!profile || !newMilitia.name) return;
    setIsProcessing(true);
    try {
      const militiaData: Militia = {
        id: Math.random().toString(36).substring(7),
        ownerId: profile.uid,
        name: newMilitia.name,
        image: newMilitia.image || MILITIA_IMAGES.background,
        type: newMilitia.type,
        leader: { name: 'الزعيم', image: 'https://up6.cc/2026/04/177619222536134.png' },
        soldiers: [],
        vehicles: [],
        squads: [],
        resources: {
          corruptionMoney: 10000000,
          gold: 500,
          ammo: 0,
          food: 0,
          fuel: 0,
          water: 0,
          medicine: 0
        },
        controlledResources: {
          oilFields: 0,
          ports: 0,
          extortion: 0
        },
        controlPoints: {
          oilFields: { level: 1, strength: 100, lastAttack: 0 },
          ports: { level: 1, strength: 100, lastAttack: 0 },
          extortion: { level: 1, strength: 100, lastAttack: 0 }
        },
        operationLogs: [],
        inventory: {
          weapons: {},
          armor: {},
          clothing: {},
          equipment: {},
          logistics: {},
          vehicles: {},
          aircraft: {},
          intelligence: {},
          fortifications: {}
        }
      };

      const batch = writeBatch(db);
      const userRef = doc(db, 'users', profile.uid);
      const userPublicRef = doc(db, 'users_public', profile.uid);
      const militiaRef = doc(db, 'militias', militiaData.id);

      batch.update(userRef, {
        militia: militiaData,
        hasMilitia: true
      });
      batch.update(userPublicRef, {
        hasMilitia: true,
        militia: militiaData
      });
      batch.set(militiaRef, militiaData);

      await batch.commit();

      toast.success('تم إنشاء المليشيا بنجاح');
      setShowCreateModal(false);
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء إنشاء المليشيا');
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHireSoldier = async () => {
    if (!profile || !militia) return;

    const capacity = getHqCapacity();
    if (militia.soldiers.length >= capacity.soldiers) {
      toast.error(`لقد وصلت للحد الأقصى للجنود (${capacity.soldiers}). قم بتطوير المقر العام أولاً.`);
      return;
    }

    const cost = 100000;
    if ((militia.resources.corruptionMoney || 0) < cost) {
      toast.error(`لا تملك أموال فساد كافية (${formatNumber(cost)})`);
      return;
    }

    setIsProcessing(true);
    try {
      const newSoldier: MilitiaSoldier = {
        id: Math.random().toString(36).substring(7),
        name: SOLDIER_NAMES[Math.floor(Math.random() * SOLDIER_NAMES.length)],
        image: MILITIA_IMAGES.soldierSuit,
        stats: {
          strength: Math.floor(Math.random() * 10) + 5,
          speed: Math.floor(Math.random() * 10) + 5,
          defense: Math.floor(Math.random() * 10) + 5,
          endurance: Math.floor(Math.random() * 10) + 5
        },
        health: 100,
        level: 1,
        hasArmor: false,
        hasWeapon: false
      };

      await updateDoc(doc(db, 'users', profile.uid), {
        'militia.soldiers': [...militia.soldiers, newSoldier],
        'militia.resources.corruptionMoney': (militia.resources.corruptionMoney || 0) - cost
      });
      toast.success('تم تعيين جندي جديد');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };


  const handleTrainSoldier = async (soldierId: string, stat: keyof MilitiaSoldier['stats']) => {
    if (!profile || !militia) return;
    const cost = 10000;
    if ((militia.resources.corruptionMoney || 0) < cost) {
      toast.error(`تكلفة التدريب ${formatNumber(cost)} أموال فساد`);
      return;
    }

    setIsProcessing(true);
    try {
      const updatedSoldiers = militia.soldiers.map(s => {
        if (s.id === soldierId) {
          return {
            ...s,
            hasArmor: s.hasArmor || false,
            hasWeapon: s.hasWeapon || false,
            health: s.health || 100,
            stats: {
              ...s.stats,
              [stat]: Math.floor(s.stats[stat] + 1)
            }
          };
        }
        return {
          ...s,
          hasArmor: s.hasArmor || false,
          hasWeapon: s.hasWeapon || false,
          health: s.health || 100
        };
      });

      await updateDoc(doc(db, 'users', profile.uid), {
        'militia.soldiers': updatedSoldiers,
        'militia.resources.corruptionMoney': (militia.resources.corruptionMoney || 0) - cost
      });
      toast.success('تم تحسين مهارات الجندي');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartBatchTraining = async () => {
    if (!profile || !militia || selectedTrainingSoldiers.length === 0) {
      toast.error('يرجى تحديد جنود للتدريب');
      return;
    }

    const totalStats = Object.values(trainingIncrements).reduce((a, b) => a + b, 0);
    if (totalStats === 0) {
      toast.error('يرجى تحديد قيم التدريب');
      return;
    }

    const corruptionCost = selectedTrainingSoldiers.length * totalStats * 10000;
    const goldCost = selectedTrainingSoldiers.length * Math.max(1, Math.ceil(totalStats / 1000));

    if (trainingPaymentCurrency === 'corruption') {
      if ((militia.resources?.corruptionMoney || 0) < corruptionCost) {
        toast.error(`تحتاج إلى ${formatNumber(corruptionCost)} أموال فساد`);
        return;
      }
    } else {
      if ((profile.gold || 0) < goldCost) {
        toast.error(`تحتاج إلى ${formatNumber(goldCost)} ذهب`);
        return;
      }
    }

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', profile.uid);

      if (trainingPaymentCurrency === 'gold') {
        const updatedSoldiers = militia.soldiers.map(s => {
          if (selectedTrainingSoldiers.includes(s.id)) {
            return {
              ...s,
              stats: {
                strength: Math.min(100000, s.stats.strength + trainingIncrements.strength),
                speed: Math.min(100000, s.stats.speed + trainingIncrements.speed),
                defense: Math.min(100000, s.stats.defense + trainingIncrements.defense),
                endurance: Math.min(100000, s.stats.endurance + trainingIncrements.endurance)
              }
            };
          }
          return s;
        });

        batch.update(userRef, {
          'militia.soldiers': updatedSoldiers,
          gold: (profile.gold || 0) - goldCost
        });
        
        if (militia.id) {
          batch.update(doc(db, 'militias', militia.id), {
            soldiers: updatedSoldiers
          });
        }
        
        await batch.commit();
        toast.success('تم إنهاء التدريب فوراً بنجاح');
      } else {
        const newTask: any = {
          id: `train_${Date.now()}`,
          type: 'train',
          soldierIds: selectedTrainingSoldiers,
          stats: trainingIncrements,
          finishTime: Date.now() + (10 * 60 * 1000), // 10 minutes
          costCorruptionMoney: corruptionCost,
          costGold: 0
        };

        const updatedTasks = [...(militia.trainingTasks || []), newTask];

        batch.update(userRef, {
          'militia.trainingTasks': updatedTasks,
          'militia.resources.corruptionMoney': (militia.resources?.corruptionMoney || 0) - corruptionCost
        });
        await batch.commit();
        toast.success('بدأت الدورة التدريبية (10 دقائق)');
      }

      setSelectedTrainingSoldiers([]);
      setTrainingIncrements({ strength: 0, speed: 0, defense: 0, endurance: 0 });
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartBatchPromotion = async () => {
    if (!profile || !militia || selectedTrainingSoldiers.length === 0 || !targetPromotionRank) {
      toast.error('يرجى تحديد الجنود والرتبة المطلوبة');
      return;
    }

    const targetRankData = MILITIA_RANKS.find(r => r.id === targetPromotionRank);
    const costPerSoldier = (MILITIA_RANKS.findIndex(r => r.id === targetPromotionRank) + 1) * 500000;
    const totalCorruptionCost = selectedTrainingSoldiers.length * costPerSoldier;
    const totalGoldCost = Math.max(1, Math.ceil(totalCorruptionCost / 1000000));

    if (promotionPaymentCurrency === 'corruption') {
      if ((militia.resources?.corruptionMoney || 0) < totalCorruptionCost) {
        toast.error(`تحتاج إلى ${formatNumber(totalCorruptionCost)} أموال فساد`);
        return;
      }
    } else {
      if ((profile.gold || 0) < totalGoldCost) {
        toast.error(`تحتاج إلى ${formatNumber(totalGoldCost)} ذهب`);
        return;
      }
    }

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', profile.uid);

      if (promotionPaymentCurrency === 'gold') {
        const updatedSoldiers = militia.soldiers.map(s => {
          if (selectedTrainingSoldiers.includes(s.id)) {
            return {
              ...s,
              rank: targetRankData?.name || targetPromotionRank,
              level: (s.level || 1) + 1,
              stats: {
                strength: Math.min(100000, Math.floor(s.stats.strength * 1.2)),
                defense: Math.min(100000, Math.floor(s.stats.defense * 1.2)),
                speed: Math.min(100000, Math.floor(s.stats.speed * 1.2)),
                endurance: Math.min(100000, Math.floor(s.stats.endurance * 1.2))
              }
            };
          }
          return s;
        });

        batch.update(userRef, {
          'militia.soldiers': updatedSoldiers,
          gold: (profile.gold || 0) - totalGoldCost
        });

        if (militia.id) {
          batch.update(doc(db, 'militias', militia.id), {
            soldiers: updatedSoldiers
          });
        }

        await batch.commit();
        toast.success('تم الترقية الفورية بنجاح');
      } else {
        const newTask: any = {
          id: `promote_${Date.now()}`,
          type: 'promote',
          soldierIds: selectedTrainingSoldiers,
          targetRank: targetRankData?.name || targetPromotionRank,
          targetRankId: targetPromotionRank,
          finishTime: Date.now() + (10 * 60 * 1000), // 10 minutes
          costCorruptionMoney: totalCorruptionCost,
          costGold: 0
        };

        const updatedTasks = [...(militia.trainingTasks || []), newTask];

        batch.update(userRef, {
          'militia.trainingTasks': updatedTasks,
          'militia.resources.corruptionMoney': (militia.resources?.corruptionMoney || 0) - totalCorruptionCost
        });
        await batch.commit();
        toast.success('بدأت عملية الترقية الجماعية (10 دقائق)');
      }

      setSelectedTrainingSoldiers([]);
      setTargetPromotionRank('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteTaskInstantly = async (taskId: string) => {
    if (!profile || !militia) return;
    const task = militia.trainingTasks?.find(t => t.id === taskId);
    if (!task) return;

    const goldCost = 50; // Fixed cost for instant completion
    if ((profile.gold || 0) < goldCost) {
      toast.error('لا تملك ذهب كافٍ (سعر الإكمال الفوري 50 ذهب)');
      return;
    }

    setIsProcessing(true);
    try {
      let updatedSoldiers = [...militia.soldiers];
      
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
            return {
              ...s,
              rank: task.targetRank,
              level: (s.level || 1) + 1,
              stats: {
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

      const remainingTasks = militia.trainingTasks?.filter(t => t.id !== taskId) || [];

      await updateDoc(doc(db, 'users', profile.uid), {
        'militia.soldiers': updatedSoldiers,
        'militia.trainingTasks': remainingTasks,
        gold: (profile.gold || 0) - goldCost
      });

      toast.success('تم الإكمال الفوري بنجاح');
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const addActivityLog = (msg: string, type: string) => {
    setActivityLogs(prev => [{ msg, time: Date.now(), type }, ...prev].slice(0, 15));
  };

  const getFounderActionPayload = (
    type: 'logistics' | 'health' | 'gear' | 'repair' | 'training' | 'attack',
    currentMilitia: any,
    currentMoney: number
  ) => {
    let updates: any = {};
    let actions: string[] = [];
    let money = currentMoney;
    const now = Date.now();

    if (type === 'logistics') {
      const items = [
        { key: 'ammo', name: 'ذخيرة', itemId: 'm_log_4' },
        { key: 'fuel', name: 'وقود', itemId: 'm_log_5' },
        { key: 'food', name: 'طعام', itemId: 'm_log_6' },
        { key: 'water', name: 'ماء', itemId: 'm_log_7' },
        { key: 'medicine', name: 'أدوية', itemId: 'm_log_3' },
      ];
      for (const config of items) {
        const currentAmount = Number(currentMilitia.resources[config.key] || 0);
        const shopItem = SHOP_ITEMS.logistics.find(i => i.id === config.itemId);
        if (currentAmount < 1000 && shopItem) {
          const shortage = 1000 - currentAmount;
          const cost = Math.ceil(shortage * (shopItem.price / 1000));
          if (money >= cost) {
            money -= cost;
            updates[`militia.resources.${config.key}`] = 1000;
            const currentInv = Number(currentMilitia.inventory?.logistics?.[config.itemId] || 0);
            updates[`militia.inventory.logistics.${config.itemId}`] = currentInv + shortage;
            actions.push(`تأمين ${config.name}: تم توريد ${shortage} وحدة لسد العجز`);
          }
        }
      }
    }

    if (type === 'health') {
      const injuredSoldiers = (currentMilitia.soldiers || []).filter((s: any) => (s.health || 100) < 100);
      const medicineUsed = Math.ceil(injuredSoldiers.reduce((acc: number, s: any) => acc + (100 - (Number(s.health) || 0)), 0) / (5 + (currentMilitia.gqh?.facilities?.medicalLevel || 0)));
      const medicineInv = Number(currentMilitia.inventory?.logistics?.m_log_3 || 0);

      if (injuredSoldiers.length > 0 && medicineInv >= medicineUsed) {
        const updated = currentMilitia.soldiers.map((s: any) => ({ ...s, health: 100 }));
        updates['militia.soldiers'] = updated;
        updates['militia.inventory.logistics.m_log_3'] = medicineInv - medicineUsed;
        updates['militia.resources.medicine'] = medicineInv - medicineUsed;
        actions.push(`علاج شامل: تم شفاء ${injuredSoldiers.length} جندي باستخدام ${medicineUsed} دواء`);
      } else if (injuredSoldiers.length > 0 && medicineInv < medicineUsed) {
         toast.error(`نقص في الأدوية! مطلوب ${medicineUsed} ويتوفر ${medicineInv}`);
      }
    }

    if (type === 'gear') {
      let gearActions = 0;
      const invWeapons = currentMilitia.inventory?.weapons || {};
      const invArmor = currentMilitia.inventory?.armor || {};
      
      const availableWeapons = Object.entries(invWeapons).reduce((acc, [id, qty]) => acc + Number(qty), 0);
      const availableArmor = Object.entries(invArmor).reduce((acc, [id, qty]) => acc + Number(qty), 0);
      
      let weaponQuota = availableWeapons;
      let armorQuota = availableArmor;

      const updated = (currentMilitia.soldiers || []).map((s: any) => {
        let u = { ...s };
        let changed = false;

        // Equip Weapon if missing and available
        if (!u.hasWeapon && weaponQuota > 0) {
          u.hasWeapon = true;
          // Prefer m_wep_1 as default or any available
          const weaponId = Object.keys(invWeapons).find(id => Number(invWeapons[id]) > 0) || 'm_wep_1';
          u.equipped = { ...u.equipped, weapon: weaponId };
          weaponQuota--;
          changed = true;
        }

        // Equip Armor if missing and available
        if (!u.hasArmor && armorQuota > 0) {
          u.hasArmor = true;
          const armorId = Object.keys(invArmor).find(id => Number(invArmor[id]) > 0) || 'm_arm_1';
          u.equipped = { ...u.equipped, armor: armorId };
          armorQuota--;
          changed = true;
        }

        // Training logic (Smart Algorithm: if any stat < 100)
        const statsKeys: (keyof MilitiaSoldier['stats'])[] = ['strength', 'speed', 'defense', 'endurance'];
        const needsTraining = statsKeys.some(k => (Number(u.stats?.[k]) || 0) < 100);
        const trainCost = 50000;
        if (needsTraining && money >= trainCost) {
          money -= trainCost;
          const ns = { ...u.stats };
          statsKeys.forEach(k => ns[k] = 100);
          u.stats = ns;
          changed = true;
        }

        if (changed) gearActions++;
        return u;
      });

      if (gearActions > 0) {
        updates['militia.soldiers'] = updated;
        
        // Update Inventory Counts (simplified: remove used amount from IDs)
        // We need to actually deduct from specific IDs in inventory.
        // For simplicity in this bulk update, we'll deduct from the first available IDs
        let wRem = availableWeapons - weaponQuota;
        let aRem = availableArmor - armorQuota;
        
        const newInvWeapons = { ...invWeapons };
        Object.keys(newInvWeapons).forEach(id => {
          const qty = Number(newInvWeapons[id]);
          const deduct = Math.min(qty, wRem);
          newInvWeapons[id] = qty - deduct;
          wRem -= deduct;
        });

        const newInvArmor = { ...invArmor };
        Object.keys(newInvArmor).forEach(id => {
          const qty = Number(newInvArmor[id]);
          const deduct = Math.min(qty, aRem);
          newInvArmor[id] = qty - deduct;
          aRem -= deduct;
        });

        updates['militia.inventory.weapons'] = newInvWeapons;
        updates['militia.inventory.armor'] = newInvArmor;
        actions.push(`تجهيز وتدريب: تم تحديث وضع ${gearActions} جندي بنجاح`);
      } else {
         const lacksWeapon = (currentMilitia.soldiers || []).some((s: any) => !s.hasWeapon);
         const lacksArmor = (currentMilitia.soldiers || []).some((s: any) => !s.hasArmor);
         if (lacksWeapon && availableWeapons <= 0) toast.error('لا يتوفر أي سلاح في المخزن للتجهيز');
         if (lacksArmor && availableArmor <= 0) toast.error('لا يتوفر أي درع في المخزن للتجهيز');
      }
    }

    if (type === 'repair') {
      const damaged = (currentMilitia.vehicles || []).filter((v: any) => (v.health || 100) < 100);
      if (damaged.length > 0) {
        let rep = 0;
        const updated = currentMilitia.vehicles.map((v: any) => {
          if ((v.health || 100) < 100 && money >= 50000) {
            money -= 50000;
            rep++;
            return { ...v, health: 100 };
          }
          return v;
        });
        if (rep > 0) {
          updates['militia.vehicles'] = updated;
          actions.push(`ورشة الصيانة: تم إصلاح ${rep} مركبة معطلة`);
        }
      }
    }

    if (type === 'attack' && nonAlliedMilitias.length > 0) {
      const myPower = currentMilitia.soldiers.reduce((acc: number, s: any) => acc + (s.stats?.strength || 0), 0);
      const target = nonAlliedMilitias[Math.floor(Math.random() * nonAlliedMilitias.length)];
      const ammo = Number(currentMilitia.resources.ammo || 0);
      if (target && ammo >= 1000) {
        const targetPower = (target.militia.soldiers || []).reduce((acc: number, s: any) => acc + (s.stats?.strength || 0), 0) || 1;
        const isVictory = Math.random() < ((myPower/targetPower) / ((myPower/targetPower) + 0.3));
        const loot = isVictory ? Math.floor((target.militia.resources?.corruptionMoney || 0) * 0.1) : 0;
        if (isVictory) money += loot;
        updates['militia.resources.ammo'] = Math.max(0, ammo - 350);
        const attackLog = { id: Math.random().toString(36).substring(7), targetName: target.militia.name, result: isVictory ? 'win' : 'loss', timestamp: now, loot: isVictory ? { corruptionMoney: loot } : null };
        updates['militia.attackLogs'] = [attackLog, ...(currentMilitia.attackLogs || [])].slice(0, 50);
        actions.push(isVictory ? `انتصار في غارة على ${target.militia.name}` : `هزيمة في غارة على ${target.militia.name}`);
      }
    }

    return { updates, actions, money };
  };

  const runManualFounderAction = async (type: 'logistics' | 'health' | 'gear' | 'repair' | 'training' | 'attack') => {
    if (!profile || !militia || isProcessing) return;
    
    const { quotaExceeded } = useAuthStore.getState();
    if (quotaExceeded) {
      toast.error('لا يمكن تنفيذ العملية حالياً بسبب استنفاد حصة Firebase (Quota Exceeded). يرجى المحاولة لاحقاً.');
      return;
    }

    setIsProcessing(true);
    try {
      const payload = getFounderActionPayload(type, militia, Number(militia.resources.corruptionMoney || 0));
      if (payload.actions.length === 0) {
        toast.info('التنفيذ غير مطلوب حالياً (المتطلبات مكتملة أو الميزانية لا تكفي)');
        return;
      }
      const finalUpdates = { 
        ...payload.updates, 
        'militia.resources.corruptionMoney': payload.money,
      };
      await updateDoc(doc(db, 'users', profile.uid), finalUpdates);
      payload.actions.forEach(a => addActivityLog(a, type));
      toast.success('تم تنفيذ العملية الاستراتيجية');
    } catch (e) {
      console.error(e);
      toast.error('فشل في تنفيذ العملية');
    } finally {
      setIsProcessing(false);
    }
  };

  const runFounderAILogic = async (isPreview: boolean = false) => {
    if (!profile || !militia || (isProcessing && !isPreview)) return;
    const settings = militia.aiSettings || {};
    
    let allUpdates = {};
    let allActions: string[] = [];
    let currentMoney = Number(militia.resources.corruptionMoney || 0);
    const potential: any[] = [];

    const types: any[] = [
      { id: 'logistics', key: 'autoBuyResources' },
      { id: 'health', key: 'autoHealSoldiers' },
      { id: 'gear', key: 'autoMaintainGear' },
      { id: 'repair', key: 'autoRepairVehicles' },
      { id: 'training', key: 'autoTraining' },
      { id: 'attack', key: 'autoAttacks' }
    ];

    for (const t of types) {
      if (settings[t.key] || !isPreview) {
        const res = getFounderActionPayload(t.id as any, militia, currentMoney);
        if (res.actions.length > 0) {
          if (isPreview) {
            potential.push({ type: t.id, actions: res.actions });
          } else if (settings[t.key]) {
            allUpdates = { ...allUpdates, ...res.updates };
            allActions = [...allActions, ...res.actions];
            currentMoney = res.money;
          }
        }
      }
    }

    if (isPreview) {
      setPotentialActions(potential);
      setShowExecutionPreview(true);
      return;
    }

    if (allActions.length === 0) {
      toast.info('لا توجد مهام معمارية للتنفيذ حالياً');
      return;
    }

    const { quotaExceeded } = useAuthStore.getState();
    if (quotaExceeded) {
      toast.error('استنفاد حصة Firebase (Quota Exceeded). لا يمكن التنفيذ حالياً.');
      return;
    }

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), { 
        ...allUpdates, 
        'militia.resources.corruptionMoney': currentMoney,
      });
      allActions.forEach(a => addActivityLog(a, 'batch'));
      toast.success(`تم تنفيذ ${allActions.length} مهمة استراتيجية`);
    } catch (e) {
      console.error(e);
      toast.error('فشل في التنفيذ الشامل');
    } finally {
      setIsProcessing(false);
      setShowExecutionPreview(false);
    }
  };

  const toggleAISetting = async (setting: keyof Exclude<Militia['aiSettings'], undefined>) => {
    if (!profile || !militia) return;
    const currentSettings = militia.aiSettings || {
      founderAIEnabled: false,
      autoBuyResources: false,
      autoHealSoldiers: false,
      autoMaintainGear: false,
      autoRepairVehicles: false,
      autoTraining: false,
      autoBaseUpgrade: false,
      autoAttacks: false,
      lastAIAction: 0,
      currentOrder: '',
      commandHistory: [],
      fieldIntel: ''
    };
    
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        [`militia.aiSettings.${setting}`]: !currentSettings[setting]
      });
      toast.success('تم تحديث أمر الزعيم');
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    // Periodical AI logic removed based on user request for manual control
  }, []);

  const handleBuyItem = async (category: keyof typeof SHOP_ITEMS, item: any) => {
    if (!profile || !militia) return;
    const amount = Number(shopQuantities[item.id] || 1);
    if (amount <= 0 || isNaN(amount)) {
      toast.error('يرجى تحديد كمية صالحة');
      return;
    }

    const currentCorruptionMoney = Number(militia.resources?.corruptionMoney || 0);
    const totalPrice = item.price * amount;
    if (currentCorruptionMoney < totalPrice) {
      toast.error('لا تملك أموال فساد كافية');
      return;
    }

    setIsProcessing(true);
    try {
      // Robust calculation starting values
      const resources = { ...(militia.resources || {}) };
      const inventory = { ...(militia.inventory || { weapons: {}, armor: {}, logistics: {} }) };
      const logistics = { ...(inventory.logistics || {}) };
      const vehicles = [...(militia.vehicles || [])];

      const userUpdates: any = {
        'militia.resources.corruptionMoney': currentCorruptionMoney - totalPrice
      };

      if (category === 'vehicles') {
        const newVehicles: MilitiaVehicle[] = Array.from({ length: amount }).map(() => ({
          id: Math.random().toString(36).substring(7),
          itemId: item.id,
          health: 100,
          lastMaintenance: Date.now()
        }));
        userUpdates['militia.vehicles'] = [...vehicles, ...newVehicles];
      } else if (category === 'logistics') {
        const q = (item.quantity || 1000) * amount;

        if (item.id === 'm_log_1') {
          // Bundle case
          const resKeys = ['ammo', 'food', 'fuel', 'water', 'medicine'];
          resKeys.forEach(res => {
            resources[res as keyof typeof resources] = (Number(resources[res as keyof typeof resources]) || 0) + (1000 * amount);
            userUpdates[`militia.resources.${res}`] = resources[res as keyof typeof resources];
          });
          
          const logIds = ['m_log_4', 'm_log_5', 'm_log_6', 'm_log_7', 'm_log_3'];
          logIds.forEach(id => {
            logistics[id] = (Number(logistics[id]) || 0) + (1000 * amount);
            userUpdates[`militia.inventory.logistics.${id}`] = logistics[id];
          });
          
          logistics['m_log_1'] = (Number(logistics['m_log_1']) || 0) + amount;
          userUpdates['militia.inventory.logistics.m_log_1'] = logistics['m_log_1'];
        } else {
          // Individual item purchase (Simplified per user request)
          const resMap: Record<string, string> = {
            m_log_4: 'ammo',
            m_log_5: 'fuel',
            m_log_6: 'food',
            m_log_7: 'water',
            m_log_3: 'medicine'
          };

          const resKey = resMap[item.id];
          if (resKey) {
            resources[resKey as keyof typeof resources] = (Number(resources[resKey as keyof typeof resources]) || 0) + q;
            userUpdates[`militia.resources.${resKey}`] = resources[resKey as keyof typeof resources];
          }

          logistics[item.id] = (Number(logistics[item.id]) || 0) + q;
          userUpdates[`militia.inventory.logistics.${item.id}`] = logistics[item.id];
        }
      } else if (['weapons', 'armor', 'clothing', 'equipment', 'aircraft', 'intelligence', 'fortifications'].includes(category)) {
        const categoryInventory = (inventory as any)[category] || {};
        const currentCount = Number(categoryInventory[item.id] || 0);
        userUpdates[`militia.inventory.${category}.${item.id}`] = currentCount + amount;
      }

      const batch = writeBatch(db);
      const userRef = doc(db, 'users', profile.uid);
      const militiaRef = doc(db, 'militias', militia.id);
      
      batch.update(userRef, userUpdates);
      
      const militiaUpdates: any = {};
      Object.keys(userUpdates).forEach(key => {
        if (key.startsWith('militia.')) {
          militiaUpdates[key.replace('militia.', '')] = userUpdates[key];
        } else {
          militiaUpdates[key] = userUpdates[key];
        }
      });

      // Special handling for ownerId
      if (!militia.ownerId) {
        militiaUpdates['ownerId'] = profile.uid;
        userUpdates['militia.ownerId'] = profile.uid;
      }

      batch.set(militiaRef, militiaUpdates, { merge: true });
      await batch.commit();
      
      toast.success(`تم شراء ${amount} من ${item.name}`);
      setShopQuantities(prev => ({ ...prev, [item.id]: 0 }));
    } catch (error) {
      console.error('Buy error:', error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSellItem = async (category: string, itemId: string, price: number) => {
    if (!profile || !militia) return;
    
    setIsProcessing(true);
    try {
      const updates: any = {};
      const targetId = itemId;
      const itemData: any = (dynamicShopItems as any)[category === 'clothing' || category === 'equipment' ? 'logistics' : category]?.find((i: any) => i.id === targetId);
      
      if (category === 'vehicles') {
        const vehicleIndex = militia.vehicles.findIndex(v => v.itemId === targetId);
        if (vehicleIndex === -1) {
          const inventory = (militia.inventory as any) || {};
          const invCount = Number(inventory.vehicles?.[targetId] || 0);
          if (invCount > 0) {
            updates[`militia.inventory.vehicles.${targetId}`] = invCount - 1;
          } else {
            toast.error('لا تملك هذه المركبة');
            setIsProcessing(false);
            return;
          }
        } else {
          const updatedVehicles = [...militia.vehicles];
          updatedVehicles.splice(vehicleIndex, 1);
          updates['militia.vehicles'] = updatedVehicles;
        }
      } else if (['weapons', 'armor', 'clothing', 'equipment', 'logistics', 'aircraft', 'intelligence', 'fortifications'].includes(category)) {
        const inventory = (militia.inventory as any) || { weapons: {}, armor: {}, logistics: {} };
        const categoryInventory = inventory[category] || {};
        let currentCount = Number(categoryInventory[targetId] || 0);

        // Fallback for logistics from resources if inventory is 0
        if (category === 'logistics' && currentCount <= 0) {
          const resMap: any = { 'm_log_4': 'ammo', 'm_log_5': 'fuel', 'm_log_6': 'food', 'm_log_7': 'water', 'm_log_3': 'medicine' };
          const resKey = resMap[targetId];
          if (resKey) {
            currentCount = Number((militia.resources as any)?.[resKey] || 0);
          }
        }
        
        if (currentCount <= 0) {
          toast.error('لا تملك هذه القطعة');
          setIsProcessing(false);
          return;
        }

        const fullBoxQuantity = (category === 'logistics' && !['m_log_2'].includes(targetId)) ? (itemData?.quantity || 1000) : 1;
        const quantityToSell = Math.min(currentCount, fullBoxQuantity);
        
        // Pro-rate price for logistics if partial
        let finalSellPrice = price;
        if (category === 'logistics' && !['m_log_2'].includes(targetId) && quantityToSell < fullBoxQuantity) {
          finalSellPrice = Math.floor(price * (quantityToSell / fullBoxQuantity));
        }

        updates[`militia.inventory.${category}.${targetId}`] = Math.max(0, currentCount - quantityToSell);

        if (category === 'logistics' && !['m_log_2'].includes(targetId)) {
          const resMap: any = { 'm_log_4': 'ammo', 'm_log_5': 'fuel', 'm_log_6': 'food', 'm_log_7': 'water', 'm_log_3': 'medicine' };
          const resKey = resMap[targetId];
          if (resKey) {
            updates[`militia.resources.${resKey}`] = Math.max(0, (Number((militia.resources as any)[resKey]) || 0) - quantityToSell);
          }
        }
        
        updates['militia.resources.corruptionMoney'] = (militia.resources.corruptionMoney || 0) + finalSellPrice;
      }

      await updateDoc(doc(db, 'users', profile.uid), updates);
      toast.success('تمت عملية البيع بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRepairVehicle = async (vehicleId: string) => {
    if (!profile || !militia) return;
    const cost = 50000;
    if ((militia.resources.corruptionMoney || 0) < cost) {
      toast.error(`تكلفة الصيانة ${formatNumber(cost)} أموال فساد`);
      return;
    }

    setIsProcessing(true);
    try {
      const updatedVehicles = militia.vehicles.map(v => {
        if (v.id === vehicleId) {
          return { ...v, health: 100, lastMaintenance: Date.now() };
        }
        return v;
      });

      await updateDoc(doc(db, 'users', profile.uid), {
        'militia.vehicles': updatedVehicles,
        'militia.resources.corruptionMoney': (militia.resources.corruptionMoney || 0) - cost
      });
      toast.success('تمت صيانة المركبة');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSellVehicle = async (vehicleId: string) => {
    if (!profile || !militia) return;
    
    const vehicle = militia.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    const shopItem = SHOP_ITEMS.vehicles.find(v => v.id === vehicle.itemId);
    const basePrice = shopItem?.price || 0;
    const sellPrice = Math.floor(basePrice * 0.5 * (vehicle.health / 100));

    if (sellPrice <= 0) {
      toast.error('هذه المركبة لا قيمة لها');
      return;
    }

    setIsProcessing(true);
    try {
      const updatedVehicles = militia.vehicles.filter(v => v.id !== vehicleId);
      const updatedSquads = (militia.squads || []).map(sq => ({
        ...sq,
        vehicleId: sq.vehicleId === vehicleId ? null : sq.vehicleId
      }));

      await updateDoc(doc(db, 'users', profile.uid), {
        'militia.vehicles': updatedVehicles,
        'militia.squads': updatedSquads,
        'militia.resources.corruptionMoney': (militia.resources.corruptionMoney || 0) + sellPrice
      });
      toast.success(`تم بيع المركبة بنجاح مقابل ${formatNumber(sellPrice)} أموال فساد`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLaunderMoney = async (amount: number) => {
    if (!profile || !militia) return;
    if (militia.resources.corruptionMoney < amount) {
      toast.error('لا تملك هذا المبلغ من أموال الفساد');
      return;
    }

    setIsProcessing(true);
    try {
      const launderedAmount = Math.floor(amount * 0.8); // 20% fee
      await updateDoc(doc(db, 'users', profile.uid), {
        'militia.resources.corruptionMoney': militia.resources.corruptionMoney - amount,
        bankBalance: (profile.bankBalance || 0) + launderedAmount
      });
      toast.success(`تم غسيل ${amount} واستلام ${launderedAmount} في البنك`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCaptureResource = async (type: keyof Militia['controlledResources'], config: { squads: number, aircraft: number, intel: number }) => {
    if (!profile || !militia) return;
    
    // Check if at least some units are sent
    if (config.squads === 0 && config.aircraft === 0) {
      toast.error('يجب إرسال فرق أو طائرات على الأقل للعملية');
      return;
    }

    // Verify availability
    if (config.squads > (militia.squads?.length || 0)) {
      toast.error('ليس لديك هذا العدد من الفرق');
      return;
    }

    const availableAircraftCount = Object.values(militia.inventory?.aircraft || {}).reduce((acc: number, v: any) => acc + (Number(v) || 0), 0);
    if (config.aircraft > availableAircraftCount) {
      toast.error('ليس لديك هذا العدد من الطائرات');
      return;
    }

    const availableIntelCount = Object.values(militia.inventory?.intelligence || {}).reduce((acc: number, v: any) => acc + (Number(v) || 0), 0);
    if (config.intel > availableIntelCount) {
      toast.error('ليس لديك هذا العدد من معدات الاستخبارات');
      return;
    }

    // Resource requirements for combat
    const hasCommCenter = Number(militia.inventory?.logistics?.m_log_2 || 0) > 0;
    const ammoNeeded = (config.squads * 50) + (config.aircraft * 200);
    const fuelNeeded = (config.squads * 20) + (config.aircraft * 500);

    if ((militia.resources.ammo || 0) < ammoNeeded) {
      toast.error(`تحتاج إلى ${ammoNeeded} ذخيرة للقيام بالعملية`);
      return;
    }
    if ((militia.resources.fuel || 0) < fuelNeeded) {
      toast.error(`تحتاج إلى ${fuelNeeded} وقود للمركبات والطائرات`);
      return;
    }

    setIsProcessing(true);
    try {
      // Calculate Power
      let totalAttackPower = 0;
      
      // Squad Power
      for (let i = 0; i < config.squads; i++) {
        const squad = militia.squads[i];
        if (squad) {
          totalAttackPower += (squad.power || 0);
        }
      }

      // Aircraft Power
      const aircraftTypes = Object.entries(militia.inventory?.aircraft || {});
      let aircraftPower = 0;
      let aircraftTaken = 0;
      for (const [id, count] of aircraftTypes) {
        if (aircraftTaken >= config.aircraft) break;
        const toTake = Math.min(config.aircraft - aircraftTaken, Number(count));
        const itemData = Object.values(DEFAULT_SHOP_ITEMS.aircraft).find(it => it.id === id);
        aircraftPower += (itemData?.power || 500) * toTake;
        aircraftTaken += toTake;
      }
      totalAttackPower += aircraftPower;

      // Intel Power
      const intelTypes = Object.entries(militia.inventory?.intelligence || {});
      let intelPower = 0;
      let intelTaken = 0;
      for (const [id, count] of intelTypes) {
        if (intelTaken >= config.intel) break;
        const toTake = Math.min(config.intel - intelTaken, Number(count));
        const itemData = Object.values(DEFAULT_SHOP_ITEMS.intelligence).find(it => it.id === id);
        intelPower += (itemData?.power || 100) * toTake;
        intelTaken += toTake;
      }
      totalAttackPower += intelPower;

      // Target Difficulty
      const difficulties = { oilFields: 5000, ports: 10000, extortion: 3000 };
      const targetDiff = (difficulties[type] || 5000) * ( (militia.controlledResources[type] || 0) + 1 );
      
      // Win chance
      const ratio = totalAttackPower / targetDiff;
      let winChance = Math.min(0.9, Math.max(0.1, ratio * 0.5));
      if (hasCommCenter) winChance += 0.05;
      
      const success = Math.random() < winChance;
      const inventory = JSON.parse(JSON.stringify(militia.inventory || {}));
      const resources = { ...militia.resources };
      const vehicles = [...militia.vehicles];
      const soldiers = [...militia.soldiers];
      const now = Date.now();

      let message = '';
      let rewardData: any = null;
      let lossData: any = null;

      if (success) {
        // Rewards
        const baseMoney = { oilFields: 500000, ports: 750000, extortion: 300000 }[type] || 500000;
        const moneyLoot = Math.floor(baseMoney * (1 + Math.random() * 0.5));
        const goldLoot = Math.random() < 0.2 ? Math.floor(Math.random() * 10) + 5 : 0;
        
        // Random resources
        const resourceTypes: (keyof typeof resources)[] = ['ammo', 'fuel', 'food', 'water', 'medicine'];
        const randomResType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
        const resAmount = Math.floor(Math.random() * 1000) + 500;
        
        resources.corruptionMoney = (resources.corruptionMoney || 0) + moneyLoot;
        resources.gold = (resources.gold || 0) + goldLoot;
        (resources as any)[randomResType] = (resources[randomResType] || 0) + resAmount;
        
        militia.controlledResources[type] = (militia.controlledResources[type] || 0) + 1;

        // Minor losses
        const sentSoldiersIds = new Set();
        for(let i=0; i<config.squads; i++) {
          const sq = militia.squads[i];
          sentSoldiersIds.add(sq.leaderId);
          sq.soldierIds.forEach(id => sentSoldiersIds.add(id));
        }

        soldiers.forEach(s => {
          if (sentSoldiersIds.has(s.id)) {
             s.health = Math.max(1, (s.health || 100) - (Math.floor(Math.random() * 10)));
          }
        });

        rewardData = { corruptionMoney: moneyLoot, gold: goldLoot, [randomResType]: resAmount };
        message = `تمت السيطرة على المورد بنجاح! غنمت ${formatNumber(moneyLoot)} من أموال الفساد وبعض الموارد.`;
        toast.success(message);
      } else {
        // Losses
        const healthLoss = Math.floor(Math.random() * 30) + 20;
        const vehicleDamage = Math.floor(Math.random() * 20) + 10;
        
        // Damage soldiers health in sent squads
        const sentSoldiersIds = new Set();
        for(let i=0; i<config.squads; i++) {
          const sq = militia.squads[i];
          sentSoldiersIds.add(sq.leaderId);
          sq.soldierIds.forEach(id => sentSoldiersIds.add(id));
          // Damage squad vehicle
          if (sq.vehicleId) {
            const vIndex = vehicles.findIndex(v => v.id === sq.vehicleId);
            if (vIndex !== -1) {
              vehicles[vIndex].health = Math.max(0, (vehicles[vIndex].health || 100) - vehicleDamage);
            }
          }
        }
        
        soldiers.forEach(s => {
          if (sentSoldiersIds.has(s.id)) {
            s.health = Math.max(0, (s.health || 100) - healthLoss);
            s.lastHealTime = now;
          }
        });

        // Damage aircraft and intel
        if (config.aircraft > 0 && Math.random() < 0.4) {
          const aKeys = Object.keys(inventory.aircraft || {});
          if (aKeys.length > 0) {
            const randKey = aKeys[Math.floor(Math.random() * aKeys.length)];
            inventory.aircraft[randKey] = Math.max(0, Number(inventory.aircraft[randKey] || 0) - 1);
            lossData = { ...lossData, aircraft: 1 };
          }
        }

        if (config.intel > 0 && Math.random() < 0.4) {
          const iKeys = Object.keys(inventory.intelligence || {});
          if (iKeys.length > 0) {
            const randKey = iKeys[Math.floor(Math.random() * iKeys.length)];
            inventory.intelligence[randKey] = Math.max(0, Number(inventory.intelligence[randKey] || 0) - 1);
            lossData = { ...lossData, intel: 1 };
          }
        }

        message = 'فشلت العملية وتعرضت قواتك لخسائر فادحة.';
        toast.error(message);
      }

      // Deduct resources
      resources.ammo = Math.max(0, (resources.ammo || 0) - ammoNeeded);
      resources.fuel = Math.max(0, (resources.fuel || 0) - fuelNeeded);
      
      if (inventory.logistics?.m_log_4) {
        inventory.logistics.m_log_4 = Math.max(0, Number(inventory.logistics.m_log_4) - ammoNeeded);
      }
      if (inventory.logistics?.m_log_5) {
        inventory.logistics.m_log_5 = Math.max(0, Number(inventory.logistics.m_log_5) - fuelNeeded);
      }

      await updateDoc(doc(db, 'users', profile.uid), {
        'militia.controlledResources': militia.controlledResources,
        'militia.resources': resources,
        'militia.soldiers': soldiers,
        'militia.vehicles': vehicles,
        'militia.inventory': inventory,
        'gold': (profile.gold || 0) + (rewardData?.gold || 0)
      });

      // Log the operation
      await updateDoc(doc(db, 'users', profile.uid), {
        'militia.operationLogs': [
          {
            id: Math.random().toString(36).slice(2, 9),
            type,
            success,
            message,
            reward: rewardData,
            losses: lossData,
            timestamp: now
          },
          ...(militia.operationLogs || []).slice(0, 19)
        ]
      });

      setShowResourceAttackModal(false);
      setSelectedResourceType(null);
    } catch (error) {
      console.error('Capture Resource Error:', error);
      toast.error('حدث خطأ أثناء تنفيذ العملية');
    } finally {
      setIsProcessing(false);
    }
  };
   // End of function

  const handleFireSoldier = async (soldierId: string) => {
    if (!profile || !militia) return;
    
    setIsProcessing(true);
    try {
      const updatedSoldiers = militia.soldiers.filter(s => s.id !== soldierId);
      await updateDoc(doc(db, 'users', profile.uid), {
        'militia.soldiers': updatedSoldiers
      });
      toast.success("تم طرد الجندي بنجاح");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEquipSoldier = async (soldierId: string, type: 'armor' | 'weapon', targetId?: string) => {
    if (!profile || !militia) return;
    
    // Check if we are unequipping
    const isRemove = targetId === 'none';
    
    // Find the item to return or fetch from inventory
    const inventoryType = type === 'armor' ? 'armor' : 'weapons';
    const inventory = (militia.inventory as any) || { weapons: {}, armor: {}, logistics: {} };
    const categoryInventory = inventory[inventoryType] || {};
    
    let itemId = 'none';
    let countChange = 0;

    if (isRemove) {
        // Find what was equipped to return it to inventory
        const soldier = militia.soldiers.find(s => s.id === soldierId);
        const equippedId = type === 'armor' ? soldier?.equipped?.armor : soldier?.equipped?.weapon;
        if (equippedId) {
            itemId = equippedId;
            countChange = 1; // Return to inventory
        }
    } else {
        // Equipping logic
        const availableItems = Object.entries(categoryInventory).filter(([_, count]) => (count as number) > 0);
        
        if (targetId && targetId !== 'none') {
            itemId = targetId;
            if ((Number(categoryInventory[itemId] || 0)) <= 0) {
              toast.error('هذا السلاح غير متوفر في المخزن حالياً');
              return;
            }
        } else if (availableItems.length > 0) {
            itemId = availableItems[0][0];
        } else {
            toast.error(`لا تملك ${type === 'armor' ? 'دروع' : 'أسلحة'} في المخزن`);
            return;
        }
        countChange = -1; // Remove from inventory
    }

    setIsProcessing(true);
    try {
      const updatedSoldiers = militia.soldiers.map(s => {
        if (s.id === soldierId) {
          const hasArmor = type === 'armor' ? !isRemove : (s.hasArmor || false);
          const hasWeapon = type === 'weapon' ? !isRemove : (s.hasWeapon || false);
          
          let newImage = s.image;
          const currentWeaponId = type === 'weapon' ? (isRemove ? null : itemId) : s.equipped?.weapon;
          
          if (type === 'weapon') {
            if (isRemove) {
              newImage = s.isSpecialForces ? MILITIA_IMAGES.sf_suit : MILITIA_IMAGES.soldierSuit;
            } else if (itemId === 'm_wep_1' || itemId === 'mk18_cqbr') {
              newImage = s.isSpecialForces ? MILITIA_IMAGES.sf_mk18 : MILITIA_IMAGES.soldierFull;
            } else if (itemId === 'm_wep_2' || itemId === 'sniper_m24') {
              newImage = s.isSpecialForces ? MILITIA_IMAGES.sf_m24 : 'https://up6.cc/2026/04/177620240797981.png';
            } else if (itemId === 'm_wep_3' || itemId === 'rpg_launcher') {
              newImage = s.isSpecialForces ? MILITIA_IMAGES.sf_rpg : 'https://up6.cc/2026/04/177620240804972.png';
            } else {
              newImage = MILITIA_IMAGES.soldierFull;
            }
          } else if (type === 'armor') {
            if (!hasArmor) {
               // Removed armor
               if (hasWeapon) {
                   // Keep weapon image if has weapon
                   if (s.isSpecialForces) {
                       if (currentWeaponId === 'm_wep_1' || currentWeaponId === 'mk18_cqbr') newImage = MILITIA_IMAGES.sf_mk18;
                       else if (currentWeaponId === 'm_wep_2' || currentWeaponId === 'sniper_m24') newImage = MILITIA_IMAGES.sf_m24;
                       else if (currentWeaponId === 'm_wep_3' || currentWeaponId === 'rpg_launcher') newImage = MILITIA_IMAGES.sf_rpg;
                   } else {
                       newImage = MILITIA_IMAGES.soldierFull;
                   }
               } else {
                   newImage = s.isSpecialForces ? MILITIA_IMAGES.sf_suit : MILITIA_IMAGES.soldierSuit;
               }
            } else {
                // Added armor
                if (!hasWeapon) {
                  newImage = s.isSpecialForces ? MILITIA_IMAGES.sf_suit : MILITIA_IMAGES.soldierArmor;
                } else {
                  if (s.isSpecialForces) {
                    if (currentWeaponId === 'm_wep_1' || currentWeaponId === 'mk18_cqbr') newImage = MILITIA_IMAGES.sf_mk18;
                    else if (currentWeaponId === 'm_wep_2' || currentWeaponId === 'sniper_m24') newImage = MILITIA_IMAGES.sf_m24;
                    else if (currentWeaponId === 'm_wep_3' || currentWeaponId === 'rpg_launcher') newImage = MILITIA_IMAGES.sf_rpg;
                  } else {
                    newImage = MILITIA_IMAGES.soldierFull;
                  }
                }
            }
          }

          return {
            ...s,
            hasArmor,
            hasWeapon,
            health: s.health || 100,
            image: newImage,
            equipped: {
              ...(s.equipped || {}),
              [type]: isRemove ? null : itemId
            }
          };
        }
        return s;
      });

      const userUpdateData: any = {
        'militia.soldiers': updatedSoldiers
      };

      const militiaUpdateData: any = {
        soldiers: updatedSoldiers
      };

      if (itemId !== 'none') {
        const currentCount = Number(categoryInventory[itemId] || 0);
        userUpdateData[`militia.inventory.${inventoryType}.${itemId}`] = currentCount + countChange;
        militiaUpdateData[`inventory.${inventoryType}.${itemId}`] = currentCount + countChange;
      }

      const batch = writeBatch(db);
      batch.update(doc(db, 'users', profile.uid), userUpdateData);
      batch.update(doc(db, 'militias', militia.id), militiaUpdateData);
      
      await batch.commit();
      toast.success(isRemove ? 'تم إزالة العتاد' : 'تم تجهيز الجندي');
    } catch (error) {
      console.error('Equip error:', error);
      toast.error('فشل معالجة العتاد');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHealSoldier = async (soldierId: string, type: 'instant' | 'medicine' = 'instant') => {
    if (!profile || !militia) return;
    
    const soldier = militia.soldiers.find(s => s.id === soldierId);
    if (!soldier || soldier.health >= 100) return;

    const medicalLevel = militia.gqh?.facilities?.medicalLevel || 0;
    const medicineEfficiency = 5 + medicalLevel; // Base 5 health per medicine + 1 per medical level
    
    const healthNeeded = 100 - soldier.health;
    const medicineNeeded = Math.ceil(healthNeeded / medicineEfficiency);
    const availableMedicine = Number(militia.inventory?.logistics?.m_log_3 || 0);

    if (availableMedicine < medicineNeeded) {
      toast.error(`لا تملك أدوية كافية. تحتاج إلى ${medicineNeeded} قطعة دواء`);
      return;
    }

    setIsProcessing(true);
    try {
      const updatedSoldiers = militia.soldiers.map(s => ({
        ...s,
        hasArmor: s.hasArmor || false,
        hasWeapon: s.hasWeapon || false,
        health: s.id === soldierId ? 100 : s.health,
        lastHealTime: s.id === soldierId ? Date.now() : s.lastHealTime
      }));

      const inventory = (militia.inventory as any) || { weapons: {}, armor: {}, logistics: {} };
      const currentInvCount = Number(inventory.logistics?.m_log_3 || 0);

      await updateDoc(doc(db, 'users', profile.uid), {
        'militia.soldiers': updatedSoldiers,
        'militia.resources.medicine': Math.max(0, (Number(militia.resources.medicine) || 0) - medicineNeeded),
        'militia.inventory.logistics.m_log_3': Math.max(0, currentInvCount - medicineNeeded)
      });
      console.log('Heal soldier success');
      toast.success(type === 'instant' ? 'تم العلاج الفوري باستخدام الأدوية' : `تم علاج الجندي باستخدام ${medicineNeeded} قطعة دواء`);
    } catch (error) {
      console.error('Heal soldier error:', error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHealAllSoldiers = async () => {
    console.log('handleHealAllSoldiers triggered');
    if (!profile || !militia) {
      console.error('Profile or militia missing in handleHealAllSoldiers', { profile: !!profile, militia: !!militia });
      return;
    }
    
    const injuredSoldiers = militia.soldiers.filter(s => s.health < 100);
    if (injuredSoldiers.length === 0) {
      toast.info('جميع الجنود بصحة جيدة');
      return;
    }

    const medicalLevel = militia.gqh?.facilities?.medicalLevel || 0;
    const medicineEfficiency = 5 + medicalLevel;
    
    const totalHealthNeeded = injuredSoldiers.reduce((acc, s) => acc + (100 - (Number(s.health) || 0)), 0);
    const totalMedicineNeeded = Math.ceil(totalHealthNeeded / medicineEfficiency);
    const availableMedicine = Number(militia.inventory?.logistics?.m_log_3 || 0);
    
    if (availableMedicine < totalMedicineNeeded) {
      toast.error(`لا تملك أدوية كافية لعلاج الجميع (تحتاج ${formatNumber(totalMedicineNeeded)} قطعة دواء)`);
      return;
    }

    setIsProcessing(true);
    try {
      console.log('Starting heal all process, medicine cost:', totalMedicineNeeded);
      const updatedSoldiers = militia.soldiers.map(s => ({
        ...s,
        hasArmor: s.hasArmor || false,
        hasWeapon: s.hasWeapon || false,
        health: 100,
        lastHealTime: Date.now()
      }));

      const inventory = (militia.inventory as any) || { weapons: {}, armor: {}, logistics: {} };
      const currentInvCount = Number(inventory.logistics?.m_log_3 || 0);

      await updateDoc(doc(db, 'users', profile.uid), {
        'militia.soldiers': updatedSoldiers,
        'militia.resources.medicine': Math.max(0, (Number(militia.resources.medicine) || 0) - totalMedicineNeeded),
        'militia.inventory.logistics.m_log_3': Math.max(0, currentInvCount - totalMedicineNeeded)
      });
      console.log('Heal all success');
      toast.success(`تم علاج جميع الجنود بنجاح باستخدام ${totalMedicineNeeded} قطعة دواء`);
    } catch (error) {
      console.error('Heal all error:', error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAutoCreateSquads = async () => {
    if (!profile || !militia) return;

    setIsProcessing(true);
    try {
      const newSquads: any[] = [];
      const assignedSoldiers = new Set<string>();
      const assignedVehicles = new Set<string>();

      // Helper to get rank power
      const getRankPower = (rankName: string) => {
        const rank = MILITIA_RANKS.find(r => r.name === rankName);
        return rank ? rank.powerBonus : 0;
      };

      // Available soldiers (not the general, not already in a squad)
      const availableSoldiers = militia.soldiers.filter(s => s.id !== militia.generalId && !militia.squads?.some(sq => sq.leaderId === s.id || sq.soldierIds.includes(s.id)));
      
      const regularSoldiers = availableSoldiers.filter(s => !s.isSpecialForces).sort((a, b) => getRankPower(b.rank || 'جندي') - getRankPower(a.rank || 'جندي'));
      const specialForces = availableSoldiers.filter(s => s.isSpecialForces).sort((a, b) => getRankPower(b.rank || 'جندي') - getRankPower(a.rank || 'جندي'));

      // Available vehicles
      const availableVehicles = militia.vehicles.filter(v => !militia.squads?.some(sq => sq.vehicleId === v.id));
      
      const regularVehicles = availableVehicles.filter(v => ['m_veh_1', 'm_veh_2', 'm_veh_3'].includes(v.itemId));
      const sfVehicles = availableVehicles.filter(v => ['sf_veh_1', 'sf_veh_2'].includes(v.itemId));

      let bCounter = 1;
      let sfCounter = 1;

      // Create Regular Squads
      while (regularSoldiers.length >= 5) {
        const leader = regularSoldiers.shift(); // Highest rank
        const members = regularSoldiers.splice(-4); // 4 Lowest ranks
        const vehicle = regularVehicles.shift();

        if (leader && members.length === 4) {
          const squadPower = (leader.stats?.strength || 0) + members.reduce((acc, m) => acc + (m.stats?.strength || 0), 0);
          newSquads.push({
            id: Math.random().toString(36).substring(7),
            name: `B${bCounter++}`,
            leaderId: leader.id,
            soldierIds: members.map(m => m.id),
            vehicleId: vehicle ? vehicle.id : null,
            power: squadPower
          });
        }
      }

      // Create SF Squads
      while (specialForces.length >= 5) {
        const leader = specialForces.shift(); // Highest rank
        const members = specialForces.splice(-4); // 4 Lowest ranks
        const vehicle = sfVehicles.shift(); // Strictly SF vehicles

        if (leader && members.length === 4) {
          const squadPower = (leader.stats?.strength || 0) + members.reduce((acc, m) => acc + (m.stats?.strength || 0), 0);
          newSquads.push({
            id: Math.random().toString(36).substring(7),
            name: `SF${sfCounter++}`,
            leaderId: leader.id,
            soldierIds: members.map(m => m.id),
            vehicleId: vehicle ? vehicle.id : null,
            power: squadPower * 1.5 // SF bonus
          });
        }
      }

      if (newSquads.length === 0) {
        toast.error('لا يوجد عدد كافٍ من الجنود لتكوين فرق جديدة (تحتاج 5 جنود لكل فرقة)');
        setIsProcessing(false);
        return;
      }

      await updateDoc(doc(db, 'users', profile.uid), {
        'militia.squads': [...(militia.squads || []), ...newSquads]
      });

      toast.success(`تم تكوين ${newSquads.length} فرق جديدة تلقائياً`);
      setShowAIBattleModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssignGeneral = async (soldierId: string) => {
    if (!profile || !militia) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        'militia.generalId': soldierId
      });
      toast.success('تم تعيين الجنرال بنجاح');
      setShowGeneralModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const handleAddShopItem = async () => {
    if (profile?.role !== 'Admin') return;
    if (!newItemData.name || !newItemData.image || newItemData.price <= 0) {
      toast.error('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    try {
      const newItem = {
        id: `m_${newItemData.category.substring(0, 3)}_${Date.now()}`,
        name: newItemData.name,
        image: newItemData.image,
        price: newItemData.price,
        ...((newItemData.power > 0 || newItemData.category === 'intelligence') && { power: newItemData.power }),
        ...(newItemData.defense > 0 && { defense: newItemData.defense }),
        ...(newItemData.effect && { effect: newItemData.effect }),
        ...(newItemData.quantity > 0 && { quantity: newItemData.quantity }),
        ...(newItemData.category === 'logistics' && { logisticsType: newItemData.logisticsType })
      };

      const existingData = (dynamicShopItems as any)[newItemData.category] || [];
      const updatedCategory = [...existingData, newItem];
      const updatedShop = { ...dynamicShopItems, [newItemData.category]: updatedCategory };
      
      await setDoc(doc(db, 'gameData', 'militiaShop'), updatedShop);
      
      // Sync with market_overrides
      await setDoc(doc(db, 'market_overrides', newItem.id), { 
        image: newItem.image,
        name: newItem.name,
        category: newItemData.category,
        isMilitiaItem: true
      }, { merge: true });
      
      setShowAddItemModal(false);
      setNewItemData({ category: 'weapons', name: '', image: '', price: 0, power: 0, defense: 0, effect: '', quantity: 0, logisticsType: 'ammo' });
      toast.success('تمت إضافة القطعة بنجاح');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء الإضافة');
    }
  };

  const handleDeleteShopItem = async (category: string, itemId: string) => {
    if (profile?.role !== 'Admin') return;
    try {
      const updatedCategory = (dynamicShopItems as any)[category].filter((i: any) => i.id !== itemId);
      const updatedShop = { ...dynamicShopItems, [category]: updatedCategory };
      await setDoc(doc(db, 'gameData', 'militiaShop'), updatedShop);
      
      // Remove from market_overrides
      try {
        await setDoc(doc(db, 'market_overrides', itemId), { deleted: true }, { merge: true });
      } catch (e) {
        console.error("Error removing from overrides:", e);
      }
      
      toast.success('تم حذف القطعة من المتجر');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const handleUpdateShopItem = async (category: string, updatedItem: any) => {
    if (profile?.role !== 'Admin') return;
    try {
      let updatedShop = { ...dynamicShopItems };
      
      const itemToSave = {
        ...updatedItem,
        ...((updatedItem.power > 0 || category === 'intelligence') && { power: updatedItem.power })
      };

      // Find the old category of the item
      let oldCategory = category;
      for (const cat of Object.keys(dynamicShopItems)) {
        if ((dynamicShopItems as any)[cat].some((i: any) => i.id === itemToSave.id)) {
          oldCategory = cat;
          break;
        }
      }

      if (oldCategory !== category) {
        // Remove from old category
        const updatedOldCategory = (dynamicShopItems as any)[oldCategory].filter((i: any) => i.id !== itemToSave.id);
        // Add to new category
        const updatedNewCategory = [...((dynamicShopItems as any)[category] || []), itemToSave];
        
        updatedShop = {
          ...dynamicShopItems,
          [oldCategory]: updatedOldCategory,
          [category]: updatedNewCategory
        };
      } else {
        // Just update in the same category
        const updatedCategory = (dynamicShopItems as any)[category].map((i: any) => i.id === itemToSave.id ? itemToSave : i);
        updatedShop = { ...dynamicShopItems, [category]: updatedCategory };
      }

      await setDoc(doc(db, 'gameData', 'militiaShop'), updatedShop);
      
      // Sync with market_overrides
      await setDoc(doc(db, 'market_overrides', itemToSave.id), { 
        image: itemToSave.image,
        name: itemToSave.name,
        category: category
      }, { merge: true });
      
      setEditingItem(null);
      toast.success('تم تحديث القطعة');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  const handleAttackMilitia = async (target: any) => {
    if (!profile || !profile.militia) return;

    // Check if allied
    if (myAlliances.includes(target.id)) {
      toast.error('لا يمكنك مهاجمة حلفائك!');
      return;
    }

    if (profile.militia.soldiers.length === 0) {
      toast.error('لا تملك جنود للهجوم');
      return;
    }

    const ammoNeeded = 100;
    const fuelNeeded = profile.militia.vehicles.length > 0 ? 50 : 0;

    if ((profile.militia.resources.ammo || 0) < ammoNeeded) {
      toast.error(`تحتاج إلى ${ammoNeeded} ذخيرة للهجوم`);
      return;
    }
    if ((profile.militia.resources.fuel || 0) < fuelNeeded) {
      toast.error(`تحتاج إلى ${fuelNeeded} وقود للمركبات`);
      return;
    }

    setIsProcessing(true);
    try {
      const myMilitia = profile.militia;
      // Calculate my power
      let myPower = myMilitia.soldiers.reduce((acc, s) => acc + s.stats.strength, 0);
      myPower += myMilitia.vehicles.reduce((acc, v) => {
        const vData = dynamicShopItems.vehicles.find(item => item.id === v.itemId);
        return acc + (vData?.power || 0);
      }, 0);

      // Intelligence Bureau boost (+10% per level)
      const intelLevel = myMilitia.gqh?.facilities?.intelligenceLevel || 0;
      if (intelLevel > 0) {
        myPower *= (1 + (intelLevel * 0.1));
      }

    const hasCommCenter = Number(myMilitia.inventory?.logistics?.m_log_2 || 0) > 0;
    if (hasCommCenter) {
      myPower *= 1.15; // 15% Comm Center boost
      toast.info('تم تفعيل مركز الاتصالات: تعزيز قوة الهجوم بنسبة 15%');
    }

      // Calculate target defense
      const targetMilitia = target.militia;
      let targetDefense = targetMilitia.soldiers.reduce((acc: number, s: any) => acc + s.stats.defense, 0);
      targetDefense += targetMilitia.vehicles.reduce((acc: number, v: any) => {
        const vData = dynamicShopItems.vehicles.find(item => item.id === v.itemId);
        return acc + (vData?.power || 0);
      }, 0);

      const successChance = myPower / (myPower + targetDefense);
      const isVictory = Math.random() < successChance;

      // Losses
      const ammoLost = Math.floor(Math.random() * 100) + 50;
      const fuelLost = myMilitia.vehicles.length > 0 ? Math.floor(Math.random() * 50) + 20 : 0;
      
      const updatedSoldiers = myMilitia.soldiers.map(s => ({
        ...s,
        hasArmor: s.hasArmor || false,
        hasWeapon: s.hasWeapon || false,
        health: Math.max(0, (s.health || 100) - (isVictory ? Math.floor(Math.random() * 30) : Math.floor(Math.random() * 60))),
        lastHealTime: Date.now()
      }));

      const updatedVehicles = myMilitia.vehicles.map(v => ({
        ...v,
        health: Math.max(0, (v.health || 100) - Math.floor(Math.random() * 20))
      }));

      const inventory = (myMilitia.inventory as any) || { weapons: {}, armor: {}, logistics: {} };
      const logistics = inventory.logistics || {};

      const updates: any = {
        'militia.soldiers': updatedSoldiers,
        'militia.vehicles': updatedVehicles,
        'militia.resources.ammo': Math.max(0, (myMilitia.resources.ammo || 0) - ammoLost),
        'militia.resources.fuel': Math.max(0, (myMilitia.resources.fuel || 0) - fuelLost),
        'militia.inventory.logistics.m_log_4': Math.max(0, (Number(logistics.m_log_4 || 0)) - ammoLost),
        'militia.inventory.logistics.m_log_5': Math.max(0, (Number(logistics.m_log_5 || 0)) - fuelLost)
      };

      let lostItemsMessage = '';
      if (!isVictory && Math.random() > 0.5) {
        // Lose a random weapon or armor
        const inventory = (myMilitia.inventory as any) || { weapons: {}, armor: {}, logistics: {} };
        const weaponsInventory = inventory.weapons || {};
        const hasWeapons = Object.keys(weaponsInventory).length > 0;
        if (hasWeapons) {
          const weaponId = Object.keys(weaponsInventory)[0];
          if (weaponsInventory[weaponId] > 0) {
            updates[`militia.inventory.weapons.${weaponId}`] = Math.max(0, weaponsInventory[weaponId] - 1);
            lostItemsMessage += ' وسلاح واحد';
          }
        }
      }

      if (!isVictory && Math.random() > 0.8 && myMilitia.vehicles.length > 0) {
        // Lose a vehicle
        const updatedVehiclesList = [...myMilitia.vehicles];
        updatedVehiclesList.pop(); // Remove the last vehicle
        updates['militia.vehicles'] = updatedVehiclesList;
        lostItemsMessage += ' ومركبة واحدة';
      }

      // Loot
      let lootMoney = 0;
      let lootGold = 0;

      if (isVictory) {
        lootMoney = Math.floor((targetMilitia.resources.corruptionMoney || 0) * 0.1); // Steal 10%
        lootGold = Math.floor((target.gold || 0) * 0.1);
        updates['militia.resources.corruptionMoney'] = (myMilitia.resources.corruptionMoney || 0) + lootMoney;
        updates['gold'] = (profile.gold || 0) + lootGold;
        
        // Update target's resources too
        const targetUpdates: any = {
          'militia.resources.corruptionMoney': Math.max(0, (targetMilitia.resources.corruptionMoney || 0) - lootMoney),
          'gold': Math.max(0, (target.gold || 0) - lootGold),
          'militia.defenseLogs': [
            { attackerName: profile.displayName, result: 'loss', lost: { money: lootMoney, gold: lootGold }, timestamp: Date.now() },
            ...(targetMilitia.defenseLogs || [])
          ].slice(0, 50)
        };
        await updateDoc(doc(db, 'users', target.id), targetUpdates);
      } else {
        // Target defense log for victory
        const targetUpdates: any = {
          'militia.defenseLogs': [
            { attackerName: profile.displayName, result: 'win', timestamp: Date.now() },
            ...(targetMilitia.defenseLogs || [])
          ].slice(0, 50)
        };
        await updateDoc(doc(db, 'users', target.id), targetUpdates);
      }

      // Update my logs
      const loot = isVictory ? { money: lootMoney, gold: lootGold } : null;
      const updatedAttackLogs = [
        { targetName: targetMilitia.name, result: isVictory ? 'win' : 'loss', loot, timestamp: Date.now() },
        ...(myMilitia.attackLogs || [])
      ].slice(0, 50);
      updates['militia.attackLogs'] = updatedAttackLogs;

      await updateDoc(doc(db, 'users', profile.uid), updates);

      if (isVictory) {
        toast.success(`انتصار! غنمت ${formatNumber(lootMoney)} أموال و ${formatNumber(lootGold)} ذهب. خسرت ${formatNumber(ammoLost)} ذخيرة.`);
      } else {
        toast.error(`هزيمة! قواتك تراجعت. خسرت ${ammoLost} ذخيرة وأصيب جنودك${lostItemsMessage}.`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendSupport = async (targetId: string) => {
    if (!profile || !profile.militia || !supportData.amount || supportData.amount <= 0) return;
    
    setIsProcessing(true);
    try {
      const type = supportData.type;
      const amount = supportData.amount;
      const myMilitia = profile.militia;

      const inventory = (myMilitia.inventory as any) || { weapons: {}, armor: {}, logistics: {} };
      const logisticsInventory = inventory.logistics || {};
      const weaponsInventory = inventory.weapons || {};

      // Check if we have enough
      if (type === 'corruptionMoney' && myMilitia.resources.corruptionMoney < amount) throw new Error('لا تملك أموال فساد كافية');
      if (type === 'gold' && (profile.gold || 0) < amount) throw new Error('لا تملك ذهب كافي');
      if (type === 'ammo' && (myMilitia.resources.ammo || 0) < amount) throw new Error('لا تملك ذخيرة كافية');
      if (type === 'logistics' && (logisticsInventory['m_log_1'] || 0) < amount) throw new Error('لا تملك وحدات تموين كافية');
      if (type === 'weapon') {
        const weaponId = Object.keys(weaponsInventory)[0];
        if (!weaponId || (weaponsInventory[weaponId] || 0) < amount) throw new Error('لا تملك أسلحة كافية في المخزن');
      }

      // Deduct from me
      const myUpdates: any = {};
      if (type === 'corruptionMoney') myUpdates['militia.resources.corruptionMoney'] = myMilitia.resources.corruptionMoney - amount;
      if (type === 'gold') myUpdates['gold'] = (profile.gold || 0) - amount;
      if (type === 'ammo') myUpdates['militia.resources.ammo'] = (myMilitia.resources.ammo || 0) - amount;
      if (type === 'logistics') myUpdates[`militia.inventory.logistics.m_log_1`] = (logisticsInventory['m_log_1'] || 0) - amount;
      if (type === 'weapon') {
        const weaponId = Object.keys(weaponsInventory)[0];
        myUpdates[`militia.inventory.weapons.${weaponId}`] = Math.max(0, (weaponsInventory[weaponId] || 0) - amount);
      }

      // Update my logs
      const targetSnap = await getDoc(doc(db, 'users', targetId));
      if (!targetSnap.exists()) throw new Error('المليشيا المستهدفة غير موجودة');
      
      const targetData = targetSnap.data();
      const targetMilitia = targetData.militia;
      if (!targetMilitia) throw new Error('المليشيا المستهدفة غير مفعلة');

      const targetName = targetMilitia.name || 'Unknown';
      
      const updatedSupportLogs = [
        { type, amount, targetName, direction: 'outgoing', timestamp: Date.now() },
        ...(profile.militia.supportLogs || [])
      ].slice(0, 50);

      myUpdates['militia.supportLogs'] = updatedSupportLogs;

      await updateDoc(doc(db, 'users', profile.uid), myUpdates);

      // Update target resources and logs
      const targetUpdates: any = {};
      if (type === 'corruptionMoney') targetUpdates['militia.resources.corruptionMoney'] = (targetMilitia.resources.corruptionMoney || 0) + amount;
      if (type === 'gold') targetUpdates['gold'] = (targetData.gold || 0) + amount;
      if (type === 'ammo') targetUpdates['militia.resources.ammo'] = (targetMilitia.resources.ammo || 0) + amount;
      if (type === 'logistics') {
        const targetInv = targetMilitia.inventory?.logistics || {};
        const currentCount = Number(targetInv['m_log_1'] || 0);
        targetUpdates[`militia.inventory.logistics.m_log_1`] = currentCount + amount;
      }
      if (type === 'weapon') {
        const weaponId = Object.keys(profile.militia.inventory?.weapons || {})[0];
        targetUpdates[`militia.inventory.weapons.${weaponId}`] = (targetMilitia.inventory?.weapons?.[weaponId] || 0) + amount;
      }

      const updatedTargetSupportLogs = [
        { type, amount, fromName: profile.displayName, direction: 'incoming', timestamp: Date.now() },
        ...(targetMilitia.supportLogs || [])
      ].slice(0, 50);
      targetUpdates['militia.supportLogs'] = updatedTargetSupportLogs;

      await updateDoc(doc(db, 'users', targetId), targetUpdates);

      toast.success('تم إرسال الدعم بنجاح');
      setSupportData({ targetId: '', type: 'ammo', amount: 0 });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'حدث خطأ');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!militia) {
    return (
      <div className="min-h-screen bg-black p-4 lg:p-8 flex items-center justify-center relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 grayscale"
          style={{ backgroundImage: `url(${MILITIA_IMAGES.background})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-md w-full bg-white/5 border border-white/10 rounded-[2.5rem] p-8 text-center backdrop-blur-xl"
        >
          <div className="w-20 h-20 bg-red-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-500/30">
            <Shield size={40} className="text-red-500" />
          </div>
          <h1 className="text-3xl font-black text-white mb-4 italic uppercase tracking-tighter">نظام المليشيات</h1>
          <p className="text-zinc-400 mb-8 font-medium">قم بإنشاء مليشيتك الخاصة، ابنِ قوتك العسكرية، وسيطر على الموارد الميدانية.</p>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] uppercase tracking-widest flex items-center justify-center gap-3 group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
            تأسيس مليشيا جديدة
          </button>
        </motion.div>

        {/* Create Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-black/60 border border-white/10 rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl backdrop-blur-2xl"
              >
                <h2 className="text-2xl font-black text-white mb-6 italic uppercase">تأسيس المليشيا</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">اسم المليشيا</label>
                    <input
                      type="text"
                      value={newMilitia.name}
                      onChange={(e) => setNewMilitia({ ...newMilitia, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-red-500 transition-colors outline-none backdrop-blur-md"
                      placeholder="أدخل اسم المليشيا..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">رابط الصورة (اختياري)</label>
                    <div className="relative">
                      <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                      <input
                        type="text"
                        value={newMilitia.image}
                        onChange={(e) => setNewMilitia({ ...newMilitia, image: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-white focus:border-red-500 transition-colors outline-none backdrop-blur-md"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">نوع المليشيا</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['aggressive', 'government', 'external'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setNewMilitia({ ...newMilitia, type })}
                          className={clsx(
                            "py-3 rounded-xl text-xs font-black uppercase transition-all border backdrop-blur-md",
                            newMilitia.type === type 
                              ? "bg-red-600 border-red-500 text-white" 
                              : "bg-white/5 border-white/5 text-zinc-500 hover:border-white/20"
                          )}
                        >
                          {type === 'aggressive' ? 'عدائية' : type === 'government' ? 'حكومية' : 'خارجية'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white font-black rounded-2xl transition-all backdrop-blur-md"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleCreateMilitia}
                      disabled={isProcessing || !newMilitia.name}
                      className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl transition-all disabled:opacity-50"
                    >
                      {isProcessing ? 'جاري التأسيس...' : 'تأكيد التأسيس'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20 relative overflow-hidden">
      <div 
        className="fixed inset-0 bg-cover bg-center opacity-20 grayscale pointer-events-none"
        style={{ backgroundImage: `url(${MILITIA_IMAGES.background})` }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black pointer-events-none" />
      
      <div className="relative z-10">
        {/* Header Section */}
      <div className="relative h-64 lg:h-80 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${militia.image})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-12">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 lg:w-32 lg:h-32 bg-white/5 backdrop-blur-xl border-4 border-red-600 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <img src={militia.image || undefined} className="w-full h-full object-cover" alt={militia.name} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl lg:text-5xl font-black text-white italic uppercase tracking-tighter">{militia.name}</h1>
                  <span className={clsx(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                    militia.type === 'aggressive' ? "bg-red-500/20 border-red-500/30 text-red-500" :
                    militia.type === 'government' ? "bg-blue-500/20 border-blue-500/30 text-blue-500" :
                    "bg-yellow-500/20 border-yellow-500/30 text-yellow-500"
                  )}>
                    {militia.type === 'aggressive' ? 'عدائية' : militia.type === 'government' ? 'حكومية' : 'خارجية'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-zinc-400 text-sm font-bold">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-red-500" />
                    <span>{formatNumber(militia.soldiers.length)} جندي</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-blue-500" />
                    <span>{formatNumber(militia.vehicles.length)} مركبة</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'dashboard', label: 'النظام العسكري', icon: Shield },
              { id: 'headquarters', label: 'المقر العام', icon: Castle },
              { id: 'soldiers', label: 'تعيين الجنود', icon: Users },
              { id: 'training', label: 'التدريب', icon: Target },
              { id: 'shop', label: 'المتجر', icon: ShoppingCart },
              { id: 'inventory', label: 'المخزن', icon: Lock },
              { id: 'maintenance', label: 'الصيانة', icon: Wrench },
              { id: 'bank', label: 'البنك', icon: Landmark },
              { id: 'forces', label: 'القوات', icon: Swords },
              { id: 'resources', label: 'الموارد', icon: Fuel },
              { id: 'hospital', label: 'المستشفى', icon: Heart },
              { id: 'combat', label: 'المعارك', icon: Swords },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={clsx(
                  "flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-black uppercase transition-all whitespace-nowrap border backdrop-blur-md",
                  activeTab === tab.id 
                    ? "bg-red-600 border-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]" 
                    : "bg-white/5 border-white/5 text-zinc-500 hover:border-white/20 hover:text-white"
                )}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'forces' && (
            <motion.div
              key="forces"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Militia Leader Section (Merged with AI General) */}
              <div className="bg-transparent backdrop-blur-sm border border-white/10 rounded-[2.5rem] p-8">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="relative group">
                    <div className="w-40 h-40 rounded-[3rem] overflow-hidden border-4 border-red-600 shadow-2xl">
                      <img src={militia.generalId ? militia.soldiers.find(s => s.id === militia.generalId)?.image : MILITIA_IMAGES.soldierFull} className="w-full h-full object-cover" alt="Leader" />
                    </div>
                  </div>
                  <div className="flex-1 text-center md:text-right space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-4">
                      <div>
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                          <ShieldCheck size={14} className="text-red-500" />
                          <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">لواء (الزعيم)</h3>
                        </div>
                        <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">
                          {militia.generalId ? militia.soldiers.find(s => s.id === militia.generalId)?.name : 'لم يتم تعيين زعيم'}
                        </h2>
                      </div>
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          onClick={() => setShowGeneralModal(true)}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl transition-all border border-white/10 flex items-center gap-2"
                        >
                          {militia.generalId ? <ArrowRightLeft size={16} /> : <Plus size={16} />}
                          {militia.generalId ? 'تغيير الزعيم' : 'تعيين زعيم (لواء)'}
                        </button>
                        {militia.generalId && (
                          <button
                            onClick={() => setShowAIBattleModal(true)}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center gap-2"
                          >
                            <Zap size={16} />
                            إدارة المعارك AI
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                      <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">إجمالي القوة</p>
                        <p className="text-2xl font-black text-red-500">
                          {formatNumber(
                            (militia.soldiers?.reduce((acc, s) => acc + (s.stats?.strength || 0) + (s.stats?.defense || 0) + (s.stats?.speed || 0) + (s.stats?.endurance || 0), 0) || 0) +
                            (militia.squads?.reduce((acc, s) => acc + (s.power || 0), 0) || 0)
                          )}
                        </p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">عدد الفرق</p>
                        <p className="text-2xl font-black text-blue-500">{militia.squads?.length || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Control Points & Strength Indicators */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { id: 'oilFields', label: 'حقول النفط', icon: Fuel, color: 'text-orange-500' },
                  { id: 'ports', label: 'الموانئ البحرية', icon: Anchor, color: 'text-blue-500' },
                  { id: 'extortion', label: 'عمليات الابتزاز', icon: Zap, color: 'text-yellow-500' }
                ].map((cp) => {
                  const rawStats = militia.controlPoints?.[cp.id as keyof typeof militia.controlPoints];
                  const stats = {
                    level: Number(rawStats?.level) || 1,
                    strength: Number(rawStats?.strength) || 100
                  };
                  const levelDisplay = isNaN(stats.level) ? "1.0" : stats.level.toFixed(1);
                  const progress = isNaN(stats.level) ? 10 : (stats.level / 10) * 100;

                  return (
                    <div key={cp.id} className="bg-transparent backdrop-blur-sm border border-white/10 rounded-[2rem] p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className={clsx("p-3 rounded-2xl bg-white/5", cp.color)}>
                          <cp.icon size={24} />
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">المستوى</p>
                          <p className="text-lg font-black text-white">{levelDisplay}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-black text-white mb-2">{cp.label}</h4>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={clsx("h-full transition-all duration-1000", cp.color.replace('text', 'bg'))}
                            style={{ width: `${Math.min(100, progress)}%` }}
                          />
                        </div>
                        <p className="text-[10px] font-bold text-zinc-500 mt-2">مؤشر القوة: {formatNumber(Math.floor(stats.level * 500))}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Squads Management */}
              <div className="bg-transparent backdrop-blur-sm border border-white/10 rounded-[2.5rem] p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-white italic uppercase flex items-center gap-3">
                    <Users className="text-red-500" />
                    الفرق العسكرية
                  </h3>
                  <button 
                    onClick={() => setShowSquadModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl transition-all shadow-lg"
                  >
                    <Plus size={18} />
                    تكوين فرقة جديدة
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {militia.squads?.map((squad) => (
                    <div key={squad.id} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 space-y-4 relative group overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 flex gap-2">
                        <button 
                          onClick={() => {
                            setEditingSquadId(squad.id);
                            setNewSquad({
                              name: squad.name,
                              leaderId: squad.leaderId,
                              soldierIds: squad.soldierIds,
                              vehicleId: squad.vehicleId || ''
                            });
                            setShowSquadModal(true);
                          }}
                          className="text-zinc-600 hover:text-blue-500 transition-colors"
                        >
                          <Wrench size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteSquad(squad.id)}
                          className="text-zinc-600 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-red-600/20 flex items-center justify-center text-red-500">
                          <Shield size={32} />
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-white">{squad.name}</h4>
                          <p className="text-xs font-bold text-zinc-500">قوة الفرقة: {formatNumber(squad.power)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {/* Leader */}
                        <div className="space-y-1">
                          <div className="aspect-square rounded-xl overflow-hidden border-2 border-yellow-500 relative">
                            <img src={militia.soldiers.find(s => s.id === squad.leaderId)?.image} className="w-full h-full object-cover" />
                            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-center text-yellow-500 font-bold py-0.5">
                              {militia.soldiers.find(s => s.id === squad.leaderId)?.rank || 'جندي'}
                            </div>
                          </div>
                          <p className="text-[8px] font-black text-center text-yellow-500 uppercase">القائد</p>
                        </div>
                        {/* Soldiers */}
                        {squad.soldierIds.map(sid => (
                          <div key={sid} className="space-y-1">
                            <div className="aspect-square rounded-xl overflow-hidden border border-white/10 relative">
                              <img src={militia.soldiers.find(s => s.id === sid)?.image} className="w-full h-full object-cover" />
                              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-center text-white font-bold py-0.5">
                                {militia.soldiers.find(s => s.id === sid)?.rank || 'جندي'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {squad.vehicleId && (
                        <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
                          <Fuel size={14} className="text-blue-500" />
                          <span className="text-[10px] font-bold text-zinc-400">مركبة الفرقة: {militia.vehicles.find(v => v.id === squad.vehicleId)?.id}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>





              {/* Operation Logs */}
              <div className="bg-transparent backdrop-blur-sm border border-white/10 rounded-[2.5rem] p-8">
                <h3 className="text-xl font-black text-white mb-6 italic uppercase flex items-center gap-3">
                  <TrendingUp className="text-green-500" />
                  سجل العمليات (تلقائي)
                </h3>
                <div className="space-y-3">
                  {militia.operationLogs?.map((log) => (
                    <div key={log.id} className={clsx(
                      "flex items-center justify-between p-4 rounded-2xl border transition-all",
                      log.success ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
                    )}>
                      <div className="flex items-center gap-4">
                        <div className={clsx(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          log.success ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                        )}>
                          {log.success ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
                        </div>
                        <div>
                          <p className="text-sm font-black text-white">
                            {log.type === 'oilFields' ? 'هجوم على حقول النفط' : 
                             log.type === 'ports' ? 'هجوم على الموانئ' : 'عملية ابتزاز'}
                          </p>
                          <p className="text-[10px] font-bold text-zinc-500">
                            {new Date(log.timestamp).toLocaleTimeString()} - {log.success ? 'نجاح العملية' : 'فشل العملية'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {log.success ? (
                          <p className="text-xs font-black text-green-500">+{formatNumber(log.reward?.corruptionMoney)} أموال فساد</p>
                        ) : (
                          <p className="text-xs font-black text-red-500">خسائر: {log.losses?.soldiers} جندي</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!militia.operationLogs || militia.operationLogs.length === 0) && (
                    <div className="text-center py-12 text-zinc-500 font-bold">لا توجد عمليات مسجلة بعد</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-8">
                {/* Resources Overview */}
                <div className="bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-blue-500/5 opacity-50"></div>
                  
                  <div className="relative z-10">
                    {/* Comm Center Defense Alert Banner */}
                    {Number(militia.inventory?.logistics?.m_log_2 || 0) > 0 && 
                     (militia.defenseLogs || []).filter(log => log.timestamp > Date.now() - 30 * 60 * 1000).length > 0 && (
                      <div className="mb-8 bg-gradient-to-r from-red-600/20 to-black/40 border border-red-500/30 rounded-2xl p-4 flex items-center gap-4 animate-pulse">
                        <AlertTriangle className="text-red-500 shrink-0" size={24} />
                        <div>
                          <h4 className="text-sm font-black text-red-500 uppercase tracking-widest">تنبيه استخباراتي: تهديد حديث</h4>
                          <p className="text-xs text-white/70">رصدت أجهزة مركز الاتصالات هجمات معادية في الـ 30 دقيقة الأخيرة.</p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-6 border-b border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-2xl border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                          <Fuel className="text-blue-400" size={28} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-white italic tracking-tight">إدارة الإمدادات والموارد</h3>
                          <p className="text-zinc-500 text-sm font-medium mt-1">المركز اللوجستي للعمليات والمؤن</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleSyncResources}
                        disabled={isProcessing}
                        className="mt-4 sm:mt-0 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all flex items-center gap-2 text-zinc-300 hover:text-white group/btn"
                        title="مزامنة الموارد"
                      >
                        <RefreshCw size={16} className={clsx("transition-transform", isProcessing ? 'animate-spin text-blue-400' : 'group-hover/btn:rotate-180')} />
                        <span className="text-xs font-bold uppercase tracking-wider">الاستطلاع اللوجستي</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                      {/* Currency / Main values */}
                      <div className="col-span-2 grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 rounded-2xl p-6 relative overflow-hidden group/card hover:border-orange-500/40 transition-all">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/20 rounded-full blur-[40px] -mr-8 -mt-8 transition-transform group-hover/card:scale-150"></div>
                          <Coins size={28} className="text-orange-400 mb-4" />
                          <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1">أموال الفساد</p>
                          <p className="text-3xl font-black text-white tabular-nums tracking-tight">{formatNumber(militia.resources.corruptionMoney)}</p>
                        </div>
                        <div className="bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/20 rounded-2xl p-6 relative overflow-hidden group/card hover:border-yellow-500/40 transition-all">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/20 rounded-full blur-[40px] -mr-8 -mt-8 transition-transform group-hover/card:scale-150"></div>
                          <TrendingUp size={28} className="text-yellow-400 mb-4" />
                          <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1">احتياطي الذهب</p>
                          <p className="text-3xl font-black text-white tabular-nums tracking-tight">{formatNumber(profile?.gold || 0)}</p>
                        </div>
                      </div>

                      {/* Consumables overview */}
                      <div className="col-span-2 grid grid-cols-3 sm:grid-cols-5 gap-3">
                        {[
                          { label: 'الذخيرة', value: militia.resources?.ammo, icon: Zap, color: 'text-red-400', bg: 'from-red-500/10', border: 'border-red-500/20', hover: 'hover:border-red-500/40' },
                          { label: 'الوقود', value: militia.resources?.fuel, icon: Fuel, color: 'text-blue-400', bg: 'from-blue-500/10', border: 'border-blue-500/20', hover: 'hover:border-blue-500/40' },
                          { label: 'الطعام', value: militia.resources?.food, icon: Utensils, color: 'text-green-400', bg: 'from-green-500/10', border: 'border-green-500/20', hover: 'hover:border-green-500/40' },
                          { label: 'الماء', value: militia.resources?.water, icon: Droplets, color: 'text-cyan-400', bg: 'from-cyan-500/10', border: 'border-cyan-500/20', hover: 'hover:border-cyan-500/40' },
                          { label: 'الأدوية', value: militia.resources?.medicine, icon: Heart, color: 'text-pink-400', bg: 'from-pink-500/10', border: 'border-pink-500/20', hover: 'hover:border-pink-500/40' },
                        ].map((stat, idx) => (
                           <div key={idx} className={clsx("rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all bg-gradient-to-b border to-transparent relative overflow-hidden", stat.bg, stat.border, stat.hover)}>
                             <stat.icon size={20} className={clsx("mb-3", stat.color)} />
                             <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 whitespace-nowrap">{stat.label}</p>
                             <p className={clsx("text-lg font-black tabular-nums tracking-tighter", stat.color)}>
                               {formatNumber(Number(stat.value || 0))}
                             </p>
                           </div>
                        ))}
                      </div>
                    </div>

                    {/* Expenses & Generation Info */}
                    <div className="mt-6 flex flex-col md:flex-row gap-4">
                      <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-5 hover:border-red-500/30 transition-colors group/expense">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-red-500/10 rounded-lg text-red-400 group-hover/expense:scale-110 transition-transform">
                            <AlertTriangle size={18} />
                          </div>
                          <h4 className="text-xs font-black text-white uppercase tracking-widest">المصروفات اليومية</h4>
                        </div>
                        <div className="space-y-4 pt-1">
                          <div>
                            <div className="flex justify-between items-end mb-1">
                              <span className="text-zinc-400 text-xs font-bold relative z-10">الرواتب الميدانية</span>
                              <span className="text-red-400 font-black text-sm tabular-nums relative z-10">{formatNumber(militia.soldiers.length * 10000)} / يوم</span>
                            </div>
                            <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden relative">
                              <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 opacity-20"></div>
                              <div className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full relative z-10" style={{ width: `${Math.min(100, ((militia.soldiers.length * 10000) / 1000000) * 100)}%` }}></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between items-end mb-1">
                              <span className="text-zinc-400 text-xs font-bold relative z-10">استهلاك المؤن</span>
                              <span className="text-orange-400 font-black text-sm tabular-nums relative z-10">10 / جندي / ساعة</span>
                            </div>
                            <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden relative">
                              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-yellow-500 opacity-20"></div>
                              <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full relative z-10" style={{ width: '40%' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-5 relative overflow-hidden hover:border-blue-500/30 transition-colors flex flex-col justify-between">
                        <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[50px] -ml-16 -mt-16 pointer-events-none"></div>
                        <div>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                              <Package size={18} />
                            </div>
                            <h4 className="text-xs font-black text-white uppercase tracking-widest">المتجر اللوجستي المظلم</h4>
                          </div>
                          <p className="text-xs text-zinc-400 font-bold leading-relaxed pr-11 opacity-80 decoration-slice">
                            تأمين الإمدادات بانتظام ضروري لإبقاء جنودك على قيد الحياة ولتفادي الانشقاقات وفقدان القدرة القتالية.
                          </p>
                        </div>
                        <div className="mt-4">
                          <button 
                            onClick={() => setActiveTab('shop')}
                            className="w-full py-3 bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-500/50 rounded-xl transition-all flex items-center justify-center gap-2 text-blue-300 hover:text-white group/shop"
                          >
                            <span className="text-xs font-black uppercase tracking-wider">طلب إمدادات طارئة</span>
                            <ChevronLeft size={16} className="transition-transform group-hover/shop:-translate-x-1" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Secondary Dashboard Elements */}
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              <div className="lg:col-span-8 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="sm:col-span-2 bg-gradient-to-br from-red-600/20 to-black/60 backdrop-blur-3xl border border-red-500/20 rounded-[2.5rem] p-8 lg:p-10 relative overflow-hidden group shadow-2xl">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-red-600/10 rounded-full blur-[100px] pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-10">
                        <div className="p-4 bg-red-600/20 rounded-2xl border border-red-500/20">
                          <Swords size={32} className="text-red-500" />
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] mb-1">إجمالي القوة الضاربة</p>
                          <p className="text-5xl font-black text-white italic tracking-tighter tabular-nums drop-shadow-lg">
                            {formatNumber(militia.soldiers.reduce((acc, s) => acc + (s.stats?.strength || 0), 0))}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                          <span>كفاءة العمليات</span>
                          <span className="text-red-400">88%</span>
                        </div>
                        <div className="h-3 bg-black/60 rounded-full overflow-hidden border border-white/5 p-0.5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '88%' }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-red-600 via-red-500 to-orange-400 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-between hover:border-white/20 transition-all group overflow-hidden shadow-xl">
                      <div className="relative z-10 flex justify-between items-start mb-6">
                        <div className="p-3 bg-orange-600/10 rounded-xl border border-orange-500/20">
                          <Flame size={20} className="text-orange-500" />
                        </div>
                        <p className="text-2xl font-black text-white tabular-nums">{militia.controlledResources?.oilFields || 0}</p>
                      </div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">حقول النفط</p>
                  </div>

                  <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-between hover:border-white/20 transition-all group shadow-xl">
                     <div className="flex justify-between items-start mb-6">
                        <div className="p-3 bg-green-600/10 rounded-xl border border-green-500/20">
                          <DollarSign size={20} className="text-green-500" />
                        </div>
                        <p className="text-2xl font-black text-white tabular-nums">{militia.controlledResources?.extortion || 0}</p>
                      </div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">تحصيل الإتاوات</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[3rem] p-10 relative overflow-hidden group shadow-2xl">
                    <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-8 flex items-center gap-3">
                      <Users size={20} className="text-blue-500" />
                      إحصائيات القوات
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">الجنود</p>
                        <p className="text-2xl font-black text-white">{(militia.soldiers || []).length}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">الآليات</p>
                        <p className="text-2xl font-black text-blue-500">{(militia.vehicles || []).length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 relative overflow-hidden flex flex-col items-center justify-center text-center shadow-2xl">
                    <div className="relative w-32 h-32 mb-4">
                      <div className="absolute inset-0 border-2 border-red-500/20 rounded-full animate-ping duration-[3s]"></div>
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute top-1/2 left-1/2 w-16 h-px bg-gradient-to-r from-red-600 to-transparent origin-left" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,1)]"></div>
                    </div>
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] animate-pulse">رادار المسح الميداني</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 gap-8">
                 <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[3rem] p-10 relative overflow-hidden group shadow-2xl h-full flex flex-col">
                    <div className="flex flex-col items-center text-center mb-10">
                      <div className="w-24 h-24 bg-zinc-900 rounded-2xl overflow-hidden border-2 border-white/10 mb-6">
                        <img src={militia.image} className="w-full h-full object-cover" />
                      </div>
                      <h2 className="text-3xl font-black text-white italic tracking-tighter mb-2">{militia.name}</h2>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">تشكيل قتالي فعال</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4 mt-auto">
                      <button 
                        onClick={() => setActiveTab('combat')}
                        className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl transition-all shadow-[0_0_30px_rgba(220,38,38,0.3)] flex items-center justify-center gap-3"
                      >
                        <Target size={18} />
                        غارة فورية
                      </button>
                      <button 
                        onClick={() => setActiveTab('soldiers')}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl border border-white/10 transition-all flex items-center justify-center gap-3"
                      >
                        <Users size={18} />
                        تجنيد مرتزقة
                      </button>
                    </div>
                 </div>
              </div>
            </motion.div>
              </div>
            </motion.div>
          )}

          {activeTab === 'soldiers' && (
            <motion.div
              key="soldiers"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8 relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-64 h-64 bg-red-500/10 rounded-full blur-[80px] pointer-events-none transition-transform group-hover:scale-125"></div>
                <div className="relative z-10">
                  <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">تجنيد القوات وإدارتها</h2>
                  <p className="text-zinc-400 font-bold max-w-xl leading-relaxed">
                    قم بتوسيع نفوذك من خلال تجنيد مرتزقة وجنود نخبة. كل جندي يمتلك مهارات فريدة تساهم في رفع مستوى قوتك العسكرية على الأرض.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                  <div className="w-full sm:w-48">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1 block">العدد</label>
                    <input 
                      type="number"
                      value={recruitCount}
                      onChange={(e) => setRecruitCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3.5 text-white font-bold"
                      min="1"
                    />
                  </div>
                  <button
                    onClick={() => handleRecruit(false)}
                    disabled={isProcessing}
                    className="px-6 py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl transition-all shadow-[0_0_30px_rgba(220,38,38,0.3)] hover:shadow-[0_0_40px_rgba(220,38,38,0.5)] flex items-center justify-center gap-3 group/btn hover:-translate-y-1"
                  >
                    <UserPlus size={20} className="transition-transform group-hover/btn:rotate-90" />
                    تجنيد {recruitCount} (عادي)
                    <span className="bg-black/20 px-2 py-1 rounded-lg text-[10px] ml-2 tracking-widest">{formatNumber(100000 * recruitCount)} مال فساد</span>
                  </button>
                  <button
                    onClick={() => handleRecruit(true)}
                    disabled={isProcessing}
                    className="px-6 py-4 bg-yellow-600 hover:bg-yellow-500 text-white font-black rounded-2xl transition-all shadow-[0_0_30px_rgba(202,138,4,0.3)] hover:shadow-[0_0_40px_rgba(202,138,4,0.5)] flex items-center justify-center gap-3 group/btn hover:-translate-y-1"
                  >
                    <UserPlus size={20} className="transition-transform group-hover/btn:rotate-90" />
                    تجنيد {recruitCount} (قوات خاصة)
                    <span className="bg-black/20 px-2 py-1 rounded-lg text-[10px] ml-2 tracking-widest">{formatNumber(1000 * recruitCount)} ذهب</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex gap-3 bg-black/20 p-2 rounded-2xl border border-white/5 w-max mx-auto sm:mx-0">
                  <button
                    onClick={() => setActiveSoldiersTab('normal')}
                    className={clsx(
                      "px-8 py-3 rounded-xl font-black uppercase transition-all tracking-widest text-xs",
                      activeSoldiersTab === 'normal' 
                        ? "bg-white/10 text-white shadow-lg" 
                        : "text-zinc-500 hover:text-white hover:bg-white/5"
                    )}
                  >
                    الجنود العاديين
                  </button>
                  <button
                    onClick={() => setActiveSoldiersTab('special')}
                    className={clsx(
                      "px-8 py-3 rounded-xl font-black uppercase transition-all tracking-widest text-xs",
                      activeSoldiersTab === 'special' 
                        ? "bg-yellow-500/20 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]" 
                        : "text-zinc-500 hover:text-yellow-500 hover:bg-yellow-500/10"
                    )}
                  >
                    القوات الخاصة
                  </button>
                </div>

                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => setSoldiersViewMode('grid')}
                    className={clsx(
                      "p-2 rounded-lg transition-all",
                      soldiersViewMode === 'grid' ? "bg-red-600 text-white" : "text-zinc-500 hover:text-white"
                    )}
                  >
                    <LayoutGrid size={20} />
                  </button>
                  <button
                    onClick={() => setSoldiersViewMode('list')}
                    className={clsx(
                      "p-2 rounded-lg transition-all",
                      soldiersViewMode === 'list' ? "bg-red-600 text-white" : "text-zinc-500 hover:text-white"
                    )}
                  >
                    <List size={20} />
                  </button>
                </div>
              </div>

              {soldiersViewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {(militia?.soldiers || [])
                  .filter(s => activeSoldiersTab === 'special' ? s.isSpecialForces : !s.isSpecialForces)
                  .slice(0, soldiersDisplayCount)
                  .map((soldier) => (
                  <div key={soldier.id} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden group hover:border-red-500/50 transition-all shadow-lg hover:shadow-[0_0_30px_rgba(239,68,68,0.15)] flex flex-col">
                    
                    {/* Image Section - Top */}
                    <div className="h-[600px] w-full bg-zinc-900/50 relative overflow-hidden shrink-0 flex items-center justify-center">
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 opacity-60"></div>
                      <img src={soldier.image} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700 relative z-0" alt={soldier.name} />
                      
                      {/* Name Plate Overlay */}
                      <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-end">
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-1 opacity-90 text-white">
                            {soldier.isSpecialForces ? <ShieldCheck size={14} className="text-yellow-400" /> : <Swords size={14} className="text-zinc-300" />}
                            <span className={clsx("text-[10px] font-black uppercase tracking-widest", soldier.isSpecialForces ? "text-yellow-400" : "text-zinc-300")}>
                              {MILITIA_RANKS.find(r => r.id === soldier.rank)?.name || soldier.rank || 'جندي'}
                            </span>
                          </div>
                          <h4 className="text-xl font-black text-white italic tracking-tight drop-shadow-md">{soldier.name}</h4>
                        </div>
                        <span className="text-[10px] font-black text-red-100 uppercase tracking-widest bg-red-600 px-3 py-1.5 rounded-xl shadow-lg relative z-10">LVL {soldier.level}</span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent z-0"></div>
                    </div>
                    {/* Stats Section - Bottom */}
                    <div className="p-5 flex-1 flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                      
                      <div className="space-y-4 mb-5">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                            <span>الحالة الصحية</span>
                            <span className="text-zinc-200">{Math.floor(soldier.health)}%</span>
                          </div>
                          <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-gradient-to-r from-red-600 to-green-500 transition-all duration-500" style={{ width: `${soldier.health}%` }} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: 'القوة', value: Math.floor(soldier.stats.strength), icon: Swords, color: 'text-orange-400', key: 'strength' },
                            { label: 'السرعة', value: Math.floor(soldier.stats.speed), icon: Zap, color: 'text-blue-400', key: 'speed' },
                            { label: 'الدفاع', value: Math.floor(soldier.stats.defense), icon: Shield, color: 'text-green-400', key: 'defense' },
                            { label: 'التحمل', value: Math.floor(soldier.stats.endurance), icon: Heart, color: 'text-pink-400', key: 'endurance' },
                          ].map((stat) => (
                            <div key={stat.key} className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col group/stat hover:bg-white/10 transition-colors">
                              <stat.icon size={14} className={clsx("mb-2 opacity-70 group-hover/stat:opacity-100 transition-opacity", stat.color)} />
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{stat.label}</span>
                                <span className="font-black text-white tabular-nums text-sm">{formatNumber(stat.value)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 mt-auto pt-4">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleEquipSoldier(soldier.id, 'armor', soldier.hasArmor ? 'none' : undefined)}
                            disabled={isProcessing}
                            className={clsx(
                              "py-2.5 text-[10px] font-black uppercase rounded-xl transition-all border flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group/btn2",
                              soldier.hasArmor 
                                ? "bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border-red-500/20" 
                                : "bg-white/5 hover:bg-blue-600 text-zinc-300 hover:text-white border-blue-500/20"
                            )}
                          >
                            <Shield size={14} className={clsx(soldier.hasArmor ? "text-red-400 group-hover/btn2:text-white" : "text-blue-400 group-hover/btn2:animate-pulse")} />
                            {soldier.hasArmor ? 'إزالة الدرع' : 'تجهيز درع'}
                          </button>
                            {soldier.hasWeapon ? (
                              <button
                                onClick={() => handleEquipSoldier(soldier.id, 'weapon', 'none')}
                                className="py-2.5 bg-red-500/10 hover:bg-red-600 text-white text-[10px] font-black uppercase rounded-xl border border-red-500/20 hover:border-transparent transition-all flex items-center justify-center gap-1.5"
                              >
                                <Swords size={14} className="text-red-400 drop-shadow-md" />
                                إزالة السلاح
                              </button>
                            ) : (
                              <select
                                onChange={(e) => handleEquipSoldier(soldier.id, 'weapon', e.target.value)}
                                disabled={isProcessing}
                                className="py-2.5 px-2 bg-white/5 hover:bg-orange-600 focus:bg-orange-600 text-zinc-300 hover:text-white text-[10px] font-black uppercase rounded-xl border border-orange-500/20 outline-none transition-all cursor-pointer text-center"
                              >
                                <option value="" className="text-black text-center">تجهيز سلاح</option>
                                <option value="m_wep_1" className="text-black">MK18 CQBR</option>
                                <option value="m_wep_2" className="text-black">Sniper M24</option>
                                <option value="m_wep_3" className="text-black">قاذف RPG</option>
                              </select>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-2 mt-2">
                          <button
                            onClick={() => handleFireSoldier(soldier.id)}
                            disabled={isProcessing}
                            className="w-full py-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white text-[10px] font-black uppercase rounded-xl border border-red-500/20 flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                            title="طرد الجندي"
                          >
                            <Trash2 size={16} />
                            طرد الجندي
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              ) : (
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead>
                        <tr className="border-b border-white/5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          <th className="p-6 font-black">الجندي</th>
                          <th className="p-6 font-black text-center">الرتبة</th>
                          <th className="p-6 text-center font-black">السلاح</th>
                          <th className="p-6 text-center font-black">الصنف</th>
                          <th className="p-6 text-center font-black">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(militia?.soldiers || [])
                          .filter(s => activeSoldiersTab === 'special' ? s.isSpecialForces : !s.isSpecialForces)
                          .slice(0, soldiersDisplayCount)
                          .map((soldier) => (
                          <tr key={soldier.id} className="group hover:bg-white/5 transition-colors">
                            <td className="p-6">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10">
                                  <img src={soldier.image} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                  <p className="font-black text-white">{soldier.name}</p>
                                  <p className="text-[10px] text-zinc-500">LVL {soldier.level}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-6 text-center">
                              <span className="text-xs font-bold text-zinc-300">
                                {MILITIA_RANKS.find(r => r.id === soldier.rank)?.name || soldier.rank || 'جندي'}
                              </span>
                            </td>
                            <td className="p-6 text-center">
                              <span className="text-xs font-bold text-blue-400">
                                {soldier.hasWeapon ? (
                                  soldier.equipped?.weapon === 'sf_mk18' || soldier.equipped?.weapon === 'm_wep_1' || soldier.equipped?.weapon === 'mk18_cqbr' ? 'MK18' : 
                                  soldier.equipped?.weapon === 'sf_m24' || soldier.equipped?.weapon === 'm_wep_2' || soldier.equipped?.weapon === 'sniper_m24' ? 'M24' : 
                                  soldier.equipped?.weapon === 'sf_rpg' || soldier.equipped?.weapon === 'm_wep_3' || soldier.equipped?.weapon === 'rpg_launcher' ? 'RPG-7' : 'سلاح ميداني'
                                ) : 'أعزل'}
                              </span>
                            </td>
                            <td className="p-6 text-center">
                              <span className={clsx(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                soldier.isSpecialForces ? "bg-yellow-500/20 border-yellow-500/30 text-yellow-500" : "bg-zinc-500/20 border-zinc-500/30 text-zinc-400"
                              )}>
                                {soldier.isSpecialForces ? 'قوات خاصة' : 'عادي'}
                              </span>
                            </td>
                            <td className="p-6">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleFireSoldier(soldier.id)}
                                  disabled={isProcessing}
                                  className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all border border-red-500/20"
                                  title="طرد"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {(militia?.soldiers || []).filter(s => activeSoldiersTab === 'special' ? s.isSpecialForces : !s.isSpecialForces).length > soldiersDisplayCount && (
                <div className="flex justify-center mt-12">
                  <button
                    onClick={() => setSoldiersDisplayCount(prev => prev + 20)}
                    className="px-12 py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl border border-white/10 transition-all uppercase tracking-widest text-xs flex items-center gap-3"
                  >
                    <RefreshCw size={16} className={clsx(isProcessing && "animate-spin")} />
                    عرض المزيد من الجنود
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'training' && (
            <motion.div
              key="training"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8 relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-64 h-64 bg-red-600/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-red-600/20 transition-all"></div>
                
                <div className="relative z-10 flex items-center gap-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500/20 to-orange-500/10 rounded-2xl border border-red-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.15)] shrink-0 group-hover:scale-105 transition-transform">
                    <Target size={32} className="text-red-500 max-w-full drop-shadow-lg" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter drop-shadow-md">أكاديمية التدريب العسكري</h2>
                    <p className="text-zinc-400 font-medium mt-1 text-sm">برامج تدريبية متقدمة لتطوير كفاءة المليشيا ورفع الرتب العسكرية.</p>
                  </div>
                </div>

                <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 relative z-10">
                  <button 
                    onClick={() => setTrainingTab('courses')}
                    className={clsx(
                      "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      trainingTab === 'courses' ? "bg-red-600 text-white shadow-lg" : "hover:bg-white/5 text-zinc-400"
                    )}
                  >دورات تدريبية</button>
                  <button 
                    onClick={() => setTrainingTab('promotion')}
                    className={clsx(
                      "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      trainingTab === 'promotion' ? "bg-yellow-600 text-white shadow-lg" : "hover:bg-white/5 text-zinc-400"
                    )}
                  >ترقية الرتب</button>
                  <button 
                    onClick={() => setTrainingTab('active')}
                    className={clsx(
                      "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative",
                      trainingTab === 'active' ? "bg-blue-600 text-white shadow-lg" : "hover:bg-white/5 text-zinc-400"
                    )}
                  >
                    المهام النشطة
                    {(militia.trainingTasks?.length || 0) > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-black animate-pulse">
                        {militia.trainingTasks?.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {trainingTab === 'courses' && (() => {
                const busySoldierIds = militia.trainingTasks?.flatMap(t => t.soldierIds) || [];
                const availableSoldiers = militia.soldiers.filter(s => {
                  const isMaxedOut = s.stats.strength >= 100000 && s.stats.defense >= 100000 && s.stats.speed >= 100000 && s.stats.endurance >= 100000;
                  return !busySoldierIds.includes(s.id) && !isMaxedOut;
                });
                
                const ranksPresent = Array.from(new Set(militia.soldiers.map(s => s.rank || 'جندي')));
                const displayedMilitiaSoldiers = trainingRankFilter === 'all' ? militia.soldiers : militia.soldiers.filter(s => (s.rank || 'جندي') === trainingRankFilter);
                
                const displayedAvailableSoldiers = trainingRankFilter === 'all' ? availableSoldiers : availableSoldiers.filter(s => (s.rank || 'جندي') === trainingRankFilter);
                const allSelected = displayedAvailableSoldiers.length > 0 && displayedAvailableSoldiers.every(s => selectedTrainingSoldiers.includes(s.id));
                
                return (
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Left: Soldier Selection */}
                    <div className="xl:col-span-2 space-y-6">
                      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                          <div>
                            <h3 className="text-xl font-black text-white italic">اختيار الجنود</h3>
                            <p className="text-xs text-zinc-500 font-medium mt-1">المختار: {selectedTrainingSoldiers.length} جندي</p>
                          </div>
                          {displayedAvailableSoldiers.length > 0 && (
                            <button 
                              onClick={() => {
                                const displayedIds = displayedAvailableSoldiers.map(s => s.id);
                                if (allSelected) {
                                  setSelectedTrainingSoldiers(prev => prev.filter(id => !displayedIds.includes(id)));
                                } else {
                                  setSelectedTrainingSoldiers(prev => Array.from(new Set([...prev, ...displayedIds])));
                                }
                              }}
                              className="text-[10px] font-black text-red-500 hover:text-red-400 underline uppercase self-start sm:self-auto"
                            >
                              {allSelected ? 'إلغاء تحديد المعروض' : 'تحديد كل المعروض'}
                            </button>
                          )}
                        </div>

                        {ranksPresent.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 mb-6 p-2 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2 border-l border-white/10">تصنيف بالرتبة:</span>
                            <button
                              onClick={() => setTrainingRankFilter('all')}
                              className={clsx(
                                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all tracking-widest border",
                                trainingRankFilter === 'all' 
                                  ? "bg-red-500/20 text-red-500 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                                  : "bg-transparent text-zinc-400 border-transparent hover:bg-white/10"
                              )}
                            >
                              الكل ({militia.soldiers.length})
                            </button>
                            {ranksPresent.map(rank => {
                              const count = militia.soldiers.filter(s => (s.rank || 'جندي') === rank).length;
                              const rankDisplay = MILITIA_RANKS.find(r => r.id === rank || r.name === rank)?.name || rank;
                              return (
                                <button
                                  key={rank}
                                  onClick={() => setTrainingRankFilter(rank)}
                                  className={clsx(
                                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all tracking-widest border",
                                    trainingRankFilter === rank 
                                      ? "bg-red-500/20 text-red-500 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                                      : "bg-transparent text-zinc-400 border-transparent hover:bg-white/10"
                                  )}
                                >
                                  {rankDisplay} ({count})
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                          {displayedMilitiaSoldiers.map(soldier => {
                            const isBusy = busySoldierIds.includes(soldier.id);
                            const isMaxedOut = soldier.stats.strength >= 100000 && soldier.stats.defense >= 100000 && soldier.stats.speed >= 100000 && soldier.stats.endurance >= 100000;
                            const isUnavailable = isBusy || isMaxedOut;
                            
                            return (
                            <div 
                              key={soldier.id}
                              onClick={() => {
                                if (isUnavailable) return;
                                setSelectedTrainingSoldiers(prev => 
                                  prev.includes(soldier.id) ? prev.filter(id => id !== soldier.id) : [...prev, soldier.id]
                                )
                              }}
                              className={clsx(
                                "relative transition-all rounded-[1.5rem] overflow-hidden border",
                                isUnavailable ? "opacity-50 cursor-not-allowed grayscale" : "cursor-pointer group",
                                selectedTrainingSoldiers.includes(soldier.id) 
                                  ? "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)] bg-red-600/10" 
                                  : "border-white/5 bg-white/5 hover:border-white/20"
                              )}
                            >
                              <div className="aspect-[3/4] relative">
                                <img src={soldier.image} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                                
                                {isBusy && (
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                    <span className="bg-blue-600 border border-blue-500 px-3 py-1 rounded-full text-[10px] font-black text-white transform -rotate-12 shadow-lg">في مهمة</span>
                                  </div>
                                )}
                                {!isBusy && isMaxedOut && (
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                    <span className="bg-emerald-600 border border-emerald-500 px-3 py-1 rounded-full text-[10px] font-black text-white transform rotate-12 shadow-lg">الحد الأقصى</span>
                                  </div>
                                )}

                                {selectedTrainingSoldiers.includes(soldier.id) && !isUnavailable && (
                                  <div className="absolute top-2 right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">
                                    <CheckCircle size={14} className="text-white" />
                                  </div>
                                )}

                                <div className="absolute bottom-3 left-3 right-3 text-right">
                                  <p className="text-[10px] font-black text-white truncate drop-shadow-md">{soldier.name}</p>
                                  <p className="text-[8px] font-bold text-zinc-400 mt-0.5">LVL {soldier.level}</p>
                                </div>
                              </div>
                            </div>
                          )})}
                        </div>
                      </div>
                    </div>

                    {/* Right: Training Controls */}
                    <div className="space-y-6">
                      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 sticky top-24">
                        <h3 className="text-xl font-black text-white italic mb-8">إعداد الدورة</h3>
                        
                        <div className="space-y-6">
                          {[
                            { label: 'القوة', key: 'strength', icon: Swords, color: 'text-orange-400' },
                            { label: 'الدفاع', key: 'defense', icon: Shield, color: 'text-green-400' },
                            { label: 'السرعة', key: 'speed', icon: Zap, color: 'text-blue-400' },
                            { label: 'التحمل', key: 'endurance', icon: Heart, color: 'text-pink-400' },
                          ].map(stat => (
                            <div key={stat.key} className="space-y-3">
                              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                  <div className="flex items-center gap-2">
                                    <stat.icon size={14} className={stat.color} />
                                    <span>تطوير {stat.label}</span>
                                  </div>
                                  <div className="flex items-center bg-white/5 rounded-lg overflow-hidden border border-white/10">
                                    <span className="pl-1 pr-2 text-zinc-500">+</span>
                                    <input 
                                      type="number" 
                                      min="0" 
                                      max="100000" 
                                      value={trainingIncrements[stat.key as keyof typeof trainingIncrements]}
                                      onChange={(e) => setTrainingIncrements(prev => ({ ...prev, [stat.key]: Math.min(100000, Math.max(0, parseInt(e.target.value) || 0)) }))}
                                      className="w-16 bg-transparent text-white font-bold text-center py-1 outline-none appearance-none"
                                    />
                                  </div>
                              </div>
                              <input 
                                  type="range" 
                                  min="0" 
                                  max="100000" 
                                  value={trainingIncrements[stat.key as keyof typeof trainingIncrements]}
                                  onChange={(e) => setTrainingIncrements(prev => ({ ...prev, [stat.key]: parseInt(e.target.value) }))}
                                  className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-red-600"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="mt-8 flex bg-black/40 border border-white/10 rounded-xl overflow-hidden p-1">
                          <button
                            onClick={() => setTrainingPaymentCurrency('corruption')}
                            className={clsx(
                              "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg flex justify-center items-center gap-2",
                              trainingPaymentCurrency === 'corruption' ? "bg-red-600/20 text-red-500 border border-red-500/30" : "text-zinc-500 hover:text-white"
                            )}
                          >
                            <span className="flex items-center gap-1.5"><Landmark size={14} /> أموال فساد</span>
                          </button>
                          <button
                            onClick={() => setTrainingPaymentCurrency('gold')}
                            className={clsx(
                              "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg flex justify-center items-center gap-2",
                              trainingPaymentCurrency === 'gold' ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30" : "text-zinc-500 hover:text-white"
                            )}
                          >
                            <span className="flex items-center gap-1.5"><Coins size={14} /> إكمال فوري بذهب</span>
                          </button>
                        </div>

                        <div className="mt-6 p-6 bg-red-600/5 border border-red-500/10 rounded-2xl">
                           <div className="flex items-center justify-between mb-4">
                             <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">التكلفة الإجمالية</span>
                             <div className="flex items-center gap-2">
                               {trainingPaymentCurrency === 'corruption' ? (
                                 <>
                                  <Landmark size={14} className="text-red-500" />
                                  <span className="text-xl font-black text-white tabular-nums drop-shadow-md">
                                      {formatNumber(selectedTrainingSoldiers.length * Object.values(trainingIncrements).reduce((a, b) => a + b, 0) * 10000)}
                                  </span>
                                 </>
                               ) : (
                                 <>
                                  <Coins size={14} className="text-yellow-500" />
                                  <span className="text-xl font-black text-white tabular-nums drop-shadow-md">
                                      {formatNumber(selectedTrainingSoldiers.length * Math.max(1, Math.ceil(Object.values(trainingIncrements).reduce((a, b) => a + b, 0) / 1000)))}
                                  </span>
                                 </>
                               )}
                             </div>
                           </div>
                           <p className="text-[9px] text-zinc-500 leading-relaxed font-medium">سيتم تدريب {selectedTrainingSoldiers.length} جندي ورفع مهاراتهم بالقدر المحدد. {trainingPaymentCurrency === 'corruption' ? 'تستغرق العملية 10 دقائق.' : 'سيتم التدريب فوراً.'}</p>
                        </div>

                        <button 
                          onClick={handleStartBatchTraining}
                          disabled={isProcessing || selectedTrainingSoldiers.length === 0}
                          className={clsx(
                            "w-full mt-6 py-5 text-white font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:translate-y-0 shadow-lg",
                            trainingPaymentCurrency === 'gold' 
                              ? "bg-yellow-600 hover:bg-yellow-500 shadow-[0_0_30px_rgba(202,138,4,0.2)]"
                              : "bg-red-600 hover:bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
                          )}
                        >
                          {trainingPaymentCurrency === 'gold' ? <Zap size={20} /> : <TrendingUp size={20} />}
                          {trainingPaymentCurrency === 'gold' ? 'إكمال العملية فوراً' : 'لبدء الدورة التدريبية'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {trainingTab === 'promotion' && (() => {
                const busySoldierIds = militia.trainingTasks?.flatMap(t => t.soldierIds) || [];
                const availableSoldiers = militia.soldiers.filter(s => {
                  const currentRankIndex = MILITIA_RANKS.findIndex(r => r.name === (s.rank || 'جندي') || r.id === s.rank);
                  const isMaxedOutRank = currentRankIndex >= MILITIA_RANKS.length - 1;
                  return !busySoldierIds.includes(s.id) && !isMaxedOutRank;
                });
                
                const ranksPresent = Array.from(new Set(militia.soldiers.map(s => s.rank || 'جندي')));
                const displayedMilitiaSoldiers = promotionRankFilter === 'all' ? militia.soldiers : militia.soldiers.filter(s => (s.rank || 'جندي') === promotionRankFilter);
                
                const displayedAvailableSoldiers = promotionRankFilter === 'all' ? availableSoldiers : availableSoldiers.filter(s => (s.rank || 'جندي') === promotionRankFilter);
                const allSelected = displayedAvailableSoldiers.length > 0 && displayedAvailableSoldiers.every(s => selectedTrainingSoldiers.includes(s.id));
                
                return (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  {/* Left: Soldier Selection */}
                  <div className="xl:col-span-2 space-y-6">
                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8">
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                        <div>
                          <h3 className="text-xl font-black text-white italic">اختيار المترشحين للترقية</h3>
                          <p className="text-xs text-zinc-500 font-medium mt-1">المختار: {selectedTrainingSoldiers.length} جندي</p>
                        </div>
                        {displayedAvailableSoldiers.length > 0 && (
                          <button 
                            onClick={() => {
                              const displayedIds = displayedAvailableSoldiers.map(s => s.id);
                              if (allSelected) {
                                setSelectedTrainingSoldiers(prev => prev.filter(id => !displayedIds.includes(id)));
                              } else {
                                setSelectedTrainingSoldiers(prev => Array.from(new Set([...prev, ...displayedIds])));
                              }
                            }}
                            className="text-[10px] font-black text-yellow-500 hover:text-yellow-400 underline uppercase self-start sm:self-auto"
                          >
                            {allSelected ? 'إلغاء تحديد المعروض' : 'تحديد كل المعروض'}
                          </button>
                        )}
                      </div>

                      {ranksPresent.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mb-6 p-2 bg-white/5 rounded-xl border border-white/5">
                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2 border-l border-white/10">تصنيف بالرتبة:</span>
                          <button
                            onClick={() => setPromotionRankFilter('all')}
                            className={clsx(
                              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all tracking-widest border",
                              promotionRankFilter === 'all' 
                                ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.1)]"
                                : "bg-transparent text-zinc-400 border-transparent hover:bg-white/10"
                            )}
                          >
                            الكل ({militia.soldiers.length})
                          </button>
                          {ranksPresent.map(rank => {
                            const count = militia.soldiers.filter(s => (s.rank || 'جندي') === rank).length;
                            const rankDisplay = MILITIA_RANKS.find(r => r.id === rank || r.name === rank)?.name || rank;
                            return (
                              <button
                                key={rank}
                                onClick={() => setPromotionRankFilter(rank)}
                                className={clsx(
                                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all tracking-widest border",
                                  promotionRankFilter === rank 
                                    ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.1)]"
                                    : "bg-transparent text-zinc-400 border-transparent hover:bg-white/10"
                                )}
                              >
                                {rankDisplay} ({count})
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {displayedMilitiaSoldiers.map(soldier => {
                          const isBusy = busySoldierIds.includes(soldier.id);
                          const currentRankIndex = MILITIA_RANKS.findIndex(r => r.name === (soldier.rank || 'جندي') || r.id === soldier.rank);
                          const isMaxedOutRank = currentRankIndex >= MILITIA_RANKS.length - 1;
                          const isUnavailable = isBusy || isMaxedOutRank;

                          return (
                          <div 
                            key={soldier.id}
                            onClick={() => {
                              if (isUnavailable) return;
                              setSelectedTrainingSoldiers(prev => 
                                prev.includes(soldier.id) ? prev.filter(id => id !== soldier.id) : [...prev, soldier.id]
                              )
                            }}
                            className={clsx(
                              "relative transition-all rounded-[1.5rem] overflow-hidden border",
                              isUnavailable ? "opacity-50 cursor-not-allowed grayscale" : "cursor-pointer group",
                              selectedTrainingSoldiers.includes(soldier.id) 
                                ? "border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.2)] bg-yellow-600/10" 
                                : "border-white/5 bg-white/5 hover:border-white/20"
                            )}
                          >
                            <div className="aspect-[3/4] relative">
                              <img src={soldier.image} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                              
                              {isBusy && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                  <span className="bg-blue-600 border border-blue-500 px-3 py-1 rounded-full text-[10px] font-black text-white transform -rotate-12 shadow-lg">في مهمة</span>
                                </div>
                              )}
                              {!isBusy && isMaxedOutRank && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                  <span className="bg-emerald-600 border border-emerald-500 px-3 py-1 rounded-full text-[10px] font-black text-white transform rotate-12 shadow-lg">أعلى رتبة</span>
                                </div>
                              )}

                              {selectedTrainingSoldiers.includes(soldier.id) && !isUnavailable && (
                                <div className="absolute top-2 right-2 w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">
                                  <CheckCircle size={14} className="text-white" />
                                </div>
                              )}

                              <div className="absolute bottom-3 left-3 right-3 text-right">
                                <p className="text-[10px] font-black text-white truncate drop-shadow-md">{soldier.name}</p>
                                <p className="text-[8px] font-bold text-yellow-500 mt-0.5 uppercase">{MILITIA_RANKS.find(r => r.name === (soldier.rank || 'جندي'))?.name || soldier.rank || 'جندي'}</p>
                              </div>
                            </div>
                          </div>
                        )})}
                      </div>
                    </div>
                  </div>

                  {/* Right: Promotion Controls */}
                  <div className="space-y-6">
                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 sticky top-24">
                      <h3 className="text-xl font-black text-white italic mb-8">إعداد الترقية</h3>
                      
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">الرتبة المستهدفة</label>
                        <select 
                          value={targetPromotionRank}
                          onChange={(e) => setTargetPromotionRank(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm font-black outline-none focus:border-yellow-500 transition-all cursor-pointer appearance-none"
                        >
                          <option value="" className="text-black">اختر الرتبة</option>
                          {MILITIA_RANKS.map(rank => (
                            <option key={rank.id} value={rank.id} className="text-black">{rank.name}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2 text-[9px] text-zinc-500 font-medium bg-yellow-600/5 p-4 rounded-xl">
                          <AlertTriangle size={14} className="text-yellow-500 shrink-0" />
                          <p>الترقية ستدفع مستوى الجندي (LVL) وتزيد من جميع إحصائياته بنسبة 20%.</p>
                        </div>
                      </div>

                      {targetPromotionRank && (
                        <>
                          <div className="mt-8 flex bg-black/40 border border-white/10 rounded-xl overflow-hidden p-1">
                            <button
                              onClick={() => setPromotionPaymentCurrency('corruption')}
                              className={clsx(
                                "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg flex justify-center items-center gap-2",
                                promotionPaymentCurrency === 'corruption' ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30" : "text-zinc-500 hover:text-white"
                              )}
                            >
                              <span className="flex items-center gap-1.5"><Landmark size={14} /> أموال فساد</span>
                            </button>
                            <button
                              onClick={() => setPromotionPaymentCurrency('gold')}
                              className={clsx(
                                "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg flex justify-center items-center gap-2",
                                promotionPaymentCurrency === 'gold' ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30" : "text-zinc-500 hover:text-white"
                              )}
                            >
                              <span className="flex items-center gap-1.5"><Coins size={14} /> إكمال فوري بذهب</span>
                            </button>
                          </div>

                          <div className="mt-6 p-6 bg-yellow-600/5 border border-yellow-500/10 rounded-2xl">
                             <div className="flex items-center justify-between mb-4">
                               <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">تكلفة الترقية الكلية</span>
                               <div className="flex items-center gap-2">
                                 {promotionPaymentCurrency === 'corruption' ? (
                                   <>
                                     <Landmark size={14} className="text-yellow-500" />
                                     <span className="text-xl font-black text-white tabular-nums drop-shadow-md">
                                        {formatNumber(selectedTrainingSoldiers.length * (MILITIA_RANKS.findIndex(r => r.id === targetPromotionRank) + 1) * 500000)}
                                     </span>
                                   </>
                                 ) : (
                                   <>
                                     <Coins size={14} className="text-yellow-500" />
                                     <span className="text-xl font-black text-white tabular-nums drop-shadow-md">
                                        {formatNumber(Math.max(1, Math.ceil((selectedTrainingSoldiers.length * (MILITIA_RANKS.findIndex(r => r.id === targetPromotionRank) + 1) * 500000) / 1000000)))}
                                     </span>
                                   </>
                                 )}
                               </div>
                             </div>
                             <p className="text-[9px] text-zinc-500 font-medium">ترقية جماعية تطبق على جميع الجنود المختارين. {promotionPaymentCurrency === 'corruption' ? 'تستغرق العملية 10 دقائق.' : 'سيتم الترقية فوراً.'}</p>
                          </div>
                        </>
                      )}

                      <button 
                        onClick={handleStartBatchPromotion}
                        disabled={isProcessing || selectedTrainingSoldiers.length === 0 || !targetPromotionRank}
                        className={clsx(
                          "w-full mt-6 py-5 text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:translate-y-0 shadow-lg",
                          promotionPaymentCurrency === 'gold' 
                            ? "bg-yellow-400 hover:bg-yellow-300 shadow-[0_0_30px_rgba(250,204,21,0.3)]"
                            : "bg-yellow-600 hover:bg-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.2)]"
                        )}
                      >
                        {promotionPaymentCurrency === 'gold' ? <Zap size={20} /> : <ArrowUpCircle size={20} />}
                        {promotionPaymentCurrency === 'gold' ? 'إكمال الترقية فوراً بذهب' : 'تأكيد الترقية الجماعية'}
                      </button>
                    </div>
                  </div>
                </div>
              );
              })()}

              {trainingTab === 'active' && (
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[3rem] p-10 overflow-hidden relative">
                   <div className="flex items-center gap-4 mb-10">
                     <div className="p-3 bg-blue-600/20 rounded-2xl border border-blue-500/20">
                       <RefreshCw size={24} className="text-blue-500" />
                     </div>
                     <div>
                       <h3 className="text-3xl font-black text-white italic italic uppercase tracking-tighter">المهام الجاري تنفيذها</h3>
                       <p className="text-sm text-zinc-400">تابع تقدم برامج التدريب والترقيات في الوقت الفعلي.</p>
                     </div>
                   </div>

                   {(!militia.trainingTasks || militia.trainingTasks.length === 0) ? (
                     <div className="py-20 flex flex-col items-center justify-center text-center">
                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/5">
                           <LayoutGrid size={40} className="text-zinc-600" />
                        </div>
                        <h4 className="text-xl font-black text-zinc-500 uppercase tracking-widest italic">لا توجد مهام نشطة حالياً</h4>
                        <p className="text-zinc-600 text-sm mt-2 font-medium">ابدأ دورة تدريبية أو عملية ترقية للظهور هنا.</p>
                     </div>
                   ) : (
                     <div className="space-y-6">
                        {militia.trainingTasks.map(task => {
                          const isFinished = task.finishTime <= currentTime;
                          const percentage = Math.max(0, Math.min(100, 100 - ((task.finishTime - currentTime) / (10 * 60 * 1000) * 100)));
                          
                          return (
                            <div key={task.id} className="bg-white/5 border border-white/10 rounded-[2rem] p-8 group hover:border-blue-500/30 transition-all overflow-hidden relative">
                               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-[60px] pointer-events-none"></div>
                               
                               <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
                                 <div className="flex items-center gap-6">
                                   <div className={clsx(
                                     "w-16 h-16 rounded-2xl border flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-all rotate-3 group-hover:rotate-0",
                                     task.type === 'train' ? "bg-red-600/20 border-red-500/20 text-red-500" : "bg-yellow-600/20 border-yellow-500/20 text-yellow-500"
                                   )}>
                                     {task.type === 'train' ? <TrendingUp size={28} /> : <ArrowUpCircle size={28} />}
                                   </div>
                                   <div>
                                     <h4 className="text-xl font-black text-white italic tracking-tight">{task.type === 'train' ? 'دورة تدريب المهارات' : `ترقية إلى ${task.targetRank}`}</h4>
                                     <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">تستهدف {task.soldierIds.length} جندي</p>
                                   </div>
                                 </div>

                                 <div className="flex-1 max-w-md w-full">
                                   <div className="flex items-center justify-between mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                      <span>التقدم الميداني</span>
                                      <span className={clsx("tabular-nums", isFinished ? "text-green-500" : "text-blue-400")}>
                                        {isFinished ? 'مكتمل' : `${Math.floor(percentage)}%`}
                                      </span>
                                   </div>
                                   <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                                      <div 
                                        className={clsx("h-full rounded-full shadow-lg transition-all ease-linear", isFinished ? "bg-green-600" : "bg-blue-600")}
                                        style={{ width: `${percentage}%`, transitionDuration: '1000ms' }}
                                      ></div>
                                   </div>
                                 </div>

                                 <div className="flex items-center gap-4 shrink-0">
                                   {!isFinished ? (
                                      <>
                                        <div className="bg-black/40 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 text-center min-w-[120px]">
                                           <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">المتبقي</p>
                                           <p className="text-xl font-black text-blue-400 tabular-nums">
                                              {Math.max(0, Math.ceil((task.finishTime - currentTime) / 60000))} دقيقة
                                           </p>
                                        </div>
                                        <button 
                                          onClick={() => handleCompleteTaskInstantly(task.id)}
                                          className="h-16 px-8 bg-yellow-600 hover:bg-yellow-500 text-black font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 shadow-lg hover:shadow-[0_0_30px_rgba(234,179,8,0.3)] transition-all transform hover:-translate-y-1"
                                        >
                                          <Coins size={18} />
                                          إكمال فوري (50)
                                        </button>
                                      </>
                                   ) : (
                                      <div className="bg-green-600/20 text-green-500 border border-green-500/20 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest animate-pulse">
                                         جاري دمج البيانات...
                                      </div>
                                   )}
                                 </div>
                               </div>
                            </div>
                          )
                        })}
                     </div>
                   )}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'hospital' && (
            <motion.div
              key="hospital"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8 relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-64 h-64 bg-green-600/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-green-600/20 transition-all"></div>
                
                <div className="relative z-10 flex items-center gap-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/10 rounded-2xl border border-green-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.15)] shrink-0 group-hover:scale-105 transition-transform">
                    <Heart size={32} className="text-green-500 max-w-full drop-shadow-lg" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter drop-shadow-md">مستشفى المليشيا</h2>
                    <p className="text-zinc-400 font-medium mt-1">علاج الجنود المصابين وتجهيزهم للعودة للميدان.</p>
                  </div>
                </div>

                {militia.soldiers.some(s => s.health < 100) && (
                  <button
                    onClick={handleHealAllSoldiers}
                    disabled={isProcessing || Number(militia.inventory?.logistics?.m_log_3 || 0) < Math.ceil(militia.soldiers.filter(s => s.health < 100).reduce((acc, s) => acc + (100 - (Number(s.health) || 0)), 0) / (5 + (militia.gqh?.facilities?.medicalLevel || 0)))}
                    className="relative z-10 px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-xl transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                  >
                    <Heart size={20} className="group-hover/btn:animate-ping" />
                    علاج جميع الجنود ({formatNumber(Math.ceil(militia.soldiers.filter(s => s.health < 100).reduce((acc, s) => acc + (100 - (Number(s.health) || 0)), 0) / (5 + (militia.gqh?.facilities?.medicalLevel || 0))))} قطعة دواء)
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {militia.soldiers.filter(s => s.health < 100).length === 0 ? (
                  <div className="lg:col-span-2 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-16 text-center shadow-lg relative overflow-hidden group">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-500/50 to-transparent opacity-50"></div>
                    <Heart size={48} className="text-green-500 mx-auto mb-6 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 drop-shadow-lg" />
                    <h3 className="text-2xl font-black text-white mb-2 italic tracking-tight">جاهزية تامة</h3>
                    <p className="text-zinc-400 font-medium tracking-widest uppercase">جميع الجنود في أتم الصحة والعافية</p>
                  </div>
                ) : (
                  militia.soldiers.filter(s => s.health < 100).map((soldier) => {
                    const healthNeeded = 100 - soldier.health;

                    return (
                      <div key={soldier.id} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden group hover:border-green-500/50 transition-all shadow-lg hover:shadow-[0_0_30px_rgba(34,197,94,0.15)] flex flex-col md:flex-row p-6 gap-6">
                        <div className="w-full md:w-48 h-[500px] bg-zinc-900 rounded-[1.5rem] relative overflow-hidden shrink-0 border border-white/5 group/img">
                          <img src={soldier.image} className="w-full h-full object-cover grayscale mix-blend-luminosity opacity-50 group-hover/img:scale-105 group-hover/img:grayscale-0 group-hover/img:opacity-100 transition-all duration-700" alt={soldier.name} />
                          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center group-hover/img:bg-transparent transition-colors">
                            <AlertTriangle className="text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] group-hover/img:opacity-0 transition-opacity" size={48} strokeWidth={1.5} />
                          </div>
                        </div>
                        
                        <div className="flex-1 flex flex-col w-full relative z-10 pt-2">
                          <div className="mb-4">
                            <h4 className="text-2xl font-black text-white italic tracking-tight">{soldier.name}</h4>
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex-1 h-3 bg-black/60 rounded-full overflow-hidden border border-white/10">
                                <div className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-green-500" style={{ width: `${soldier.health}%` }} />
                              </div>
                              <span className="text-sm font-black text-white tabular-nums drop-shadow-md">{Math.floor(soldier.health)}%</span>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                            <div className="flex-1 bg-white/5 rounded-xl border border-white/10 p-3 flex flex-col justify-center">
                              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <Package size={10} />
                                احتياج العلاج
                              </p>
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-black text-pink-500 tabular-nums drop-shadow-md">
                                  {Math.ceil(healthNeeded / (5 + (militia.gqh?.facilities?.medicalLevel || 0)))} قطعة دواء
                                </p>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => handleHealSoldier(soldier.id, 'instant')}
                              disabled={isProcessing || (Number(militia.inventory?.logistics?.m_log_3) || 0) < Math.ceil(healthNeeded / (5 + (militia.gqh?.facilities?.medicalLevel || 0)))}
                              className="flex-[1] py-3 bg-green-600 hover:bg-green-500 focus:bg-green-500 text-white font-black rounded-xl transition-all border border-green-500/20 hover:border-transparent flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.2)] disabled:opacity-50 disabled:cursor-not-allowed group/heal"
                            >
                              <Zap size={18} className="group-hover/heal:animate-pulse" />
                              علاج فوري
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'shop' && (
            <motion.div
              key="shop"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8 relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-64 h-64 bg-zinc-600/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-zinc-600/20 transition-all"></div>
                
                <div className="relative z-10 flex items-center gap-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-zinc-500/20 to-zinc-800/10 rounded-2xl border border-zinc-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(113,113,122,0.15)] shrink-0 group-hover:scale-105 transition-transform">
                    <ShoppingCart size={32} className="text-zinc-400 max-w-full drop-shadow-lg" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter drop-shadow-md">المتجر العسكري</h2>
                    <p className="text-zinc-400 font-medium mt-1">تجهيز المليشيا بأحدث المعدات والأسلحة والآليات.</p>
                  </div>
                </div>
                {profile?.role === 'Admin' && (
                  <button
                    onClick={() => setShowAddItemModal(true)}
                    className="relative z-10 px-6 py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] flex items-center gap-3 shrink-0"
                  >
                    <Plus size={20} />
                    إضافة قطعة جديدة
                  </button>
                )}
              </div>

              {/* Shop Category Buttons 2x2 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto w-full">
                {[
                  { id: 'weapons', name: 'الأسلحة', icon: Swords, color: 'from-red-600/20 to-orange-600/20', border: 'border-red-500/30' },
                  { id: 'armor', name: 'الدروع', icon: Shield, color: 'from-blue-600/20 to-cyan-600/20', border: 'border-blue-500/30' },
                  { id: 'vehicles', name: 'المركبات', icon: Truck, color: 'from-zinc-100/10 to-zinc-800/20', border: 'border-white/30' },
                  { id: 'logistics', name: 'الدعم اللوجستي', icon: Package, color: 'from-green-600/20 to-emerald-600/20', border: 'border-green-500/30' },
                  { id: 'aircraft', name: 'الطائرات', icon: Radio, color: 'from-purple-600/20 to-pink-600/20', border: 'border-purple-500/30' },
                  { id: 'intelligence', name: 'الاستخبارات', icon: Target, color: 'from-cyan-600/20 to-blue-600/20', border: 'border-cyan-500/30' },
                  { id: 'fortifications', name: 'التحصينات', icon: Castle, color: 'from-amber-600/20 to-yellow-600/20', border: 'border-amber-500/30' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setShopCategory(cat.id as any)}
                    className={`relative overflow-hidden group p-8 rounded-[2.5rem] border transition-all duration-500 active:scale-95 ${
                      shopCategory === cat.id 
                        ? `${cat.border} bg-black/60 scale-[1.02] shadow-[0_0_40px_rgba(255,255,255,0.05)] ring-1 ring-white/20` 
                        : 'border-white/5 bg-black/20 hover:border-white/10 hover:bg-black/30'
                    }`}
                  >
                    <div className={clsx("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br", cat.color)}></div>
                    {shopCategory === cat.id && <div className={clsx("absolute inset-0 bg-gradient-to-br opacity-100", cat.color)}></div>}
                    
                    <div className="flex flex-col items-center gap-4 relative z-10">
                      <div className={clsx(
                        "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110",
                        shopCategory === cat.id ? "bg-white text-black shadow-xl" : "bg-white/5 text-zinc-500 group-hover:text-white"
                      )}>
                        <cat.icon size={32} />
                      </div>
                      <div className="text-center">
                        <span className={`text-base font-black uppercase tracking-[0.2em] transition-all duration-300 ${shopCategory === cat.id ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                          {cat.name}
                        </span>
                        <div className={clsx(
                          "h-1 w-8 mx-auto mt-2 rounded-full transition-all duration-500",
                          shopCategory === cat.id ? "bg-white w-12" : "bg-transparent"
                        )}></div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Category Content */}
              <div className="space-y-8">
                <div className="flex items-center gap-6 bg-black/60 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-6 relative overflow-hidden group shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-transparent"></div>
                  <div className="w-16 h-16 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center shrink-0 shadow-lg relative z-10">
                    {shopCategory === 'vehicles' && <Truck size={32} className="text-zinc-400 animate-pulse" />}
                    {shopCategory === 'weapons' && <Swords size={32} className="text-red-400 animate-pulse" />}
                    {shopCategory === 'armor' && <Shield size={32} className="text-blue-400 animate-pulse" />}
                    {shopCategory === 'logistics' && <Package size={32} className="text-green-400 animate-pulse" />}
                    {shopCategory === 'aircraft' && <Radio size={32} className="text-purple-400 animate-pulse" />}
                    {shopCategory === 'intelligence' && <Target size={32} className="text-fuchsia-400 animate-pulse" />}
                    {shopCategory === 'fortifications' && <Castle size={32} className="text-amber-400 animate-pulse" />}
                  </div>
                  <div className="flex-1 relative z-10">
                    <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter drop-shadow-lg">
                      {shopCategory === 'vehicles' ? 'المركبات القتالية' : 
                       shopCategory === 'weapons' ? 'ترسانة الأسلحة' : 
                       shopCategory === 'armor' ? 'التجهيزات الدفاعية' : 
                       shopCategory === 'aircraft' ? 'الطائرات الحربية' :
                       shopCategory === 'intelligence' ? 'المعدات الاستخباراتية' :
                       shopCategory === 'fortifications' ? 'معدات التحصين' :
                       'المستلزمات اللوجستية'}
                    </h3>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">قائمة المعدات المتاحة للشراء الفوري</p>
                  </div>
                  {profile?.role === 'Admin' && (
                    <button
                      onClick={() => {
                        setNewItemData({...newItemData, category: shopCategory});
                        setShowAddItemModal(true);
                      }}
                      className="px-8 py-4 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-zinc-200 transition-all active:scale-95 shadow-xl relative z-10"
                    >
                      إضافة عنصر للمتجر
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {((dynamicShopItems as any)[shopCategory] || []).map((item: any) => (
                    <div key={item.id} className="bg-black/60 backdrop-blur-2xl border border-white/5 rounded-[3rem] overflow-hidden group hover:border-white/20 transition-all duration-500 shadow-xl flex flex-col relative">
                      {/* Premium Header Decoration */}
                      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                      
                      <div className="h-64 bg-zinc-950 relative overflow-hidden shrink-0 border-b border-white/5">
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent z-10"></div>
                        <img 
                          src={getItemImage(item)} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 p-4" 
                          referrerPolicy="no-referrer"
                          alt={item.name} 
                        />
                        
                        {/* Admin Tools Overlay */}
                        {profile?.role === 'Admin' && (
                          <div className="absolute top-4 right-4 z-30 flex gap-2 transition-all duration-300">
                            <button 
                              onClick={() => setEditingItem({ category: shopCategory, item })}
                              className="w-10 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xl flex items-center justify-center transition-all active:scale-95"
                            >
                              <Wrench size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteShopItem(shopCategory, item.id)}
                              className="w-10 h-10 bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-xl flex items-center justify-center transition-all active:scale-95"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}

                        {/* Floating Labels */}
                        <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
                           <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-2xl">
                             <p className="text-lg font-black text-white italic tracking-tight">{item.name}</p>
                           </div>
                           {shopCategory === 'logistics' && (
                             <div className="bg-zinc-100/10 backdrop-blur-md px-3 py-1 rounded-lg border border-white/5 inline-flex items-center gap-2">
                               <Package size={12} className="text-zinc-400" />
                               <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">الكمية لكل وحدة: {formatNumber(item.quantity || 1000)}</span>
                             </div>
                           )}
                        </div>
                      </div>
                      
                      <div className="p-8 flex-1 flex flex-col gap-8 relative">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/5 rounded-2xl p-4 border border-white/5 relative group/stat hover:bg-white/10 transition-all">
                            <div className="flex items-center gap-2 mb-1">
                              <Coins size={14} className="text-yellow-500" />
                              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">السعر</span>
                            </div>
                            <p className="text-xl font-black text-yellow-500 tabular-nums">{formatNumber(item.price)}</p>
                          </div>

                          {(item.power || item.defense) && (
                            <>
                              {item.power > 0 && shopCategory !== 'intelligence' && (
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/10 transition-all">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Swords size={14} className="text-red-400" />
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">القوة الهجومية</span>
                                  </div>
                                  <p className="text-xl font-black text-red-500">+{item.power}</p>
                                </div>
                              )}

                              {item.power > 0 && shopCategory === 'intelligence' && (
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/10 transition-all">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Target size={14} className="text-fuchsia-400" />
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">التجسس والاستطلاع</span>
                                  </div>
                                  <p className="text-xl font-black text-fuchsia-500">+{item.power}</p>
                                </div>
                              )}
                              
                              {item.defense > 0 && (
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/10 transition-all">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Shield size={14} className="text-blue-400" />
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">الدفاع</span>
                                  </div>
                                  <p className="text-xl font-black text-blue-400">+{item.defense}</p>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Purchase Controls */}
                        <div className="space-y-4 pt-4 border-t border-white/5 mt-auto">
                          <div className="flex items-center justify-between gap-4 bg-black/40 rounded-2xl p-2 border border-white/5">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-4">تحديد العدد</span>
                            <div className="flex items-center">
                              <input 
                                type="number" 
                                min="1"
                                value={shopQuantities[item.id] || ''}
                                onChange={(e) => setShopQuantities(prev => ({ ...prev, [item.id]: parseInt(e.target.value) || 0 }))}
                                placeholder="1"
                                className="w-20 bg-white/5 border border-white/10 rounded-xl px-2 py-3 text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all font-black text-center"
                              />
                              <div className="flex flex-col gap-1 px-2">
                                 <button onClick={() => setShopQuantities(prev => ({...prev, [item.id]: (prev[item.id] || 0) + 1}))} className="p-1 hover:text-white text-zinc-600 transition-colors"><ChevronUp size={16} /></button>
                                 <button onClick={() => setShopQuantities(prev => ({...prev, [item.id]: Math.max(0, (prev[item.id] || 0) - 1)}))} className="p-1 hover:text-white text-zinc-600 transition-colors"><ChevronDown size={16} /></button>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleBuyItem(shopCategory, item)}
                            disabled={isProcessing}
                            className="w-full py-5 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white text-base font-black uppercase rounded-2xl transition-all shadow-xl hover:shadow-red-600/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 group/buy"
                          >
                            <ShoppingCart size={22} className="group-hover/buy:animate-bounce" />
                            إتمام عملية الشراء ( {formatNumber(item.price * (shopQuantities[item.id] || 1))} )
                          </button>
                        </div>
                      </div>

                      {/* Hover Glow Effect */}
                      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-red-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'maintenance' && (
            <motion.div
              key="maintenance"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">صيانة المركبات</h2>
                  <p className="text-zinc-400 font-medium">إصلاح وتطوير آليات المليشيا لضمان جاهزيتها القتالية.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {militia.vehicles.map((vehicle) => {
                  const item = dynamicShopItems.vehicles.find(v => v.id === vehicle.itemId);
                  return (
                    <div key={vehicle.id} className="bg-transparent backdrop-blur-sm border border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center text-center gap-8 group">
                      <div className="w-full h-80 bg-transparent overflow-hidden shrink-0 rounded-[1.5rem]">
                        <img src={getItemImage(item)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item?.name} />
                      </div>
                      
                      <div className="w-full space-y-6">
                        <div>
                          <h4 className="text-2xl font-black text-white italic mb-2">{item?.name}</h4>
                          <div className="flex gap-2 justify-center">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-transparent px-3 py-1 rounded-full">ID: {vehicle.id}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-right">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">الحالة الميكانيكية</span>
                            <span className="text-sm font-black text-white tabular-nums">{vehicle.health}%</span>
                          </div>
                          <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                            <div 
                              className={clsx(
                                "h-full transition-all duration-500",
                                vehicle.health > 70 ? "bg-green-500" : vehicle.health > 30 ? "bg-yellow-500" : "bg-red-500"
                              )} 
                              style={{ width: `${vehicle.health}%` }} 
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            onClick={() => handleRepairVehicle(vehicle.id)}
                            disabled={isProcessing || vehicle.health >= 100}
                            className="py-4 bg-transparent hover:bg-blue-600 text-white font-black rounded-2xl transition-all border border-white/5 hover:border-blue-500/50 flex items-center justify-center gap-3 disabled:opacity-50"
                          >
                            <Wrench size={18} />
                            إجراء صيانة ({formatNumber(50000)} مال)
                          </button>

                          <button
                            onClick={() => handleSellVehicle(vehicle.id)}
                            disabled={isProcessing}
                            className="py-4 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white font-black rounded-2xl transition-all border border-red-500/20 flex items-center justify-center gap-3"
                          >
                            <DollarSign size={18} />
                            بيع المركبة ({formatNumber((item?.price || 0) * 0.5)} مال)
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'bank' && (
            <motion.div
              key="bank"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">بنك المليشيا</h2>
                <p className="text-zinc-400 font-medium">إدارة وتبييض أموال الفساد الناتجة عن العمليات الميدانية.</p>
              </div>

              <div className="bg-transparent backdrop-blur-sm border border-white/10 rounded-[3rem] p-10 space-y-10">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-transparent border border-white/5 rounded-[2rem] p-6 text-center">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">أموال الفساد</p>
                    <p className="text-3xl font-black text-orange-500 tabular-nums">{formatNumber(militia.resources.corruptionMoney)}</p>
                  </div>
                  <div className="bg-transparent border border-white/5 rounded-[2rem] p-6 text-center">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">رصيد البنك</p>
                    <p className="text-3xl font-black text-green-500 tabular-nums">{formatNumber(profile.bankBalance || 0)}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-xl font-black text-white italic uppercase text-center">تحويل الذهب إلى أموال فساد</h4>
                  <div className="p-6 bg-black/40 rounded-[2rem] border border-white/5 space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 text-xs font-black uppercase tracking-widest">رصيد الذهب الحالي</span>
                      <span className="text-amber-500 font-black text-xl">{formatNumber(profile.gold || 0)}</span>
                    </div>
                    
                    <div className="relative">
                      <input 
                        type="number" 
                        value={goldAmount}
                        onChange={(e) => setGoldAmount(e.target.value)}
                        placeholder="كمية الذهب للتحويل..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-amber-600 transition-colors font-bold"
                      />
                    </div>
                    
                    <button 
                      onClick={async () => {
                        const val = parseInt(goldAmount);
                        if (isNaN(val) || val <= 0) {
                          toast.error('كمية غير صالحة');
                          return;
                        }
                        await convertGoldToCorruptionMoney(val);
                        setGoldAmount('');
                      }}
                      disabled={isProcessing || !goldAmount}
                      className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-900 disabled:text-zinc-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(217,119,6,0.2)]"
                    >
                      تأكيد التحويل (1 ذهب = 100,000 أموال فساد)
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-xl font-black text-white italic uppercase text-center">تحويل الأموال القذرة إلى أموال فساد</h4>
                  <div className="p-6 bg-black/40 rounded-[2rem] border border-white/5 space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 text-xs font-black uppercase tracking-widest">رصيد الأموال القذرة</span>
                      <span className="text-red-500 font-black text-xl">{formatMoney(profile.dirtyMoney || 0)}</span>
                    </div>
                    
                    <div className="relative">
                      <input 
                        type="number" 
                        value={dirtyMoneyToCorruptionAmount}
                        onChange={(e) => setDirtyMoneyToCorruptionAmount(e.target.value)}
                        placeholder="كمية الأموال القذرة للتحويل..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-red-600 transition-colors font-bold"
                      />
                    </div>
                    
                    <button 
                      onClick={async () => {
                        const val = parseInt(dirtyMoneyToCorruptionAmount);
                        if (isNaN(val) || val <= 0) {
                          toast.error('كمية غير صالحة');
                          return;
                        }
                        if ((profile.dirtyMoney || 0) < val) {
                          toast.error('لا تملك هذا المبلغ من الأموال القذرة');
                          return;
                        }
                        await handleLaunderDirtyMoney(val);
                        setDirtyMoneyToCorruptionAmount('');
                      }}
                      disabled={isProcessing || !dirtyMoneyToCorruptionAmount}
                      className="w-full bg-red-600 hover:bg-red-500 disabled:bg-zinc-900 disabled:text-zinc-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                    >
                      تأكيد التحويل (الرسوم: 10%)
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-xl font-black text-white italic uppercase text-center">غسيل أموال الفساد</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {[100000, 500000, 1000000, 5000000].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => handleLaunderMoney(amount)}
                        disabled={isProcessing || militia.resources.corruptionMoney < amount}
                        className="py-6 bg-transparent hover:bg-orange-600/20 border border-white/5 hover:border-orange-500/50 rounded-3xl transition-all group disabled:opacity-50"
                      >
                        <p className="text-xs font-black text-zinc-500 group-hover:text-orange-500 uppercase tracking-widest mb-1">غسيل</p>
                        <p className="text-xl font-black text-white tabular-nums">{formatNumber(amount)}</p>
                        <p className="text-[10px] font-bold text-zinc-600 mt-2 italic">العمولة: 20%</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-orange-500/5 border border-orange-500/10 rounded-3xl flex items-start gap-4">
                  <AlertTriangle className="text-orange-500 shrink-0" size={24} />
                  <p className="text-sm text-orange-200/70 leading-relaxed font-medium">
                    عملية غسيل الأموال تحول أموال الفساد إلى رصيد بنكي نظيف يمكن استخدامه في كافة مرافق اللعبة، ولكن يتم خصم عمولة 20% لتغطية تكاليف التبييض.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-8">
              <AnimatePresence mode="wait">
                {!selectedResourceType ? (
                  <motion.div
                    key="resource-list"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-4 md:px-0">
                      <div>
                        <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3"><Landmark className="text-blue-500" /> السيطرة على الموارد</h2>
                        <p className="text-zinc-400 font-bold mt-2 text-[10px] tracking-widest uppercase">فرض النفوذ على المنشآت الحيوية لتأمين تدفق مستمر للموارد</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 md:px-0">
                      {[
                        { 
                          id: 'oilFields', 
                          title: 'حقول النفط', 
                          description: 'السيطرة على آبار النفط الخام وتصديرها بشكل غير قانوني.',
                          income: '500,000 أموال فساد + 10 ذهب',
                          icon: Fuel,
                          color: 'amber'
                        },
                        { 
                          id: 'ports', 
                          title: 'الموانئ البحرية', 
                          description: 'التحكم في حركة الملاحة وفرض رسوم حماية على السفن التجارية.',
                          income: '750,000 أموال فساد + 15 ذهب',
                          icon: Landmark,
                          color: 'blue'
                        },
                        { 
                          id: 'extortion', 
                          title: 'عمليات الابتزاز', 
                          description: 'فرض إتاوات على الشركات والمصانع الكبرى في المنطقة.',
                          income: '300,000 أموال فساد + 5 ذهب',
                          icon: AlertTriangle,
                          color: 'red'
                        },
                      ].map((res) => (
                        <div key={res.id} className="bg-black/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-6 sm:p-8 flex flex-col group hover:border-white/10 transition-all shadow-xl hover:-translate-y-1 hover:shadow-2xl relative overflow-hidden">
                          <div className={`absolute inset-0 bg-gradient-to-br from-${res.color}-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />
                          
                          <div className={`w-16 h-16 bg-${res.color}-500/10 rounded-2xl flex items-center justify-center mb-6 border border-${res.color}-500/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-[0_0_20px_rgba(255,255,255,0.02)]`}>
                            <res.icon size={32} className={`text-${res.color}-500`} />
                          </div>
                          
                          <div className="flex-1 space-y-5 relative z-10">
                            <div>
                               <h4 className="text-xl sm:text-2xl font-black text-white italic tracking-tighter mb-2 group-hover:text-blue-400 transition-colors uppercase">{res.title}</h4>
                               <p className="text-zinc-500 text-[10px] leading-relaxed font-bold tracking-widest">{res.description}</p>
                            </div>
                            
                            <div className="bg-white/5 border border-white/5 rounded-[1.5rem] p-4 flex flex-col gap-1 shadow-inner">
                              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Gem size={10} /> العوائد المتوقعة</p>
                              <p className="text-xs font-black text-white">{res.income}</p>
                            </div>

                            <div className="pt-2 flex flex-col gap-4">
                              <div className="flex justify-between items-center bg-black/40 p-4 rounded-[1.5rem] border border-white/5">
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">مستوى السيطرة</span>
                                <span className={`text-lg font-black text-${res.color}-500 tabular-nums drop-shadow-[0_0_10px_currentColor]`}>{militia.controlledResources[res.id as keyof Militia['controlledResources']] || 0}</span>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedResourceType(res.id as any);
                                  setResourceAttackUnits({ squads: 0, aircraft: 0, intel: 0 });
                                }}
                                disabled={isProcessing}
                                className={`w-full py-4 bg-${res.color}-600 hover:bg-${res.color}-500 text-white font-black rounded-2xl transition-all shadow-[0_0_20px_rgba(var(--${res.color}-500-rgb),0.3)] text-[11px] uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50`}
                              >
                                تجهيز قوات السيطرة <Swords size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="unit-selection"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="w-full h-full md:h-auto md:max-w-2xl mx-auto bg-zinc-950/95 md:bg-black/60 shadow-none md:shadow-2xl rounded-none md:rounded-[3rem] border-0 md:border md:border-white/10 overflow-x-hidden overflow-y-auto backdrop-blur-3xl fixed inset-0 md:relative z-50 md:z-auto"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-red-900/10 to-transparent pointer-events-none" />
                    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 relative z-10 min-h-full flex flex-col pt-16 md:pt-8">
                      <div className="flex items-center justify-between gap-4 bg-white/5 -m-4 sm:-m-8 p-4 sm:p-8 mb-2 sm:mb-4 border-b border-white/5 backdrop-blur-md sticky top-0 z-20">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-red-500 to-orange-400 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.3)] shrink-0">
                            <Swords className="text-white outline-none" size={24} />
                          </div>
                          <div>
                            <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter">تجهيز الهجوم</h3>
                            <p className="text-zinc-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-0.5 sm:mt-1 flex items-center gap-1.5">
                              <Target size={12} className="text-red-500" />
                              الهدف: {selectedResourceType === 'oilFields' ? 'حقول النفط' : selectedResourceType === 'ports' ? 'الموانئ البحرية' : 'عمليات الابتزاز'}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setSelectedResourceType(null)}
                          className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white rounded-xl sm:rounded-2xl transition-all border border-white/5 shadow-inner shrink-0"
                        >
                          <ChevronLeft className="hidden sm:block" size={24} />
                          <X className="block sm:hidden" size={20} />
                        </button>
                      </div>

                      <div className="space-y-3 sm:space-y-4 pt-2 flex-1">
                        {[
                          { 
                            id: 'squads', 
                            label: 'الفرق الميدانية', 
                            icon: Users, 
                            color: 'blue', 
                            available: (militia.squads?.length || 0)
                          },
                          { 
                            id: 'aircraft', 
                            label: 'سلاح الجو', 
                            icon: Plane, 
                            color: 'purple', 
                            available: Object.values(militia.inventory?.aircraft || {}).reduce((acc: number, v: any) => acc + (Number(v) || 0), 0)
                          },
                          { 
                            id: 'intel', 
                            label: 'وحدات التجسس', 
                            icon: Eye, 
                            color: 'fuchsia', 
                            available: Object.values(militia.inventory?.intelligence || {}).reduce((acc: number, v: any) => acc + (Number(v) || 0), 0)
                          }
                        ].map((unit) => (
                          <div key={unit.id} className="bg-black/40 border border-white/5 rounded-[2rem] p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 shadow-inner">
                            <div className="flex items-center gap-4 flex-1">
                               <div className={`w-12 h-12 bg-${unit.color}-500/10 rounded-[1.2rem] flex items-center justify-center border border-${unit.color}-500/20 shadow-[0_0_15px_rgba(var(--${unit.color}-500-rgb),0.15)]`}>
                                 <unit.icon size={20} className={`text-${unit.color}-500`} />
                               </div>
                               <div>
                                 <p className="text-sm font-black text-white uppercase tracking-wider">{unit.label}</p>
                                 <p className="text-[10px] text-zinc-500 font-bold flex items-center gap-1 mt-1"><CheckCircle size={10} className="text-emerald-500"/> متاح: {unit.available} وحدات</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-3 justify-center sm:justify-end bg-white/5 p-2 rounded-2xl border border-white/5">
                              <button 
                                onClick={() => setResourceAttackUnits(prev => ({ ...prev, [unit.id]: Math.max(0, (prev as any)[unit.id] - 1) }))}
                                className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-red-500/20 active:scale-95 transition-all"
                              >
                                <ChevronDown size={18} />
                              </button>
                              <input 
                                type="number"
                                min={0}
                                max={unit.available}
                                value={(resourceAttackUnits as any)[unit.id]}
                                onChange={(e) => setResourceAttackUnits(prev => ({ ...prev, [unit.id]: Math.min(unit.available, Math.max(0, parseInt(e.target.value) || 0)) }))}
                                className="w-16 bg-transparent py-2 text-white text-center font-black outline-none text-lg tabular-nums"
                              />
                              <button 
                                onClick={() => setResourceAttackUnits(prev => ({ ...prev, [unit.id]: Math.min(unit.available, (prev as any)[unit.id] + 1) }))}
                                className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-emerald-500/20 active:scale-95 transition-all"
                              >
                                <ChevronUp size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="bg-red-900/10 border border-red-500/20 rounded-[2rem] p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/30">
                           <AlertTriangle className="text-red-500" size={18} />
                        </div>
                        <div className="w-full text-center sm:text-right">
                          <p className="text-[11px] text-red-200/90 font-black uppercase tracking-widest mb-3">تكلفة وتجهيزات العملية (إلزامي):</p>
                          <div className="flex flex-wrap justify-center sm:justify-start gap-4">
                            <div className="flex items-center gap-2 bg-black/40 px-4 py-2.5 rounded-xl border border-white/5">
                              <Zap size={14} className="text-yellow-500" />
                              <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">ذخيرة:</span>
                              <span className="font-black text-white tabular-nums">{(resourceAttackUnits.squads * 50) + (resourceAttackUnits.aircraft * 200)}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-black/40 px-4 py-2.5 rounded-xl border border-white/5">
                              <Fuel size={14} className="text-purple-500" />
                              <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">وقود:</span>
                              <span className="font-black text-white tabular-nums">{(resourceAttackUnits.squads * 20) + (resourceAttackUnits.aircraft * 500)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <button
                          onClick={() => setSelectedResourceType(null)}
                          className="w-full sm:w-1/3 py-4 sm:py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-black rounded-2xl transition-all text-xs uppercase tracking-widest active:scale-95"
                        >
                          إلغاء التجهيز
                        </button>
                        <button
                          onClick={() => handleCaptureResource(selectedResourceType, resourceAttackUnits)}
                          disabled={isProcessing || (resourceAttackUnits.squads === 0 && resourceAttackUnits.aircraft === 0)}
                          className="w-full sm:w-2/3 py-4 sm:py-5 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl transition-all shadow-[0_0_30px_rgba(239,68,68,0.3)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale text-[13px] uppercase tracking-[0.2em] relative overflow-hidden group/attack active:scale-95"
                        >
                          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/attack:translate-y-0 transition-transform duration-300 ease-out" />
                          <span className="relative z-10">{isProcessing ? 'جاري التنفيذ...' : 'شن الغارة والسيطرة'}</span>
                          {!isProcessing && <Swords size={18} className="relative z-10 group-hover/attack:rotate-12 transition-transform" />}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {activeTab === 'inventory' && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-black/40 backdrop-blur-3xl border border-white/5 rounded-[3rem] p-10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 to-transparent pointer-events-none"></div>
                <div className="relative z-10 flex items-center gap-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-900 rounded-[2rem] flex items-center justify-center shadow-[0_0_50px_rgba(220,38,38,0.2)] border border-white/10">
                    <Package size={40} className="text-white drop-shadow-2xl" />
                  </div>
                  <div>
                    <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none mb-2">المخزن المتطور</h2>
                    <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.2em]">إدارة عتاد المليشيا والقدرات اللوجستية</p>
                  </div>
                </div>

                <div className="relative z-10 flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10">
                  <button
                    onClick={() => setInventoryViewMode('grid')}
                    className={clsx(
                      "p-3 rounded-xl transition-all",
                      inventoryViewMode === 'grid' ? "bg-red-600 text-white shadow-lg" : "text-zinc-500 hover:text-white"
                    )}
                  >
                    <LayoutGrid size={20} />
                  </button>
                  <button
                    onClick={() => setInventoryViewMode('list')}
                    className={clsx(
                      "p-3 rounded-xl transition-all",
                      inventoryViewMode === 'list' ? "bg-red-600 text-white shadow-lg" : "text-zinc-500 hover:text-white"
                    )}
                  >
                    <List size={20} />
                  </button>
                </div>
              </div>

              {/* Advanced Stats Section - Detailed Resource Inventory */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { label: 'مخزون الأسلحة', val: Object.values(militia?.inventory?.weapons || {}).reduce((acc, v) => acc + (v as number), 0), icon: Swords, color: 'text-red-500' },
                  { label: 'مخزون الدروع', val: Object.values(militia?.inventory?.armor || {}).reduce((acc, v) => acc + (v as number), 0), icon: Shield, color: 'text-blue-500' },
                  { label: 'مخزون المركبات', val: Number(militia?.vehicles?.length || 0) + Number(Object.values((militia?.inventory as any)?.vehicles || {}).reduce((acc: number, v: any) => acc + (Number(v) || 0), 0)), icon: Truck, color: 'text-orange-500' },
                  { label: 'مخزون الطائرات', val: Object.values(militia?.inventory?.aircraft || {}).reduce((acc, v) => acc + (Number(v) || 0), 0), icon: Radio, color: 'text-purple-500' },
                  { label: 'معدات استخبارات', val: Object.values(militia?.inventory?.intelligence || {}).reduce((acc, v) => acc + (Number(v) || 0), 0), icon: Target, color: 'text-fuchsia-500' },
                  { label: 'مخزون تحصينات', val: Object.values(militia?.inventory?.fortifications || {}).reduce((acc, v) => acc + (Number(v) || 0), 0), icon: Castle, color: 'text-amber-500' },
                  { label: 'مخزون الذخيرة', val: militia?.resources?.ammo || 0, icon: Zap, color: 'text-yellow-500' },
                  { label: 'مخزون الوقود', val: militia?.resources?.fuel || 0, icon: Fuel, color: 'text-purple-500' },
                  { label: 'مخزون الماء', val: militia?.resources?.water || 0, icon: Droplets, color: 'text-cyan-500' },
                  { label: 'مخزون الطعام', val: militia?.resources?.food || 0, icon: Utensils, color: 'text-emerald-500' },
                  { label: 'مخزون الأدوية', val: militia?.resources?.medicine || 0, icon: Heart, color: 'text-pink-500' },
                  { label: 'مركز الاتصالات', val: militia?.inventory?.logistics?.m_log_2 || 0, icon: Radio, color: 'text-indigo-500' }
                ].map((stat, i) => (
                  <div key={i} className="bg-black/40 backdrop-blur-2xl border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 group hover:border-white/10 transition-all text-center">
                    <div className={clsx("p-3 rounded-xl bg-white/5 mb-1", stat.color)}>
                      <stat.icon size={20} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className="text-sm font-black text-white italic truncate w-full">{formatNumber(stat.val)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Category Navigation - Modern Single Bar */}
              <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-2 rounded-[2rem] flex flex-wrap gap-2 lg:inline-flex justify-center">
                {[
                  { id: 'weapons', label: 'الأسلحة', icon: Swords },
                  { id: 'armor', label: 'الدروع', icon: Shield },
                  { id: 'vehicles', label: 'المركبات', icon: Truck },
                  { id: 'logistics', label: 'الدعم اللوجيستي', icon: Fuel },
                  { id: 'aircraft', label: 'الطائرات', icon: Radio },
                  { id: 'intelligence', label: 'الاستخبارات', icon: Target },
                  { id: 'fortifications', label: 'التحصينات', icon: Castle }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setInventoryTab(cat.id as any)}
                    className={clsx(
                      "px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest italic flex items-center gap-3 transition-all",
                      inventoryTab === cat.id 
                        ? "bg-gradient-to-r from-red-600 to-red-800 text-white shadow-[0_0_30px_rgba(220,38,38,0.3)] scale-105 z-10" 
                        : "text-zinc-500 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <cat.icon size={16} />
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Items Display Area */}
              <motion.div
                key={inventoryTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={clsx(
                  inventoryViewMode === 'grid' 
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8" 
                    : "flex flex-col gap-4"
                )}
              >
                {(() => {
                  const inventory = (militia?.inventory as any) || { weapons: {}, armor: {}, logistics: {}, clothing: {}, equipment: {}, vehicles: {}, aircraft: {}, intelligence: {}, fortifications: {} };
                  let itemsList: { id: string, count: number, isVehicleInstance?: boolean, vehicleData?: MilitiaVehicle }[] = [];
                  
                  if (inventoryTab === 'vehicles') {
                    // Collect individual vehicle instances
                    (militia?.vehicles || []).forEach(v => {
                      itemsList.push({ id: v.itemId, count: 1, isVehicleInstance: true, vehicleData: v });
                    });
                    // Also collect quantity entries in inventory if any
                    const invVehicles = inventory.vehicles || {};
                    Object.entries(invVehicles).forEach(([itemId, count]) => {
                      if ((count as number) > 0) itemsList.push({ id: itemId, count: count as number });
                    });
                  } else {
                    const categoryInventory: any = { ...(inventory[inventoryTab] || {}) };
                    
                    if (inventoryTab === 'logistics') {
                        const resMap: Record<string, string> = { 'ammo': 'm_log_4', 'fuel': 'm_log_5', 'food': 'm_log_6', 'water': 'm_log_7', 'medicine': 'm_log_3' };
                        Object.entries(resMap).forEach(([resKey, itemId]) => {
                            const val = Number((militia?.resources as any)?.[resKey] || 0);
                            const inventoryVal = Number((militia?.inventory?.logistics as any)?.[itemId] || 0);
                            // Show whichever is higher to avoid invisibility due to sync issues
                            categoryInventory[itemId] = Math.max(val, inventoryVal);
                        });
                    }

                    Object.entries(categoryInventory).forEach(([itemId, count]) => {
                      if ((count as number) > 0) itemsList.push({ id: itemId, count: Number(count) });
                    });
                  }

                  if (itemsList.length === 0) {
                    return (
                      <div className="col-span-full flex flex-col items-center justify-center p-12 lg:p-24 bg-black/40 backdrop-blur-md rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-t from-red-900/10 to-transparent"></div>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: "spring", stiffness: 200, damping: 20 }}
                          className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-8 relative z-10 shadow-2xl"
                        >
                          <Package size={64} className="text-zinc-600 group-hover:scale-110 transition-transform duration-500" />
                        </motion.div>
                        <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-4 relative z-10">المخزن متاح للاستلام</h3>
                        <p className="text-zinc-400 font-bold max-w-sm mx-auto leading-relaxed relative z-10">لم يتم العثور على أي عتاد في هذا القسم. توجه لمركز التموين الرئيسي لتأمين احتياجات المليشيا.</p>
                      </div>
                    );
                  }

                  return itemsList.map((itemObj, idx) => {
                    const { id: itemId, count, isVehicleInstance, vehicleData } = itemObj;
                    let itemData: any = null;
                    // Search in dynamic shop items first
                    for (const cat of Object.keys(dynamicShopItems)) {
                      itemData = (dynamicShopItems as any)[cat].find((i: any) => i.id === itemId);
                      if (itemData) break;
                    }
                    // Fallback to static SHOP_ITEMS if not found in dynamic
                    if (!itemData) {
                      for (const cat of Object.keys(SHOP_ITEMS)) {
                        itemData = (SHOP_ITEMS as any)[cat].find((i: any) => i.id === itemId);
                        if (itemData) break;
                      }
                    }

                    const displayName = itemData?.name || `عنصر ${itemId}`;
                    const displayImage = itemData ? getItemImage(itemData) : 'https://up6.cc/2026/04/177619251865033.png';
                    
                    const fullBoxQuantity = (inventoryTab === 'logistics' && !['m_log_2'].includes(itemId)) ? (itemData?.quantity || 1000) : 1;
                    let displaySellPrice = itemData?.price || 0;
                    if (inventoryTab === 'logistics' && !['m_log_2'].includes(itemId) && count < fullBoxQuantity) {
                      displaySellPrice = Math.floor(displaySellPrice * (count / fullBoxQuantity));
                    }

                    if (inventoryViewMode === 'grid') {
                      return (
                        <div key={`${inventoryTab}-${itemId}-${idx}`} className="bg-black/60 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] overflow-hidden group hover:border-red-600/30 transition-all flex flex-col h-full shadow-2xl relative">
                           {/* Quick Stats Overlays */}
                           <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                             <div className="px-3 py-1 bg-red-600 text-white text-[10px] font-black italic rounded-lg shadow-lg uppercase">
                               {inventoryTab === 'weapons' ? 'سلاح' : 
                                inventoryTab === 'armor' ? 'درع' : 
                                inventoryTab === 'vehicles' ? 'مركبة' : 
                                inventoryTab === 'aircraft' ? 'طائرة' :
                                inventoryTab === 'intelligence' ? 'استخبارات' :
                                inventoryTab === 'fortifications' ? 'تحصين' :
                                'دعم'}
                             </div>
                           </div>

                           {/* Admin Force Delete Overlay */}
                           {profile?.role === 'Admin' && inventoryTab === 'logistics' && (
                             <div className="absolute top-4 right-4 z-20">
                               <button 
                                 onClick={() => handleForceDeleteLogisticsItem(itemId, militia?.id || '')}
                                 className="px-3 py-1 bg-red-800/80 hover:bg-red-600 border border-red-500/50 text-white text-[10px] font-black italic rounded-lg shadow-lg uppercase transition-all flex items-center gap-1"
                                 title="حذف هذا العنصر فوراً (للمسؤولين فقط)"
                               >
                                 <Trash2 size={12} />
                                 حذف إجباري
                               </button>
                             </div>
                           )}
                           
                           <div className="h-64 relative overflow-hidden bg-black/40">
                             <img src={displayImage} className="w-full h-full object-contain p-6 group-hover:scale-110 transition-transform duration-700" alt={displayName} />
                             <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                           </div>

                           <div className="p-8 flex-1 flex flex-col gap-6">
                             <div>
                               <h4 className="text-xl font-black text-white italic leading-tight mb-2">{displayName}</h4>
                               <div className="flex gap-2">
                                 <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-3 py-1 bg-white/5 rounded-full border border-white/5">#{itemId.slice(-6)}</span>
                               </div>
                             </div>

                             <div className="grid grid-cols-2 gap-4">
                               <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                                 <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">العدد</p>
                                 <p className="text-lg font-black text-red-500 italic">
                                   {inventoryTab === 'logistics' && !['m_log_2'].includes(itemId) 
                                     ? Math.floor(count / (itemData?.quantity || 1000)) 
                                     : count}
                                 </p>
                               </div>
                               
                               {inventoryTab === 'logistics' && (
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">الكمية</p>
                                  <p className="text-lg font-black text-white italic">{formatNumber(count)}</p>
                                </div>
                               )}

                               {(inventoryTab === 'weapons' || inventoryTab === 'vehicles' || inventoryTab === 'armor' || inventoryTab === 'aircraft' || inventoryTab === 'intelligence' || inventoryTab === 'fortifications') && (
                                <div className="grid grid-cols-2 gap-4">
                                  {itemData?.power !== undefined && inventoryTab !== 'intelligence' && (
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">القوة</p>
                                      <p className="text-lg font-black text-blue-500 italic">{itemData.power}</p>
                                    </div>
                                  )}
                                  {itemData?.power !== undefined && inventoryTab === 'intelligence' && (
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center col-span-2">
                                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">استطلاع</p>
                                      <p className="text-lg font-black text-fuchsia-500 italic">{itemData.power}</p>
                                    </div>
                                  )}
                                  {itemData?.defense !== undefined && (
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">الدفاع</p>
                                      <p className="text-lg font-black text-green-500 italic">{itemData.defense}</p>
                                    </div>
                                  )}
                                </div>
                               )}
                             </div>

                             <button
                               onClick={() => handleSellItem(inventoryTab, itemId, displaySellPrice)}
                               disabled={isProcessing}
                               className="w-full py-4 bg-gradient-to-r from-zinc-800 to-zinc-900 hover:from-red-600 hover:to-red-800 text-zinc-400 hover:text-white font-black rounded-2xl transition-all border border-white/5 hover:border-red-500/50 flex items-center justify-center gap-3 mt-auto group/btn shadow-xl"
                             >
                               <Coins size={18} className="group-hover/btn:rotate-12 transition-transform" />
                               بيع ({formatNumber(displaySellPrice)})
                             </button>
                           </div>
                        </div>
                      );
                    } else {
                      // List View Implementation
                      return (
                        <div key={`${inventoryTab}-${itemId}-${idx}`} className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-8 group hover:border-red-600/20 transition-all">
                          <div className="w-32 h-32 bg-white/5 rounded-2xl overflow-hidden shrink-0 border border-white/10 p-2">
                             <img src={displayImage} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                          </div>
                          
                          <div className="flex-1 text-center md:text-right space-y-1">
                             <h4 className="text-2xl font-black text-white italic">{displayName}</h4>
                             <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-3">
                                <div className="flex items-center gap-2 text-zinc-400 font-bold uppercase text-[10px]">
                                  <Package size={14} className="text-red-500" />
                                  العدد: <span className="text-white italic">
                                    {inventoryTab === 'logistics' && !['m_log_2'].includes(itemId) 
                                      ? Math.floor(count / (itemData?.quantity || 1000)) 
                                      : count}
                                  </span>
                                </div>
                                {inventoryTab === 'logistics' && (
                                  <div className="flex items-center gap-2 text-zinc-400 font-bold uppercase text-[10px]">
                                    <List size={14} className="text-yellow-500" />
                                    الكمية: <span className="text-white italic">{formatNumber(count)}</span>
                                  </div>
                                )}
                                {(itemData?.power !== undefined || itemData?.defense !== undefined) && (
                                  <div className="flex items-center gap-4 text-zinc-400 font-bold uppercase text-[10px]">
                                    {itemData?.power !== undefined && inventoryTab !== 'intelligence' && (
                                      <div className="flex items-center gap-2">
                                        <Zap size={14} className="text-blue-500" />
                                        القوة: <span className="text-white italic">{itemData.power}</span>
                                      </div>
                                    )}
                                    {itemData?.power !== undefined && inventoryTab === 'intelligence' && (
                                      <div className="flex items-center gap-2">
                                        <Target size={14} className="text-fuchsia-500" />
                                        استطلاع: <span className="text-white italic">{itemData.power}</span>
                                      </div>
                                    )}
                                    {itemData?.defense !== undefined && (
                                      <div className="flex items-center gap-2">
                                        <Shield size={14} className="text-green-500" />
                                        الدفاع: <span className="text-white italic">{itemData.defense}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                             </div>
                          </div>

                          <div className="flex gap-4">
                            {profile?.role === 'Admin' && inventoryTab === 'logistics' && (
                              <button
                                onClick={() => handleForceDeleteLogisticsItem(itemId, militia?.id || '')}
                                className="px-6 py-4 bg-red-900 hover:bg-black border border-red-800 hover:border-red-600 text-white font-black text-xs rounded-2xl transition-all shadow-lg flex items-center gap-2 whitespace-nowrap"
                                title="حذف إجباري"
                              >
                                <Trash2 size={16} />
                                إزالة فورية
                              </button>
                            )}

                            <button
                               onClick={() => handleSellItem(inventoryTab, itemId, displaySellPrice)}
                               disabled={isProcessing}
                               className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl transition-all shadow-lg flex items-center gap-3 whitespace-nowrap"
                             >
                               <Coins size={18} />
                               بيع بالسعر المناسب ({formatNumber(displaySellPrice)})
                             </button>
                          </div>
                        </div>
                      );
                    }
                  });
                })()}
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'combat' && (
            <motion.div
              key="combat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden group">
                <div className="absolute left-0 top-0 w-64 h-64 bg-red-600/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-red-600/20 transition-all"></div>
                
                <div className="relative z-10 flex items-center gap-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500/20 to-orange-500/10 rounded-2xl border border-red-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.15)] shrink-0">
                    <Swords size={32} className="text-red-500 drop-shadow-lg" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter drop-shadow-md">العمليات العسكرية</h2>
                    <p className="text-zinc-400 font-medium mt-1">إدارة الصراعات، التحالفات، وفرض الهيمنة الميدانية.</p>
                  </div>
                </div>

                <div className="relative w-full lg:w-96 z-10">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                  <input 
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="البحث عن مليشيا..."
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pr-12 pl-6 text-white focus:border-red-600 outline-none transition-all font-bold placeholder:text-zinc-600 focus:shadow-[0_0_20px_rgba(220,38,38,0.1)]"
                  />
                </div>
              </div>

              {/* Combat Intelligence Ticker */}
              <div className="bg-black/60 backdrop-blur-3xl border-y border-white/10 py-3 relative overflow-hidden flex items-center mb-8">
                <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black z-20 pointer-events-none"></div>
                <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black z-20 pointer-events-none"></div>
                <div className="shrink-0 px-6 border-l border-red-500/30 flex items-center gap-2 relative z-30">
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-ping"></div>
                  <span className="text-[10px] font-black text-white uppercase tracking-widest italic">استخبارات الميدان</span>
                </div>
                <div className="flex-1 overflow-hidden relative">
                  <motion.div 
                    animate={{ x: [0, -1000] }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="flex items-center gap-12 whitespace-nowrap"
                  >
                    {[...(militia.attackLogs || []), ...(militia.defenseLogs || [])]
                      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                      .slice(0, 5)
                      .map((log, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-zinc-500 uppercase">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString('ar-EG') : '--:--'}</span>
                          <span className={clsx("text-xs font-black", (log as any).attackerName ? "text-orange-400" : "text-red-400")}>
                            { (log as any).attackerName ? `تعرضنا لهجوم من ${ (log as any).attackerName}` : `نفذنا غارة على ${(log as any).targetName}` }
                          </span>
                          <span className={clsx("text-[10px] font-black px-2 py-0.5 rounded border uppercase", log.result === 'win' ? "text-green-500 border-green-500/20 bg-green-500/10" : "text-red-500 border-red-500/20 bg-red-500/10")}>
                            {log.result === 'win' ? 'انتصار' : 'هزيمة'}
                          </span>
                        </div>
                      ))}
                    {(!(militia.attackLogs || []).length && !(militia.defenseLogs || []).length) && (
                      <span className="text-xs font-black text-zinc-600 uppercase italic">لا توجد تحركات قتالية حديثة تحت المراقبة...</span>
                    )}
                  </motion.div>
                </div>
              </div>

              {/* Alliance Requests */}
              <div className="space-y-8">
                <div className="flex items-center justify-between px-4">
                  <h3 className="text-xl font-black text-white italic uppercase flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-yellow-600 rounded-full shadow-[0_0_10px_rgba(202,138,4,0.5)]" />
                    طلبات التحالف والاتفاقيات
                  </h3>
                  <button
                    onClick={handleForceClearRequests}
                    disabled={isProcessing}
                    className="group px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 text-[10px] font-black rounded-xl border border-red-500/20 transition-all flex items-center gap-2 hover:shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                  >
                    <History size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                    تنظيف الطلبات العالقة
                  </button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Incoming Requests */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2 text-blue-400">
                      <ArrowDownLeft size={14} className="animate-bounce" />
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-80">طلبات واردة إليك</p>
                    </div>
                    {allianceRequests.length === 0 ? (
                      <div className="bg-black/20 border border-white/5 rounded-3xl p-8 text-center backdrop-blur-sm grayscale opacity-60">
                        <Handshake size={32} className="mx-auto text-zinc-600 mb-3" />
                        <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">لا توجد طلبات واردة حالياً</p>
                      </div>
                    ) : (
                      allianceRequests.map((req) => (
                        <div key={req.id} className="bg-gradient-to-r from-blue-600/10 to-transparent border border-blue-500/20 rounded-[2rem] p-6 flex flex-col sm:flex-row items-center justify-between gap-6 hover:border-blue-500/40 transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-500 border border-blue-500/20 group-hover:scale-110 transition-transform">
                              <Shield size={24} />
                            </div>
                            <div>
                              <p className="text-xl font-black text-white italic">{req.fromName}</p>
                              <p className="text-zinc-500 text-[10px] uppercase font-black tracking-widest mt-0.5">يريد عقد معاهدة تحالف</p>
                            </div>
                          </div>
                          <div className="flex gap-3 w-full sm:w-auto">
                            <button
                              onClick={() => handleAcceptAlliance(req)}
                              disabled={isProcessing}
                              className="flex-1 sm:flex-none px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white text-xs font-black rounded-xl transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:-translate-y-0.5"
                            >
                              {isProcessing ? '..' : 'قبول'}
                            </button>
                            <button
                              onClick={() => handleRejectAlliance(req.id)}
                              disabled={isProcessing}
                              className="flex-1 sm:flex-none px-6 py-2.5 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white text-xs font-black rounded-xl border border-red-500/20 transition-all"
                            >
                              رفض
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Outgoing Requests */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2 text-yellow-500 opacity-80">
                      <ArrowUpRight size={14} />
                      <p className="text-[10px] font-black uppercase tracking-widest">طلبات مرسلة للمراجعة</p>
                    </div>
                    {outgoingRequests.length === 0 ? (
                      <div className="bg-black/20 border border-white/5 rounded-3xl p-8 text-center backdrop-blur-sm grayscale opacity-60">
                        <Search size={32} className="mx-auto text-zinc-600 mb-3" />
                        <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">لا توجد طلبات قيد الانتظار</p>
                      </div>
                    ) : (
                      outgoingRequests.map((req) => (
                        <div key={req.id} className="bg-gradient-to-r from-yellow-600/5 to-transparent border border-yellow-500/20 rounded-[2rem] p-6 flex items-center justify-between group hover:border-yellow-500/40 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-500 border border-yellow-500/20 group-hover:scale-110 transition-transform">
                              <Search size={24} />
                            </div>
                            <div>
                              <p className="text-xl font-black text-white italic">{req.toName}</p>
                              <p className="text-zinc-500 text-[10px] uppercase font-black tracking-widest mt-0.5">بانتظار الموافقة الدبلوماسية</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCancelAlliance(req.toUid)}
                            className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-black rounded-xl transition-all border border-white/10"
                          >
                            سحب الطلب
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Allied Militias */}
              <div className="space-y-8">
                <h3 className="text-xl font-black text-white italic uppercase flex items-center gap-3 px-4">
                  <div className="w-1.5 h-6 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)]" />
                  المليشيات المتحالفة (المعاهدات النشطة)
                </h3>
                <div className="grid grid-cols-1 gap-8">
                  {alliedMilitias.length === 0 ? (
                    <div className="bg-black/20 border border-white/5 rounded-[3rem] p-16 text-center backdrop-blur-md border-dashed">
                      <Shield size={48} className="mx-auto text-zinc-700 mb-4 opacity-50" />
                      <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-sm">لا توجد معاهدات تحالف نشطة</p>
                    </div>
                  ) : (
                    alliedMilitias.map((target) => {
                        const targetMilitia = target.militia;
                        const targetPower = targetMilitia.soldiers.reduce((acc: number, s: any) => acc + (s.stats?.strength || 0), 0);
                        const targetDefense = targetMilitia.soldiers.reduce((acc: number, s: any) => acc + (s.stats?.defense || 0), 0);
                        
                        return (
                          <div key={target.id} className="bg-black/40 backdrop-blur-xl border border-blue-500/20 rounded-[3rem] p-8 lg:p-10 flex flex-col lg:flex-row gap-10 transition-all hover:border-blue-500/40 relative group overflow-hidden shadow-2xl">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[100px] pointer-events-none"></div>
                            
                            <div className="w-48 h-48 bg-zinc-900 rounded-[2.5rem] overflow-hidden border border-white/10 shrink-0 shadow-2xl relative group/img">
                              <img src={targetMilitia.image || MILITIA_IMAGES.background} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-1000" alt={targetMilitia.name} />
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                            </div>
                            
                            <div className="flex-1 space-y-8 relative z-10">
                              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div>
                                  <div className="flex items-center gap-4 mb-2">
                                    <h4 className="text-3xl font-black text-white italic tracking-tighter">{targetMilitia.name}</h4>
                                    <div className="px-3 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-500/30">حليف إستراتيجي</div>
                                  </div>
                                  <div className="flex items-center gap-2 text-zinc-400">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                    <p className="text-xs font-black uppercase tracking-widest leading-none">القائد: <span className="text-white ml-2">{target.displayName}</span></p>
                                  </div>
                                </div>
                                <div className="flex gap-4">
                                  <button
                                    onClick={() => handleCancelAlliance(target.id)}
                                    className="px-6 py-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white text-[10px] font-black rounded-xl border border-red-500/10 transition-all flex items-center gap-2"
                                  >
                                    <XCircle size={14} />
                                    فض التحالف
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                  { label: 'الأفراد', value: targetMilitia.soldiers.length, icon: Users, color: 'text-zinc-500' },
                                  { label: 'الآليات', value: targetMilitia.vehicles.length, icon: Truck, color: 'text-blue-500' },
                                  { label: 'القوة الهجومية', value: formatNumber(targetPower), icon: Swords, color: 'text-red-500' },
                                  { label: 'القوة الدفاعية', value: formatNumber(targetDefense), icon: Shield, color: 'text-green-500' },
                                ].map((stat, i) => (
                                  <div key={i} className="bg-black/40 border border-white/5 rounded-2xl p-5 group/stat hover:bg-white/5 transition-all">
                                    <stat.icon size={20} className={clsx(stat.color, "mb-4 opacity-70 group-hover/stat:scale-110 transition-transform")} />
                                    <p className="text-2xl font-black text-white tabular-nums tracking-tighter leading-none">{stat.value}</p>
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mt-2 opacity-50">{stat.label}</p>
                                  </div>
                                ))}
                              </div>

                              <div className="bg-blue-600/5 border border-blue-500/10 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 group/support">
                                <div>
                                  <h5 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <Zap size={16} />
                                    بروتوكول الدعم العسكري
                                  </h5>
                                  <p className="text-xs text-zinc-500 font-medium">أرسل تعزيزات فورية لحليف مهدد لضمان استقرار الجبهة.</p>
                                </div>
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                  <div className="flex-1 sm:w-48 relative">
                                    <input 
                                      type="number"
                                      value={supportAmount}
                                      onChange={(e) => {
                                        setSupportAmount(Number(e.target.value));
                                        setSupportData(prev => ({ ...prev, amount: Number(e.target.value) }));
                                      }}
                                      className="w-full bg-black/60 border border-blue-500/20 rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-blue-500 transition-all font-black pr-12"
                                      placeholder="0"
                                    />
                                    <Package className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 opacity-50" size={16} />
                                  </div>
                                  <button
                                    onClick={() => handleSendSupport(target.id)}
                                    disabled={isProcessing || supportAmount <= 0}
                                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] shrink-0 disabled:opacity-50"
                                  >
                                    إرسال تعزيزات
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Non-Allied Militias */}
              <div className="space-y-8">
                <div className="flex items-center justify-between px-4">
                  <h3 className="text-xl font-black text-white italic uppercase flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.4)]" />
                    الأهداف والمليشيات المنافسة
                  </h3>
                  <button
                    onClick={handleAutoAttack}
                    disabled={isProcessing}
                    className="px-8 py-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white font-black rounded-2xl transition-all border border-red-500/20 flex items-center gap-3 shadow-[0_0_30px_rgba(239,68,68,0.1)] group/auto"
                  >
                    <Swords size={20} className="group-hover:scale-125 transition-transform" />
                    هجوم شامل تلقائي
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-8">
                  {nonAlliedMilitias.length === 0 ? (
                    <div className="bg-black/20 border border-white/5 rounded-[3rem] p-16 text-center backdrop-blur-md">
                      <Search size={48} className="mx-auto text-zinc-700 mb-4 opacity-50" />
                      <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-sm">لم يتم العثور على أهداف معادية</p>
                    </div>
                  ) : (
                    nonAlliedMilitias.map((target) => {
                        const targetMilitia = target.militia;
                        const targetPower = targetMilitia.soldiers.reduce((acc: number, s: any) => acc + (s.stats?.strength || 0), 0);
                        const targetDefense = targetMilitia.soldiers.reduce((acc: number, s: any) => acc + (s.stats?.defense || 0), 0);
                        const isRequested = outgoingRequests.some(r => r.toUid === target.id);
                        const hasCommCenter = Number(militia?.inventory?.logistics?.m_log_2 || 0) > 0;
                        
                        return (
                          <div key={target.id} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] lg:rounded-[3rem] p-8 lg:p-10 flex flex-col lg:flex-row gap-10 transition-all hover:border-red-500/30 group overflow-hidden shadow-2xl relative">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-red-600/10 transition-all"></div>
                            
                            <div className="w-48 h-48 bg-zinc-900 rounded-[1.5rem] lg:rounded-[2.5rem] overflow-hidden border border-white/10 shrink-0 shadow-2xl relative group/img mx-auto lg:mx-0">
                              <img src={targetMilitia.image || MILITIA_IMAGES.background} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-1000" alt={targetMilitia.name} />
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                            </div>
                            
                            <div className="flex-1 space-y-8 relative z-10 w-full">
                              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div>
                                  <h4 className="text-3xl font-black text-white italic tracking-tighter mb-2">{targetMilitia.name}</h4>
                                  <div className="flex flex-wrap items-center gap-4">
                                    <p className="text-sm font-black text-zinc-400 uppercase tracking-widest">القائد: <span className="text-white">{target.displayName}</span></p>
                                    <span className={clsx(
                                      "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
                                      targetMilitia.type === 'aggressive' ? "text-red-500 bg-red-500/10 border-red-500/20" : "text-blue-500 bg-blue-500/10 border-blue-500/20"
                                    )}>
                                      {targetMilitia.type === 'aggressive' ? 'منظمة هجومية' : 'تشكيل حكومي'}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                                  {myAlliances.includes(target.id) ? (
                                    <div className="flex-1 sm:flex-none px-8 py-3 bg-blue-600/20 text-blue-400 font-black rounded-2xl border border-blue-500/30 flex items-center justify-center gap-2 w-full">
                                      <Shield size={18} />
                                      حليف موثق
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleAttackMilitia(target)}
                                        disabled={isProcessing}
                                        className="flex-1 sm:flex-none px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] flex items-center justify-center gap-3 group/atk"
                                      >
                                        <Swords size={20} className="group-hover/atk:rotate-12 transition-transform" />
                                        شن هجوم
                                      </button>
                                      <button
                                        onClick={() => handleSendAllianceRequest(target.id, targetMilitia.name)}
                                        disabled={isProcessing || isRequested}
                                        className="flex-1 sm:flex-none px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl transition-all border border-white/10 flex items-center justify-center gap-3 disabled:opacity-50"
                                      >
                                        <Handshake size={20} className="text-blue-400" />
                                        {isRequested ? 'جاري الطلب...' : 'إبرام تحالف'}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                  { label: 'الأفراد', value: targetMilitia.soldiers.length, icon: Users, color: 'text-zinc-500' },
                                  { label: 'الآليات', value: targetMilitia.vehicles.length, icon: Truck, color: 'text-blue-500' },
                                  { label: 'القوة', value: hasCommCenter ? formatNumber(targetPower) : '???', icon: Swords, color: 'text-red-500' },
                                  { label: 'الدفاع', value: hasCommCenter ? formatNumber(targetDefense) : '???', icon: Shield, color: 'text-green-500' },
                                ].map((stat, i) => (
                                  <div key={i} className="bg-black/40 border border-white/5 rounded-2xl p-5 hover:bg-white/5 transition-all">
                                    <stat.icon size={20} className={clsx(stat.color, "mb-4 opacity-70")} />
                                    <p className="text-2xl font-black text-white tabular-nums tracking-tighter">{stat.value}</p>
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mt-1.5">{stat.label}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Logs Section */}
              <div className="pt-20 border-t border-white/5 space-y-12">
                <div className="text-center space-y-4">
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-widest">الأرشيف العسكري واللوجستي</h3>
                  <p className="text-zinc-500 text-sm font-medium">سجل شامل لكافة التحركات والاشتباكات الميدانية.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Attack Logs */}
                  <div className="bg-black/40 backdrop-blur-xl border border-red-500/10 rounded-[3rem] p-8 space-y-8 shadow-inner shadow-red-500/5">
                    <h4 className="text-lg font-black text-red-100 flex items-center gap-4 bg-red-600/10 py-3 px-5 rounded-2xl border border-red-500/20">
                      <Swords size={20} className="text-red-500" />
                      سد الهجمات
                    </h4>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
                      {!(militia.attackLogs || []).length ? (
                        <div className="p-12 border border-white/5 rounded-[2rem] text-center text-zinc-600 text-[10px] font-black uppercase tracking-widest bg-black/20 italic">فارغ</div>
                      ) : (
                        militia.attackLogs?.map((log, i) => (
                          <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between group hover:bg-white/10 transition-all">
                            <div className="flex items-center gap-4">
                              <div className={clsx(
                                "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
                                log.result === 'win' ? "bg-green-600/20 text-green-500 shadow-green-500/10" : "bg-red-600/20 text-red-500 shadow-red-500/10"
                              )}>
                                {log.result === 'win' ? <Trophy size={20} /> : <XCircle size={20} />}
                              </div>
                              <div>
                                <p className="text-sm font-black text-white leading-tight">غارة على {log.targetName}</p>
                                <p className="text-[9px] font-bold text-zinc-500 uppercase mt-1 tracking-tighter opacity-60">{new Date(log.timestamp).toLocaleString('ar-EG')}</p>
                              </div>
                            </div>
                            {log.result === 'win' && log.loot && (
                              <div className="text-right">
                                <p className="text-sm font-black text-green-500 tabular-nums">+{formatNumber(Object.values(log.loot).reduce((a: any, b: any) => a + b, 0) as number)}</p>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Defense Logs */}
                  <div className="bg-black/40 backdrop-blur-xl border border-orange-500/10 rounded-[3rem] p-8 space-y-8 shadow-inner shadow-orange-500/5">
                    <h4 className="text-lg font-black text-orange-100 flex items-center gap-4 bg-orange-600/10 py-3 px-5 rounded-2xl border border-orange-500/20">
                      <Shield size={20} className="text-orange-500" />
                      صد العدوان
                    </h4>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
                      {!(militia.defenseLogs || []).length ? (
                        <div className="p-12 border border-white/5 rounded-[2rem] text-center text-zinc-600 text-[10px] font-black uppercase tracking-widest bg-black/20 italic">فارغ</div>
                      ) : (
                        militia.defenseLogs?.map((log, i) => (
                          <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:bg-white/10 transition-all">
                            <div className="flex items-center gap-4">
                              <div className={clsx(
                                "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
                                log.result === 'win' ? "bg-green-600/20 text-green-500" : "bg-red-600/20 text-red-500"
                              )}>
                                {log.result === 'win' ? <Shield size={20} /> : <AlertTriangle size={20} />}
                              </div>
                              <div>
                                <p className="text-sm font-black text-white hover:text-orange-400 leading-tight">اشتباك مع {log.attackerName}</p>
                                <p className="text-[9px] font-bold text-zinc-500 uppercase mt-1 tracking-tighter opacity-60">{new Date(log.timestamp).toLocaleString('ar-EG')}</p>
                              </div>
                            </div>
                            {log.result === 'loss' && log.lost && (
                              <div className="text-right">
                                <p className="text-sm font-black text-red-500">-{formatNumber(Object.values(log.lost).reduce((a: any, b: any) => a + b, 0) as number)}</p>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Support Logs */}
                  <div className="bg-black/40 backdrop-blur-xl border border-blue-500/10 rounded-[3rem] p-8 space-y-8 shadow-inner shadow-blue-500/5">
                    <h4 className="text-lg font-black text-blue-100 flex items-center gap-4 bg-blue-600/10 py-3 px-5 rounded-2xl border border-blue-500/20">
                      <Heart size={20} className="text-blue-500" />
                      الدعم اللوجستي
                    </h4>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
                      {!(militia.supportLogs || []).length ? (
                        <div className="p-12 border border-white/5 rounded-[2rem] text-center text-zinc-600 text-[10px] font-black uppercase tracking-widest bg-black/20 italic">فارغ</div>
                      ) : (
                        militia.supportLogs?.map((log, i) => (
                          <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:bg-white/10 transition-all">
                            <div className="flex items-center gap-4">
                              <div className={clsx(
                                "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
                                log.direction === 'incoming' ? "bg-green-600/20 text-green-500 shadow-green-500/10" : "bg-blue-600/20 text-blue-500 shadow-blue-500/10"
                              )}>
                                <Package size={20} />
                              </div>
                              <div>
                                <p className="text-sm font-black text-white leading-tight">
                                  {log.direction === 'incoming' ? `${log.fromName} أرسل دعم` : `إرسال دعم لـ ${log.targetName}`}
                                </p>
                                <p className="text-[9px] font-bold text-zinc-500 uppercase mt-1 tracking-tighter opacity-60">{new Date(log.timestamp).toLocaleString('ar-EG')}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={clsx(
                                "text-sm font-black tabular-nums scale-110",
                                log.direction === 'incoming' ? "text-green-500 shadow-green-500/5" : "text-blue-500 shadow-blue-500/5"
                              )}>
                                {log.direction === 'incoming' ? '+' : '-'}{formatNumber(log.amount)}
                                <span className="text-[8px] mr-1 opacity-70 italic">{log.type}</span>
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'headquarters' && (
            <motion.div
              key="headquarters"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Strategic Control Center */}
              <div className="bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 via-transparent to-blue-600/5 opacity-50"></div>
                
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 border-b border-white/5 pb-6">
                    <div className="flex items-center gap-5">
                      <div className="p-4 bg-gradient-to-br from-red-600/20 to-red-600/10 rounded-[1.5rem] border border-red-500/20 shadow-[0_0_30px_rgba(220,38,38,0.15)] group-hover:scale-105 transition-transform">
                        <Shield className="text-red-500" size={32} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">نظام التحكم الاستراتيجي</h3>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">إمدادات المخزون والجاهزية اللوجستية</p>
                      </div>
                    </div>

                    {(Number(militia.resources?.ammo || 0) < 1000 || 
                      Number(militia.resources?.fuel || 0) < 1000 || 
                      Number(militia.resources?.food || 0) < 1000 || 
                      Number(militia.resources?.water || 0) < 1000 || 
                      Number(militia.resources?.medicine || 0) < 1000) && (
                      <button 
                        onClick={handlePurchaseDeficit}
                        disabled={isProcessing}
                        className="w-full md:w-auto px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-red-600/20 flex items-center justify-center gap-3 animate-pulse active:scale-95 disabled:opacity-50"
                      >
                        <ShoppingCart size={20} />
                        شراء النقص فوراً
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { key: 'ammo', label: 'الذخيرة', icon: Zap, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
                      { key: 'fuel', label: 'الوقود', icon: Fuel, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
                      { key: 'food', label: 'الطعام', icon: Utensils, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
                      { key: 'water', label: 'الماء', icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                      { key: 'medicine', label: 'الأدوية', icon: Heart, color: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-500/20' }
                    ].map((res) => {
                      const value = Number(militia.resources?.[res.key as keyof typeof militia.resources] || 0);
                      const isDeficit = value < 1000;

                      return (
                        <div key={res.key} className={clsx(
                          "bg-white/5 border rounded-[1.8rem] p-5 flex flex-col items-center justify-center text-center transition-all relative overflow-hidden group/item",
                          isDeficit ? "border-red-600/50 bg-red-600/5 animate-pulse" : res.border,
                          !isDeficit && "hover:border-white/20 hover:bg-white/[0.07]"
                        )}>
                          {isDeficit && <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" />}
                          <res.icon size={24} className={clsx("mb-3", isDeficit ? "text-red-500" : res.color)} />
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{res.label}</p>
                          <p className={clsx("text-xl font-black tabular-nums tracking-tighter", isDeficit ? "text-red-500" : "text-white")}>
                            {formatNumber(value)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              {/* HQ Header & Upgrade */}
              <div className="relative h-[300px] lg:h-[400px] w-full overflow-hidden group rounded-[2.5rem]">
                <img 
                  src="https://up6.cc/2026/04/177640685065961.png" 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                  alt="Headquarters" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                
                <div className="absolute bottom-8 right-8 left-8 flex flex-wrap items-end justify-end gap-6 z-10">
                   <div className="flex flex-col items-end gap-2 bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                     <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">تخصيص صورة المقر</p>
                     <div className="flex gap-2">
                       <input 
                         type="text" 
                         value={hqImageInput} 
                         onChange={(e) => setHqImageInput(e.target.value)}
                         placeholder="رابط صورة مخصص..."
                         className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-white outline-none focus:border-red-500 w-40"
                       />
                       <button onClick={handleUpdateHQImage} disabled={isProcessing || !hqImageInput} className="text-[10px] bg-white/10 hover:bg-white/20 px-3 py-1 rounded-md text-white font-bold transition-colors">
                         تحديث
                       </button>
                     </div>
                   </div>
                </div>
              </div>

              {/* HQ Level & Upgrade Button - Relocated Below Photo */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-600/10 rounded-xl flex items-center justify-center border border-red-500/20">
                    <Shield size={24} className="text-red-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white italic tracking-tighter">المقر العام للمليشيا</h2>
                    <p className="text-red-400 font-bold uppercase tracking-widest text-[10px]">المستوى {militia.gqh?.level || 1} / 5</p>
                  </div>
                </div>

                <div className="flex gap-4 items-center">
                  {/* Upgrade Button */}
                  {(militia.gqh?.level || 1) < 5 ? (
                    <button
                      onClick={handleUpgradeHQ}
                      disabled={isProcessing || (militia.resources.corruptionMoney || 0) < (HQ_LEVELS[militia.gqh?.level || 1]?.cost || 0)}
                      className="px-8 py-3.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl transition-all shadow-[0_0_30px_rgba(220,38,38,0.4)] flex items-center gap-3 disabled:opacity-50 text-sm italic uppercase tracking-tighter"
                    >
                      <TrendingUp size={20} />
                      تطوير المقر العام ({formatNumber(HQ_LEVELS[militia.gqh?.level || 1]?.cost || 0)} أموال فساد)
                    </button>
                  ) : (
                    <div className="px-8 py-3.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl transition-all shadow-[0_0_30px_rgba(220,38,38,0.4)] flex items-center gap-3 text-sm italic uppercase tracking-tighter cursor-not-allowed">
                      <ShieldCheck size={20} />
                      المقر العام في المستوى الأقصى
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Stats & Capacities */}
                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8">
                    <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-6 flex items-center gap-3">
                       <Shield size={20} className="text-red-500" />
                       القدرة الاستيعابية (المستوى {militia.gqh?.level || 1})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                        <Users size={24} className="text-blue-400 mb-2" />
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">سعة الجنود</span>
                        <span className="text-lg text-white font-black">{militia.soldiers.length} / {formatNumber(getHqCapacity().soldiers)}</span>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                        <Truck size={24} className="text-orange-400 mb-2" />
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">سعة المركبات</span>
                        <span className="text-lg text-white font-black">{militia.vehicles.length} / {formatNumber(getHqCapacity().vehicles)}</span>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                        <Swords size={24} className="text-red-400 mb-2" />
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">الأسلحة والعتاد</span>
                        <div className="flex flex-col gap-0.5 mt-1">
                          <span className="text-sm text-white font-black">جاهزية: {militia.soldiers.filter(s => s.hasWeapon).length} / {militia.soldiers.length}</span>
                          <span className="text-[9px] text-red-500 font-bold">احتياط: {Math.max(0, Number(Object.values((militia.inventory?.weapons as any) || {}).reduce((a: any, b: any) => a + b, 0)))}</span>
                        </div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                        <ShieldCheck size={24} className="text-blue-400 mb-2" />
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">الدروع والحماية</span>
                        <div className="flex flex-col gap-0.5 mt-1">
                          <span className="text-sm text-white font-black">حماية: {militia.soldiers.filter(s => s.hasArmor).length} / {militia.soldiers.length}</span>
                          <span className="text-[9px] text-blue-500 font-bold">احتياط: {Math.max(0, Number(Object.values((militia.inventory?.armor as any) || {}).reduce((a: any, b: any) => a + b, 0)))}</span>
                        </div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                        <Package size={24} className="text-green-400 mb-2" />
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">الموارد اللوجستية</span>
                        <span className="text-lg text-white font-black">السعة القصوى لكل نوع: {formatNumber(getHqCapacity().resources)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8">
                    <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-6 flex items-center gap-3">
                       <Zap size={20} className="text-yellow-500" />
                       إحصائيات المواجهات الميدانية
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 rounded-2xl p-6">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">إجمالي الأضرار المُلحقة بالعدو</p>
                        <p className="text-3xl font-black text-green-500 tabular-nums">{formatNumber(militia.gqh?.stats?.damageDealt || 0)}</p>
                      </div>
                      <div className="bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-2xl p-6">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">إجمالي الأضرار المُتلقاة</p>
                        <p className="text-3xl font-black text-red-500 tabular-nums">{formatNumber(militia.gqh?.stats?.damageReceived || 0)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Facilities Section */}
                  <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                         <Building2 size={20} className="text-orange-500" />
                         مرافق وأقسام المقر العام
                      </h3>
                      <div className="px-4 py-1.5 bg-zinc-800 rounded-full text-[10px] font-black text-zinc-400 uppercase tracking-widest border border-white/5">
                        التطوير يزيد من الكفاءة العامة
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {FACILITIES_CONFIG.map((facility) => {
                        const facilities = militia.gqh?.facilities || { intelligenceLevel: 0, medicalLevel: 0, logisticsLevel: 0, trainingLevel: 0 };
                        const level = (facilities as any)[facility.id] || 0;
                        const cost = Math.floor(facility.baseCost * Math.pow(1.8, level));
                        const Icon = facility.icon;
                        
                        return (
                          <div key={facility.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:border-white/20 transition-all group">
                             <div className="flex items-start gap-4 mb-4">
                               <div className="p-3 bg-zinc-800 rounded-2xl text-white group-hover:scale-110 transition-transform">
                                  <Icon size={24} />
                               </div>
                               <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <h4 className="font-black text-white">{facility.name}</h4>
                                    <span className="text-xs font-black text-orange-500">LEVEL {level}</span>
                                  </div>
                                  <p className="text-[10px] text-zinc-400 font-medium leading-relaxed mt-1">{facility.description}</p>
                                  <span className="inline-block mt-2 px-2 py-0.5 bg-orange-500/10 text-orange-500 text-[8px] font-black rounded uppercase tracking-tighter">{facility.bonus}</span>
                               </div>
                             </div>
                             
                             <div className="flex gap-2">
                               <button 
                                 onClick={() => handleUpgradeFacility(facility.id)}
                                 disabled={isProcessing || (militia.resources.corruptionMoney || 0) < cost || level >= 5}
                                 className={clsx(
                                   "flex-1 py-3 text-white rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2",
                                   level >= 5 ? "bg-red-600 cursor-not-allowed" : "bg-orange-600 hover:bg-orange-500"
                                 )}
                               >
                                 {level >= 5 ? (
                                   <>
                                     <ShieldCheck size={14} />
                                     المستوى الأقصى
                                   </>
                                 ) : (
                                   <>
                                     <ArrowUpCircle size={14} />
                                     تطوير ({formatNumber(cost)})
                                   </>
                                 )}
                               </button>
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Column: Founder & Comm Center */}
                <div className="space-y-8">
                  {/* Founder Profile */}
                  <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden profile-card shadow-2xl relative">
                    <div className="absolute top-0 right-0 p-4 z-20 flex gap-2">
                      <button onClick={() => setShowFounderModal(true)} className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-[10px] font-bold text-white uppercase rounded-lg transition-colors">
                        تغيير الزعيم
                      </button>
                      {profile?.role === 'Admin' && (
                        <button onClick={() => setShowEditFounderModal(true)} className="p-2 bg-black/50 hover:bg-black/80 rounded-lg text-white transition-colors">
                          <Settings size={16} />
                        </button>
                      )}
                    </div>
                    {militia.gqh?.founder ? (
                      <div>
                        <div className="h-128 relative">
                           <img src={militia.gqh.founder.image} className="w-full h-full object-contain bg-zinc-900/50" />
                           <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                        </div>
                        <div className="p-6 relative z-10 -mt-12 text-center text-shadow-sm">
                           <h3 className="text-2xl font-black text-white italic tracking-tighter mb-1">{militia.gqh.founder.name}</h3>
                           <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-4">الزعيم المؤسس</p>
                           <p className="text-sm text-zinc-300 font-medium leading-relaxed bg-black/50 p-4 rounded-xl border border-white/5">{militia.gqh.founder.description}</p>
                           
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center flex flex-col items-center justify-center h-full min-h-[300px]">
                        <UserCheck size={48} className="text-zinc-600 mb-4" />
                        <h3 className="text-lg font-black text-white mb-2">لم يتم تعيين زعيم مؤسس</h3>
                        <p className="text-sm text-zinc-400 mb-6 font-medium">اختر شخصية قيادية لتمثيل منظمتك.</p>
                        <button onClick={() => setShowFounderModal(true)} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition-all">
                          اختيار الزعيم
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Settings Update */}
                  {/* Strategic Command Hub */}
                  <div className="bg-zinc-950 border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[100px] -ml-32 -mb-32 pointer-events-none"></div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                       <div>
                          <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                             <Radio size={28} className="text-red-500 animate-pulse" />
                             مركز التحكم الاستراتيجي المتقدم
                          </h3>
                          <p className="text-sm text-zinc-500 font-medium font-bold italic tracking-wider">نظام المعالجة الميدانية الذكي - تحكم عالي الدقة</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                        {/* Logistics Analysis Card */}
                        <div className="bg-zinc-900 shadow-2xl border border-white/10 rounded-3xl p-6 hover:border-blue-500/20 transition-all group overflow-hidden relative">
                           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform"><Package size={80} /></div>
                           <div className="flex items-center justify-between mb-6">
                              <div className="p-3 rounded-2xl bg-blue-500 text-white shadow-xl"><Package size={20} /></div>
                              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">تأمين الموارد الاستراتيجية</span>
                           </div>
                           <div className="space-y-4 mb-6">
                              {(() => {
                                 const res = militia.resources || {};
                                 const items = [
                                    { k: 'fuel', n: 'الوقود', icon: Fuel, color: 'text-orange-500', min: 1000 }, 
                                    { k: 'water', n: 'الماء', icon: Droplets, color: 'text-blue-500', min: 1000 }, 
                                    { k: 'food', n: 'الطعام', icon: Utensils, color: 'text-green-500', min: 1000 }, 
                                    { k: 'ammo', n: 'الذخيرة', icon: Zap, color: 'text-yellow-500', min: 1000 }, 
                                    { k: 'medicine', n: 'الأدوية', icon: Heart, color: 'text-red-500', min: 1000 }
                                 ];
                                 const lowItems = items.filter(i => (Number(res[i.k as keyof typeof res]) || 0) < i.min);
                                 return (
                                    <>
                                       <div className="space-y-2">
                                          {lowItems.length > 0 ? (
                                             lowItems.map(i => {
                                                const Icon = i.icon;
                                                const current = Number(res[i.k as keyof typeof res]) || 0;
                                                const deficit = i.min - current;
                                                return (
                                                   <div key={i.k} className="flex flex-col gap-1 bg-white/5 p-3 rounded-xl border border-white/5">
                                                      <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                                         <div className="flex items-center gap-2">
                                                            <Icon size={12} className={i.color} />
                                                            <span className="text-zinc-300">{i.n}</span>
                                                         </div>
                                                         <span className="text-red-500">نقص: -{formatNumber(deficit)}</span>
                                                      </div>
                                                      <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                                                         <div 
                                                            className={clsx("h-full transition-all duration-500", i.color.replace('text-', 'bg-'))} 
                                                            style={{ width: `${(current / i.min) * 100}%` }}
                                                         ></div>
                                                      </div>
                                                   </div>
                                                );
                                             })
                                          ) : (
                                             <div className="text-[11px] font-bold text-green-500 bg-green-500/10 p-4 rounded-xl border border-green-500/20 text-center">
                                                <CheckCircle size={20} className="mx-auto mb-2" />
                                                جميع الموارد الحيوية مؤمنة بالكامل
                                             </div>
                                          )}
                                       </div>
                                       <div className="pt-2 border-t border-white/5">
                                          <div className="flex justify-between items-center">
                                             <span className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">الوضع اللوجستي</span>
                                             <span className={clsx("text-[10px] font-black italic px-2 py-0.5 rounded", lowItems.length > 0 ? "text-red-500 bg-red-500/10" : "text-green-500 bg-green-500/10")}>
                                                {lowItems.length > 0 ? `تأمين مطلوب: ${lowItems.length}` : "جاهزية كاملة"}
                                             </span>
                                          </div>
                                       </div>
                                    </>
                                 );
                              })()}
                           </div>
                           <button 
                              onClick={handlePurchaseDeficit}
                              disabled={isProcessing}
                              className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white font-black text-[11px] uppercase tracking-tighter rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 border border-blue-400/20"
                           >
                              <ShoppingCart size={16} className="animate-bounce" />
                              شراء نقص الموارد فوراً
                           </button>
                        </div>

                        {/* Medical Bio-Scan Card */}
                        <div className="bg-zinc-900 shadow-2xl border border-white/10 rounded-3xl p-6 hover:border-green-500/20 transition-all group overflow-hidden relative">
                           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform"><Heart size={80} /></div>
                           <div className="flex items-center justify-between mb-6">
                              <div className="p-3 rounded-2xl bg-green-500 text-white shadow-xl"><Heart size={20} /></div>
                              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">الوحدة الطبية</span>
                           </div>
                           <div className="space-y-4 mb-6">
                              {(() => {
                                 const injuredCount = (militia.soldiers || []).filter((s: any) => (s.health || 100) < 100).length;
                                 return (
                                    <>
                                       <div className="flex items-end justify-between">
                                          <div className="text-3xl font-black text-white tabular-nums italic">%{Math.round((militia.soldiers || []).reduce((acc: number, s: any) => acc + (s.health || 100), 0) / (militia.soldiers?.length || 1))}</div>
                                          <div className="text-[10px] font-black text-green-500 uppercase tracking-widest italic">Bio-Stats</div>
                                       </div>
                                       <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                          <div className="h-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)] transition-all duration-1000" style={{ width: `${Math.round((militia.soldiers || []).reduce((acc: number, s: any) => acc + (s.health || 100), 0) / (militia.soldiers?.length || 1))}%` }}></div>
                                       </div>
                                       <div className="text-[11px] font-bold text-zinc-500 italic">
                                          {injuredCount > 0 ? `تحذير: يوجد ${injuredCount} جندي جريح` : "الحالة الصحية للكتيبة مثالية"}
                                       </div>
                                    </>
                                 );
                              })()}
                           </div>
                           <button 
                              onClick={() => runManualFounderAction('health')}
                              disabled={isProcessing}
                              className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black text-[11px] uppercase tracking-tighter rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                           >
                              <Zap size={14} />
                              علاج جميع المصابين
                           </button>
                        </div>

                        {/* Combat Readiness Card */}
                        <div className="bg-zinc-900 shadow-2xl border border-white/10 rounded-3xl p-6 hover:border-purple-500/20 transition-all group overflow-hidden relative">
                           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform"><Shield size={80} /></div>
                           <div className="flex items-center justify-between mb-6">
                              <div className="p-3 rounded-2xl bg-purple-500 text-white shadow-xl"><Shield size={20} /></div>
                              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">تجهيز القوات</span>
                           </div>
                           <div className="space-y-4 mb-6">
                              {(() => {
                                 const slds = militia.soldiers || [];
                                 const needArmor = slds.filter((s: any) => !s.hasArmor).length;
                                 const needWeapon = slds.filter((s: any) => !s.hasWeapon).length;
                                 const statsKeys: (keyof MilitiaSoldier['stats'])[] = ['strength', 'speed', 'defense', 'endurance'];
                                 const needTraining = slds.filter((s: any) => statsKeys.some(k => (s.stats?.[k] || 0) < 100)).length;
                                 
                                 return (
                                    <>
                                       <div className="grid grid-cols-2 gap-2">
                                          <div className="bg-black/20 p-2 rounded-xl border border-white/5">
                                             <p className="text-[8px] text-zinc-500 uppercase font-black">نقص الدروع</p>
                                             <p className={clsx("text-sm font-black italic", needArmor > 0 ? "text-purple-500" : "text-white")}>{needArmor}</p>
                                          </div>
                                          <div className="bg-black/20 p-2 rounded-xl border border-white/5">
                                             <p className="text-[8px] text-zinc-500 uppercase font-black">نقص السلاح</p>
                                             <p className={clsx("text-sm font-black italic", needWeapon > 0 ? "text-purple-500" : "text-white")}>{needWeapon}</p>
                                          </div>
                                       </div>
                                       <div className="text-[11px] font-bold text-zinc-500 pt-2 border-t border-white/5">
                                          {needTraining > 0 ? `جنود بحاجة لرفع الكفاءة: ${needTraining}` : "كافة القوات في قمة الجاهزية"}
                                       </div>
                                    </>
                                 );
                              })()}
                           </div>
                           <button 
                              onClick={() => runManualFounderAction('gear')}
                              disabled={isProcessing}
                              className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-black text-[11px] uppercase tracking-tighter rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                           >
                              <Swords size={14} />
                              تجهيز وتدريب القوات
                           </button>
                        </div>

                        {/* Maintenance Analysis Card */}
                        <div className="bg-zinc-900 shadow-2xl border border-white/10 rounded-3xl p-6 hover:border-amber-500/20 transition-all group overflow-hidden relative">
                           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform"><Wrench size={80} /></div>
                           <div className="flex items-center justify-between mb-6">
                              <div className="p-3 rounded-2xl bg-amber-500 text-white shadow-xl"><Wrench size={20} /></div>
                              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">صيانة الأسطول</span>
                           </div>
                           <div className="space-y-4 mb-6">
                              {(() => {
                                 const damaged = (militia.vehicles || []).filter((v: any) => (v.health || 100) < 100);
                                 const avgFleetHealth = Math.round((militia.vehicles || []).reduce((acc: number, v: any) => acc + (v.health || 100), 0) / (militia.vehicles?.length || 1));
                                 return (
                                    <>
                                       <div className="flex items-end justify-between">
                                          <div className="text-3xl font-black text-white tabular-nums italic">%{avgFleetHealth || 0}</div>
                                          <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest italic">Fleet Integrity</div>
                                       </div>
                                       <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                          <div className="h-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-all duration-1000" style={{ width: `${avgFleetHealth || 0}%` }}></div>
                                       </div>
                                       <div className="text-[11px] font-bold text-zinc-500 italic">
                                          {damaged.length > 0 ? `مطلوب صيانة لـ ${damaged.length} مركبة` : "الأسطول الميكانيكي جاهز تماماً"}
                                       </div>
                                    </>
                                 );
                              })()}
                           </div>
                           <button 
                              onClick={() => runManualFounderAction('repair')}
                              disabled={isProcessing}
                              className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-black text-[11px] uppercase tracking-tighter rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                           >
                              <Wrench size={14} />
                              صيانة الأسطول العام
                           </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                       {/* Activity Log */}
                       <div className="lg:col-span-2 bg-black/40 rounded-3xl border border-white/5 p-6 h-[250px] flex flex-col">
                          <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                             <History size={16} className="text-zinc-500" />
                             <h4 className="text-zinc-400 text-xs font-black uppercase tracking-widest">سجل العمليات الأخير</h4>
                          </div>
                          <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                             {activityLogs.length === 0 ? (
                               <div className="h-full flex items-center justify-center text-zinc-600 text-[10px] italic">
                                  لا توجد عمليات مسجلة...
                               </div>
                             ) : (
                               activityLogs.map((log, lidx) => (
                                 <motion.div 
                                   initial={{ opacity: 0, x: -10 }}
                                   animate={{ opacity: 1, x: 0 }}
                                   key={lidx} 
                                   className="flex items-center justify-between gap-4 py-2 border-b border-white/5 last:border-0"
                                 >
                                    <div className="flex items-center gap-3">
                                       <div className="w-1.5 h-1.5 rounded-full bg-red-600 shadow-[0_0_5px_rgba(220,38,38,0.5)]"></div>
                                       <span className="text-zinc-300 text-[11px] font-bold">{log.msg}</span>
                                    </div>
                                    <span className="text-zinc-600 text-[9px] font-mono whitespace-nowrap">
                                      {new Date(log.time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                 </motion.div>
                               ))
                             )}
                          </div>
                       </div>

                       {/* Summary Info */}
                       <div className="bg-red-600/5 rounded-3xl border border-red-500/10 p-6 flex flex-col justify-center gap-4">
                          <div className="space-y-1">
                             <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">الرصيد المتاح</p>
                             <p className="text-2xl font-black text-red-500 font-mono tracking-tighter">
                                {formatNumber(militia.resources.corruptionMoney || 0)}$
                             </p>
                          </div>
                          <div className="h-[1px] bg-red-500/10 w-full"></div>
                          <div className="flex items-center gap-4">
                             <div>
                                <p className="text-zinc-500 text-[9px] font-bold">حالة الدفاع</p>
                                <p className="text-lg font-black text-white">ممتاز</p>
                             </div>
                             <div>
                                <p className="text-zinc-500 text-[9px] font-bold">جاهزية الهجوم</p>
                                <p className="text-lg font-black text-white">عالية</p>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {showExecutionPreview && (
                      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div 
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.9, opacity: 0 }}
                          className="bg-zinc-900 border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl"
                        >
                          <div className="p-8 border-b border-white/5">
                             <h3 className="text-xl font-black text-white flex items-center gap-3">
                                <AlertTriangle className="text-yellow-500" />
                                مراجعة تنفيذ البروتوكول
                             </h3>
                             <p className="text-sm text-zinc-500 mt-1">سيتم تنفيذ العمليات التالية بناءً على إعداداتك الحالية</p>
                          </div>
                          
                          <div className="p-8 max-h-[400px] overflow-y-auto space-y-4">
                             {potentialActions.length === 0 ? (
                               <p className="text-center py-8 text-zinc-400 font-bold italic">لا توجد مهام تحتاج للتنفيذ حالياً</p>
                             ) : (
                               potentialActions.map((pa, idx) => (
                                 <div key={idx} className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-start gap-4">
                                    <div className="p-2 rounded-xl bg-red-600/10 text-red-500">
                                       <Zap size={18} />
                                    </div>
                                    <div>
                                       <p className="text-white font-black text-sm">{pa.actions[0]?.split(':')[0] || 'مهمة استراتيجية'}</p>
                                       <p className="text-zinc-500 text-[11px] mt-1">{pa.actions.join(' | ')}</p>
                                    </div>
                                 </div>
                               ))
                             )}
                          </div>

                          <div className="p-8 bg-zinc-950 flex gap-4">
                             <button 
                               onClick={() => setShowExecutionPreview(false)}
                               className="flex-1 py-4 rounded-2xl border border-white/10 text-white font-black text-sm hover:bg-white/5 transition-all"
                             >
                                إلغاء
                             </button>
                             <button 
                               onClick={() => runFounderAILogic(false)}
                               disabled={isProcessing || potentialActions.length === 0}
                               className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-black text-sm hover:bg-red-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                             >
                                {isProcessing ? <RefreshCw className="animate-spin mx-auto" /> : 'تأكيد التنفيذ'}
                             </button>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                  
                {/* Comm Center */}
                  <div className={clsx(
                    "bg-black/40 backdrop-blur-xl border rounded-[2.5rem] p-6 relative overflow-hidden transition-all",
                    militia.gqh?.hasCommCenter ? "border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]" : "border-white/10"
                  )}>
                    {militia.gqh?.hasCommCenter && (
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-[50px] -mr-16 -mt-16 pointer-events-none"></div>
                    )}
                    <h3 className="text-lg font-black text-white italic uppercase tracking-tighter flex items-center gap-2 mb-2">
                       <Radio size={20} className={militia.gqh?.hasCommCenter ? "text-blue-400" : "text-zinc-500"} />
                       مركز الاتصالات والتجسس
                    </h3>
                    <p className="text-xs text-zinc-400 mb-6 leading-relaxed font-medium">
                      يتيح لك التنصت على اتصالات العدو ومعرفة قوتهم قبل الهجوم، ويزيد من فعالية الدفاع.
                      <span className="block mt-1 text-blue-400 font-bold">+15% قوة هجومية (مفعل تلقائياً عند امتلاكه)</span>
                    </p>
                    
                    {militia.gqh?.hasCommCenter ? (
                      <div className="flex items-center justify-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 font-black text-sm">
                        <CheckCircle size={18} />
                        المركز يعمل ومُفعل
                      </div>
                    ) : (
                      <button 
                        onClick={handleBuyCommCenterDirect}
                        disabled={isProcessing || (militia.resources.corruptionMoney || 0) < SHOP_ITEMS.logistics.find(i => i.id === 'm_log_2')?.price!}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                         <ShoppingCart size={18} />
                         تأسيس المركز ({formatNumber(SHOP_ITEMS.logistics.find(i => i.id === 'm_log_2')?.price!)} أموال فساد)
                      </button>
                    )}
                    
                    {/* Intel Bar (Visual representation) */}
                     <div className="mt-6 pt-4 border-t border-white/5">
                        <div className="flex justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                          <span>مستوى الاستخبارات الميدانية</span>
                          <span className={militia.gqh?.hasCommCenter ? "text-blue-400" : "text-zinc-600"}>{militia.gqh?.hasCommCenter ? '100%' : '0%'}</span>
                        </div>
                        <div className="h-2 bg-black rounded-full overflow-hidden border border-white/10">
                           <div className={clsx(
                             "h-full transition-all duration-1000",
                             militia.gqh?.hasCommCenter ? "bg-blue-500 w-full" : "w-0"
                           )}></div>
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
        
        {/* Founder Selection Modal */}
        <AnimatePresence>
          {showFounderModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-4xl bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 space-y-6 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">اختيار الزعيم المؤسس</h3>
                    <p className="text-sm text-zinc-400 font-bold">كل زعيم يمتلك خلفية فريدة ورؤية مختلفة للقيادة.</p>
                  </div>
                  <button onClick={() => setShowFounderModal(false)} className="text-zinc-500 hover:text-red-500 transition-colors">
                    <XCircle size={28} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {customFounders.map((founder) => (
                    <div 
                      key={founder.id}
                      className={clsx(
                        "bg-black/40 border rounded-[2rem] overflow-hidden cursor-pointer transition-all hover:-translate-y-2",
                        selectedFounderTemplate?.id === founder.id ? "border-red-500 shadow-[0_0_30px_rgba(220,38,38,0.2)]" : "border-white/10 hover:border-white/30"
                      )}
                      onClick={() => setSelectedFounderTemplate(founder)}
                    >
                      <div className="h-128 relative">
                        <img src={founder.image} className="w-full h-full object-contain bg-zinc-900/50" alt={founder.name} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
                        <div className="absolute bottom-4 inset-x-4">
                           <h4 className="text-xl font-black text-white italic tracking-tighter">{founder.name}</h4>
                        </div>
                      </div>
                      <div className="p-5">
                         <p className="text-xs text-zinc-400 leading-relaxed font-medium line-clamp-3 mb-4 h-12">
                           {founder.description}
                         </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 pt-6 border-t border-white/10">
                  <button
                    onClick={() => setShowFounderModal(false)}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl transition-all"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => {
                        if (selectedFounderTemplate) {
                            handleSelectFounder(selectedFounderTemplate);
                            setShowFounderModal(false);
                        }
                    }}
                    disabled={isProcessing || !selectedFounderTemplate}
                    className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                  >
                    تأكيد الاختيار
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Admin Edit Founders Modal */}
        <AnimatePresence>
          {showEditFounderModal && profile?.role === 'Admin' && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-5xl bg-zinc-900 border border-red-500/30 rounded-[2.5rem] p-8 space-y-6 max-h-[90vh] flex flex-col"
              >
                <div className="flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                     <div className="p-3 bg-red-600/20 rounded-xl text-red-500">
                        <Settings size={28} />
                     </div>
                     <div>
                       <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">إدارة قائمة الزعماء (صلاحيات الإدارة)</h3>
                       <p className="text-sm text-zinc-400 font-bold">تعديل القائمة العالمية للزعماء المؤسسين المتاحة لجميع اللاعبين.</p>
                     </div>
                  </div>
                  <button onClick={() => setShowEditFounderModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                    <XCircle size={28} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                  {customFounders.map((founder, index) => (
                    <div key={founder.id} className="bg-black/40 border border-white/10 rounded-3xl p-6 relative">
                       <div className="absolute top-6 left-6 text-2xl font-black text-white/5">#{index + 1}</div>
                       <div className="flex flex-col md:flex-row gap-6">
                          <div className="w-32 h-32 rounded-2xl overflow-hidden border border-white/10 shrink-0">
                             <img src={founder.image} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 space-y-4">
                             <div>
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">اسم الزعيم</label>
                                <input 
                                  type="text"
                                  value={founder.name}
                                  onChange={(e) => {
                                      const newList = [...customFounders];
                                      newList[index].name = e.target.value;
                                      setCustomFounders(newList);
                                  }}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-red-500 outline-none"
                                />
                             </div>
                             <div>
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">رابط الصورة</label>
                                <input 
                                  type="text"
                                  value={founder.image}
                                  onChange={(e) => {
                                      const newList = [...customFounders];
                                      newList[index].image = e.target.value;
                                      setCustomFounders(newList);
                                  }}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-red-500 outline-none"
                                />
                             </div>
                             <div>
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">وصف الشخصية ورؤيتها</label>
                                <textarea 
                                  value={founder.description}
                                  onChange={(e) => {
                                      const newList = [...customFounders];
                                      newList[index].description = e.target.value;
                                      setCustomFounders(newList);
                                  }}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-red-500 outline-none h-24 resize-none"
                                />
                             </div>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 shrink-0 pt-4 border-t border-white/10">
                  <button
                    onClick={() => {
                        // Reset to defaults or fetch again
                        setCustomFounders([...DEFAULT_FOUNDERS]);
                    }}
                    className="py-4 px-6 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl transition-all"
                  >
                    إعادة تعيين للافتراضي
                  </button>
                  <button
                    onClick={() => handleUpdateAdminFounders(customFounders)}
                    disabled={isProcessing}
                    className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl transition-all disabled:opacity-50"
                  >
                    حفظ التعديلات وتحديث القائمة
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Item Modal */}
        <AnimatePresence>
          {editingItem && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative"
              >
                {/* Header */}
                <div className="p-8 border-b border-white/5 bg-gradient-to-br from-blue-600/10 to-transparent flex justify-between items-center text-right" dir="rtl">
                  <div>
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">تعديل مواصفات العنصر</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">المعرف الفريد: {editingItem.item.id}</p>
                  </div>
                  <button onClick={() => setEditingItem(null)} className="text-zinc-600 hover:text-white transition-colors">
                    <XCircle size={24} />
                  </button>
                </div>

                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar text-right" dir="rtl">
                  <div className="space-y-4">
                    <div className="flex gap-6 items-start">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/10 bg-black shrink-0 shadow-2xl">
                        <img src={editingItem.item.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block text-right">اسم العنصر</label>
                          <input
                            type="text"
                            value={editingItem.item.name}
                            onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, name: e.target.value } })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-white/30 transition-all text-right"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block text-right">القسم</label>
                      <select
                        value={editingItem.category}
                        onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-white/20 transition-all text-right"
                      >
                        <option value="weapons">أسلحة</option>
                        <option value="armor">الدروع</option>
                        <option value="vehicles">المركبات</option>
                        <option value="logistics">الدعم اللوجيستي</option>
                        <option value="aircraft">الطائرات</option>
                        <option value="intelligence">الاستخبارات</option>
                        <option value="fortifications">التحصينات</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block text-right">السعر الحالي</label>
                       <input
                         type="number"
                         value={editingItem.item.price}
                         onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, price: Number(e.target.value) } })}
                         className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-yellow-500 font-bold outline-none focus:border-yellow-500/30 transition-all font-mono text-right"
                       />
                    </div>
                    {editingItem.category === 'logistics' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block text-right">الكمية لكل وحدة</label>
                        <input
                          type="number"
                          value={editingItem.item.quantity || 0}
                          onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, quantity: Number(e.target.value) } })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-green-400 font-bold outline-none focus:border-green-500/30 transition-all font-mono text-right"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {(editingItem.category === 'weapons' || editingItem.category === 'armor' || editingItem.category === 'vehicles' || editingItem.category === 'aircraft' || editingItem.category === 'fortifications') && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block text-right">القوة</label>
                        <input
                          type="number"
                          value={editingItem.item.power || 0}
                          onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, power: Number(e.target.value) } })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-red-500 font-bold outline-none focus:border-red-500/30 transition-all text-right"
                        />
                      </div>
                    )}
                    {(editingItem.category === 'armor' || editingItem.category === 'vehicles' || editingItem.category === 'aircraft' || editingItem.category === 'fortifications') && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block text-right">الدفاع</label>
                        <input
                          type="number"
                          value={editingItem.item.defense || 0}
                          onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, defense: Number(e.target.value) } })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-blue-500 font-bold outline-none focus:border-blue-500/30 transition-all text-right"
                        />
                      </div>
                    )}
                    {editingItem.category === 'intelligence' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block text-right">قوة الاستطلاع والتجسس</label>
                        <input
                          type="number"
                          value={editingItem.item.power || 0}
                          onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, power: Number(e.target.value) } })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-fuchsia-500 font-bold outline-none focus:border-fuchsia-500/30 transition-all text-right"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block text-right">رابط الصورة المعروضة</label>
                    <input
                      type="text"
                      value={editingItem.item.image}
                      onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, image: e.target.value } })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-zinc-400 font-bold outline-none focus:border-white/30 transition-all text-[10px] text-right"
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-8 bg-black/40 flex gap-4">
                  <button
                    onClick={() => setEditingItem(null)}
                    className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-black rounded-2xl transition-all"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => handleUpdateShopItem(editingItem.category, editingItem.item)}
                    disabled={isProcessing}
                    className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-50"
                  >
                    {isProcessing ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Item Modal */}
        <AnimatePresence>
          {showAddItemModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative"
              >
                <div className="p-8 border-b border-white/5 bg-gradient-to-br from-white/5 to-transparent flex justify-between items-center text-right" dir="rtl">
                  <div>
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">إضافة عنصر جديد</h3>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">المتجر العسكري - {newItemData.category}</p>
                  </div>
                  <button onClick={() => setShowAddItemModal(false)} className="text-zinc-600 hover:text-white transition-colors">
                    <XCircle size={24} />
                  </button>
                </div>

                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar text-right" dir="rtl">
                  <div className="space-y-2 text-right">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block text-right">القسم</label>
                    <select
                      value={newItemData.category}
                      onChange={(e) => setNewItemData({ ...newItemData, category: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-white/20 transition-all text-right"
                    >
                      <option value="weapons">أسلحة</option>
                      <option value="armor">الدروع</option>
                      <option value="vehicles">المركبات</option>
                      <option value="logistics">الدعم اللوجيستي</option>
                      <option value="aircraft">الطائرات</option>
                      <option value="intelligence">الاستخبارات</option>
                      <option value="fortifications">التحصينات</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block text-right">اسم العنصر</label>
                       <input
                         type="text"
                         value={newItemData.name}
                         onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
                         className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-white/20 transition-all text-right"
                         placeholder="مثال: بندقية قنص"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block text-right">السعر</label>
                       <input
                         type="number"
                         value={newItemData.price}
                         onChange={(e) => setNewItemData({ ...newItemData, price: Number(e.target.value) })}
                         className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-white/20 transition-all font-mono text-right"
                       />
                    </div>
                  </div>

                  <div className="space-y-2 text-right">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block text-right">رابط الصورة</label>
                    <input
                      type="text"
                      value={newItemData.image}
                      onChange={(e) => setNewItemData({ ...newItemData, image: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-white/20 transition-all text-xs text-right"
                      placeholder="URL..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {(newItemData.category === 'weapons' || newItemData.category === 'armor' || newItemData.category === 'vehicles' || newItemData.category === 'aircraft' || newItemData.category === 'fortifications') && (
                      <div className="space-y-2 text-right">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block text-right">القوة الهجومية</label>
                        <input
                          type="number"
                          value={newItemData.power}
                          onChange={(e) => setNewItemData({ ...newItemData, power: Number(e.target.value) })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-red-400 font-bold outline-none focus:border-red-500/30 transition-all text-right"
                        />
                      </div>
                    )}
                    {(newItemData.category === 'armor' || newItemData.category === 'vehicles' || newItemData.category === 'aircraft' || newItemData.category === 'fortifications') && (
                      <div className="space-y-2 text-right">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block text-right">القوة الدفاعية</label>
                        <input
                          type="number"
                          value={newItemData.defense}
                          onChange={(e) => setNewItemData({ ...newItemData, defense: Number(e.target.value) })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-blue-400 font-bold outline-none focus:border-blue-500/30 transition-all text-right"
                        />
                      </div>
                    )}
                    {newItemData.category === 'logistics' && (
                      <>
                        <div className="space-y-2 text-right">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block text-right">النوع اللوجستي</label>
                          <select
                            value={newItemData.logisticsType}
                            onChange={(e) => setNewItemData({ ...newItemData, logisticsType: e.target.value as any })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-white/20 transition-all text-right"
                          >
                            <option value="ammo">ذخيرة</option>
                            <option value="fuel">وقود</option>
                            <option value="food">طعام</option>
                            <option value="water">ماء</option>
                            <option value="medicine">أدوية</option>
                            <option value="comm">مركز اتصالات</option>
                          </select>
                        </div>
                        <div className="space-y-2 text-right">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block text-right">الكمية لكل وحدة</label>
                          <input
                            type="number"
                            value={newItemData.quantity}
                            onChange={(e) => setNewItemData({ ...newItemData, quantity: Number(e.target.value) })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-green-400 font-bold outline-none focus:border-green-500/30 transition-all font-mono text-right"
                          />
                        </div>
                      </>
                    )}
                    {newItemData.category === 'intelligence' && (
                      <div className="space-y-2 text-right">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block text-right">قوة الاستطلاع والتجسس</label>
                        <input
                          type="number"
                          value={newItemData.power}
                          onChange={(e) => setNewItemData({ ...newItemData, power: Number(e.target.value) })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-fuchsia-400 font-bold outline-none focus:border-fuchsia-500/30 transition-all text-right"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-8 bg-black/40 flex gap-4">
                  <button
                    onClick={() => setShowAddItemModal(false)}
                    className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-black rounded-2xl transition-all"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleAddShopItem}
                    disabled={isProcessing}
                    className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-red-600/20 active:scale-95 disabled:opacity-50"
                  >
                    {isProcessing ? 'جاري التنفيذ...' : 'إضافة للمعرض'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {showGeneralModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 space-y-6 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-black text-white italic uppercase">تعيين جنرال (القيادة العسكرية AI)</h3>
                  <button onClick={() => setShowGeneralModal(false)} className="text-zinc-500 hover:text-white">
                    <XCircle size={24} />
                  </button>
                </div>
                <p className="text-zinc-400 text-sm">اختر جندياً برتبة "لواء" ليتولى القيادة العسكرية وإدارة المعارك تلقائياً.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  {militia.soldiers.filter(s => s.rank === 'لواء').map(soldier => (
                    <div key={soldier.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-blue-500">
                        <img src={soldier.image} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-black text-white">{soldier.name}</h4>
                        <p className="text-xs text-blue-500 font-bold">{soldier.rank}</p>
                      </div>
                      <button
                        onClick={() => handleAssignGeneral(soldier.id)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl transition-all"
                      >
                        تعيين
                      </button>
                    </div>
                  ))}
                  {militia.soldiers.filter(s => s.rank === 'لواء').length === 0 && (
                    <div className="col-span-full p-8 text-center text-zinc-500 bg-white/5 rounded-2xl border border-white/10">
                      لا يوجد جنود برتبة "لواء" حالياً. قم بترقية أحد الجنود أولاً.
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}

          {showAIBattleModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-2xl bg-zinc-900 border border-blue-500/30 rounded-[2.5rem] p-8 space-y-6"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-500">
                      <Zap size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white italic uppercase">إدارة المعارك AI</h3>
                      <p className="text-sm text-zinc-400">الجنرال: {militia.soldiers.find(s => s.id === militia.generalId)?.name}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowAIBattleModal(false)} className="text-zinc-500 hover:text-white">
                    <XCircle size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setShowAIBattleModal(false);
                      setActiveTab('shop');
                      setShopCategory('logistics');
                    }}
                    className="p-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-right transition-all group"
                  >
                    <Package className="text-green-500 mb-4 group-hover:scale-110 transition-transform" size={32} />
                    <h4 className="font-black text-white mb-1">شراء دعم لوجستي</h4>
                    <p className="text-xs text-zinc-400">شراء أدوية وذخيرة ووقود</p>
                  </button>

                  <button
                    onClick={() => {
                      setShowAIBattleModal(false);
                      handleHealAllSoldiers();
                    }}
                    disabled={isProcessing || (Math.max(0, (militia.resources.medicine || 0)) || (militia.inventory?.logistics?.m_log_3 || 0)) < Math.ceil(militia.soldiers.filter(s => s.health < 100).reduce((acc, s) => acc + (100 - s.health), 0) / (5 + (militia.gqh?.facilities?.medicalLevel || 0)))}
                    className="p-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-right transition-all group disabled:opacity-50"
                  >
                    <Heart className="text-pink-500 mb-4 group-hover:scale-110 transition-transform" size={32} />
                    <h4 className="font-black text-white mb-1">علاج جميع المصابين</h4>
                    <p className="text-xs text-zinc-400">استخدام الأدوية لعلاج الجميع</p>
                  </button>

                  <button
                    onClick={handleAutoCreateSquads}
                    disabled={isProcessing}
                    className="p-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-right transition-all group disabled:opacity-50"
                  >
                    <Users className="text-blue-500 mb-4 group-hover:scale-110 transition-transform" size={32} />
                    <h4 className="font-black text-white mb-1">تكوين الفرق تلقائياً</h4>
                    <p className="text-xs text-zinc-400">توزيع الجنود والمركبات بذكاء</p>
                  </button>

                  <button
                    onClick={() => {
                      setShowAIBattleModal(false);
                      setActiveTab('combat');
                    }}
                    className="p-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-right transition-all group"
                  >
                    <Swords className="text-red-500 mb-4 group-hover:scale-110 transition-transform" size={32} />
                    <h4 className="font-black text-white mb-1">إدارة المعارك</h4>
                    <p className="text-xs text-zinc-400">توجيه الهجمات والدفاع</p>
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {showSquadModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 space-y-6 overflow-y-auto max-h-[90vh]"
              >
                <h3 className="text-2xl font-black text-white italic uppercase">{editingSquadId ? 'تعديل الفرقة' : 'تكوين فرقة جديدة'}</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">اسم الفرقة</label>
                    <input
                      type="text"
                      value={newSquad.name}
                      onChange={(e) => setNewSquad({ ...newSquad, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-red-500 transition-colors outline-none"
                      placeholder="أدخل اسم الفرقة..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">اختر القائد (من الجنود)</label>
                    <div className="grid grid-cols-4 gap-2">
                      {militia.soldiers.filter(s => {
                        const assignedSoldierIds = militia.squads
                          .filter(sq => sq.id !== editingSquadId)
                          .flatMap(sq => [sq.leaderId, ...sq.soldierIds]);
                        return !assignedSoldierIds.includes(s.id);
                      }).map(s => (
                        <button
                          key={s.id}
                          onClick={() => setNewSquad({ ...newSquad, leaderId: s.id })}
                          className={clsx(
                            "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                            newSquad.leaderId === s.id ? "border-yellow-500 scale-95" : "border-transparent opacity-50 hover:opacity-100"
                          )}
                        >
                          <img src={s.image} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-1 left-1 right-1 text-center">
                            <p className="text-[8px] font-black text-white truncate">{s.name}</p>
                            <p className="text-[8px] font-bold text-yellow-500 truncate">{s.rank || 'جندي'}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">اختر الجنود (حتى 4)</label>
                    <div className="grid grid-cols-4 gap-2">
                      {militia.soldiers.filter(s => {
                        const assignedSoldierIds = militia.squads
                          .filter(sq => sq.id !== editingSquadId)
                          .flatMap(sq => [sq.leaderId, ...sq.soldierIds]);
                        return s.id !== newSquad.leaderId && !assignedSoldierIds.includes(s.id);
                      }).map(s => (
                        <button
                          key={s.id}
                          onClick={() => {
                            const ids = newSquad.soldierIds.includes(s.id)
                              ? newSquad.soldierIds.filter(id => id !== s.id)
                              : [...newSquad.soldierIds, s.id].slice(0, 4);
                            setNewSquad({ ...newSquad, soldierIds: ids });
                          }}
                          className={clsx(
                            "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                            newSquad.soldierIds.includes(s.id) ? "border-red-500 scale-95" : "border-transparent opacity-50 hover:opacity-100"
                          )}
                        >
                          <img src={s.image} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-1 left-1 right-1 text-center">
                            <p className="text-[8px] font-black text-white truncate">{s.name}</p>
                            <p className="text-[8px] font-bold text-zinc-300 truncate">{s.rank || 'جندي'}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">اختر المركبة</label>
                    <div className="grid grid-cols-3 gap-2">
                      {militia.vehicles.filter(v => {
                        const assignedVehicleIds = militia.squads
                          .filter(sq => sq.id !== editingSquadId)
                          .map(sq => sq.vehicleId)
                          .filter(Boolean);
                        return !assignedVehicleIds.includes(v.id);
                      }).map(v => (
                        <button
                          key={v.id}
                          onClick={() => setNewSquad({ ...newSquad, vehicleId: newSquad.vehicleId === v.id ? '' : v.id })}
                          className={clsx(
                            "p-3 rounded-xl border-2 transition-all text-xs font-bold",
                            newSquad.vehicleId === v.id ? "bg-blue-600/20 border-blue-500 text-white" : "bg-white/5 border-transparent text-zinc-500"
                          )}
                        >
                          مركبة {v.id.substring(0, 5)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowSquadModal(false)}
                    className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white font-black rounded-2xl transition-all"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleCreateSquad}
                    disabled={isProcessing || !newSquad.name || !newSquad.leaderId}
                    className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl transition-all disabled:opacity-50"
                  >
                    {isProcessing ? 'جاري التكوين...' : editingSquadId ? 'تحديث الفرقة' : 'تكوين الفرقة'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Global Founder Editor Modal (Admin Only) */}
        <AnimatePresence>
          {showEditFounderModal && profile?.role === 'Admin' && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-5xl bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 space-y-6 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">إدارة قائمة الزعماء المؤسسين</h3>
                    <p className="text-sm text-zinc-400 font-bold">تعديل القائمة العالمية التي تظهر لجميع اللاعبين.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => {
                        const newFounder = {
                          id: `founder_${Date.now()}`,
                          name: 'زعيم جديد',
                          description: 'وصف الزعيم الجديد...',
                          image: ''
                        };
                        setCustomFounders([...customFounders, newFounder]);
                      }}
                      className="px-4 py-2 bg-green-600/20 hover:bg-green-600 text-green-500 hover:text-white border border-green-500/30 rounded-xl font-bold transition-all text-xs"
                    >
                      إضافة زعيم
                    </button>
                    <button onClick={() => setShowEditFounderModal(false)} className="text-zinc-500 hover:text-red-500 transition-colors">
                      <XCircle size={28} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {customFounders.map((founder, index) => (
                    <div key={founder.id} className="bg-black/40 border border-white/10 rounded-2xl p-6 space-y-4">
                       <div className="h-128 rounded-xl overflow-hidden bg-zinc-800">
                          <img src={founder.image} className="w-full h-full object-contain" alt={founder.name} />
                       </div>
                       <div className="space-y-3">
                          <input 
                            type="text" 
                            value={founder.name}
                            onChange={(e) => {
                              const newList = [...customFounders];
                              newList[index] = { ...founder, name: e.target.value };
                              setCustomFounders(newList);
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-red-500"
                            placeholder="اسم الزعيم"
                          />
                          <textarea 
                            value={founder.description}
                            onChange={(e) => {
                              const newList = [...customFounders];
                              newList[index] = { ...founder, description: e.target.value };
                              setCustomFounders(newList);
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white h-24 resize-none outline-none focus:border-red-500"
                            placeholder="وصف الزعيم"
                          />
                          <input 
                            type="text" 
                            value={founder.image}
                            onChange={(e) => {
                              const newList = [...customFounders];
                              newList[index] = { ...founder, image: e.target.value };
                              setCustomFounders(newList);
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-zinc-400 outline-none focus:border-red-500"
                            placeholder="رابط الصورة"
                          />
                          <button 
                            onClick={() => {
                              const newList = customFounders.filter(f => f.id !== founder.id);
                              setCustomFounders(newList);
                            }}
                            className="w-full py-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 rounded-xl text-[10px] font-bold transition-all"
                          >
                            حذف الزعيم
                          </button>
                       </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 pt-6 border-t border-white/10">
                   <button 
                     onClick={() => setShowEditFounderModal(false)}
                     className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white font-black rounded-2xl transition-all"
                   >
                     إلغاء التعديلات
                   </button>
                   <button 
                     onClick={() => {
                       handleUpdateAdminFounders(customFounders);
                       setShowEditFounderModal(false);
                     }}
                     className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl transition-all shadow-lg"
                   >
                     حفظ القائمة العالمية
                   </button>
                </div>
              </motion.div>
            </div>
          )}

        </AnimatePresence>

        {/* All Militias Tab */}
      </div>
    </div>
  </div>
);
}
