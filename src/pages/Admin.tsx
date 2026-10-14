import React, { useEffect, useState, useMemo } from 'react';
import { 
  collection, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc, 
  serverTimestamp, runTransaction, writeBatch, increment, addDoc, arrayRemove 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuthStore, UserProfile, Militia } from '../store/useAuthStore';
import { 
  ShieldCheck, Edit2, Trash2, X, Save, Plus, Vote, Power, Timer, 
  CheckCircle, Megaphone, Send, Users, UserMinus, Database, RefreshCw, 
  Download, Search, Activity, BarChart3, Eye, Upload, Link, AlertTriangle, 
  MoreVertical, UserPlus, ShieldAlert, Ban, Check, Globe, Calendar, 
  Lock, Unlock, DollarSign, Swords, Zap, TrendingUp, Settings, FileText, ChevronLeft, ChevronRight, Sliders, GitMerge
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatMoney, formatDate, getRealisticAvatar, safeToMillis } from '../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import { COUNTRIES } from '../constants/countries';
import { runForceFounderSync } from '../lib/forceFounderSync';
import { ImageManager } from '../components/admin/ImageManager';
import { ControlCenter } from '../components/admin/ControlCenter';
import { AnalyticsDashboard } from '../components/admin/AnalyticsDashboard';
import { AddUserModal } from '../components/admin/AddUserModal';
import { UserEditModal } from '../components/admin/UserEditModal';
import { GangManagerModal } from '../components/admin/GangManagerModal';
import { MilitiaManagerModal } from '../components/admin/MilitiaManagerModal';
import { GovernmentManager } from '../components/admin/GovernmentManager';
import { EconomyManager } from '../components/admin/EconomyManager';
import { BroadcastManager } from '../components/admin/BroadcastManager';
import { NPCManager } from '../components/admin/NPCManager';

