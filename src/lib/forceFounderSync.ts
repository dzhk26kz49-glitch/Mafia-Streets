
import { doc, setDoc } from 'firebase/firestore';                
import { db } from '../lib/firebase';                

const DEFAULT_FOUNDERS = [
  {
    id: 'founder_1',
    name: 'حيدر أبو زيد البغدادي',
    description: 'قائد كاريزمي وصاحب نفوذ واسع. يسيطر على القرارات الكبرى. بارع في إدارة التحالفات. يفضل السيطرة الذكية بدل المواجهة المباشرة.',
    image: 'https://up6.cc/2026/04/177654459214371.jpeg'
  },
  {
    id: 'founder_2',
    name: 'جاسم أبو فهد الأنباري',
    description: 'مقاتل صلب وشرس. يتحمل الحروب الطويلة. يعتمد عليه في الخطوط الأمامية. لا يتراجع بسهولة.',
    image: 'https://up6.cc/2026/04/177654459218032.jpeg'
  },
  {
    id: 'founder_3',
    name: 'كرار أبو علي الموصلي',
    description: 'خفي وسريع جدًا. متخصص في التسلل والاغتيالات. يضرب ويختفي بدون أثر. دقيق في تنفيذ المهام.',
    image: 'https://up6.cc/2026/04/177654459221243.jpeg'
  },
  {
    id: 'founder_4',
    name: 'مهند أبو سيف البصري',
    description: 'عقل اقتصادي خطير. يتحكم بالموارد والإمدادات. بارع في الصفقات والتهريب. يفضل الفوز بدون قتال.',
    image: 'https://up6.cc/2026/04/177654459224084.jpeg'
  },
  {
    id: 'founder_5',
    name: 'علاء أبو حسن التكريتي',
    description: 'هجومي وحاسم. يقود المعارك بنفسه. سريع في اتخاذ القرار. يزرع الخوف في الخصوم.',
    image: 'https://up6.cc/2026/04/177654466820951.jpeg'
  }
];

export const runForceFounderSync = async () => {
    try {
        await setDoc(doc(db, 'gameData', 'founders'), { list: DEFAULT_FOUNDERS });
        console.log('Founders successfully force-synced.');
        return true;
    } catch (error) {
        console.error('Error force-syncing founders:', error);
        return false;
    }
}
