import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Lock, 
  Unlock, 
  Send, 
  AlertTriangle, 
  User, 
  Search, 
  DollarSign, 
  Activity, 
  Clock, 
  ShieldAlert, 
  Coins, 
  Flame, 
  Phone, 
  Briefcase, 
  CheckCircle,
  Skull,
  Users,
  Sparkles
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  getDoc,
  orderBy,
  limit,
  increment
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { formatMoney, formatNumber, safeToMillis } from '../lib/utils';
import { getVIPDiscount } from '../lib/vip';
import { getActiveRolePerks } from '../lib/rolePerks';
import PlayerAvatar from '../components/PlayerAvatar';
import { motion, AnimatePresence } from 'framer-motion';

const CONTRABAND_ITEMS = [
  { id: 'phone', name: 'هاتف مهرب سري', cost: 50000, effect: 'تخفيض العقوبة ساعة واحدة', reduceHours: 1, image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=400' },
  { id: 'cigarettes', name: 'سجائر الزنزانة الفاخرة', cost: 15000, effect: 'رفع الروح المعنوية وتقليل التوتر', reduceHours: 0.2, image: 'https://images.unsplash.com/photo-1527845341549-a2928392f442?auto=format&fit=crop&q=80&w=400' },
  { id: 'file', name: 'مبرَد حديدي حاد', cost: 200000, effect: 'محاولة هروب جريئة (فرصة 50%)', reduceHours: 2, image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=400' }
];

export default function Prison() {
  const { t } = useTranslation();
  const { profile, user, calculatePower } = useAuthStore();
  const [prisoners, setPrisoners] = useState<any[]>([]);
  const [wantedPlayers, setWantedPlayers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentBribeCost, setCurrentBribeCost] = useState(250000);
  const [remainingHours, setRemainingHours] = useState(1);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile?.isImprisoned) {
      setCurrentBribeCost(0);
      setRemainingHours(0);
      return;
    }

    const updateBribe = () => {
      const remainingMillis = Math.max(0, safeToMillis(profile.jailTimeEnd) - Date.now());
      const hours = Math.max(1, Math.ceil(remainingMillis / (3600 * 1000)));
      setRemainingHours(hours);
      // Standard Fine: $250,000 per hour
      const baseBribe = hours * 250000;
      const perks = getActiveRolePerks(profile);
      let discountedBribe = Math.floor(baseBribe * getVIPDiscount(profile.vipLevel as any));

      if (perks.bossImmunityBailPercent > 0) {
        discountedBribe = Math.floor(discountedBribe * (1 - (perks.bossImmunityBailPercent / 100)));
      }
      if (perks.crimPrisonReductionPercent > 0) {
        discountedBribe = Math.floor(discountedBribe * (1 - (perks.crimPrisonReductionPercent / 100)));
      }

      setCurrentBribeCost(Math.max(50000, discountedBribe));
    };

    updateBribe();
    const interval = setInterval(updateBribe, 1000);
    return () => clearInterval(interval);
  }, [profile?.isImprisoned, profile?.jailTimeEnd, profile?.vipLevel]);

  // Automatic Release Check: if time expired, release from prison
  useEffect(() => {
    if (profile && profile.isImprisoned && profile.jailTimeEnd) {
      const remaining = safeToMillis(profile.jailTimeEnd) - Date.now();
      if (remaining <= 0) {
        const release = async () => {
          try {
            await updateDoc(doc(db, 'users', profile.uid), {
              isImprisoned: false,
              wantedStars: 0,
              jailTimeEnd: null
            });
            await updateDoc(doc(db, 'users_public', profile.uid), {
              isImprisoned: false,
              wantedStars: 0,
              jailTimeEnd: null
            });
            toast.success('انتهت مدة محكوميتك وتم إطلاق سراحك من السجن المركزي بنجاح! 🏛️✨');
          } catch (e) {
            console.error("Auto release error:", e);
          }
        };
        release();
      }
    }
  }, [profile?.isImprisoned, profile?.jailTimeEnd, profile?.uid]);

  useEffect(() => {
    if (!profile) return;

    const prisonersQuery = query(
      collection(db, 'users_public'),
      where('isImprisoned', '==', true)
    );
    const unsubscribePrisoners = onSnapshot(prisonersQuery, (snapshot) => {
      setPrisoners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users_public (prisoners)');
    });

    const wantedQuery = query(
      collection(db, 'users_public'),
      where('wantedStars', '==', 5),
      where('isImprisoned', '==', false)
    );
    const unsubscribeWanted = onSnapshot(wantedQuery, (snapshot) => {
      setWantedPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users_public (wanted)');
    });

    const chatQuery = query(
      collection(db, 'prison_messages'),
      limit(100)
    );
    const unsubscribeChat = onSnapshot(chatQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const d = doc.data();
        let timeMillis = 0;
        if (d.timestamp?.toMillis) {
          timeMillis = d.timestamp.toMillis();
        } else if (d.timestamp?.seconds) {
          timeMillis = d.timestamp.seconds * 1000;
        } else if (typeof d.timestamp === 'number') {
          timeMillis = d.timestamp;
        } else if (d.createdAt) {
          timeMillis = safeToMillis(d.createdAt);
        }
        return { id: doc.id, ...d, timeMillis };
      });
      msgs.sort((a, b) => a.timeMillis - b.timeMillis);
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'prison_messages');
    });

    return () => {
      unsubscribePrisoners();
      unsubscribeWanted();
      unsubscribeChat();
    };
  }, [profile]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const displayPrisoners = React.useMemo(() => {
    const list = [...prisoners];
    if (profile?.isImprisoned && !list.some(p => p.id === profile.uid || p.uid === profile.uid)) {
      list.unshift({
        id: profile.uid,
        uid: profile.uid,
        displayName: profile.displayName || 'أنت',
        isImprisoned: true,
        jailTimeEnd: profile.jailTimeEnd,
        wantedStars: profile.wantedStars || 5,
        photoURL: profile.photoURL
      });
    }
    return list;
  }, [prisoners, profile]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user || !newMessage.trim()) return;

    const content = newMessage.trim();
    setNewMessage('');
    try {
      await addDoc(collection(db, 'prison_messages'), {
        senderId: user.uid,
        senderName: profile.displayName || 'مجهول',
        content: content,
        text: content,
        timestamp: serverTimestamp(),
        createdAt: Date.now()
      });
    } catch (error) {
      setNewMessage(content);
      handleFirestoreError(error, OperationType.CREATE, 'prison_messages');
      toast.error('فشل في إرسال الرسالة');
    }
  };

  const handleBribe = async () => {
    if (!profile) return;
    
    const remainingMillis = Math.max(0, safeToMillis(profile.jailTimeEnd) - Date.now());
    const hours = Math.max(1, Math.ceil(remainingMillis / (3600 * 1000)));
    const baseCost = hours * 250000;
    const actualBribeAmount = Math.max(250000, Math.floor(baseCost * getVIPDiscount(profile.vipLevel as any)));

    if ((profile.cleanMoney || 0) < actualBribeAmount) {
      toast.error(`أموالك غير كافية لدفع الرشوة النظامية ($250,000 / ساعة)! المطلوب: ${formatMoney(actualBribeAmount)}`);
      return;
    }

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: (profile.cleanMoney || 0) - actualBribeAmount,
        isImprisoned: false,
        wantedStars: 0,
        jailTimeEnd: null
      });
      await updateDoc(doc(db, 'users_public', profile.uid), {
        isImprisoned: false,
        wantedStars: 0,
        jailTimeEnd: null
      });
      toast.success(`تم دفع الرشوة النظامية بقيمة ${formatMoney(actualBribeAmount)} والخروج من السجن بنجاح!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const handleBreakOut = async (targetId: string, targetName: string) => {
    if (!profile) return;
    if (profile.isImprisoned) {
      toast.error('لا يمكنك تهريب مسجون وأنت خلف القضبان!');
      return;
    }

    const success = Math.random() > 0.5;

    try {
      if (success) {
        await updateDoc(doc(db, 'users', targetId), {
          isImprisoned: false,
          jailTimeEnd: null
        });
        await updateDoc(doc(db, 'users_public', targetId), {
          isImprisoned: false,
          jailTimeEnd: null
        });
        toast.success(`تم تهريب السجين ${targetName} بنجاح من السجن المركزي! 🥷`);
      } else {
        await updateDoc(doc(db, 'users', profile.uid), {
          isImprisoned: true,
          jailTimeEnd: Date.now() + 5 * 60 * 1000,
          wantedStars: Math.min(5, (profile.wantedStars || 0) + 1)
        });
        await updateDoc(doc(db, 'users_public', profile.uid), {
          isImprisoned: true,
          jailTimeEnd: Date.now() + 5 * 60 * 1000,
          wantedStars: Math.min(5, (profile.wantedStars || 0) + 1)
        });
        toast.error('فشلت محاولة التهريب وتم القبض عليك وإيداعك السجن!');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleCatchWanted = async (target: any) => {
    if (!profile) return;
    if (profile.isImprisoned) return;

    try {
      const targetDoc = await getDoc(doc(db, 'users_public', target.id));
      if (!targetDoc.exists()) return;
      const fullTarget = targetDoc.data();

      const myPower = calculatePower(profile);
      const targetPower = calculatePower(fullTarget as any);

      if (myPower <= targetPower) {
        toast.error('قوتك أقل من قوة هذا المجرم الخطر، لا يمكنك القبض عليه بمفردك!');
        return;
      }
      await updateDoc(doc(db, 'users', target.id), {
        isImprisoned: true,
        jailTimeEnd: Date.now() + 5 * 60 * 1000,
        wantedStars: 5
      });
      await updateDoc(doc(db, 'users_public', target.id), {
        isImprisoned: true,
        jailTimeEnd: Date.now() + 5 * 60 * 1000,
        wantedStars: 5
      });

      const reward = target.bounty || 50000;
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: (profile.cleanMoney || 0) + reward
      });

      await updateDoc(doc(db, 'users', target.id), { bounty: 0 });
      await updateDoc(doc(db, 'users_public', target.id), { bounty: 0 });

      await addDoc(collection(db, 'messages'), {
        senderId: 'system',
        senderName: 'الشرطة المركزية',
        receiverId: target.id,
        content: `لقد تم القبض عليك من قبل ${profile.displayName} وإيداعك السجن المركزي.`,
        type: 'system',
        read: false,
        timestamp: serverTimestamp()
      });

      toast.success(`تم القبض على ${target.displayName} بنجاح وتحصيل المكافأة: ${formatMoney(reward)}! 🏆`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleBuyContraband = async (item: typeof CONTRABAND_ITEMS[0]) => {
    if (!profile) return;
    if ((profile.cleanMoney || 0) < item.cost) {
      toast.error('لا توجد أموال نظيفة كافية لشراء هذه المهربات!');
      return;
    }

    try {
      const currentEnd = safeToMillis(profile.jailTimeEnd);
      const newEnd = Math.max(Date.now(), currentEnd - (item.reduceHours * 3600 * 1000));
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: (profile.cleanMoney || 0) - item.cost,
        jailTimeEnd: newEnd
      });
      await updateDoc(doc(db, 'users_public', profile.uid), {
        jailTimeEnd: newEnd
      });
      toast.success(`تم شراء وعمل ${item.name} بنجاح! تم تقليص مدة العقوبة. 📦`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const handleHardLabor = async () => {
    if (!profile || !profile.isImprisoned) return;
    try {
      const currentEnd = safeToMillis(profile.jailTimeEnd);
      const newEnd = Math.max(Date.now(), currentEnd - (30 * 60 * 1000));
      await updateDoc(doc(db, 'users', profile.uid), {
        jailTimeEnd: newEnd,
        cleanMoney: (profile.cleanMoney || 0) + 10000
      });
      await updateDoc(doc(db, 'users_public', profile.uid), {
        jailTimeEnd: newEnd
      });
      toast.success('أتممت حصة الأشغال الشاقة في محجر السجن! تم تقليص العقوبة 30 دقيقة وكسب 10,000$ ⛏️');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  // Prison Riot feature
  const handlePrisonRiot = async () => {
    if (!profile || !profile.isImprisoned) return;
    if (displayPrisoners.length < 2) {
      toast.error('يتطلب بدء أعمال الشغب وجود مساجين آخرين معك في الزنزانة!');
      return;
    }
    const success = Math.random() > 0.5;
    try {
      if (success) {
        // Reduce sentence by 2 hours for self
        const currentEnd = safeToMillis(profile.jailTimeEnd);
        const newEnd = Math.max(Date.now(), currentEnd - (2 * 3600 * 1000));
        await updateDoc(doc(db, 'users', profile.uid), { jailTimeEnd: newEnd });
        await updateDoc(doc(db, 'users_public', profile.uid), { jailTimeEnd: newEnd });
        toast.success('نجح تمرد وشغب المساجين! اقتحموا مكتب الحراس وتم تخفيض عقوبتك ساعتين! 🔥⚡');
      } else {
        // Extend sentence by 1 hour
        const currentEnd = safeToMillis(profile.jailTimeEnd);
        const newEnd = currentEnd + (3600 * 1000);
        await updateDoc(doc(db, 'users', profile.uid), { jailTimeEnd: newEnd });
        await updateDoc(doc(db, 'users_public', profile.uid), { jailTimeEnd: newEnd });
        toast.error('فشلت محاولة الشغب وتم قمع التمرد من قبل قوات الأمن! تمت زيادة عقوبتك ساعة إضافية 🚨');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const canChat = !!profile?.isImprisoned || profile?.role === 'Admin';

  return (
    <div className="text-white space-y-8 max-w-7xl mx-auto pb-24 px-4 text-xs md:text-sm">
      {/* Header Banner */}
      <div className="relative rounded-[2.5rem] overflow-hidden border border-red-500/30 bg-gradient-to-r from-zinc-950 via-zinc-900 to-red-950/40 p-6 md:p-8 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-600/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-red-600/20 text-red-500 rounded-2xl border border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.3)] backdrop-blur-xl">
              <Lock size={32} className="animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-red-500/10 text-red-400 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-red-500/20 uppercase tracking-widest">
                  سجن بغداد المركزي
                </span>
                <span className="bg-emerald-500/10 text-emerald-400 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-widest">
                  رسوم الغرامة: $250,000 / ساعة
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter italic">
                {t('prison.title')}
              </h2>
              <p className="text-zinc-400 text-xs md:text-sm font-medium max-w-lg">
                {t('prison.subtitle')} - قاعة الاحتجاز، شات السجن، متجر المهربات، وأعمال الشغب.
              </p>
            </div>
          </div>

          {/* Prison HUD status */}
          <div className="bg-zinc-900/80 backdrop-blur-xl p-4 rounded-2xl border border-zinc-800 flex items-center gap-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
              <ShieldAlert size={24} />
            </div>
            <div className="space-y-1">
              <div className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">حالة الاعتقال</div>
              <div className={`text-xs font-black ${profile?.isImprisoned ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                {profile?.isImprisoned ? 'مسجون حالياً' : 'حر طليق'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prominent Imprisoned Status Banner */}
      {profile?.isImprisoned ? (
        <div className="bg-gradient-to-r from-red-950/90 via-zinc-950 to-zinc-950 border-2 border-red-600/60 rounded-[2.5rem] p-6 md:p-8 shadow-[0_0_35px_rgba(239,68,68,0.25)] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-red-600/20 border border-red-500/40 rounded-2xl text-red-500 animate-pulse shadow-lg">
              <Lock size={36} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="bg-red-600 text-white text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider animate-pulse">
                  محتجز بالسجن
                </span>
                <span className="text-xs text-red-400 font-bold">
                  محكوم بـ {remainingHours} {remainingHours === 1 ? 'ساعة' : 'ساعات'} ($250k / ساعة)
                </span>
              </div>
              <h3 className="text-xl md:text-2xl font-black text-white italic uppercase">أنت رهن الاعتقال في الزنزانة الانفرادية</h3>
              <p className="text-xs text-zinc-300">
                الوقت المتبقي حتى إطلاق سراحك التلقائي: <span className="text-red-400 font-bold font-mono inline-block mx-1"><CountdownTimer endTime={profile.jailTimeEnd} /></span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={handlePrisonRiot}
              className="bg-red-600 hover:bg-red-500 text-white font-black px-4 py-3.5 rounded-xl transition-all flex items-center gap-2 text-xs shadow-lg shadow-red-900/40"
            >
              <Sparkles size={16} />
              <span>بدء شغب المساجين</span>
            </button>
            <button
              onClick={handleHardLabor}
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-black px-4 py-3.5 rounded-xl border border-zinc-700 transition-all flex items-center gap-2 text-xs"
            >
              <Briefcase size={16} className="text-amber-400" />
              <span>أشغال شاقة (-30 دقيقة)</span>
            </button>
            <button
              onClick={handleBribe}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-3.5 rounded-xl shadow-lg shadow-emerald-900/40 transition-all flex items-center gap-2 text-xs"
            >
              <DollarSign size={16} />
              <span>دفع الرشوة النظامية ({formatMoney(currentBribeCost)})</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between text-zinc-400 text-xs md:text-sm">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-emerald-500" />
            <span className="font-bold">سجلك الأمني نظيف - يمكنك زيارة السجن أو مراقبة المساجين والمطلوبين</span>
          </div>
          <span className="text-xs text-emerald-400 font-mono font-bold">رسوم الغرامة النظامية: $250,000 / ساعة</span>
        </div>
      )}

      {/* Contraband Smuggling Shop for Imprisoned Players */}
      {profile?.isImprisoned && (
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-[2.5rem] p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Flame size={22} />
            </div>
            <div>
              <h4 className="text-base md:text-lg font-black italic uppercase">متجر المهربات داخل السجن</h4>
              <p className="text-zinc-400 text-xs">استعانة بالحراس المرتشين لتهريب أدوات وتقليص العقوبة</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {CONTRABAND_ITEMS.map((item) => (
              <div key={item.id} className="bg-zinc-950/80 p-5 rounded-2xl border border-zinc-800 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="font-black text-sm italic">{item.name}</div>
                  <div className="text-[11px] text-zinc-400">{item.effect}</div>
                  <div className="text-emerald-400 font-black text-xs">{formatMoney(item.cost)}</div>
                </div>
                <button
                  onClick={() => handleBuyContraband(item)}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-xl font-black uppercase text-xs tracking-wider transition-all shadow-md shadow-amber-900/30"
                >
                  شراء وتهريب
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Prisoners List & Chat Box with dynamic height based on player count */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prisoners List - Dynamic Height based on player count */}
        <div className="bg-zinc-900/80 backdrop-blur-xl rounded-[2.5rem] border border-zinc-800 flex flex-col order-1 lg:order-2 shadow-xl overflow-hidden">
          <div className="p-5 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
            <h3 className="font-black italic uppercase flex items-center gap-2 text-red-500 text-sm">
              <Users size={18} />
              {t('prison.prisoners')} ({displayPrisoners.length})
            </h3>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">مساجين العاصمة</span>
          </div>
          <div className={`p-4 space-y-3 overflow-y-auto custom-scrollbar ${displayPrisoners.length === 0 ? 'h-40' : displayPrisoners.length > 5 ? 'max-h-[450px]' : 'h-auto'}`}>
            {displayPrisoners.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-600 font-bold uppercase text-xs">
                لا يوجد مساجين حالياً
              </div>
            ) : (
              displayPrisoners.map((prisoner) => (
                <div key={prisoner.id || prisoner.uid} className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  prisoner.wantedStars === 5 ? 'bg-red-500/10 border-red-500/40' : 'bg-zinc-950/60 border-zinc-800/80'
                }`}>
                  <div className="flex items-center gap-3">
                    <PlayerAvatar photoURL={prisoner.photoURL} displayName={prisoner.displayName} vipLevel={prisoner.vipLevel} size="sm" />
                    <div>
                      <p className={`font-black text-xs player-name-script ${prisoner.wantedStars === 5 ? 'text-red-400' : 'text-white'}`}>
                        {prisoner.displayName} {prisoner.id === profile?.uid && '(أنت)'}
                      </p>
                      <div className="flex gap-0.5 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < (prisoner.wantedStars || 0) ? 'bg-yellow-500' : 'bg-zinc-800'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-red-400 font-black">
                    {prisoner.jailTimeEnd ? <CountdownTimer endTime={prisoner.jailTimeEnd} /> : '00:00'}
                  </div>
                  {!profile?.isImprisoned && prisoner.id !== profile?.uid && (
                    <button 
                      onClick={() => handleBreakOut(prisoner.id, prisoner.displayName)}
                      className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 hover:text-white transition-colors"
                      title={t('prison.breakOut')}
                    >
                      <Unlock size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Prison Chat Box */}
        <div className="lg:col-span-2 bg-zinc-900/80 backdrop-blur-xl rounded-[2.5rem] border border-zinc-800 flex flex-col h-[520px] overflow-hidden order-2 lg:order-1 shadow-xl">
          <div className="p-5 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
            <h3 className="font-black italic uppercase flex items-center gap-2 text-sm">
              <Send size={18} className="text-blue-500" />
              {t('prison.chat')} ({messages.length})
            </h3>
            {profile?.isImprisoned && (
              <button 
                onClick={handleBribe}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-colors flex items-center gap-1.5 shadow"
              >
                <DollarSign size={14} />
                {t('prison.bribe')} ({formatNumber(currentBribeCost)})
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 font-bold uppercase text-xs">
                <Lock size={32} className="mb-2 opacity-30" />
                <p>لا توجد رسائل سجن مسجلة حتى الآن</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.senderId === profile?.uid ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-zinc-400 player-name-script">{msg.senderName}</span>
                    <span className="text-[9px] text-zinc-600 font-mono">
                      {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}
                    </span>
                  </div>
                  <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-xs ${
                    msg.senderId === profile?.uid ? 'bg-blue-600 text-white rounded-se-none shadow-md' : 'bg-zinc-800 text-zinc-200 rounded-ss-none border border-zinc-700'
                  }`}>
                    <p className="break-words font-medium">{msg.content || msg.text}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-4 bg-zinc-950/60 border-t border-zinc-800 flex gap-3">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={canChat ? t('prison.typeMessage') : 'شات السجن متاح للمساجين فقط'}
              disabled={!canChat}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 disabled:opacity-50 text-white font-bold"
            />
            <button 
              type="submit"
              disabled={!canChat || !newMessage.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 text-white px-4 py-3 rounded-xl transition-colors shadow-lg"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>

      {/* Most Wanted Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-yellow-500/20 text-yellow-500 rounded-xl border border-yellow-500/30">
            <AlertTriangle size={22} />
          </div>
          <h3 className="text-xl md:text-2xl font-black uppercase italic tracking-tight">{t('prison.mostWanted')}</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 text-xs">
          {wantedPlayers.map((player) => (
            <div key={player.id} className="bg-zinc-900/80 backdrop-blur-xl rounded-[2rem] border border-red-500/30 overflow-hidden group hover:border-red-500 transition-all shadow-xl">
              <div className="relative h-44 bg-zinc-950">
                <img 
                  src={player.photoURL || `https://picsum.photos/seed/${player.uid}/400/300`} 
                  alt={player.displayName}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 end-3 flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
                  ))}
                </div>
                <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent">
                  <p className="font-black text-base text-white player-name-script">{player.displayName}</p>
                </div>
              </div>
              <div className="p-4 flex items-center justify-between bg-zinc-950/80">
                <div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t('prison.bounty')}</p>
                  <p className="text-sm md:text-base font-black text-emerald-400">{formatMoney(player.bounty || 50000)}</p>
                </div>
                <button 
                  onClick={() => handleCatchWanted(player)}
                  className="bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-xl font-black uppercase text-[11px] tracking-wider transition-all shadow-md shadow-red-900/40 flex items-center gap-1.5"
                >
                  <Search size={14} />
                  <span>{t('prison.catch')}</span>
                </button>
              </div>
            </div>
          ))}
          {wantedPlayers.length === 0 && (
            <div className="col-span-full py-12 text-center bg-zinc-900/40 rounded-[2.5rem] border border-dashed border-zinc-800">
              <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">{t('prison.noWantedPlayers')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CountdownTimer({ endTime }: { endTime: any }) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, safeToMillis(endTime) - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, safeToMillis(endTime) - Date.now());
      setTimeLeft(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  const hours = Math.floor(timeLeft / 3600000);
  const minutes = Math.floor((timeLeft % 3600000) / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  if (hours > 0) {
    return (
      <span className="text-red-400 font-black tracking-wider font-mono">
        {hours}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </span>
    );
  }

  return (
    <span className="text-red-400 font-black tracking-wider font-mono">
      {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
    </span>
  );
}
