import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  Settings, Type, Palette, Zap, ShieldAlert, History, Plus, Trash2, Save, 
  Search, Filter, ChevronRight, AlertTriangle, CheckCircle2, Sliders, Globe,
  Activity, DollarSign, Users, Layout, Smartphone, MousePointer2, Languages,
  Monitor, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatNumber, formatDate } from '../../lib/utils';
import clsx from 'clsx';

export const ControlCenter: React.FC = () => {
  const { globalSettings, updateGlobalSettings, addAdminLog } = useAuthStore();
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'texts' | 'theme' | 'economy' | 'features' | 'logs'>('general');
  const [localSettings, setLocalSettings] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (globalSettings) {
      setLocalSettings(globalSettings);
    } else {
      // Default fallback if settings don't exist in DB
      setLocalSettings({
        theme: {
          primaryColor: '#ef4444',
          secondaryColor: '#18181b',
          accentColor: '#3b82f6',
          fontFamily: 'Inter, sans-serif'
        },
        texts: {
          welcomeMessage: 'مرحباً بك في عالم المافيا',
          gameClosedTitle: 'اللعبة في وضع الصيانة',
          gameClosedDesc: 'نحن نقوم ببعض التحسينات، سنعود قريباً.'
        },
        gameBalance: {
          moneyMultiplier: 1,
          xpMultiplier: 1,
          baseDifficulty: 1
        },
        features: {
          enableGlobalChat: true,
          enableMarket: true,
          enableMilitias: true,
          enableHeists: true
        },
        maintenanceMode: false,
        version: '1.0.0'
      });
    }
  }, [globalSettings]);

  useEffect(() => {
    if (activeSubTab === 'logs') {
      fetchLogs();
    }
  }, [activeSubTab]);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const q = query(collection(db, 'admin_logs'), orderBy('timestamp', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      setLogs(snapshot.docs.map(doc => doc.data()));
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateGlobalSettings(localSettings);
      await addAdminLog('update_settings', 'global_settings', `Updated ${activeSubTab} settings`);
      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('فشل في حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  if (!localSettings) return <div className="p-8 text-center text-zinc-500 font-bold">جاري تحميل النظام السيادي...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* CMS Navigation */}
      <div className="flex flex-wrap gap-2 p-1 bg-zinc-900/50 rounded-2xl border border-white/5 backdrop-blur-md">
        {[
          { id: 'general', icon: Settings, label: 'عام' },
          { id: 'texts', icon: Type, label: 'النصوص' },
          { id: 'theme', icon: Palette, label: 'المظهر' },
          { id: 'economy', icon: DollarSign, label: 'الاقتصاد' },
          { id: 'features', icon: Zap, label: 'المميزات' },
          { id: 'logs', icon: History, label: 'السجلات' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={clsx(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all",
              activeSubTab === tab.id 
                ? "bg-red-600 text-white shadow-lg shadow-red-600/20" 
                : "text-zinc-500 hover:text-white hover:bg-white/5"
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Configuration Form */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            key={activeSubTab}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-zinc-900/50 rounded-[2.5rem] border border-white/10 p-8 min-h-[500px]"
          >
            {activeSubTab === 'general' && (
              <div className="space-y-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-red-600/20 rounded-2xl text-red-500">
                    <ShieldAlert size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">إعدادات النظام الأساسية</h3>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">إدارة الحالة العامة للعبة</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 gap-4">
                    <div className="flex items-center gap-4">
                      <div className={clsx(
                        "p-3 rounded-xl",
                        localSettings.maintenanceMode ? "bg-red-600/20 text-red-500" : "bg-emerald-600/20 text-emerald-500"
                      )}>
                        <AlertTriangle size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-wider">وضع الصيانة</h4>
                        <p className="text-[10px] text-zinc-500 font-bold">عند التفعيل، سيتم إغلاق اللعبة أمام جميع اللاعبين باستثناء الأدمين.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setLocalSettings({ ...localSettings, maintenanceMode: !localSettings.maintenanceMode })}
                      className={clsx(
                        "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        localSettings.maintenanceMode ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400"
                      )}
                    >
                      {localSettings.maintenanceMode ? 'فعال' : 'غير فعال'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-2">إصدار اللعبة</label>
                      <input
                        type="text"
                        value={localSettings.version}
                        onChange={(e) => setLocalSettings({ ...localSettings, version: e.target.value })}
                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white font-bold h-14"
                        placeholder="1.0.0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === 'texts' && (
              <div className="space-y-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-500">
                    <Type size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">إدارة المحتوى والنصوص</h3>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">تحكم في كل كلمة تظهر للمستخدم</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {Object.entries(localSettings.texts || {}).map(([key, value]: [string, any]) => (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between px-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{key}</label>
                        <button 
                          onClick={() => {
                            const newTexts = { ...localSettings.texts };
                            delete newTexts[key];
                            setLocalSettings({ ...localSettings, texts: newTexts });
                          }}
                          className="text-red-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <textarea
                        value={value}
                        onChange={(e) => setLocalSettings({
                          ...localSettings,
                          texts: { ...localSettings.texts, [key]: e.target.value }
                        })}
                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white font-bold h-24 resize-none"
                      />
                    </div>
                  ))}

                  <button 
                    onClick={() => {
                      const key = prompt('أدخل اسم المفتاح الجديد (بالإنجليزي):');
                      if (key) {
                        setLocalSettings({
                          ...localSettings,
                          texts: { ...localSettings.texts, [key]: '' }
                        });
                      }
                    }}
                    className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3"
                  >
                    <Plus size={16} />
                    إضافة نص جديد
                  </button>
                </div>
              </div>
            )}

            {activeSubTab === 'theme' && (
              <div className="space-y-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-emerald-600/20 rounded-2xl text-emerald-500">
                    <Palette size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">إدارة الهوية البصرية</h3>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">تعديل الألوان والخطوط عبر النظام</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-2">اللون الأساسي</label>
                    <div className="flex gap-4 items-center">
                      <input
                        type="color"
                        value={localSettings.theme.primaryColor}
                        onChange={(e) => setLocalSettings({
                          ...localSettings,
                          theme: { ...localSettings.theme, primaryColor: e.target.value }
                        })}
                        className="w-14 h-14 rounded-xl bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={localSettings.theme.primaryColor}
                        onChange={(e) => setLocalSettings({
                          ...localSettings,
                          theme: { ...localSettings.theme, primaryColor: e.target.value }
                        })}
                        className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-4 text-white font-mono text-sm h-14"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-2">اللون الثانوي</label>
                    <div className="flex gap-4 items-center">
                      <input
                        type="color"
                        value={localSettings.theme.secondaryColor}
                        onChange={(e) => setLocalSettings({
                          ...localSettings,
                          theme: { ...localSettings.theme, secondaryColor: e.target.value }
                        })}
                        className="w-14 h-14 rounded-xl bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={localSettings.theme.secondaryColor}
                        onChange={(e) => setLocalSettings({
                          ...localSettings,
                          theme: { ...localSettings.theme, secondaryColor: e.target.value }
                        })}
                        className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-4 text-white font-mono text-sm h-14"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 lg:col-span-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-2">عائلة الخطوط (Google Fonts)</label>
                    <input
                      type="text"
                      value={localSettings.theme.fontFamily}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        theme: { ...localSettings.theme, fontFamily: e.target.value }
                      })}
                      className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white font-bold h-14"
                      placeholder="Inter, sans-serif"
                    />
                  </div>
                </div>

                <div className="p-8 bg-zinc-950 rounded-[2rem] border border-white/5">
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6">معاينة الألوان المختارة</h4>
                  <div className="flex flex-wrap gap-4">
                    <div 
                      className="px-8 py-4 rounded-xl text-white font-black text-[10px] uppercase tracking-widest"
                      style={{ backgroundColor: localSettings.theme.primaryColor }}
                    >
                      زر المافيا الأساسي
                    </div>
                    <div 
                      className="px-8 py-4 rounded-xl text-white font-black text-[10px] uppercase tracking-widest"
                      style={{ backgroundColor: localSettings.theme.secondaryColor }}
                    >
                      الخلفية الثانوية
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === 'economy' && (
              <div className="space-y-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-amber-600/20 rounded-2xl text-amber-500">
                    <DollarSign size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">توازن الاقتصاد العالمي</h3>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">تعديل مضاعفات الأرباح والصعوبة</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex justify-between px-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">مضاعف الأموال (Cash Index)</label>
                      <span className="text-amber-500 font-bold">x{localSettings.gameBalance.moneyMultiplier}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.1"
                      value={localSettings.gameBalance.moneyMultiplier}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        gameBalance: { ...localSettings.gameBalance, moneyMultiplier: parseFloat(e.target.value) }
                      })}
                      className="w-full accent-amber-600"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between px-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">مضاعف الخبرة (XP Multiplier)</label>
                      <span className="text-blue-500 font-bold">x{localSettings.gameBalance.xpMultiplier}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.1"
                      value={localSettings.gameBalance.xpMultiplier}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        gameBalance: { ...localSettings.gameBalance, xpMultiplier: parseFloat(e.target.value) }
                      })}
                      className="w-full accent-blue-600"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between px-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">الصعوبة الأساسية</label>
                      <span className="text-red-500 font-bold">{localSettings.gameBalance.baseDifficulty}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      step="1"
                      value={localSettings.gameBalance.baseDifficulty}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        gameBalance: { ...localSettings.gameBalance, baseDifficulty: parseInt(e.target.value) }
                      })}
                      className="w-full accent-red-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === 'features' && (
              <div className="space-y-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-purple-600/20 rounded-2xl text-purple-500">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">إدارة ميزات اللعبة</h3>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">تشغيل وإيقاف الأنظمة الحية</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(localSettings.features || {}).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">{key}</span>
                      <button
                        onClick={() => setLocalSettings({
                          ...localSettings,
                          features: { ...localSettings.features, [key]: !value }
                        })}
                        className={clsx(
                          "w-12 h-6 rounded-full p-1 transition-all flex items-center shadow-inner",
                          value ? "bg-emerald-600" : "bg-zinc-800"
                        )}
                      >
                        <div className={clsx(
                          "w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                          value ? "translate-x-6" : "translate-x-0"
                        )} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSubTab === 'logs' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-zinc-800 rounded-2xl text-zinc-400">
                      <History size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">سجلات الرقابة السيادية</h3>
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">مراقبة جميع تحركات المديرين</p>
                    </div>
                  </div>
                  <button 
                    onClick={fetchLogs}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-400 transition-all hover:rotate-180 duration-500"
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
                  {loadingLogs ? (
                    <div className="flex items-center justify-center p-20 text-zinc-500 font-bold">جاري مراجعة الأوراق الرسمية...</div>
                  ) : logs.length === 0 ? (
                    <div className="text-center p-20 text-zinc-500 font-bold">لا توجد سجلات حالية.</div>
                  ) : (
                    logs.map((log: any) => (
                      <div key={log.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-start gap-4 hover:bg-white/10 transition-colors">
                        <div className="p-2 bg-emerald-600/10 text-emerald-500 rounded-lg">
                          <Activity size={16} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-black text-white">{log.adminName}</span>
                            <span className="text-[10px] text-zinc-500 font-bold">{formatDate(log.timestamp)}</span>
                          </div>
                          <p className="text-xs text-zinc-300">
                            قام بـ <span className="text-emerald-500 font-black">{log.action}</span> 
                            على <span className="text-blue-500 font-black">{log.targetId}</span>
                          </p>
                          {log.details && <p className="text-[10px] text-zinc-500 mt-1 font-bold italic">"{log.details}"</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Action Panel */}
        <div className="space-y-8">
          <div className="bg-zinc-900/50 rounded-[2.5rem] border border-white/10 p-8">
            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <ShieldAlert className="text-red-500" size={16} />
              تحكم سيادي
            </h3>
            
            <button
              onClick={handleSave}
              disabled={isSaving || activeSubTab === 'logs'}
              className="w-full py-6 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-[0_0_30px_rgba(239,68,68,0.3)] group active:scale-95 transition-all mb-4"
            >
              {isSaving ? (
                <RefreshCw size={24} className="animate-spin" />
              ) : (
                <>
                  <Save size={24} className="group-hover:scale-125 transition-transform" />
                  حفظ ورفع التغييرات
                </>
              )}
            </button>
            <p className="text-[10px] text-zinc-500 font-bold text-center leading-relaxed px-4">
              * تحذير: التغييرات في هذا القسم تؤثر على جميع اللاعبين بشكل فوري ومباشر.
            </p>
          </div>

          <div className="bg-zinc-900/50 rounded-[2.5rem] border border-white/10 p-8">
            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Activity className="text-emerald-500" size={16} />
              حالة النظام
            </h3>
            <div className="space-y-6">
              {[
                { label: 'وقت الاستجابة', value: '42ms', color: 'text-emerald-500' },
                { label: 'اللاعبين المتصلين', value: '1,245', color: 'text-blue-500' },
                { label: 'حمل المعالج', value: '12%', color: 'text-emerald-500' },
                { label: 'نسخة الواجهة', value: localSettings.version, color: 'text-zinc-500' }
              ].map((stat, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-black/20 rounded-2xl border border-white/5">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{stat.label}</span>
                  <span className={clsx("text-xs font-black", stat.color)}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
