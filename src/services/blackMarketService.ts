import { 
  CommodityItem, 
  LiveAuctionItem, 
  FlashDeal, 
  MarketNewsItem, 
  AuctionBid 
} from '../types/blackMarketTypes';
import { UserProfile } from '../store/useAuthStore';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  onSnapshot, 
  runTransaction, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

export const INITIAL_COMMODITIES: CommodityItem[] = [
  {
    id: 'smuggled_gold',
    name: 'سبائك الذهب السويسري المهرب',
    nameEn: 'Swiss Smuggled Gold',
    category: 'gold',
    basePrice: 65000,
    currentPrice: 72400,
    changePercent: 11.4,
    trend: 'up',
    high24h: 74200,
    low24h: 63800,
    iconName: 'Coins',
    unit: 'أونصة 24k',
    description: 'سبائك ذهبية غير مدموغة مهربة عبر رحلات خاصة من جنيف ودبي، ملاذ آمن للسيولة.',
    marketSentiment: 'bullish',
    impactNews: 'إقبال شديد من كبار زعماء العائلات لتأمين أموالهم بعيداً عن الرقابة البنكية.'
  },
  {
    id: 'pure_cocaine',
    name: 'شحنات الكوكايين الكولومبي النقي',
    nameEn: 'Pure Colombian Cocaine',
    category: 'drugs',
    basePrice: 28000,
    currentPrice: 32500,
    changePercent: 16.1,
    trend: 'up',
    high24h: 33900,
    low24h: 27100,
    iconName: 'Skull',
    unit: 'كيلوغرام خام',
    description: 'مستوردة مباشرة عبر ممرات البحر المتوسط وموانئ البصرة السرية، نقاء 98%.',
    marketSentiment: 'bullish',
    impactNews: 'تشديد أمني مفاجئ على الموانئ أدى إلى قلة المعروض وارتفاع الأسعار بشكل قياسي.'
  },
  {
    id: 'heavy_weapons',
    name: 'شحنات أسلحة هجومية وقناصات ثقيلة',
    nameEn: 'Black Market Assault Arsenal',
    category: 'weapons',
    basePrice: 45000,
    currentPrice: 41200,
    changePercent: -8.4,
    trend: 'down',
    high24h: 46800,
    low24h: 40500,
    iconName: 'Crosshair',
    unit: 'صندوق تكتيكي مع ذخيرة',
    description: 'بنادق كلاشينكوف مطورة وقناصات كربونية ألمانية مهربة من مستودعات دولية.',
    marketSentiment: 'bearish',
    impactNews: 'وصول دفعة تسليح ضخمة من السوق الأوروبية خفضت تكلفة الشراء المباشر.'
  },
  {
    id: 'babylon_antiques',
    name: 'قطع أثرية ومخطوطات بابلية نادرة',
    nameEn: 'Ancient Babylon Artifacts',
    category: 'antiques',
    basePrice: 120000,
    currentPrice: 139500,
    changePercent: 16.2,
    trend: 'up',
    high24h: 145000,
    low24h: 118000,
    iconName: 'Landmark',
    unit: 'قطعة موثقة في السوق السوداء',
    description: 'تحف ومسكوكات تاريخية لا تقدر بثمن يطلبها الأثرياء وكبار مجمعي المقتنيات.',
    marketSentiment: 'bullish',
    impactNews: 'مزايدة سرية في باريس ترفع الطلب على القطع البابلية النادرة بنسبة قياسية.'
  },
  {
    id: 'military_chips',
    name: 'رقاقات تشفير إلكترونية وأجهزة تجسس',
    nameEn: 'Encrypted Military Microchips',
    category: 'electronics',
    basePrice: 18000,
    currentPrice: 16900,
    changePercent: -6.1,
    trend: 'down',
    high24h: 19500,
    low24h: 16400,
    iconName: 'Zap',
    unit: 'وحدة معالجة وتشفير عسكري',
    description: 'معالجات اختراق وتجاوز لأبراج الاتصالات وكاميرات المراقبة الحضرية.',
    marketSentiment: 'bearish',
    impactNews: 'تحديث بروتوكولات الأمن السيبراني للمدينة خفض الطلب على المعالجات القديمة.'
  },
  {
    id: 'luxury_armored_rides',
    name: 'سيارات دفع رباعي مصفحة B7 بدون لوحات',
    nameEn: 'Untraceable Armored B7 SUVs',
    category: 'luxury',
    basePrice: 220000,
    currentPrice: 248000,
    changePercent: 12.7,
    trend: 'up',
    high24h: 255000,
    low24h: 215000,
    iconName: 'Shield',
    unit: 'مركبة كاملة التجهيز',
    description: 'مركبات مصفحة ضد العبوات ورصاص القناص مع زجاج سميك وتجهيزات هروب سريعة.',
    marketSentiment: 'bullish',
    impactNews: 'ارتفاع وتيرة النزاعات بين المافيات يدفع الجميع لشراء سيارات الحماية القصوى.'
  }
];

