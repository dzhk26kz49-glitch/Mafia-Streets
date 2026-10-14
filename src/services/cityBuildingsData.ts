import { CityBuilding } from '../types/npcTypes';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';

export const INITIAL_CITY_BUILDINGS: CityBuilding[] = [
  // 1. حي ناطحات السحاب والمصارف (شمال غرب - أعلى اليسار)
  {
    id: 'bld_central_bank',
    name: 'برج البنك المركزي والمالية',
    district: 'حي ناطحات السحاب',
    type: 'commercial',
    x: 6,
    y: 7,
    width: 14,
    height: 9,
    purchasePrice: 45000000,
    dailyRent: 1500000,
    dailyRevenue: 2200000,
    ownerType: 'npc',
    ownerName: 'المصرفي رياض النعيمي',
    isRented: false,
    accumulatedRent: 3000000,
    description: 'أعلى برج مالي في المدينة، مركز تدفق السيولة والودائع الكبرى وحوالات السويفت.',
    iconType: 'Landmark',
    colorScheme: 'from-amber-500/30 to-amber-600/10 border-amber-400'
  },
  {
    id: 'bld_trade_center',
    name: 'برج التجارة والاستثمار الدولي',
    district: 'حي ناطحات السحاب',
    type: 'commercial',
    x: 21,
    y: 6,
    width: 13,
    height: 8,
    purchasePrice: 32000000,
    dailyRent: 1100000,
    dailyRevenue: 1600000,
    ownerType: 'npc',
    ownerName: 'الشركة القابضة للتجارة',
    isRented: false,
    accumulatedRent: 2200000,
    description: 'مقر كبرى الشركات المستوردة، يضم بورصة الأسهم ومكاتب التخليص الجمركي.',
    iconType: 'Building2',
    colorScheme: 'from-blue-500/30 to-blue-600/10 border-blue-400'
  },
  {
    id: 'bld_diplomat_hotel',
    name: 'فندق الأجنحة الدبلوماسية',
    district: 'حي ناطحات السحاب',
    type: 'residential',
    x: 7,
    y: 17,
    width: 13,
    height: 8,
    purchasePrice: 28000000,
    dailyRent: 950000,
    dailyRevenue: 1400000,
    ownerType: 'npc',
    ownerName: 'سيدة الأعمال إليزابيث',
    isRented: false,
    accumulatedRent: 1900000,
    description: 'فندق 7 نجوم للوفود والشخصيات المهمة، مجهز بأعلى منظومات الحماية والمخابئ الآمنة.',
    iconType: 'Building',
    colorScheme: 'from-purple-500/30 to-purple-600/10 border-purple-400'
  },
  {
    id: 'bld_tech_center',
    name: 'مجمع الاتصالات والبيانات المشفرة',
    district: 'حي ناطحات السحاب',
    type: 'infrastructure',
    x: 21,
    y: 15,
    width: 12,
    height: 8,
    purchasePrice: 22000000,
    dailyRent: 800000,
    dailyRevenue: 1200000,
    ownerType: 'npc',
    ownerName: 'المبرمج سيف الهاكر',
    isRented: false,
    accumulatedRent: 1600000,
    description: 'أقوى مخدمات السيرفرات في المنطقة لتشفير الحسابات والاتصالات وتفادي مراقبة الشرطة.',
    iconType: 'Cpu',
    colorScheme: 'from-cyan-500/30 to-cyan-600/10 border-cyan-400'
  },

  // 2. مجمع الملاهي ومدينة الألعاب الكبرى (أعلى الوسط)
  {
    id: 'bld_ferris_wheel',
    name: 'صالة دولاب الهواء البانورامي',
    district: 'مجمع الملاهي والترفيه',
    type: 'entertainment',
    x: 37,
    y: 8,
    width: 12,
    height: 8,
    purchasePrice: 20000000,
    dailyRent: 700000,
    dailyRevenue: 1100000,
    ownerType: 'npc',
    ownerName: 'أمير الكرادة (كازينو)',
    isRented: false,
    accumulatedRent: 1400000,
    description: 'معلم ترفيهي شهير يطل على كافة أرجاء المدينة، يدر أرباح تذاكر هائلة ومطاعم عائلية.',
    iconType: 'Sparkles',
    colorScheme: 'from-pink-500/30 to-pink-600/10 border-pink-400'
  },
  {
    id: 'bld_roller_coaster',
    name: 'ميدان قطار الموت والمغامرات',
    district: 'مجمع الملاهي والترفيه',
    type: 'entertainment',
    x: 50,
    y: 7,
    width: 13,
    height: 8,
    purchasePrice: 24000000,
    dailyRent: 850000,
    dailyRevenue: 1300000,
    ownerType: 'npc',
    ownerName: 'حجي رعد الملاهي',
    isRented: false,
    accumulatedRent: 1700000,
    description: 'أكبر قطار أفعواني في الشرق الأوسط، يتردد عليه آلاف الزوار ويحقق عوائد سياحية ضخمة.',
    iconType: 'Flame',
    colorScheme: 'from-orange-500/30 to-orange-600/10 border-orange-400'
  },
  {
    id: 'bld_carnival_dome',
    name: 'قبة المهرجانات والخيام الملكية',
    district: 'مجمع الملاهي والترفيه',
    type: 'entertainment',
    x: 37,
    y: 18,
    width: 12,
    height: 8,
    purchasePrice: 18000000,
    dailyRent: 650000,
    dailyRevenue: 950000,
    ownerType: 'npc',
    ownerName: 'المخاتير ونقابة الترفيه',
    isRented: false,
    accumulatedRent: 1300000,
    description: 'تقام فيه الحفلات الغنائية والمزادات الكبرى وعروض السيرك والمهرجانات الشعبية.',
    iconType: 'Dices',
    colorScheme: 'from-yellow-500/30 to-yellow-600/10 border-yellow-400'
  },
  {
    id: 'bld_park_pavilion',
    name: 'مجمع أجنحة ومطاعم المنتزه',
    district: 'مجمع الملاهي والترفيه',
    type: 'commercial',
    x: 50,
    y: 17,
    width: 12,
    height: 7,
    purchasePrice: 15000000,
    dailyRent: 550000,
    dailyRevenue: 850000,
    ownerType: 'unowned',
    ownerName: 'شاغر للبيع أو الاستئجار',
    isRented: false,
    accumulatedRent: 0,
    description: 'سلسلة مقاهي وكشكات راقية تقدم الجاي المهيل والمأكولات التراثية للزوار.',
    iconType: 'Coffee',
    colorScheme: 'from-emerald-500/30 to-emerald-600/10 border-emerald-400'
  },

  // 3. حوض الميناء والمستودعات البحرية (أعلى اليمين)
  {
    id: 'bld_smuggler_dock',
    name: 'رصيف الميناء والزوارق السريعة',
    district: 'حوض الميناء والمستودعات',
    type: 'infrastructure',
    x: 78,
    y: 6,
    width: 14,
    height: 9,
    purchasePrice: 30000000,
    dailyRent: 1200000,
    dailyRevenue: 1800000,
    ownerType: 'npc',
    ownerName: 'قبطان التهريب أبو حرب',
    isRented: false,
    accumulatedRent: 2400000,
    description: 'رصيف تفريغ مباشر للبضائع المستوردة والممنوعات عبر زوارق بحرية سريعة تفلت من الرادار.',
    iconType: 'Ship',
    colorScheme: 'from-amber-600/30 to-amber-700/10 border-amber-500'
  },
  {
    id: 'bld_warehouse_main',
    name: 'مستودع الشحن اللوجستي رقم 1',
    district: 'حوض الميناء والمستودعات',
    type: 'industrial',
    x: 65,
    y: 9,
    width: 13,
    height: 8,
    purchasePrice: 26000000,
    dailyRent: 900000,
    dailyRevenue: 1450000,
    ownerType: 'npc',
    ownerName: 'عصابة الأفاعي (Vipers)',
    isRented: false,
    accumulatedRent: 1800000,
    description: 'مستودع عملاق لتخزين الحاويات والسيارات والبضائع المستوردة، مركز تموين سري.',
    iconType: 'Warehouse',
    colorScheme: 'from-red-500/30 to-red-600/10 border-red-400'
  },
  {
    id: 'bld_industrial_refinery',
    name: 'مصنع المعالجة والصناعات الثقيلة',
    district: 'حوض الميناء والمستودعات',
    type: 'industrial',
    x: 72,
    y: 17,
    width: 14,
    height: 9,
    purchasePrice: 25000000,
    dailyRent: 850000,
    dailyRevenue: 1350000,
    ownerType: 'npc',
    ownerName: 'المهندس كريم الحديدي',
    isRented: false,
    accumulatedRent: 1700000,
    description: 'معمل تصنيع معدات وقطع غيار المدرعات والأسلحة ومستلزمات المعامل السرية.',
    iconType: 'Factory',
    colorScheme: 'from-zinc-500/30 to-zinc-600/10 border-zinc-400'
  },

  // 4. شبكة القنوات المائية ومجمع الكورنيش (وسط الخريطة)
  {
    id: 'bld_royal_marina',
    name: 'مرسى اليخوت الملكية والزوارق',
    district: 'شبكة القنوات المائية',
    type: 'commercial',
    x: 68,
    y: 34,
    width: 14,
    height: 8,
    purchasePrice: 27000000,
    dailyRent: 950000,
    dailyRevenue: 1500000,
    ownerType: 'npc',
    ownerName: 'الكابتن جواد النهري',
    isRented: false,
    accumulatedRent: 1900000,
    description: 'مرسى فاخر لليخوت الشخصية وزوارق السباق والنقل النهري السريع بين أطراف المدينة.',
    iconType: 'Anchor',
    colorScheme: 'from-blue-400/30 to-cyan-500/10 border-cyan-300'
  },
  {
    id: 'bld_bridge_hub',
    name: 'مجمع الجسور المعلقة والكورنيش',
    district: 'شبكة القنوات المائية',
    type: 'infrastructure',
    x: 38,
    y: 35,
    width: 16,
    height: 7,
    purchasePrice: 35000000,
    dailyRent: 1300000,
    dailyRevenue: 2000000,
    ownerType: 'npc',
    ownerName: 'هيئة النقل والسيطرات',
    isRented: false,
    accumulatedRent: 2600000,
    description: 'نقطة الربط الحيوية بين شرق وغرب العاصمة، نقطة تحصيل رسوم عبور وشريان النقل الرئيسي.',
    iconType: 'GitMerge',
    colorScheme: 'from-teal-500/30 to-teal-600/10 border-teal-400'
  },
  {
    id: 'bld_floating_bistro',
    name: 'مطعم الجزيرة العائمة السياحي',
    district: 'شبكة القنوات المائية',
    type: 'entertainment',
    x: 18,
    y: 37,
    width: 14,
    height: 8,
    purchasePrice: 19000000,
    dailyRent: 700000,
    dailyRevenue: 1150000,
    ownerType: 'unowned',
    ownerName: 'شاغر للبيع أو الاستئجار',
    isRented: false,
    accumulatedRent: 0,
    description: 'مطعم ونادٍ عائم على مياه القناة، يرتاده كبار رجال الأعمال والمافيا للاجتماعات السرية.',
    iconType: 'Utensils',
    colorScheme: 'from-emerald-400/30 to-emerald-500/10 border-emerald-300'
  },

  // 5. الحي السكني والحدائق الملكية (أسفل اليمين)
  {
    id: 'bld_elite_mansion',
    name: 'قصر النخبة والحدائق المعلقة',
    district: 'الحي السكني والحدائق',
    type: 'residential',
    x: 70,
    y: 53,
    width: 14,
    height: 9,
    purchasePrice: 40000000,
    dailyRent: 1400000,
    dailyRevenue: 2100000,
    ownerType: 'npc',
    ownerName: 'العراب حجي حميد',
    isRented: false,
    accumulatedRent: 2800000,
    description: 'قصر محصن بأسوار فولاذية وكاميرات ليلية وحدائق غناء، يوفر حماية مطلقة لمالكه ومستأجره.',
    iconType: 'Home',
    colorScheme: 'from-emerald-600/30 to-emerald-700/10 border-emerald-500'
  },
  {
    id: 'bld_luxury_villas',
    name: 'مجمع فلل الكورنيش المعاصرة',
    district: 'الحي السكني والحدائق',
    type: 'residential',
    x: 54,
    y: 59,
    width: 13,
    height: 8,
    purchasePrice: 24000000,
    dailyRent: 850000,
    dailyRevenue: 1300000,
    ownerType: 'npc',
    ownerName: 'العقارية الحديثة',
    isRented: false,
    accumulatedRent: 1700000,
    description: 'فلل فاخرة مطلة على المساحات الخضراء، مجهزة بمسابح داخلية وغرف خزن آمنة ومدرعة.',
    iconType: 'Building',
    colorScheme: 'from-lime-500/30 to-lime-600/10 border-lime-400'
  },
  {
    id: 'bld_garden_apartments',
    name: 'أبراج الشقق السكنية والحدائق',
    district: 'الحي السكني والحدائق',
    type: 'residential',
    x: 72,
    y: 66,
    width: 13,
    height: 8,
    purchasePrice: 21000000,
    dailyRent: 750000,
    dailyRevenue: 1150000,
    ownerType: 'unowned',
    ownerName: 'شاغر للبيع أو الاستئجار',
    isRented: false,
    accumulatedRent: 0,
    description: 'مجمع سكني راقٍ يضم مئات الشقق المؤجرة للعوائل والتجار، عوائد إيجارية مستمرة ومضمونة.',
    iconType: 'Building2',
    colorScheme: 'from-green-500/30 to-green-600/10 border-green-400'
  },
  {
    id: 'bld_townhouse_row',
    name: 'حي البيوت التراثية والحدائق',
    district: 'الحي السكني والحدائق',
    type: 'residential',
    x: 56,
    y: 74,
    width: 14,
    height: 8,
    purchasePrice: 17000000,
    dailyRent: 600000,
    dailyRevenue: 900000,
    ownerType: 'npc',
    ownerName: 'مختار الحي أبو ضياء',
    isRented: false,
    accumulatedRent: 1200000,
    description: 'بيوت بغدادية عريقة مع شناشيل وحدائق نارنج، يسكنها وجهاء الشارع وشخصيات مؤثرة.',
    iconType: 'Home',
    colorScheme: 'from-amber-700/30 to-amber-800/10 border-amber-600'
  },

  // 6. المربع الأمني وكازينو المدينة (أسفل اليسار)
  {
    id: 'bld_royal_casino',
    name: 'كازينو رويال الفاخر وصالات القمار',
    district: 'المربع الأمني والترفيه الليلي',
    type: 'entertainment',
    x: 32,
    y: 55,
    width: 14,
    height: 9,
    purchasePrice: 38000000,
    dailyRent: 1350000,
    dailyRevenue: 2400000,
    ownerType: 'npc',
    ownerName: 'كارتيل الكازينو الدولي',
    isRented: false,
    accumulatedRent: 2700000,
    description: 'أكبر مجمع للقمار والمراهنات والروليت وطاولات البوكر، يدخل ملايين الدنانير كل ليلة.',
    iconType: 'Dices',
    colorScheme: 'from-purple-600/30 to-purple-700/10 border-purple-500'
  },
  {
    id: 'bld_tactical_security',
    name: 'مقر القيادة الأمنية والعمليات الخاصة',
    district: 'المربع الأمني والترفيه الليلي',
    type: 'infrastructure',
    x: 12,
    y: 59,
    width: 14,
    height: 9,
    purchasePrice: 33000000,
    dailyRent: 1200000,
    dailyRevenue: 1750000,
    ownerType: 'npc',
    ownerName: 'مديرية الأمن والتدخل السريع',
    isRented: false,
    accumulatedRent: 2400000,
    description: 'مركز القيادة التكتيكية للشرطة والعمليات الخاصة، تأجيره يوفر نفوذاً وحصانة من التفتيش.',
    iconType: 'ShieldCheck',
    colorScheme: 'from-blue-600/30 to-blue-700/10 border-blue-500'
  },
  {
    id: 'bld_armored_garage',
    name: 'كراج الدبابات والمدرعات والسيارات الفاخرة',
    district: 'المربع الأمني والترفيه الليلي',
    type: 'industrial',
    x: 10,
    y: 72,
    width: 14,
    height: 8,
    purchasePrice: 25000000,
    dailyRent: 900000,
    dailyRevenue: 1400000,
    ownerType: 'npc',
    ownerName: 'كراج الحماية والأسطول المدرع',
    isRented: false,
    accumulatedRent: 1800000,
    description: 'كراج آمن مجهز بأحدث الرافعات لصيانة وتصفيح سيارات المافيا والـ G-Class والدبابات.',
    iconType: 'Car',
    colorScheme: 'from-indigo-600/30 to-indigo-700/10 border-indigo-500'
  },
  {
    id: 'bld_metro_hub',
    name: 'محطة المترو والأنفاق الأرضية السرية',
    district: 'المربع الأمني والترفيه الليلي',
    type: 'infrastructure',
    x: 28,
    y: 72,
    width: 14,
    height: 8,
    purchasePrice: 20000000,
    dailyRent: 750000,
    dailyRevenue: 1200000,
    ownerType: 'unowned',
    ownerName: 'شاغر للبيع أو الاستئجار',
    isRented: false,
    accumulatedRent: 0,
    description: 'شبكة أنفاق مترو وممرات سرية تتيح الهروب والتنقل الفوري عند المداهمات الأمنية.',
    iconType: 'Train',
    colorScheme: 'from-yellow-600/30 to-yellow-700/10 border-yellow-500'
  }
];

