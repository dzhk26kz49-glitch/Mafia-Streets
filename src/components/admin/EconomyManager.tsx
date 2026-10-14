import React, { useState, useEffect } from 'react';
import { DollarSign, Zap, TrendingUp, ShieldAlert, Save, RefreshCw, Sliders, CheckCircle } from 'lucide-react';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/useAuthStore';
import { formatMoney } from '../../lib/utils';
import { toast } from 'sonner';

interface EconomyManagerProps {
  startingMoney: number;
  onStartingMoneyChange: (newAmount: number) => void;
}

export const EconomyManager: React.FC<EconomyManagerProps> = ({
  startingMoney,
  onStartingMoneyChange
}) => {
  const { globalSettings, updateGlobalSettings } = useAuthStore();
  const [localStartingMoney, setLocalStartingMoney] = useState(startingMoney);
  const [isSavingMoney, setIsSavingMoney] = useState(false);

  // Multipliers & Server switches
  const [moneyMultiplier, setMoneyMultiplier] = useState(1);
  const [xpMultiplier, setXpMultiplier] = useState(1);
  const [heistMultiplier, setHeistMultiplier] = useState(1);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [enableMarket, setEnableMarket] = useState(true);
  const [enableChat, setEnableChat] = useState(true);
  const [enableMilitias, setEnableMilitias] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    setLocalStartingMoney(startingMoney);
  }, [startingMoney]);

  useEffect(() => {
    if (globalSettings) {
      setMoneyMultiplier(globalSettings.gameBalance?.moneyMultiplier || 1);
      setXpMultiplier(globalSettings.gameBalance?.xpMultiplier || 1);
      setHeistMultiplier(globalSettings.gameBalance?.heistMultiplier || 1);
      setMaintenanceMode(Boolean(globalSettings.maintenanceMode));
      setEnableMarket(globalSettings.features?.enableMarket ?? true);
      setEnableChat(globalSettings.features?.enableGlobalChat ?? true);
      setEnableMilitias(globalSettings.features?.enableMilitias ?? true);
    }
  }, [globalSettings]);

  const handleSaveStartingMoney = async () => {
    setIsSavingMoney(true);
    try {
      await updateDoc(doc(db, 'server_settings', 'backup'), {
        startingMoney: Number(localStartingMoney) || 5000000
      });
      onStartingMoneyChange(Number(localStartingMoney) || 5000000);
      toast.success('تم حفظ المبلغ الأولي للاعبين الجدد بنجاح');
    } catch (error) {
      // Create if doesn't exist
      try {
        await setDoc(doc(db, 'server_settings', 'backup'), {
          startingMoney: Number(localStartingMoney) || 5000000
        }, { merge: true });
        onStartingMoneyChange(Number(localStartingMoney) || 5000000);
        toast.success('تم حفظ المبلغ الأولي بنجاح');
      } catch (err) {
        toast.error('فشل في حفظ المبلغ الأولي');
      }
    } finally {
      setIsSavingMoney(false);
    }
  };

  const handleSaveGlobalMultipliers = async () => {
    setIsSavingSettings(true);
    try {
      const updated = {
        ...(globalSettings || {}),
        gameBalance: {
          moneyMultiplier: Number(moneyMultiplier) || 1,
          xpMultiplier: Number(xpMultiplier) || 1,
          heistMultiplier: Number(heistMultiplier) || 1
        },
        features: {
          enableMarket,
          enableGlobalChat: enableChat,
          enableMilitias
        },
        maintenanceMode
      };
      await updateGlobalSettings(updated);
      toast.success('تم تحديث مضاعفات واقتصاد اللعبة');
    } catch (error) {
      toast.error('فشل في حفظ إعدادات الاقتصاد');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Starting Money & Rapid Multipliers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Starting Balance */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
            <DollarSign size={16} className="text-emerald-400" />
            <h4 className="text-sm font-bold text-white">الرصيد الأولي للوافدين الجدد</h4>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            يحدد هذا المبلغ مقدار الأموال النظيفة التي يحصل عليها أي لاعب جديد فور إتمام تسجيله في اللعبة.
          </p>

          <div className="space-y-2">
            <div className="relative">
              <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-emerald-400">
                $
              </span>
              <input
                type="number"
                value={localStartingMoney}
                onChange={e => setLocalStartingMoney(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-emerald-900/60 rounded-lg pr-7 pl-3 py-1.5 text-xs text-emerald-300 font-bold focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5">
              {[1000000, 5000000, 10000000, 50000000, 100000000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setLocalStartingMoney(amt)}
                  className="px-2 py-0.5 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700"
                >
                  {formatMoney(amt)}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSaveStartingMoney}
              disabled={isSavingMoney}
              className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-md"
            >
              <Save size={13} />
              <span>{isSavingMoney ? 'جاري الحفظ...' : 'حفظ الرصيد الأولي'}</span>
            </button>
          </div>
        </div>

        {/* Global Multipliers */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
            <Zap size={16} className="text-amber-400" />
            <h4 className="text-sm font-bold text-white">مضاعفات السيرفر الترويجية</h4>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1">مضاعف الأموال</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                value={moneyMultiplier}
                onChange={e => setMoneyMultiplier(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none text-center font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1">مضاعف الخبرة (XP)</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                value={xpMultiplier}
                onChange={e => setXpMultiplier(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none text-center font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1">مضاعف السرقات</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                value={heistMultiplier}
                onChange={e => setHeistMultiplier(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none text-center font-bold"
              />
            </div>
          </div>

          {/* Quick Switches */}
          <div className="pt-2 border-t border-zinc-800 grid grid-cols-2 gap-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer p-1.5 bg-zinc-950/60 rounded border border-zinc-800">
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={e => setMaintenanceMode(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 text-red-600 focus:ring-0"
              />
              <span className={maintenanceMode ? 'text-red-400 font-bold' : 'text-zinc-300'}>
                وضع الصيانة (قفل اللعبة)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer p-1.5 bg-zinc-950/60 rounded border border-zinc-800">
              <input
                type="checkbox"
                checked={enableMarket}
                onChange={e => setEnableMarket(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 text-emerald-600 focus:ring-0"
              />
              <span className="text-zinc-300">سوق الممنوعات</span>
            </label>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSaveGlobalMultipliers}
              disabled={isSavingSettings}
              className="px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-md"
            >
              <Save size={13} />
              <span>{isSavingSettings ? 'جاري الحفظ...' : 'حفظ مضاعفات السيرفر'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
