import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore, Role } from '../store/useAuthStore';
import { Shield, Skull, Briefcase, Car, Users, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const ROLES = [
  { id: 'Random', icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 'Boss', icon: Shield, color: 'text-red-500', bg: 'bg-red-500/10' },
  { id: 'Trader', icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'Thief', icon: Car, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { id: 'Smuggler', icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { id: 'Criminal', icon: Skull, color: 'text-zinc-400', bg: 'bg-zinc-800' },
];

import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export default function Login() {
  const { t } = useTranslation();
  const { user, profile, createProfile, loggingIn, loading } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<Role>('Random');
  const [nickname, setNickname] = useState('');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  useEffect(() => {
    if (user && !profile && user.displayName && !nickname) {
      setNickname(user.displayName);
    }
  }, [user, profile]);

  const handleLogin = () => {
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    useAuthStore.setState({ loggingIn: true });
    
    signInWithPopup(auth, googleProvider)
      .then(() => {
        useAuthStore.setState({ loggingIn: false });
      })
      .catch((error: any) => {
        if (error.code === 'auth/popup-blocked') {
          toast.loading('جاري تحويلك لتسجيل الدخول...');
          signInWithRedirect(auth, googleProvider).catch(() => {
             toast.error('فشل التحويل لتسجيل الدخول.');
             useAuthStore.setState({ loggingIn: false });
          });
        } else if (error.code === 'auth/popup-closed-by-user') {
          toast.info('تم إغلاق نافذة تسجيل الدخول.');
          useAuthStore.setState({ loggingIn: false });
        } else {
          toast.error('فشل تسجيل الدخول. تأكد من إعدادات الحساب.');
          useAuthStore.setState({ loggingIn: false });
        }
      });
  };

  const handleCreateProfile = async () => {
    if (!nickname.trim()) {
      toast.error(t('login.nicknameRequired'));
      return;
    }
    setIsCreatingProfile(true);
    try {
      await createProfile(selectedRole, nickname);
    } catch (error: any) {
      toast.error(error.message || t('common.failed'));
    } finally {
      setIsCreatingProfile(false);
    }
  };

  if (user && profile) {
    return <Navigate to="/" />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      </div>
    );
  }

  if (user && !profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        <div className="max-w-md w-full space-y-8 bg-zinc-950/80 backdrop-blur-xl p-8 rounded-2xl border border-zinc-800 shadow-2xl relative z-10 text-right" dir="rtl">
          <div className="text-center">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-500 to-red-600 uppercase mb-2">
              MAFIA STREETS
            </h1>
            <h2 className="text-xl font-bold text-white">اختر شخصيتك</h2>
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">اسم اللاعب</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="اكتب اسمك هنا..."
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500"
              maxLength={20}
            />
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {ROLES.map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id as Role)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    isSelected ? 'border-red-500 bg-red-500/10' : 'border-zinc-800 bg-zinc-900'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${role.bg} ${role.color}`}>
                    <Icon size={20} />
                  </div>
                  <span className="font-bold text-white">{role.id}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={handleCreateProfile}
            disabled={isCreatingProfile}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {isCreatingProfile ? 'جاري الإنشاء...' : 'دخول المدينة'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <div className="max-w-md w-full space-y-6 bg-zinc-950/80 backdrop-blur-xl p-8 rounded-2xl border border-zinc-800 shadow-2xl relative z-10 text-center">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-500 to-red-600 uppercase mb-2">
          MAFIA STREETS
        </h1>
        <p className="text-zinc-400 text-sm mb-6">لعبة استراتيجية المافيا الكبرى</p>
        <button
          onClick={handleLogin}
          disabled={loggingIn}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-200 text-black font-bold py-4 px-4 rounded-xl transition-colors cursor-pointer"
        >
          {loggingIn ? (
            <span>جاري تسجيل الدخول...</span>
          ) : (
            <>
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>تسجيل الدخول عبر Gmail</span>
            </>
          )}
        </button>

        {/* Legal Disclaimer */}
        <div className="mt-6 pt-6 border-t border-zinc-900 text-right" dir="rtl">
          <h3 className="text-xs font-bold text-zinc-400 mb-2">{t('disclaimerTitle', 'إخلاء مسؤولية قانوني')}</h3>
          <div className="bg-black/50 p-3 rounded-xl border border-zinc-900 text-[11px] text-zinc-500 max-h-32 overflow-y-auto leading-relaxed whitespace-pre-line">
            {t('disclaimerText', 'تُعد لعبة MAFIA STREETS عملاً خيالياً لأغراض الترفيه فقط، ولا تمثل أو تعكس الواقع بأي شكل من الأشكال. إن جميع الشخصيات، الأحداث، المواقع، والحوارات الواردة في اللعبة هي من نسج الخيال، وأي تشابه مع أشخاص أو أحداث حقيقية هو محض صدفة غير مقصودة.\n\nباستخدامك لهذه اللعبة، فإنك توافق صراحةً على أن استخدامك لها يتم على مسؤوليتك الشخصية بالكامل، ولا تتحمل إدارة اللعبة أو مطوروها أو ناشروها أي مسؤولية قانونية أو تعويضية عن أي أضرار مباشرة أو غير مباشرة قد تنشأ عن استخدام اللعبة أو سوء استخدامها أو تفسير محتواها.\n\nلا تتحمل إدارة اللعبة أي مسؤولية عن أي محتوى يتم إدراكه أو تفسيره بشكل مخالف لغرضه الترفيهي، كما لا تتحمل أي مسؤولية عن تصرفات المستخدمين داخل اللعبة أو خارجها.\n\nهذه اللعبة مخصصة حصراً للأشخاص الذين تبلغ أعمارهم 18 عاماً فما فوق. وبمجرد قيامك بالتسجيل أو استخدام اللعبة، فإنك تقرّ وتتعهد بأنك قد بلغت السن القانونية (18 عاماً أو أكثر). ولا تتحمل إدارة اللعبة أي مسؤولية عن دخول القاصرين أو استخدامهم للعبة بأي شكل من الأشكال، وتُعد مسؤولية التحقق من العمر تقع على المستخدم نفسه أو ولي أمره.\n\nتحتفظ إدارة اللعبة بالحق في تعديل هذا الإخلاء أو شروط الاستخدام في أي وقت دون إشعار مسبق، ويُعد استمرارك في استخدام اللعبة موافقة ضمنية على أي تحديثات يتم إجراؤها.')}
          </div>
        </div>
      </div>
    </div>
  );
}
