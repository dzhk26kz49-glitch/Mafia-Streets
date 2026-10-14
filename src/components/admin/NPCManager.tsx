import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Sparkles, 
  Save, 
  RefreshCw, 
  DollarSign, 
  Shield, 
  Heart, 
  Zap, 
  MapPin, 
  Upload, 
  Eye, 
  X, 
  Check, 
  AlertTriangle, 
  Image as ImageIcon, 
  ArrowRight,
  TrendingUp,
  Package,
  Wand2,
  Sliders,
  Maximize2
} from 'lucide-react';
import { NPCCharacter, NPCPersonality, NPCInventoryItem, NPCActivity, NPCMood } from '../../types/npcTypes';
import { NPCEngine } from '../../services/npcEngine';
import { FIXED_50_NPCS } from '../../services/fixedNpcRoster';
import { formatMoney } from '../../lib/utils';
import { toast } from 'sonner';
import { 
  IRAQI_DISTRICTS, 
  PERSONALITY_METADATA, 
  ACTIVITY_METADATA, 
  MOOD_METADATA 
} from '../../services/npcDialogues';

const PRESET_AVATARS = [
  { label: 'زعيم 3D تكتيكي', url: '/images/avatars/male_boss_3d_1791828720347.jpg' },
  { label: 'زعيمة 3D مافيا', url: '/images/avatars/fem_boss_3d_1791828735327.jpg' },
  { label: 'العراب الكلاسيكي', url: '/images/avatars/male_godfather_1791828784113.jpg' },
  { label: 'سيدة سهرة أرستقراطية', url: '/images/avatars/fem_evening_1791828801818.jpg' },
  { label: 'مسلح شوارع تكتيكي', url: '/images/avatars/male_tactical_1791828751732.jpg' },
  { label: 'مسلحة عمليات تكتيكية', url: '/images/avatars/fem_tactical_1791828766336.jpg' },
  { label: 'ثري عراقي', url: '/images/npcs/male_wealthy.jpg' },
  { label: 'ثرية بغدادية', url: '/images/npcs/female_wealthy.jpg' },
  { label: 'متمرد قبضاي', url: '/images/npcs/male_aggressive.jpg' },
  { label: 'متمردة أزقة', url: '/images/npcs/female_aggressive.jpg' }
];

