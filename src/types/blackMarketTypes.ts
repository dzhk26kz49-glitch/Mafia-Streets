export type CommodityCategory = 'weapons' | 'drugs' | 'gold' | 'electronics' | 'antiques' | 'luxury';

export interface CommodityItem {
  id: string;
  name: string;
  nameEn: string;
  category: CommodityCategory;
  basePrice: number;
  currentPrice: number;
  changePercent: number; // e.g. +14.5 or -8.2
  trend: 'up' | 'down' | 'stable';
  high24h: number;
  low24h: number;
  iconName: string;
  unit: string;
  description: string;
  marketSentiment: 'bullish' | 'bearish' | 'neutral';
  impactNews?: string;
}

export type AuctionRarity = 'rare' | 'epic' | 'legendary' | 'mythic';

export interface AuctionBid {
  bidderId: string;
  bidderName: string;
  bidderPhoto?: string;
  amount: number;
  timestamp: number;
}

export interface LiveAuctionItem {
  id: string;
  title: string;
  category: 'vehicles' | 'weapons' | 'documents' | 'tech' | 'luxury' | 'contraband';
  rarity: AuctionRarity;
  image: string;
  description: string;
  attributes: {
    powerBonus?: number;
    defenseBonus?: number;
    specialPerk?: string;
    prestigePoints?: number;
  };
  startingBid: number;
  currentBid: number;
  highestBidderId: string | null;
  highestBidderName: string | null;
  highestBidderPhoto: string | null;
  sellerId: string;
  sellerName: string;
  sellerPhoto?: string;
  minBidIncrement: number;
  endsAt: number; // timestamp ms
  createdAt: number;
  bidHistory: AuctionBid[];
  status: 'active' | 'ended' | 'claimed';
  winnerClaimed?: boolean;
}

export interface FlashDeal {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  image: string;
  originalPrice: number;
  dealPrice: number;
  discountPercent: number;
  stockRemaining: number;
  expiresAt: number;
  rewardType: 'item' | 'cash' | 'weapon' | 'car';
  rewardId: string;
  description: string;
}

export interface MarketNewsItem {
  id: string;
  title: string;
  timeAgo: string;
  type: 'police' | 'cartel' | 'economy' | 'rumor';
  affectedCommodityId?: string;
  impact: 'positive' | 'negative' | 'neutral';
}
