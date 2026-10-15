import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore, Role } from '../store/useAuthStore';
import { Shield, Skull, Briefcase, Car, Users, Sparkles, UserPlus, ExternalLink, Copy, Check, Globe, X, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
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
import { auth, googleProvider, firebaseConfig } from '../lib/firebase';

export default function Login() {
  const { t, i18n } = useTranslation();
  const { user, profile, createProfile, loggingIn, loading } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<Role>('Random');
  const [nickname, setNickname] = useState('');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [showDomainGuide, setShowDomainGuide] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);

  const [liveCheckLoading, setLiveCheckLoading] = useState(false);
  const [liveCheckResult, setLiveCheckResult] = useState<{
    success: boolean;
    projectId?: string;
    authorizedDomains?: string[];
    isHostAuthorized?: boolean;
    error?: string;
  } | null>(null);

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const firebaseProjectId = firebaseConfig?.projectId || 'gen-lang-client-0050850314';
  const consoleAuthSettingsUrl = `https://console.firebase.google.com/project/${firebaseProjectId}/authentication/settings`;

  const requiredDomains = Array.from(new Set([
    currentHost,
    'workers.dev',
    'pages.dev',
    'mafia-streets.mx779969.workers.dev',
    'ais-dev-a3lzou726gbx7sq3n4dxba-218257401845.europe-west1.run.app',
  ].filter(Boolean)));

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDomain(text);
    toast.success(`تم نسخ ${label} بنجاح`);
    setTimeout(() => setCopiedDomain(null), 2500);
  };

  const checkLiveDomains = async () => {
    setLiveCheckLoading(true);
    try {
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects?key=${firebaseConfig.apiKey}`);
      const data = await res.json();
      if (data.authorizedDomains) {
        const isAuthorized = data.authorizedDomains.some((d: string) => {
          if (d === currentHost) return true;
          if (currentHost.endsWith('.' + d)) return true;
          return false;
        });
        setLiveCheckResult({
          success: true,
          projectId: data.projectId,
          authorizedDomains: data.authorizedDomains,
          isHostAuthorized: isAuthorized,
        });
        if (isAuthorized) {
          toast.success('النطاق مصرح به بنجاح في Google! يمكنك تسجيل الدخول الآن.');
        } else {
          toast.warning('النطاق الحالي غير موجود في مشروع Firebase هذا لدى Google.');
        }
      } else {
        setLiveCheckResult({
          success: false,
          error: data.error?.message || 'تعذر جلب النطاقات من Google'
        });
      }
    } catch (e: any) {
      setLiveCheckResult({
        success: false,
        error: e.message || 'خطأ في الاتصال'
      });
    } finally {
      setLiveCheckLoading(false);
    }
  };

  useEffect(() => {
    if (user && !profile && user.displayName && !nickname) {
      setNickname(user.displayName);
    }
  }, [user, profile]);

  const handleLogin = () => {
    setUnauthorizedDomain(null);
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    useAuthStore.setState({ loggingIn: true });
    
    signInWithPopup(auth, googleProvider)
      .then(() => {
        setUnauthorizedDomain(null);
        setShowDomainGuide(false);
        useAuthStore.setState({ loggingIn: false });
      })
      .catch((error: any) => {
        const errorMsg = error?.message || '';
        const errorStack = error?.stack || '';
        const isUnauthorized = 
          error.code === 'auth/unauthorized-domain' ||
          errorMsg.includes('unauthorized-domain') ||
          errorMsg.includes('authorized domain') ||
          errorMsg.includes('_validateOrigin') ||
          errorStack.includes('_validateOrigin') ||
          errorMsg.includes('origin');

        if (error.code === 'auth/popup-blocked') {
          // Fallback to redirect if popup is blocked (common on mobile)
          toast.loading('جاري تحويلك لتسجيل الدخول...');
          signInWithRedirect(auth, googleProvider).catch((redirectError: any) => {
             console.warn('Redirect login error:', redirectError?.code || redirectError?.message);
             const redMsg = redirectError?.message || '';
             const redStack = redirectError?.stack || '';
             if (
               redirectError?.code === 'auth/unauthorized-domain' ||
               redMsg.includes('unauthorized-domain') ||
               redStack.includes('_validateOrigin')
             ) {
               setUnauthorizedDomain(currentHost);
               setShowDomainGuide(true);
               toast.error(`النطاق (${currentHost}) غير مصرح به في Firebase Auth.`);
             } else {
               toast.error('فشل التحويل لتسجيل الدخول.');
             }
             useAuthStore.setState({ loggingIn: false });
          });
        } else if (error.code === 'auth/popup-closed-by-user') {
          toast.info(t('errors.popupClosed') || 'تم إغلاق نافذة تسجيل الدخول.');
          useAuthStore.setState({ loggingIn: false });
        } else if (isUnauthorized) {
          setUnauthorizedDomain(currentHost);
          setShowDomainGuide(true);
          toast.error(`النطاق (${currentHost}) غير مصرح به في Firebase Auth. يرجى إضافته إلى Authorized Domains في Firebase Console.`, {
            duration: 8000
          });
          useAuthStore.setState({ loggingIn: false });
        } else if (error.code === 'auth/network-request-failed') {
          toast.error(t('errors.offline') || 'خطأ في الاتصال بالشبكة.');
          useAuthStore.setState({ loggingIn: false });
        } else {
          console.warn('Login attempt:', error?.code || error?.message);
          toast.error(t('common.failed') || 'فشل تسجيل الدخول.');
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
      console.error('Create profile error:', error);
      let errorMsg = error.message || t('common.failed');
      if (errorMsg.includes('The string did not match the expected pattern')) {
        errorMsg = t('errors.patternMismatch');
      }
      toast.error(errorMsg);
    } finally {
      setIsCreatingProfile(false);
    }
  };

  if (user && profile) {
    return <Navigate to="/" />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-luminosity"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-red-500 font-bold animate-pulse text-xl">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (user && !profile) {
    const adminEmails = [
      'imvu2024k@gmail.com',
      'soft4net2016@gmail.com',
      'zoomnet5@gmail.com'
    ];
    if (adminEmails.includes(user.email || '')) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-luminosity"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-red-500 font-bold animate-pulse text-xl">جاري تسجيل الدخول التلقائي...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-luminosity"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
        
        <div className="max-w-md w-full space-y-8 bg-zinc-950/80 backdrop-blur-xl p-8 rounded-2xl border border-zinc-800 shadow-2xl relative z-10">
          <div className="text-center">
            {/* Logo */}
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-500 to-red-600 uppercase tracking-tighter mb-4 drop-shadow-lg">
              {t('login.title') || 'MAFIA STREETS'}
            </h1>
            
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-semibold mb-3">
              <Sparkles size={14} />
              <span>لاعب جديد - أهلاً بك في المدينة</span>
            </div>

            <h2 className="text-2xl font-black text-white uppercase tracking-tight">{t('login.choose')}</h2>
            <p className="mt-1 text-xs text-zinc-400">{t('login.chooseDesc')}</p>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-bold text-zinc-400 mb-2 uppercase tracking-wider">{t('login.nickname')}</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={t('login.nicknamePlaceholder')}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-4 text-white text-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                maxLength={20}
              />
            </div>
          </div>

          <div className="space-y-3">
            {ROLES.map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id as Role)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${
                    isSelected 
                      ? 'border-red-500 bg-red-500/10' 
                      : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${role.bg} ${role.color}`}>
                    <Icon size={24} />
                  </div>
                  <span className={`font-bold text-lg ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                    {t(`roles.${role.id}`)}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleCreateProfile}
            disabled={isCreatingProfile}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatingProfile ? t('login.creating') : t('login.enter')}
          </button>

          <button
            onClick={() => useAuthStore.getState().logout()}
            className="w-full mt-4 flex items-center justify-center gap-2 border border-white text-white py-2 rounded-xl text-sm hover:bg-white/10 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            الرجوع الى الرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-luminosity"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
      
      <div className="max-w-md w-full space-y-8 bg-zinc-950/80 backdrop-blur-xl p-8 rounded-2xl border border-zinc-800 shadow-2xl relative z-10">
        <div className="text-center">
          {/* Logo */}
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-500 to-red-600 uppercase tracking-tighter mb-4 drop-shadow-lg">
            {t('login.title') || 'MAFIA STREETS'}
          </h1>
          
          {/* Disclaimer */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 mb-6 text-xs text-zinc-400 leading-relaxed text-right" dir="rtl">
            <p className="mb-2 font-bold text-red-500">{t('login.disclaimerTitle')}</p>
            <p className="whitespace-pre-wrap">{t('login.disclaimerText')}</p>
          </div>
        </div>

        <div className="space-y-4">
          {(unauthorizedDomain || showDomainGuide) && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-300 text-right space-y-3.5 animate-in fade-in relative" dir="rtl">
              <div className="flex items-center justify-between gap-2 border-b border-amber-500/20 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setUnauthorizedDomain(null);
                      setShowDomainGuide(false);
                      setLiveCheckResult(null);
                    }}
                    className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                    title="إغلاق التنبيه"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <p className="font-bold flex items-center gap-1.5 text-amber-400 text-sm">
                    <span>⚠️ تفعيل النطاقات في Firebase Authentication</span>
                  </p>
                </div>
                <a
                  href={consoleAuthSettingsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded text-[11px] transition-colors shrink-0"
                >
                  <span>فتح إعدادات المشروع</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Crucial Note about Project ID */}
              <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-amber-500/20 text-[11px] leading-relaxed text-zinc-300 space-y-1">
                <div className="flex items-center gap-1 text-amber-300 font-bold">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>تنبيه هام حول معرّف المشروع:</span>
                </div>
                <p>
                  المشروع المتصل به التطبيق حالياً هو: <code className="text-white bg-black/70 px-1 py-0.5 rounded font-mono font-bold text-amber-200 select-all">{firebaseProjectId}</code>
                </p>
                <p className="text-zinc-400">
                  إذا أضفت النطاق في مشروع مختلف بحسابك، لن يتعرف عليه هذا التطبيق إلا إذا أضفته في نفس المشروع الموضح أعلاه، أو ربطت التطبيق بمشروعك عبر متغيرات البيئة في Cloudflare Pages.
                </p>
              </div>

              <p className="text-zinc-300 leading-relaxed text-[11px]">
                أضف النطاقات التالية إلى قائمة <strong className="text-white">Authorized Domains</strong> (إضافة النطاق الأب <code className="text-amber-200">workers.dev</code> أو <code className="text-amber-200">pages.dev</code> يفعل جميع النطاقات الفرعية تلقائياً):
              </p>

              {/* List of domains */}
              <div className="space-y-1.5">
                {requiredDomains.map((domain) => (
                  <div
                    key={domain}
                    className="flex items-center justify-between gap-2 bg-black/60 px-2.5 py-1.5 rounded-lg border border-zinc-800 text-[11px]"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Globe className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <code className="text-amber-200 font-mono select-all truncate">{domain}</code>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(domain, domain)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[10px] font-semibold transition-colors shrink-0"
                    >
                      {copiedDomain === domain ? (
                        <>
                          <Check className="w-3 h-3 text-green-400" />
                          <span className="text-green-400">تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>نسخ</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-500/10">
                <button
                  type="button"
                  onClick={() => copyToClipboard(requiredDomains.join('\n'), 'جميع النطاقات')}
                  className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>نسخ جميع النطاقات معاً</span>
                </button>
                <button
                  type="button"
                  onClick={checkLiveDomains}
                  disabled={liveCheckLoading}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-amber-300 rounded text-[10px] font-semibold transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${liveCheckLoading ? 'animate-spin' : ''}`} />
                  <span>{liveCheckLoading ? 'جاري الفحص من Google...' : '🔍 فحص النطاقات المصرح بها لدى Google'}</span>
                </button>
              </div>

              {/* Live check result */}
              {liveCheckResult && (
                <div className={`p-2.5 rounded-lg border text-[11px] space-y-1.5 ${liveCheckResult.isHostAuthorized ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                  <div className="flex items-center gap-1.5 font-bold">
                    {liveCheckResult.isHostAuthorized ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span>النطاق مصرح به بنجاح في Google!</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span>خوادم Google تؤكد أن النطاق الحالي ({currentHost}) غير مصرح به بعد في مشروع {firebaseProjectId}</span>
                      </>
                    )}
                  </div>
                  {liveCheckResult.authorizedDomains && (
                    <div className="text-[10px] text-zinc-300 space-y-0.5">
                      <p className="font-semibold text-zinc-400">النطاقات المعترف بها فعلياً لدى Google لهذا المشروع:</p>
                      <div className="max-h-24 overflow-y-auto bg-black/60 p-1.5 rounded font-mono text-[10px] text-amber-200/90 space-y-0.5">
                        {liveCheckResult.authorizedDomains.map((d) => (
                          <div key={d} className="truncate">• {d}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1 border-t border-amber-500/10">
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loggingIn}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loggingIn ? 'animate-spin' : ''}`} />
                  <span>إعادة محاولة تسجيل الدخول الآن</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUnauthorizedDomain(null);
                    setShowDomainGuide(false);
                  }}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs transition-colors"
                >
                  إخفاء التنبيه
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loggingIn}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-200 text-black font-bold py-4 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loggingIn ? (
              <span>{t('login.signingIn')}</span>
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {t('login.signIn')}
              </>
            )}
          </button>

          {!showDomainGuide && !unauthorizedDomain && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowDomainGuide(true)}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors inline-flex items-center gap-1"
              >
                <span>⚙️ إعداد النطاقات المصرح بها (Authorized Domains)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