export function cleanFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => cleanFirestoreData(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(data as Record<string, any>)) {
      if (val !== undefined) {
        cleaned[key] = cleanFirestoreData(val);
      }
    }
    return cleaned as T;
  }
  return data;
}

export class CityBuildingsEngine {
  // جلب كافة العقارات في المدينة مع دمج التحديثات ومعايرة إحداثيات الخريطة الجديدة 3/4
  public static async fetchBuildings(cityId: string = 'baghdad'): Promise<CityBuilding[]> {
    try {
      const snap = await getDoc(doc(db, 'city_maps', cityId));
      if (snap.exists() && snap.data()?.buildings) {
        const remoteBuildings: CityBuilding[] = snap.data().buildings;
        // دمج بيانات الملكية السحابية مع إحداثيات ومواقع الخريطة الجديدة 3/4
        return INITIAL_CITY_BUILDINGS.map(initialBld => {
          const remoteBld = remoteBuildings.find(rb => rb.id === initialBld.id);
          if (remoteBld) {
            return {
              ...initialBld,
              ...remoteBld,
              // الحفاظ على إحداثيات الخريطة الجديدة وأبعادها ومقاطعتها
              x: initialBld.x,
              y: initialBld.y,
              width: initialBld.width,
              height: initialBld.height,
              district: initialBld.district
            };
          }
          return initialBld;
        });
      }
    } catch (err) {
      console.warn('Using local buildings blueprint:', err);
    }
    return INITIAL_CITY_BUILDINGS;
  }