export const INITIAL_AUCTIONS: LiveAuctionItem[] = [
  {
    id: 'auc_maybach_b7',
    title: 'مرسيدس مايباخ مصفحة B7 - نسخة الكارتل الذهبية',
    category: 'vehicles',
    rarity: 'mythic',
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=1000&auto=format&fit=crop',
    description: 'مركبة حراسة رئاسية مصفحة ضد القذائف ورصاص 7.62mm، نظام تنقية هواء مستقل، ومحرك V12 ثنائي التيربو معدل.',
    attributes: {
      defenseBonus: 3500,
      powerBonus: 1200,
      specialPerk: 'تخفيض ضرر الكمائن والاشتباكات بنسبة 40% وحصانة من القنص المباشر',
      prestigePoints: 500
    },
    startingBid: 1500000,
    currentBid: 2850000,
    highestBidderId: 'npc_wealthy_boss',
    highestBidderName: 'حجي باقر الخفاجي (زعيم الكرخ)',
    highestBidderPhoto: '/images/npcs/male_wealthy.jpg',
    sellerId: 'system_black_market',
    sellerName: 'السوق السوداء الدولية (كارتل الميناء)',
    sellerPhoto: '/images/npcs/male_godfather.jpg',
    minBidIncrement: 100000,
    endsAt: Date.now() + 1000 * 60 * 60 * 4 + 1000 * 60 * 32, // 4 hours 32 mins
    createdAt: Date.now() - 1000 * 60 * 120,
    bidHistory: [
      {
        bidderId: 'npc_godfather',
        bidderName: 'العراب أبو دريد',
        bidderPhoto: '/images/npcs/male_godfather.jpg',
        amount: 2500000,
        timestamp: Date.now() - 1000 * 60 * 50
      },
      {
        bidderId: 'npc_wealthy_boss',
        bidderName: 'حجي باقر الخفاجي (زعيم الكرخ)',
        bidderPhoto: '/images/npcs/male_wealthy.jpg',
        amount: 2850000,
        timestamp: Date.now() - 1000 * 60 * 12
      }
    ],
    status: 'active'
  },
  {
    id: 'auc_barrett_titanium',
    title: 'قناصة باريت عسكرية عيار .50 بكاتم صوت تيتانيوم',
    category: 'weapons',
    rarity: 'legendary',
    image: 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?q=80&w=1000&auto=format&fit=crop',
    description: 'سلاح اغتيال استراتيجي فتاك قادر على اختراق الدروع الثقيلة من مسافة 2000 متر بكاتم صوت مصنوع خصيصاً للقوات الخاصة.',
    attributes: {
      powerBonus: 4500,
      specialPerk: 'فرصة ضربة قاضية بنسبة 35% عند بدء المعركة وتجاوز دروع الخصم',
      prestigePoints: 350
    },
    startingBid: 900000,
    currentBid: 1650000,
    highestBidderId: 'npc_hitman_saif',
    highestBidderName: 'سيف القناص (صقر الظل)',
    highestBidderPhoto: '/images/npcs/male_street_fighter.jpg',
    sellerId: 'system_black_market',
    sellerName: 'مهرب الأسلحة الأوكراني',
    sellerPhoto: '/images/npcs/male_tactical.jpg',
    minBidIncrement: 50000,
    endsAt: Date.now() + 1000 * 60 * 60 * 2 + 1000 * 60 * 15, // 2 hours 15 mins
    createdAt: Date.now() - 1000 * 60 * 90,
    bidHistory: [
      {
        bidderId: 'npc_hitman_saif',
        bidderName: 'سيف القناص (صقر الظل)',
        bidderPhoto: '/images/npcs/male_street_fighter.jpg',
        amount: 1650000,
        timestamp: Date.now() - 1000 * 60 * 18
      }
    ],
    status: 'active'
  },
  {
    id: 'auc_diplomatic_passport',
    title: 'جواز سفر دبلوماسي حصري عابر لكافة المطارات',
    category: 'documents',
    rarity: 'epic',
    image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=1000&auto=format&fit=crop',
    description: 'وثيقة رسمية رفيعة المستوى صادرة بصفة ملحق تجاري، تعفيك من كافة عمليات التفتيش الجمركي في المطارات والمنافذ الدولية.',
    attributes: {
      defenseBonus: 1000,
      specialPerk: 'حصانة تامة 100% من مصادرة شحنات التهريب في المطارات وسفر فوري',
      prestigePoints: 250
    },
    startingBid: 600000,
    currentBid: 980000,
    highestBidderId: 'npc_smuggler_layan',
    highestBidderName: 'ليان مهربة الموانئ',
    highestBidderPhoto: '/images/npcs/female_business.jpg',
    sellerId: 'system_black_market',
    sellerName: 'وسيط القنصليات السري',
    sellerPhoto: '/images/npcs/male_boss.jpg',
    minBidIncrement: 30000,
    endsAt: Date.now() + 1000 * 60 * 60 * 6 + 1000 * 60 * 45, // 6 hours 45 mins
    createdAt: Date.now() - 1000 * 60 * 60,
    bidHistory: [
      {
        bidderId: 'npc_smuggler_layan',
        bidderName: 'ليان مهربة الموانئ',
        bidderPhoto: '/images/npcs/female_business.jpg',
        amount: 980000,
        timestamp: Date.now() - 1000 * 60 * 25
      }
    ],
    status: 'active'
  },
  {
    id: 'auc_radar_jammer',
    title: 'جهاز تشويش راداري عسكري محمول (Police Raid Jammer)',
    category: 'tech',
    rarity: 'legendary',
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1000&auto=format&fit=crop',
    description: 'حقيبة إلكترونية تكتيكية تعمل على تعطيل موجات اتصال دوريات النجدة والشرطة، وتمنع تحديد موقعك الجغرافي عند ارتكاب الجرائم.',
    attributes: {
      defenseBonus: 1800,
      specialPerk: 'تقليل احتمالية حدوث مداهمات الشرطة المفاجئة بنسبة 60% وتصفير الشبهات أسرع بمرتين',
      prestigePoints: 300
    },
    startingBid: 800000,
    currentBid: 1250000,
    highestBidderId: 'npc_hacker_rand',
    highestBidderName: 'رند القرصانة الإلكترونية',
    highestBidderPhoto: '/images/npcs/female_tactical.jpg',
    sellerId: 'system_black_market',
    sellerName: 'مهندس اتصالات الكارتل',
    sellerPhoto: '/images/npcs/male_wealthy.jpg',
    minBidIncrement: 50000,
    endsAt: Date.now() + 1000 * 60 * 60 * 3 + 1000 * 60 * 10,
    createdAt: Date.now() - 1000 * 60 * 40,
    bidHistory: [
      {
        bidderId: 'npc_hacker_rand',
        bidderName: 'رند القرصانة الإلكترونية',
        bidderPhoto: '/images/npcs/female_tactical.jpg',
        amount: 1250000,
        timestamp: Date.now() - 1000 * 60 * 15
      }
    ],
    status: 'active'
  }
];

