export interface DistrictTurf {
  id: string;
  name: string;
  nameEn: string;
  subtitle: string;
  description: string;
  image: string;
  controllerName: string;
  controllerId: string;
  controllerType: 'player' | 'gang' | 'npc_syndicate';
  controlPercent: number; // 0 to 100
  dailyRevenue: number;
  accumulatedTax: number;
  lastTaxCollected: number;
  defensePower: number;
  garrisonCount: number;
  fortificationLevel: number;
  businessesCount: number;
  districtPerk: string;
  color: string;
  accentColor: string;
  status: 'peace' | 'contested' | 'under_attack';
}

export interface TurfWarLog {
  id: string;
  districtId: string;
  districtName: string;
  attackerId: string;
  attackerName: string;
  defenderName: string;
  result: 'win' | 'loss';
  lootStolen: number;
  controlChange: number;
  timestamp: number;
}
