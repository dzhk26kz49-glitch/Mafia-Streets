import React, { useState, useEffect } from 'react';
import { Settings, Save, Server, Database, Globe, Sliders, Hash, ShieldAlert, Cpu, GitMerge, Link2, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'sonner';

interface GameSettings {
  system: {
    maintenanceMode: boolean;
    allowRegistrations: boolean;
    militiasEnabled: boolean;
    debugMode: boolean;
  };
  economy: {
    globalXpMultiplier: number;
    globalMoneyMultiplier: number;
    heistPayoutMultiplier: number;
  };
  departmentLinks: {
    syncFinanceWithGangs: boolean;
    syncHealthWithPrison: boolean;
    syncBlackMarketWithWarehouse: boolean;
    syncMilitiaWithOperations: boolean;
    syncSmugglingWithTreasury: boolean;
  };
  ui: {
    primaryColor: string;
    dashboardStyle: string;
  };
}

const defaultSettings: GameSettings = {
  system: {
    maintenanceMode: false,
    allowRegistrations: true,
    militiasEnabled: true,
    debugMode: false
  },
  economy: {
    globalXpMultiplier: 1,
    globalMoneyMultiplier: 1,
    heistPayoutMultiplier: 1
  },
  departmentLinks: {
    syncFinanceWithGangs: true,
    syncHealthWithPrison: true,
    syncBlackMarketWithWarehouse: true,
    syncMilitiaWithOperations: true,
    syncSmugglingWithTreasury: true
  },
  ui: {
    primaryColor: '#9333ea',
    dashboardStyle: 'modern'
  }
};

export const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState<GameSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const docRef = doc(db, 'global_settings', 'global');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as GameSettings;
        setSettings({
          ...defaultSettings,
          ...data,
          departmentLinks: { ...defaultSettings.departmentLinks, ...(data.departmentLinks || {}) }
        });
      } else {
        await setDoc(docRef, defaultSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('حدث خطأ أثناء جلب إعدادات النظام المركزي');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'global_settings', 'global'), settings);
      toast.success('تم حفظ إعدادات النظام المركزي وتطبيقها حياً بنجاح ⚡');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSystemChange = (key: keyof GameSettings['system'], value: boolean) => {
    setSettings(prev => ({ ...prev, system: { ...prev.system, [key]: value } }));
  };

  const handleEconomyChange = (key: keyof GameSettings['economy'], value: number) => {
    setSettings(prev => ({ ...prev, economy: { ...prev.economy, [key]: value } }));
  };

  const handleLinkChange = (key: keyof GameSettings['departmentLinks'], value: boolean) => {
    setSettings(prev => ({ ...prev, departmentLinks: { ...prev.departmentLinks, [key]: value } }));
  };

  if (isLoading) {
    return <div className="p-12 text-center text-zinc-400 font-bold">جاري تحميل إعدادات النظام المركزي والربط الشبكي...</div>;
  }

  return (
    <div className="space-y-8 pb-12" dir="rtl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/60 p-6 sm:p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-xl shadow-2xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600/20 text-red-500 rounded-2xl border border-red-500/30">
              <GitMerge size={28} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                النظام المركزي وإعدادات الربط الشبكي
              </h2>
              <p className="text-zinc-400 font-bold text-xs mt-1">التحكم الشامل في تكامل الأقسام، خوارزميات الاقتصاد، وبوابات التشغيل الحي</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-8 py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-red-600/30 active:scale-95 transition-all"
        >
          <Save size={18} />
          {isSaving ? 'جاري الحفظ والتطبيق...' : 'حفظ وتطبيق النظام'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Interconnection Links */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900/40 rounded-[2.5rem] p-6 sm:p-8 border border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/20">
              <Link2 size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">شبكة ارتباط الأقسام (Department Inter-Link)</h3>
              <p className="text-xs text-zinc-500 font-bold">ربط العمليات والمالية والعصابات والمليشيات بنظام موحد</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
              <div className="pr-2">
                <h4 className="text-white font-bold text-sm mb-0.5">ربط المالية (Finance) بالعصابات والضرائب</h4>
                <p className="text-[10px] text-zinc-400">تحويل أرباح العقارات وحصص النفوذ لخزينة العصابة تلقائياً</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" checked={settings.departmentLinks.syncFinanceWithGangs} onChange={(e) => handleLinkChange('syncFinanceWithGangs', e.target.checked)} className="sr-only peer" />
                <div className="w-12 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
              <div className="pr-2">
                <h4 className="text-white font-bold text-sm mb-0.5">ربط الصحة (Hospital) بالسجن والتقييد</h4>
                <p className="text-[10px] text-zinc-400">فرض عقوبات وغرامات طبية ومراقبة الإصابات في السجن المركزي</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" checked={settings.departmentLinks.syncHealthWithPrison} onChange={(e) => handleLinkChange('syncHealthWithPrison', e.target.checked)} className="sr-only peer" />
                <div className="w-12 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
              <div className="pr-2">
                <h4 className="text-white font-bold text-sm mb-0.5">ربط السوق السوداء بالمخزن السري</h4>
                <p className="text-[10px] text-zinc-400">مزامنة المشتريات والأسلحة والعتاد مباشرة مع مخزون اللاعب</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" checked={settings.departmentLinks.syncBlackMarketWithWarehouse} onChange={(e) => handleLinkChange('syncBlackMarketWithWarehouse', e.target.checked)} className="sr-only peer" />
                <div className="w-12 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
              <div className="pr-2">
                <h4 className="text-white font-bold text-sm mb-0.5">ربط المليشيات بالعمليات والتهريب</h4>
                <p className="text-[10px] text-zinc-400">تفعيل الدعم اللوجستي العسكري لحماية شحنات التهريب والعمليات</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" checked={settings.departmentLinks.syncMilitiaWithOperations} onChange={(e) => handleLinkChange('syncMilitiaWithOperations', e.target.checked)} className="sr-only peer" />
                <div className="w-12 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
              <div className="pr-2">
                <h4 className="text-white font-bold text-sm mb-0.5">ربط التهريب بالخزينة المركزية</h4>
                <p className="text-[10px] text-zinc-400">تدفق عوائد صفقات التهريب والأسلحة مباشرة لحساب البنك</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" checked={settings.departmentLinks.syncSmugglingWithTreasury} onChange={(e) => handleLinkChange('syncSmugglingWithTreasury', e.target.checked)} className="sr-only peer" />
                <div className="w-12 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </motion.div>

        <div className="space-y-6">
          {/* System Flags */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900/40 rounded-[2.5rem] p-6 sm:p-8 border border-white/5 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-red-500/20 text-red-400 rounded-2xl border border-red-500/20">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">System Flags</h3>
                <p className="text-xs text-zinc-500 font-bold">بوابات النظام (مفاتيح التشغيل الحساسة)</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                <div className="pr-2">
                  <h4 className="text-white font-bold text-sm mb-0.5">وضع الصيانة العام</h4>
                  <p className="text-[10px] text-zinc-400">إيقاف دخول اللاعبين أثناء التحديثات الكبرى</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input type="checkbox" checked={settings.system.maintenanceMode} onChange={(e) => handleSystemChange('maintenanceMode', e.target.checked)} className="sr-only peer" />
                  <div className="w-12 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                <div className="pr-2">
                  <h4 className="text-white font-bold text-sm mb-0.5">السماح بتسجيل لاعبين جدد</h4>
                  <p className="text-[10px] text-zinc-400">فتح باب التسجيل لحسابات جديدة</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input type="checkbox" checked={settings.system.allowRegistrations} onChange={(e) => handleSystemChange('allowRegistrations', e.target.checked)} className="sr-only peer" />
                  <div className="w-12 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                <div className="pr-2">
                  <h4 className="text-white font-bold text-sm mb-0.5">تفعيل قسم المليشيات العسكرية</h4>
                  <p className="text-[10px] text-zinc-400">تمكين المعسكرات والترسانة والعمليات العسكرية</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input type="checkbox" checked={settings.system.militiasEnabled} onChange={(e) => handleSystemChange('militiasEnabled', e.target.checked)} className="sr-only peer" />
                  <div className="w-12 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </motion.div>

          {/* Economy Balancer */}
          <motion.div initial={{ opacity: 0, y: 10, transition: { delay: 0.1 } }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900/40 rounded-[2.5rem] p-6 sm:p-8 border border-white/5 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/20">
                <Sliders size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Economy Balancer</h3>
                <p className="text-xs text-zinc-500 font-bold">معاملات الاقتصاد والمكافآت (Multipliers)</p>
              </div>
            </div>
            
            <div className="space-y-5">
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                <label className="flex items-center justify-between text-white font-bold text-sm mb-3">
                  <span>مضاعف الخبرة العالمي (XP)</span>
                  <span className="text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-xl text-xs">{settings.economy.globalXpMultiplier}x</span>
                </label>
                <input 
                  type="range" 
                  min="0.5" max="10" step="0.5" 
                  value={settings.economy.globalXpMultiplier} 
                  onChange={(e) => handleEconomyChange('globalXpMultiplier', parseFloat(e.target.value))} 
                  className="w-full accent-emerald-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer" 
                />
              </div>
              
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                <label className="flex items-center justify-between text-white font-bold text-sm mb-3">
                  <span>مضاعف الأموال المكتسبة</span>
                  <span className="text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-xl text-xs">{settings.economy.globalMoneyMultiplier}x</span>
                </label>
                <input 
                  type="range" 
                  min="0.5" max="10" step="0.5" 
                  value={settings.economy.globalMoneyMultiplier} 
                  onChange={(e) => handleEconomyChange('globalMoneyMultiplier', parseFloat(e.target.value))} 
                  className="w-full accent-emerald-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer" 
                />
              </div>
              
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                <label className="flex items-center justify-between text-white font-bold text-sm mb-3">
                  <span>مضاعف أرباح السطو (Heists)</span>
                  <span className="text-amber-400 bg-amber-400/10 px-3 py-1 rounded-xl text-xs">{settings.economy.heistPayoutMultiplier}x</span>
                </label>
                <input 
                  type="range" 
                  min="0.5" max="5" step="0.5" 
                  value={settings.economy.heistPayoutMultiplier} 
                  onChange={(e) => handleEconomyChange('heistPayoutMultiplier', parseFloat(e.target.value))} 
                  className="w-full accent-amber-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer" 
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