export default function Admin() {
  const { t } = useTranslation();
  const { profile, user } = useAuthStore();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [gangs, setGangs] = useState<any[]>([]);
  const [govData, setGovData] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [startingMoney, setStartingMoney] = useState<number>(5000000);

  // Active Admin Tab
  const [activeAdminTab, setActiveAdminTab] = useState<
    'overview' | 'users' | 'npcs' | 'gangs' | 'government' | 'militias' | 'economy' | 'broadcasts' | 'database' | 'images' | 'cms' | 'analytics'
  >('overview');

  // Search & Pagination
  const [userSearch, setUserSearch] = useState('');
  const [gangSearch, setGangSearch] = useState('');
  const [militiaSearch, setMilitiaSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const usersPerPage = 25;

  // Modals & CRUD state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  const [showAddGangModal, setShowAddGangModal] = useState(false);
  const [editingGang, setEditingGang] = useState<any | null>(null);
  const [deletingGang, setDeletingGang] = useState<string | null>(null);

  const [showAddMilitiaModal, setShowAddMilitiaModal] = useState(false);
  const [editingMilitiaData, setEditingMilitiaData] = useState<{ user: UserProfile; militia: Militia } | null>(null);

  const [linkingUser, setLinkingUser] = useState<UserProfile | null>(null);
  const [targetMergeUid, setTargetMergeUid] = useState<string>('');
  const [primaryToKeep, setPrimaryToKeep] = useState<'source' | 'target'>('source');
  const [destinationUidChoice, setDestinationUidChoice] = useState<'source' | 'target'>('source');
  const [isMerging, setIsMerging] = useState<boolean>(false);

  // User Action Modals State
  const [messageTargetUser, setMessageTargetUser] = useState<UserProfile | null>(null);
  const [directMessageText, setDirectMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const [gangAssignUser, setGangAssignUser] = useState<UserProfile | null>(null);
  const [selectedGangIdForAssign, setSelectedGangIdForAssign] = useState<string>('');

  const [customFundUser, setCustomFundUser] = useState<UserProfile | null>(null);
  const [customFundAmount, setCustomFundAmount] = useState<number>(10000000);
  const [customFundType, setCustomFundType] = useState<'cleanMoney' | 'dirtyMoney' | 'bankBalance' | 'gold' | 'reputation'>('cleanMoney');
  const [resetGangUser, setResetGangUser] = useState<UserProfile | null>(null);
  const [databaseRestoreFile, setDatabaseRestoreFile] = useState<File | null>(null);
  const [activeUserMenu, setActiveUserMenu] = useState<string | null>(null);

  // Field Sync State
  const [availableSyncFields, setAvailableSyncFields] = useState<{ key: string; label: string }[]>([]);
  const [selectedSyncFields, setSelectedSyncFields] = useState<string[]>([]);
  const [isSyncingFields, setIsSyncingFields] = useState(false);

  // Admin access validation
  const isAdmin = (profile?.role === 'Admin' || user?.email === 'soft4net2016@gmail.com') && (
    user?.email === 'imvu2024k@gmail.com' || 
    user?.email === 'soft4net2016@gmail.com' || 
    user?.email === 'disneydesign2016@gmail.com' || 
    user?.email === 'zoomnet5@gmail.com'
  );

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as UserProfile[];
      setUsers(usersData);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'users');
    } finally {
      setLoading(false);
    }
  };

  const fetchGangs = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'gangs'));
      const gangsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGangs(gangsData);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'gangs');
    }
  };

  const fetchGovData = async () => {
    try {
      const docRef = doc(db, 'government', 'current');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setGovData(docSnap.data());
      } else {
        const initialGov = {
          primeMinisterId: '',
          primeMinisterName: '',
          primeMinisterGangId: '',
          parliamentSeats: 100,
          budget: 1000000000,
          electionActive: false,
          candidates: []
        };
        await setDoc(docRef, initialGov);
        setGovData(initialGov);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'government/current');
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const docRef = doc(db, 'server_settings', 'backup');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSyncStatus(data);
        if (data.startingMoney !== undefined) {
          setStartingMoney(data.startingMoney);
        }
      }
    } catch (error) {
      console.error('Error fetching sync status', error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchGovData();
      fetchGangs();
      fetchSyncStatus();
    }
  }, [isAdmin]);

  // Extract fields for field synchronization
  useEffect(() => {
    if (users.length > 0) {
      const knownFieldsMap: Record<string, string> = {
        health: 'الصحة',
        gangId: 'العصابة',
        gangName: 'اسم العصابة',
        gangRole: 'رتبة العصابة',
        dirtyMoney: 'الأموال القذرة',
        cleanMoney: 'الأموال النظيفة',
        bankBalance: 'رصيد البنك',
        level: 'المستوى',
        reputation: 'الاحترام',
        role: 'الرتبة',
        displayName: 'الاسم',
        email: 'البريد الإلكتروني',
        militia: 'المليشيا',
        documents: 'الوثائق',
        wantedStars: 'نجوم الملاحقة',
        isImprisoned: 'حالة السجن'
      };
      setAvailableSyncFields(
        Object.entries(knownFieldsMap).map(([key, label]) => ({ key, label }))
      );
    }
  }, [users]);

  // Filtered & Paginated Users
  const filteredUsers = useMemo(() => {
    const q = (userSearch || '').toLowerCase().trim();
    if (!q) return users;
    return users.filter(u => 
      (u.displayName || '').toLowerCase().includes(q) || 
      (u.uid || '').includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const totalUserPages = Math.ceil(filteredUsers.length / usersPerPage) || 1;
  const paginatedUsers = filteredUsers.slice((userPage - 1) * usersPerPage, userPage * usersPerPage);

  // User CRUD Handlers
  const handleUserAdded = (newUser: UserProfile) => {
    setUsers(prev => [newUser, ...prev]);
  };

  const handleUserSaved = (updatedUser: UserProfile) => {
    setUsers(prev => prev.map(u => u.uid === updatedUser.uid ? updatedUser : u));
  };

  const confirmDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      await deleteDoc(doc(db, 'users', deletingUser));
      await deleteDoc(doc(db, 'users_public', deletingUser));
      setUsers(prev => prev.filter(u => u.uid !== deletingUser));
      toast.success('تم حذف اللاعب نهائياً من قاعدة البيانات');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${deletingUser}`);
      toast.error('فشل في حذف اللاعب');
    } finally {
      setDeletingUser(null);
    }
  };

  const toggleJailUser = async (targetUser: UserProfile) => {
    const newStatus = !targetUser.isImprisoned;
    const jailEndTime = newStatus ? Date.now() + 3600000 * 2 : null;
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), {
        isImprisoned: newStatus,
        jailTimeEnd: jailEndTime,
        wantedStars: newStatus ? 5 : 0
      });
      await updateDoc(doc(db, 'users_public', targetUser.uid), {
        isImprisoned: newStatus,
        jailTimeEnd: jailEndTime,
        wantedStars: newStatus ? 5 : 0
      });
      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? {
        ...u,
        isImprisoned: newStatus,
        jailTimeEnd: jailEndTime,
        wantedStars: newStatus ? 5 : 0
      } : u));
      toast.success(newStatus ? 'تم إيداع اللاعب في السجن' : 'تم الإفراج عن اللاعب');
    } catch (error) {
      toast.error('فشل في تعديل حالة السجن');
    }
  };

  const quickFundUser = async (targetUser: UserProfile, amount: number) => {
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), {
        cleanMoney: increment(amount)
      });
      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? {
        ...u,
        cleanMoney: (u.cleanMoney || 0) + amount
      } : u));
      toast.success(`تم شحن ${formatMoney(amount)} للاعب ${targetUser.displayName}`);
    } catch (error) {
      toast.error('فشل في شحن الرصيد');
    }
  };

  const handleMergeUsers = async () => {
    if (!linkingUser || !targetMergeUid) {
      toast.error('يرجى تحديد كلا الحسابين لإتمام عملية الدمج');
      return;
    }

    const secondaryUser = users.find(u => u.uid === targetMergeUid);
    if (!secondaryUser) {
      toast.error('الحساب الآخر غير موجود في النظام');
      return;
    }

    if (linkingUser.uid === targetMergeUid) {
      toast.error('لا يمكن دمج الحساب مع نفسه');
      return;
    }

    setIsMerging(true);
    try {
      // account1: linkingUser (الحساب الأول / الحالي)
      // account2: secondaryUser (الحساب المعتمد / الذي تم ضغط دمج عليه)
      
      // Determine chosen profile data to adopt
      const chosenProfile = primaryToKeep === 'target' ? secondaryUser : linkingUser;
      const discardedProfile = primaryToKeep === 'target' ? linkingUser : secondaryUser;

      // Determine which UID to keep:
      // If current user is logged in (auth.currentUser), preserve current user's UID so manager login session remains active and adopted immediately!
      const currentActiveUid = user?.uid;
      let finalRetainedUid: string;
      let deleteUid: string;

      if (currentActiveUid === linkingUser.uid) {
        finalRetainedUid = currentActiveUid;
        deleteUid = secondaryUser.uid;
      } else if (currentActiveUid === secondaryUser.uid) {
        finalRetainedUid = currentActiveUid;
        deleteUid = linkingUser.uid;
      } else {
        finalRetainedUid = destinationUidChoice === 'source' ? linkingUser.uid : secondaryUser.uid;
        deleteUid = finalRetainedUid === linkingUser.uid ? secondaryUser.uid : linkingUser.uid;
      }

      // Prepare full profile data to adopt
      const profileToAdopt: UserProfile = {
        ...chosenProfile,
        uid: finalRetainedUid,
        email: chosenProfile.email || (finalRetainedUid === linkingUser.uid ? linkingUser.email : secondaryUser.email)
      };

      // 1. Write the chosen profile data into the retained UID document
      await setDoc(doc(db, 'users', finalRetainedUid), {
        ...profileToAdopt,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 2. Sync to users_public
      try {
        await setDoc(doc(db, 'users_public', finalRetainedUid), {
          uid: finalRetainedUid,
          displayName: profileToAdopt.displayName || 'Unknown',
          level: profileToAdopt.level || 1,
          role: profileToAdopt.role || 'Criminal',
          reputation: profileToAdopt.reputation || 0,
          photoURL: profileToAdopt.photoURL || null,
          gender: profileToAdopt.gender || 'male',
          gangId: profileToAdopt.gangId || null,
          gangName: profileToAdopt.gangName || null,
          health: profileToAdopt.health ?? 100
        }, { merge: true });
      } catch (e) {
        console.warn('Error updating users_public:', e);
      }

      // 3. Delete the discarded / duplicate profile document if different
      if (deleteUid && deleteUid !== finalRetainedUid) {
        await deleteDoc(doc(db, 'users', deleteUid));
        try {
          await deleteDoc(doc(db, 'users_public', deleteUid));
        } catch (e) {
          console.warn('Error deleting discarded users_public:', e);
        }
      }

      // 4. If current admin was part of this merge, immediately update authStore so they are playing as the adopted account!
      if (currentActiveUid === finalRetainedUid || currentActiveUid === deleteUid) {
        useAuthStore.setState({ profile: profileToAdopt });
      }

      // 5. Update local state in table
      setUsers(prev => prev
        .filter(u => u.uid !== deleteUid)
        .map(u => u.uid === finalRetainedUid ? profileToAdopt : u)
      );

      toast.success(`تم دمج الحسابين بنجاح! تم اعتماد ${chosenProfile.displayName} كلاعب أساسي وحذف الحساب الآخر.`);
      setLinkingUser(null);
    } catch (error) {
      console.error('Merge error:', error);
      toast.error('فشل في عملية استبدال ودمج الحسابين');
    } finally {
      setIsMerging(false);
    }
  };

  const healAndRestoreUser = async (targetUser: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), {
        health: 100,
        energy: 100,
        fatigue: 0,
        hospitalizedUntil: null
      });
      try {
        await updateDoc(doc(db, 'users_public', targetUser.uid), {
          health: 100,
          hospitalizedUntil: null
        });
      } catch (e) {}
      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? {
        ...u,
        health: 100,
        energy: 100,
        fatigue: 0,
        hospitalizedUntil: undefined
      } : u));
      toast.success(`تم استشفاء ${targetUser.displayName} بالكامل وشحن طاقته 100%`);
    } catch (error) {
      toast.error('فشل في علاج اللاعب');
    }
  };

  const clearWantedStars = async (targetUser: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), {
        wantedStars: 0,
        warrants: false
      });
      try {
        await updateDoc(doc(db, 'users_public', targetUser.uid), {
          wantedStars: 0
        });
      } catch (e) {}
      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, wantedStars: 0, warrants: false } : u));
      toast.success(`تم تصفير نجوم المطلوبية للاعب ${targetUser.displayName}`);
    } catch (error) {
      toast.error('فشل في تصفير المطلوبية');
    }
  };

  const setMaxWantedStars = async (targetUser: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), {
        wantedStars: 5,
        warrants: true
      });
      try {
        await updateDoc(doc(db, 'users_public', targetUser.uid), {
          wantedStars: 5
        });
      } catch (e) {}
      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, wantedStars: 5, warrants: true } : u));
      toast.warning(`تم رفع نجوم المطلوبية للحد الأقصى (5 نجوم) للاعب ${targetUser.displayName}`);
    } catch (error) {
      toast.error('فشل في تعديل المطلوبية');
    }
  };

  const addGoldToUser = async (targetUser: UserProfile, amount: number) => {
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), {
        gold: increment(amount)
      });
      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, gold: (u.gold || 0) + amount } : u));
      toast.success(`تم إضافة ${amount.toLocaleString()} ذهب للاعب ${targetUser.displayName}`);
    } catch (error) {
      toast.error('فشل في شحن الذهب');
    }
  };

  const addReputationToUser = async (targetUser: UserProfile, amount: number) => {
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), {
        reputation: increment(amount)
      });
      try {
        await updateDoc(doc(db, 'users_public', targetUser.uid), {
          reputation: increment(amount)
        });
      } catch (e) {}
      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, reputation: (u.reputation || 0) + amount } : u));
      toast.success(`تم إضافة ${amount.toLocaleString()} نقطة احترام للاعب ${targetUser.displayName}`);
    } catch (error) {
      toast.error('فشل في شحن الاحترام');
    }
  };

  const toggleAdminRole = async (targetUser: UserProfile) => {
    const newRole = targetUser.role === 'Admin' ? 'Criminal' : 'Admin';
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), { role: newRole });
      try {
        await updateDoc(doc(db, 'users_public', targetUser.uid), { role: newRole });
      } catch (e) {}
      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, role: newRole } : u));
      toast.success(`تم تغيير رتبة ${targetUser.displayName} إلى ${newRole}`);
    } catch (error) {
      toast.error('فشل في تعديل الرتبة');
    }
  };

  const leaveGangUser = async (targetUser: UserProfile) => {
    if (!targetUser.gangId) {
      toast.info('اللاعب غير منتمي لأي عصابة');
      return;
    }
    const oldGangId = targetUser.gangId;
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), {
        gangId: null,
        gangName: null,
        gangRole: null
      });
      try {
        await updateDoc(doc(db, 'users_public', targetUser.uid), {
          gangId: null,
          gangRole: null
        });
      } catch (e) {}
      try {
        await updateDoc(doc(db, 'gangs', oldGangId), {
          members: arrayRemove(targetUser.uid)
        });
      } catch (e) {}
      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? {
        ...u,
        gangId: undefined,
        gangName: undefined,
        gangRole: undefined
      } : u));
      fetchGangs();
      toast.success(`تم فصل ${targetUser.displayName} من العصابة`);
    } catch (error) {
      toast.error('فشل في فصل اللاعب من العصابة');
    }
  };

  const toggleBanUser = async (targetUser: UserProfile) => {
    const isBanned = !(targetUser as any).isBanned;
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), { isBanned });
      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, isBanned } : u));
      toast.success(isBanned ? `تم حظر وتجميد حساب ${targetUser.displayName}` : `تم فك الحظر عن حساب ${targetUser.displayName}`);
    } catch (error) {
      toast.error('فشل في تعديل حالة الحظر');
    }
  };

  const resetUserMoney = async (targetUser: UserProfile) => {
    if (!window.confirm(`هل أنت متأكد من تصفير ثروة اللاعب ${targetUser.displayName} بالكامل؟`)) return;
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), {
        cleanMoney: 0,
        dirtyMoney: 0,
        bankBalance: 0,
        dirtyVaultBalance: 0
      });
      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? {
        ...u,
        cleanMoney: 0,
        dirtyMoney: 0,
        bankBalance: 0,
        dirtyVaultBalance: 0
      } : u));
      toast.success(`تم تصفير ثروة ${targetUser.displayName} بالكامل`);
    } catch (error) {
      toast.error('فشل في تصفير الثروة');
    }
  };

  const handleOpenMilitia = (targetUser: UserProfile) => {
    const militiaToEdit: Militia = targetUser.militia || {
      id: `militia_${targetUser.uid}`,
      name: `كتائب ${targetUser.displayName}`,
      image: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&q=80&w=400',
      type: 'aggressive',
      leader: {
        name: targetUser.displayName,
        image: targetUser.photoURL || getRealisticAvatar(targetUser.uid)
      },
      soldiers: [],
      vehicles: [],
      squads: [],
      resources: {
        corruptionMoney: 5000000,
        gold: 500,
        ammo: 10000,
        fuel: 5000,
        medicine: 500,
        food: 2000,
        water: 2000
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
        vehicles: {}
      },
      alliances: [],
      incomingRequests: [],
      outgoingRequests: [],
      supportLogs: [],
      attackLogs: []
    };
    setEditingMilitiaData({ user: targetUser, militia: militiaToEdit });
  };

  const confirmCustomFund = async () => {
    if (!customFundUser || customFundAmount <= 0) return;
    try {
      const field = customFundType;
      await updateDoc(doc(db, 'users', customFundUser.uid), {
        [field]: increment(customFundAmount)
      });
      if (field === 'reputation') {
        try {
          await updateDoc(doc(db, 'users_public', customFundUser.uid), {
            reputation: increment(customFundAmount)
          });
        } catch (e) {}
      }
      setUsers(prev => prev.map(u => u.uid === customFundUser.uid ? {
        ...u,
        [field]: ((u as any)[field] || 0) + customFundAmount
      } : u));
      toast.success(`تم شحن ${customFundAmount.toLocaleString()} إلى ${customFundUser.displayName}`);
    } catch (error) {
      toast.error('فشل في عملية الشحن المخصص');
    } finally {
      setCustomFundUser(null);
    }
  };

  const confirmAssignGang = async () => {
    if (!gangAssignUser || !selectedGangIdForAssign) return;
    const gang = gangs.find(g => g.id === selectedGangIdForAssign);
    if (!gang) return;
    try {
      await updateDoc(doc(db, 'users', gangAssignUser.uid), {
        gangId: gang.id,
        gangName: gang.name,
        gangRole: 'soldier'
      });
      try {
        await updateDoc(doc(db, 'users_public', gangAssignUser.uid), {
          gangId: gang.id,
          gangRole: 'soldier'
        });
      } catch (e) {}
      const existingMembers = gang.members || [];
      if (!existingMembers.includes(gangAssignUser.uid)) {
        await updateDoc(doc(db, 'gangs', gang.id), {
          members: [...existingMembers, gangAssignUser.uid]
        });
      }
      setUsers(prev => prev.map(u => u.uid === gangAssignUser.uid ? {
        ...u,
        gangId: gang.id,
        gangName: gang.name,
        gangRole: 'soldier'
      } : u));
      fetchGangs();
      toast.success(`تم تعيين ${gangAssignUser.displayName} في عصابة ${gang.name}`);
    } catch (error) {
      toast.error('فشل في تعيين العصابة');
    } finally {
      setGangAssignUser(null);
    }
  };

  const sendDirectMessageToUser = async () => {
    if (!messageTargetUser || !directMessageText.trim()) return;
    setIsSendingMessage(true);
    try {
      await handleSendDirectMessage(messageTargetUser.uid, directMessageText.trim());
      setMessageTargetUser(null);
      setDirectMessageText('');
    } catch (error) {
      // handled inside handleSendDirectMessage
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handlePlayerAction = async (targetUser: UserProfile, action: string) => {
    switch (action) {
      case 'edit':
        setEditingUser(targetUser);
        break;
      case 'merge': {
        const currentActiveProfile = (profile && profile.uid !== targetUser.uid)
          ? profile
          : (users.find(u => u.uid === user?.uid && u.uid !== targetUser.uid) || users.find(u => u.uid !== targetUser.uid));
        
        // Find other user with same email if exists
        const sameEmailUser = users.find(u => u.uid !== targetUser.uid && u.email && targetUser.email && u.email.toLowerCase() === targetUser.email.toLowerCase());
        
        // Account 1 (الحالي): current active user profile or fallback
        const account1 = currentActiveProfile || targetUser;
        // Account 2 (الذي تم ضغط دمج عليه): targetUser
        const account2Uid = (account1.uid === targetUser.uid)
          ? (sameEmailUser ? sameEmailUser.uid : (users.find(u => u.uid !== targetUser.uid)?.uid || ''))
          : targetUser.uid;

        setLinkingUser(account1);
        setTargetMergeUid(account2Uid);
        setPrimaryToKeep('target'); // Default: adopt targetUser as the primary account to keep!
        setDestinationUidChoice(user?.uid === targetUser.uid ? 'target' : 'source');
        break;
      }
      case 'militia':
        handleOpenMilitia(targetUser);
        break;
      case 'message':
        setMessageTargetUser(targetUser);
        setDirectMessageText('');
        break;
      case 'fund_10m':
        await quickFundUser(targetUser, 10000000);
        break;
      case 'fund_50m':
        await quickFundUser(targetUser, 50000000);
        break;
      case 'fund_500m':
        await quickFundUser(targetUser, 500000000);
        break;
      case 'fund_custom':
        setCustomFundUser(targetUser);
        setCustomFundAmount(10000000);
        setCustomFundType('cleanMoney');
        break;
      case 'add_gold':
        await addGoldToUser(targetUser, 1000);
        break;
      case 'add_rep':
        await addReputationToUser(targetUser, 10000);
        break;
      case 'heal_full':
        await healAndRestoreUser(targetUser);
        break;
      case 'toggle_jail':
        await toggleJailUser(targetUser);
        break;
      case 'clear_wanted':
        await clearWantedStars(targetUser);
        break;
      case 'max_wanted':
        await setMaxWantedStars(targetUser);
        break;
      case 'toggle_admin':
        await toggleAdminRole(targetUser);
        break;
      case 'assign_gang':
        setGangAssignUser(targetUser);
        setSelectedGangIdForAssign(gangs[0]?.id || '');
        break;
      case 'leave_gang':
        await leaveGangUser(targetUser);
        break;
      case 'toggle_ban':
        await toggleBanUser(targetUser);
        break;
      case 'reset_money':
        await resetUserMoney(targetUser);
        break;
      case 'delete':
        setDeletingUser(targetUser.uid);
        break;
      default:
        break;
    }
  };

  // Gang CRUD Handlers
  const handleGangSaved = (gang: any, isNew: boolean) => {
    if (isNew) {
      setGangs(prev => [gang, ...prev]);
    } else {
      setGangs(prev => prev.map(g => g.id === gang.id ? gang : g));
    }
    fetchUsers(); // Refresh users for leader/member gang affiliations
  };

  const confirmDeleteGang = async () => {
    if (!deletingGang) return;
    try {
      const gangToDelete = gangs.find(g => g.id === deletingGang);
      // Reset members
      const batch = writeBatch(db);
      if (gangToDelete?.members) {
        for (const memberId of gangToDelete.members) {
          batch.update(doc(db, 'users', memberId), {
            gangId: null,
            gangName: null,
            gangRole: null
          });
        }
      }
      batch.delete(doc(db, 'gangs', deletingGang));
      await batch.commit();

      setGangs(prev => prev.filter(g => g.id !== deletingGang));
      fetchUsers();
      toast.success('تم حذف العصابة وتصفير انتماء أعضائها');
    } catch (error) {
      toast.error('فشل في حذف العصابة');
    } finally {
      setDeletingGang(null);
    }
  };

  // Militia CRUD Handlers
  const handleMilitiaSaved = (userId: string, updatedMilitia: Militia) => {
    setUsers(prev => prev.map(u => u.uid === userId ? { ...u, militia: updatedMilitia } : u));
  };

  const handleMilitiaDeleted = (userId: string) => {
    setUsers(prev => prev.map(u => u.uid === userId ? { ...u, militia: undefined } : u));
  };

  // Government Handlers
  const handleForceDistribution = async () => {
    if (!govData) return;
    toast.info('جاري صرف الرواتب لجميع اللاعبين...');
    try {
      let batch = writeBatch(db);
      let count = 0;
      for (const u of users) {
        batch.update(doc(db, 'users', u.uid), {
          cleanMoney: increment(1000000)
        });
        count++;
        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) {
        await batch.commit();
      }
      fetchUsers();
      toast.success('تم صرف رواتب 1,000,000$ لجميع اللاعبين بنجاح!');
    } catch (error) {
      toast.error('فشل في صرف الرواتب');
    }
  };

  const handleToggleElection = async () => {
    const newStatus = !govData?.electionActive;
    try {
      await updateDoc(doc(db, 'government', 'current'), {
        electionActive: newStatus,
        electionStartTime: newStatus ? new Date().toISOString() : null
      });
      setGovData((prev: any) => ({ ...prev, electionActive: newStatus }));
      toast.success(newStatus ? 'تم فتح باب الاقتراع والانتخابات' : 'تم إنهاء الانتخابات');
    } catch (error) {
      toast.error('فشل في تعديل حالة الانتخابات');
    }
  };

  // Broadcast Handlers
  const handleSendGlobalBroadcast = async (message: string) => {
    try {
      await addDoc(collection(db, 'news_posts'), {
        title: 'بيان صادر عن الإدارة العليا',
        content: message,
        type: 'broadcast',
        timestamp: serverTimestamp()
      });
      toast.success('تم بث الإعلان لجميع المواطنين');
    } catch (error) {
      toast.error('فشل في إرسال الإذاعة');
    }
  };

  const handleSendDirectMessage = async (targetUid: string, message: string) => {
    try {
      await addDoc(collection(db, 'messages'), {
        senderId: 'admin_central',
        senderName: 'الإدارة العليا',
        receiverId: targetUid,
        content: message,
        read: false,
        type: 'admin',
        timestamp: serverTimestamp()
      });
      toast.success('تم إرسال الرسالة الخاصة بنجاح');
    } catch (error) {
      toast.error('فشل في إرسال الرسالة');
    }
  };

  // Database Backup / Restore Handlers
  const handleExportDatabase = async () => {
    setIsSyncing(true);
    toast.info('جاري تحضير ملف النسخة الاحتياطية...');
    try {
      const collectionsToBackup = [
        'users', 'users_public', 'gangs', 'government', 'messages',
        'broadcasts', 'server_settings', 'news_posts'
      ];
      const backupObj: any = {
        exportDate: new Date().toISOString(),
        collections: {}
      };
      for (const col of collectionsToBackup) {
        const snap = await getDocs(collection(db, col));
        backupObj.collections[col] = snap.docs.map(d => ({ id: d.id, data: d.data() }));
      }

      const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mafia_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('تم تصدير النسخة الاحتياطية بنجاح');
    } catch (error) {
      toast.error('فشل في تصدير قاعدة البيانات');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setDatabaseRestoreFile(file);
    if (e.target) e.target.value = '';
  };

  const executeDatabaseRestore = async () => {
    if (!databaseRestoreFile) return;
    setIsSyncing(true);
    const file = databaseRestoreFile;
    setDatabaseRestoreFile(null);
    toast.info('جاري استعادة البيانات بالكامل...');
    try {
      const content = await file.text();
      const parsed = JSON.parse(content);
      if (parsed.collections) {
        for (const [colName, docs] of Object.entries(parsed.collections)) {
          let batch = writeBatch(db);
          let count = 0;
          for (const docItem of docs as any[]) {
            batch.set(doc(db, colName, docItem.id), docItem.data);
            count++;
            if (count >= 400) {
              await batch.commit();
              batch = writeBatch(db);
              count = 0;
            }
          }
          if (count > 0) await batch.commit();
        }
      }
      toast.success('تمت استعادة النسخة الاحتياطية بنجاح!');
      fetchUsers();
      fetchGangs();
      fetchGovData();
    } catch (error) {
      toast.error('حدث خطأ أثناء استعادة النسخة الاحتياطية');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncSelectedFields = async () => {
    if (selectedSyncFields.length === 0) {
      toast.error('يرجى تحديد حقل واحد على الأقل');
      return;
    }
    setIsSyncingFields(true);
    try {
      let batch = writeBatch(db);
      let count = 0;
      for (const u of users) {
        const updates: any = {};
        selectedSyncFields.forEach(field => {
          if ((u as any)[field] !== undefined) {
            updates[field] = (u as any)[field];
          }
        });
        if (Object.keys(updates).length > 0) {
          batch.update(doc(db, 'users', u.uid), updates);
          count++;
          if (count >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
      }
      if (count > 0) await batch.commit();
      toast.success('تمت مزامنة الحقول المحددة بنجاح');
    } catch (error) {
      toast.error('فشل في مزامنة الحقول');
    } finally {
      setIsSyncingFields(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-white font-bold text-sm">
        {t('admin.accessDenied')}
      </div>
    );
  }

  return (
    <div className="text-white space-y-3 max-w-7xl mx-auto px-2.5 sm:px-4 py-3 font-sans pb-24">
      {/* Top Header */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-red-600/20 text-red-400 rounded-lg border border-red-500/30">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">لوحة الإدارة والتحكم الشامل</h1>
              <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-bold">
                ROOT ADMIN
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              التحكم الكامل بجميع مرافق وعناصر اللعبة (إضافة، تعديل، حذف)
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowAddUserModal(true)}
            className="flex-1 sm:flex-none px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md"
          >
            <UserPlus size={14} />
            <span>إضافة لاعب</span>
          </button>
          <button
            onClick={() => setShowAddGangModal(true)}
            className="flex-1 sm:flex-none px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus size={14} />
            <span>إنشاء عصابة</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-1.5 flex gap-1.5 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', icon: BarChart3, label: 'نظرة عامة' },
          { id: 'users', icon: Users, label: 'اللاعبين', count: users.length },
          { id: 'npcs', icon: Users, label: 'شخصيات الخفاء (NPCs)' },
          { id: 'gangs', icon: ShieldCheck, label: 'العصابات', count: gangs.length },
          { id: 'government', icon: Vote, label: 'الحكومة' },
          { id: 'militias', icon: Swords, label: 'المليشيات', count: users.filter(u => u.militia).length },
          { id: 'economy', icon: DollarSign, label: 'الاقتصاد' },
          { id: 'broadcasts', icon: Megaphone, label: 'الإذاعة' },
          { id: 'database', icon: Database, label: 'قاعدة البيانات' },
          { id: 'images', icon: Upload, label: 'الصور' },
          { id: 'cms', icon: Settings, label: 'النظام CMS' },
          { id: 'analytics', icon: Activity, label: 'التحليلات' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveAdminTab(tab.id as any)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0",
              activeAdminTab === tab.id
                ? "bg-red-600 text-white shadow"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            )}
          >
            <tab.icon size={14} />
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={clsx(
                "text-[10px] px-1.5 py-0.2 rounded-full",
                activeAdminTab === tab.id ? "bg-black/30 text-white" : "bg-zinc-800 text-zinc-400"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeAdminTab === 'overview' && (
        <div className="space-y-3">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {[
              { label: 'إجمالي اللاعبين', value: formatNumber(users.length), icon: Users, color: 'text-blue-400', border: 'border-blue-500/30' },
              { label: 'العصابات المسجلة', value: formatNumber(gangs.length), icon: ShieldCheck, color: 'text-red-400', border: 'border-red-500/30' },
              { label: 'الأموال النظيفة', value: formatMoney(users.reduce((acc, u) => acc + (u.cleanMoney || 0), 0)), icon: Database, color: 'text-emerald-400', border: 'border-emerald-500/30' },
              { label: 'الأموال القذرة', value: formatMoney(users.reduce((acc, u) => acc + (u.dirtyMoney || 0), 0)), icon: Activity, color: 'text-amber-400', border: 'border-amber-500/30' }
            ].map((stat, idx) => (
              <div key={idx} className={`bg-zinc-900/60 border ${stat.border} rounded-xl p-3 flex items-center justify-between`}>
                <div>
                  <div className="text-xs text-zinc-400">{stat.label}</div>
                  <div className="text-base font-bold text-white mt-0.5">{stat.value}</div>
                </div>
                <div className={`p-2 bg-zinc-800/80 rounded-lg ${stat.color}`}>
                  <stat.icon size={16} />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-2.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap size={15} className="text-amber-400" />
              <span>إجراءات إدارية سريعة</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => setShowAddUserModal(true)}
                className="p-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors text-right"
              >
                <UserPlus size={14} className="text-blue-400" />
                <span>إضافة لاعب جديد</span>
              </button>
              <button
                onClick={() => setShowAddGangModal(true)}
                className="p-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors text-right"
              >
                <ShieldCheck size={14} className="text-red-400" />
                <span>إنشاء عصابة</span>
              </button>
              <button
                onClick={handleForceDistribution}
                className="p-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors text-right"
              >
                <DollarSign size={14} className="text-emerald-400" />
                <span>توزيع الرواتب فوراً</span>
              </button>
              <button
                onClick={handleExportDatabase}
                className="p-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors text-right"
              >
                <Download size={14} className="text-amber-400" />
                <span>تصدير نسخة احتياطية</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS (PLAYERS) */}
      {activeAdminTab === 'users' && (
        <div className="space-y-3">
          {/* Search & Actions Bar */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="البحث بالاسم، الايميل، أو المعرف..."
                value={userSearch}
                onChange={e => { setUserSearch(e.target.value); setUserPage(1); }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pr-8 pl-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <span className="text-xs text-zinc-400 font-medium">
                النتائج: <strong className="text-white">{filteredUsers.length}</strong>
              </span>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <UserPlus size={14} />
                <span>إضافة لاعب</span>
              </button>
            </div>
          </div>

          {/* Users List Table */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400">
                  <tr>
                    <th className="py-2.5 px-3">اللاعب</th>
                    <th className="py-2.5 px-3">الرتبة</th>
                    <th className="py-2.5 px-3">المستوى</th>
                    <th className="py-2.5 px-3">المال النظيف</th>
                    <th className="py-2.5 px-3">الحالة</th>
                    <th className="py-2.5 px-3 text-center">التحكم والإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {paginatedUsers.map(u => (
                    <tr key={u.uid} className="hover:bg-zinc-800/30 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={u.photoURL || getRealisticAvatar(u.uid)}
                            alt=""
                            className="w-7 h-7 rounded-lg object-cover border border-zinc-700/60 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-white text-xs">{u.displayName}</div>
                            <div className="text-[10px] text-zinc-500 truncate max-w-[120px]">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-2 px-3">
                        <span className={clsx(
                          "px-2 py-0.5 rounded text-[10px] font-bold border",
                          u.role === 'Admin' ? "bg-red-500/10 text-red-400 border-red-500/30" :
                          u.role === 'Boss' ? "bg-amber-500/10 text-amber-300 border-amber-500/30" :
                          "bg-zinc-800 text-zinc-300 border-zinc-700"
                        )}>
                          {t(`roles.${u.role}`) || u.role}
                        </span>
                      </td>

                      {/* Level & Reputation */}
                      <td className="py-2 px-3">
                        <div className="font-semibold text-white">LVL {u.level}</div>
                        <div className="text-[10px] text-yellow-400">{formatNumber(u.reputation || 0)} احترام</div>
                      </td>

                      {/* Money */}
                      <td className="py-2 px-3 font-semibold text-emerald-400">
                        {formatMoney(u.cleanMoney || 0)}
                      </td>

                      {/* Status */}
                      <td className="py-2 px-3">
                        {u.isImprisoned ? (
                          <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-bold">
                            مسجون
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                            طليق
                          </span>
                        )}
                      </td>

                      {/* Controls */}
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 min-w-[170px]">
                          <select
                            value=""
                            onChange={(e) => {
                              const action = e.target.value;
                              if (action) {
                                handlePlayerAction(u, action);
                                e.target.value = "";
                              }
                            }}
                            className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-700 hover:border-red-500/70 text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer shadow-sm transition-all text-right font-medium max-w-[155px]"
                          >
                            <option value="" disabled>⚙️ التحكم والإجراءات...</option>

                            <optgroup label="📋 إدارة الحساب الأساسية">
                              <option value="edit">✏️ تعديل بيانات اللاعب</option>
                              <option value="merge">🔄 دمج واستبدال الحساب</option>
                              <option value="message">✉️ إرسال رسالة خاصة</option>
                              <option value="toggle_admin">{u.role === 'Admin' ? '👤 سحب رتبة المدير' : '👑 ترقية إلى رتبة مدير'}</option>
                              <option value="toggle_ban">{(u as any).isBanned ? '✅ إلغاء حظر الحساب' : '🚫 حظر وتجميد الحساب'}</option>
                              <option value="delete">🗑️ حذف اللاعب نهائياً</option>
                            </optgroup>

                            <optgroup label="💰 الأموال وشحن الرصيد">
                              <option value="fund_10m">💵 شحن سريع (+10,000,000 $)</option>
                              <option value="fund_50m">💵 شحن سريع (+50,000,000 $)</option>
                              <option value="fund_500m">💵 شحن ضخم (+500,000,000 $)</option>
                              <option value="fund_custom">💎 شحن مخصص (أموال / ذهب / احترام)...</option>
                              <option value="add_gold">🪙 إضافة 1,000 سبيكة ذهب</option>
                              <option value="add_rep">⭐ إضافة 10,000 نقطة احترام</option>
                              <option value="reset_money">⚠️ تصفير الثروة بالكامل</option>
                            </optgroup>

                            <optgroup label="🩺 الصحة والمطلوبية والسجن">
                              <option value="heal_full">❤️ استشفاء كامل وشحن الطاقة 100%</option>
                              <option value="toggle_jail">{u.isImprisoned ? '🔓 إفراج من السجن' : '🔒 إيداع في السجن'}</option>
                              <option value="clear_wanted">⭐ تصفير المطلوبية (0 نجوم)</option>
                              <option value="max_wanted">🚨 رفع المطلوبية لأقصى حد (5 نجوم)</option>
                            </optgroup>

                            <optgroup label="⚔️ العصابات والميليشيات">
                              <option value="militia">🎖️ إدارة الميليشيا والفرقة</option>
                              <option value="assign_gang">👥 تعيين في عصابة...</option>
                              {u.gangId && <option value="leave_gang">🚪 طرد من العصابة الحالية</option>}
                            </optgroup>
                          </select>

                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600/30 rounded-lg border border-blue-500/30 transition-colors shrink-0"
                            title="تعديل بيانات اللاعب"
                          >
                            <Edit2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500 text-xs">
                        {loading ? 'جاري تحميل قائمة اللاعبين...' : 'لم يتم العثور على أي لاعب'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalUserPages > 1 && (
              <div className="p-2.5 border-t border-zinc-800 flex items-center justify-between bg-zinc-950/60 text-xs">
                <span className="text-zinc-400">
                  صفحة <strong className="text-white">{userPage}</strong> من <strong className="text-white">{totalUserPages}</strong>
                </span>
                <div className="flex gap-1.5">
                  <button
                    disabled={userPage <= 1}
                    onClick={() => setUserPage(p => Math.max(1, p - 1))}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded text-xs transition-colors"
                  >
                    السابق
                  </button>
                  <button
                    disabled={userPage >= totalUserPages}
                    onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded text-xs transition-colors"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: NPCS & UNDERGROUND WORLD */}
      {activeAdminTab === 'npcs' && (
        <NPCManager />
      )}

      {/* TAB 3: GANGS */}
      {activeAdminTab === 'gangs' && (
        <div className="space-y-3">
          {/* Top Bar */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="البحث عن عصابة..."
                value={gangSearch}
                onChange={e => setGangSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pr-8 pl-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
              />
            </div>
            <button
              onClick={() => { setEditingGang(null); setShowAddGangModal(true); }}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
            >
              <Plus size={14} />
              <span>إنشاء عصابة جديدة</span>
            </button>
          </div>

          {/* Gangs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {gangs
              .filter(g => (g.name || '').toLowerCase().includes(gangSearch.toLowerCase()))
              .map(gang => {
                const leaderUser = users.find(u => u.uid === gang.leaderId);
                return (
                  <div key={gang.id} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-2.5 shadow">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-red-600/20 text-red-400 rounded-lg border border-red-500/30">
                          <ShieldCheck size={16} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{gang.name}</h4>
                          <span className="text-[10px] text-zinc-400">LVL {gang.level || 1}</span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 px-1.5 py-0.5 rounded font-bold">
                        {formatNumber(gang.respect || 0)} احترام
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-zinc-300">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">القائد:</span>
                        <span className="font-semibold text-white">{leaderUser?.displayName || 'غير معروف'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">الأعضاء:</span>
                        <span className="font-semibold text-white">{gang.members?.length || 0} عضو</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">الخزينة:</span>
                        <span className="font-semibold text-emerald-400">{formatMoney(gang.balance || gang.vault || 0)}</span>
                      </div>
                    </div>

                    {/* Gang Controls */}
                    <div className="flex gap-1.5 pt-2 border-t border-zinc-800">
                      <button
                        onClick={() => { setEditingGang(gang); setShowAddGangModal(true); }}
                        className="flex-1 py-1 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 flex items-center justify-center gap-1"
                      >
                        <Edit2 size={12} />
                        <span>تعديل والأعضاء</span>
                      </button>
                      <button
                        onClick={() => setDeletingGang(gang.id)}
                        className="p-1 text-red-400 hover:text-white hover:bg-red-600/30 rounded border border-red-500/30"
                        title="حذف العصابة"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            {gangs.length === 0 && (
              <div className="col-span-full py-8 text-center text-zinc-500 text-xs bg-zinc-900/40 rounded-xl border border-zinc-800">
                لا توجد عصابات مسجلة حالياً
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: GOVERNMENT */}
      {activeAdminTab === 'government' && (
        <GovernmentManager
          govData={govData}
          users={users}
          onGovUpdated={setGovData}
          onForceDistribution={handleForceDistribution}
          onToggleElection={handleToggleElection}
        />
      )}

      {/* TAB 5: MILITIAS */}
      {activeAdminTab === 'militias' && (
        <div className="space-y-3">
          {/* Top Bar */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="البحث بالاسم أو القائد..."
                value={militiaSearch}
                onChange={e => setMilitiaSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pr-8 pl-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
              />
            </div>
            <button
              onClick={() => { setEditingMilitiaData(null); setShowAddMilitiaModal(true); }}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
            >
              <Plus size={14} />
              <span>إضافة مليشيا جديدة</span>
            </button>
          </div>

          {/* Militias Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {users
              .filter(u => u.militia)
              .filter(u => 
                (u.militia?.name || '').toLowerCase().includes(militiaSearch.toLowerCase()) ||
                (u.displayName || '').toLowerCase().includes(militiaSearch.toLowerCase())
              )
              .map(u => (
                <div key={u.uid} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-2.5 shadow">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-red-600/20 text-red-400 rounded-lg border border-red-500/30">
                        <Swords size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{u.militia?.name}</h4>
                        <span className="text-[10px] text-zinc-400">المالك: {u.displayName}</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-bold">
                      {u.militia?.type === 'aggressive' ? 'هجومية' : u.militia?.type === 'government' ? 'حكومية' : 'خارجية'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-xs text-zinc-300">
                    <div className="p-1.5 bg-zinc-950/60 rounded border border-zinc-800">
                      <div className="text-[10px] text-zinc-500">أموال الفساد</div>
                      <div className="font-bold text-red-400">{formatMoney(u.militia?.resources?.corruptionMoney || 0)}</div>
                    </div>
                    <div className="p-1.5 bg-zinc-950/60 rounded border border-zinc-800">
                      <div className="text-[10px] text-zinc-500">الذهب</div>
                      <div className="font-bold text-yellow-400">{formatNumber(u.militia?.resources?.gold || 0)}</div>
                    </div>
                    <div className="p-1.5 bg-zinc-950/60 rounded border border-zinc-800">
                      <div className="text-[10px] text-zinc-500">الذخيرة</div>
                      <div className="font-bold text-orange-400">{formatNumber(u.militia?.resources?.ammo || 0)}</div>
                    </div>
                    <div className="p-1.5 bg-zinc-950/60 rounded border border-zinc-800">
                      <div className="text-[10px] text-zinc-500">الوقود</div>
                      <div className="font-bold text-blue-400">{formatNumber(u.militia?.resources?.fuel || 0)}</div>
                    </div>
                  </div>

                  <div className="flex gap-1.5 pt-2 border-t border-zinc-800">
                    <button
                      onClick={() => {
                        setEditingMilitiaData({ user: u, militia: u.militia! });
                        setShowAddMilitiaModal(true);
                      }}
                      className="flex-1 py-1 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 flex items-center justify-center gap-1"
                    >
                      <Edit2 size={12} />
                      <span>تعديل المليشيا</span>
                    </button>
                  </div>
                </div>
              ))}
            {users.filter(u => u.militia).length === 0 && (
              <div className="col-span-full py-8 text-center text-zinc-500 text-xs bg-zinc-900/40 rounded-xl border border-zinc-800">
                لا توجد مليشيات مسجلة حالياً
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: ECONOMY */}
      {activeAdminTab === 'economy' && (
        <EconomyManager
          startingMoney={startingMoney}
          onStartingMoneyChange={setStartingMoney}
        />
      )}

      {/* TAB 7: BROADCASTS */}
      {activeAdminTab === 'broadcasts' && (
        <BroadcastManager
          users={users}
          onSendGlobalBroadcast={handleSendGlobalBroadcast}
          onSendDirectMessage={handleSendDirectMessage}
        />
      )}

      {/* TAB 8: DATABASE & BACKUP */}
      {activeAdminTab === 'database' && (
        <div className="space-y-3">
          {/* Backup & Restore Bar */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database size={15} className="text-red-400" />
              <span>النسخ الاحتياطي والاستعادة الكاملة</span>
            </h3>
            <p className="text-xs text-zinc-400">
              تصدير قاعدة البيانات بالكامل إلى ملف JSON مستقل، أو استعادة حالة اللعبة الكاملة.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportDatabase}
                disabled={isSyncing}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow disabled:opacity-50"
              >
                <Download size={13} />
                <span>تصدير نسخة احتياطية كاملة (JSON)</span>
              </button>

              <label className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
                <Upload size={13} />
                <span>استيراد وتحديث البيانات</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportFileSelect}
                />
              </label>

              <button
                onClick={async () => {
                  const ok = await runForceFounderSync();
                  if (ok) toast.success('تمت مزامنة الزعماء بنجاح');
                  else toast.error('فشل في مزامنة الزعماء');
                }}
                className="px-3.5 py-1.5 bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw size={13} />
                <span>مزامنة الزعماء</span>
              </button>
            </div>
          </div>

          {/* Selective Fields Sync */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders size={15} className="text-blue-400" />
              <span>مزامنة حقول محددة لجميع اللاعبين</span>
            </h3>
            <p className="text-xs text-zinc-400">
              اختر الحقول التي ترغب في إعادة كتابتها وتوحيدها لكافة اللاعبين في قاعدة البيانات.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {availableSyncFields.map(field => (
                <label key={field.key} className="flex items-center gap-2 p-2 bg-zinc-950/60 rounded border border-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSyncFields.includes(field.key)}
                    onChange={e => {
                      if (e.target.checked) setSelectedSyncFields([...selectedSyncFields, field.key]);
                      else setSelectedSyncFields(selectedSyncFields.filter(k => k !== field.key));
                    }}
                    className="rounded border-zinc-700 bg-zinc-900 text-red-600 focus:ring-0"
                  />
                  <span className="text-zinc-200">{field.label}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end pt-1">
              <button
                onClick={handleSyncSelectedFields}
                disabled={isSyncingFields || selectedSyncFields.length === 0}
                className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                <RefreshCw size={13} className={isSyncingFields ? 'animate-spin' : ''} />
                <span>{isSyncingFields ? 'جاري المزامنة...' : 'مزامنة الحقول المحددة الآن'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: IMAGES */}
      {activeAdminTab === 'images' && <ImageManager />}

      {/* TAB 10: CMS */}
      {activeAdminTab === 'cms' && <ControlCenter />}

      {/* TAB 11: ANALYTICS */}
      {activeAdminTab === 'analytics' && <AnalyticsDashboard />}

      {/* SUB-MODALS */}
      {/* 1. Add User Modal */}
      <AddUserModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onUserAdded={handleUserAdded}
      />

      {/* 2. Edit User Modal */}
      {editingUser && (
        <UserEditModal
          user={editingUser}
          isOpen={Boolean(editingUser)}
          onClose={() => setEditingUser(null)}
          onUserSaved={handleUserSaved}
        />
      )}

      {/* 3. Gang Manager Modal (Add or Edit) */}
      <GangManagerModal
        isOpen={showAddGangModal}
        onClose={() => { setShowAddGangModal(false); setEditingGang(null); }}
        gangToEdit={editingGang}
        users={users}
        onGangSaved={handleGangSaved}
      />

      {/* 4. Militia Manager Modal (Add or Edit) */}
      <MilitiaManagerModal
        isOpen={showAddMilitiaModal}
        onClose={() => { setShowAddMilitiaModal(false); setEditingMilitiaData(null); }}
        users={users}
        militiaData={editingMilitiaData}
        onMilitiaSaved={handleMilitiaSaved}
        onMilitiaDeleted={handleMilitiaDeleted}
      />

      {/* 5. Delete User Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-sm p-4 shadow-2xl text-center space-y-3">
            <div className="p-2 bg-red-600/20 text-red-400 rounded-full w-10 h-10 mx-auto flex items-center justify-center border border-red-500/30">
              <Trash2 size={18} />
            </div>
            <h3 className="text-sm font-bold text-white">تأكيد حذف اللاعب</h3>
            <p className="text-xs text-zinc-400">
              هل أنت متأكد من حذف هذا اللاعب نهائياً؟ سيتم مسح حسابه وسجلاته بالكامل.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingUser(null)}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDeleteUser}
                className="px-3 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Delete Gang Confirmation Modal */}
      {deletingGang && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-sm p-4 shadow-2xl text-center space-y-3">
            <div className="p-2 bg-red-600/20 text-red-400 rounded-full w-10 h-10 mx-auto flex items-center justify-center border border-red-500/30">
              <Trash2 size={18} />
            </div>
            <h3 className="text-sm font-bold text-white">تأكيد حذف العصابة</h3>
            <p className="text-xs text-zinc-400">
              هل أنت متأكد من حذف هذه العصابة؟ سيتم تصفير انتماء جميع أعضائها.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingGang(null)}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDeleteGang}
                className="px-3 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Database Restore Confirmation Modal */}
      {databaseRestoreFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-md p-4 shadow-2xl text-center space-y-3">
            <div className="p-2 bg-amber-600/20 text-amber-400 rounded-full w-10 h-10 mx-auto flex items-center justify-center border border-amber-500/30">
              <AlertTriangle size={18} />
            </div>
            <h3 className="text-sm font-bold text-white">تحذير استعادة قاعدة البيانات</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              سيتم استبدال وتحديث بيانات اللعبة بالبيانات الموجودة في ملف ({databaseRestoreFile.name}). هل ترغب في المتابعة؟
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setDatabaseRestoreFile(null)}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={executeDatabaseRestore}
                className="px-3 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
              >
                تأكيد الاستعادة
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 8. Merge Users Modal */}
      {linkingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl p-5 shadow-2xl space-y-4 my-8 text-right">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <button
                onClick={() => setLinkingUser(null)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-600/20 text-purple-400 rounded-lg border border-purple-500/30">
                  <GitMerge size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">دمج واستبدال الحسابات</h3>
                  <p className="text-[11px] text-zinc-400">استبدال حساب بآخر واعتماد بيانات الحساب المختار وحذف الحساب الآخر</p>
                </div>
              </div>
            </div>

            {/* Quick explanation banner */}
            <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-3 text-xs text-purple-200 leading-relaxed flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-purple-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-purple-300 mb-0.5">آلية عمل الدمج المعتمدة:</p>
                <p className="text-[11px] text-purple-200/80">
                  سيتم حذف الحساب غير المرغوب به نهائياً، ونقل كافة بيانات وثروة ومستوى الحساب المعتمد، وربطه فوراً بجلسة المدير الحالية لتسجيل الدخول واللعب به مباشرة.
                </p>
              </div>
            </div>

            {/* Side-by-Side Account Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Account 1: الحساب الأول (الحالي) */}
              <div className={clsx(
                "rounded-xl border p-3.5 space-y-3 transition-all",
                primaryToKeep === 'source'
                  ? "bg-emerald-950/20 border-emerald-500/50"
                  : "bg-red-950/15 border-red-500/30"
              )}>
                <div className="flex items-center justify-between">
                  <span className={clsx(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                    primaryToKeep === 'source'
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-red-500/20 text-red-300 border-red-500/40"
                  )}>
                    {primaryToKeep === 'source' ? '✅ الحساب المعتمد للحفظ' : '🗑️ الحساب المراد حذفه'}
                  </span>
                  <span className="text-xs font-bold text-zinc-300">الحساب الأول (الحالي)</span>
                </div>

                {/* Dropdown to change account 1 */}
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">اختيار الحساب الأول:</label>
                  <select
                    value={linkingUser.uid}
                    onChange={(e) => {
                      const selected = users.find(u => u.uid === e.target.value);
                      if (selected) setLinkingUser(selected);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    {users.map(u => (
                      <option key={u.uid} value={u.uid}>
                        {u.displayName} ({u.email || 'بدون إيميل'}) {u.uid === user?.uid ? '👑 (حسابك الحالي)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Account 1 Card Info */}
                <div className="flex items-center gap-3 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
                  <img
                    src={linkingUser.photoURL || getRealisticAvatar(linkingUser.uid)}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover border border-zinc-700 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white text-xs truncate flex items-center gap-1.5">
                      <span>{linkingUser.displayName}</span>
                      {linkingUser.uid === user?.uid && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">حسابك الحالي</span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">{linkingUser.email || 'لا يوجد بريد'}</div>
                    <div className="text-[10px] text-zinc-500 font-mono truncate">UID: {linkingUser.uid.slice(0, 10)}...</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-zinc-900/40 p-2 rounded-lg border border-zinc-800/60">
                  <div>المستوى: <strong className="text-white">LVL {linkingUser.level || 1}</strong></div>
                  <div>الرتبة: <strong className="text-amber-300">{linkingUser.role || 'Criminal'}</strong></div>
                  <div>المال النظيف: <strong className="text-emerald-400">{formatMoney(linkingUser.cleanMoney || 0)}</strong></div>
                  <div>الذهب: <strong className="text-yellow-400">{linkingUser.gold || 0}</strong></div>
                </div>
              </div>

              {/* Account 2: الحساب الثاني (المعتمد المختار للدمج) */}
              {(() => {
                const secondaryUser = users.find(u => u.uid === targetMergeUid);
                const hasSameEmail = secondaryUser && linkingUser.email && secondaryUser.email &&
                  linkingUser.email.toLowerCase() === secondaryUser.email.toLowerCase();

                return (
                  <div className={clsx(
                    "rounded-xl border p-3.5 space-y-3 transition-all",
                    primaryToKeep === 'target'
                      ? "bg-emerald-950/20 border-emerald-500/50"
                      : "bg-red-950/15 border-red-500/30"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className={clsx(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                        primaryToKeep === 'target'
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-red-500/20 text-red-300 border-red-500/40"
                      )}>
                        {primaryToKeep === 'target' ? '✅ الحساب المعتمد للحفظ' : '🗑️ الحساب المراد حذفه'}
                      </span>
                      <span className="text-xs font-bold text-zinc-300">الحساب الثاني (المطلوب دمجه)</span>
                    </div>

                    {/* Dropdown to change account 2 */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        {hasSameEmail && (
                          <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded border border-blue-500/40">
                            نفس البريد الإلكتروني
                          </span>
                        )}
                        <label className="text-[10px] text-zinc-400">اختيار الحساب الثاني:</label>
                      </div>
                      <select
                        value={targetMergeUid}
                        onChange={(e) => setTargetMergeUid(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="" disabled>اختر الحساب الثاني...</option>
                        {users.filter(u => u.uid !== linkingUser.uid).map(u => (
                          <option key={u.uid} value={u.uid}>
                            {u.displayName} ({u.email || 'بدون إيميل'}) - LVL {u.level || 1}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Account 2 Card Info */}
                    {secondaryUser ? (
                      <>
                        <div className="flex items-center gap-3 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
                          <img
                            src={secondaryUser.photoURL || getRealisticAvatar(secondaryUser.uid)}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover border border-zinc-700 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-white text-xs truncate">{secondaryUser.displayName}</div>
                            <div className="text-[10px] text-zinc-400 truncate">{secondaryUser.email || 'لا يوجد بريد'}</div>
                            <div className="text-[10px] text-zinc-500 font-mono truncate">UID: {secondaryUser.uid.slice(0, 10)}...</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-zinc-900/40 p-2 rounded-lg border border-zinc-800/60">
                          <div>المستوى: <strong className="text-white">LVL {secondaryUser.level || 1}</strong></div>
                          <div>الرتبة: <strong className="text-amber-300">{secondaryUser.role || 'Criminal'}</strong></div>
                          <div>المال النظيف: <strong className="text-emerald-400">{formatMoney(secondaryUser.cleanMoney || 0)}</strong></div>
                          <div>الذهب: <strong className="text-yellow-400">{secondaryUser.gold || 0}</strong></div>
                        </div>
                      </>
                    ) : (
                      <div className="p-4 text-center text-xs text-zinc-500 bg-zinc-900/30 rounded-lg border border-dashed border-zinc-800">
                        يرجى اختيار الحساب الثاني من القائمة أعلاه
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Merge Direction Options */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-zinc-300 block">حدد نتيجة عملية الدمج:</label>

              {/* Option A: Delete Account 1, Adopt Account 2 (Recommended by user) */}
              <label
                onClick={() => setPrimaryToKeep('target')}
                className={clsx(
                  "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                  primaryToKeep === 'target'
                    ? "bg-emerald-950/30 border-emerald-500 text-white shadow-lg"
                    : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                )}
              >
                <input
                  type="radio"
                  name="mergeDirection"
                  checked={primaryToKeep === 'target'}
                  onChange={() => setPrimaryToKeep('target')}
                  className="mt-0.5 text-emerald-500 focus:ring-0"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <span>حذف الحساب الأول (الحالي) 🗑️ واعتماد الحساب الثاني كلاعب أساسي معتمد ✅</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/40 font-normal">الموصى به</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    يتم استبدال الحساب الحالي بالكامل ببيانات الحساب المختار (المستوى، الأموال، الرتبة، العتاد)، وحذف الحساب الأول، وتسجيل الدخول به فوراً للمدير.
                  </p>
                </div>
              </label>

              {/* Option B: Delete Account 2, Keep Account 1 */}
              <label
                onClick={() => setPrimaryToKeep('source')}
                className={clsx(
                  "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                  primaryToKeep === 'source'
                    ? "bg-blue-950/30 border-blue-500 text-white shadow-lg"
                    : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                )}
              >
                <input
                  type="radio"
                  name="mergeDirection"
                  checked={primaryToKeep === 'source'}
                  onChange={() => setPrimaryToKeep('source')}
                  className="mt-0.5 text-blue-500 focus:ring-0"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-blue-300">
                    اعتماد الحساب الأول (الحالي) ✅ وحذف الحساب الثاني المكرر 🗑️
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    يتم الحفاظ على بيانات الحساب الأول، وحذف الحساب الثاني المكرر نهائياً من قاعدة البيانات.
                  </p>
                </div>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
              <button
                type="button"
                onClick={() => setLinkingUser(null)}
                disabled={isMerging}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleMergeUsers}
                disabled={isMerging || !targetMergeUid}
                className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-purple-600 to-red-600 hover:from-purple-500 hover:to-red-500 disabled:opacity-40 text-white rounded-xl shadow-lg transition-all flex items-center gap-2"
              >
                {isMerging ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>جاري تنفيذ الدمج والاستبدال...</span>
                  </>
                ) : (
                  <>
                    <GitMerge size={14} />
                    <span>تأكيد الدمج واستبدال الحساب الآن</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Custom Fund Modal */}
      {customFundUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <button
                onClick={() => setCustomFundUser(null)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">شحن مخصص للاعب</h3>
                  <p className="text-[11px] text-zinc-400">{customFundUser.displayName}</p>
                </div>
              </div>
            </div>

            {/* Fund Resource Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 block">اختر نوع الرصيد المراد شحنه:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cleanMoney', label: '💵 أموال نظيفة' },
                  { id: 'dirtyMoney', label: '💼 أموال قذرة' },
                  { id: 'bankBalance', label: '🏦 رصيد البنك' },
                  { id: 'gold', label: '🪙 سبائك الذهب' },
                  { id: 'reputation', label: '⭐ نقاط الاحترام' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCustomFundType(item.id as any)}
                    className={clsx(
                      "p-2 text-xs font-semibold rounded-lg border text-right transition-all",
                      customFundType === item.id
                        ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 font-bold"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Input & Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 block">المبلغ المراد إضافته:</label>
              <input
                type="number"
                value={customFundAmount}
                onChange={e => setCustomFundAmount(Math.max(1, Number(e.target.value) || 0))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 text-left"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[1000000, 10000000, 50000000, 100000000, 500000000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCustomFundAmount(amt)}
                    className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-[11px] text-zinc-300 transition-colors"
                  >
                    +{formatNumber(amt)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-zinc-800 pt-3">
              <button
                type="button"
                onClick={() => setCustomFundUser(null)}
                className="px-3.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmCustomFund}
                className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-md"
              >
                تأكيد الشحن الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Direct Message Modal */}
      {messageTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <button
                onClick={() => setMessageTargetUser(null)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
                  <Send size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">إرسال رسالة خاصة</h3>
                  <p className="text-[11px] text-zinc-400">إلى: {messageTargetUser.displayName}</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 block">نص الرسالة:</label>
              <textarea
                rows={4}
                value={directMessageText}
                onChange={e => setDirectMessageText(e.target.value)}
                placeholder="اكتب الرسالة الإدارية هنا لتصل للاعب في صندوق الرسائل..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-zinc-800 pt-3">
              <button
                type="button"
                onClick={() => setMessageTargetUser(null)}
                disabled={isSendingMessage}
                className="px-3.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={sendDirectMessageToUser}
                disabled={isSendingMessage || !directMessageText.trim()}
                className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg transition-colors shadow-md flex items-center gap-1.5"
              >
                {isSendingMessage ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                <span>إرسال الرسالة الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Assign Gang Modal */}
      {gangAssignUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <button
                onClick={() => setGangAssignUser(null)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-600/20 text-red-400 rounded-lg border border-red-500/30">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">تعيين في عصابة</h3>
                  <p className="text-[11px] text-zinc-400">اللاعب: {gangAssignUser.displayName}</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 block">اختر العصابة:</label>
              <select
                value={selectedGangIdForAssign}
                onChange={e => setSelectedGangIdForAssign(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              >
                {gangs.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.members?.length || 0} أعضاء)
                  </option>
                ))}
                {gangs.length === 0 && (
                  <option value="" disabled>لا توجد عصابات مسجلة في النظام</option>
                )}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-zinc-800 pt-3">
              <button
                type="button"
                onClick={() => setGangAssignUser(null)}
                className="px-3.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmAssignGang}
                disabled={!selectedGangIdForAssign}
                className="px-4 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-lg transition-colors shadow-md"
              >
                تأكيد التعيين
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
