export const MILITIA_IMAGES = {
  background: 'https://up6.cc/2026/04/17761922251511.jpeg',
  headquarters: 'https://up6.cc/2026/04/177640685065961.png',
  soldierSuit: 'https://up6.cc/2026/04/177619222519472.png',
  soldierArmor: 'https://up6.cc/2026/04/177619222528313.png',
  soldierFull: 'https://up6.cc/2026/04/177619222536134.png',
  sf_suit: 'https://up6.cc/2026/04/1776290411891.png',
  sf_mk18: 'https://up6.cc/2026/04/177629041197452.png',
  sf_m24: 'https://up6.cc/2026/04/177629041206183.png',
  sf_rpg: 'https://up6.cc/2026/04/177629041210764.png',
  vehicle: 'https://up6.cc/2026/04/177619251855932.png',
  apc: 'https://up6.cc/2026/04/177636217054161.png',
  tank: 'https://up6.cc/2026/04/177636217062112.png',
  jltv: 'https://up6.cc/2026/04/177636039387132.png',
  m1151: 'https://up6.cc/2026/04/177636039395763.png',
  logistics: 'https://up6.cc/2026/04/177619251865033.png',
  ammo_box: 'https://up6.cc/2026/04/17763618826191.png',
  fuel_barrel: 'https://up6.cc/2026/04/177636188270492.png',
  food_cargo: 'https://up6.cc/2026/04/177636188276943.png',
  water_tank: 'https://up6.cc/2026/04/177636188285564.png',
  medicine: 'https://up6.cc/2026/04/177636039378871.png',
  armor: 'https://up6.cc/2026/04/177619251847551.png',
  weapon: 'https://i.ytimg.com/vi/0IWPMawg80c/maxresdefault.jpg',
  aircraft: 'https://up6.cc/2026/04/17761922251511.jpeg',
  intelligence: 'https://up6.cc/2026/04/1776290411891.png',
  fortifications: 'https://up6.cc/2026/04/177619222536134.png'
};

export const SHOP_ITEMS = {
  vehicles: [
    { id: 'm_veh_1', name: 'مدرعة خفيفة', price: 500000, power: 100, defense: 100, image: 'https://up6.cc/2026/04/177619251855932.png' },
    { id: 'm_veh_2', name: 'ناقلة جند', price: 1200000, power: 250, defense: 300, image: 'https://up6.cc/2026/04/177636217054161.png' },
    { id: 'm_veh_3', name: 'دبابة قتالية', price: 5000000, power: 800, defense: 1000, image: 'https://up6.cc/2026/04/177636217062112.png' },
    { id: 'sf_veh_1', name: 'مدرعة JLTV سوداء', price: 2000000, power: 400, defense: 500, image: 'https://up6.cc/2026/04/177636039387132.png' },
    { id: 'sf_veh_2', name: 'مدرعة M1151 Black', price: 1500000, power: 300, defense: 400, image: 'https://up6.cc/2026/04/177636039395763.png' }
  ],
  weapons: [
    { id: 'm_wep_1', name: 'MK18 CQBR', price: 25000, power: 50, image: 'https://i.ytimg.com/vi/0IWPMawg80c/maxresdefault.jpg' },
    { id: 'm_wep_2', name: 'قناصة M24', price: 75000, power: 120, image: 'https://i.ytimg.com/vi/0IWPMawg80c/maxresdefault.jpg' },
    { id: 'm_wep_3', name: 'قاذف RPG', price: 150000, power: 300, image: 'https://i.ytimg.com/vi/0IWPMawg80c/maxresdefault.jpg' }
  ],
  armor: [
    { id: 'm_arm_1', name: 'درع تكتيكي خفيف', price: 15000, defense: 30, image: 'https://up6.cc/2026/04/177619251847551.png' },
    { id: 'm_arm_2', name: 'درع سيراميك ثقيل', price: 45000, defense: 80, image: 'https://up6.cc/2026/04/177619251847551.png' }
  ],
  logistics: [
    { id: 'm_log_1', name: 'وحدة تموين شاملة', price: 350000, quantity: 1000, effect: '1000 ذخيرة/طعام/وقود/ماء', image: 'https://up6.cc/2026/04/177619251865033.png' },
    { id: 'm_log_4', name: 'صندوق ذخيرة (1000)', price: 50000, quantity: 1000, effect: '1000 قطعة ذخيرة', image: 'https://up6.cc/2026/04/17763618826191.png' },
    { id: 'm_log_5', name: 'برميل وقود (1000)', price: 40000, quantity: 1000, effect: '1000 لتر وقود', image: 'https://up6.cc/2026/04/177636188270492.png' },
    { id: 'm_log_6', name: 'شحنة طعام (1000)', price: 30000, quantity: 1000, effect: '1000 وجبة طعام', image: 'https://up6.cc/2026/04/177636188276943.png' },
    { id: 'm_log_7', name: 'خزان ماء (1000)', price: 20000, quantity: 1000, effect: '1000 لتر ماء', image: 'https://up6.cc/2026/04/177636188285564.png' },
    { id: 'm_log_3', name: 'دواء 1000 قطعة', price: 50000, quantity: 1000, effect: '1000 قطعة دواء', image: 'https://up6.cc/2026/04/177636039378871.png' },
    { id: 'm_log_2', name: 'مركز اتصالات', price: 250000, quantity: 1, effect: 'تنسيق ميداني', image: 'https://up6.cc/2026/04/177619251865033.png' }
  ],
  aircraft: [
    { id: 'm_air_1', name: 'درون انتحاري', price: 1000000, power: 400, image: 'https://up6.cc/2026/04/17761922251511.jpeg' },
    { id: 'm_air_2', name: 'مروحية هجومية', price: 15000000, power: 2000, defense: 1500, image: 'https://up6.cc/2026/04/17761922251511.jpeg' },
    { id: 'm_air_3', name: 'مقاتلة حربية', price: 50000000, power: 5000, defense: 3000, image: 'https://up6.cc/2026/04/17761922251511.jpeg' }
  ],
  intelligence: [
    { id: 'm_int_1', name: 'منظومة تجسس', price: 500000, power: 150, image: 'https://up6.cc/2026/04/1776290411891.png' },
    { id: 'm_int_2', name: 'وحدة استخبارات ميدانية', price: 2000000, power: 500, image: 'https://up6.cc/2026/04/1776290411891.png' },
    { id: 'm_int_3', name: 'قمر صناعي تكتيكي', price: 10000000, power: 2000, image: 'https://up6.cc/2026/04/1776290411891.png' }
  ],
  fortifications: [
    { id: 'm_for_1', name: 'سواتر ودفاعات', price: 300000, power: 50, defense: 300, image: 'https://up6.cc/2026/04/177619222536134.png' },
    { id: 'm_for_2', name: 'خندق محصن', price: 800000, power: 100, defense: 800, image: 'https://up6.cc/2026/04/177619222536134.png' },
    { id: 'm_for_3', name: 'مخبأ تحت الأرض', price: 3000000, power: 200, defense: 2500, image: 'https://up6.cc/2026/04/177619222536134.png' }
  ]
};
