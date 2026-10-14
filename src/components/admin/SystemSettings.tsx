import React, { useState, useEffect } from 'react';
import { Settings, Save, Server, Database, Globe, Sliders, Hash, ShieldAlert, Cpu } from 'lucide-react';
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
        setSettings(docSnap.data() as GameSettings);
      } else {
        await setDoc(docRef, defaultSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('حدث خطأ أثناء جلب إعدادات النظام');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'global_settings', 'global'), settings);
      toast.success('تم حفظ الإعدادات وتطبيقها حياً');
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

  if (isLoading) {
    return <div className="p-8 text-center text-zinc-400">جاري تحميل إعدادات النظام المتقدمة...</div>;
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/50 p-6 rounded-[2.5rem] border border-white/10 backdrop-blur-xl">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <Server className="text-blue-500" />
            Advanced Core Config
          </h2>
          <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs mt-1">التحكم المركزي في أنظمة اللعبة مباشرة (Real-time)</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
        >
          <Save size={18} />
          {isSaving ? 'جاري التطبيق...' : 'تطبيق التحديثات'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Flags */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900/40 rounded-[2rem] p-6 sm:p-8 border border-white/5">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-red-500/20 text-red-400 rounded-xl">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">System Flags</h3>
              <p className="text-xs text-zinc-500 font-bold">بوابات النظام (مفاتيح التشغيل)</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-5 bg-black/40 rounded-2xl border border-white/5">
              <div className="pr-4">
                <h4 className="text-white font-bold mb-1">وضع الصيانة</h4>
                <p className="text-[10px] text-zinc-500 max-w-[200px]">يغلق اللعبة لمنع اللاعبين من الدخول أثناء التحديثات</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={settings.system.maintenanceMode} onChange={(e) => handleSystemChange('maintenanceMode', e.target.checked)} className="sr-only peer" />
                <div className="w-14 h-7 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-500"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between p-5 bg-black/40 rounded-2xl border border-white/5">
              <div className="pr-4">
                <h4 className="text-white font-bold mb-1">السماح بتسجيل لاعبين جدد</h4>
                <p className="text-[10px] text-zinc-500 max-w-[200px]">إيقاف تسجيل حسابات جديدة، مع بقاء اللاعبين الحاليين</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={settings.system.allowRegistrations} onChange={(e) => handleSystemChange('allowRegistrations', e.target.checked)} className="sr-only peer" />
                <div className="w-14 h-7 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-5 bg-black/40 rounded-2xl border border-white/5">
              <div className="pr-4">
                <h4 className="text-white font-bold mb-1">وضع المطور (Debug)</h4>
                <p className="text-[10px] text-zinc-500 max-w-[200px]">يظهر بيانات تحليلية وإحصائيات داخل اللعبة للمشرفين</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={settings.system.debugMode} onChange={(e) => handleSystemChange('debugMode', e.target.checked)} className="sr-only peer" />
                <div className="w-14 h-7 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>
          </div>
        </motion.div>

        {/* Economy Balancing */}
        <motion.div initial={{ opacity: 0, y: 10, transition: { delay: 0.1 } }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900/40 rounded-[2rem] p-6 sm:p-8 border border-white/5">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Sliders size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Economy Balancer</h3>
              <p className="text-xs text-zinc-500 font-bold">معاملات الاقتصاد والمكافآت (Multipliers)</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="p-5 bg-black/40 rounded-2xl border border-white/5">
              <label className="flex items-center justify-between text-white font-bold mb-4">
                <span>مضاعف الخبرة العالمي (XP)</span>
                <span className="text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-lg">{settings.economy.globalXpMultiplier}x</span>
              </label>
              <input 
                type="range" 
                min="0" max="10" step="0.1" 
                value={settings.economy.globalXpMultiplier} 
                onChange={(e) => handleEconomyChange('globalXpMultiplier', parseFloat(e.target.value))} 
                className="w-full accent-emerald-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer" 
              />
            </div>
            
            <div className="p-5 bg-black/40 rounded-2xl border border-white/5">
              <label className="flex items-center justify-between text-white font-bold mb-4">
                <span>مضاعف الأموال المكتسبة</span>
                <span className="text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-lg">{settings.economy.globalMoneyMultiplier}x</span>
              </label>
              <input 
                type="range" 
                min="0" max="10" step="0.1" 
                value={settings.economy.globalMoneyMultiplier} 
                onChange={(e) => handleEconomyChange('globalMoneyMultiplier', parseFloat(e.target.value))} 
                className="w-full accent-emerald-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer" 
              />
            </div>
            
            <div className="p-5 bg-black/40 rounded-2xl border border-white/5">
              <label className="flex items-center justify-between text-white font-bold mb-4">
                <span>مضاعف أرباح السطو (Heists)</span>
                <span className="text-amber-400 bg-amber-400/10 px-3 py-1 rounded-lg">{settings.economy.heistPayoutMultiplier}x</span>
              </label>
              <input 
                type="range" 
                min="0.1" max="5" step="0.1" 
                value={settings.economy.heistPayoutMultiplier} 
                onChange={(e) => handleEconomyChange('heistPayoutMultiplier', parseFloat(e.target.value))} 
                className="w-full accent-amber-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer" 
              />
            </div>
          </div>
        </motion.div>
        
        {/* UI Configuration */}
        <motion.div initial={{ opacity: 0, y: 10, transition: { delay: 0.2 } }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900/40 rounded-[2rem] p-6 sm:p-8 border border-white/5 lg:col-span-2">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl">
              <Cpu size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Dynamic UI Configuration</h3>
              <p className="text-xs text-zinc-500 font-bold">التحكم الشامل بواجهة المستخدم الجمالية (قريبًا...)</p>
            </div>
          </div>
          <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center bg-black/20">
            <Globe className="mx-auto text-zinc-600 mb-4" size={48} />
            <h4 className="text-lg font-black text-zinc-400 uppercase tracking-widest mb-2">النظام في قيد التطوير المتقدم</h4>
            <p className="text-zinc-500 max-w-lg mx-auto text-sm leading-relaxed">
              وفقاً للتصميم المعماري، هذا القسم سيدعم قريباً واجهة تعديل النصوص والألوان والترجمة المباشرة لفرز أطنان من التعديلات بدون إعادة نشر التطبيق...
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