export const NPCManager: React.FC = () => {
  const [npcs, setNpcs] = useState<NPCCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState('الكل');
  const [personalityFilter, setPersonalityFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');

  // Modals
  const [editingNpc, setEditingNpc] = useState<NPCCharacter | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [deletingNpcId, setDeletingNpcId] = useState<string | null>(null);
  
  // Gemini AI Modal
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiTargetNpc, setAiTargetNpc] = useState<NPCCharacter | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiReferenceImage, setAiReferenceImage] = useState<string>('');
  const [aiReferencePreview, setAiReferencePreview] = useState<string>('');
  const [aiAspectRatio, setAiAspectRatio] = useState<'3:4' | '1:1'>('3:4');
  const [aiIsGenerating, setAiIsGenerating] = useState(false);
  const [aiGeneratedImage, setAiGeneratedImage] = useState<string | null>(null);

  // Quick fund modal
  const [fundingNpc, setFundingNpc] = useState<NPCCharacter | null>(null);
  const [fundAmount, setFundAmount] = useState<number>(500000);

  // Load NPCs on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const roster = await NPCEngine.loadRoster();
      setNpcs(roster);
    } catch (e) {
      console.error(e);
      toast.error('فشل تحميل الشخصيات');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToCloud = async (rosterToSave = npcs) => {
    setSaving(true);
    try {
      const ok = await NPCEngine.saveRoster(rosterToSave);
      if (ok) {
        toast.success(`تم حفظ ومزامنة ${rosterToSave.length} شخصية في السيرفر بنجاح!`);
      } else {
        toast.warning('تم الحفظ محلياً في المتصفح فقط لتعذر الاتصال بالسيرفر');
      }
    } catch (e) {
      toast.error('حدث خطأ أثناء حفظ البيانات');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!window.confirm('هل أنت متأكد من استعادة التشكيلة الافتراضية الأصلية للشخصيات؟')) return;
    setNpcs(FIXED_50_NPCS);
    await handleSaveToCloud(FIXED_50_NPCS);
    toast.success('تمت استعادة التشكيلة الافتراضية بنجاح');
  };

  // Delete NPC
  const handleDeleteNpc = async (id: string) => {
    const target = npcs.find(n => n.id === id);
    if (!target) return;
    const updated = npcs.filter(n => n.id !== id);
    setNpcs(updated);
    setDeletingNpcId(null);
    await handleSaveToCloud(updated);
    toast.success(`تم حذف الشخصية [${target.name}] بنجاح`);
  };

  // Open Edit Modal
  const openEditModal = (npc: NPCCharacter) => {
    setEditingNpc(JSON.parse(JSON.stringify(npc)));
    setIsCreatingNew(false);
  };

  // Open Create Modal
  const openCreateModal = () => {
    const newId = `npc_custom_${Date.now()}`;
    const newNpc: NPCCharacter = {
      id: newId,
      name: 'شخصية جديدة',
      nickname: 'الزعيم',
      gender: 'male',
      genderArabic: 'ذكر',
      image: '/images/avatars/male_boss_3d_1791828720347.jpg',
      personality: 'aggressive',
      personalityArabic: 'عدواني ومتمرد',
      specialty: 'قبضاي أزقة ومسلح ثقيل',
      cash: 500000,
      health: 120,
      maxHealth: 120,
      aggression: 8,
      caution: 4,
      intelligence: 7,
      district: 'الكرادة',
      activity: 'wandering',
      activityArabic: 'يتجول بالأزقة',
      statusText: 'يراقب حركة المارة بتركيز وحذر',
      mood: 'cheerful',
      moodArabic: 'رايق ومتونس',
      x: 50,
      y: 50,
      affection: 20,
      trust: 20,
      respect: 30,
      conflict: 0,
      friendship: 10,
      friendshipRank: 'معرفة عابرة',
      isHiredProtector: false,
      protectionBonus: {
        damageAbsorption: 30,
        counterDamageBonus: 15,
        raidDefense: 20
      },
      protectionCost: 60000,
      favoriteGifts: [
        { type: 'tea', bonus: 15, reactionText: 'عاشت إيدك على الشاي السنكين!' },
        { type: 'weapon', bonus: 35, reactionText: 'هدية تسوى ذهب، سلاح ثقيل!' }
      ],
      uniqueInventory: [
        {
          id: `item_${Date.now()}_1`,
          name: 'مسدس جلوك 19 تكتيكي',
          category: 'weapon',
          categoryArabic: 'سلاح ناري',
          price: 350000,
          buyPrice: 220000,
          stock: 3,
          desc: 'مسدس نمساوي سريع الاستجابة',
          rarity: 'rare'
        }
      ],
      historyWithPlayer: {
        fights: 0,
        trades: 0,
        betsWon: 0,
        betsLost: 0,
        giftsReceived: 0,
        timesProtected: 0,
        policeReports: 0,
        lastInteraction: Date.now(),
        affinity: 0
      },
      recentEvents: ['ظهرت الشخصية حديثاً في شوارع الكرادة'],
      loanAvailable: 150000,
      loanGranted: 0
    };

    setEditingNpc(newNpc);
    setIsCreatingNew(true);
  };

  // Save Edit / Create
  const handleSaveNpcForm = async () => {
    if (!editingNpc) return;
    if (!editingNpc.name.trim()) {
      toast.error('يرجى إدخال اسم الشخصية');
      return;
    }

    let updatedList: NPCCharacter[];
    if (isCreatingNew) {
      updatedList = [editingNpc, ...npcs];
      toast.success(`تمت إضافة الشخصية [${editingNpc.name}] بنجاح!`);
    } else {
      updatedList = npcs.map(n => n.id === editingNpc.id ? editingNpc : n);
      toast.success(`تم تحديث بيانات [${editingNpc.name}] بنجاح!`);
    }

    setNpcs(updatedList);
    setEditingNpc(null);
    setIsCreatingNew(false);
    await handleSaveToCloud(updatedList);
  };

  // Open Gemini AI Generator
  const openGeminiModal = (npc?: NPCCharacter) => {
    const target = npc || editingNpc || npcs[0];
    setAiTargetNpc(target);
    setAiGeneratedImage(null);
    setAiReferenceImage(target?.image || '');
    setAiReferencePreview(target?.image || '');

    // توليد برومبت افتراضي متقن للشخصية
    const genderText = target?.gender === 'female' ? 'امرأة عراقية' : 'رجل عراقي';
    const suggestedPrompt = `شخصية مافيا (${genderText}) في بغداد - حي ${target?.district || 'الكرادة'}، التخصص: ${target?.specialty || 'زعيم شوارع'}، النمط: ${target?.personalityArabic || 'عدواني'}، يرتدي ملابس تكتيكية وساعة فاخرة، إضاءة سينمائية درامية داكنة وأجواء أزقة واقعية بدقة 8K`;
    setAiPrompt(suggestedPrompt);
    setAiModalOpen(true);
  };

  // Generate Image with Gemini API
  const handleGenerateGeminiImage = async () => {
    if (!aiPrompt.trim() && !aiReferenceImage) {
      toast.error('يرجى كتابة وصف أو تقديم نموذج صورة');
      return;
    }

    setAiIsGenerating(true);
    setAiGeneratedImage(null);

    try {
      const res = await fetch('/api/admin/generate-npc-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          referenceImage: aiReferenceImage.startsWith('data:') ? aiReferenceImage : undefined,
          referenceImageUrl: !aiReferenceImage.startsWith('data:') ? aiReferenceImage : undefined,
          aspectRatio: aiAspectRatio,
          gender: aiTargetNpc?.gender || 'male',
          personality: aiTargetNpc?.personality || 'gangster',
          district: aiTargetNpc?.district || 'الكرادة'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل التوليد بواسطة Gemini');
      }

      setAiGeneratedImage(data.imageUrl);
      toast.success('تم توليد صورة الشخصية بنجاح بواسطة Gemini!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'حدث خطأ أثناء توليد الصورة');
    } finally {
      setAiIsGenerating(false);
    }
  };

  // Apply Generated Image to NPC
  const handleApplyAiImage = async () => {
    if (!aiGeneratedImage || !aiTargetNpc) return;

    const newImageUrl = aiGeneratedImage;

    // إذا كان المودال مفتوحاً للتعديل المباشر
    if (editingNpc && editingNpc.id === aiTargetNpc.id) {
      setEditingNpc({ ...editingNpc, image: newImageUrl });
    }

    // تحديث القائمة العامة
    const updated = npcs.map(n => n.id === aiTargetNpc.id ? { ...n, image: newImageUrl } : n);
    setNpcs(updated);
    await handleSaveToCloud(updated);

    toast.success(`تم اعتماد الصورة الجديدة للشخصية [${aiTargetNpc.name}] بنجاح!`);
    setAiModalOpen(false);
  };

  // File Upload Handler for reference or direct portrait
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, forGeminiRef = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      if (forGeminiRef) {
        setAiReferenceImage(base64);
        setAiReferencePreview(base64);
        toast.info('تم تحميل الصورة كنموذج إرشادي لـ Gemini');
      } else if (editingNpc) {
        try {
          // حفظ الصورة على السيرفر
          const res = await fetch('/api/admin/save-npc-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Data: base64, filename: `npc_${editingNpc.id}_${Date.now()}` })
          });
          const d = await res.json();
          if (d.success && d.imageUrl) {
            setEditingNpc({ ...editingNpc, image: d.imageUrl });
            toast.success('تم رفع الصورة وحفظها للشخصية بنجاح');
          } else {
            setEditingNpc({ ...editingNpc, image: base64 });
          }
        } catch {
          setEditingNpc({ ...editingNpc, image: base64 });
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Quick Fund Action
  const handleQuickFund = async () => {
    if (!fundingNpc) return;
    const updated = npcs.map(n => {
      if (n.id === fundingNpc.id) {
        return { ...n, cash: Math.max(0, n.cash + fundAmount) };
      }
      return n;
    });
    setNpcs(updated);
    setFundingNpc(null);
    await handleSaveToCloud(updated);
    toast.success(`تم تعديل محفظة [${fundingNpc.name}] بمقدار ${formatMoney(fundAmount)}`);
  };

  // Filtered List
  const filteredNpcs = npcs.filter(npc => {
    const matchSearch = !search.trim() || 
      npc.name.toLowerCase().includes(search.toLowerCase()) || 
      npc.nickname.toLowerCase().includes(search.toLowerCase()) ||
      npc.specialty.toLowerCase().includes(search.toLowerCase());
    
    const matchDistrict = districtFilter === 'الكل' || npc.district === districtFilter;
    const matchPersonality = personalityFilter === 'all' || npc.personality === personalityFilter;
    const matchGender = genderFilter === 'all' || npc.gender === genderFilter;

    return matchSearch && matchDistrict && matchPersonality && matchGender;
  });

  const totalCash = npcs.reduce((acc, n) => acc + (n.cash || 0), 0);
  const maleCount = npcs.filter(n => n.gender === 'male').length;
  const femaleCount = npcs.filter(n => n.gender === 'female').length;

  return (
    <div className="space-y-4 text-white" dir="rtl">
      {/* الترويسة وأزرار الإجراءات الرئيسية */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Users className="text-amber-400" size={20} />
            إدارة شخصيات وعالم الخفاء (NPCs)
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {npcs.length} شخصية نشطة
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            إضافة وتعديل وحذف الشخصيات، تعديل الكاش والبضائع والمقاييس، وتوليد صور احترافية باستخدام ذكاء Gemini الاصطناعي بناءً على نماذج.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={openCreateModal}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
          >
            <Plus size={16} />
            إضافة شخصية جديدة
          </button>

          <button
            onClick={() => openGeminiModal()}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-purple-950/40"
          >
            <Sparkles size={16} />
            استوديو صور Gemini AI
          </button>

          <button
            onClick={() => handleSaveToCloud()}
            disabled={saving}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow disabled:opacity-50"
          >
            <Save size={15} />
            {saving ? 'جاري الحفظ...' : 'حفظ ومزامنة في السيرفر'}
          </button>

          <button
            onClick={handleResetToDefault}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            title="استعادة التشكيلة الافتراضية"
          >
            <RefreshCw size={14} />
            استعادة الافتراضي
          </button>
        </div>
      </div>

      {/* لوحة إحصائيات سريعة */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
          <div className="text-[11px] text-zinc-400">إجمالي الشخصيات</div>
          <div className="text-base font-black text-white mt-0.5">{npcs.length} شخصية</div>
          <div className="text-[10px] text-zinc-500 mt-1">ذكور: {maleCount} | إناث: {femaleCount}</div>
        </div>

        <div className="bg-zinc-950 border border-emerald-500/20 rounded-xl p-3">
          <div className="text-[11px] text-zinc-400">إجمالي السيولة لدى الـ NPCs</div>
          <div className="text-base font-black text-emerald-400 font-mono mt-0.5">{formatMoney(totalCash)}</div>
          <div className="text-[10px] text-zinc-500 mt-1">تتداول حياً في الشوارع</div>
        </div>

        <div className="bg-zinc-950 border border-purple-500/20 rounded-xl p-3">
          <div className="text-[11px] text-zinc-400">توليد الصور بالذكاء الاصطناعي</div>
          <div className="text-base font-black text-purple-400 mt-0.5">Gemini 3.1 Flash</div>
          <div className="text-[10px] text-zinc-500 mt-1">دعم النماذج الإرشادية والبورتريه</div>
        </div>

        <div className="bg-zinc-950 border border-blue-500/20 rounded-xl p-3">
          <div className="text-[11px] text-zinc-400">المطابق للفلتر الحالي</div>
          <div className="text-base font-black text-blue-400 mt-0.5">{filteredNpcs.length} من أصل {npcs.length}</div>
          <div className="text-[10px] text-zinc-500 mt-1">بحسب المنطقة والنمط والبحث</div>
        </div>
      </div>

      {/* شريط الفلاتر والبحث */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم، اللقب، أو التخصص..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* فلتر المنطقة */}
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
          >
            <option value="الكل">جميع المناطق</option>
            {IRAQI_DISTRICTS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* فلتر النمط */}
          <select
            value={personalityFilter}
            onChange={(e) => setPersonalityFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">جميع الأنماط</option>
            {Object.entries(PERSONALITY_METADATA).map(([key, val]) => (
              <option key={key} value={key}>{val.title}</option>
            ))}
          </select>

          {/* فلتر الجنس */}
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setGenderFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                genderFilter === 'all' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setGenderFilter('male')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                genderFilter === 'male' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              رجال
            </button>
            <button
              onClick={() => setGenderFilter('female')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                genderFilter === 'female' ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              نساء
            </button>
          </div>
        </div>
      </div>

      {/* قائمة كروت الشخصيات */}
      {loading ? (
        <div className="p-12 text-center text-zinc-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="animate-spin text-amber-500" size={18} />
          جاري تحميل شخصيات عالم الخفاء...
        </div>
      ) : filteredNpcs.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 text-xs bg-zinc-950 rounded-2xl border border-zinc-800">
          لم يتم العثور على أي شخصية تطابق معايير البحث.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredNpcs.map((npc) => (
            <div
              key={npc.id}
              className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-2xl overflow-hidden transition-all shadow-lg flex flex-col justify-between"
            >
              <div className="p-4 space-y-3">
                {/* رأس الكرت مع الصورة المصغرة والأسماء */}
                <div className="flex items-start gap-3">
                  <div className="relative w-16 h-20 rounded-xl overflow-hidden border border-zinc-700 shrink-0 bg-black group">
                    <img
                      src={npc.image}
                      alt={npc.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/avatars/male_boss.jpg';
                      }}
                    />
                    <button
                      onClick={() => openGeminiModal(npc)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-purple-300 transition-opacity"
                      title="توليد صورة جديدة بـ Gemini"
                    >
                      <Sparkles size={16} />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-black text-white truncate">{npc.name}</h3>
                      <span className="text-xs text-amber-400 font-bold">"{npc.nickname}"</span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold border ${
                        npc.personality === 'wealthy' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                        npc.personality === 'aggressive' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                        npc.personality === 'poor' ? 'bg-zinc-800 text-zinc-300 border-zinc-700' :
                        'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      }`}>
                        {npc.personalityArabic}
                      </span>

                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-800 font-bold">
                        {npc.genderArabic}
                      </span>

                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800 flex items-center gap-1">
                        <MapPin size={10} />
                        {npc.district}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {npc.specialty}
                    </p>
                  </div>
                </div>

                {/* مؤشرات المقاييس والمال */}
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-zinc-900/70 rounded-xl border border-zinc-800/80 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">المحفظة النقدية:</span>
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      {formatMoney(npc.cash)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-400 block">الصحة والطاقة:</span>
                    <span className="font-mono font-bold text-rose-400 text-xs flex items-center gap-1">
                      <Heart size={12} />
                      {npc.health} / {npc.maxHealth}
                    </span>
                  </div>
                </div>

                {/* أشرطة الخصائص: الشجاعة، الحذر، الذكاء */}
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>الجرأة والعدوانية:</span>
                    <span className="font-mono text-zinc-300">{npc.aggression}/10</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full" style={{ width: `${(npc.aggression / 10) * 100}%` }} />
                  </div>

                  <div className="flex items-center justify-between text-zinc-400">
                    <span>الحذر والخوف:</span>
                    <span className="font-mono text-zinc-300">{npc.caution}/10</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(npc.caution / 10) * 100}%` }} />
                  </div>
                </div>

                {/* عدد البضائع المتوفرة */}
                <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-1 border-t border-zinc-900">
                  <span className="flex items-center gap-1">
                    <Package size={12} className="text-zinc-500" />
                    البضائع في المخزن:
                  </span>
                  <span className="font-bold text-zinc-300">{npc.uniqueInventory?.length || 0} صنف</span>
                </div>
              </div>

              {/* أزرار الإجراءات السريعة على الكرت */}
              <div className="p-2.5 bg-zinc-900/90 border-t border-zinc-800 flex items-center justify-between gap-1.5">
                <button
                  onClick={() => openEditModal(npc)}
                  className="flex-1 py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <Edit2 size={13} />
                  تعديل البيانات
                </button>

                <button
                  onClick={() => openGeminiModal(npc)}
                  className="py-1.5 px-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                  title="توليد صورة بالذكاء الاصطناعي"
                >
                  <Sparkles size={13} />
                  Gemini
                </button>

                <button
                  onClick={() => setFundingNpc(npc)}
                  className="py-1.5 px-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                  title="شحن أو خصم كاش"
                >
                  <DollarSign size={13} />
                  كاش
                </button>

                <button
                  onClick={() => setDeletingNpcId(npc.id)}
                  className="p-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 rounded-lg transition-colors"
                  title="حذف الشخصية"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===================== مودال تعديل أو إضافة شخصية ===================== */}
      {editingNpc && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl my-auto">
            {/* ترويسة المودال */}
            <div className="flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Edit2 className="text-amber-400" size={18} />
                <h3 className="text-sm font-black text-white">
                  {isCreatingNew ? 'إضافة شخصية جديدة إلى عالم الخفاء' : `تعديل بيانات: ${editingNpc.name}`}
                </h3>
              </div>
              <button
                onClick={() => setEditingNpc(null)}
                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* جسم الفورم */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* قسم الصورة مع المعاينة والتحكم */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-24 h-32 rounded-xl overflow-hidden border-2 border-amber-500/40 shrink-0 bg-black shadow-lg relative group">
                  <img
                    src={editingNpc.image}
                    alt={editingNpc.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/avatars/male_boss.jpg';
                    }}
                  />
                </div>

                <div className="flex-1 space-y-2.5 w-full">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 block mb-1">
                      رابط صورة الشخصية (URL أو مسار محلي):
                    </label>
                    <input
                      type="text"
                      value={editingNpc.image}
                      onChange={(e) => setEditingNpc({ ...editingNpc, image: e.target.value })}
                      placeholder="/images/avatars/male_boss.jpg أو رابط خارجي..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => openGeminiModal(editingNpc)}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow"
                    >
                      <Sparkles size={14} />
                      توليد صورة بـ Gemini AI
                    </button>

                    <label className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer">
                      <Upload size={14} />
                      رفع صورة من جهازك
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, false)}
                      />
                    </label>

                    {/* قائمة سريعة بنماذج الصور الجاهزة */}
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          setEditingNpc({ ...editingNpc, image: e.target.value });
                        }
                      }}
                      className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-400 focus:outline-none"
                    >
                      <option value="">نماذج صور جاهزة...</option>
                      {PRESET_AVATARS.map((p) => (
                        <option key={p.url} value={p.url}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* البيانات النصية الأساسية */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-zinc-400 block mb-1">الاسم الكامل:</label>
                  <input
                    type="text"
                    value={editingNpc.name}
                    onChange={(e) => setEditingNpc({ ...editingNpc, name: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-400 block mb-1">اللقب الشعبي (اسم الشارع):</label>
                  <input
                    type="text"
                    value={editingNpc.nickname}
                    onChange={(e) => setEditingNpc({ ...editingNpc, nickname: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-400 block mb-1">الجنس:</label>
                  <select
                    value={editingNpc.gender}
                    onChange={(e) => {
                      const g = e.target.value as 'male' | 'female';
                      setEditingNpc({
                        ...editingNpc,
                        gender: g,
                        genderArabic: g === 'male' ? 'ذكر' : 'أنثى'
                      });
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="male">ذكر (رجل)</option>
                    <option value="female">أنثى (امرأة)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-zinc-400 block mb-1">المنطقة والحي:</label>
                  <select
                    value={editingNpc.district}
                    onChange={(e) => setEditingNpc({ ...editingNpc, district: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    {IRAQI_DISTRICTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-zinc-400 block mb-1">النمط والشخصية:</label>
                  <select
                    value={editingNpc.personality}
                    onChange={(e) => {
                      const p = e.target.value as NPCPersonality;
                      setEditingNpc({
                        ...editingNpc,
                        personality: p,
                        personalityArabic: PERSONALITY_METADATA[p]?.title || p
                      });
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    {Object.entries(PERSONALITY_METADATA).map(([k, v]) => (
                      <option key={k} value={k}>{v.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-zinc-400 block mb-1">التخصص الدقيق في عالم الخفاء:</label>
                  <input
                    type="text"
                    value={editingNpc.specialty}
                    onChange={(e) => setEditingNpc({ ...editingNpc, specialty: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-zinc-400 block mb-1">عبارة الحالة الحالية (Status Bark):</label>
                  <input
                    type="text"
                    value={editingNpc.statusText}
                    onChange={(e) => setEditingNpc({ ...editingNpc, statusText: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* المقاييس المالية والقتالية */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-black text-amber-400">الماليات والقدرات القتالية</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">المحفظة النقدية ($):</label>
                    <input
                      type="number"
                      value={editingNpc.cash}
                      onChange={(e) => setEditingNpc({ ...editingNpc, cash: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">نقاط الصحة (Max HP):</label>
                    <input
                      type="number"
                      value={editingNpc.maxHealth}
                      onChange={(e) => {
                        const mh = Math.max(10, parseInt(e.target.value) || 100);
                        setEditingNpc({ ...editingNpc, maxHealth: mh, health: mh });
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">الجرأة (1 - 10):</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={editingNpc.aggression}
                      onChange={(e) => setEditingNpc({ ...editingNpc, aggression: Math.min(10, Math.max(1, parseInt(e.target.value) || 1)) })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">الحذر (1 - 10):</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={editingNpc.caution}
                      onChange={(e) => setEditingNpc({ ...editingNpc, caution: Math.min(10, Math.max(1, parseInt(e.target.value) || 1)) })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ذيل المودال */}
            <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingNpc(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveNpcForm}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 shadow-lg"
              >
                <Save size={15} />
                حفظ بيانات الشخصية
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== مودال Gemini AI لتوليد الصور ===================== */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto">
            {/* الترويسة */}
            <div className="p-4 bg-gradient-to-r from-purple-950/80 via-zinc-900 to-indigo-950/80 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="text-purple-400" size={18} />
                <div>
                  <h3 className="text-sm font-black text-white">
                    توليد وتطوير صورة الشخصية بالذكاء الاصطناعي (Gemini)
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    استخدم نموذج صورة أو وصفاً سينمائياً لتوليد بورتريه احترافي فائق الدقة.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAiModalOpen(false)}
                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* جسم المودال */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* قسم نموذج الصورة الإرشادي */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-3.5 space-y-2.5">
                <label className="text-xs font-black text-amber-400 block">
                  نموذج الصورة الإرشادي (Reference Image):
                </label>
                
                <div className="flex items-center gap-3">
                  <div className="w-16 h-20 rounded-xl overflow-hidden border border-zinc-700 bg-black shrink-0 relative">
                    {aiReferencePreview ? (
                      <img src={aiReferencePreview} alt="Reference" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[10px]">
                        بدون نموذج
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1">
                        <Upload size={13} />
                        رفع صورة كنموذج
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, true)}
                        />
                      </label>

                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            setAiReferenceImage(e.target.value);
                            setAiReferencePreview(e.target.value);
                          }
                        }}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-400"
                      >
                        <option value="">اختر من نماذج اللعبة...</option>
                        {PRESET_AVATARS.map((p) => (
                          <option key={p.url} value={p.url}>{p.label}</option>
                        ))}
                      </select>

                      {aiReferencePreview && (
                        <button
                          onClick={() => {
                            setAiReferenceImage('');
                            setAiReferencePreview('');
                          }}
                          className="text-xs text-rose-400 hover:text-rose-300 font-bold"
                        >
                          إلغاء النموذج
                        </button>
                      )}
                    </div>

                    <p className="text-[10px] text-zinc-500">
                      سيقوم Gemini بمطابقة الملامح والأسلوب البصري واللباس من هذا النموذج وتحويله إلى شخصية مافيا.
                    </p>
                  </div>
                </div>
              </div>

              {/* حقل البرومبت والوصف */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-zinc-300">
                    وصف الشخصية المطلوب توليدها:
                  </label>
                  <button
                    onClick={() => {
                      if (!aiTargetNpc) return;
                      const genderText = aiTargetNpc.gender === 'female' ? 'امرأة عراقية' : 'رجل عراقي';
                      setAiPrompt(`شخصية مافيا سينمائية (${genderText}) في حي ${aiTargetNpc.district}، التخصص: ${aiTargetNpc.specialty}، النمط: ${aiTargetNpc.personalityArabic}، ملامح شرسة وواثقة، إضاءة سينمائية جانبية داكنة، شوارع بغداد القديمة بالخلفية، تفاصيل دقيقة للغاية 8k`);
                    }}
                    className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-bold"
                  >
                    <Wand2 size={12} />
                    اقتراح وصف تلقائي للشخصية
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="صف ملامح الشخصية، ملابسها، تفاصيل الوجه، والإضاءة والأجواء..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
                />
              </div>

              {/* نسبة الأبعاد: 3:4 أو 1:1 */}
              <div className="flex items-center justify-between bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
                <span className="text-xs font-bold text-zinc-400">نسبة أبعاد الصورة:</span>
                <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  <button
                    onClick={() => setAiAspectRatio('3:4')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      aiAspectRatio === '3:4' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    بورتريه 3:4 (المعتمد)
                  </button>
                  <button
                    onClick={() => setAiAspectRatio('1:1')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      aiAspectRatio === '1:1' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    مربع 1:1
                  </button>
                </div>
              </div>

              {/* مساحة عرض النتيجة والتوليد */}
              {aiIsGenerating ? (
                <div className="p-8 bg-zinc-950 rounded-2xl border border-purple-500/30 text-center space-y-3">
                  <RefreshCw className="animate-spin text-purple-400 mx-auto" size={28} />
                  <div className="text-xs font-black text-white">جاري توليد الصورة باستخدام Gemini 3.1 Flash Image...</div>
                  <p className="text-[11px] text-zinc-500">يقوم الذكاء الاصطناعي برسم ملامح الشخصية والأجواء السينمائية...</p>
                </div>
              ) : aiGeneratedImage ? (
                <div className="p-4 bg-zinc-950 rounded-2xl border border-emerald-500/40 space-y-3">
                  <div className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                    <Check size={16} />
                    تم التوليد بنجاح! معاينة الصورة:
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="w-44 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-2xl bg-black">
                      <img src={aiGeneratedImage} alt="Generated" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* ذيل المودال */}
            <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between gap-2">
              <button
                onClick={() => setAiModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-colors"
              >
                إغلاق
              </button>

              <div className="flex items-center gap-2">
                <button
                  disabled={aiIsGenerating}
                  onClick={handleGenerateGeminiImage}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-lg disabled:opacity-50"
                >
                  <Sparkles size={15} />
                  {aiIsGenerating ? 'جاري التوليد...' : 'بدء التوليد بـ Gemini'}
                </button>

                {aiGeneratedImage && (
                  <button
                    onClick={handleApplyAiImage}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-lg"
                  >
                    <Check size={15} />
                    اعتماد وحفظ الصورة
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== مودال شحن / خصم الكاش السريع ===================== */}
      {fundingNpc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <DollarSign className="text-emerald-400" size={18} />
              تعديل محفظة: {fundingNpc.name}
            </h3>
            <p className="text-xs text-zinc-400">
              الرصيد الحالي: <span className="font-mono text-emerald-400 font-bold">{formatMoney(fundingNpc.cash)}</span>
            </p>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 block font-bold">المبلغ المراد شحنه أو خصمه:</label>
              <input
                type="number"
                value={fundAmount}
                onChange={(e) => setFundAmount(parseInt(e.target.value) || 0)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {[100000, 500000, 1000000, 5000000].map(amt => (
                <button
                  key={amt}
                  onClick={() => setFundAmount(amt)}
                  className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-[10px] font-mono text-zinc-300"
                >
                  +{amt.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setFundingNpc(null)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handleQuickFund}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow"
              >
                تطبيق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* تأكيد الحذف */}
      {deletingNpcId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-rose-500/40 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="text-sm font-black text-rose-400 flex items-center gap-2">
              <AlertTriangle size={18} />
              تأكيد حذف الشخصية
            </h3>
            <p className="text-xs text-zinc-300">
              هل أنت متأكد من حذف هذه الشخصية نهائياً من عالم الخفاء والشوارع؟
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingNpcId(null)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDeleteNpc(deletingNpcId)}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow"
              >
                حذف نهائي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
