import React, { useState, useEffect } from 'react';
import { X, Shield, Plus, Edit2, Trash2, Users, UserPlus, UserMinus, DollarSign, Award, Activity } from 'lucide-react';
import { doc, updateDoc, setDoc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { UserProfile } from '../../store/useAuthStore';
import { toast } from 'sonner';

interface GangManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  gangToEdit?: any | null; // if null, it's "Add Gang" mode
  users: UserProfile[];
  onGangSaved: (gang: any, isNew: boolean) => void;
  onGangDeleted?: (gangId: string) => void;
}

export const GangManagerModal: React.FC<GangManagerModalProps> = ({
  isOpen,
  onClose,
  gangToEdit,
  users,
  onGangSaved,
  onGangDeleted
}) => {
  const isEditing = Boolean(gangToEdit);
  const [name, setName] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [level, setLevel] = useState(1);
  const [respect, setRespect] = useState(100);
  const [balance, setBalance] = useState(1000000);
  const [description, setDescription] = useState('');
  const [selectedNewMember, setSelectedNewMember] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (gangToEdit) {
      setName(gangToEdit.name || '');
      setLeaderId(gangToEdit.leaderId || '');
      setLevel(gangToEdit.level || 1);
      setRespect(gangToEdit.respect || 0);
      setBalance(gangToEdit.balance || gangToEdit.vault || 0);
      setDescription(gangToEdit.description || '');
    } else {
      setName('');
      setLeaderId(users[0]?.uid || '');
      setLevel(1);
      setRespect(100);
      setBalance(1000000);
      setDescription('');
    }
  }, [gangToEdit, users]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('يرجى إدخال اسم العصابة');
      return;
    }
    if (!leaderId) {
      toast.error('يرجى اختيار قائد للعصابة');
      return;
    }

    setIsSubmitting(true);
    try {
      const gangId = gangToEdit?.id || 'gang_' + Date.now();
      const gangData = {
        name: name.trim(),
        leaderId,
        level: Number(level) || 1,
        respect: Number(respect) || 0,
        balance: Number(balance) || 0,
        vault: Number(balance) || 0,
        description: description.trim(),
        updatedAt: serverTimestamp(),
        ...(!isEditing && {
          id: gangId,
          createdAt: serverTimestamp(),
          members: [leaderId],
          headquarters: 'baghdad'
        })
      };

      if (isEditing) {
        await updateDoc(doc(db, 'gangs', gangId), gangData);
        // Also update leader's user document
        await updateDoc(doc(db, 'users', leaderId), {
          gangId: gangId,
          gangName: name.trim(),
          gangRole: 'Leader'
        });
        toast.success('تم تحديث بيانات العصابة');
        onGangSaved({ ...gangToEdit, ...gangData }, false);
      } else {
        await setDoc(doc(db, 'gangs', gangId), gangData);
        // Set leader profile
        await updateDoc(doc(db, 'users', leaderId), {
          gangId: gangId,
          gangName: name.trim(),
          gangRole: 'Leader'
        });
        toast.success('تم إنشاء العصابة بنجاح');
        onGangSaved(gangData, true);
      }
      onClose();
    } catch (error) {
      handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, `gangs/${gangToEdit?.id || 'new'}`);
      toast.error('فشل في حفظ بيانات العصابة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedNewMember || !gangToEdit) return;
    try {
      await updateDoc(doc(db, 'gangs', gangToEdit.id), {
        members: arrayUnion(selectedNewMember)
      });
      await updateDoc(doc(db, 'users', selectedNewMember), {
        gangId: gangToEdit.id,
        gangName: gangToEdit.name,
        gangRole: 'Member'
      });
      toast.success('تمت إضافة العضو للعصابة');
      const updatedMembers = [...(gangToEdit.members || []), selectedNewMember];
      onGangSaved({ ...gangToEdit, members: updatedMembers }, false);
      setSelectedNewMember('');
    } catch (error) {
      toast.error('فشل في إضافة العضو');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!gangToEdit) return;
    if (memberId === gangToEdit.leaderId) {
      toast.error('لا يمكن طرد قائد العصابة، عيّن قائداً آخر أولاً');
      return;
    }
    try {
      await updateDoc(doc(db, 'gangs', gangToEdit.id), {
        members: arrayRemove(memberId)
      });
      await updateDoc(doc(db, 'users', memberId), {
        gangId: null,
        gangName: null,
        gangRole: null
      });
      toast.success('تم إخراج العضو من العصابة');
      const updatedMembers = (gangToEdit.members || []).filter((m: string) => m !== memberId);
      onGangSaved({ ...gangToEdit, members: updatedMembers }, false);
    } catch (error) {
      toast.error('فشل في إزالة العضو');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-600/20 text-red-400 rounded-lg border border-red-500/30">
              <Shield size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEditing ? `تعديل العصابة: ${gangToEdit.name}` : 'إنشاء عصابة جديدة'}
              </h3>
              <p className="text-xs text-zinc-400">التحكم في بيانات العصابة، القائد، الخزينة، والأعضاء</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">اسم العصابة *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="مثال: مافيا العقرب"
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">قائد العصابة *</label>
                <select
                  value={leaderId}
                  onChange={e => setLeaderId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
                >
                  <option value="">-- اختر قائداً --</option>
                  {users.map(u => (
                    <option key={u.uid} value={u.uid}>
                      {u.displayName} ({u.role}) - LVL {u.level}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">مستوى العصابة</label>
                <input
                  type="number"
                  min={1}
                  value={level}
                  onChange={e => setLevel(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-yellow-400 block mb-1">نقاط الاحترام (Respect)</label>
                <input
                  type="number"
                  value={respect}
                  onChange={e => setRespect(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-xs text-yellow-300 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-emerald-400 block mb-1">رصيد خزينة العصابة ($)</label>
                <input
                  type="number"
                  value={balance}
                  onChange={e => setBalance(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-emerald-900/60 rounded-lg px-3 py-1.5 text-xs text-emerald-300 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-zinc-300 block mb-1">وصف أو شعار العصابة</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="وصف مختصر للعصابة..."
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-md"
              >
                {isSubmitting ? 'جاري الحفظ...' : isEditing ? 'حفظ التعديلات' : 'إنشاء العصابة'}
              </button>
            </div>
          </form>

          {/* Members Management (in Edit Mode) */}
          {isEditing && (
            <div className="border-t border-zinc-800 pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Users size={14} className="text-red-400" />
                  <span>أعضاء العصابة ({gangToEdit.members?.length || 0})</span>
                </h4>
              </div>

              {/* Add member select */}
              <div className="flex gap-2">
                <select
                  value={selectedNewMember}
                  onChange={e => setSelectedNewMember(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
                >
                  <option value="">-- ضم لاعب للعصابة --</option>
                  {users
                    .filter(u => !gangToEdit.members?.includes(u.uid))
                    .map(u => (
                      <option key={u.uid} value={u.uid}>
                        {u.displayName} ({u.role}) - LVL {u.level}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddMember}
                  disabled={!selectedNewMember}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1"
                >
                  <UserPlus size={12} />
                  <span>ضم</span>
                </button>
              </div>

              {/* Members list */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                {(gangToEdit.members || []).map((mId: string) => {
                  const memberUser = users.find(u => u.uid === mId);
                  const isLeader = mId === gangToEdit.leaderId;
                  return (
                    <div
                      key={mId}
                      className="flex items-center justify-between p-2 bg-zinc-900/80 rounded-lg border border-zinc-800 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{memberUser?.displayName || mId}</span>
                        {isLeader && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">
                            الزعيم
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-400">LVL {memberUser?.level || 1}</span>
                      </div>
                      {!isLeader && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(mId)}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                          title="طرد من العصابة"
                        >
                          <UserMinus size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
