import React, { useEffect, useRef } from 'react';
import { Truck, UserRole } from '@/types/truck';
import { GEOFENCE_ZONES } from '@/data/geofences';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface FleetMapProps {
  trucks: Truck[];
  userRole: UserRole;
  clientName?: string;
}

// --- safe number helpers to avoid .toFixed on undefined ---
const n = (v: unknown, fallback = 0) =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const fmt = (v: unknown, digits = 0) => n(v).toFixed(digits);

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const FleetMap = ({ trucks, userRole, clientName }: FleetMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // layer refs
  const markersRef = useRef<Record<string, L.Marker>>({});
  const trailsRef = useRef<Record<string, L.Polyline>>({});
  const doneLinesRef = useRef<Record<string, L.Polyline>>({});
  const remainLinesRef = useRef<Record<string, L.Polyline>>({});
  const fallbackLinesRef = useRef<Record<string, L.Polyline>>({});
  const startMarkersRef = useRef<Record<string, L.Marker>>({});
  const endMarkersRef = useRef<Record<string, L.Marker>>({});
  const geofenceLayersRef = useRef<Record<string, L.Layer>>({});

  // init map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, { zoomControl: true }).setView([23.6, 58.4], 10);
    mapInstanceRef.current = map;

    // keep z-index low so app UI sits above
    const panes = map.getPanes();
    Object.values(panes).forEach((pane: any) => {
      if (pane?.style) pane.style.zIndex = '0';
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      zIndex: 0,
    }).addTo(map);

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // render everything on each update
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // clear previous layers safely
    Object.values(markersRef.current).forEach(m => m.remove());
    Object.values(trailsRef.current).forEach(p => p.remove());
    Object.values(doneLinesRef.current).forEach(p => p.remove());
    Object.values(remainLinesRef.current).forEach(p => p.remove());
    Object.values(fallbackLinesRef.current).forEach(p => p.remove());
    Object.values(startMarkersRef.current).forEach(m => m.remove());
    Object.values(endMarkersRef.current).forEach(m => m.remove());
    Object.values(geofenceLayersRef.current).forEach(l => l.remove());

    markersRef.current = {};
    trailsRef.current = {};
    doneLinesRef.current = {};
    remainLinesRef.current = {};
    fallbackLinesRef.current = {};
    startMarkersRef.current = {};
    endMarkersRef.current = {};
    geofenceLayersRef.current = {};

    // geofences (filter for client view)
    GEOFENCE_ZONES.forEach(zone => {
      if (userRole === 'client' && clientName && zone.clientName !== clientName) return;

      const color =
        zone.type === 'depot' ? '#22c55e' :
        zone.type === 'delivery' ? '#3b82f6' : '#ef4444';
      const fillColor =
        zone.type === 'depot' ? '#dcfce7' :
        zone.type === 'delivery' ? '#dbeafe' : '#fee2e2';

      let layer: L.Layer | undefined;
      if (zone.shape === 'circle' && zone.center && zone.radius) {
        layer = L.circle([zone.center.lat, zone.center.lng], {
          radius: zone.radius,
          color, fillColor, fillOpacity: 0.2, weight: 2,
        }).addTo(map).bindPopup(`
          <div>
            <h3 style="margin:0 0 4px 0;font-weight:bold;color:${color};">${zone.name}</h3>
            <p style="margin:0;color:#666;text-transform:capitalize;">${zone.type} Zone</p>
            ${zone.clientName ? `<p style="margin:4px 0 0 0;color:#666;">Client: ${zone.clientName}</p>` : ''}
          </div>
        `);
      } else if (zone.shape === 'polygon' && zone.polygon) {
        layer = L.polygon(zone.polygon.map(p => [p.lat, p.lng]), {
          color, fillColor, fillOpacity: 0.2, weight: 2,
        }).addTo(map).bindPopup(`
          <div>
            <h3 style="margin:0 0 4px 0;font-weight:bold;color:${color};">${zone.name}</h3>
            <p style="margin:0;color:#666;text-transform:capitalize;">${zone.type} Zone</p>
            ${zone.clientName ? `<p style="margin:4px 0 0 0;color:#666;">Client: ${zone.clientName}</p>` : ''}
          </div>
        `);
      }
      if (layer) geofenceLayersRef.current[zone.id] = layer;
    });

    // visible trucks by role
    const visibleTrucks =
      userRole === 'client' && clientName
        ? trucks.filter(t => t.client === clientName)
        : trucks;

    // collect points for safe fitBounds (no layer.getLatLng!)
    const boundsPts: [number, number][] = [];

    const getMarkerColor = (status: string) => {
      switch (status) {
        case 'delivering': return 'green';
        case 'assigned':   return 'orange';
        case 'idle':       return 'blue';
        case 'completed':  return 'gray';
        case 'uplifting':  return 'purple';
        default:           return 'red';
      }
    };

    visibleTrucks.forEach(truck => {
      const pos: [number, number] = [truck.position.lat, truck.position.lng];
      boundsPts.push(pos);

      // ---- truck marker
      const markerIcon = L.divIcon({
        html: `<div style="
          background-color:${getMarkerColor(truck.status)};
          width:20px;height:20px;border-radius:50%;
          border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
          font-size:10px;color:white;font-weight:bold;
        ">${truck.id.slice(-1)}</div>`,
        className: 'custom-div-icon',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const online = !!truck.telemetry?.online;
      const statusColor = online ? getMarkerColor(truck.status) : '#ef4444';
      const statusText = online ? truck.status : 'offline';

      const marker = L.marker([pos[0], pos[1]], { icon: markerIcon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width:280px;">
            <h3 style="margin:0 0 8px 0;font-weight:bold;color:#333;">${truck.name}</h3>
            <p style="margin:0 0 4px 0;color:#666;"><strong>Driver:</strong> ${truck.driver ?? '--'}</p>
            <div style="margin:4px 0;display:flex;align-items:center;gap:8px;">
              <strong>Status:</strong>
              <span style="background:${statusColor};color:white;padding:2px 8px;border-radius:12px;font-size:12px;">
                ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}
              </span>
            </div>
            <div style="margin:8px 0;display:flex;align-items:center;gap:12px;">
              <div style="display:flex;align-items:center;gap:4px;">
                <div style="width:40px;height:40px;position:relative;">
                  <svg width="40" height="40" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="35" fill="none" stroke="#e5e7eb" stroke-width="6"/>
                    <circle cx="50" cy="50" r="35" fill="none"
                      stroke="${n(truck.telemetry?.speed) > 80 ? '#ef4444' : n(truck.telemetry?.speed) > 50 ? '#f59e0b' : '#10b981'}"
                      stroke-width="6" stroke-dasharray="${2 * Math.PI * 35}"
                      stroke-dashoffset="${2 * Math.PI * 35 * (1 - Math.min(n(truck.telemetry?.speed)/120, 1))}"
                      transform="rotate(-90 50 50)" stroke-linecap="round"/>
                    <text x="50" y="55" text-anchor="middle" font-size="12" font-weight="bold" fill="#333">
                      ${fmt(truck.telemetry?.speed, 0)}
                    </text>
                  </svg>
                </div>
                <span style="font-size:12px;color:#666;">km/h</span>
              </div>
              <div style="display:flex;flex-direction:column;gap:2px;">
                <span style="font-size:12px;color:#666;">Heading: ${fmt(truck.telemetry?.heading, 0)}°</span>
                <span style="font-size:12px;color:#666;">Flow: ${fmt(truck.telemetry?.fuelFlow, 1)} L/min</span>
              </div>
            </div>
            <p style="margin:4px 0;color:#666;font-size:12px;"><strong>Position:</strong> ${truck.position.lat.toFixed(4)}, ${truck.position.lng.toFixed(4)}</p>
            <p style="margin:0 0 8px 0;color:#666;"><strong>Client:</strong> ${truck.client ?? '--'}</p>
            ${
              truck.destination && truck.startPoint
                ? `<p style="margin:0;color:#666;"><strong>Route:</strong> ${truck.startPoint.lat.toFixed(4)}, ${truck.startPoint.lng.toFixed(4)} → ${truck.destination.name}</p>`
                : truck.destination
                ? `<p style="margin:0;color:#666;"><strong>Destination:</strong> ${truck.destination.name}</p>`
                : ''
            }
            <div style="margin-top:8px;padding-top:8px;border-top:1px solid #eee;">
              <strong>Compartments:</strong><br>
              ${(truck.compartments ?? [])
                .map(c => `${c.id}: ${n(c.currentLevel).toFixed(0)}L ${c.fuelType ?? ''} ${c.isOffloading ? '(Draining)' : ''}`)
                .join('<br>')}
            </div>
          </div>
        `);

      markersRef.current[truck.id] = marker;

      // ---- trail
      if (truck.trail && truck.trail.length > 1) {
        const trailLatLngs = truck.trail.map(p => [p.lat, p.lng] as [number, number]);
        const trail = L.polyline(trailLatLngs, {
          color: getMarkerColor(truck.status),
          weight: 3,
          opacity: 0.6,
          dashArray: truck.status === 'delivering' ? '5,5' : undefined,
        }).addTo(map);
        trailsRef.current[truck.id] = trail;
        trailLatLngs.forEach(pt => boundsPts.push([pt[0], pt[1]]));
      }

      // ---- start/destination markers + route (OSRM progress if present)
      if (truck.destination) {
        boundsPts.push([truck.destination.lat, truck.destination.lng]);

        // end marker
        const destIcon = L.divIcon({
          html: `<div style="
            background-color:#ef4444;width:18px;height:18px;border-radius:50%;
            border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold;
          ">E</div>`,
          className: 'destination-icon',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        const endMarker = L.marker([truck.destination.lat, truck.destination.lng], { icon: destIcon })
          .addTo(map)
          .bindPopup(`
            <div>
              <h3 style="margin:0 0 4px 0;font-weight:bold;color:#333;">Destination</h3>
              <p style="margin:0;color:#666;">${truck.destination.name}</p>
              <p style="margin:4px 0 0 0;color:#666;font-size:12px;">
                ${truck.destination.lat.toFixed(4)}, ${truck.destination.lng.toFixed(4)}
              </p>
            </div>
          `);
        endMarkersRef.current[truck.id] = endMarker;
      }

      if (truck.startPoint) {
        boundsPts.push([truck.startPoint.lat, truck.startPoint.lng]);

        // start marker
        const startIcon = L.divIcon({
          html: `<div style="
            background-color:#22c55e;width:18px;height:18px;border-radius:50%;
            border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold;
          ">S</div>`,
          className: 'start-icon',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        const startMarker = L.marker([truck.startPoint.lat, truck.startPoint.lng], { icon: startIcon })
          .addTo(map)
          .bindPopup(`
            <div>
              <h3 style="margin:0 0 4px 0;font-weight:bold;color:#333;">Start Point</h3>
              <p style="margin:0;color:#666;">${truck.name}</p>
              <p style="margin:4px 0 0 0;color:#666;font-size:12px;">
                ${truck.startPoint.lat.toFixed(4)}, ${truck.startPoint.lng.toFixed(4)}
              </p>
            </div>
          `);
        startMarkersRef.current[truck.id] = startMarker;
      }

      // OSRM route progress: draw completed (green) + remaining (blue dashed)
      if (truck.routePlan?.coords?.length) {
        const coords = truck.routePlan.coords.map(p => [p.lat, p.lng] as [number, number]);
        coords.forEach(pt => boundsPts.push([pt[0], pt[1]]));

        const cursor = Math.max(0, Math.min(truck.routePlan.cursor ?? 0, coords.length - 1));

        if (cursor >= 1) {
          const done = coords.slice(0, cursor + 1);
          const doneLine = L.polyline(done, { color: '#10b981', weight: 4, opacity: 0.95 }).addTo(map);
          doneLinesRef.current[truck.id] = doneLine;
        }

        const remaining = coords.slice(cursor);
        if (remaining.length >= 2) {
          const remainLine = L.polyline(remaining, {
            color: '#2563eb', weight: 3, opacity: 0.85, dashArray: '6,6',
          }).addTo(map);
          remainLinesRef.current[truck.id] = remainLine;
        }
      } else if (truck.startPoint && truck.destination) {
        // fallback straight line while OSRM is missing
        const fb = L.polyline(
          [
            [truck.startPoint.lat, truck.startPoint.lng],
            [truck.destination.lat, truck.destination.lng],
          ],
          { color: '#6b7280', weight: 2, opacity: 0.7, dashArray: '10,5' }
        ).addTo(map);
        fallbackLinesRef.current[truck.id] = fb;

        boundsPts.push([truck.destination.lat, truck.destination.lng]);
      }
    });

    // ---- safe fit bounds using collected coordinates (no layer.getLatLng calls)
    if (boundsPts.length > 0) {
      if (boundsPts.length === 1) {
        map.setView(boundsPts[0], 14);
      } else {
        const bb = L.latLngBounds(boundsPts.map(p => L.latLng(p[0], p[1])));
        map.fitBounds(bb.pad(0.1));
      }
    }
  }, [trucks, userRole, clientName]);

  return (
    <div
      className="
        relative z-0 w-full h-full rounded-lg border border-border
        [&_.leaflet-pane]:!z-0 [&_.leaflet-top]:!z-0 [&_.leaflet-bottom]:!z-0
        [&_.leaflet-control]:!z-0 [&_.leaflet-popup-pane]:!z-0
      "
      style={{ minHeight: '300px' }}
    >
      <div ref={mapRef} className="absolute inset-0 rounded-lg" />
    </div>
  );
};

export default FleetMap;