  // شراء عقار بالكامل
  public static async purchaseBuilding(
    cityId: string, 
    buildingId: string, 
    userUid: string, 
    userDisplayName: string, 
    userMoney: number
  ): Promise<{ success: boolean; message: string }> {
    const buildings = await this.fetchBuildings(cityId);
    const bld = buildings.find(b => b.id === buildingId);

    if (!bld) return { success: false, message: 'العقار غير موجود!' };
    if (bld.ownerType === 'player' && bld.ownerId === userUid) {
      return { success: false, message: 'أنت تملك هذا العقار بالفعل!' };
    }
    if (userMoney < bld.purchasePrice) {
      return { success: false, message: `أموالك غير كافية! سعر العقار هو ${bld.purchasePrice.toLocaleString()} د.ع` };
    }

    // تحديث العقار مع تنظيف تام لأي حقول غير معرفة
    const updated = buildings.map(b => {
      if (b.id === buildingId) {
        const copy: any = { ...b };
        delete copy.tenantName;
        delete copy.tenantId;
        delete copy.rentExpiresAt;
        return {
          ...copy,
          ownerType: 'player' as const,
          ownerName: userDisplayName || 'مستثمر',
          ownerId: userUid || 'unknown',
          isRented: false,
          accumulatedRent: 0
        };
      }
      return b;
    });

    try {
      await updateDoc(doc(db, 'users', userUid), {
        cleanMoney: increment(-bld.purchasePrice)
      });
      await setDoc(doc(db, 'city_maps', cityId), { buildings: cleanFirestoreData(updated) }, { merge: true });
    } catch (err) {
      console.error(err);
    }

    return {
      success: true,
      message: `مبروك! تم شراء [${bld.name}] بنجاح ونقل ملكيته بالكامل باسمك في السجل العقاري للمدينة!`
    };
  }