export const INITIAL_FLASH_DEALS: FlashDeal[] = [
  {
    id: 'flash_1',
    title: 'شحنة ذخائر خارقة للدروع (Armor-Piercing Crate)',
    subtitle: '500 طلقة عيار 7.62x39mm مع خزن مضاعفة',
    category: 'ذخائر تكتيكية',
    image: 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?q=80&w=1000&auto=format&fit=crop',
    originalPrice: 150000,
    dealPrice: 85000,
    discountPercent: 43,
    stockRemaining: 4,
    expiresAt: Date.now() + 1000 * 60 * 45, // 45 mins
    rewardType: 'item',
    rewardId: 'ap_ammo_crate',
    description: 'تزيد من قوة الأسلحة النارية بنسبة 25% في أول 3 اشتباكات قادمة.'
  },
  {
    id: 'flash_2',
    title: 'حقيبة كود فك التشفير للبنك المركزي',
    subtitle: 'مفتاح رقمي لاختراق أنظمة تحويلات البنوك',
    category: 'أدوات سطو',
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1000&auto=format&fit=crop',
    originalPrice: 350000,
    dealPrice: 195000,
    discountPercent: 44,
    stockRemaining: 2,
    expiresAt: Date.now() + 1000 * 60 * 85, // 85 mins
    rewardType: 'item',
    rewardId: 'bank_master_exploit',
    description: 'تضاعف عوائد سرقة البنك القادمة وتمنحك 100% نسبة نجاح بدون إطلاق إنذار.'
  },
  {
    id: 'flash_3',
    title: 'طرد حقائب كاش سريانية سويسرية',
    subtitle: '1,000,000 كاش قذر مغسول جزئياً جاهز للإيداع',
    category: 'أموال وملاذات',
    image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=1000&auto=format&fit=crop',
    originalPrice: 750000,
    dealPrice: 420000,
    discountPercent: 44,
    stockRemaining: 3,
    expiresAt: Date.now() + 1000 * 60 * 120, // 2 hours
    rewardType: 'cash',
    rewardId: 'clean_dirty_bundle',
    description: 'حزمة كاش استثمارية فورية تمنحك 750,000 كاش نظيف و 250,000 كاش قذر فور الشراء.'
  }
];

