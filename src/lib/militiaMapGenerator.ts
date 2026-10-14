import { MapZone } from '../types/militiaStrategy';

const ROWS = 5;
const COLS = 10;
const CENTER_LAT = 33.3152; // Baghdad
const CENTER_LNG = 44.3661;
const CELL_SIZE_LAT = 0.015;
const CELL_SIZE_LNG = 0.02;

const TERRAIN_TYPES: MapZone['terrain'][] = ['urban', 'desert', 'industrial'];

export function generateInitialZones(): MapZone[] {
  const zones: MapZone[] = [];
  
  const startLat = CENTER_LAT - (ROWS / 2) * CELL_SIZE_LAT;
  const startLng = CENTER_LNG - (COLS / 2) * CELL_SIZE_LNG;

  let idCounter = 1;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const lat1 = startLat + r * CELL_SIZE_LAT;
      const lng1 = startLng + c * CELL_SIZE_LNG;
      const lat2 = lat1 + CELL_SIZE_LAT;
      const lng2 = lng1 + CELL_SIZE_LNG;
      
      const centerLat = lat1 + CELL_SIZE_LAT / 2;
      const centerLng = lng1 + CELL_SIZE_LNG / 2;
      
      const terrain = TERRAIN_TYPES[Math.floor(Math.random() * TERRAIN_TYPES.length)];

      zones.push({
        id: `zone_${idCounter}`,
        name: `المنطقة ${idCounter}`,
        coordinates: [
          [lat1, lng1],
          [lat2, lng1],
          [lat2, lng2],
          [lat1, lng2]
        ],
        center: [centerLat, centerLng],
        owner_id: null,
        control_percentage: 0,
        status: 'neutral',
        terrain,
        resources: {
          oil: 10 + Math.floor(Math.random() * 50),
          gas: 10 + Math.floor(Math.random() * 50),
          corruption_money: Math.floor(Math.random() * 100),
          ammo: Math.floor(Math.random() * 50),
          water: Math.floor(Math.random() * 100),
          food: Math.floor(Math.random() * 100),
          medicine: Math.floor(Math.random() * 30),
          fuel: Math.floor(Math.random() * 50)
        },
        buildings: {
          oil_field: 0,
          gas_facility: 0,
          factory: 0,
          command_center: 0,
          comms_center: 0,
          defenses: 0
        },
        armies: {
          regulars: 0,
          special_forces: 0,
          vehicles: 0
        }
      });
      
      idCounter++;
    }
  }
  
  return zones;
}
