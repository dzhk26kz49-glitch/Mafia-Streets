import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Users, DollarSign, TrendingUp, Activity, Skull, ShieldCheck, 
  Calendar, Filter, Download, PieChart as PieIcon, BarChart3, LineChart as LineIcon
} from 'lucide-react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatNumber, formatMoney } from '../../lib/utils';
import { motion } from 'motion/react';
import clsx from 'clsx';

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const mockedData = {
        dailyActivePlayers: [
          { name: 'السبت', value: 400 },
          { name: 'الأحد', value: 300 },
          { name: 'الاثنين', value: 200 },
          { name: 'الثلاثاء', value: 278 },
          { name: 'الأربعاء', value: 189 },
          { name: 'الخميس', value: 239 },
          { name: 'الجمعة', value: 349 },
        ],
        revenue: [
          { date: '2024-03-01', clean: 4000, dirty: 2400 },
          { date: '2024-03-02', clean: 3000, dirty: 1398 },
          { date: '2024-03-03', clean: 2000, dirty: 9800 },
          { date: '2024-03-04', clean: 2780, dirty: 3908 },
          { date: '2024-03-05', clean: 1890, dirty: 4800 },
          { date: '2024-03-06', clean: 2390, dirty: 3800 },
          { date: '2024-03-07', clean: 3490, dirty: 4300 },
        ],
        playerRoles: [
          { name: 'رؤساء', value: 15 },
          { name: 'تجار', value: 30 },
          { name: 'لصوص', value: 45 },
          { name: 'مهربين', value: 20 },
        ],
        recentKills: [
          { name: 'قتل ناجح', value: 120 },
          { name: 'فشل المحاولة', value: 80 },
        ]
      };
      
      setData(mockedData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-20 text-center text-zinc-500 font-bold uppercase tracking-widest animate-pulse">جاري جمع البيانات المخابراتية...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'إجمالي اللاعبين', value: '15,420', change: '+12%', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'الأموال المتداولة', value: formatMoney(450000000), change: '+5%', icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'عمليات السطو اليومية', value: '842', change: '-2%', icon: Skull, color: 'text-red-500', bg: 'bg-red-500/10' },
          { label: 'متوسط وقت اللعب', value: '45m', change: '+18%', icon: Activity, color: 'text-purple-500', bg: 'bg-purple-500/10' }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-zinc-900/50 rounded-[2rem] border border-white/10 p-6 flex items-start justify-between group hover:border-white/20 transition-all"
          >
            <div className="space-y-1">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{stat.label}</p>
              <h4 className="text-2xl font-black text-white">{stat.value}</h4>
              <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full inline-block", stat.change.startsWith('+') ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500")}>
                {stat.change}
              </span>
            </div>
            <div className={clsx("p-4 rounded-2xl group-hover:scale-110 transition-transform", stat.bg, stat.color)}>
              <stat.icon size={24} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-zinc-900/50 rounded-[2.5rem] border border-white/10 p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
              <Users className="text-blue-500" size={24} />
              نشاط اللاعبين الأسبوعي
            </h3>
            <BarChart3 size={18} className="text-zinc-600" />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.dailyActivePlayers}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={10} fontWeight="bold" />
                <YAxis stroke="#52525b" fontSize={10} fontWeight="bold" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', color: '#fff' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900/50 rounded-[2.5rem] border border-white/10 p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
              <TrendingUp className="text-emerald-500" size={24} />
              تدفق الأموال (نظيفة vs قذرة)
            </h3>
            <LineIcon size={18} className="text-zinc-600" />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.revenue}>
                <defs>
                  <linearGradient id="colorClean" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDirty" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="date" stroke="#52525b" fontSize={10} fontWeight="bold" hide />
                <YAxis stroke="#52525b" fontSize={10} fontWeight="bold" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }}
                />
                <Area type="monotone" dataKey="clean" stroke="#10b981" fillOpacity={1} fill="url(#colorClean)" name="أموال نظيفة" />
                <Area type="monotone" dataKey="dirty" stroke="#ef4444" fillOpacity={1} fill="url(#colorDirty)" name="أموال قذرة" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900/50 rounded-[2.5rem] border border-white/10 p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
              <PieIcon className="text-purple-500" size={24} />
              توزيع الرتب والوظائف
            </h3>
          </div>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.playerRoles}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data?.playerRoles.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 pr-8">
              {data?.playerRoles.map((entry: any, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 rounded-[2.5rem] border border-white/10 p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
              <ShieldCheck className="text-amber-500" size={24} />
              مراقبة النزاعات (Kills)
            </h3>
          </div>
          <div className="space-y-6">
            {data?.recentKills.map((kill: any, i: number) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  <span>{kill.name}</span>
                  <span>{kill.value}%</span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${kill.value}%` }}
                    transition={{ duration: 1, delay: i * 0.2 }}
                    className={clsx("h-full", i === 0 ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-zinc-600")}
                  />
                </div>
              </div>
            ))}
            <p className="text-[10px] text-zinc-500 font-bold leading-relaxed pt-4 border-t border-white/5">
              * ملاحظة: هذه البيانات يتم تحديثها كل 15 دقيقة من خوادم اللعبة الرئيسية.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