export const MARKET_NEWS: MarketNewsItem[] = [
  {
    id: 'news_1',
    title: 'حملة تفتيش مفاجئة من مكافحة الجريمة المنظمة في الشورجة وعكد البتاوين، وأسعار الأسلحة والذخائر تشهد تحركات صعودية.',
    timeAgo: 'منذ 12 دقيقة',
    type: 'police',
    affectedCommodityId: 'heavy_weapons',
    impact: 'positive'
  },
  {
    id: 'news_2',
    title: 'دخول شحنة ذهب ضخمة غير مسجلة عبر طائرة خاصة بمطار دبي، والطلب على السبائك المشفرة يكسر حاجز الـ 70 ألف دولار.',
    timeAgo: 'منذ 38 دقيقة',
    type: 'cartel',
    affectedCommodityId: 'smuggled_gold',
    impact: 'positive'
  },
  {
    id: 'news_3',
    title: 'حرب شوارع دامية بين عصابات الكرخ تدفع كبار تجار المخدرات لرفع الأسعار لحماية خطوط الإمداد والتخزين.',
    timeAgo: 'منذ ساعة',
    type: 'cartel',
    affectedCommodityId: 'pure_cocaine',
    impact: 'positive'
  },
  {
    id: 'news_4',
    title: 'تسريب دفعة جديدة من معالجات الرقاقات الأوروبية يؤدي إلى ركود طفيف في أسعار وحدات التشفير العسكرية.',
    timeAgo: 'منذ ساعتين',
    type: 'economy',
    affectedCommodityId: 'military_chips',
    impact: 'negative'
  }
];

