import { useState, useEffect, useCallback, useRef } from 'react';
import { Truck, Alert, FuelLossHistory, RoutePlan } from '@/types/truck';

// ===== Oman guard =====
const OMAN_BOUNDS = { minLat: 16.6, maxLat: 26.6, minLng: 52.0, maxLng: 60.0 };
const inOman = (p: { lat: number; lng: number }) =>
  p.lat >= OMAN_BOUNDS.minLat && p.lat <= OMAN_BOUNDS.maxLat &&
  p.lng >= OMAN_BOUNDS.minLng && p.lng <= OMAN_BOUNDS.maxLng;

const TOTAL_FUEL_HUB_RUWI = { lat: 23.5880, lng: 58.4070, name: 'Total Fuel Hub – Ruwi' };
const TOO_FAR_KM = 700; // sanity cap for single trip inside Oman

// ===== Demo trucks (Oman / Muscat) =====
const DEMO_TRUCKS: Omit<Truck, 'telemetry' | 'alerts' | 'trail'>[] = [
  {
    id: 'TK001',
    name: 'Fuel Express 01',
    driver: 'John Smith',
    status: 'idle',
    client: 'Shell Station',
    position: { lat: 23.636389, lng: 58.508888 }, // Mina Al Fahal Depot
    compartments: [
      { id: 'C1', capacity: 5000, currentLevel: 4800, fuelType: 'Diesel', isOffloading: false },
      { id: 'C2', capacity: 5000, currentLevel: 4500, fuelType: 'Petrol', isOffloading: false },
      { id: 'C3', capacity: 5000, currentLevel: 3200, fuelType: 'Diesel', isOffloading: false },
      { id: 'C4', capacity: 5000, currentLevel: 2800, fuelType: 'Petrol', isOffloading: false },
    ],
  },
  {
    id: 'TK002',
    name: 'Fuel Express 02',
    driver: 'Sarah Johnson',
    status: 'delivering',
    client: 'BP Station',
    position: { lat: 23.6200, lng: 58.5400 }, // Qurum-ish
    destination: { lat: 23.6165, lng: 58.5922, name: 'Mutrah Souq' },
    compartments: [
      { id: 'C1', capacity: 5000, currentLevel: 4200, fuelType: 'Diesel', isOffloading: true, targetDelivery: 2000 },
      { id: 'C2', capacity: 5000, currentLevel: 3800, fuelType: 'Petrol', isOffloading: false },
      { id: 'C3', capacity: 5000, currentLevel: 4600, fuelType: 'Diesel', isOffloading: false },
      { id: 'C4', capacity: 5000, currentLevel: 3400, fuelType: 'Petrol', isOffloading: false },
    ],
  },
  {
    id: 'TK003',
    name: 'Fuel Express 03',
    driver: 'Mike Wilson',
    status: 'assigned',
    client: 'Shell Station',
    position: { lat: 23.5850, lng: 58.3800 }, // Seeb-ish
    destination: { lat: 23.5933, lng: 58.2844, name: 'Muscat International Airport' },
    compartments: [
      { id: 'C1', capacity: 5000, currentLevel: 5000, fuelType: 'Diesel', isOffloading: false },
      { id: 'C2', capacity: 5000, currentLevel: 5000, fuelType: 'Petrol', isOffloading: false },
      { id: 'C3', capacity: 5000, currentLevel: 4800, fuelType: 'Diesel', isOffloading: false },
      { id: 'C4', capacity: 5000, currentLevel: 4900, fuelType: 'Petrol', isOffloading: false },
    ],
  },
  {
    id: 'TK004',
    name: 'Fuel Express 04',
    driver: 'Lisa Brown',
    status: 'completed',
    client: 'Total Station',
    position: { lat: 23.5600, lng: 58.4200 }, // Ruwi-ish
    compartments: [
      { id: 'C1', capacity: 5000, currentLevel: 500, fuelType: 'Diesel', isOffloading: false },
      { id: 'C2', capacity: 5000, currentLevel: 300, fuelType: 'Petrol', isOffloading: false },
      { id: 'C3', capacity: 5000, currentLevel: 800, fuelType: 'Diesel', isOffloading: false },
      { id: 'C4', capacity: 5000, currentLevel: 200, fuelType: 'Petrol', isOffloading: false },
    ],
  },
  {
    id: 'TK005',
    name: 'Fuel Express 05',
    driver: 'David Garcia',
    status: 'uplifting',
    client: 'Mobil Station',
    position: { lat: 23.6500, lng: 58.5200 }, // North Muscat
    compartments: [
      { id: 'C1', capacity: 5000, currentLevel: 3200, fuelType: 'Diesel', isOffloading: false },
      { id: 'C2', capacity: 5000, currentLevel: 2800, fuelType: 'Petrol', isOffloading: false },
      { id: 'C3', capacity: 5000, currentLevel: 3600, fuelType: 'Diesel', isOffloading: false },
      { id: 'C4', capacity: 5000, currentLevel: 3100, fuelType: 'Petrol', isOffloading: false },
    ],
  },
];

