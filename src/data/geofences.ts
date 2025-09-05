export interface GeoZone {
  id: string;
  name: string;
  type: 'depot' | 'delivery' | 'danger';
  shape: 'polygon' | 'circle';
  polygon?: { lat: number; lng: number }[];
  center?: { lat: number; lng: number };
  radius?: number; // meters
  clientName?: string; // for delivery zones
}

// Muscat geofence zones for deterministic demo
export const GEOFENCE_ZONES: GeoZone[] = [
  // Depot Zone (Green)
  {
    id: 'mina-al-fahal-depot',
    name: 'Mina Al Fahal Depot',
    type: 'depot',
    shape: 'circle',
    center: { lat: 23.636389, lng: 58.508888 },
    radius: 300
  },

  // Delivery Zones (Blue)
  {
    id: 'qurum-station',
    name: 'Qurum Station A',
    type: 'delivery',
    shape: 'circle',
    center: { lat: 23.612703, lng: 58.498615 },
    radius: 250,
    clientName: 'Shell'
  },
  {
    id: 'khuwair-station',
    name: 'Al Khuwair Station B',
    type: 'delivery',
    shape: 'circle',
    center: { lat: 23.586549, lng: 58.431447 },
    radius: 250,
    clientName: 'BP'
  },
  {
    id: 'rusayl-station',
    name: 'Rusayl Industrial Estate Station C',
    type: 'delivery',
    shape: 'circle',
    center: { lat: 23.556700, lng: 58.203590 },
    radius: 300,
    clientName: 'Total'
  },

  // Danger Zones (Red)
  {
    id: 'port-sultan-qaboos',
    name: 'Port Sultan Qaboos Restricted Area',
    type: 'danger',
    shape: 'circle',
    center: { lat: 23.623500, lng: 58.567300 },
    radius: 250
  }
];

// Geometry helper functions
export const pointInPolygon = (lat: number, lng: number, polygon: { lat: number; lng: number }[]): boolean => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
};

export const haversineDistanceMeters = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;

  const a1 = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a1), Math.sqrt(1-a1));

  return R * c;
};

export const isInsideCircle = (
  lat: number,
  lng: number,
  center: { lat: number; lng: number },
  radiusMeters: number
): boolean => {
  return haversineDistanceMeters({ lat, lng }, center) <= radiusMeters;
};

export const distanceFromPointToSegmentMeters = (
  point: { lat: number; lng: number },
  segStart: { lat: number; lng: number },
  segEnd: { lat: number; lng: number }
): number => {
  const A = point.lat - segStart.lat;
  const B = point.lng - segStart.lng;
  const C = segEnd.lat - segStart.lat;
  const D = segEnd.lng - segStart.lng;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  
  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, yy;

  if (param < 0) {
    xx = segStart.lat;
    yy = segStart.lng;
  } else if (param > 1) {
    xx = segEnd.lat;
    yy = segEnd.lng;
  } else {
    xx = segStart.lat + param * C;
    yy = segStart.lng + param * D;
  }

  return haversineDistanceMeters(point, { lat: xx, lng: yy });
};

export const isInZone = (lat: number, lng: number, zone: GeoZone): boolean => {
  if (zone.shape === 'circle' && zone.center && zone.radius) {
    return isInsideCircle(lat, lng, zone.center, zone.radius);
  } else if (zone.shape === 'polygon' && zone.polygon) {
    return pointInPolygon(lat, lng, zone.polygon);
  }
  return false;
};