export class BlackMarketService {
  // حساب الأسعار الديناميكية مع تقلبات واقعية بناءً على التاريخ والتوقيت
  public static getDynamicCommodityPrices(): CommodityItem[] {
    const now = Date.now();
    // Period cycle of 15 minutes (900000 ms)
    const cycle = Math.floor(now / (1000 * 60 * 15));

    return INITIAL_COMMODITIES.map((c, index) => {
      // Deterministic pseudo-random seed per item and cycle
      const seed = Math.sin(cycle * 997 + index * 1013) * 10000;
      const variation = (seed - Math.floor(seed)) * 0.16 - 0.08; // -8% to +8%
      const currentPrice = Math.floor(c.basePrice * (1 + variation));
      const changePercent = Math.round(variation * 1000) / 10;
      const trend = changePercent > 0.5 ? 'up' : changePercent < -0.5 ? 'down' : 'stable';
      const high24h = Math.floor(c.basePrice * 1.15);
      const low24h = Math.floor(c.basePrice * 0.88);

      return {
        ...c,
        currentPrice,
        changePercent,
        trend,
        high24h,
        low24h
      };
    });
  }

  // المزايدة على عنصر في المزاد الحي
  public static async placeBid(
    auction: LiveAuctionItem, 
    bidAmount: number, 
    profile: UserProfile
  ): Promise<boolean> {
    if (!profile) {
      toast.error('يجب تسجيل الدخول أولاً للمزايدة');
      return false;
    }

    if (auction.status !== 'active' || auction.endsAt < Date.now()) {
      toast.error('هذا المزاد قد انتهى بالفعل!');
      return false;
    }

    const minRequiredBid = auction.currentBid + auction.minBidIncrement;
    if (bidAmount < minRequiredBid) {
      toast.error(`الحد الأدنى للمزايدة القادمة هو ${minRequiredBid.toLocaleString()} كاش!`);
      return false;
    }

    // Checking player cash (clean + dirty balance)
    const availableCash = (profile.cleanMoney || 0) + (profile.dirtyMoney || 0);
    if (availableCash < bidAmount) {
      toast.error(`ليس لديك رصيد كافٍ لإتمام المزايدة! تحتاج إلى ${bidAmount.toLocaleString()} كاش.`);
      return false;
    }

    try {
      const auctionRef = doc(db, 'auctions', auction.id);
      const userRef = doc(db, 'users', profile.uid);

      await runTransaction(db, async (transaction) => {
        const auctionSnap = await transaction.get(auctionRef);
        let currentAuctionData = auction;

        if (auctionSnap.exists()) {
          currentAuctionData = { ...auction, ...auctionSnap.data() };
        }

        if (bidAmount < (currentAuctionData.currentBid + currentAuctionData.minBidIncrement)) {
          throw new Error('تم تقديم مزايدة أعلى من قبل لاعب آخر في نفس اللحظة!');
        }

        // Deduct money from current bidder: prefer dirty money then clean money
        const currentDirty = profile.dirtyMoney || 0;
        let dirtyDeduction = Math.min(currentDirty, bidAmount);
        let cleanDeduction = bidAmount - dirtyDeduction;

        transaction.update(userRef, {
          dirtyMoney: increment(-dirtyDeduction),
          cleanMoney: increment(-cleanDeduction)
        });

        // Refund previous highest bidder if they were a real user
        if (currentAuctionData.highestBidderId && currentAuctionData.highestBidderId !== profile.uid && !currentAuctionData.highestBidderId.startsWith('npc_')) {
          const prevBidderRef = doc(db, 'users', currentAuctionData.highestBidderId);
          transaction.update(prevBidderRef, {
            cleanMoney: increment(currentAuctionData.currentBid)
          });
        }

        // Record new bid
        const newBid: AuctionBid = {
          bidderId: profile.uid,
          bidderName: profile.displayName || 'مزايد مجهول',
          bidderPhoto: profile.photoURL || undefined,
          amount: bidAmount,
          timestamp: Date.now()
        };

        const updatedBidHistory = [newBid, ...(currentAuctionData.bidHistory || [])].slice(0, 15);

        // Anti-snipe: if less than 2 minutes left, extend by 3 minutes
        let newEndsAt = currentAuctionData.endsAt;
        if (newEndsAt - Date.now() < 1000 * 60 * 2) {
          newEndsAt = Date.now() + 1000 * 60 * 3;
        }

        transaction.set(auctionRef, {
          ...currentAuctionData,
          currentBid: bidAmount,
          highestBidderId: profile.uid,
          highestBidderName: profile.displayName || 'مزايد مجهول',
          highestBidderPhoto: profile.photoURL || null,
          endsAt: newEndsAt,
          bidHistory: updatedBidHistory
        }, { merge: true });
      });

      toast.success(`تم تسجيل مزايدتك بنجاح بمبلغ ${bidAmount.toLocaleString()} كاش! أنت الآن المتصدر 🥇`);
      return true;
    } catch (error: any) {
      console.error('Bid error:', error);
      toast.error(error.message || 'فشل في تسجيل المزايدة');
      return false;
    }
  }

