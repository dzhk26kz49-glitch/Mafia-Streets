import React, { useState } from 'react';
import { 
  X, User, DollarSign, Activity, Database, BarChart3, Users, 
  ShieldAlert, Sparkles, Heart, Zap, Lock, Unlock, FileText, CheckCircle, Save
} from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { UserProfile, Role } from '../../store/useAuthStore';
import { formatMoney, formatNumber } from '../../lib/utils';
import { toast } from 'sonner';

interface UserEditModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onUserSaved: (updatedUser: UserProfile) => void;
}

export const UserEditModal: React.FC<UserEditModalProps> = ({
  user,
  isOpen,
  onClose,
  onUserSaved
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'financial' | 'combat' | 'docs' | 'gang'>('basic');
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<any>({
    displayName: user.displayName || '',
    email: user.email || '',
    role: user.role || 'Criminal',
    vipLevel: user.vipLevel || '',
    city: user.city || 'baghdad',
    country: user.country || 'iq',
    birthdate: user.birthdate || '',
    photoURL: user.photoURL || '',
    alias: user.alias || '',
    nickname: user.nickname || '',
    level: user.level || 1,
    reputation: user.reputation || 0,
    cleanMoney: user.cleanMoney || 0,
    dirtyMoney: user.dirtyMoney || 0,
    bankBalance: user.bankBalance || 0,
    gold: user.gold || 0,
    health: user.health ?? 100,
    maxHealth: (user as any).maxHealth ?? 100,
    energy: user.energy ?? 100,
    maxEnergy: (user as any).maxEnergy ?? 100,
    fatigue: user.fatigue ?? 0,
    strength: user.gymStats?.strength || 20,
    endurance: user.gymStats?.endurance || 20,
    speed: user.gymStats?.speed || 20,
    toughness: user.gymStats?.toughness || 20,
    wantedStars: user.wantedStars || 0,
    isImprisoned: Boolean(user.isImprisoned),
    prisonReleaseTime: (user as any).prisonReleaseTime ?? (user as any).jailTimeEnd ?? null,
    documents: {
      idCard: Boolean(user.documents?.idCard),
      passport: Boolean(user.documents?.passport),
      driverLicense: Boolean(user.documents?.driverLicense),
      weaponLicense: Boolean(user.documents?.weaponLicense),
      clearance: Boolean(user.documents?.clearance)
    }
  });

  if (!isOpen) return null;

  // Quick Booster Helpers
  const addMoney = (clean: number, dirty: number) => {
    setFormData((prev: any) => ({
      ...prev,
      cleanMoney: (Number(prev.cleanMoney) || 0) + clean,
      dirtyMoney: (Number(prev.dirtyMoney) || 0) + dirty
    }));
    toast.success(`تمت إضافة ${formatMoney(clean + dirty)} لرصيد اللاعب`);
  };

  const addReputation = (amount: number) => {
    setFormData((prev: any) => ({
      ...prev,
      reputation: (Number(prev.reputation) || 0) + amount
    }));
    toast.success(`تمت إضافة ${formatNumber(amount)} احترام`);
  };

  const refillStats = () => {
    setFormData((prev: any) => ({
      ...prev,
      health: prev.maxHealth || 100,
      energy: prev.maxEnergy || 100,
      fatigue: 0
    }));
    toast.success('تم شحن الصحة والطاقة 100%');
  };

  const toggleJail = () => {
    setFormData((prev: any) => ({
      ...prev,
      isImprisoned: !prev.isImprisoned,
      prisonReleaseTime: !prev.isImprisoned ? Date.now() + 3600000 : null
    }));
    toast.info(!formData.isImprisoned ? 'تم وضع اللاعب في السجن' : 'تم الإفراج عن اللاعب');
  };

  const grantAllDocs = () => {
    setFormData((prev: any) => ({
      ...prev,
      documents: {
        idCard: true,
        passport: true,
        driverLicense: true,
        weaponLicense: true,
        clearance: true
      }
    }));
    toast.success('تم تفعيل جميع الوثائق الرسمية');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updates: any = {
        displayName: formData.displayName.trim(),
        email: formData.email.trim(),
        role: formData.role,
        vipLevel: formData.vipLevel || null,
        city: formData.city,
        country: formData.country,
        birthdate: formData.birthdate,
        photoURL: formData.photoURL,
        alias: formData.alias,
        nickname: formData.nickname,
        level: Number(formData.level) || 1,
        reputation: Number(formData.reputation) || 0,
        cleanMoney: Number(formData.cleanMoney) || 0,
        dirtyMoney: Number(formData.dirtyMoney) || 0,
        bankBalance: Number(formData.bankBalance) || 0,
        gold: Number(formData.gold) || 0,
        health: Number(formData.health) || 100,
        maxHealth: Number(formData.maxHealth) || 100,
        energy: Number(formData.energy) || 100,
        maxEnergy: Number(formData.maxEnergy) || 100,
        fatigue: Number(formData.fatigue) || 0,
        'gymStats.strength': Number(formData.strength) || 20,
        'gymStats.endurance': Number(formData.endurance) || 20,
        'gymStats.speed': Number(formData.speed) || 20,
        'gymStats.toughness': Number(formData.toughness) || 20,
        wantedStars: Number(formData.wantedStars) || 0,
        isImprisoned: formData.isImprisoned,
        prisonReleaseTime: formData.prisonReleaseTime,
        documents: formData.documents,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'users', user.uid), updates);

      // Also update public profile
      await updateDoc(doc(db, 'users_public', user.uid), {
        displayName: formData.displayName.trim(),
        level: Number(formData.level) || 1,
        role: formData.role,
        photoURL: formData.photoURL || null
      });

      const updatedUserObj: UserProfile = {
        ...user,
        ...updates,
        gymStats: {
          strength: Number(formData.strength) || 20,
          endurance: Number(formData.endurance) || 20,
          speed: Number(formData.speed) || 20,
          toughness: Number(formData.toughness) || 20
        }
      };

      toast.success('تم حفظ تعديلات اللاعب بنجاح');
      onUserSaved(updatedUserObj);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      toast.error('فشل في حفظ التعديلات');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-600/20 text-red-400 rounded-lg border border-red-500/30">
              <User size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>تعديل اللاعب: {user.displayName}</span>
                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                  LVL {user.level}
                </span>
              </h3>
              <p className="text-xs text-zinc-400">تعديل شامل لبيانات الحساب، الأموال، والقتال</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800">
            <X size={16} />
          </button>
        </div>

        {/* Quick Booster Actions Bar */}
        <div className="px-3.5 py-2 bg-zinc-900/40 border-b border-zinc-800/80 flex flex-wrap items-center gap-1.5 shrink-0 text-xs">
          <span className="text-[11px] font-bold text-zinc-400 ml-1">تعزيز سريع:</span>
          <button
            type="button"
            onClick={() => addMoney(10000000, 0)}
            className="px-2 py-0.5 text-[11px] font-bold bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 rounded"
          >
            +10M نظيف
          </button>
          <button
            type="button"
            onClick={() => addMoney(0, 20000000)}
            className="px-2 py-0.5 text-[11px] font-bold bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 border border-orange-500/30 rounded"
          >
            +20M قذر
          </button>
          <button
            type="button"
            onClick={() => addReputation(1000)}
            className="px-2 py-0.5 text-[11px] font-bold bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20 border border-yellow-500/30 rounded"
          >
            +1000 احترام
          </button>
          <button
            type="button"
            onClick={refillStats}
            className="px-2 py-0.5 text-[11px] font-bold bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 border border-blue-500/30 rounded"
          >
            شحن 100%
          </button>
          <button
            type="button"
            onClick={toggleJail}
            className={`px-2 py-0.5 text-[11px] font-bold rounded border ${
              formData.isImprisoned
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-red-500/10 text-red-300 border-red-500/30'
            }`}
          >
            {formData.isImprisoned ? 'إفراج عن السجين' : 'إيداع بالسجن'}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/30 shrink-0 px-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'basic', label: 'الأساسية', icon: User },
            { id: 'financial', label: 'المالية', icon: DollarSign },
            { id: 'combat', label: 'القتال والصحة', icon: Activity },
            { id: 'docs', label: 'الوثائق', icon: FileText }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-red-500 text-white'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <tab.icon size={13} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 overflow-y-auto space-y-3 custom-scrollbar flex-1">
          {activeTab === 'basic' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">الاسم المستعار *</label>
                <input
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">الرتبة</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as Role })}
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
                >
                  <option value="Boss">الزعيم</option>
                  <option value="Trader">التاجر</option>
                  <option value="Thief">اللص المحترف</option>
                  <option value="Smuggler">المهرب</option>
                  <option value="Criminal">مجرم محترف</option>
                  <option value="Admin">مدير (حصري للإدارة)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-purple-400 block mb-1">عضوية VIP</label>
                <select
                  value={formData.vipLevel}
                  onChange={e => setFormData({ ...formData, vipLevel: e.target.value })}
                  className="w-full bg-zinc-900 border border-purple-900/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="">بدون VIP</option>
                  <option value="silver">VIP فضي</option>
                  <option value="gold">VIP ذهبي</option>
                  <option value="diamond">VIP ماسي</option>
                  <option value="demon">VIP ديمون</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">المدينة</label>
                <select
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
                >
                  <option value="baghdad">بغداد</option>
                  <option value="damascus">دمشق</option>
                  <option value="beirut">بيروت</option>
                  <option value="cairo">القاهرة</option>
                  <option value="dubai">دبي</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">رمز البلد</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={e => setFormData({ ...formData, country: e.target.value })}
                  placeholder="iq, sy, eg..."
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-zinc-300 block mb-1">رابط الصورة الشخصية</label>
                <input
                  type="text"
                  value={formData.photoURL}
                  onChange={e => setFormData({ ...formData, photoURL: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">المستوى (Level)</label>
                <input
                  type="number"
                  min={1}
                  value={formData.level}
                  onChange={e => setFormData({ ...formData, level: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-yellow-400 block mb-1">نقاط الاحترام</label>
                <input
                  type="number"
                  value={formData.reputation}
                  onChange={e => setFormData({ ...formData, reputation: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-yellow-300 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-emerald-400 block mb-1">المال النظيف ($)</label>
                <input
                  type="number"
                  value={formData.cleanMoney}
                  onChange={e => setFormData({ ...formData, cleanMoney: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-emerald-900/60 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-orange-400 block mb-1">المال القذر ($)</label>
                <input
                  type="number"
                  value={formData.dirtyMoney}
                  onChange={e => setFormData({ ...formData, dirtyMoney: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-orange-900/60 rounded-lg px-2.5 py-1.5 text-xs text-orange-300 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-blue-400 block mb-1">رصيد البنك ($)</label>
                <input
                  type="number"
                  value={formData.bankBalance}
                  onChange={e => setFormData({ ...formData, bankBalance: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-blue-900/60 rounded-lg px-2.5 py-1.5 text-xs text-blue-300 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-yellow-500 block mb-1">سبائك الذهب</label>
                <input
                  type="number"
                  value={formData.gold}
                  onChange={e => setFormData({ ...formData, gold: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-yellow-900/60 rounded-lg px-2.5 py-1.5 text-xs text-yellow-400 focus:border-yellow-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'combat' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-xs font-semibold text-red-400 block mb-1">الصحة الحالية</label>
                <input
                  type="number"
                  value={formData.health}
                  onChange={e => setFormData({ ...formData, health: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">أقصى صحة</label>
                <input
                  type="number"
                  value={formData.maxHealth}
                  onChange={e => setFormData({ ...formData, maxHealth: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-yellow-400 block mb-1">الطاقة الحالية</label>
                <input
                  type="number"
                  value={formData.energy}
                  onChange={e => setFormData({ ...formData, energy: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">أقصى طاقة</label>
                <input
                  type="number"
                  value={formData.maxEnergy}
                  onChange={e => setFormData({ ...formData, maxEnergy: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2 py-1 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-blue-400 block mb-1">القوة</label>
                <input
                  type="number"
                  value={formData.strength}
                  onChange={e => setFormData({ ...formData, strength: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-emerald-400 block mb-1">التحمل</label>
                <input
                  type="number"
                  value={formData.endurance}
                  onChange={e => setFormData({ ...formData, endurance: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-purple-400 block mb-1">السرعة</label>
                <input
                  type="number"
                  value={formData.speed}
                  onChange={e => setFormData({ ...formData, speed: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-orange-400 block mb-1">الصلابة</label>
                <input
                  type="number"
                  value={formData.toughness}
                  onChange={e => setFormData({ ...formData, toughness: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2 py-1 text-xs text-white"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-amber-500 block mb-1">نجوم الملاحقة الأمنية</label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={formData.wantedStars}
                  onChange={e => setFormData({ ...formData, wantedStars: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1 text-xs text-white"
                />
              </div>

              <div className="col-span-2 flex items-center gap-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={formData.isImprisoned}
                    onChange={e => setFormData({ ...formData, isImprisoned: e.target.checked })}
                    className="rounded border-zinc-700 bg-zinc-900 text-red-600 focus:ring-0"
                  />
                  <span className={formData.isImprisoned ? 'text-red-400 font-bold' : 'text-zinc-300'}>
                    اللاعب مسجون حالياً
                  </span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'docs' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                <span className="text-xs text-zinc-300 font-semibold">الوثائق والتراخيص الرسمية</span>
                <button
                  type="button"
                  onClick={grantAllDocs}
                  className="px-2 py-0.5 text-xs font-bold bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded"
                >
                  تفعيل جميع الوثائق
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'idCard', label: 'بطاقة هوية وطنية' },
                  { id: 'passport', label: 'جواز سفر دولي' },
                  { id: 'driverLicense', label: 'رخصة قيادة' },
                  { id: 'weaponLicense', label: 'رخصة حمل سلاح' },
                  { id: 'clearance', label: 'شهادة براءة ذمة' }
                ].map(docItem => (
                  <label key={docItem.id} className="flex items-center gap-2 p-2 bg-zinc-900/60 rounded border border-zinc-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.documents?.[docItem.id])}
                      onChange={e => setFormData({
                        ...formData,
                        documents: {
                          ...formData.documents,
                          [docItem.id]: e.target.checked
                        }
                      })}
                      className="rounded border-zinc-700 bg-zinc-900 text-emerald-600 focus:ring-0"
                    />
                    <span className="text-zinc-200">{docItem.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-md"
            >
              <Save size={13} />
              <span>{isSaving ? 'جاري الحفظ...' : 'حفظ تعديلات اللاعب'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
