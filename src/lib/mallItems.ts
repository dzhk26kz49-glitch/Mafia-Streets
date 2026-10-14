import { 
  Shirt, Footprints, Gem, Crown, Sword, Shield, Glasses, Headphones, 
  Watch, Briefcase, Settings, Car, Sparkles, Cpu, Gamepad2, HeartPulse, 
  ShoppingBag, Flame, Star, Package
} from 'lucide-react';

export interface StoreCategory {
  id: string;
  name: string;
  color: string;
  iconName: string;
  description?: string;
  createdAt?: any;
}

export const CATEGORY_ICON_MAP: Record<string, any> = {
  Car,
  Gem,
  Crown,
  Shirt,
  Sparkles,
  Cpu,
  Gamepad2,
  HeartPulse,
  ShoppingBag,
  Flame,
  Star,
  Package,
  Shield,
  Watch
};

export const CATEGORY_COLORS = [
  { label: 'كهرماني / برتقالي', value: 'from-amber-500 to-orange-600' },
  { label: 'ذهبي / أصفر', value: 'from-yellow-400 to-amber-500' },
  { label: 'بنفسجي / أرجواني', value: 'from-purple-500 to-indigo-600' },
  { label: 'أزرق / سماوي', value: 'from-blue-500 to-cyan-500' },
  { label: 'وردي / ياقوتي', value: 'from-pink-500 to-rose-600' },
  { label: 'زمردي / فيروزي', value: 'from-emerald-500 to-teal-600' },
  { label: 'بنفسجي فاتح / فوشيا', value: 'from-violet-500 to-fuchsia-600' },
  { label: 'أحمر ناري', value: 'from-red-500 to-rose-600' },
  { label: 'رمادي فضي', value: 'from-zinc-400 to-slate-600' },
];

export const DEFAULT_STORE_CATEGORIES: StoreCategory[] = [
  { id: 'vehicles', name: 'المركبات', color: 'from-amber-500 to-orange-600', iconName: 'Car', description: 'سيارات ودراجات ومركبات فاخرة' },
  { id: 'jewelry', name: 'المجوهرات', color: 'from-yellow-400 to-amber-500', iconName: 'Gem', description: 'ساعات، مجوهرات وأطقم ماسية' },
  { id: 'luxury', name: 'الفخام', color: 'from-purple-500 to-indigo-600', iconName: 'Crown', description: 'مقتنيات نادرة وتحف حصرية' },
  { id: 'tailor_clothing', name: 'الخياط والملابس', color: 'from-blue-500 to-cyan-500', iconName: 'Shirt', description: 'أزياء فاخرة وبدلات تفصيل' },
  { id: 'grooming_beauty', name: 'الحلاقة والجمال', color: 'from-pink-500 to-rose-600', iconName: 'Sparkles', description: 'عناية راقية ومظاهر شخصية' },
  { id: 'machines', name: 'الآلات', color: 'from-emerald-500 to-teal-600', iconName: 'Cpu', description: 'أجهزة ذكية ومعدات متطورة' },
  { id: 'hobbies', name: 'الهوايات', color: 'from-violet-500 to-fuchsia-600', iconName: 'Gamepad2', description: 'أدوات الترفيه والرياضة والفن' },
  { id: 'health', name: 'الصحة', color: 'from-red-500 to-rose-600', iconName: 'HeartPulse', description: 'مكملات حيوية وعناية صحية' },
];

// Backwards compatibility alias
export const MALL_CATEGORIES = DEFAULT_STORE_CATEGORIES.map(c => ({
  ...c,
  icon: CATEGORY_ICON_MAP[c.iconName] || ShoppingBag
}));

export interface EquipmentSlotOption {
  id: string;
  label: string;
  icon?: any;
  zIndex?: number;
}

export interface EquipmentSlotGroup {
  groupId: string;
  groupLabel: string;
  slots: EquipmentSlotOption[];
}

export const EQUIPMENT_SLOT_GROUPS: EquipmentSlotGroup[] = [
  {
    groupId: 'head',
    groupLabel: 'الرأس',
    slots: [
      { id: 'hats', label: 'القبعات', icon: Crown, zIndex: 40 },
      { id: 'glasses', label: 'النظارات', icon: Glasses, zIndex: 35 },
    ]
  },
  {
    groupId: 'clothing',
    groupLabel: 'الملابس',
    slots: [
      { id: 'clothing', label: 'الملابس', icon: Shirt, zIndex: 20 },
    ]
  },
  {
    groupId: 'feet',
    groupLabel: 'القدمين',
    slots: [
      { id: 'shoes', label: 'الأحذية', icon: Footprints, zIndex: 20 },
      { id: 'socks', label: 'الجوارب', icon: Shirt, zIndex: 15 },
    ]
  },
  {
    groupId: 'accessories',
    groupLabel: 'الإكسسوارات',
    slots: [
      { id: 'acc_head', label: 'إكسسوارات الرأس', icon: Headphones, zIndex: 45 },
      { id: 'acc_neck', label: 'إكسسوارات الرقبة', icon: Gem, zIndex: 30 },
      { id: 'acc_chest', label: 'إكسسوارات الصدر', icon: Briefcase, zIndex: 35 },
      { id: 'acc_arms', label: 'إكسسوارات الذراعين', icon: Watch, zIndex: 30 },
      { id: 'acc_hands', label: 'إكسسوارات اليد', icon: Gem, zIndex: 30 },
      { id: 'acc_waist', label: 'إكسسوارات الخصر', icon: Briefcase, zIndex: 30 },
      { id: 'acc_back', label: 'إكسسوارات الظهر', icon: Briefcase, zIndex: 5 },
      { id: 'acc_feet', label: 'إكسسوارات القدم', icon: Gem, zIndex: 25 },
    ]
  },
  {
    groupId: 'system',
    groupLabel: 'الأسلحة والدروع',
    slots: [
      { id: 'weapon1', label: 'اليد اليمنى', icon: Sword, zIndex: 50 },
      { id: 'weapon2', label: 'اليد اليسرى', icon: Sword, zIndex: 50 },
      { id: 'armor', label: 'الدرع', icon: Shield, zIndex: 18 },
      { id: 'juggernaut', label: 'Juggernaut Suit', icon: Shield, zIndex: 19 },
      { id: 'computer', label: 'الكمبيوتر', icon: Settings, zIndex: 0 },
    ]
  },
  {
    groupId: 'other',
    groupLabel: 'أخرى',
    slots: [
      { id: 'none', label: 'مقتنى عام / ممتلكات بدون لبس', icon: Package, zIndex: 0 },
    ]
  }
];

export const ALL_EQUIPMENT_SLOTS: EquipmentSlotOption[] = EQUIPMENT_SLOT_GROUPS.flatMap(g => g.slots);

export function getSlotLabel(slotId?: string): string {
  if (!slotId || slotId === 'none') return 'مقتنى عام';
  const found = ALL_EQUIPMENT_SLOTS.find(s => s.id === slotId);
  return found ? found.label : slotId;
}

export function getSlotGroupLabel(slotId?: string): string {
  if (!slotId || slotId === 'none') return 'أخرى';
  const group = EQUIPMENT_SLOT_GROUPS.find(g => g.slots.some(s => s.id === slotId));
  return group ? group.groupLabel : 'عام';
}

export const ALL_PRODUCTS: any[] = [];

