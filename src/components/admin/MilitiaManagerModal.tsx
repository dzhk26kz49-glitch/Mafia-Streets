import React, { useState, useEffect } from 'react';
import { X, Swords, Plus, Trash2, Edit2, ShieldAlert, DollarSign, Fuel, Heart, Users } from 'lucide-react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { UserProfile, Militia } from '../../store/useAuthStore';
import { toast } from 'sonner';

interface MilitiaManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserProfile[];
  militiaData?: { user: UserProfile; militia: Militia } | null; // if null, it's "Add Militia"
  onMilitiaSaved: (userId: string, updatedMilitia: Militia) => void;
  onMilitiaDeleted?: (userId: string) => void;
}

export const MilitiaManagerModal: React.FC<MilitiaManagerModalProps> = ({
  isOpen,
  onClose,
  users,
  militiaData,
  onMilitiaSaved,
  onMilitiaDeleted
}) => {
  const isEditing = Boolean(militiaData);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'aggressive' | 'government' | 'external'>('aggressive');
  const [corruptionMoney, setCorruptionMoney] = useState(1000000);
  const [gold, setGold] = useState(500);
  const [ammo, setAmmo] = useState(5000);
  const [fuel, setFuel] = useState(2000);
  const [medicine, setMedicine] = useState(100);
  const [food, setFood] = useState(1000);
  const [water, setWater] = useState(1000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (militiaData) {
      setSelectedUserId(militiaData.user.uid);
      setName(militiaData.militia.name || '');
      setType(militiaData.militia.type || 'aggressive');
      setCorruptionMoney(militiaData.militia.resources?.corruptionMoney || 0);
      setGold(militiaData.militia.resources?.gold || 0);
      setAmmo(militiaData.militia.resources?.ammo || 0);
      setFuel(militiaData.militia.resources?.fuel || 0);
      setMedicine(militiaData.militia.resources?.medicine || 100);
      setFood(militiaData.militia.resources?.food || 0);
      setWater(militiaData.militia.resources?.water || 0);
    } else {
      const firstWithoutMilitia = users.find(u => !u.militia);
      setSelectedUserId(firstWithoutMilitia?.uid || users[0]?.uid || '');
      setName('');
      setType('aggressive');
      setCorruptionMoney(1000000);
      setGold(500);
      setAmmo(5000);
      setFuel(2000);
      setMedicine(100);
      setFood(1000);
      setWater(1000);
    }
  }, [militiaData, users]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('يرجى كتابة اسم المليشيا');
      return;
    }
    if (!selectedUserId) {
      toast.error('يرجى تحديد مالك المليشيا');
      return;
    }

    setIsSubmitting(true);
    try {
      const targetUser = users.find(u => u.uid === selectedUserId);
      const existingMilitia = targetUser?.militia;

      const updatedMilitia: any = {
        ...(existingMilitia || {
          id: 'mil_' + Date.now(),
          soldiers: [],
          vehicles: [],
          squads: [],
          controlledResources: { oilFields: 0, ports: 0, extortion: 0 },
          controlPoints: {
            oilFields: { level: 1, strength: 100, lastAttack: 0 },
            ports: { level: 1, strength: 100, lastAttack: 0 },
            extortion: { level: 1, strength: 100, lastAttack: 0 }
          },
          inventory: { weapons: {}, armor: {}, clothing: {}, equipment: {}, logistics: {} },
          operationLogs: []
        }),
        name: name.trim(),
        type,
        leader: {
          name: targetUser?.displayName || 'الزعيم',
          image: targetUser?.photoURL || 'https://up6.cc/2026/04/177619222536134.png'
        },
        image: existingMilitia?.image || 'https://up6.cc/2026/04/17761922251511.jpeg',
        resources: {
          corruptionMoney: Number(corruptionMoney) || 0,
          gold: Number(gold) || 0,
          ammo: Number(ammo) || 0,
          fuel: Number(fuel) || 0,
          medicine: Number(medicine) || 0,
          food: Number(food) || 0,
          water: Number(water) || 0
        }
      };

      await updateDoc(doc(db, 'users', selectedUserId), {
        militia: updatedMilitia
      });

      toast.success(isEditing ? 'تم تعديل المليشيا بنجاح' : 'تم إنشاء المليشيا للاعب');
      onMilitiaSaved(selectedUserId, updatedMilitia);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${selectedUserId}`);
      toast.error('فشل في حفظ المليشيا');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUserId) return;
    if (!window.confirm('هل أنت متأكد من حذف هذه المليشيا نهائياً؟')) return;

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'users', selectedUserId), {
        militia: null
      });
      toast.success('تم حذف المليشيا بنجاح');
      if (onMilitiaDeleted) onMilitiaDeleted(selectedUserId);
      onClose();
    } catch (error) {
      toast.error('فشل في حذف المليشيا');
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
              <Swords size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEditing ? `تعديل المليشيا: ${militiaData?.militia.name}` : 'إضافة مليشيا جديدة'}
              </h3>
              <p className="text-xs text-zinc-400">إدارة القوة العسكرية، الموارد، والعتاد المسلح</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800">
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-3 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">اسم المليشيا *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="مثال: لواء العقارب"
                className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">مالك المليشيا *</label>
              <select
                disabled={isEditing}
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none disabled:opacity-60"
              >
                {users.map(u => (
                  <option key={u.uid} value={u.uid}>
                    {u.displayName} ({u.role}) {u.militia ? '(يملك مليشيا)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">عقيدة المليشيا (النوع)</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
              >
                <option value="aggressive">هجومية (Aggressive)</option>
                <option value="government">حكومية (Government)</option>
                <option value="external">خارجية (External)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-red-400 block mb-1">أموال الفساد ($)</label>
              <input
                type="number"
                value={corruptionMoney}
                onChange={e => setCorruptionMoney(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-red-900/60 rounded-lg px-3 py-1.5 text-xs text-red-300 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-yellow-400 block mb-1">الذهب العسكري</label>
              <input
                type="number"
                value={gold}
                onChange={e => setGold(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-yellow-900/60 rounded-lg px-3 py-1.5 text-xs text-yellow-300 focus:border-yellow-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-orange-400 block mb-1">صناديق الذخيرة</label>
              <input
                type="number"
                value={ammo}
                onChange={e => setAmmo(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-orange-900/60 rounded-lg px-3 py-1.5 text-xs text-orange-300 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-blue-400 block mb-1">براميل الوقود</label>
              <input
                type="number"
                value={fuel}
                onChange={e => setFuel(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-blue-900/60 rounded-lg px-3 py-1.5 text-xs text-blue-300 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-emerald-400 block mb-1">الأدوية الميدانية</label>
              <input
                type="number"
                value={medicine}
                onChange={e => setMedicine(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-emerald-900/60 rounded-lg px-3 py-1.5 text-xs text-emerald-300 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-zinc-800 flex justify-between items-center">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-xs font-bold text-red-400 hover:text-white hover:bg-red-600/30 border border-red-500/30 rounded-lg transition-colors flex items-center gap-1"
              >
                <Trash2 size={13} />
                <span>حذف المليشيا</span>
              </button>
            ) : <div />}

            <div className="flex gap-2">
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
                className="px-4 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'جاري الحفظ...' : isEditing ? 'حفظ التعديلات' : 'تأكيد الإنشاء'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
