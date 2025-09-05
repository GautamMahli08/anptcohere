// Deterministic Muscat fuel delivery scenario
import { GEO_SEED, getCenter } from './geo_seeds';

export interface RouteStop {
  id: string;
  name: string;
  position: { lat: number; lng: number };
  client: string;
  compartmentTargets: Record<string, number>; // compartment id -> liters
}

export interface PlannedEvent {
  id: string;
  type: 'theft' | 'deviation' | 'offline';
  tickRange: [number, number]; // tick when event starts and ends
  description: string;
  data?: any;
}

// Fixed Muscat route: Mina Al Fahal → Qurum → Al Khuwair → Rusayl → Mina Al Fahal
export const MUSCAT_ROUTE: RouteStop[] = [
  {
    id: 'depot',
    name: getCenter('depot').name,
    position: { lat: getCenter('depot').lat, lng: getCenter('depot').lng },
    client: 'Depot',
    compartmentTargets: {}
  },
  {
    id: 'qurum-a',
    name: getCenter('qurum').name,
    position: { lat: getCenter('qurum').lat, lng: getCenter('qurum').lng },
    client: 'Shell',
    compartmentTargets: { C1: 3000 }
  },
  {
    id: 'khuwair-b',
    name: getCenter('khuwair').name,
    position: { lat: getCenter('khuwair').lat, lng: getCenter('khuwair').lng },
    client: 'BP',
    compartmentTargets: { C2: 2600 }
  },
  {
    id: 'rusayl-c',
    name: getCenter('rusayl').name,
    position: { lat: getCenter('rusayl').lat, lng: getCenter('rusayl').lng },
    client: 'Total',
    compartmentTargets: { C3: 2300, C4: 1800 }
  }
];

// Corridor waypoints for route compliance (smooth path through Muscat)
export const ROUTE_CORRIDOR = [
  { lat: 23.636389, lng: 58.508888 }, // Mina Al Fahal
  { lat: 23.630000, lng: 58.504000 }, // Towards Qurum
  { lat: 23.620000, lng: 58.500000 },
  { lat: 23.612703, lng: 58.498615 }, // Qurum
  { lat: 23.605000, lng: 58.480000 }, // Qurum to Al Khuwair
  { lat: 23.595000, lng: 58.460000 },
  { lat: 23.586549, lng: 58.431447 }, // Al Khuwair
  { lat: 23.580000, lng: 58.400000 }, // Al Khuwair to Rusayl
  { lat: 23.575000, lng: 58.350000 },
  { lat: 23.570000, lng: 58.300000 },
  { lat: 23.565000, lng: 58.250000 },
  { lat: 23.556700, lng: 58.203590 }, // Rusayl
  { lat: 23.570000, lng: 58.280000 }, // Return to Mina Al Fahal
  { lat: 23.585000, lng: 58.350000 },
  { lat: 23.600000, lng: 58.420000 },
  { lat: 23.620000, lng: 58.470000 },
  { lat: 23.636389, lng: 58.508888 }  // Back to Mina Al Fahal
];

// Planned events for deterministic demo
export const PLANNED_EVENTS: PlannedEvent[] = [
  {
    id: 'theft-c1',
    type: 'theft',
    tickRange: [25, 30], // During delivery at Qurum
    description: 'Fuel theft detected in C1 - 100L missing',
    data: { compartmentId: 'C1', lossLiters: 100, omrPerLiter: 0.23 }
  },
  {
    id: 'route-deviation',
    type: 'deviation',
    tickRange: [40, 45], // En route to Al Khuwair
    description: 'Route deviation detected - 350m off corridor',
    data: { deviationMeters: 350, location: { lat: 23.595000, lng: 58.465000 } }
  },
  {
    id: 'offline-blip',
    type: 'offline',
    tickRange: [85, 90], // During uplifting at depot
    description: 'Communication lost temporarily during uplifting',
    data: {}
  }
];

// Demo totals that MUST match across all roles
export const DEMO_TOTALS = {
  assignedLiters: 9700, // 3000 + 2600 + 2300 + 1800
  deliveredLiters: 9640, // 60L loss total
  lossLiters: 60,
  lossPercent: 0.62, // (60/9700) * 100
  savingsOMR: 9200, // Keep same demo value, currency can be OMR
  routeCompliancePercent: 96.8,
  uptimePercent: 94.5
};

// Seeded PRNG for consistent results
export class SeededRandom {
  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
}