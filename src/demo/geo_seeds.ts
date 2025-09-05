// Muscat geographical seed data for deterministic demo
export interface GeoCenter {
  lat: number;
  lng: number;
  name: string;
}

export interface GeoZone {
  type: 'circle';
  role: 'depot' | 'delivery' | 'danger';
  centerKey: string;
  radius_m: number;
  color: 'green' | 'blue' | 'red';
}

export interface GeoWaypoint {
  key: string;
}

export interface GeoCorridor {
  width_m: number;
  dashed: boolean;
}

export const GEO_SEED = {
  centers: {
    depot: { 
      lat: 23.636389, 
      lng: 58.508888, 
      name: "Mina Al Fahal (Depot)" 
    },
    qurum: { 
      lat: 23.612703, 
      lng: 58.498615, 
      name: "Qurum (Station A)" 
    },
    khuwair: { 
      lat: 23.586549, 
      lng: 58.431447, 
      name: "Al Khuwair (Station B)" 
    },
    rusayl: { 
      lat: 23.556700, 
      lng: 58.203590, 
      name: "Rusayl Industrial Estate (Station C)" 
    },
    danger: { 
      lat: 23.623500, 
      lng: 58.567300, 
      name: "Port Sultan Qaboos (Demo Danger Zone)" 
    }
  } as Record<string, GeoCenter>,
  
  zones: [
    { type: "circle" as const, role: "depot" as const, centerKey: "depot", radius_m: 300, color: "green" as const },
    { type: "circle" as const, role: "delivery" as const, centerKey: "qurum", radius_m: 250, color: "blue" as const },
    { type: "circle" as const, role: "delivery" as const, centerKey: "khuwair", radius_m: 250, color: "blue" as const },
    { type: "circle" as const, role: "delivery" as const, centerKey: "rusayl", radius_m: 300, color: "blue" as const },
    { type: "circle" as const, role: "danger" as const, centerKey: "danger", radius_m: 250, color: "red" as const }
  ] as GeoZone[],
  
  waypoints: [
    { key: "depot" }, 
    { key: "qurum" }, 
    { key: "khuwair" }, 
    { key: "rusayl" }, 
    { key: "depot" }
  ] as GeoWaypoint[],
  
  corridor: { 
    width_m: 400, 
    dashed: true 
  } as GeoCorridor
};

// Helper function to get center by key
export const getCenter = (key: string): GeoCenter => {
  const center = GEO_SEED.centers[key];
  if (!center) {
    throw new Error(`Unknown center key: ${key}`);
  }
  return center;
};

// Muscat map center point
export const MUSCAT_CENTER = { lat: 23.6, lng: 58.4 };