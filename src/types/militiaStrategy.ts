export interface MapZone {
  id: string;
  name: string;
  coordinates: [number, number][]; // Polygon coordinates
  center: [number, number];
  owner_id: string | null; // null means neutral
  control_percentage: number; // 0 to 100
  status: 'neutral' | 'combat' | 'occupied';
  terrain: 'urban' | 'desert' | 'industrial';
  
  resources: {
    oil: number;
    gas: number;
    corruption_money: number;
    ammo: number;
    water: number;
    food: number;
    medicine: number;
    fuel: number;
  };
  
  buildings: {
    oil_field: number; // level
    gas_facility: number;
    factory: number;
    command_center: number;
    comms_center: number;
    defenses: number;
  };
  
  armies: {
    regulars: number;
    special_forces: number;
    vehicles: number;
  };
}

export interface ZoneBattleEvent {
  id: string;
  zone_id: string;
  attacker_id: string;
  defender_id: string | null;
  start_time: number;
  last_update: number;
  attacker_forces: {
    regulars: number;
    special_forces: number;
    vehicles: number;
  };
  status: 'ongoing' | 'resolved';
}

export interface DroneTask {
  id: string;
  zone_id: string;
  owner_id: string;
  type: 'recon' | 'attack';
  start_time: number;
  duration_ms: number;
  result: any | null;
}
