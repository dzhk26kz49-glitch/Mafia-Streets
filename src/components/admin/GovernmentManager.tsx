import React, { useState } from 'react';
import { Vote, DollarSign, Users, Award, Plus, Trash2, Edit2, RefreshCw, CheckCircle, ShieldAlert, X } from 'lucide-react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { UserProfile } from '../../store/useAuthStore';
import { formatNumber, formatMoney } from '../../lib/utils';
import { toast } from 'sonner';

interface GovernmentManagerProps {
  govData: any;
  users: UserProfile[];
  onGovUpdated: (newGov: any) => void;
  onForceDistribution: () => Promise<void>;
  onToggleElection: () => Promise<void>;
}

export const GovernmentManager: React.FC<GovernmentManagerProps> = ({
  govData,
  users,
  onGovUpdated,
  onForceDistribution,
  onToggleElection
}) => {
  const [budget, setBudget] = useState(govData?.budget || 1000000000);
  const [selectedPM, setSelectedPM] = useState(govData?.primeMinisterId || '');
  const [parliamentSeats, setParliamentSeats] = useState(govData?.parliamentSeats || 100);
  const [isSaving, setIsSaving] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);

  // Candidate adding state
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [candidateUserId, setCandidateUserId] = useState('');
  const [candidateVotes, setCandidateVotes] = useState(10);

  // Candidate editing state
  const [editingCandidateUid, setEditingCandidateUid] = useState<string | null>(null);
  const [editVotesAmount, setEditVotesAmount] = useState(0);

  const handleSaveGovSettings = async () => {
    setIsSaving(true);
    try {
      const pmUser = users.find(u => u.uid === selectedPM);
      const updates = {
        budget: Number(budget) || 0,
        primeMinisterId: selectedPM || '',
        primeMinisterName: pmUser?.displayName || '',
        primeMinisterGangId: pmUser?.gangId || '',
        parliamentSeats: Number(parliamentSeats) || 100
      };

      await updateDoc(doc(db, 'government', 'current'), updates);
      toast.success('تم حفظ إعدادات الحكومة بنجاح');
      onGovUpdated({ ...govData, ...updates });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'government/current');
      toast.error('فشل في حفظ إعدادات الحكومة');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCandidate = async () => {
    if (!candidateUserId) {
      toast.error('يرجى اختيار لاعب لترشيحه');
      return;
    }
    const candidateUser = users.find(u => u.uid === candidateUserId);
    const existing = (govData?.candidates || []).some((c: any) => c.uid === candidateUserId);
    if (existing) {
      toast.error('هذا اللاعب مرشح بالفعل في القائمة');
      return;
    }

    const newCandidate = {
      uid: candidateUserId,
      name: candidateUser?.displayName || 'مرشح',
      gangId: candidateUser?.gangId || null,
      votes: Number(candidateVotes) || 0
    };

    const updatedCandidates = [...(govData?.candidates || []), newCandidate];
    try {
      await updateDoc(doc(db, 'government', 'current'), {
        candidates: updatedCandidates
      });
      toast.success('تمت إضافة المرشح بنجاح');
      onGovUpdated({ ...govData, candidates: updatedCandidates });
      setShowAddCandidate(false);
      setCandidateUserId('');
      setCandidateVotes(10);
    } catch (error) {
      toast.error('فشل في إضافة المرشح');
    }
  };

  const handleUpdateCandidateVotes = async (uid: string) => {
    const updatedCandidates = (govData?.candidates || []).map((c: any) => {
      if (c.uid === uid) {
        return { ...c, votes: Number(editVotesAmount) || 0 };
      }
      return c;
    });

    try {
      await updateDoc(doc(db, 'government', 'current'), {
        candidates: updatedCandidates
      });
      toast.success('تم تعديل الأصوات بنجاح');
      onGovUpdated({ ...govData, candidates: updatedCandidates });
      setEditingCandidateUid(null);
    } catch (error) {
      toast.error('فشل في تعديل الأصوات');
    }
  };

  const handleDeleteCandidate = async (uid: string) => {
    const updatedCandidates = (govData?.candidates || []).filter((c: any) => c.uid !== uid);
    try {
      await updateDoc(doc(db, 'government', 'current'), {
        candidates: updatedCandidates
      });
      toast.success('تم حذف المرشح من الانتخابات');
      onGovUpdated({ ...govData, candidates: updatedCandidates });
    } catch (error) {
      toast.error('فشل في حذف المرشح');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Quick Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Treasury */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-xs text-zinc-400">الخزينة العامة</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5">
              {formatMoney(govData?.budget || 0)}
            </div>
          </div>
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <DollarSign size={16} />
          </div>
        </div>

        {/* Prime Minister */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-xs text-zinc-400">رئيس الدولة / الوزراء</div>
            <div className="text-base font-bold text-white mt-0.5 truncate max-w-[150px]">
              {govData?.primeMinisterName || 'شاغر حالياً'}
            </div>
          </div>
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
            <Award size={16} />
          </div>
        </div>

        {/* Election Status */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-xs text-zinc-400">حالة الانتخابات</div>
            <div className="text-sm font-bold mt-0.5 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${govData?.electionActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className={govData?.electionActive ? 'text-emerald-400' : 'text-red-400'}>
                {govData?.electionActive ? 'نشطة حالياً' : 'مغلقة'}
              </span>
            </div>
          </div>
          <button
            onClick={onToggleElection}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
              govData?.electionActive
                ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            {govData?.electionActive ? 'إنهاء الاقتراع' : 'فتح الاقتراع'}
          </button>
        </div>
      </div>

      {/* Main Government Form & Salary Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Settings Form */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
            <Vote size={16} className="text-red-400" />
            <h4 className="text-sm font-bold text-white">التحكم في الحكومة والخزينة</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-zinc-300 block mb-1">تعيين رئيس الدولة مباشرة</label>
              <select
                value={selectedPM}
                onChange={e => setSelectedPM(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
              >
                <option value="">-- بدون رئيس (شاغر) --</option>
                {users.map(u => (
                  <option key={u.uid} value={u.uid}>
                    {u.displayName} ({u.role}) - LVL {u.level}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-emerald-400 block mb-1">ميزانية الدولة ($)</label>
              <input
                type="number"
                value={budget}
                onChange={e => setBudget(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-emerald-900/60 rounded-lg px-3 py-1.5 text-xs text-emerald-300 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">مقاعد البرلمان</label>
              <input
                type="number"
                value={parliamentSeats}
                onChange={e => setParliamentSeats(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSaveGovSettings}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? 'جاري الحفظ...' : 'تحديث بيانات الحكومة'}
            </button>
          </div>
        </div>

        {/* Salary Distribution Box */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <RefreshCw size={16} className="text-blue-400" />
              <h4 className="text-sm font-bold text-white">توزيع رواتب المواطنين</h4>
            </div>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              يقوم هذا الأمر بصرف رواتب فورية لجميع اللاعبين النشطين المسجلين في اللعبة مباشرة من الخزينة.
            </p>
            <div className="mt-3 p-2.5 bg-black/40 rounded-lg border border-zinc-800/80 text-xs flex justify-between">
              <span className="text-zinc-400">إجمالي الرواتب المقدر:</span>
              <span className="text-emerald-400 font-bold">{formatMoney(users.length * 5000)}</span>
            </div>
          </div>

          <button
            onClick={async () => {
              setIsDistributing(true);
              try {
                await onForceDistribution();
              } finally {
                setIsDistributing(false);
              }
            }}
            disabled={isDistributing}
            className="w-full py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md"
          >
            <RefreshCw size={14} className={isDistributing ? 'animate-spin' : ''} />
            <span>{isDistributing ? 'جاري التوزيع...' : 'صرف الرواتب لجميع اللاعبين الآن'}</span>
          </button>
        </div>
      </div>

      {/* Candidates CRUD Section */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-yellow-400" />
            <h4 className="text-sm font-bold text-white">
              قائمة المرشحين للرئاسة ({govData?.candidates?.length || 0})
            </h4>
          </div>
          <button
            onClick={() => setShowAddCandidate(!showAddCandidate)}
            className="px-2.5 py-1 text-xs font-semibold bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 rounded-lg transition-colors flex items-center gap-1"
          >
            <Plus size={12} />
            <span>إضافة مرشح</span>
          </button>
        </div>

        {/* Add Candidate Form */}
        {showAddCandidate && (
          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2 animate-in fade-in duration-150">
            <div className="text-xs font-bold text-white">إضافة مرشح جديد للاقتراع</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">اختيار اللاعب</label>
                <select
                  value={candidateUserId}
                  onChange={e => setCandidateUserId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                >
                  <option value="">-- اختر لاعباً --</option>
                  {users.map(u => (
                    <option key={u.uid} value={u.uid}>
                      {u.displayName} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">عدد الأصوات المبدئي</label>
                <input
                  type="number"
                  value={candidateVotes}
                  onChange={e => setCandidateVotes(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddCandidate(false)}
                className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleAddCandidate}
                className="px-3 py-1 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
              >
                تأكيد الإضافة
              </button>
            </div>
          </div>
        )}

        {/* Candidates List */}
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
          {(govData?.candidates || []).map((cand: any) => {
            const isEditingThis = editingCandidateUid === cand.uid;
            return (
              <div
                key={cand.uid}
                className="flex items-center justify-between p-2.5 bg-zinc-950/80 rounded-lg border border-zinc-800/80 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-white">{cand.name}</span>
                  {cand.gangId && (
                    <span className="text-[10px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded">عصابة</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isEditingThis ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={editVotesAmount}
                        onChange={e => setEditVotesAmount(Number(e.target.value))}
                        className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-xs text-white"
                      />
                      <button
                        onClick={() => handleUpdateCandidateVotes(cand.uid)}
                        className="px-2 py-0.5 text-xs bg-emerald-600 text-white rounded font-bold"
                      >
                        حفظ
                      </button>
                      <button
                        onClick={() => setEditingCandidateUid(null)}
                        className="px-1.5 py-0.5 text-xs text-zinc-400"
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {formatNumber(cand.votes || 0)} صوت
                      </span>
                      <button
                        onClick={() => {
                          setEditingCandidateUid(cand.uid);
                          setEditVotesAmount(cand.votes || 0);
                        }}
                        className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800"
                        title="تعديل الأصوات"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteCandidate(cand.uid)}
                        className="p-1 text-red-400 hover:text-red-300 rounded hover:bg-red-500/10"
                        title="حذف المرشح"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {(!govData?.candidates || govData.candidates.length === 0) && (
            <div className="text-center py-6 text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-lg">
              لا يوجد مرشحين مسجلين في الانتخابات حالياً
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