  // استلام غنائم المزاد الفائز
  public static async claimAuctionReward(auction: LiveAuctionItem, profile: UserProfile): Promise<boolean> {
    if (!profile) return false;
    if (auction.highestBidderId !== profile.uid) {
      toast.error('أنت لست الفائز بهذا المزاد!');
      return false;
    }
    if (auction.winnerClaimed) {
      toast.info('تم استلام غنائم هذا المزاد مسبقاً.');
      return false;
    }

    try {
      const userRef = doc(db, 'users', profile.uid);
      const auctionRef = doc(db, 'auctions', auction.id);

      const updates: any = {
        reputation: increment(auction.attributes?.prestigePoints || 250)
      };

      // Add to inventory based on category
      if (auction.category === 'vehicles') {
        updates[`inventory.cars.${auction.title}`] = 1;
      } else if (auction.category === 'weapons') {
        updates[`inventory.weapons.${auction.id}`] = 1;
      } else if (auction.category === 'documents') {
        updates['documents.diplomaticPassport'] = true;
      } else if (auction.category === 'tech') {
        updates[`inventory.tools.${auction.id}`] = 1;
      }

      await updateDoc(userRef, updates);
      await setDoc(auctionRef, { winnerClaimed: true, status: 'claimed' }, { merge: true });

      toast.success(`تم استلام غنائم المزاد "${auction.title}" وإضافتها إلى حسابك ومخزونك بنجاح! 🏆`);
      return true;
    } catch (e: any) {
      console.error(e);
      toast.error('حدث خطأ أثناء استلام الغنائم');
      return false;
    }
  }

  // شراء صفقة خاطفة فورية
  public static async buyFlashDeal(deal: FlashDeal, profile: UserProfile): Promise<boolean> {
    if (!profile) return false;
    const clean = profile.cleanMoney || 0;
    if (clean < deal.dealPrice) {
      toast.error(`تحتاج إلى ${deal.dealPrice.toLocaleString()} كاش نظيف لإتمام الصفقة!`);
      return false;
    }

    try {
      const userRef = doc(db, 'users', profile.uid);
      const updates: any = {
        cleanMoney: increment(-deal.dealPrice)
      };

      if (deal.rewardType === 'cash') {
        updates.cleanMoney = increment(-deal.dealPrice + 750000);
        updates.dirtyMoney = increment(250000);
      } else if (deal.rewardType === 'item') {
        updates[`inventory.tools.${deal.rewardId}`] = increment(1);
      }

      await updateDoc(userRef, updates);
      toast.success(`تم شراء صفقة "${deal.title}" بنجاح وتفعيل مزاياها! ⚡`);
      return true;
    } catch (e) {
      toast.error('فشل في إتمام الصفقة الخاطفة');
      return false;
    }
  }
}
