export const MILITIA_IMAGES = {
  vehicle: 'https://up6.cc/2026/04/177619251855932.png',
  logistics: 'https://up6.cc/2026/04/177619251865033.png',
  armor: 'https://up6.cc/2026/04/177619251847551.png',
  weapon: 'https://i.ytimg.com/vi/0IWPMawg80c/maxresdefault.jpg',
  aircraft: 'https://up6.cc/2026/04/17761922251511.jpeg',
  intelligence: 'https://up6.cc/2026/04/1776290411891.png',
  fortifications: 'https://up6.cc/2026/04/177619222536134.png'
};

export const SHOP_ITEMS = {
  vehicles: [
    { id: 'm_veh_1', name: 'مدرعة خفيفة', price: 500000, power: 100, defense: 100, image: MILITIA_IMAGES.vehicle },
    { id: 'm_veh_2', name: 'ناقلة جند', price: 1200000, power: 250, defense: 300, image: MILITIA_IMAGES.vehicle },
    { id: 'm_veh_3', name: 'دبابة قتالية', price: 5000000, power: 800, defense: 1000, image: MILITIA_IMAGES.vehicle },
    { id: 'sf_veh_1', name: 'مدرعة JLTV سوداء', price: 2000000, power: 400, defense: 500, image: MILITIA_IMAGES.vehicle },
    { id: 'sf_veh_2', name: 'مدرعة M1151 Black', price: 1500000, power: 300, defense: 400, image: MILITIA_IMAGES.vehicle }
  ],
  weapons: [
    { id: 'm_wep_1', name: 'MK18 CQBR', price: 25000, power: 50, image: MILITIA_IMAGES.weapon },
    { id: 'm_wep_2', name: 'قناصة M24', price: 75000, power: 120, image: MILITIA_IMAGES.weapon },
    { id: 'm_wep_3', name: 'قاذف RPG', price: 150000, power: 300, image: MILITIA_IMAGES.weapon }
  ],
  armor: [
    { id: 'm_arm_1', name: 'درع تكتيكي خفيف', price: 15000, defense: 30, image: MILITIA_IMAGES.armor },
    { id: 'm_arm_2', name: 'درع سيراميك ثقيل', price: 45000, defense: 80, image: MILITIA_IMAGES.armor }
  ],
  logistics: [
    { id: 'm_log_1', name: 'وحدة تموين شاملة', price: 350000, quantity: 1000, effect: '1000 ذخيرة/طعام/وقود/ماء', image: MILITIA_IMAGES.logistics },
    { id: 'm_log_4', name: 'صندوق ذخيرة (1000)', price: 50000, quantity: 1000, effect: '1000 قطعة ذخيرة', image: MILITIA_IMAGES.logistics },
    { id: 'm_log_5', name: 'برميل وقود (1000)', price: 40000, quantity: 1000, effect: '1000 لتر وقود', image: MILITIA_IMAGES.logistics },
    { id: 'm_log_6', name: 'شحنة طعام (1000)', price: 30000, quantity: 1000, effect: '1000 وجبة طعام', image: MILITIA_IMAGES.logistics },
    { id: 'm_log_7', name: 'خزان ماء (1000)', price: 20000, quantity: 1000, effect: '1000 لتر ماء', image: MILITIA_IMAGES.logistics },
    { id: 'm_log_3', name: 'دواء 1000 قطعة', price: 50000, quantity: 1000, effect: '1000 قطعة دواء', image: 'https://up6.cc/2026/04/177619251865033.png' },
    { id: 'm_log_2', name: 'مركز اتصالات', price: 250000, quantity: 1, effect: 'تنسيق ميداني', image: MILITIA_IMAGES.logistics }
  ],
  aircraft: [
    { id: 'm_air_1', name: 'درون انتحاري', price: 1000000, power: 400, image: MILITIA_IMAGES.aircraft },
    { id: 'm_air_2', name: 'مروحية هجومية', price: 15000000, power: 2000, defense: 1500, image: MILITIA_IMAGES.aircraft },
    { id: 'm_air_3', name: 'مقاتلة حربية', price: 50000000, power: 5000, defense: 3000, image: MILITIA_IMAGES.aircraft }
  ],
  intelligence: [
    { id: 'm_int_1', name: 'منظومة تجسس', price: 500000, power: 150, image: MILITIA_IMAGES.intelligence },
    { id: 'm_int_2', name: 'وحدة استخبارات ميدانية', price: 2000000, power: 500, image: MILITIA_IMAGES.intelligence },
    { id: 'm_int_3', name: 'قمر صناعي تكتيكي', price: 10000000, power: 2000, image: MILITIA_IMAGES.intelligence }
  ],
  fortifications: [
    { id: 'm_for_1', name: 'سواتر ودفاعات', price: 300000, power: 50, defense: 300, image: MILITIA_IMAGES.fortifications },
    { id: 'm_for_2', name: 'خندق محصن', price: 800000, power: 100, defense: 800, image: MILITIA_IMAGES.fortifications },
    { id: 'm_for_3', name: 'مخبأ تحت الأرض', price: 3000000, power: 200, defense: 2500, image: MILITIA_IMAGES.fortifications }
  ]
};
