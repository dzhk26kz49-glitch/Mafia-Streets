import React, { useState, useEffect } from 'react';
import { Megaphone, Send, Mail, Trash2, Clock, Users, User, CheckCircle } from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile } from '../../store/useAuthStore';
import { formatDate } from '../../lib/utils';
import { toast } from 'sonner';

interface BroadcastManagerProps {
  users: UserProfile[];
  onSendGlobalBroadcast: (message: string) => Promise<void>;
  onSendDirectMessage: (targetUid: string, message: string) => Promise<void>;
}

export const BroadcastManager: React.FC<BroadcastManagerProps> = ({
  users,
  onSendGlobalBroadcast,
  onSendDirectMessage
}) => {
  const [broadcastText, setBroadcastText] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  const [directMessageText, setDirectMessageText] = useState('');
  const [selectedUserForDirect, setSelectedUserForDirect] = useState('');
  const [isSendingDirect, setIsSendingDirect] = useState(false);

  const [broadcastHistory, setBroadcastHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const q = query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc'), limit(10));
      const snap = await getDocs(q);
      setBroadcastHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Error fetching broadcast history', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;

    setIsSendingBroadcast(true);
    try {
      await onSendGlobalBroadcast(broadcastText.trim());
      // Save to broadcasts collection for history
      await addDoc(collection(db, 'broadcasts'), {
        message: broadcastText.trim(),
        sender: 'الإدارة العليا',
        createdAt: serverTimestamp()
      });
      setBroadcastText('');
      fetchHistory();
    } catch (error) {
      // toast is already handled in parent or here
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForDirect || !directMessageText.trim()) {
      toast.error('يرجى اختيار اللاعب وكتابة نص الرسالة');
      return;
    }

    setIsSendingDirect(true);
    try {
      await onSendDirectMessage(selectedUserForDirect, directMessageText.trim());
      setDirectMessageText('');
      setSelectedUserForDirect('');
    } catch (error) {
      // toast handled
    } finally {
      setIsSendingDirect(false);
    }
  };

  const handleDeleteBroadcast = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'broadcasts', id));
      setBroadcastHistory(broadcastHistory.filter(b => b.id !== id));
      toast.success('تم حذف الإعلان');
    } catch (e) {
      toast.error('فشل في حذف الإعلان');
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Global Broadcast */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
            <Megaphone size={16} className="text-purple-400" />
            <h4 className="text-sm font-bold text-white">إرسال إذاعة عامة لجميع اللاعبين</h4>
          </div>

          <form onSubmit={handleBroadcastSubmit} className="space-y-2">
            <textarea
              rows={3}
              value={broadcastText}
              onChange={e => setBroadcastText(e.target.value)}
              placeholder="اكتب الإعلان أو التنبيه العاجل الذي سيظهر لجميع اللاعبين..."
              className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg p-2.5 text-xs text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none resize-none"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSendingBroadcast || !broadcastText.trim()}
                className="px-3.5 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1.5 shadow-md"
              >
                <Send size={13} />
                <span>{isSendingBroadcast ? 'جاري البث...' : 'بث الإعلان العام'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Direct Private Message */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
            <Mail size={16} className="text-blue-400" />
            <h4 className="text-sm font-bold text-white">إرسال رسالة خاصة سرية للاعب</h4>
          </div>

          <form onSubmit={handleDirectSubmit} className="space-y-2">
            <select
              value={selectedUserForDirect}
              onChange={e => setSelectedUserForDirect(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">-- حدد اللاعب المستهدف --</option>
              {users.map(u => (
                <option key={u.uid} value={u.uid}>
                  {u.displayName} ({u.role}) - LVL {u.level}
                </option>
              ))}
            </select>

            <textarea
              rows={2}
              value={directMessageText}
              onChange={e => setDirectMessageText(e.target.value)}
              placeholder="اكتب الرسالة الخاصة باللاعب..."
              className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg p-2.5 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none resize-none"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSendingDirect || !selectedUserForDirect || !directMessageText.trim()}
                className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1.5 shadow-md"
              >
                <Send size={13} />
                <span>{isSendingDirect ? 'جاري الإرسال...' : 'إرسال الرسالة الخاصة'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Broadcast History */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Clock size={14} className="text-zinc-400" />
            <span>سجل الإعلانات العامة السابقة ({broadcastHistory.length})</span>
          </h4>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
          {broadcastHistory.map(b => (
            <div
              key={b.id}
              className="flex items-center justify-between p-2 bg-zinc-950/70 rounded-lg border border-zinc-800/80 text-xs"
            >
              <div className="space-y-0.5 max-w-[80%]">
                <p className="text-zinc-200 font-medium leading-relaxed">{b.message}</p>
                <span className="text-[10px] text-zinc-500 block">
                  {b.createdAt ? formatDate(b.createdAt) : 'الآن'}
                </span>
              </div>
              <button
                onClick={() => handleDeleteBroadcast(b.id)}
                className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-red-500/10"
                title="حذف الإعلان"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {broadcastHistory.length === 0 && (
            <div className="text-center py-4 text-zinc-500 text-xs">
              {loadingHistory ? 'جاري تحميل السجل...' : 'لا توجد إعلانات سابقة'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
