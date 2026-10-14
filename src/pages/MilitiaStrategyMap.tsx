import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, useMap, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapZone } from '../types/militiaStrategy';
import { generateInitialZones } from '../lib/militiaMapGenerator';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, doc, getDocs, setDoc, updateDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'sonner';
import { Crosshair, Building2, Shield, Zap, TrendingUp, AlertTriangle, X, Radio, Plane, Droplets, HeartPulse, Factory, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

// Component to handle map re-centering
const RecenterMap = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom());
  }, [center, map]);
  return null;
};

const MilitiaStrategyMap = () => {
  const { user, profile } = useAuthStore();
  const [zones, setZones] = useState<MapZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<MapZone | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'build' | 'military' | 'drone'>('info');
  const [aiReport, setAiReport] = useState<string | null>(null);

  // Initialize and subscribe to zones
  useEffect(() => {
    const initZones = async () => {
      try {
        const zonesRef = collection(db, 'militia_zones');
        const snapshot = await getDocs(zonesRef);
        
        if (snapshot.empty) {
          // One-time initialization if empty
          const initialZones = generateInitialZones();
          const batch = writeBatch(db);
          initialZones.forEach(z => {
            const docRef = doc(db, 'militia_zones', z.id);
            batch.set(docRef, z);
          });
          await batch.commit();
          setZones(initialZones);
        }
        
        // Listen for real-time changes
        const unsubscribe = onSnapshot(zonesRef, (snapshot) => {
          const updatedZones: MapZone[] = [];
          snapshot.forEach(doc => {
            updatedZones.push(doc.data() as MapZone);
          });
          setZones(updatedZones);
          
          if (selectedZone) {
            const updatedSelected = updatedZones.find(z => z.id === selectedZone.id);
            if (updatedSelected) setSelectedZone(updatedSelected);
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'militia_zones');
          setLoading(false);
        });
        
        return () => unsubscribe();
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'militia_zones');
        setLoading(false);
      }
    };
    
    initZones();
  }, []);

  const getPolygonStyle = (zone: MapZone) => {
    const isSelected = selectedZone?.id === zone.id;
    let fillColor = 'transparent';
    let color = '#3f3f46'; // Neutral
    let fillOpacity = 0.1;

    if (zone.owner_id === user?.uid) {
      fillColor = '#3b82f6'; // Blue for player
      color = '#2563eb';
      fillOpacity = 0.3 + (zone.control_percentage / 200);
    } else if (zone.owner_id) {
      fillColor = '#ef4444'; // Red for enemy
      color = '#dc2626';
      fillOpacity = 0.3 + (zone.control_percentage / 200);
    }

    if (zone.status === 'combat') {
      fillColor = '#f59e0b'; // Orange for combat
      color = '#d97706';
      fillOpacity = 0.5;
    }

    if (isSelected) {
      color = '#eab308'; // Yellow border when selected
      fillOpacity += 0.2;
    }

    return {
      fillColor,
      color,
      weight: isSelected ? 3 : 1,
      fillOpacity
    };
  };

  const handleZoneClick = (zone: MapZone) => {
    setSelectedZone(zone);
    setAiReport(null);
  };

  const calculateBattleOutcome = () => {
    // Advanced Combat Algorithm (Client-Side Simulation for UI, real validation should be in Cloud Functions)
    if (!selectedZone || !profile) return;
    
    setLoading(true);
    // Simulate AI thinking
    setTimeout(async () => {
      try {
        const zoneRef = doc(db, 'militia_zones', selectedZone.id);
        const newControl = Math.min(100, selectedZone.control_percentage + 15);
        const isOccupied = newControl >= 100;
        
        const updates: Partial<MapZone> = {
          control_percentage: newControl,
          status: isOccupied ? 'occupied' : 'combat',
          owner_id: isOccupied ? user!.uid : selectedZone.owner_id
        };
        
        await updateDoc(zoneRef, updates);
        
        toast.success(isOccupied ? 'تم احتلال المنطقة بنجاح!' : 'تم زيادة السيطرة بنجاح!');
        setAiReport(`[تحليل استراتيجي]: هجوم ناجح. تم استخدام تكتيك الكماشة في التضاريس (${selectedZone.terrain === 'urban' ? 'حضرية' : selectedZone.terrain === 'desert' ? 'صحراوية' : 'صناعية'}). ${isOccupied ? 'انتصار حاسم.' : 'نوصي بهجوم إضافي لكسر الدفاعات المتبقية.'}`);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `militia_zones/${selectedZone.id}`);
      } finally {
        setLoading(false);
      }
    }, 1500);
  };

  const handleBuild = async (buildingType: keyof MapZone['buildings']) => {
    if (!selectedZone || selectedZone.owner_id !== user?.uid) {
      toast.error('يجب أن تحتل المنطقة أولاً');
      return;
    }
    
    try {
      const zoneRef = doc(db, 'militia_zones', selectedZone.id);
      const currentLevel = selectedZone.buildings[buildingType];
      
      await updateDoc(zoneRef, {
        [`buildings.${buildingType}`]: currentLevel + 1
      });
      toast.success('تمت ترقية المبنى بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `militia_zones/${selectedZone.id}`);
    }
  };

  if (loading && zones.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-black">
         <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
         <p className="text-emerald-500 font-bold animate-pulse text-xl">جاري تحميل خريطة الأقمار الصناعية...</p>
      </div>
    );
  }

  const mapCenter: [number, number] = [33.3152, 44.3661];

  return (
    <div className="flex-1 flex h-[calc(100vh-64px)] overflow-hidden bg-black relative">
      
      {/* Map Area */}
      <div className="flex-1 relative z-0">
        <MapContainer 
          center={mapCenter} 
          zoom={13} 
          style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
          zoomControl={false}
        >
          {/* Esri World Imagery (Satellite) */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          />
          
          {selectedZone && <RecenterMap center={selectedZone.center} />}

          {zones.map(zone => (
            <Polygon
              key={zone.id}
              positions={zone.coordinates}
              pathOptions={getPolygonStyle(zone)}
              eventHandlers={{
                click: () => handleZoneClick(zone)
              }}
            >
              <Tooltip sticky className="bg-black/80 backdrop-blur-md border border-white/10 text-white font-bold p-2 text-xs rounded-xl shadow-xl">
                <div className="text-right">
                  <p className="text-emerald-500 mb-1">{zone.name}</p>
                  <p className="text-zinc-300">السيطرة: {zone.control_percentage}%</p>
                  <p className="text-zinc-400 text-[10px]">النوع: {zone.terrain === 'urban' ? 'حضري' : zone.terrain === 'desert' ? 'صحراوي' : 'صناعي'}</p>
                </div>
              </Tooltip>
            </Polygon>
          ))}
        </MapContainer>

        {/* Map Overlays */}
        <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-2xl flex items-center gap-3">
             <Crosshair className="text-emerald-500" size={20} />
             <div>
               <p className="text-white font-black text-sm drop-shadow-md">القيادة الاستراتيجية</p>
               <p className="text-[10px] text-zinc-400 font-medium">نظام المراقبة والتحكم M-1</p>
             </div>
          </div>
        </div>
      </div>

      {/* Sidebar Command Center */}
      <AnimatePresence>
        {selectedZone && (
          <motion.div 
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-96 bg-black/90 backdrop-blur-xl border-l border-white/10 flex flex-col z-[1000] relative shadow-2xl h-full"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 relative overflow-hidden shrink-0">
               <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-transparent"></div>
               <button 
                 onClick={() => setSelectedZone(null)}
                 className="absolute top-4 left-4 text-zinc-500 hover:text-white transition-colors z-10 bg-white/5 p-1.5 rounded-full hover:bg-red-500/20"
               >
                 <X size={16} />
               </button>
               
               <div className="relative z-10 flex items-start gap-4">
                 <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center shrink-0">
                    <Crosshair className="text-emerald-500" size={24} />
                 </div>
                 <div>
                   <h2 className="text-2xl font-black text-white italic tracking-tight">{selectedZone.name}</h2>
                   <div className="flex items-center gap-2 text-xs font-bold mt-1">
                     <span className={clsx(
                       "px-2 py-0.5 rounded-full uppercase",
                       selectedZone.status === 'occupied' ? "bg-emerald-500/20 text-emerald-500" :
                       selectedZone.status === 'combat' ? "bg-orange-500/20 text-orange-500" :
                       "bg-zinc-500/20 text-zinc-400"
                     )}>
                       {selectedZone.status === 'occupied' ? 'محتلة' : selectedZone.status === 'combat' ? 'اشتباك' : 'محايدة'}
                     </span>
                     <span className="text-zinc-500">|</span>
                     <span className="text-zinc-400 uppercase">{selectedZone.terrain === 'urban' ? 'منطقة حضرية' : selectedZone.terrain === 'desert' ? 'منطقة صحراوية' : 'منطقة صناعية'}</span>
                   </div>
                 </div>
               </div>

               {/* Control Bar */}
               <div className="mt-5 relative z-10">
                 <div className="flex justify-between text-xs font-black mb-1">
                   <span className="text-zinc-400">السيطرة</span>
                   <span className="text-emerald-500">{selectedZone.control_percentage}%</span>
                 </div>
                 <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                     style={{ width: `${selectedZone.control_percentage}%` }}
                   />
                 </div>
               </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5 shrink-0 px-2 pt-2 bg-black/40">
              {[
                { id: 'info', icon: AlertTriangle, label: 'معلومات' },
                { id: 'military', icon: Shield, label: 'القتال' },
                { id: 'build', icon: Building2, label: 'البناء' },
                { id: 'drone', icon: Plane, label: 'درون' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={clsx(
                    "flex-1 py-3 text-[10px] font-black uppercase flex flex-col items-center gap-1 transition-all border-b-2",
                    activeTab === tab.id 
                      ? "text-emerald-500 border-emerald-500 bg-emerald-500/5" 
                      : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5"
                  )}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              
              {activeTab === 'info' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">الموارد المتاحة بالمنطقة</h3>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                         <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1"><Droplets size={12} className="text-blue-400"/> نفط</span>
                         <span className="text-sm font-black text-white">{selectedZone.resources.oil}</span>
                       </div>
                       <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                         <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1"><Zap size={12} className="text-yellow-400"/> غاز</span>
                         <span className="text-sm font-black text-white">{selectedZone.resources.gas}</span>
                       </div>
                       <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                         <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1"><HeartPulse size={12} className="text-red-400"/> أدوية</span>
                         <span className="text-sm font-black text-white">{selectedZone.resources.medicine}</span>
                       </div>
                       <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                         <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1"><Factory size={12} className="text-emerald-400"/> أموال</span>
                         <span className="text-sm font-black text-white">{selectedZone.resources.corruption_money}</span>
                       </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">القوات المتمركزة</h3>
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4 space-y-3">
                       <div className="flex justify-between items-center text-sm">
                         <span className="text-zinc-400 font-medium">قوات مشاة</span>
                         <span className="font-black text-white">{selectedZone.armies.regulars}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm">
                         <span className="text-zinc-400 font-medium">قوات خاصة</span>
                         <span className="font-black text-blue-400">{selectedZone.armies.special_forces}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm">
                         <span className="text-zinc-400 font-medium">آليات ومدرعات</span>
                         <span className="font-black text-orange-400">{selectedZone.armies.vehicles}</span>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'military' && (
                <div className="space-y-6">
                  {aiReport && (
                    <div className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={16} className="text-emerald-500" />
                        <h4 className="font-black text-emerald-400 text-xs uppercase tracking-widest">تقرير الذكاء الاستراتيجي (AI)</h4>
                      </div>
                      <p className="text-xs text-emerald-100/70 leading-relaxed font-medium">{aiReport}</p>
                    </div>
                  )}

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <h3 className="text-lg font-black text-white italic mb-2 relative z-10">شن هجوم ميداني</h3>
                    <p className="text-[10px] text-zinc-400 leading-relaxed mb-6 relative z-10">استخدم قوات المليشيا المتوفرة لديك للسيطرة التدريجية على هذه المنطقة. الهجوم في المناطق الحضرية يسبب خسائر أكبر.</p>
                    
                    <button
                      onClick={calculateBattleOutcome}
                      disabled={loading || selectedZone.owner_id === user?.uid}
                      className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 relative z-10"
                    >
                      <Crosshair size={16} />
                      {loading ? 'جاري محاكاة الهجوم...' : selectedZone.owner_id === user?.uid ? 'المنطقة تحت سيطرتك' : 'شن هجوم شامل'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'build' && (
                <div className="space-y-4">
                   {selectedZone.owner_id !== user?.uid && (
                     <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex gap-3 text-red-400">
                       <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                       <p className="text-[10px] font-bold leading-relaxed">يجب السيطرة على هذه المنطقة بالكامل (100%) لتمكين عمليات البناء والتشييد.</p>
                     </div>
                   )}

                   {[
                     { id: 'oil_field', name: 'حقل استخراج نفط', icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                     { id: 'factory', name: 'مصنع إمدادات', icon: Factory, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                     { id: 'command_center', name: 'مركز قيادة', icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
                   ].map(b => (
                     <div key={b.id} className={clsx(
                       "border rounded-xl p-4 flex items-center justify-between",
                       selectedZone.owner_id === user?.uid ? "bg-white/5 border-white/10 hover:border-white/20" : "bg-white/5 border-white/5 opacity-50 grayscale pointer-events-none"
                     )}>
                        <div className="flex items-center gap-3">
                          <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center", b.bg)}>
                            <b.icon size={20} className={b.color} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-white">{b.name}</p>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase">المستوى: <span className="text-white">{(selectedZone.buildings as any)[b.id]}</span></p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleBuild(b.id as any)}
                          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                        >
                          <TrendingUp size={14} />
                        </button>
                     </div>
                   ))}
                </div>
              )}

              {activeTab === 'drone' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                     <button className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 text-center group transition-all">
                        <Radio size={24} className="text-blue-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                        <p className="text-xs font-black text-white uppercase tracking-widest">مهمة استطلاع</p>
                        <p className="text-[9px] text-zinc-500 mt-1 font-medium">كشف الوحدات المخفية</p>
                     </button>
                     
                     <button className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 text-center group transition-all">
                        <Plane size={24} className="text-red-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                        <p className="text-xs font-black text-white uppercase tracking-widest">قصف جوي مسير</p>
                        <p className="text-[9px] text-zinc-500 mt-1 font-medium">تدمير دفاعات العدو</p>
                     </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default MilitiaStrategyMap;