  // استئجار عقار حقيقي لمدة محددة من الأيام
  public static async rentBuilding(
    cityId: string,
    buildingId: string,
    userUid: string,
    userDisplayName: string,
    days: number,
    userMoney: number
  ): Promise<{ success: boolean; message: string }> {
    const buildings = await this.fetchBuildings(cityId);
    const bld = buildings.find(b => b.id === buildingId);

    if (!bld) return { success: false, message: 'العقار غير موجود!' };
    if (bld.ownerId === userUid) {
      return { success: false, message: 'أنت مالك هذا العقار، لا يمكنك استئجار ملكك الخاص!' };
    }
    if (bld.isRented && bld.tenantId && bld.tenantId !== userUid) {
      return { success: false, message: `هذا العقار مؤجر حالياً لـ ${bld.tenantName}!` };
    }

    const totalRentCost = bld.dailyRent * days;
    if (userMoney < totalRentCost) {
      return { success: false, message: `تكلفة الإيجار لـ ${days} أيام هي ${totalRentCost.toLocaleString()} د.ع ورصيدك لا يكفي!` };
    }

    const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;

    const updated = buildings.map(b => {
      if (b.id === buildingId) {
        return {
          ...b,
          isRented: true,
          tenantName: userDisplayName || 'مستأجر',
          tenantId: userUid || 'unknown',
          rentExpiresAt: expiresAt,
          accumulatedRent: (b.accumulatedRent || 0) + totalRentCost
        };
      }
      return b;
    });

    try {
      await updateDoc(doc(db, 'users', userUid), {
        cleanMoney: increment(-totalRentCost)
      });

      // إذا كان المالك لاعب آخر، نضيف له الإيجار
      if (bld.ownerId && bld.ownerType === 'player') {
        await updateDoc(doc(db, 'users', bld.ownerId), {
          cleanMoney: increment(totalRentCost)
        });
      }

      await setDoc(doc(db, 'city_maps', cityId), { buildings: cleanFirestoreData(updated) }, { merge: true });
    } catch (err) {
      console.error(err);
    }

    return {
      success: true,
      message: `تم توقيع عقد الإيجار بنجاح لـ [${bld.name}] لمدة ${days} أيام! العقار تحت تصرفك الآن وتستفيد من كامل عوائده وحمايته.`
    };
  }

