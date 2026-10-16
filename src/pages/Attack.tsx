import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../store/useAuthStore';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, runTransaction, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { toast } from 'sonner';
import { Sword, Shield, Skull, Target, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatNumberExact, formatMoney } from '../lib/utils';
import { getVIPMultiplier } from '../lib/vip';
import { getActiveRolePerks } from '../lib/rolePerks';
import PlayerAvatar from '../components/PlayerAvatar';
import { CinematicAttack } from '../components/CinematicAttack';

export default function Attack() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, calculatePower, calculateDefense, calculateGuardsPower, calculateGuardsDefense } = useAuthStore();
  const { t } = useTranslation();
  const [target, setTarget] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAttacking, setIsAttacking] = useState(false);
  const isAttackingRef = useRef(false);
  
  // Update ref whenever state changes
  useEffect(() => {
    isAttackingRef.current = isAttacking;
  }, [isAttacking]);
  const [showCinematic, setShowCinematic] = useState(false);
  const [attackResult, setAttackResult] = useState<{
    isWin: boolean;
    stolenDirty: number;
    stolenClean: number;
    damageDealt: number;
    damagePercent: number;
  } | null>(null);

  const [isCinematicRunning, setIsCinematicRunning] = useState(false);
  const [preCalculatedResult, setPreCalculatedResult] = useState<any>(null);

  useEffect(() => {
    if (!id || id === profile?.uid) {
      navigate('/');
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users_public', id), (targetDoc) => {
      if (targetDoc.exists()) {
        setTarget({ uid: targetDoc.id, ...targetDoc.data() });
      } else {
        toast.error(t('common.failed'));
        navigate('/');
      }
      setLoading(false);
    }, (error) => {
      console.error(error);
      toast.error(t('common.failed'));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, profile, navigate, t]);

  const startDirectAttack = async () => {
    if (!profile || !target || isAttacking) return;
    
    // Pre-check status
    if (profile.city === 'hospital' || (profile.hospitalizedUntil && profile.hospitalizedUntil > Date.now())) {
      toast.error('لا يمكنك الهجوم وأنت في المستشفى');
      return;
    }
    
    // Direct attack can bypass target hospital/prison status for cinematic purposes
    // but we still check for safe house
    if (target.inSafeHouse) {
      toast.error('الهدف في المنزل الآمن، لا يمكنك مهاجمته');
      return;
    }

    setIsAttacking(true);
    
    // Calculate result locally first for the cinematic
    const myPower = calculatePower(profile);
    const targetDefense = target.defense || calculateDefense(target);
    const powerRatio = myPower / (targetDefense || 1);
    const randomFactor = Math.random() * 30 - 15;
    let damagePercent = Math.floor((powerRatio * 50) + randomFactor);
    damagePercent = Math.max(0, Math.min(100, damagePercent));
    
    const isWin = damagePercent > 0;
    setPreCalculatedResult({ isWin, damagePercent });
    setShowCinematic(true);
    setIsCinematicRunning(true);
  };

  const handleAttack = async (force = false) => {
    console.log('handleAttack called', { profile: !!profile, target: !!target, isAttacking, force });
    if (!profile) { console.log('No profile'); return; }
    if (!target) { console.log('No target'); return; }
    if (isAttacking && !force) { console.log('Already attacking'); return; }
    
    console.log('Starting attack logic...');
    
    if (profile.city === 'hospital' || (profile.hospitalizedUntil && profile.hospitalizedUntil > Date.now())) {
      console.log('Player is in hospital');
      toast.error('لا يمكنك الهجوم وأنت في المستشفى');
      return;
    }

    if (profile.inSafeHouse) {
      toast.error('لا يمكنك الهجوم وأنت في المنزل الآمن');
      return;
    }

    if (!force) {
      if (target.inSafeHouse) {
        console.log('Target is in safe house');
        toast.error('الهدف في المنزل الآمن، لا يمكنك مهاجمته');
        return;
      }

      if (target.city === 'hospital' || (target.hospitalizedUntil && target.hospitalizedUntil > Date.now())) {
        toast.error('الهدف حالياً في المستشفى');
        return;
      }

      if (target.isImprisoned) {
        toast.error('الهدف حالياً في السجن');
        return;
      }
    }
    
    setIsAttacking(true);
    toast.info('جاري بدء الهجوم...');
    console.log('isAttacking set to true');
    
    let timeoutId: any;
    let finalIsWin = false;
    let finalStolenDirty = 0;
    let finalStolenClean = 0;
    let finalDamageDealt = 0;
    let finalDamagePercent = 0;

    try {
      // Create a timeout to prevent hanging - increased to 30s
      timeoutId = setTimeout(() => {
        if (isAttackingRef.current) {
          console.error('Attack operation timed out');
          setIsAttacking(false);
          toast.error('انتهت مهلة الاتصال بالخادم، يرجى المحاولة مرة أخرى');
        }
      }, 30000);

      if (!profile.uid || !target.uid) {
        throw new Error('بيانات اللاعب أو الهدف غير مكتملة');
      }

      const userRef = doc(db, 'users', profile.uid);
      const targetRef = doc(db, 'users', target.uid);
      
      let stolenDirty = 0;
      let stolenClean = 0;

      console.log('Fetching bounties...');
      // Check for bounties
      const bountiesQuery = query(collection(db, 'bounties'), where('targetId', '==', target.uid));
      const bountiesSnapshot = await getDocs(bountiesQuery);
      let totalBounty = 0;
      const bountyDocs: any[] = [];
      bountiesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data && typeof data.bountyAmount === 'number') {
          totalBounty += data.bountyAmount;
          bountyDocs.push(doc);
        }
      });
      console.log('Bounties fetched:', { totalBounty, count: bountyDocs.length });

      console.log('Starting transaction...');
      const startTime = Date.now();
      await runTransaction(db, async (transaction) => {
        console.log('Transaction started at', new Date().toISOString());
        console.log('Inside transaction');
        const userDoc = await transaction.get(userRef);
        const targetDoc = await transaction.get(targetRef);
        
        if (!userDoc.exists() || !targetDoc.exists()) throw new Error('لم يتم العثور على اللاعب أو الهدف');

        const userData = userDoc.data();
        const targetData = targetDoc.data();

        if (!force) {
          if (targetData.city === 'hospital' || (targetData.hospitalizedUntil && targetData.hospitalizedUntil > Date.now())) {
            console.log('Target is in hospital');
            throw new Error('الهدف حالياً في المستشفى');
          }

          if (targetData.isImprisoned) {
            console.log('Target is in prison');
            throw new Error('الهدف حالياً في السجن');
          }
        }

        // Combat calculation inside transaction for accuracy
        const myPerks = getActiveRolePerks(userData as any);
        const targetPerks = getActiveRolePerks(targetData as any);

        const myPower = calculatePower(userData as any);
        let rawTargetDefense = targetData.defense || calculateDefense(targetData as any);
        
        // Criminal Intimidation perk: debuffs target defense (-15% per level)
        if (myPerks.crimIntimidationDebuffPercent > 0) {
          rawTargetDefense = Math.max(1, Math.floor(rawTargetDefense * (1 - (myPerks.crimIntimidationDebuffPercent / 100))));
        }
        const targetDefense = rawTargetDefense;
        const targetPower = targetData.power || calculatePower(targetData as any);
        
        const powerRatio = myPower / (targetDefense || 1);
        const randomFactor = Math.random() * 30 - 15;
        let damagePercent = Math.floor((powerRatio * 50) + randomFactor);
        damagePercent = Math.max(0, Math.min(100, damagePercent));
        
        if ((targetData.role === 'Admin' || targetData.role === 'Manager') && damagePercent <= 0) {
          damagePercent = 1;
        }
        
        const isWin = damagePercent > 0;
        const damageDealt = Math.floor((targetData.health || 100) * (damagePercent / 100));

        finalIsWin = isWin;
        finalDamagePercent = damagePercent;
        finalDamageDealt = damageDealt;

        if (isWin) {
          console.log('Processing win...');
          // Win: steal money (1000 to 4000), gain reputation
          const targetDirty = targetData.dirtyMoney || 0;
          const targetClean = targetData.cleanMoney || 0;
          const totalAvailable = targetDirty + targetClean;
          
          let baseStolen = Math.min(totalAvailable, Math.floor(Math.random() * (4000 - 1000 + 1)) + 1000);

          // Target Trader Fortified Vaults: protects cash from theft (+25% protection per level)
          if (targetPerks.traderVaultProtectionPercent > 0) {
            baseStolen = Math.floor(baseStolen * (1 - (targetPerks.traderVaultProtectionPercent / 100)));
          }

          // Attacker Boss Spoils of Victory: increases stolen loot (+25% per level)
          if (myPerks.bossSpoilsBonusPercent > 0) {
            baseStolen = Math.floor(baseStolen * (1 + (myPerks.bossSpoilsBonusPercent / 100)));
          }

          const stolenTotal = Math.min(totalAvailable, baseStolen);
          
          // Distribute stolenTotal between dirty and clean money
          const dirtyRatio = totalAvailable > 0 ? targetDirty / totalAvailable : 0;
          stolenDirty = Math.floor(stolenTotal * dirtyRatio);
          stolenClean = Math.max(0, stolenTotal - stolenDirty);
          
          finalStolenDirty = stolenDirty;
          finalStolenClean = stolenClean;
          
          console.log('Stolen money calculated:', { stolenTotal, stolenDirty, stolenClean });
          
          // Apply damage with armor logic
          let targetHealth = targetData.health || 100;
          let targetArmor = targetData.armorHealth || 0;

          // If damage is 100%, it's an instant kill regardless of armor
          if (damagePercent >= 100) {
            targetHealth = 0;
            targetArmor = 0;
          } else {
            if (targetArmor > 0) {
              if (targetArmor >= damageDealt) {
                targetArmor -= damageDealt;
              } else {
                const remainingDamage = damageDealt - targetArmor;
                targetArmor = 0;
                targetHealth = Math.max(0, targetHealth - remainingDamage);
              }
            } else {
              targetHealth = Math.max(0, targetHealth - damageDealt);
            }
          }
          
          // Apply VIP multiplier to stolen money
          stolenDirty = Math.floor(stolenDirty * getVIPMultiplier(userData.vipLevel));
          stolenClean = Math.floor(stolenClean * getVIPMultiplier(userData.vipLevel));

          let repGain = 200;
          if (myPerks.bossReputationBonusPercent > 0) {
            repGain = Math.floor(repGain * (1 + (myPerks.bossReputationBonusPercent / 100)));
          }

          transaction.update(userRef, {
            dirtyMoney: (userData.dirtyMoney || 0) + stolenDirty,
            cleanMoney: (userData.cleanMoney || 0) + stolenClean + totalBounty,
            reputation: (userData.reputation || 0) + repGain,
            wantedStars: Math.min(5, (userData.wantedStars || 0) + 1),
            bounty: (userData.bounty || 0) + 5000
          });

          transaction.update(targetRef, {
            dirtyMoney: Math.max(0, (targetData.dirtyMoney || 0) - stolenDirty),
            cleanMoney: Math.max(0, (targetData.cleanMoney || 0) - stolenClean),
            health: targetHealth,
            armorHealth: targetArmor,
            city: targetHealth <= 0 ? 'hospital' : targetData.city,
            hospitalizedUntil: targetHealth <= 0 ? Date.now() + 3600000 : (targetData.hospitalizedUntil || null),
            killedBy: targetHealth <= 0 ? profile.displayName : (targetData.killedBy || null)
          });

          // Use already fetched targetData for email
          const targetEmail = targetData.email;

          // Send notification to victim
          const victimMessageKey = targetHealth <= 0 ? 'messages.victimNotificationHospitalized' : 'messages.victimNotificationWin';
          transaction.set(doc(collection(db, 'messages')), {
            senderId: profile.uid,
            senderName: t('messages.system'),
            senderEmail: profile.email,
            receiverId: target.uid,
            receiverEmail: targetEmail,
            content: t(victimMessageKey, { 
              operation: force ? 'هجوم مباشر' : 'هجوم مسلح',
              name: profile.displayName, 
              health: Math.floor((targetData.health || 100) - targetHealth),
              dirty: formatNumber(stolenDirty),
              clean: formatNumber(stolenClean),
              currentHealth: Math.floor(targetHealth)
            }),
            type: 'battle',
            read: false,
            timestamp: serverTimestamp(),
            subject: t('messages.battle')
          });

          // Send notification to attacker
          const attackerMessageKey = targetHealth <= 0 ? 'messages.attackerNotificationKilled' : 'messages.attackerNotificationWin';
          transaction.set(doc(collection(db, 'messages')), {
            senderId: profile.uid,
            senderName: t('messages.system'),
            senderEmail: profile.email,
            receiverId: profile.uid,
            receiverEmail: profile.email,
            content: t(attackerMessageKey, {
              name: target.displayName,
              dirty: formatMoney(stolenDirty),
              clean: formatMoney(stolenClean),
              damage: damagePercent
            }),
            type: 'battle',
            read: false,
            timestamp: serverTimestamp(),
            subject: t('messages.battle')
          });
          
          // Delete claimed bounties
          bountyDocs.forEach(bountyDoc => {
            transaction.delete(bountyDoc.ref);
          });
          
          // Log kill if health is 0
          if (targetHealth <= 0) {
            transaction.set(doc(collection(db, 'kills')), {
              killerId: profile.uid,
              killerName: profile.displayName,
              victimId: target.uid,
              victimName: target.displayName,
              killerLevel: profile.level,
              victimLevel: target.level,
              timestamp: serverTimestamp()
            });

            // Increment killer's kills count
            transaction.update(userRef, {
              'crimes.kills': (userData.crimes?.kills || 0) + 1
            });
          }
        } else {
          // Lose: lose health (if damagePercent is 0)
          const myDamage = Math.floor(targetPower * 0.15);
          let myHealth = userData.health || 100;
          let myArmor = userData.armorHealth || 0;

          if (myArmor > 0) {
            if (myArmor >= myDamage) {
              myArmor -= myDamage;
            } else {
              const remainingDamage = myDamage - myArmor;
              myArmor = 0;
              myHealth = Math.max(1, myHealth - remainingDamage);
            }
          } else {
            myHealth = Math.max(1, myHealth - myDamage);
          }

          transaction.update(userRef, {
            health: myHealth,
            armorHealth: myArmor,
            city: myHealth <= 1 ? 'hospital' : userData.city,
            wantedStars: Math.min(5, (userData.wantedStars || 0) + 1),
            bounty: (userData.bounty || 0) + 2500
          });

          // Send notification to victim about successful defense
          transaction.set(doc(collection(db, 'messages')), {
            senderId: profile.uid,
            senderName: t('messages.system'),
            receiverId: target.uid,
            content: t('messages.victimNotificationLoss', { 
              operation: force ? 'هجوم مباشر' : 'هجوم مسلح',
              name: profile.displayName,
              currentHealth: Math.floor(targetData.health || 100)
            }),
            type: 'battle',
            read: false,
            timestamp: serverTimestamp(),
            subject: t('messages.battle')
          });
        }
      });
      const duration = Date.now() - startTime;
      console.log(`Transaction completed successfully in ${duration}ms`);

      setAttackResult({ 
        isWin: finalIsWin, 
        stolenDirty: finalStolenDirty, 
        stolenClean: finalStolenClean, 
        damageDealt: finalDamageDealt, 
        damagePercent: finalDamagePercent 
      });

      if (finalIsWin) {
        if (finalDamagePercent >= 100) {
          toast.success(t('crimes.fatalBlow', { name: target.displayName }));
        } else {
          toast.success(t('crimes.attackSuccess', { damage: finalDamagePercent, dirty: formatMoney(finalStolenDirty) }));
        }
        if (totalBounty > 0) {
          toast.success(t('crimes.bountyClaimed', { amount: formatMoney(totalBounty) }));
        }
      } else {
        toast.error('فشل الهجوم');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Combat error:', error);
      
      let errorMessage = 'فشل القتال';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      if (errorMessage.includes('insufficient permissions') || (error.code === 'permission-denied')) {
        toast.error('خطأ في الصلاحيات: لا يمكنك مهاجمة هذا اللاعب حالياً');
        try {
          handleFirestoreError(error, OperationType.WRITE, 'users');
        } catch (e) {
          console.error('Error in handleFirestoreError:', e);
        }
      } else {
        toast.error(errorMessage || 'فشل القتال');
      }
    } finally {
      console.log('Setting isAttacking to false');
      clearTimeout(timeoutId);
      setIsAttacking(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-white">Loading...</div>;
  if (!target) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <AnimatePresence>
        {showCinematic && (
          <CinematicAttack 
            attackerName={profile?.displayName || ''} 
            targetName={target.displayName} 
            isWin={preCalculatedResult?.isWin}
            damagePercent={preCalculatedResult?.damagePercent}
            onClose={() => {
              setShowCinematic(false);
              setIsCinematicRunning(false);
              handleAttack(true);
            }} 
          />
        )}
      </AnimatePresence>

      <h1 className="text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
        <Sword className="text-red-500" size={40} />
        {t('crimes.attack')}
      </h1>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
        {attackResult ? (
          <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className={`text-6xl font-black ${attackResult.isWin ? 'text-green-500' : 'text-red-500'}`}>
              {attackResult.isWin ? (attackResult.damagePercent >= 100 ? t('crimes.eliminated') : t('common.success')) : t('common.failed')}
            </div>
            
            <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
              <div className="text-sm text-zinc-500 mb-2 uppercase font-bold tracking-widest">{t('crimes.strikePower')}</div>
              <div className="text-5xl font-black text-white">{attackResult.damagePercent}%</div>
              <div className="w-full bg-zinc-900 h-3 rounded-full mt-4 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${attackResult.damagePercent >= 100 ? 'bg-red-600' : 'bg-green-600'}`}
                  style={{ width: `${attackResult.damagePercent}%` }}
                />
              </div>
            </div>

            {attackResult.isWin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <div className="text-xs text-zinc-500 mb-1">{t('header.dirtyMoney')}</div>
                  <div className="text-red-400 font-bold">{formatMoney(attackResult.stolenDirty)}</div>
                </div>
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <div className="text-xs text-zinc-500 mb-1">{t('header.cleanMoney')}</div>
                  <div className="text-green-400 font-bold">{formatMoney(attackResult.stolenClean)}</div>
                </div>
              </div>
            )}
            
            <p className="text-zinc-500">{t('common.returningHome')}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <div className="text-center">
                <div className="mb-4">
                  <PlayerAvatar
                    photoURL={profile?.photoURL}
                    displayName={profile?.displayName}
                    vipLevel={profile?.vipLevel}
                    size="xl"
                  />
                </div>
                <h3 className="text-xl font-bold text-white">{profile?.displayName}</h3>
                <p className="text-sm text-zinc-400">{t('crimes.level', { lvl: profile?.level })}</p>
                <div className="mt-2 space-y-1">
                  <div className="text-xs font-bold text-blue-400">{t('crimes.defense')}: {formatNumberExact(calculateDefense(profile || {} as any))}</div>
                  <div className="text-[10px] text-zinc-500">({t('protection.guards')}: {formatNumberExact(calculateGuardsDefense(profile || {} as any))})</div>
                  <div className="text-xs font-bold text-red-400">{t('crimes.power')}: {formatNumberExact(calculatePower(profile || {} as any))}</div>
                  <div className="text-[10px] text-zinc-500">({t('protection.guards')}: {formatNumberExact(calculateGuardsPower(profile || {} as any))})</div>
                </div>
              </div>

              <div className="text-4xl font-black text-red-500">{t('crimes.vs')}</div>

              <div className="text-center">
                <div className="mb-4">
                  <PlayerAvatar
                    photoURL={target.photoURL}
                    displayName={target.displayName}
                    vipLevel={target.vipLevel}
                    size="xl"
                  />
                </div>
                <h3 className="text-xl font-bold text-white">{target.displayName}</h3>
                <p className="text-sm text-zinc-400">{t('crimes.level', { lvl: target.level })}</p>
                
                {(target.city === 'hospital' || (target.hospitalizedUntil && target.hospitalizedUntil > Date.now())) && (
                  <div className="mt-2 inline-block px-3 py-1 bg-red-900/30 border border-red-500/50 rounded-full">
                    <span className="text-xs font-bold text-red-400">في المستشفى</span>
                  </div>
                )}
                {target.isImprisoned && (
                  <div className="mt-2 inline-block px-3 py-1 bg-zinc-900/30 border border-zinc-500/50 rounded-full">
                    <span className="text-xs font-bold text-zinc-400">في السجن</span>
                  </div>
                )}
                {target.inSafeHouse && (
                  <div className="mt-2 inline-block px-3 py-1 bg-blue-900/30 border border-blue-500/50 rounded-full">
                    <span className="text-xs font-bold text-blue-400">في المنزل الآمن</span>
                  </div>
                )}

                <div className="mt-2 space-y-1">
                  <div className="text-xs font-bold text-blue-400">{t('crimes.defense')}: {formatNumberExact(target.defense || calculateDefense(target))}</div>
                  <div className="text-[10px] text-zinc-500">({t('protection.guards')}: {formatNumberExact(calculateGuardsDefense(target))})</div>
                  <div className="text-xs font-bold text-red-400">{t('crimes.power')}: {formatNumberExact(target.power || calculatePower(target))}</div>
                  <div className="text-[10px] text-zinc-500">({t('protection.guards')}: {formatNumberExact(calculateGuardsPower(target))})</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => handleAttack()}
                disabled={isAttacking || target.city === 'hospital' || (target.hospitalizedUntil && target.hospitalizedUntil > Date.now()) || target.isImprisoned || target.inSafeHouse}
                className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl font-black uppercase tracking-widest text-lg transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)]"
              >
                {isAttacking ? t('crimes.attacking') : t('crimes.attack')}
              </button>

              <button
                onClick={startDirectAttack}
                disabled={isAttacking || target.city === 'hospital' || (target.hospitalizedUntil && target.hospitalizedUntil > Date.now()) || target.isImprisoned || target.inSafeHouse}
                className="w-full py-4 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 disabled:opacity-50 text-black rounded-xl font-black uppercase tracking-widest text-lg transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] flex items-center justify-center gap-2"
              >
                <Zap size={24} />
                هجوم مباشر
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