// ===== Math helpers for movement + routing =====
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;
const R = 6371; // km

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function bearing(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lng - a.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function stepFrom(a: { lat: number; lng: number }, brgDeg: number, dKm: number) {
  const δ = dKm / R;
  const θ = toRad(brgDeg);
  const φ1 = toRad(a.lat);
  const λ1 = toRad(a.lng);
  const sinφ1 = Math.sin(φ1), cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ), cosδ = Math.cos(δ);
  const sinθ = Math.sin(θ), cosθ = Math.cos(θ);
  const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * cosθ;
  const φ2 = Math.asin(sinφ2);
  const y = sinθ * sinδ * cosφ1;
  const x = cosδ - sinφ1 * sinφ2;
  const λ2 = λ1 + Math.atan2(y, x);
  return { lat: toDeg(φ2), lng: ((toDeg(λ2) + 540) % 360) - 180 };
}

// ===== Hook =====
export const useTruckSimulation = () => {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [totalSavings, setTotalSavings] = useState(847562);
  const [fuelConsumptionData, setFuelConsumptionData] = useState<
    Array<{ timestamp: Date; truckId: string; liters: number }>
  >([]);
  const [fuelLossHistory, setFuelLossHistory] = useState<FuelLossHistory[]>([]);

  const lastTsRef = useRef<number>(Date.now());
  const trucksRef = useRef<Truck[]>([]);

  useEffect(() => { trucksRef.current = trucks; }, [trucks]);

  // Initialize trucks (Oman)
  useEffect(() => {
    const initializedTrucks: Truck[] = DEMO_TRUCKS.map(truck => ({
      ...truck,
      telemetry: {
        speed: Math.random() * 60 + 20,
        fuelFlow: truck.status === 'delivering' ? Math.random() * 50 + 10 : 0,
        tilt: Math.random() * 5,
        valveStatus: truck.status === 'delivering',
        online: Math.random() > 0.1,
        lastUpdate: new Date(),
        heading: Math.random() * 360,
      },
      logs: [],
      alerts: [],
      trail: [{ ...truck.position, timestamp: new Date() }],
    }));
    trucksRef.current = initializedTrucks;
    setTrucks(initializedTrucks);
  }, []);

  // Movement / telemetry
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const dtMs = now - lastTsRef.current;
      lastTsRef.current = now;

      setTrucks(prevTrucks => prevTrucks.map(truck => {
        let t = { ...truck };
        const tele = t.telemetry;

        // 1) Follow OSRM route
        if (t.routePlan && t.destination) {
          const { coords } = t.routePlan;
          if (coords.length >= 2) {
            let { cursor, segProgressKm } = t.routePlan;
            let pos = { ...t.position };
            const speedKph = clamp((tele.speed || 45) + (Math.random() - 0.5) * 6, 30, 65);
            let remainingStepKm = (speedKph * dtMs) / 3_600_000;

            while (remainingStepKm > 0 && cursor < coords.length - 1) {
              const A = coords[cursor];
              const B = coords[cursor + 1];
              const segLenKm = haversine(A, B);
              const remainOnSeg = Math.max(0, segLenKm - segProgressKm);

              if (remainingStepKm < remainOnSeg) {
                const brg = bearing(A, B);
                pos = stepFrom(A, brg, segProgressKm + remainingStepKm);
                segProgressKm += remainingStepKm;
                remainingStepKm = 0;
              } else {
                remainingStepKm -= remainOnSeg;
                cursor += 1;
                segProgressKm = 0;
                pos = { ...B };
              }
            }

            const distToEnd = haversine(pos, coords[coords.length - 1]);
            if (distToEnd < 0.15) {
              t = {
                ...t,
                position: coords[coords.length - 1],
                routePlan: undefined,
                startPoint: undefined,
                destination: undefined,
                status: 'completed',
                telemetry: { ...tele, speed: 0, fuelFlow: 0, valveStatus: false, lastUpdate: new Date() },
                logs: [...(t.logs ?? []).slice(-40), { id: `log-arrive-${now}`, ts: new Date(), msg: `Arrived at destination` }],
                trail: [...(t.trail ?? []), { ...coords[coords.length - 1], timestamp: new Date() }].slice(-200),
              };
            } else {
              const nextIdx = Math.min(cursor + 1, coords.length - 1);
              const brg = bearing(pos, coords[nextIdx]);
              t = {
                ...t,
                status: t.status === 'assigned' ? 'delivering' : t.status,
                position: pos,
                routePlan: { ...t.routePlan, cursor, segProgressKm },
                telemetry: {
                  ...tele,
                  speed: speedKph,
                  heading: brg,
                  fuelFlow: t.compartments.some(c => c.isOffloading) ? (tele.fuelFlow || 10) : 0,
                  valveStatus: t.compartments.some(c => c.isOffloading),
                  lastUpdate: new Date(),
                },
                trail: [...(t.trail ?? []), { ...pos, timestamp: new Date() }].slice(-200),
              };
            }
          }
        }
        // 2) Straight-line fallback if destination but no route
        else if (!t.routePlan && t.destination) {
          const brg = bearing(t.position, t.destination);
          const speedKph = clamp((tele.speed || 45) + (Math.random() - 0.5) * 4, 30, 60);
          const stepKm = (speedKph * dtMs) / 3_600_000;
          const nextPos = stepFrom(t.position, brg, stepKm);
          const distToEnd = haversine(nextPos, t.destination);

          if (distToEnd < 0.15) {
            t = {
              ...t,
              position: t.destination,
              startPoint: undefined,
              destination: undefined,
              status: 'completed',
              telemetry: { ...tele, speed: 0, fuelFlow: 0, valveStatus: false, lastUpdate: new Date(), heading: brg },
              logs: [...(t.logs ?? []).slice(-40), { id: `log-arrive-${now}`, ts: new Date(), msg: `Arrived at destination` }],
              trail: [...(t.trail ?? []), { ...t.destination, timestamp: new Date() }].slice(-200),
            };
          } else {
            t = {
              ...t,
              status: t.status === 'assigned' ? 'delivering' : t.status,
              position: nextPos,
              telemetry: {
                ...tele,
                speed: speedKph,
                heading: brg,
                fuelFlow: t.compartments.some(c => c.isOffloading) ? (tele.fuelFlow || 10) : 0,
                valveStatus: t.compartments.some(c => c.isOffloading),
                lastUpdate: new Date(),
              },
              trail: [...(t.trail ?? []), { ...nextPos, timestamp: new Date() }].slice(-200),
            };
          }
        }
        // 3) Idle drift
        else {
          const driftHeading = (tele.heading + (Math.random() - 0.5) * 40 + 360) % 360;
          const driftSpeed = clamp((tele.speed || 10) + (Math.random() - 0.5) * 12, 3, 22);
          const stepKm = (driftSpeed * dtMs) / 3_600_000;
          const nextPos = stepFrom(t.position, driftHeading, stepKm);

          t = {
            ...t,
            position: nextPos,
            telemetry: {
              ...tele,
              speed: driftSpeed,
              heading: driftHeading,
              fuelFlow: 0,
              tilt: Math.max(0, (tele.tilt || 0) + (Math.random() - 0.5) * 2),
              lastUpdate: new Date(),
            },
            trail: [...(t.trail ?? []), { ...nextPos, timestamp: new Date() }].slice(-200),
          };
        }

        // Status-driven side effects
        if (t.status === 'assigned') {
          t.status = 'delivering';
          const totalAssigned = Math.floor(Math.random() * 2500) + 2500;
          let remainingToAssign = totalAssigned;
          const perCompTargets: Record<string, number> = {};

          t.compartments = t.compartments.map(comp => {
            if (remainingToAssign > 0 && comp.currentLevel > comp.capacity * 0.1) {
              const maxFromThisComp = Math.min(remainingToAssign, comp.currentLevel - comp.capacity * 0.05);
              const assignedAmount = Math.min(maxFromThisComp, Math.floor(Math.random() * 1500) + 500);
              remainingToAssign -= assignedAmount;
              perCompTargets[comp.id] = assignedAmount;

              return { ...comp, targetDelivery: assignedAmount, deliveredLiters: 0, isOffloading: assignedAmount > 0, deliveryLog: [] };
            }
            perCompTargets[comp.id] = 0;
            return { ...comp, targetDelivery: 0, deliveredLiters: 0, isOffloading: false };
          });

          t.currentAssignment = { assignedLiters: totalAssigned, startedAt: new Date(), perCompTargets, provisionalLossLiters: 0 };
          const assignedComps = t.compartments.filter(c => c.isOffloading);
          const assignmentSummary = assignedComps.map(c => `${c.id} ${c.targetDelivery}L`).join(', ');
          t.logs = [...(t.logs || []).slice(-40), { id: `log-${now}`, ts: new Date(), msg: `Assigned: ${assignmentSummary} → ${t.destination?.name ?? ''}` }];
        }

        if (t.status === 'delivering') {
          let totalDrained = 0;
          t.compartments = t.compartments.map(comp => {
            if (comp.isOffloading && comp.currentLevel > 0 && (comp.deliveredLiters || 0) < (comp.targetDelivery || 0)) {
              const drainRate = Math.floor(Math.random() * 40) + 20;
              const remaining = (comp.targetDelivery || 0) - (comp.deliveredLiters || 0);
              const reserve = comp.capacity * 0.05;
              const maxDrain = Math.min(drainRate, remaining, comp.currentLevel - reserve);

              if (maxDrain > 0) {
                const newLevel = comp.currentLevel - maxDrain;
                const newDelivered = (comp.deliveredLiters || 0) + maxDrain;
                totalDrained += maxDrain;

                if (newDelivered >= (comp.targetDelivery || 0) || newLevel <= reserve) {
                  let compLossLiters = 0;
                  if (Math.random() < 0.3) {
                    const lossPercent = Math.random() * 2 + 0.5;
                    compLossLiters = Math.round((comp.targetDelivery || 0) * lossPercent / 100);
                    if (t.currentAssignment) t.currentAssignment.provisionalLossLiters += compLossLiters;

                    if (compLossLiters > 10 || lossPercent > 1) {
                      const lossAlert: Alert = {
                        id: `alert-${Date.now()}-comp-loss`,
                        type: 'loss',
                        severity: lossPercent > 2 ? 'medium' : 'low',
                        message: `Compartment ${comp.id} loss: ${compLossLiters}L (${lossPercent.toFixed(1)}%) on ${t.name}`,
                        timestamp: new Date(),
                        truckId: t.id,
                        acknowledged: false,
                        location: t.position
                      };
                      setAlerts(prev => [lossAlert, ...prev.slice(0, 49)]);
                    }
                  }

                  const deliveryLog = [
                    ...(comp.deliveryLog || []).slice(-10),
                    { id: `del-${Date.now()}-${comp.id}`, ts: new Date(), msg: compLossLiters > 0 ? `${comp.id} delivered ${Math.round(newDelivered)}L (Loss: ${compLossLiters}L)` : `${comp.id} delivered ${Math.round(newDelivered)}L` }
                  ];
                  t.logs = [...(t.logs || []).slice(-40), deliveryLog[deliveryLog.length - 1]];
                  return { ...comp, currentLevel: newLevel, deliveredLiters: newDelivered, isOffloading: false, deliveryLog };
                }

                return { ...comp, currentLevel: newLevel, deliveredLiters: newDelivered };
              }
            }
            return comp;
          });

          if (Math.random() < 0.005) {
            const activeComps = t.compartments.filter(c => c.isOffloading);
            if (activeComps.length > 0) {
              const victimComp = activeComps[Math.floor(Math.random() * activeComps.length)];
              const stolenAmount = Math.floor(Math.random() * 100) + 50;
              t.compartments = t.compartments.map(comp => comp.id === victimComp.id ? { ...comp, currentLevel: Math.max(0, comp.currentLevel - stolenAmount) } : comp);
              const newAlert: Alert = { id: `alert-${Date.now()}-theft`, type: 'theft', severity: 'high', message: `Sudden drop ${victimComp.id} −${stolenAmount}L (possible theft)`, timestamp: new Date(), truckId: t.id, acknowledged: false, location: t.position };
              setAlerts(prev => [newAlert, ...prev.slice(0, 49)]);
              t.logs = [...(t.logs || []).slice(-40), { id: `log-${Date.now()}-theft`, ts: new Date(), msg: `Sudden drop ${victimComp.id} −${stolenAmount}L (possible theft)` }];
            }
          }

          if (Math.random() < 0.003) {
            t.telemetry.valveStatus = false;
            const newAlert: Alert = { id: `alert-${Date.now()}-valve`, type: 'valve', severity: 'medium', message: `Valve fault detected on ${t.name}`, timestamp: new Date(), truckId: t.id, acknowledged: false, location: t.position };
            setAlerts(prev => [newAlert, ...prev.slice(0, 49)]);
            t.logs = [...(t.logs || []).slice(-40), { id: `log-${Date.now()}-valve`, ts: new Date(), msg: 'Valve tampering detected' }];
          }

          if (Math.random() < 0.002) {
            t.telemetry.tilt = Math.random() * 5 + 10;
            const newAlert: Alert = { id: `alert-${Date.now()}-tilt`, type: 'tilt', severity: 'medium', message: `Excessive tilt detected on ${t.name}`, timestamp: new Date(), truckId: t.id, acknowledged: false, location: t.position };
            setAlerts(prev => [newAlert, ...prev.slice(0, 49)]);
            t.logs = [...(t.logs || []).slice(-40), { id: `log-${Date.now()}-tilt`, ts: new Date(), msg: `Excessive tilt: ${t.telemetry.tilt.toFixed(1)}°` }];
          }

          t.telemetry.fuelFlow = totalDrained;
        }

        if (t.status === 'completed') {
          t.status = 'uplifting';
          t.compartments = t.compartments.map(comp => ({ ...comp, isOffloading: false, targetDelivery: 0 }));
        } else if (t.status === 'uplifting') {
          let allFull = true;
          t.compartments = t.compartments.map(comp => {
            if (comp.currentLevel < comp.capacity * 0.98) {
              const fillAmount = Math.floor(Math.random() * 40) + 40;
              const newLevel = Math.min(comp.capacity, comp.currentLevel + fillAmount);
              if (Math.floor(newLevel / 100) > Math.floor(comp.currentLevel / 100)) {
                t.logs = [...(t.logs || []).slice(-40), { id: `log-${Date.now()}-${comp.id}`, ts: new Date(), msg: `${comp.id} refilled to ${Math.round(newLevel)}L` }];
              }
              if (newLevel < comp.capacity * 0.95) allFull = false;
              return { ...comp, currentLevel: newLevel, deliveredLiters: 0 };
            }
            return { ...comp, deliveredLiters: 0 };
          });
          if (allFull) {
            t.status = 'idle';
            t.destination = undefined;
            t.startPoint = undefined;
            t.logs = [...(t.logs || []).slice(-40), { id: `log-${Date.now()}`, ts: new Date(), msg: 'Uplift completed; ready for assignment' }];
          }
        }

        if (Math.random() < 0.01) {
          const alertTypes = ['theft', 'tampering', 'tilt', 'valve'] as const;
          const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
          const newAlert: Alert = {
            id: `alert-${Date.now()}-${Math.random()}`,
            type: alertType as any,
            severity: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
            message: getAlertMessage(alertType, t.name),
            timestamp: new Date(),
            truckId: t.id,
            acknowledged: false,
            location: t.position,
          };
          setAlerts(prev => [newAlert, ...prev.slice(0, 49)]);
        }

        if (t.status === 'delivering' && (t.telemetry.fuelFlow || 0) > 0) {
          setFuelConsumptionData(prev => [...prev.slice(-1000), { timestamp: new Date(), truckId: t.id, liters: t.telemetry.fuelFlow || 0 }]);
        }

        return t;
      }));

      setTotalSavings(prev => prev + Math.floor(Math.random() * 100));
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const getAlertMessage = (type: string, truckName: string): string => {
    switch (type) {
      case 'theft': return `Possible fuel theft detected on ${truckName}`;
      case 'tampering': return `Valve tampering detected on ${truckName}`;
      case 'tilt': return `Unusual tilt angle detected on ${truckName}`;
      case 'valve': return `Unauthorized valve operation on ${truckName}`;
      case 'loss': return `Fuel loss detected on ${truckName}`;
      default: return `Alert from ${truckName}`;
    }
  };

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => alert.id === alertId ? { ...alert, acknowledged: true } : alert));
  }, []);

  // ===== OSRM helpers (snap to road + route) =====
  const osrmNearest = useCallback(async (p: { lat: number; lng: number }) => {
    try {
      const url = `https://router.project-osrm.org/nearest/v1/driving/${p.lng},${p.lat}?number=1`;
      const r = await fetch(url);
      if (!r.ok) return p;
      const data = await r.json();
      const wp = data?.waypoints?.[0]?.location;
      return Array.isArray(wp) ? { lat: wp[1], lng: wp[0] } : p;
    } catch {
      return p;
    }
  }, []);

  const planRoadRoute = useCallback(async (start: { lat: number; lng: number }, end: { lat: number; lng: number }): Promise<RoutePlan> => {
    const [sSnap, eSnap] = await Promise.all([osrmNearest(start), osrmNearest(end)]);
    const url = `https://router.project-osrm.org/route/v1/driving/${sSnap.lng},${sSnap.lat};${eSnap.lng},${eSnap.lat}?overview=full&geometries=geojson&steps=false&alternatives=false`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) throw new Error('No route found');
    const coords = (route.geometry.coordinates as [number, number][])
      .map(([lng, lat]) => ({ lat, lng }));
    return { coords, cursor: 0, segProgressKm: 0, distanceKm: (route.distance || 0) / 1000 };
  }, [osrmNearest]);

  // ===== Assignment with Oman guard =====
  const assignTrip = useCallback((truckId: string, rawDestination: { lat: number; lng: number; name: string }) => {
    const now = Date.now();
    const start = trucksRef.current.find(t => t.id === truckId)?.position;
    if (!start) return;

    // sanitize destination: keep in Oman and within sane distance
    let destination = rawDestination;
    if (!inOman(destination) || haversine(start, destination) > TOO_FAR_KM) {
      console.warn('Destination outside Oman or too far; snapping to Total Fuel Hub – Ruwi.');
      destination = TOTAL_FUEL_HUB_RUWI;
    }

    // show dashed fallback immediately
    setTrucks(prev => prev.map(truck =>
      truck.id === truckId
        ? {
            ...truck,
            status: truck.status === 'idle' ? 'assigned' : truck.status,
            destination,
            startPoint: { ...truck.position },
            routePlan: undefined,
            telemetry: { ...(truck.telemetry || { online: true }), speed: 45, heading: bearing(truck.position, destination), lastUpdate: new Date() },
            logs: [...(truck.logs || []).slice(-40), { id: `assign-${now}`, ts: new Date(), msg: `Assigned to ${destination.name}` }],
          }
        : truck
    ));

    // fetch road route and patch in
    (async () => {
      try {
        const plan = await planRoadRoute(start, destination);
        setTrucks(prev => prev.map(t => (t.id === truckId ? { ...t, routePlan: { ...plan, cursor: 0, segProgressKm: 0 } } : t)));
      } catch (e) {
        console.warn('OSRM route failed, keeping straight-line:', e);
      }
    })();
  }, [planRoadRoute]);

  return {
    trucks,
    alerts,
    totalSavings,
    fuelConsumptionData,
    fuelLossHistory,
    acknowledgeAlert,
    assignTrip,
  };
};
