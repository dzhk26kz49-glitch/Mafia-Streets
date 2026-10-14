import React, { useState } from 'react';
import { X, UserPlus, Sparkles, Shield, DollarSign, Award, Mail } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { UserProfile, Role } from '../../store/useAuthStore';
import { toast } from 'sonner';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded: (newUser: UserProfile) => void;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onUserAdded }) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('Criminal');
  const [cleanMoney, setCleanMoney] = useState(10000000);
  const [dirtyMoney, setDirtyMoney] = useState(5000000);
  const [level, setLevel] = useState(1);
  const [reputation, setReputation] = useState(100);
  const [vipLevel, setVipLevel] = useState<string>('');
  const [city, setCity] = useState('baghdad');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleRandomFill = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const roles: Role[] = ['Boss', 'Trader', 'Thief', 'Smuggler', 'Criminal'];
    const randomRole = roles[Math.floor(Math.random() * roles.length)];
    const cities = ['baghdad', 'damascus', 'beirut', 'cairo', 'dubai'];
    const randomCity = cities[Math.floor(Math.random() * cities.length)];

    setDisplayName(`لاعب_${randomSuffix}`);
    setEmail(`user_${randomSuffix}@mafia.local`);
    setRole(randomRole);
    setCleanMoney(Math.floor(5000000 + Math.random() * 20000000));
    setDirtyMoney(Math.floor(2000000 + Math.random() * 10000000));
    setLevel(Math.floor(1 + Math.random() * 10));
    setReputation(Math.floor(100 + Math.random() * 2000));
    setCity(randomCity);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error('يرجى إدخال اسم اللاعب');
      return;
    }

    setIsSubmitting(true);
    const dummyId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const userEmail = email.trim() || `${dummyId}@mafia.local`;

    const newProfile: any = {
      uid: dummyId,
      displayName: displayName.trim(),
      email: userEmail,
      role: role === 'Admin' ? 'Criminal' : role, // Prevent Admin role from normal creation
      level: Number(level) || 1,
      reputation: Number(reputation) || 0,
      cleanMoney: Number(cleanMoney) || 0,
      dirtyMoney: Number(dirtyMoney) || 0,
      bankBalance: 0,
      health: 100,
      maxHealth: 100,
      energy: 100,
      maxEnergy: 100,
      gymStats: {
        strength: 20,
        endurance: 20,
        speed: 20,
        toughness: 20
      },
      vipLevel: vipLevel || null,
      city: city || 'baghdad',
      country: 'iq',
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      documents: {
        idCard: true,
        passport: false,
        driverLicense: true,
        weaponLicense: false,
        clearance: false
      },
      inventory: {
        weapons: {},
        cars: {},
        drugs: {},
        phones: {}
      }
    };

    try {
      await setDoc(doc(db, 'users', dummyId), newProfile);
      // Create public profile
      await setDoc(doc(db, 'users_public', dummyId), {
        uid: dummyId,
        displayName: newProfile.displayName,
        level: newProfile.level,
        role: newProfile.role,
        gangName: null,
        gangColor: null,
        photoURL: null
      });

      toast.success('تمت إضافة اللاعب بنجاح');
      onUserAdded(newProfile as UserProfile);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${dummyId}`);
      toast.error('فشل في إضافة اللاعب');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-600/20 text-red-400 rounded-lg border border-red-500/30">
              <UserPlus size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">إضافة لاعب جديد</h3>
              <p className="text-xs text-zinc-400">إنشاء حساب لاعب مخصص في قاعدة البيانات</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRandomFill}
              className="px-2.5 py-1 text-xs font-semibold bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg flex items-center gap-1 transition-colors"
            >
              <Sparkles size={12} />
              <span>توليد عشوائي</span>
            </button>
            <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-3 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">اسم اللاعب *</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="مثال: الصقر الجارح"
                className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="user@example.com (اختياري)"
                className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">الرتبة المبدئية</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as Role)}
                className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
              >
                <option value="Boss">الزعيم</option>
                <option value="Trader">التاجر</option>
                <option value="Thief">اللص المحترف</option>
                <option value="Smuggler">المهرب</option>
                <option value="Criminal">مجرم محترف</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">المدينة الحالية</label>
              <select
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
              >
                <option value="baghdad">بغداد</option>
                <option value="damascus">دمشق</option>
                <option value="beirut">بيروت</option>
                <option value="cairo">القاهرة</option>
                <option value="dubai">دبي</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-emerald-400 block mb-1">المال النظيف ($)</label>
              <input
                type="number"
                value={cleanMoney}
                onChange={e => setCleanMoney(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-emerald-900/60 rounded-lg px-3 py-1.5 text-xs text-emerald-300 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-orange-400 block mb-1">المال القذر ($)</label>
              <input
                type="number"
                value={dirtyMoney}
                onChange={e => setDirtyMoney(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-orange-900/60 rounded-lg px-3 py-1.5 text-xs text-orange-300 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">المستوى (Level)</label>
              <input
                type="number"
                min={1}
                value={level}
                onChange={e => setLevel(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-yellow-400 block mb-1">نقاط الاحترام</label>
              <input
                type="number"
                value={reputation}
                onChange={e => setReputation(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-xs text-yellow-300 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-purple-400 block mb-1">حساب VIP (اختياري)</label>
              <select
                value={vipLevel}
                onChange={e => setVipLevel(e.target.value)}
                className="w-full bg-zinc-900 border border-purple-900/60 rounded-lg px-3 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="">بدون VIP</option>
                <option value="silver">VIP فضي</option>
                <option value="gold">VIP ذهبي</option>
                <option value="diamond">VIP ماسي</option>
                <option value="demon">VIP ديمون</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-md"
            >
              {isSubmitting ? (
                <span>جاري الحفظ...</span>
              ) : (
                <>
                  <UserPlus size={14} />
                  <span>تأكيد الإضافة</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
