import React, { useState, useEffect, useRef } from 'react';
import { Shield, Lock, Unlock, Send, AlertTriangle, User, Search, DollarSign } from 'lucide-react';
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
  getDocs,
  orderBy,
  limit,
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { formatMoney, formatNumber, safeToMillis } from '../lib/utils';
import { getVIPDiscount } from '../lib/vip';
import { motion, AnimatePresence } from 'framer-motion';

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
      // Hours: 1 = 250,000, 2 = 500,000, etc. (minimum 1 hour while imprisoned)
      const hours = Math.max(1, Math.ceil(remainingMillis / (3600 * 1000)));
      setRemainingHours(hours);
      const baseBribe = hours * 250000;
      const discountedBribe = Math.floor(baseBribe * getVIPDiscount(profile.vipLevel as any));
      setCurrentBribeCost(Math.max(250000, discountedBribe));
    };

    updateBribe();
    const interval = setInterval(updateBribe, 1000);
    return () => clearInterval(interval);
  }, [profile?.isImprisoned, profile?.jailTimeEnd, profile?.vipLevel]);

  useEffect(() => {
    if (!profile) return;

    // Listen for imprisoned players from users_public
    const prisonersQuery = query(
      collection(db, 'users_public'),
      where('isImprisoned', '==', true)
    );
    const unsubscribePrisoners = onSnapshot(prisonersQuery, (snapshot) => {
      setPrisoners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users_public (prisoners)');
    });

    // Listen for wanted players (5 stars)
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

    // Listen for prison chat (limit 100, ordered resiliently client-side)
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

  // Merge current user into prisoners list if currently imprisoned
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
      setNewMessage(content); // Restore text on failure
      handleFirestoreError(error, OperationType.CREATE, 'prison_messages');
      toast.error(t('prison.chatError') || 'فشل في إرسال الرسالة');
    }
  };

  const handleBribe = async () => {
    if (!profile) return;
    
    const remainingMillis = Math.max(0, safeToMillis(profile.jailTimeEnd) - Date.now());
    const hours = Math.max(1, Math.ceil(remainingMillis / (3600 * 1000)));
    const baseCost = hours * 250000;
    const actualBribeAmount = Math.max(250000, Math.floor(baseCost * getVIPDiscount(profile.vipLevel as any)));

    if ((profile.cleanMoney || 0) < actualBribeAmount) {
      toast.error(`أموالك غير كافية لدفع الرشوة! المطلوب: ${formatMoney(actualBribeAmount)} (250,000 لكل ساعة)`);
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
      toast.success(`تم دفع الرشوة بقيمة ${formatMoney(actualBribeAmount)} والخروج من السجن بنجاح!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const handleBreakOut = async (targetId: string, targetName: string) => {
    if (!profile) return;
    if (profile.isImprisoned) {
      toast.error(t('prison.alreadyImprisoned'));
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
        toast.success(t('prison.breakOutSuccess', { name: targetName }));
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
        toast.error(t('prison.breakOutFailed'));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleCatchWanted = async (target: any) => {
    if (!profile) return;
    if (profile.isImprisoned) return;

    try {
      // Fetch full target profile to get accurate power
      const targetDoc = await getDoc(doc(db, 'users_public', target.id));
      if (!targetDoc.exists()) return;
      const fullTarget = targetDoc.data();

      const myPower = calculatePower(profile);
      const targetPower = calculatePower(fullTarget as any);

      if (myPower <= targetPower) {
        toast.error(t('prison.tooWeak'));
        return;
      }
      // Imprison target
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

      // Reward catcher
      const reward = target.bounty || 5000;
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: profile.cleanMoney + reward
      });

      // Reset target bounty
      await updateDoc(doc(db, 'users', target.id), {
        bounty: 0
      });
      await updateDoc(doc(db, 'users_public', target.id), {
        bounty: 0
      });

      // Notify target
      await addDoc(collection(db, 'messages'), {
        senderId: 'system',
        senderName: 'Police',
        receiverId: target.id,
        content: `لقد تم القبض عليك من قبل ${profile.displayName} وتم إيداعك السجن.`,
        type: 'system',
        read: false,
        timestamp: serverTimestamp()
      });

      // Notify catcher
      toast.success(t('prison.catchSuccess', { name: target.displayName, reward: formatMoney(reward) }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const canChat = !!profile?.isImprisoned || profile?.role === 'Admin';

  return (
    <div className="text-white space-y-6 max-w-7xl mx-auto p-4">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
          <Lock size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight">{t('prison.title')}</h2>
          <p className="text-zinc-500 text-sm">{t('prison.subtitle')}</p>
        </div>
      </div>

      {/* Prominent Status Banner */}
      {profile?.isImprisoned ? (
        <div className="bg-gradient-to-r from-red-950/80 via-red-900/40 to-black border-2 border-red-600/60 rounded-3xl p-6 shadow-[0_0_30px_rgba(239,68,68,0.25)] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-red-600/20 border border-red-500/40 rounded-2xl text-red-500 animate-pulse shadow-lg">
              <Lock size={36} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="bg-red-600 text-white text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider animate-pulse">
                  محتجز بالسجن
                </span>
                <span className="text-xs text-red-400 font-bold">
                  محكوم بـ {remainingHours} {remainingHours === 1 ? 'ساعة' : remainingHours === 2 ? 'ساعتان' : 'ساعات'}
                </span>
              </div>
              <h3 className="text-2xl font-black text-white mt-1">أنت رهن الاعتقال في السجن المركزي</h3>
              <p className="text-sm text-zinc-300 mt-1">
                الوقت المتبقي حتى إطلاق سراحك: <span className="text-red-400 font-bold font-mono inline-block mx-1"><CountdownTimer endTime={profile.jailTimeEnd} /></span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="bg-black/50 border border-white/10 px-4 py-2.5 rounded-2xl text-center">
              <div className="text-[10px] text-zinc-400 font-bold">تكلفة الرشوة ($250k / ساعة)</div>
              <div className="text-lg font-black text-emerald-400 font-mono">{formatMoney(currentBribeCost)}</div>
            </div>
            <button
              onClick={handleBribe}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black px-6 py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 group active:scale-95"
            >
              <DollarSign size={18} className="group-hover:rotate-12 transition-transform" />
              <span>دفع الرشوة والخروج فوراً</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between text-zinc-400 text-sm">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-green-500" />
            <span>سجلك الأمني نظيف - أنت تزور السجن كزائر حر</span>
          </div>
          <span className="text-xs text-zinc-500 font-bold">رسوم الرشوة: $250,000 لكل ساعة سجن</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prisoners List (On the Right in RTL) */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col h-[600px] order-1 lg:order-2">
          <div className="p-4 border-b border-zinc-800 bg-zinc-950/50">
            <h3 className="font-bold flex items-center gap-2 text-red-500">
              <User size={18} />
              {t('prison.prisoners')} ({displayPrisoners.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {displayPrisoners.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                لا يوجد مساجين حالياً
              </div>
            ) : (
              displayPrisoners.map((prisoner) => (
                <div key={prisoner.id || prisoner.uid} className={`p-3 rounded-xl border flex items-center justify-between ${
                  prisoner.wantedStars === 5 ? 'bg-red-500/10 border-red-500/50' : 'bg-zinc-950/50 border-zinc-800'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${prisoner.wantedStars === 5 ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800 text-zinc-400'}`}>
                      <User size={16} />
                    </div>
                    <div>
                      <p className={`font-bold text-sm player-name-script ${prisoner.wantedStars === 5 ? 'text-red-500' : 'text-white'}`}>
                        {prisoner.displayName} {prisoner.id === profile?.uid && '(أنت)'}
                      </p>
                      <div className="flex gap-0.5 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < (prisoner.wantedStars || 0) ? 'bg-yellow-500' : 'bg-zinc-800'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-zinc-400">
                    {prisoner.jailTimeEnd ? <CountdownTimer endTime={prisoner.jailTimeEnd} /> : '00:00'}
                  </div>
                  {!profile?.isImprisoned && prisoner.id !== profile?.uid && (
                    <button 
                      onClick={() => handleBreakOut(prisoner.id, prisoner.displayName)}
                      className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                      title={t('prison.breakOut')}
                    >
                      <Unlock size={16} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Box (On the Left in RTL) */}
        <div className="lg:col-span-2 bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col h-[600px] overflow-hidden order-2 lg:order-1">
          <div className="p-4 border-b border-zinc-800 bg-zinc-950/50 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <Send size={18} className="text-blue-500" />
              {t('prison.chat')} ({messages.length})
            </h3>
            {profile?.isImprisoned && (
              <button 
                onClick={handleBribe}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
              >
                <DollarSign size={14} />
                {t('prison.bribe')} ({formatNumber(currentBribeCost)})
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-sm">
                <Lock size={32} className="mb-2 opacity-30" />
                <p>لا توجد رسائل سجن حالياً</p>
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
                  <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${
                    msg.senderId === profile?.uid ? 'bg-blue-600 text-white rounded-se-none shadow-md' : 'bg-zinc-800 text-zinc-200 rounded-ss-none'
                  }`}>
                    <p className="text-sm break-words">{msg.content || msg.text}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-4 bg-zinc-950/50 border-t border-zinc-800 flex gap-2">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={canChat ? t('prison.typeMessage') : 'شات السجن متاح للمساجين فقط'}
              disabled={!canChat}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 text-white"
            />
            <button 
              type="submit"
              disabled={!canChat || !newMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 text-white p-2 rounded-xl transition-colors"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>

      {/* Most Wanted Section */}
      <div className="mt-12">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tight">{t('prison.mostWanted')}</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {wantedPlayers.map((player) => (
            <div key={player.id} className="bg-zinc-900 rounded-2xl border border-red-500/30 overflow-hidden group hover:border-red-500 transition-colors">
              <div className="relative h-40 bg-zinc-800">
                <img 
                  src={player.photoURL || `https://picsum.photos/seed/${player.uid}/400/300`} 
                  alt={player.displayName}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2 end-2 flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
                  ))}
                </div>
                <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-zinc-900 to-transparent">
                  <p className="font-black text-xl text-white">{player.displayName}</p>
                </div>
              </div>
              <div className="p-4 flex items-center justify-between bg-zinc-950/50">
                <div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t('prison.bounty')}</p>
                  <p className="text-lg font-black text-green-500">{formatMoney(player.bounty || 50000)}</p>
                </div>
                <button 
                  onClick={() => handleCatchWanted(player)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-colors flex items-center gap-2"
                >
                  <Search size={14} />
                  {t('prison.catch')}
                </button>
              </div>
            </div>
          ))}
          {wantedPlayers.length === 0 && (
            <div className="col-span-full py-12 text-center bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-800">
              <p className="text-zinc-500 font-bold">{t('prison.noWantedPlayers')}</p>
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
      <span className="text-red-500 font-black drop-shadow-[0_0_8px_rgba(239,68,68,1)] tracking-widest font-mono">
        {hours}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </span>
    );
  }

  return (
    <span className="text-red-500 font-black drop-shadow-[0_0_8px_rgba(239,68,68,1)] tracking-widest font-mono">
      {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
    </span>
  );
}