  // تحصيل عوائد الإيجار المتراكمة للمالك
  public static async collectRent(
    cityId: string,
    buildingId: string,
    userUid: string
  ): Promise<{ success: boolean; amount: number; message: string }> {
    const buildings = await this.fetchBuildings(cityId);
    const bld = buildings.find(b => b.id === buildingId);

    if (!bld) return { success: false, amount: 0, message: 'العقار غير موجود!' };
    if (bld.ownerId !== userUid) {
      return { success: false, amount: 0, message: 'أنت لست مالك هذا العقار لتحصيل إيجاره!' };
    }

    const amount = bld.accumulatedRent || 0;
    if (amount <= 0) {
      return { success: false, amount: 0, message: 'لا توجد أرباح إيجار متراكمة حالياً لتحصيلها!' };
    }

    const updated = buildings.map(b => {
      if (b.id === buildingId) {
        return {
          ...b,
          accumulatedRent: 0
        };
      }
      return b;
    });

    try {
      await updateDoc(doc(db, 'users', userUid), {
        cleanMoney: increment(amount)
      });
      await setDoc(doc(db, 'city_maps', cityId), { buildings: cleanFirestoreData(updated) }, { merge: true });
    } catch (err) {
      console.error(err);
    }

    return {
      success: true,
      amount,
      message: `عاشت إيدك! تم تحصيل عوائد إيجار قدرها ${amount.toLocaleString()} د.ع وأودعت في محفظتك كاش!`
    };
  }
}
