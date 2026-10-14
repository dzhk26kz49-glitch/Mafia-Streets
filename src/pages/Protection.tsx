import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore, Guard, ProtectionCar } from '../store/useAuthStore';
import { Shield, Car, UserPlus, Zap, Heart, Wrench, LayoutGrid, List, Crosshair, Smartphone, Pill, Syringe, Sword, Trash2, Users } from 'lucide-react';
import { doc, updateDoc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { MARKET_ITEMS } from '../lib/items';
import clsx from 'clsx';

const GUARD_NAMES = ['أحمد', 'محمد', 'علي', 'عمر', 'خالد', 'طارق', 'زياد', 'فهد', 'سعد', 'يوسف', 'حسن', 'حسين', 'محمود', 'مصطفى', 'عبدالله'];
const GUARD_COUNTRIES = ['iq', 'sy', 'lb', 'eg', 'ae', 'sa', 'jo', 'ma', 'dz', 'tn'];
// CRITICAL: DO NOT CHANGE THIS IMAGE URL. IT IS PERMANENT AS REQUESTED BY THE USER.
const PERMANENT_GUARD_IMAGE = 'https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNjlkMDExYzI4Y2U4ODE5MTg0MmIwYWVkNGE5YzhiMjk6ZmlsZV8wMDAwMDAwMGU4MWM3MjQ2ODgwMWVmODY2NmI1ZDMzNCIsInRzIjoiMjA1NTMiLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6IjViNzUyMjUzYzllYWJhOGY3MDdkNjZhZjRjMDI4ODFmNDAzNzdlOGM4OTFiYzVhZjE3NGY2MDg0NjU5NTZlZmQiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJjcyI6bnVsbCwibWEiOm51bGx9';
const GUARD_IMAGES = [PERMANENT_GUARD_IMAGE];

export default function Protection() {
  const { t } = useTranslation();
  const { profile, customProducts = [] } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'guards' | 'cars'>('guards');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [equipModal, setEquipModal] = useState<{ isOpen: boolean, type: 'car' | 'weapon' | 'armor' | 'phone' | 'poison' | 'stimulant' | 'guard', guardId?: string, carId?: string } | null>(null);
  const [marketOverrides, setMarketOverrides] = useState<Record<string, any>>({});

  React.useEffect(() => {
    const unsub = onSnapshot(collection(db, 'market_overrides'), (snapshot) => {
      const overrides: Record<string, any> = {};
      snapshot.forEach(doc => {
        overrides[doc.id] = doc.data();
      });
      setMarketOverrides(overrides);
    });
    return () => unsub();
  }, []);

  const guards = profile?.protection?.guards || [];
  const cars = profile?.protection?.cars || [];

  const calculateGuardPower = (guard: Guard) => {
    let power = (guard.stats?.strength || 0) + 
                (guard.stats?.endurance || 0) + 
                (guard.stats?.speed || 0) + 
                (guard.stats?.toughness || 0);
    
    if (guard.equipped) {
      if (guard.equipped.weapon) {
        const itemId = guard.equipped.weapon;
        const w = [...MARKET_ITEMS.weapons, ...customProducts.filter(p => p.category === 'weapons')].find(i => itemId === i.id || itemId.startsWith(i.id + '_'));
        if (w) power += (marketOverrides[w.id]?.power || w.power);
      }
      if (guard.equipped.armor) {
        const itemId = guard.equipped.armor;
        const a = [...MARKET_ITEMS.armor, ...customProducts.filter(p => p.category === 'armor')].find(i => itemId === i.id || itemId.startsWith(i.id + '_'));
        if (a) power += (marketOverrides[a.id]?.power || a.power);
      }
      if (guard.equipped.poison) {
        const itemId = guard.equipped.poison;
        const p = [...MARKET_ITEMS.drugs, ...customProducts.filter(p => p.category === 'drugs')].find(i => itemId === i.id || itemId.startsWith(i.id + '_'));
        if (p) power += (marketOverrides[p.id]?.power || (p as any).power || 0);
      }
      if (guard.equipped.stimulant) {
        const itemId = guard.equipped.stimulant;
        const s = [...MARKET_ITEMS.supplements, ...customProducts.filter(p => p.category === 'supplements')].find(i => itemId === i.id || itemId.startsWith(i.id + '_'));
        if (s) power += (marketOverrides[s.id]?.power || (s as any).power || 0);
      }
    }
    return power;
  };

  const dailyExpenses = {
    food: guards.length * 1000,
    fuel: cars.length * 1000,
    salaries: guards.reduce((acc, g) => acc + (g.isPlayer ? 50000 : 10000), 0)
  };
  const totalDailyCost = dailyExpenses.food + dailyExpenses.fuel + dailyExpenses.salaries;

  // Auto-pay upkeep and salaries (Handled by server AI Worker to save quota)
  useEffect(() => {
    // Client-side auto-pay removed.
  }, [profile]);

  const handleHireGuard = async () => {
    if (!profile) return;
    if (profile.cleanMoney < 250000) {
      toast.error('لا تملك المال الكافي (250,000)');
      return;
    }

    // Instant/Optimistic feel: don't block UI with isProcessing for hiring
    try {
      const newGuard: Guard = {
        id: Math.random().toString(36).substring(7),
        name: GUARD_NAMES[Math.floor(Math.random() * GUARD_NAMES.length)],
        country: GUARD_COUNTRIES[Math.floor(Math.random() * GUARD_COUNTRIES.length)],
        image: PERMANENT_GUARD_IMAGE,
        health: 100,
        stats: {
          strength: Math.floor(Math.random() * 10) + 1,
          endurance: Math.floor(Math.random() * 10) + 1,
          speed: Math.floor(Math.random() * 10) + 1,
          toughness: Math.floor(Math.random() * 10) + 1,
        },
        equipped: {
          weapon: null,
          armor: null,
          phone: null,
          poison: null,
          stimulant: null
        },
        salaryPaidUntil: Date.now() + 24 * 60 * 60 * 1000, // Paid for 1 day
        assignedCarId: null,
        isPlayer: false,
        playerId: null
      };

      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, {
        cleanMoney: profile.cleanMoney - 250000,
        'protection.guards': [...guards, newGuard]
      });
      toast.success('تم تعيين حارس شخصي جديد');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ');
    }
  };

  const handlePaySalary = async (guardId: string) => {
    if (!profile) return;
    const guard = guards.find(g => g.id === guardId);
    if (!guard) return;
    
    const salary = guard.isPlayer ? 50000 : 10000;
    if (profile.cleanMoney < salary) {
      toast.error(`لا تملك المال الكافي لدفع الراتب (${salary.toLocaleString()})`);
      return;
    }

    try {
      const updatedGuards = guards.map(g => {
        if (g.id === guardId) {
          return { ...g, salaryPaidUntil: Date.now() + 24 * 60 * 60 * 1000 };
        }
        return g;
      });

      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, {
        cleanMoney: profile.cleanMoney - salary,
        'protection.guards': updatedGuards
      });
      toast.success('تم دفع راتب الحارس');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ');
    }
  };

  const handleTrainGuard = async (guardId: string, stat: 'strength' | 'endurance' | 'speed' | 'toughness') => {
    if (!profile) return;
    if (profile.cleanMoney < 50000) {
      toast.error('تكلفة التدريب 50,000');
      return;
    }

    try {
      const updatedGuards = guards.map(g => {
        if (g.id === guardId) {
          return {
            ...g,
            stats: { ...g.stats, [stat]: g.stats[stat] + 1 }
          };
        }
        return g;
      });

      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, {
        cleanMoney: profile.cleanMoney - 50000,
        'protection.guards': updatedGuards
      });
      toast.success('تم تدريب الحارس');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ');
    }
  };

  const handleHealGuard = async (guardId: string) => {
    if (!profile) return;
    if (profile.cleanMoney < 25000) {
      toast.error('تكلفة العلاج 25,000');
      return;
    }

    try {
      const updatedGuards = guards.map(g => {
        if (g.id === guardId) {
          return { ...g, health: 100 };
        }
        return g;
      });

      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, {
        cleanMoney: profile.cleanMoney - 25000,
        'protection.guards': updatedGuards
      });
      toast.success('تم علاج الحارس');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ');
    }
  };

  const handleDeleteGuard = async (guardId: string) => {
    if (!profile) return;
    const guard = guards.find(g => g.id === guardId);
    if (!guard) return;

    setIsProcessing(true);
    try {
      const updatedGuards = guards.filter(g => g.id !== guardId);
      
      // Also remove from any cars
      const updatedCars = cars.map(c => ({
        ...c,
        assignedGuards: c.assignedGuards.filter(id => id !== guardId)
      }));

      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, {
        'protection.guards': updatedGuards,
        'protection.cars': updatedCars
      });
      toast.success('تم طرد الحارس بنجاح');
      setDeleteConfirm(null);
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء طرد الحارس');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssignCar = async (carItemId: string) => {
    if (!profile) return;
    // Check if player has this car in inventory
    const carCount = profile.inventory?.cars?.[carItemId] || 0;
    if (carCount <= 0) {
      toast.error('لا تملك هذه السيارة في المخزن');
      return;
    }

    setIsProcessing(true);
    try {
      const newCar: ProtectionCar = {
        id: Math.random().toString(36).substring(7),
        carItemId,
        health: 100,
        assignedGuards: []
      };

      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, {
        [`inventory.cars.${carItemId}`]: carCount - 1,
        'protection.cars': [...cars, newCar]
      });
      toast.success('تم تجهيز السيارة للحماية');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ');
    } finally {
      setIsProcessing(false);
      setEquipModal(null);
    }
  };

  const handleManualEquip = async (itemId: string) => {
    if (!profile || !equipModal) return;
    setIsProcessing(true);
    try {
      if (equipModal.type === 'car') {
        await handleAssignCar(itemId);
        return;
      } else if (equipModal.guardId) {
        const guardId = equipModal.guardId;
        const type = equipModal.type;
        
        let inventoryCategory = '';
        if (type === 'weapon') inventoryCategory = 'weapons';
        else if (type === 'armor') inventoryCategory = 'armor';
        else if (type === 'phone') inventoryCategory = 'phones';
        else if (type === 'stimulant') inventoryCategory = 'supplements';
        else if (type === 'poison') inventoryCategory = 'drugs';
        
        const itemCount = (profile.inventory as any)?.[inventoryCategory]?.[itemId] || 0;
        if (itemCount <= 0) {
          toast.error('لا تملك هذا العنصر في المخزن');
          setIsProcessing(false);
          return;
        }

        const updatedGuards = guards.map(g => {
          if (g.id === guardId) {
            return {
              ...g,
              equipped: {
                ...g.equipped,
                [type]: itemId
              }
            };
          }
          return g;
        });

        const docRef = doc(db, 'users', profile.uid);
        const updates: any = {
          'protection.guards': updatedGuards,
          [`inventory.${inventoryCategory}.${itemId}`]: itemCount - 1
        };
        
        const oldItem = guards.find(g => g.id === guardId)?.equipped[type as keyof Guard['equipped']];
        if (oldItem) {
          const oldItemCount = (profile.inventory as any)?.[inventoryCategory]?.[oldItem] || 0;
          updates[`inventory.${inventoryCategory}.${oldItem}`] = oldItemCount + 1;
        }

        await updateDoc(docRef, updates);
        toast.success('تم تجهيز الحارس');
      }
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ');
    } finally {
      setIsProcessing(false);
      setEquipModal(null);
    }
  };

  const handleRepairCar = async (carId: string) => {
    if (!profile) return;
    if (profile.cleanMoney < 50000) {
      toast.error('تكلفة الإصلاح 50,000');
      return;
    }

    setIsProcessing(true);
    try {
      const updatedCars = cars.map(c => {
        if (c.id === carId) {
          return { ...c, health: 100 };
        }
        return c;
      });

      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, {
        cleanMoney: profile.cleanMoney - 50000,
        'protection.cars': updatedCars
      });
      toast.success('تم إصلاح السيارة');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickEquipGuard = async (guardId: string) => {
    if (!profile) return;
    setIsProcessing(true);
    try {
      const inventory = (profile.inventory || {}) as any;
      // Helper to find best item by power
      const findBestItem = (category: string) => {
        const items = [...((MARKET_ITEMS as any)[category] || []), ...customProducts.filter(p => p.category === category)];
        
        // Get all available items from inventory for this category
        const invCategory = inventory[category] || {};
        const availableItemIds = Object.keys(invCategory).filter(id => invCategory[id] > 0);

        const availableItems = items
          .filter(item => {
            // Check if item.id matches or is a prefix of any available item in inventory
            return availableItemIds.some(invId => invId === item.id || invId.startsWith(item.id + '_'));
          })
          .map(item => {
            // Find the specific invId that matches
            const matchingInvId = availableItemIds.find(invId => invId === item.id || invId.startsWith(item.id + '_'))!;
            return {
              ...item,
              invId: matchingInvId,
              effectivePower: marketOverrides[item.id]?.power || (item as any).power || 0
            };
          })
          .sort((a, b) => b.effectivePower - a.effectivePower);
        
        return availableItems.length > 0 ? availableItems[0].invId : null;
      };

      const bestWeapon = findBestItem('weapons');
      const bestArmor = findBestItem('armor');
      const bestPhone = findBestItem('phones');
      const bestStimulant = findBestItem('supplements');
      const bestPoison = findBestItem('drugs');

      const updates: any = {};
      const guard = guards.find(g => g.id === guardId);
      if (!guard) return;

      const newEquipped = {
        weapon: bestWeapon || guard.equipped?.weapon || null,
        armor: bestArmor || guard.equipped?.armor || null,
        phone: bestPhone || guard.equipped?.phone || null,
        stimulant: bestStimulant || guard.equipped?.stimulant || null,
        poison: bestPoison || guard.equipped?.poison || null
      };

      // Handle inventory updates
      if (bestWeapon && bestWeapon !== guard.equipped?.weapon) {
        updates[`inventory.weapons.${bestWeapon}`] = (inventory.weapons?.[bestWeapon] || 0) - 1;
        if (guard.equipped?.weapon) {
          const old = guard.equipped.weapon;
          updates[`inventory.weapons.${old}`] = (inventory.weapons?.[old] || 0) + 1;
        }
      }
      if (bestArmor && bestArmor !== guard.equipped?.armor) {
        updates[`inventory.armor.${bestArmor}`] = (inventory.armor?.[bestArmor] || 0) - 1;
        if (guard.equipped?.armor) {
          const old = guard.equipped.armor;
          updates[`inventory.armor.${old}`] = (inventory.armor?.[old] || 0) + 1;
        }
      }
      if (bestPhone && bestPhone !== guard.equipped?.phone) {
        updates[`inventory.phones.${bestPhone}`] = (inventory.phones?.[bestPhone] || 0) - 1;
        if (guard.equipped?.phone) {
          const old = guard.equipped.phone;
          updates[`inventory.phones.${old}`] = (inventory.phones?.[old] || 0) + 1;
        }
      }
      if (bestStimulant && bestStimulant !== guard.equipped?.stimulant) {
        updates[`inventory.supplements.${bestStimulant}`] = (inventory.supplements?.[bestStimulant] || 0) - 1;
        if (guard.equipped?.stimulant) {
          const old = guard.equipped.stimulant;
          updates[`inventory.supplements.${old}`] = (inventory.supplements?.[old] || 0) + 1;
        }
      }
      if (bestPoison && bestPoison !== guard.equipped?.poison) {
        updates[`inventory.drugs.${bestPoison}`] = (inventory.drugs?.[bestPoison] || 0) - 1;
        if (guard.equipped?.poison) {
          const old = guard.equipped.poison;
          updates[`inventory.drugs.${old}`] = (inventory.drugs?.[old] || 0) + 1;
        }
      }

      const updatedGuards = guards.map(g => g.id === guardId ? { ...g, equipped: newEquipped } : g);
      updates['protection.guards'] = updatedGuards;

      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, updates);
      toast.success('تم التجهيز السريع للحارس بنجاح');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء التجهيز السريع');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveCar = async (carId: string) => {
    if (!profile) return;
    const car = cars.find(c => c.id === carId);
    if (!car) return;

    setIsProcessing(true);
    try {
      const updatedCars = cars.filter(c => c.id !== carId);
      
      // Also remove car assignment from guards
      const updatedGuards = guards.map(g => {
        if (g.assignedCarId === carId) {
          const newGuard = { ...g };
          delete newGuard.assignedCarId;
          return newGuard;
        }
        return g;
      });

      const carItemId = car.carItemId;
      const currentCount = profile.inventory?.cars?.[carItemId] || 0;

      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, {
        'protection.cars': updatedCars,
        'protection.guards': updatedGuards,
        [`inventory.cars.${carItemId}`]: currentCount + 1
      });
      toast.success('تم إزالة السيارة وإعادتها للمخزن');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء إزالة السيارة');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickEquipAllGuards = async () => {
    if (!profile) return;
    setIsProcessing(true);
    try {
      const inventory = { ...(profile.inventory || {}) } as any;
      const updates: any = {};
      
      // Helper to find best item by power
      const findBestItem = (category: string) => {
        const items = [...((MARKET_ITEMS as any)[category] || []), ...customProducts.filter(p => p.category === category)];
        
        // Get all available items from inventory for this category
        const invCategory = inventory[category] || {};
        const availableItemIds = Object.keys(invCategory).filter(id => invCategory[id] > 0);

        const availableItems = items
          .filter(item => {
            // Check if item.id matches or is a prefix of any available item in inventory
            return availableItemIds.some(invId => invId === item.id || invId.startsWith(item.id + '_'));
          })
          .map(item => {
            // Find the specific invId that matches (prefer the one with highest power if multiple, though usually we just pick the first match for simplicity here)
            const matchingInvId = availableItemIds.find(invId => invId === item.id || invId.startsWith(item.id + '_'))!;
            return {
              ...item,
              invId: matchingInvId,
              effectivePower: marketOverrides[item.id]?.power || (item as any).power || 0
            };
          })
          .sort((a, b) => b.effectivePower - a.effectivePower);
        
        return availableItems.length > 0 ? availableItems[0].invId : null;
      };

      const updatedGuards = guards.map(g => {
        // Ensure categories exist in local inventory tracker
        if (!inventory.weapons) inventory.weapons = {};
        if (!inventory.armor) inventory.armor = {};
        if (!inventory.phones) inventory.phones = {};
        if (!inventory.supplements) inventory.supplements = {};
        if (!inventory.drugs) inventory.drugs = {};

        const bestWeapon = findBestItem('weapons');
        const bestArmor = findBestItem('armor');
        const bestPhone = findBestItem('phones');
        const bestStimulant = findBestItem('supplements');
        const bestPoison = findBestItem('drugs');

        const newEquipped = {
          weapon: bestWeapon || g.equipped?.weapon || null,
          armor: bestArmor || g.equipped?.armor || null,
          phone: bestPhone || g.equipped?.phone || null,
          stimulant: bestStimulant || g.equipped?.stimulant || null,
          poison: bestPoison || g.equipped?.poison || null
        };

        // Update local inventory tracker to prevent over-equipping
        if (bestWeapon && bestWeapon !== g.equipped?.weapon) {
          inventory.weapons = { ...inventory.weapons, [bestWeapon]: (inventory.weapons?.[bestWeapon] || 0) - 1 };
          if (g.equipped?.weapon) {
            const old = g.equipped.weapon;
            inventory.weapons[old] = (inventory.weapons?.[old] || 0) + 1;
          }
        }
        if (bestArmor && bestArmor !== g.equipped?.armor) {
          inventory.armor = { ...inventory.armor, [bestArmor]: (inventory.armor?.[bestArmor] || 0) - 1 };
          if (g.equipped?.armor) {
            const old = g.equipped.armor;
            inventory.armor[old] = (inventory.armor?.[old] || 0) + 1;
          }
        }
        if (bestPhone && bestPhone !== g.equipped?.phone) {
          inventory.phones = { ...inventory.phones, [bestPhone]: (inventory.phones?.[bestPhone] || 0) - 1 };
          if (g.equipped?.phone) {
            const old = g.equipped.phone;
            inventory.phones[old] = (inventory.phones?.[old] || 0) + 1;
          }
        }
        if (bestStimulant && bestStimulant !== g.equipped?.stimulant) {
          inventory.supplements = { ...inventory.supplements, [bestStimulant]: (inventory.supplements?.[bestStimulant] || 0) - 1 };
          if (g.equipped?.stimulant) {
            const old = g.equipped.stimulant;
            inventory.supplements[old] = (inventory.supplements?.[old] || 0) + 1;
          }
        }
        if (bestPoison && bestPoison !== g.equipped?.poison) {
          inventory.drugs = { ...inventory.drugs, [bestPoison]: (inventory.drugs?.[bestPoison] || 0) - 1 };
          if (g.equipped?.poison) {
            const old = g.equipped.poison;
            inventory.drugs[old] = (inventory.drugs?.[old] || 0) + 1;
          }
        }

        return { ...g, equipped: newEquipped };
      });

      updates['protection.guards'] = updatedGuards;
      updates.inventory = inventory;

      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, updates);
      toast.success('تم التجهيز السريع لجميع الحراس بأفضل المعدات');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء التجهيز السريع للكل');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveAllCarsFromGuards = async () => {
    if (!profile) return;
    setIsProcessing(true);
    try {
      const updatedGuards = guards.map(g => {
        const newGuard = { ...g };
        delete newGuard.assignedCarId;
        return newGuard;
      });
      const updatedCars = cars.map(c => ({ ...c, assignedGuards: [] }));

      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, {
        'protection.guards': updatedGuards,
        'protection.cars': updatedCars
      });
      toast.success('تم إزالة جميع السيارات من الحراس');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveGuardsFromCar = async (carId: string) => {
    if (!profile) return;
    setIsProcessing(true);
    try {
      const car = cars.find(c => c.id === carId);
      if (!car) {
        setIsProcessing(false);
        return;
      }

      const updatedGuards = guards.map(g => {
        if (car.assignedGuards.includes(g.id)) {
          const newGuard = { ...g };
          delete newGuard.assignedCarId;
          return newGuard;
        }
        return g;
      });

      const updatedCars = cars.map(c => {
        if (c.id === carId) {
          return { ...c, assignedGuards: [] };
        }
        return c;
      });

      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, {
        'protection.guards': updatedGuards,
        'protection.cars': updatedCars
      });
      toast.success('تم إزالة الحراس من السيارة');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickAssignAllToCars = async () => {
    if (!profile) return;
    setIsProcessing(true);
    try {
      let unassignedGuards = guards.filter(g => !g.assignedCarId).map(g => g.id);
      let updatedCars = [...cars];
      
      for (let i = 0; i < updatedCars.length; i++) {
        while (updatedCars[i].assignedGuards.length < 4 && unassignedGuards.length > 0) {
          const guardId = unassignedGuards.shift()!;
          updatedCars[i].assignedGuards.push(guardId);
        }
      }

      const updatedGuards = guards.map(g => {
        const car = updatedCars.find(c => c.assignedGuards.includes(g.id));
        if (car) {
          return { ...g, assignedCarId: car.id };
        }
        return g;
      });

      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, {
        'protection.guards': updatedGuards,
        'protection.cars': updatedCars
      });
      toast.success('تم تعيين الحراس للسيارات المتاحة');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ');
    } finally {
      setIsProcessing(false);
    }
  };
  const handleAssignGuardToCar = async (guardId: string, carId: string) => {
    if (!profile) return;
    try {
      const car = cars.find(c => c.id === carId);
      if (car && car.assignedGuards.length >= 4) {
        toast.error('السيارة ممتلئة (الحد الأقصى 4 حراس)');
        setIsProcessing(false);
        return;
      }

      const updatedGuards = guards.map(g => {
        if (g.id === guardId) {
          return { ...g, assignedCarId: carId };
        }
        return g;
      });

      const updatedCars = cars.map(c => {
        if (c.id === carId) {
          return { ...c, assignedGuards: [...c.assignedGuards, guardId] };
        }
        // Remove from old car if any
        if (c.assignedGuards.includes(guardId)) {
          return { ...c, assignedGuards: c.assignedGuards.filter(id => id !== guardId) };
        }
        return c;
      });

      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, {
        'protection.guards': updatedGuards,
        'protection.cars': updatedCars
      });
      toast.success('تم تعيين الحارس للسيارة');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Tactical Header */}
      <div className="relative overflow-hidden bg-zinc-900/90 border border-white/5 rounded-[2.5rem] p-8 lg:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-red-500/10 to-transparent pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-red-500/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Tactical Command Center
            </div>
            <h1 className="text-4xl lg:text-6xl font-black text-white tracking-tighter uppercase italic">
              {t('protection.title') || 'الحماية والحراسة'}
            </h1>
            <p className="text-zinc-400 max-w-md font-medium leading-relaxed">
              إدارة النخبة من الحراس الشخصيين وتجهيز مواكب الحماية بأحدث التقنيات والأسلحة لضمان أمنك الشخصي.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => {
                const playerId = prompt('أدخل ID اللاعب لدعوته كحارس شخصي:');
                if (playerId) toast.success('تم إرسال الدعوة للاعب بنجاح');
              }}
              className="group relative px-6 py-4 bg-zinc-950 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest text-zinc-300 hover:text-white hover:border-purple-500/50 transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-purple-500/5 translate-y-full group-hover:translate-y-0 transition-transform" />
              <div className="relative flex items-center gap-3">
                <UserPlus size={18} className="text-purple-500" />
                دعوة لاعب
              </div>
            </button>

            <button
              onClick={handleHireGuard}
              disabled={isProcessing}
              className="group relative px-8 py-4 bg-red-600 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-red-600/20 hover:bg-red-500 active:scale-95 transition-all disabled:opacity-50 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <div className="relative flex items-center gap-3">
                <Shield size={18} />
                تعيين حارس (250k)
              </div>
            </button>

            <button
              onClick={() => setEquipModal({ isOpen: true, type: 'car' })}
              className="group relative px-6 py-4 bg-zinc-950 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest text-zinc-300 hover:text-white hover:border-blue-500/50 transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-blue-500/5 translate-y-full group-hover:translate-y-0 transition-transform" />
              <div className="relative flex items-center gap-3">
                <Car size={18} className="text-blue-500" />
                تجهيز سيارة
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Financial Intelligence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'طعام الحراس', value: dailyExpenses.food, icon: Pill, color: 'emerald' },
          { label: 'وقود السيارات', value: dailyExpenses.fuel, icon: Car, color: 'blue' },
          { label: 'رواتب الحماية', value: dailyExpenses.salaries, icon: UserPlus, color: 'amber' },
          { label: 'إجمالي المصروفات', value: totalDailyCost, icon: Zap, color: 'red', highlight: true }
        ].map((stat, i) => (
          <div key={i} className={clsx(
            "relative overflow-hidden p-6 rounded-[2rem] border transition-all",
            stat.highlight 
              ? "bg-red-600 border-red-500 shadow-xl shadow-red-600/10" 
              : "bg-zinc-900/50 border-white/5 hover:border-white/10"
          )}>
            <div className={clsx(
              "absolute -right-4 -bottom-4 opacity-10",
              stat.highlight ? "text-white" : `text-${stat.color}-500`
            )}>
              <stat.icon size={100} />
            </div>
            <p className={clsx(
              "text-[10px] font-black uppercase tracking-widest mb-2",
              stat.highlight ? "text-white/70" : "text-zinc-500"
            )}>
              {stat.label}
            </p>
            <div className="flex items-baseline gap-2">
              <span className={clsx(
                "text-2xl font-black tabular-nums",
                stat.highlight ? "text-white" : "text-white"
              )}>
                ${stat.value.toLocaleString()}
              </span>
              <span className={clsx(
                "text-[10px] font-bold uppercase",
                stat.highlight ? "text-white/50" : "text-zinc-600"
              )}>
                / يوم
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Control Panel */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-zinc-900/30 p-3 rounded-[2rem] border border-white/5">
          <div className="flex gap-2 p-1 bg-black/40 rounded-2xl">
            {[
              { id: 'guards', label: 'الحراس', icon: Shield, count: guards.length },
              { id: 'cars', label: 'السيارات', icon: Car, count: cars.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={clsx(
                  "px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3",
                  activeTab === tab.id 
                    ? "bg-zinc-800 text-white shadow-lg" 
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <tab.icon size={16} />
                {tab.label}
                <span className="ml-2 px-2 py-0.5 rounded-md bg-black/40 text-[10px]">{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 px-4">
            <div className="flex gap-1 p-1 bg-black/40 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={clsx("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-zinc-800 text-white" : "text-zinc-500")}
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={clsx("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-zinc-800 text-white" : "text-zinc-500")}
              >
                <List size={18} />
              </button>
            </div>
            
            {activeTab === 'guards' ? (
              <button
                onClick={handleQuickEquipAllGuards}
                disabled={isProcessing || guards.length === 0}
                className="flex items-center gap-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 hover:bg-yellow-500/20 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
              >
                <Zap size={14} />
                تجهيز سريع للكل
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRemoveAllCarsFromGuards}
                  disabled={isProcessing || cars.length === 0 || guards.length === 0}
                  className="flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  إزالة السيارات
                </button>
                <button
                  onClick={handleQuickAssignAllToCars}
                  disabled={isProcessing || cars.length === 0 || guards.length === 0}
                  className="flex items-center gap-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 hover:bg-yellow-500/20 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  <Zap size={14} />
                  توزيع سريع للحراس
                </button>
              </div>
            )}
          </div>
        </div>

        {activeTab === 'guards' ? (
          <div className={clsx(
            "grid gap-6",
            viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
          )}>
            {guards.map(guard => {
              const isUnpaid = guard.salaryPaidUntil < Date.now();
              const guardPower = calculateGuardPower(guard);
              return (
                <div key={guard.id} className="group relative bg-zinc-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-red-500/30 transition-all duration-500">
                  {/* Card Header/Image */}
                  <div className="relative h-64 overflow-hidden bg-zinc-950">
                    <img 
                      src={guard.isPlayer ? guard.image : PERMANENT_GUARD_IMAGE} 
                      alt={guard.name} 
                      referrerPolicy="no-referrer" 
                      className="w-full h-full object-cover opacity-60 group-hover:scale-110 group-hover:opacity-80 transition-all duration-700" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = PERMANENT_GUARD_IMAGE;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                    
                    {/* Floating Badges */}
                    <div className="absolute top-6 left-6 flex gap-2">
                      <img src={`https://flagcdn.com/w40/${guard.country}.png`} alt={guard.country} className="w-8 h-6 rounded-sm shadow-lg border border-white/10" />
                      {guard.isPlayer && (
                        <span className="px-2 py-1 bg-yellow-500 text-black text-[8px] font-black uppercase rounded-sm shadow-lg">Real Player</span>
                      )}
                    </div>

                    <div className="absolute top-6 right-6 flex flex-col gap-2">
                      <div className="px-3 py-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-2">
                        <Zap size={12} className="text-yellow-500" />
                        <span className="text-white font-black text-xs tabular-nums">{guardPower.toLocaleString()}</span>
                      </div>
                      <button
                        onClick={() => setDeleteConfirm(guard.id)}
                        disabled={isProcessing}
                        className="p-2 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/50 rounded-full backdrop-blur-md transition-all shadow-lg"
                        title="طرد الحارس"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {deleteConfirm === guard.id && (
                      <div className="absolute inset-0 z-20 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                        <p className="text-white font-black text-sm mb-4 uppercase tracking-tighter">هل أنت متأكد من طرد {guard.name}؟</p>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => handleDeleteGuard(guard.id)}
                            className="px-4 py-2 bg-red-600 text-white text-[10px] font-black uppercase rounded-lg"
                          >
                            نعم، طرد
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm(null)}
                            className="px-4 py-2 bg-zinc-800 text-white text-[10px] font-black uppercase rounded-lg"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                      <div>
                        <h3 className="text-2xl font-black text-white tracking-tight uppercase italic">{guard.name}</h3>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Elite Security Detail</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <Heart size={12} className={guard.health > 50 ? "text-emerald-500" : "text-red-500"} />
                          <span className={clsx("text-sm font-black tabular-nums", guard.health > 50 ? "text-emerald-500" : "text-red-500")}>
                            {guard.health}%
                          </span>
                        </div>
                        {guard.health < 100 && (
                          <button onClick={() => handleHealGuard(guard.id)} className="text-[9px] font-black text-red-500 uppercase hover:underline">Heal (25k)</button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-8 space-y-8">
                    {isUnpaid && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex justify-between items-center animate-pulse">
                        <div>
                          <p className="text-red-500 text-[10px] font-black uppercase tracking-widest">Salary Overdue</p>
                          <p className="text-white font-bold text-xs">${guard.isPlayer ? '50,000' : '10,000'}</p>
                        </div>
                        <button onClick={() => handlePaySalary(guard.id)} className="px-4 py-2 bg-red-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-red-500 transition-colors">
                          Pay Now
                        </button>
                      </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'القوة', key: 'strength', icon: Sword },
                        { label: 'التحمل', key: 'endurance', icon: Shield },
                        { label: 'السرعة', key: 'speed', icon: Zap },
                        { label: 'الصلابة', key: 'toughness', icon: Heart }
                      ].map(stat => (
                        <div key={stat.key} className="p-3 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between group/stat hover:border-white/10 transition-all">
                          <div className="flex items-center gap-3">
                            <stat.icon size={14} className="text-zinc-600 group-hover/stat:text-red-500 transition-colors" />
                            <div>
                              <p className="text-[9px] font-bold text-zinc-600 uppercase">{stat.label}</p>
                              <p className="text-sm font-black text-white tabular-nums">{(guard.stats as any)[stat.key]}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleTrainGuard(guard.id, stat.key as any)}
                            className="w-6 h-6 rounded-lg bg-white/5 hover:bg-red-500 hover:text-white text-zinc-500 flex items-center justify-center transition-all"
                          >
                            +
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Equipment Slots */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tactical Loadout</p>
                        <button
                          onClick={() => handleQuickEquipGuard(guard.id)}
                          className="text-[9px] font-black text-yellow-500 uppercase hover:underline flex items-center gap-1"
                        >
                          <Zap size={10} /> Quick Equip
                        </button>
                      </div>
                      <div className="flex justify-between gap-2">
                        {[
                          { type: 'weapon', icon: Crosshair, color: 'red' },
                          { type: 'armor', icon: Shield, color: 'blue' },
                          { type: 'phone', icon: Smartphone, color: 'green' },
                          { type: 'poison', icon: Syringe, color: 'purple' },
                          { type: 'stimulant', icon: Pill, color: 'yellow' }
                        ].map(slot => {
                          const itemId = (guard.equipped as any)[slot.type];
                          const isEquipped = !!itemId;
                          
                          // Get item name
                          let category = '';
                          if (slot.type === 'weapon') category = 'weapons';
                          else if (slot.type === 'armor') category = 'armor';
                          else if (slot.type === 'phone') category = 'phones';
                          else if (slot.type === 'stimulant') category = 'supplements';
                          else if (slot.type === 'poison') category = 'drugs';
                          
                          const item = [...((MARKET_ITEMS as any)[category] || []), ...customProducts.filter(p => p.category === category)].find(i => itemId === i.id || itemId?.startsWith(i.id + '_'));
                          const itemName = item?.name || (itemId ? itemId.split('_')[0] : '');

                          return (
                            <div key={slot.type} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                              <button
                                onClick={() => setEquipModal({ isOpen: true, type: slot.type as any, guardId: guard.id })}
                                className={clsx(
                                  "relative w-full aspect-square rounded-xl border transition-all flex items-center justify-center group/slot",
                                  isEquipped 
                                    ? `bg-${slot.color}-500/10 border-${slot.color}-500/40 text-${slot.color}-500` 
                                    : "bg-black/40 border-white/5 text-zinc-600 hover:border-white/20"
                                )}
                              >
                                <slot.icon size={20} className="group-hover/slot:scale-110 transition-transform" />
                                {isEquipped && (
                                  <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full bg-${slot.color}-500 shadow-[0_0_8px_rgba(0,0,0,0.5)]`} />
                                )}
                              </button>
                              <span className="text-[8px] font-bold text-zinc-500 truncate w-full text-center px-0.5">
                                {isEquipped ? itemName : ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={clsx(
            "grid gap-6",
            viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
          )}>
            {cars.map(car => {
              const baseCarItem = MARKET_ITEMS.cars.find(c => c.id === car.carItemId);
              const carItem = baseCarItem ? { ...baseCarItem, ...marketOverrides[baseCarItem.id] } : null;
              return (
                <div key={car.id} className="group relative bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-8 hover:border-blue-500/30 transition-all duration-500">
                  <div className="flex flex-col lg:flex-row gap-8 items-center">
                    <div className="relative w-full lg:w-48 h-48 bg-black rounded-[2rem] border border-white/5 flex items-center justify-center p-6 overflow-hidden shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
                      {carItem?.image && (
                        <img 
                          src={carItem.image} 
                          alt={carItem.name} 
                          referrerPolicy="no-referrer" 
                          className="relative z-10 max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-500" 
                        />
                      )}
                    </div>

                    <div className="flex-1 space-y-6 w-full">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">{carItem?.name || 'Armored Transport'}</h3>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Tactical Mobile Unit</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleRemoveCar(car.id)} 
                            disabled={isProcessing}
                            className="p-3 bg-red-600/10 text-red-500 rounded-2xl hover:bg-red-600/20 transition-all disabled:opacity-50"
                            title="إزالة السيارة وإعادتها للمخزن"
                          >
                            <Trash2 size={20} />
                          </button>
                          {car.assignedGuards.length > 0 && (
                            <button 
                              onClick={() => handleRemoveGuardsFromCar(car.id)} 
                              disabled={isProcessing}
                              className="p-3 bg-zinc-800 text-zinc-400 rounded-2xl hover:bg-zinc-700 hover:text-white transition-all disabled:opacity-50"
                              title="إزالة جميع الحراس من هذه السيارة"
                            >
                              <Users size={20} />
                            </button>
                          )}
                          {car.health < 100 && (
                            <button onClick={() => handleRepairCar(car.id)} className="p-3 bg-blue-600/10 text-blue-500 rounded-2xl hover:bg-blue-600/20 transition-all">
                              <Wrench size={20} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-zinc-500">Hull Integrity</span>
                          <span className={car.health > 50 ? "text-emerald-500" : "text-red-500"}>{car.health}%</span>
                        </div>
                        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                          <div 
                            className={clsx("h-full transition-all duration-1000", car.health > 50 ? "bg-emerald-500" : "bg-red-500")}
                            style={{ width: `${car.health}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {[...Array(4)].map((_, i) => {
                          const guardId = car.assignedGuards[i];
                          const guard = guards.find(g => g.id === guardId);
                          return (
                            <button
                              key={i}
                              onClick={() => !guard && setEquipModal({ isOpen: true, type: 'guard', carId: car.id })}
                              className={clsx(
                                "w-12 h-12 rounded-xl border transition-all flex items-center justify-center overflow-hidden group/seat",
                                guard ? "border-blue-500/40 bg-blue-500/10" : "border-white/5 bg-black/40 hover:border-white/20"
                              )}
                            >
                              {guard ? (
                                <img 
                                  src={guard.isPlayer ? guard.image : PERMANENT_GUARD_IMAGE} 
                                  alt={guard.name} 
                                  className="w-full h-full object-cover" 
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = PERMANENT_GUARD_IMAGE;
                                  }}
                                />
                              ) : (
                                <UserPlus size={16} className="text-zinc-700 group-hover/seat:text-zinc-400" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {equipModal?.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">
                {equipModal.type === 'car' ? 'Select Tactical Vehicle' : 
                 equipModal.type === 'guard' ? 'Deploy Operative' : 
                 equipModal.type === 'weapon' ? 'Select Armament' :
                 equipModal.type === 'armor' ? 'Select Ballistic Protection' :
                 equipModal.type === 'phone' ? 'Select Comms Device' :
                 equipModal.type === 'poison' ? 'Select Tactical Toxins' :
                 equipModal.type === 'stimulant' ? 'Select Performance Enhancer' :
                 'Select Inventory Item'}
              </h2>
              <button onClick={() => setEquipModal(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {(() => {
                let itemsToDisplay: any[] = [];
                if (equipModal.type === 'car') {
                  const staticCars = MARKET_ITEMS.cars.map(item => ({...item, ...marketOverrides[item.id]}));
                  const customCars = customProducts.filter(p => p.category === 'cars');
                  itemsToDisplay = [...staticCars, ...customCars].filter(item => (profile?.inventory?.cars?.[item.id] || 0) > 0);
                } else if (equipModal.type === 'guard') {
                  itemsToDisplay = guards.filter(g => !g.assignedCarId && g.id !== equipModal.guardId);
                } else {
                  let category = '';
                  if (equipModal.type === 'weapon') category = 'weapons';
                  else if (equipModal.type === 'armor') category = 'armor';
                  else if (equipModal.type === 'phone') category = 'phones';
                  else if (equipModal.type === 'stimulant') category = 'supplements';
                  else if (equipModal.type === 'poison') category = 'drugs';
                  
                  const staticItems = ((MARKET_ITEMS as any)[category] || []).map((item: any) => ({...item, ...marketOverrides[item.id]}));
                  const customItems = customProducts.filter(p => p.category === category);
                  const allPossibleItems = [...staticItems, ...customItems];
                  
                  const invCategory = (profile?.inventory as any)?.[category] || {};
                  const availableInInventory = Object.keys(invCategory).filter(id => invCategory[id] > 0);
                  
                  // For each item in inventory, find its base item definition
                  itemsToDisplay = availableInInventory.map(invId => {
                    const baseId = invId.split('_')[0];
                    const baseItem = allPossibleItems.find(i => i.id === baseId);
                    if (baseItem) {
                      return { ...baseItem, invId }; // Store the actual inventory ID
                    }
                    return null;
                  }).filter(Boolean);
                }

                if (itemsToDisplay.length === 0) {
                  return (
                    <div className="col-span-full text-center py-12 text-zinc-600 font-bold uppercase tracking-widest">
                      {equipModal.type === 'guard' ? 'No Operatives Available' : 'Insufficient Inventory Stock'}
                    </div>
                  );
                }

                if (equipModal.type === 'guard') {
                  return itemsToDisplay.map(guard => (
                    <button
                      key={guard.id}
                      onClick={() => {
                        if (equipModal.carId) {
                          handleAssignGuardToCar(guard.id, equipModal.carId);
                          setEquipModal(null);
                        }
                      }}
                      disabled={isProcessing}
                      className="bg-zinc-950 border border-white/5 rounded-2xl p-4 hover:border-blue-500/50 transition-all text-center group disabled:opacity-50"
                    >
                      <div className="h-24 flex items-center justify-center mb-3 overflow-hidden rounded-xl bg-zinc-900">
                        <img 
                          src={guard.isPlayer ? guard.image : PERMANENT_GUARD_IMAGE} 
                          alt={guard.name} 
                          referrerPolicy="no-referrer" 
                          className="h-full object-cover group-hover:scale-110 transition-transform" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = PERMANENT_GUARD_IMAGE;
                          }}
                        />
                      </div>
                      <div className="font-black text-white text-xs uppercase tracking-tight">{guard.name}</div>
                      <div className="text-[10px] text-zinc-500 mt-1 font-bold">HP: {guard.health}%</div>
                    </button>
                  ));
                }

                return itemsToDisplay.map(item => {
                  let category = '';
                  if (equipModal.type === 'car') category = 'cars';
                  else if (equipModal.type === 'weapon') category = 'weapons';
                  else if (equipModal.type === 'armor') category = 'armor';
                  else if (equipModal.type === 'phone') category = 'phones';
                  else if (equipModal.type === 'stimulant') category = 'supplements';
                  else if (equipModal.type === 'poison') category = 'drugs';

                  const invId = item.invId || item.id;
                  const count = (profile?.inventory as any)?.[category]?.[invId] || 0;
                  
                  return (
                    <button
                      key={invId}
                      onClick={() => handleManualEquip(invId)}
                      disabled={isProcessing}
                      className="bg-zinc-950 border border-white/5 rounded-2xl p-4 hover:border-red-500/50 transition-all text-center group disabled:opacity-50"
                    >
                      <div className="h-24 flex items-center justify-center mb-3 bg-zinc-900 rounded-xl p-2">
                        {item.image ? (
                          <img src={item.image} alt={item.name} referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform" />
                        ) : (
                          <div className="w-12 h-12 bg-zinc-800 rounded-full"></div>
                        )}
                      </div>
                      <div className="font-black text-white text-[10px] uppercase tracking-tight leading-tight">
                        {item.name}
                        {item.invId && item.invId.includes('_') && (
                          <span className="block text-[8px] text-zinc-500 mt-1">
                            {item.invId.split('_').slice(1).join(' ')}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-1 font-bold">STOCK: {count}</div>
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
