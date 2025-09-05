import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Truck, Alert, FuelLossHistory, RoutePlan } from '@/types/truck';
import { AlertLifecycle } from '@/types/lifecycle';
import { PLANNED_EVENTS, DEMO_TOTALS, SeededRandom, PlannedEvent } from '@/demo/muscatScenario';
import { eventBus } from '@/lib/socket';

/** ====== Config ====== */
const TICK_INTERVAL_MS = 1000;
const ARRIVAL_THRESHOLD_KM = 0.15;       // ~150m: "at end of road polyline"
const FINAL_LEG_THRESHOLD_KM = 0.03;     // ~30m: drive from road end to exact mark
const ENABLE_IDLE_DRIFT = true;

const MAX_ASSIGN_KM = 1500;              // hard-stop if someone clicks far away

/** 🚀 Speed config — fast for demo time compression (your values) */
const SPEED_ROAD_MIN_KPH = 800;
const SPEED_ROAD_MAX_KPH = 880;

const SPEED_FINAL_LEG_MIN_KPH = 830;
const SPEED_FINAL_LEG_MAX_KPH = 880;

const SPEED_FALLBACK_MIN_KPH = 820;
const SPEED_FALLBACK_MAX_KPH = 890;

const SPEED_ASSIGN_START_KPH = 840;

/** ✨ Offload config */
const DRAIN_LPS = 8;                    // liters / second per active compartment
const DEFAULT_TRIP_TARGET_L = 6000;     // demo per-truck assignment if caller didn’t specify
const DISTRIBUTE_BY_CAPACITY = true;    // proportional split by capacity; else even split

/** Oman-ish bounds for idle drift */
const BOUNDS = { minLat: 16.6, maxLat: 26.6, minLng: 52.0, maxLng: 60.0 };

/** Nice Oman destinations */
export const OMAN_STOPS = [
  { id: 'mct-airport', name: 'Muscat International Airport', lat: 23.5933, lng: 58.2844 },
  { id: 'mutrah-souk', name: 'Mutrah Souq', lat: 23.6165, lng: 58.5922 },
  { id: 'seeb', name: 'Seeb', lat: 23.6697, lng: 58.1890 },
  { id: 'barka', name: 'Barka', lat: 23.7074, lng: 57.8890 },
  { id: 'Ruwi', name: 'Ruwi', lat: 23.5991, lng: 58.4288 },
  { id: 'Al+Wutayyah', name: 'Al+Wutayyah', lat: 23.6072, lng: 58.4686 },
  { id: 'Madinat+Al+Ilam', name: 'Madinat+Al+Ilam', lat: 23.5993, lng: 58.4378 },
  { id: 'Shati+Al+Qurum', name: 'Shati+Al+Qurum', lat: 23.6159, lng: 58.4311 },
  { id: 'Ash+Shutayfi,+Muscat', name: 'Ash+Shutayfi,+Muscat', lat: 23.6276, lng: 58.5309 },
  { id: 'Qurum+29', name: 'Qurum+29', lat: 23.5866, lng: 58.4317 },
] as const;

export const getRandomOmanStop = () =>
  OMAN_STOPS[Math.floor(Math.random() * OMAN_STOPS.length)];

/** ====== Math helpers ====== */
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

/** Move from A along a bearing by d km */
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

const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const keepInBounds = (p: { lat: number; lng: number }) => ({
  lat: clamp(p.lat, BOUNDS.minLat, BOUNDS.maxLat),
  lng: clamp(p.lng, BOUNDS.minLng, BOUNDS.maxLng),
});

/** ====== Robust coord helpers & region guard ====== */
type LatLng = { lat: number; lng: number };

function isInOmanBounds(p: LatLng) {
  return (
    p.lat >= BOUNDS.minLat &&
    p.lat <= BOUNDS.maxLat &&
    p.lng >= BOUNDS.minLng &&
    p.lng <= BOUNDS.maxLng
  );
}

/** Oman-aware normalize that fixes swapped lat/lng */
function normalizePoint(p: any): LatLng {
  let lat = Number(p?.lat ?? p?.latitude ?? p?.y);
  let lng = Number(p?.lng ?? p?.lon ?? p?.longitude ?? p?.x);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Bad coordinates (not numbers)');
  }

  if (Math.abs(lat) > 60 && Math.abs(lng) <= 60) [lat, lng] = [lng, lat];

  const cur = { lat, lng };
  const swapped = { lat: lng, lng: lat };
  if (!isInOmanBounds(cur) && isInOmanBounds(swapped)) {
    [lat, lng] = [lng, lat];
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error('Coordinates out of bounds');
  }
  return { lat, lng };
}

/** ====== Demo trucks ====== */
const BASE_TRUCKS: Omit<Truck, 'telemetry' | 'alerts' | 'trail'>[] = [
  {
    id: 'TK001',
    name: 'Muscat Express 01',
    driver: 'Ahmed Al-Rashid',
    status: 'idle',
    client: 'Multiple Clients',
    position: { lat: 23.636389, lng: 58.508888 },
    compartments: [
      { id: 'C1', capacity: 5000, currentLevel: 5000, fuelType: 'Diesel', isOffloading: false },
      { id: 'C2', capacity: 5000, currentLevel: 5000, fuelType: 'Petrol', isOffloading: false },
      { id: 'C3', capacity: 5000, currentLevel: 5000, fuelType: 'Diesel', isOffloading: false },
      { id: 'C4', capacity: 5000, currentLevel: 5000, fuelType: 'Petrol', isOffloading: false },
    ],
  },
  {
    id: 'TK002',
    name: 'Muscat Express 02',
    driver: 'Fatima Al-Zahra',
    status: 'idle',
    client: 'Shell',
    position: { lat: 23.637, lng: 58.509 },
    compartments: [
      { id: 'C1', capacity: 5000, currentLevel: 4800, fuelType: 'Diesel', isOffloading: false },
      { id: 'C2', capacity: 5000, currentLevel: 4200, fuelType: 'Petrol', isOffloading: false },
      { id: 'C3', capacity: 5000, currentLevel: 3600, fuelType: 'Diesel', isOffloading: false },
      { id: 'C4', capacity: 5000, currentLevel: 3200, fuelType: 'Petrol', isOffloading: false },
    ],
  },
  {
    id: 'TK003',
    name: 'Muscat Express 03',
    driver: 'Omar Al-Balushi',
    status: 'idle',
    client: 'BP',
    position: { lat: 23.636, lng: 58.508 },
    compartments: [
      { id: 'C1', capacity: 5000, currentLevel: 2800, fuelType: 'Diesel', isOffloading: false },
      { id: 'C2', capacity: 5000, currentLevel: 2400, fuelType: 'Petrol', isOffloading: false },
      { id: 'C3', capacity: 5000, currentLevel: 3800, fuelType: 'Diesel', isOffloading: false },
      { id: 'C4', capacity: 5000, currentLevel: 3400, fuelType: 'Petrol', isOffloading: false },
    ],
  },
  {
    id: 'TK004',
    name: 'Muscat Express 04',
    driver: 'Khadija Al-Hinai',
    status: 'idle',
    client: 'Total',
    position: { lat: 23.6365, lng: 58.5085 },
    compartments: [
      { id: 'C1', capacity: 5000, currentLevel: 1200, fuelType: 'Diesel', isOffloading: false },
      { id: 'C2', capacity: 5000, currentLevel: 800, fuelType: 'Petrol', isOffloading: false },
      { id: 'C3', capacity: 5000, currentLevel: 1600, fuelType: 'Diesel', isOffloading: false },
      { id: 'C4', capacity: 5000, currentLevel: 1000, fuelType: 'Petrol', isOffloading: false },
    ],
  },
  {
    id: 'TK005',
    name: 'Muscat Express 05',
    driver: 'Saeed Al-Kindi',
    status: 'idle',
    client: 'Mobil',
    position: { lat: 23.6355, lng: 58.5082 },
    compartments: [
      { id: 'C1', capacity: 5000, currentLevel: 3600, fuelType: 'Diesel', isOffloading: false },
      { id: 'C2', capacity: 5000, currentLevel: 3200, fuelType: 'Petrol', isOffloading: false },
      { id: 'C3', capacity: 5000, currentLevel: 2800, fuelType: 'Diesel', isOffloading: false },
      { id: 'C4', capacity: 5000, currentLevel: 2400, fuelType: 'Petrol', isOffloading: false },
    ],
  },
];

/** ====== OSRM endpoints (with fallback) ====== */
const OSRM_ENDPOINTS = [
  'https://router.project-osrm.org',
  'https://routing.openstreetmap.de/routed-car',
] as const;

/** ---------- Helpers for targets & offload ---------- */

/** Proportionally distribute a truck-level assigned liters to compartments (clamped) */
function distributeTargets(
  comps: NonNullable<Truck['compartments']>,
  assignedLiters: number
) {
  const totalCap = comps.reduce((s, c) => s + (Number(c.capacity) || 0), 0) || 1;
  const totalStock = comps.reduce((s, c) => s + (Number(c.currentLevel) || 0), 0);
  const toAssign = Math.min(Math.max(0, assignedLiters), totalStock);

  // First pass: raw shares
  const shares = comps.map((c) => {
    const cap = Number(c.capacity) || 0;
    const cur = Number(c.currentLevel) || 0;
    const raw = DISTRIBUTE_BY_CAPACITY ? (toAssign * cap) / totalCap : toAssign / comps.length;
    const tgt = Math.max(0, Math.min(Math.round(raw), cur, cap));
    return tgt;
  });

  // Adjust rounding drift to exactly match toAssign (optional)
  let diff = toAssign - shares.reduce((s, v) => s + v, 0);
  if (diff !== 0) {
    for (let i = 0; i < shares.length && diff !== 0; i++) {
      const c = comps[i];
      const cap = Number(c.capacity) || 0;
      const cur = Number(c.currentLevel) || 0;
      const room = Math.max(0, Math.min(cur, cap) - shares[i]);
      const step = Math.sign(diff);
      if (step > 0 && room > 0) {
        shares[i] += 1;
        diff -= 1;
      } else if (step < 0 && shares[i] > 0) {
        shares[i] -= 1;
        diff += 1;
      }
    }
  }

  return shares;
}

/** Start offloading when the truck reaches the exact destination */
function startOffloadForTruck(truck: Truck): Truck {
  const now = new Date();

  // If targets were not prepared at assignment, default to “empty the truck”
  const hadAnyTarget = (truck.compartments ?? []).some(
    (c: any) => typeof c.targetDelivery === 'number' && c.targetDelivery > 0
  );
  const compsPrepared = (truck.compartments ?? []).map((c) => {
    const target =
      hadAnyTarget
        ? Math.max(0, (c as any).targetDelivery ?? 0)
        : Math.max(0, Math.min(c.currentLevel, c.capacity)); // drain stock if no target set
    return {
      ...c,
      targetDelivery: target,
      deliveredLiters: 0,
      isOffloading: target > 0 && c.currentLevel > 0,
    };
  });

  const assignedLiters = compsPrepared.reduce((s, c: any) => s + (c.targetDelivery || 0), 0);

  eventBus.emit('retail:offload_start', {
    truckId: truck.id,
    stopName: truck.destination?.name,
    assignedLiters,
    at: +now,
  });

  return {
    ...truck,
    status: 'delivering',
    compartments: compsPrepared,
    telemetry: {
      ...(truck.telemetry || { online: true }),
      speed: 0,
      valveStatus: true,
      fuelFlow: Math.max(5, (truck.telemetry?.fuelFlow ?? 8)),
      lastUpdate: now,
    },
    currentAssignment: {
      assignedLiters,
      startedAt: now,
      provisionalLossLiters: 0,
    } as any,
    logs: [
      ...(truck.logs ?? []).slice(-20),
      { id: `offload-start-${+now}`, ts: now, msg: `Started offload at ${truck.destination?.name ?? 'site'}` },
    ],
  };
}

/** Drain step — clamp to target and to remaining fuel */
function drainTickForTruck(truck: Truck, dtMs: number, pushHistory: (h: FuelLossHistory) => void): Truck {
  const dtSec = dtMs / 1000;

  let anyActive = false;
  const comps = (truck.compartments ?? []).map((c) => {
    const target = Math.max(0, (c as any).targetDelivery ?? 0);
    const delivered = Math.max(0, (c as any).deliveredLiters ?? 0);
    const stillNeeded = Math.max(0, target - delivered);

    if (!c.isOffloading || stillNeeded <= 0 || c.currentLevel <= 0) {
      return { ...c, isOffloading: false };
    }

    anyActive = true;
    const maxThisTick = DRAIN_LPS * dtSec;
    const add = Math.max(0, Math.min(maxThisTick, stillNeeded, c.currentLevel));

    return {
      ...c,
      currentLevel: c.currentLevel - add,
      deliveredLiters: delivered + add,
      isOffloading: delivered + add < target && c.currentLevel - add > 0,
    };
  });

  const assigned = Math.max(
    0,
    truck.currentAssignment?.assignedLiters ??
      comps.reduce((s, c: any) => s + (c.targetDelivery || 0), 0)
  );

  const deliveredTotal = comps.reduce((s, c: any) => s + (c.deliveredLiters || 0), 0);
  const provisionalLoss = Math.max(0, assigned - deliveredTotal);

  const tele = {
    ...(truck.telemetry || { online: true }),
    speed: 0,
    valveStatus: anyActive,
    fuelFlow: anyActive ? Math.max(5, (truck.telemetry?.fuelFlow ?? 8)) : 0,
    lastUpdate: new Date(),
  };

  if (anyActive) {
    return {
      ...truck,
      compartments: comps,
      telemetry: tele,
      currentAssignment: {
        ...(truck.currentAssignment || {}),
        assignedLiters: assigned,
        provisionalLossLiters: provisionalLoss,
      } as any,
    };
  }

  // ✅ Finalize when all compartments are done
  const lossLiters = Math.max(0, assigned - deliveredTotal);
  const lossPercent = assigned > 0 ? (lossLiters / assigned) * 100 : 0;
  const now = new Date();
  const destinationName = truck.destination?.name;

  // optional: push to loss history
  pushHistory({
    id: `loss-${truck.id}-${+now}` as any,
    truckId: truck.id as any,
    liters: Math.round(lossLiters) as any,
    timestamp: now as any,
  } as FuelLossHistory);

  const done: Truck = {
    ...truck,
    status: 'completed',
    startPoint: undefined,
    destination: undefined, // clear now that summary is written (we kept destName above)
    telemetry: { ...tele, valveStatus: false, fuelFlow: 0 },
    currentAssignment: undefined,
    compartments: comps.map((c) => ({ ...c, isOffloading: false })),
    lastTripSummary: {
      assignedLiters: Math.round(assigned),
      deliveredLiters: Math.round(Math.min(deliveredTotal, assigned)),
      lossLiters: Math.round(lossLiters),
      lossPercent,
      completedAt: now,
      destinationName,
    } as any,
    logs: [
      ...(truck.logs ?? []).slice(-20),
      {
        id: `offload-done-${+now}`,
        ts: now,
        msg: `Delivery completed (${Math.round(Math.min(deliveredTotal, assigned))}L, loss ${Math.round(lossLiters)}L)`,
      },
    ],
  };

  eventBus.emit('retail:completed', {
    truckId: truck.id,
    stopName: destinationName,
    assignedLiters: done.lastTripSummary?.assignedLiters,
    deliveredLiters: done.lastTripSummary?.deliveredLiters,
    lossLiters: done.lastTripSummary?.lossLiters,
    at: +now,
  });

  return done;
}

/** ---------- Hook ---------- */

export const useMuscatSimulation = () => {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [lifecycleAlerts, setLifecycleAlerts] = useState<AlertLifecycle[]>([]);
  const [fuelLossHistory, setFuelLossHistory] = useState<FuelLossHistory[]>([]);
  const [totalSavings] = useState(DEMO_TOTALS.savingsOMR);
  const [routeCompliancePercent] = useState(DEMO_TOTALS.routeCompliancePercent);
  const [uptimePercent] = useState(DEMO_TOTALS.uptimePercent);

  const rngRef = useRef(new SeededRandom(12345));
  const tickRef = useRef(0);
  const lastTsRef = useRef<number>(Date.now());
  const scenarioRunningRef = useRef(false);
  const trucksRef = useRef<Truck[]>([]);

  /** Keep ref in sync */
  useEffect(() => {
    trucksRef.current = trucks;
  }, [trucks]);

  /** Init trucks */
  useEffect(() => {
    const init: Truck[] = BASE_TRUCKS.map(t => ({
      ...t,
      telemetry: {
        speed: 0,
        fuelFlow: 0,
        tilt: rngRef.current.range(0, 2),
        valveStatus: false,
        online: t.id === 'TK004' ? false : true,
        lastUpdate: new Date(),
        heading: rngRef.current.range(0, 360),
      },
      logs: [{ id: 'init', ts: new Date(), msg: t.id === 'TK004' ? 'System offline' : 'Standing by' }],
      alerts: [],
      trail: [{ ...t.position, timestamp: new Date() }],
    }));
    trucksRef.current = init;
    setTrucks(init);
  }, []);

  /** Tick: move or drain */
  useEffect(() => {
    const int = setInterval(() => {
      const now = Date.now();
      const dtMs = now - lastTsRef.current;
      lastTsRef.current = now;
      tickRef.current++;

      setTrucks(prev =>
        prev.map(truck => {
          const tele = truck.telemetry!;

          // If draining, do drain step first; no movement while valve open
          const isDrainingNow =
            !!truck.telemetry?.valveStatus || (truck.compartments ?? []).some((c) => !!c.isOffloading);
          if (isDrainingNow) {
            return drainTickForTruck(truck, dtMs, (h) =>
              setFuelLossHistory(prevH => [...prevH, h].slice(-200))
            );
          }

          // Planned events demo
          if (scenarioRunningRef.current && truck.id === 'TK001') {
            const active = PLANNED_EVENTS.filter(e =>
              tickRef.current >= e.tickRange[0] && tickRef.current <= e.tickRange[1]
            );
            active.forEach(e => processPlannedEvent(truck, e));
          }

          /** 1) OSRM road-following */
          if (truck.routePlan && truck.destination) {
            const { coords } = truck.routePlan;
            if (coords.length < 2) return truck;

            let { cursor, segProgressKm } = truck.routePlan;
            let pos = { ...truck.position };

            let remainingStepKm =
              (clamp(tele.speed || SPEED_ROAD_MIN_KPH, SPEED_ROAD_MIN_KPH, SPEED_ROAD_MAX_KPH) * dtMs) / 3_600_000;

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

            // Distance to end of road polyline
            const finalRoadPoint = coords[coords.length - 1];
            const distToRoadEnd = haversine(pos, finalRoadPoint);

            // Reached end of road polyline?
            if (distToRoadEnd < ARRIVAL_THRESHOLD_KM) {
              // If the exact marked destination is still inside site → short final leg
              const distToExact = haversine(finalRoadPoint, truck.destination);
              if (distToExact > FINAL_LEG_THRESHOLD_KM) {
                const brgToExact = bearing(finalRoadPoint, truck.destination);
                const tele2 = {
                  ...tele,
                  speed: clamp(
                    (tele.speed || SPEED_FINAL_LEG_MIN_KPH) + rand(-3, 3),
                    SPEED_FINAL_LEG_MIN_KPH,
                    SPEED_FINAL_LEG_MAX_KPH
                  ),
                  heading: brgToExact,
                  fuelFlow: clamp((tele.fuelFlow || 6) + rand(-0.5, 0.6), 4, 12),
                  lastUpdate: new Date(),
                };

                return {
                  ...truck,
                  position: finalRoadPoint,
                  routePlan: undefined, // handoff to straight-line next tick
                  status: truck.status === 'assigned' ? 'delivering' : truck.status,
                  telemetry: tele2,
                  logs: [
                    ...(truck.logs ?? []).slice(-20),
                    { id: `handoff-${now}-${truck.id}`, ts: new Date(), msg: `Reached road access — final approach to ${truck.destination?.name}` },
                  ],
                  trail: [...(truck.trail ?? []), { ...finalRoadPoint, timestamp: new Date() }].slice(-200),
                };
              }

              // Arrived at exact mark → start offloading
              const arrived = {
                ...truck,
                position: truck.destination!,
                routePlan: undefined,
                trail: [...(truck.trail ?? []), { ...truck.destination!, timestamp: new Date() }].slice(-200),
              };
              return startOffloadForTruck(arrived);
            }

            const nextIdx = Math.min(cursor + 1, coords.length - 1);
            const brg = bearing(pos, coords[nextIdx]);

            return {
              ...truck,
              status: truck.status === 'assigned' ? 'delivering' : truck.status,
              position: pos,
              routePlan: { ...truck.routePlan, cursor, segProgressKm },
              telemetry: {
                ...tele,
                speed: clamp(
                  (tele.speed || SPEED_ROAD_MIN_KPH) + rand(-3, 3),
                  SPEED_ROAD_MIN_KPH,
                  SPEED_ROAD_MAX_KPH
                ),
                heading: brg,
                fuelFlow: clamp((tele.fuelFlow || 8) + rand(-0.5, 0.8), 5, 18),
                valveStatus: false,
                lastUpdate: new Date(),
              },
              trail: [...(truck.trail ?? []), { ...pos, timestamp: new Date() }].slice(-200),
            };
          }

          /** 2) Fallback straight-line navigator if we have destination but NO routePlan */
          if (!truck.routePlan && truck.destination) {
            const brg = bearing(truck.position, truck.destination);
            const speedKph = clamp(
              (tele.speed || SPEED_FALLBACK_MIN_KPH) + rand(-2, 2),
              SPEED_FALLBACK_MIN_KPH,
              SPEED_FALLBACK_MAX_KPH
            );
            const stepKm = (speedKph * dtMs) / 3_600_000;
            const nextPos = stepFrom(truck.position, brg, stepKm);
            const distToEnd = haversine(nextPos, truck.destination);

            if (distToEnd < ARRIVAL_THRESHOLD_KM) {
              // Arrived → start offloading (do not complete immediately)
              const arrived = {
                ...truck,
                position: truck.destination,
                telemetry: { ...tele, speed: 0, heading: brg, lastUpdate: new Date() },
                trail: [...(truck.trail ?? []), { ...truck.destination, timestamp: new Date() }].slice(-200),
              };
              return startOffloadForTruck(arrived);
            }

            return {
              ...truck,
              status: truck.status === 'assigned' ? 'delivering' : truck.status,
              position: nextPos,
              telemetry: {
                ...tele,
                speed: speedKph,
                heading: brg,
                fuelFlow: clamp((tele.fuelFlow || 8) + rand(-0.5, 0.8), 5, 18),
                valveStatus: false,
                lastUpdate: new Date(),
              },
              trail: [...(truck.trail ?? []), { ...nextPos, timestamp: new Date() }].slice(-200),
            };
          }

          /** 3) Idle drift (bounded) */
          if (!ENABLE_IDLE_DRIFT) return truck;
          const driftHeading = (tele.heading + rand(-20, 20) + 360) % 360;
          const driftSpeed = clamp((tele.speed || 8) + rand(-6, 6), 3, 22);
          const stepKm = (driftSpeed * dtMs) / 3_600_000;
          let nextPos = stepFrom(truck.position, driftHeading, stepKm);

          if (
            nextPos.lat < BOUNDS.minLat || nextPos.lat > BOUNDS.maxLat ||
            nextPos.lng < BOUNDS.minLng || nextPos.lng > BOUNDS.maxLng
          ) {
            nextPos = keepInBounds(stepFrom(truck.position, (driftHeading + 180) % 360, stepKm));
          }

          return {
            ...truck,
            position: nextPos,
            telemetry: {
              ...tele,
              speed: driftSpeed,
              heading: driftHeading,
              fuelFlow: 0,
              tilt: clamp((tele.tilt || 0) + rand(-0.2, 0.2), 0, 3),
              lastUpdate: new Date(),
            },
            trail: [...(truck.trail ?? []), { ...nextPos, timestamp: new Date() }].slice(-200),
          };
        })
      );

      // light random alert demo (safe pick)
      if (tickRef.current % 24 === 0) {
        const list = trucksRef.current;
        if (list.length) {
          const pick = list[Math.floor(Math.random() * list.length)];
          const alert: Alert = {
            id: `al-${now}`,
            truckId: pick.id,
            message: ['Route deviation detected', 'Valve tamper suspected', 'Delay beyond SLA'][Math.floor(Math.random() * 3)],
            timestamp: new Date(),
            acknowledged: false,
            location: pick.position,
            severity: 'medium',
            type: 'info',
          } as any;
          setAlerts(prev => [alert, ...prev].slice(0, 60));
        }
      }
    }, TICK_INTERVAL_MS);

    return () => clearInterval(int);
  }, []);

  /** ====== OSRM helpers (with fallback) ====== */
  const osrmNearest = useCallback(async (p: { lat: number; lng: number }): Promise<LatLng> => {
    const point = normalizePoint(p);
    for (const base of OSRM_ENDPOINTS) {
      try {
        const u = `${base}/nearest/v1/driving/${point.lng},${point.lat}?number=1`;
        const r = await fetch(u);
        if (!r.ok) continue;
        const j = await r.json();
        const loc = j?.waypoints?.[0]?.location;
        if (Array.isArray(loc)) return { lat: loc[1], lng: loc[0] };
      } catch {}
    }
    return point; // fallback
  }, []);

  const planRoadRoute = useCallback(async (startIn: { lat: number; lng: number }, endIn: { lat: number; lng: number }): Promise<RoutePlan> => {
    const start = normalizePoint(startIn);
    const end = normalizePoint(endIn);
    const [sSnap, eSnap] = await Promise.all([osrmNearest(start), osrmNearest(end)]);

    for (const base of OSRM_ENDPOINTS) {
      try {
        const url = `${base}/route/v1/driving/${sSnap.lng},${sSnap.lat};${eSnap.lng},${eSnap.lat}?overview=full&geometries=geojson&steps=false&alternatives=false`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        const route = data?.routes?.[0];
        if (!route?.geometry?.coordinates?.length) continue;
        const coords = (route.geometry.coordinates as [number, number][])
          .map(([lng, lat]) => ({ lat, lng }));
        return {
          coords,
          cursor: 0,
          segProgressKm: 0,
          distanceKm: (route.distance || 0) / 1000,
        };
      } catch {}
    }
    throw new Error('OSRM route failed on all endpoints');
  }, [osrmNearest]);

  /** ====== Planned events (kept for TK001 demo) ====== */
  const processPlannedEvent = (truck: Truck, event: PlannedEvent) => {
    if (truck.id !== 'TK001') return;
    if (!lifecycleAlerts.some(a => a.id === event.id)) {
      const lifecycleAlert: AlertLifecycle = {
        id: event.id,
        type: (event.type as any) || 'info',
        severity: event.type === 'theft' ? 'critical' : 'warning',
        truckId: truck.id,
        message: event.description,
        tsRaised: Date.now(),
        status: 'raised',
      };
      setLifecycleAlerts(prev => [lifecycleAlert, ...prev]);

      const legacy: Alert = {
        id: event.id,
        type: event.type === 'deviation' ? 'route_deviation' : (event.type as any),
        severity: event.type === 'theft' ? 'high' : 'medium',
        message: event.description,
        timestamp: new Date(),
        truckId: truck.id,
        acknowledged: false,
        location: truck.position,
      } as Alert;
      setAlerts(prev => [legacy, ...prev]);

      // NOTE: This mutates the truck object directly; kept for demo parity.
      if (event.type === 'theft' && event.data) {
        const comp = truck.compartments.find(c => c.id === event.data!.compartmentId);
        if (comp) comp.currentLevel = Math.max(0, comp.currentLevel - event.data!.lossLiters);
      }
      eventBus.emit('alert:new', lifecycleAlert);
    }
  };

  /** ====== Public actions ====== */
  const acknowledgeAlert = useCallback(
    (alertId: string, userInfo?: { role: string; name: string }) => {
      setAlerts(prev => prev.map(a => (a.id === alertId ? { ...a, acknowledged: true } : a)));
      setLifecycleAlerts(prev =>
        prev.map(a => (a.id === alertId ? { ...a, status: 'ack', tsAck: Date.now(), ackBy: userInfo } : a))
      );
      const updated = lifecycleAlerts.find(a => a.id === alertId);
      if (updated) {
        eventBus.emit('alert:update', { ...updated, status: 'ack', tsAck: Date.now(), ackBy: userInfo });
      }
    },
    [lifecycleAlerts]
  );

  /** Assign ONE truck (optimistic + per-compartment targets + road route) */
  const assignTrip = useCallback(
    (truckId: string, destinationIn: { lat: number; lng: number; name: string } | any) => {
      const now = Date.now();
      const start = trucksRef.current.find(t => t.id === truckId)?.position;
      if (!start) return;

      let destination: LatLng & { name?: string };
      try {
        destination = { ...normalizePoint(destinationIn), name: destinationIn?.name ?? 'Destination' };
      } catch (e) {
        eventBus.emit('ui:error', { message: `Invalid destination: ${(e as Error).message}` });
        return;
      }

      const distKm = haversine(start, destination);
      if (!isInOmanBounds(destination) || distKm > MAX_ASSIGN_KM) {
        eventBus.emit('ui:error', {
          message: `Destination out of service region (~${distKm.toFixed(0)} km). Pick a point inside Oman.`,
        });
        return;
      }

      // 1) Optimistic: straight-line until OSRM returns + prepare compartment targets
      setTrucks(prev =>
        prev.map(t => {
          if (t.id !== truckId) return t;

          const comps = Array.isArray(t.compartments) ? t.compartments : [];
          const stock = comps.reduce((s, c) => s + (Number(c.currentLevel) || 0), 0);
          const assigned = Math.min(DEFAULT_TRIP_TARGET_L, stock);

          const shares = distributeTargets(comps, assigned);
          const updatedComps = comps.map((c, i) => ({
            ...c,
            targetDelivery: shares[i],
            deliveredLiters: 0,
            isOffloading: false,
          }));

          return {
            ...t,
            startPoint: { ...t.position },
            destination: destination as any,
            status: t.status === 'idle' ? 'assigned' : t.status,
            routePlan: undefined, // patched in below
            telemetry: {
              ...(t.telemetry || { online: true }),
              speed: SPEED_ASSIGN_START_KPH,
              heading: bearing(t.position, destination),
              lastUpdate: new Date(),
            },
            compartments: updatedComps,
            currentAssignment: {
              assignedLiters: assigned,
              startedAt: new Date(),
              provisionalLossLiters: 0,
            } as any,
            lastTripSummary: undefined, // clear previous summary on new assignment
            logs: [
              ...(t.logs || []).slice(-20),
              { id: `assign-${now}`, ts: new Date(), msg: `Assigned to ${destination.name} (target ${assigned}L)` },
            ],
          };
        })
      );

      // 2) Fetch road route and patch it in
      (async () => {
        try {
          const plan = await planRoadRoute(start, destination);
          setTrucks(prev =>
            prev.map(t =>
              t.id === truckId ? { ...t, routePlan: { ...plan, cursor: 0, segProgressKm: 0 } } : t
            )
          );
        } catch (e) {
          console.warn('OSRM route failed, keeping straight-line fallback.', e);
          eventBus.emit('ui:warn', { message: 'Could not plan a road route. Using straight path temporarily.' });
        }
      })();

      if (!scenarioRunningRef.current) scenarioRunningRef.current = true;
      eventBus.emit('trip:assigned', {
        truckId,
        truckName: trucksRef.current.find(x => x.id === truckId)?.name || truckId,
        destination: String(destination.name ?? 'Destination'),
      });
    },
    [planRoadRoute]
  );

  /** Assign MANY trucks (optimistic + per-compartment targets + route per truck) */
  const assignTrips = useCallback(
    (truckIds: string[], destinationIn: { lat: number; lng: number; name: string } | any) => {
      const now = Date.now();

      let destination: LatLng & { name?: string };
      try {
        destination = { ...normalizePoint(destinationIn), name: destinationIn?.name ?? 'Destination' };
      } catch (e) {
        eventBus.emit('ui:error', { message: `Invalid destination: ${(e as Error).message}` });
        return;
      }

      // Optimistic for all trucks that pass the guard
      setTrucks(prev =>
        prev.map(t => {
          if (!truckIds.includes(t.id)) return t;
          const distKm = haversine(t.position, destination);
          if (!isInOmanBounds(destination) || distKm > MAX_ASSIGN_KM) return t;

          const comps = Array.isArray(t.compartments) ? t.compartments : [];
          const stock = comps.reduce((s, c) => s + (Number(c.currentLevel) || 0), 0);
          const assigned = Math.min(DEFAULT_TRIP_TARGET_L, stock);
          const shares = distributeTargets(comps, assigned);
          const updatedComps = comps.map((c, i) => ({
            ...c,
            targetDelivery: shares[i],
            deliveredLiters: 0,
            isOffloading: false,
          }));

          return {
            ...t,
            startPoint: { ...t.position },
            destination: destination as any,
            status: t.status === 'idle' ? 'assigned' : t.status,
            routePlan: undefined,
            telemetry: {
              ...(t.telemetry || { online: true }),
              speed: SPEED_ASSIGN_START_KPH,
              heading: bearing(t.position, destination),
              lastUpdate: new Date(),
            },
            compartments: updatedComps,
            currentAssignment: {
              assignedLiters: assigned,
              startedAt: new Date(),
              provisionalLossLiters: 0,
            } as any,
            lastTripSummary: undefined,
            logs: [
              ...(t.logs || []).slice(-20),
              { id: `assign-${now}-${t.id}`, ts: new Date(), msg: `Assigned to ${destination.name} (target ${assigned}L)` },
            ],
          };
        })
      );

      // Build each road route and patch it in
      truckIds.forEach(id => {
        const t = trucksRef.current.find(x => x.id === id);
        if (!t) return;
        const distKm = haversine(t.position, destination);
        if (!isInOmanBounds(destination) || distKm > MAX_ASSIGN_KM) return;

        (async () => {
          try {
            const plan = await planRoadRoute(t.position, destination);
            setTrucks(prev =>
              prev.map(tt =>
                tt.id === id ? { ...tt, routePlan: { ...plan, cursor: 0, segProgressKm: 0 } } : tt
              )
            );
          } catch (e) {
            console.warn('OSRM route failed for', id, e);
          }
        })();
      });

      if (!scenarioRunningRef.current) scenarioRunningRef.current = true;
      truckIds.forEach(id =>
        eventBus.emit('trip:assigned', {
          truckId: id,
          truckName: trucksRef.current.find(x => x.id === id)?.name || id,
          destination: String(destination.name ?? 'Destination'),
        })
      );
    },
    [planRoadRoute]
  );

  /** SOP helper */
  const updateSopProgress = useCallback((alertId: string, completedSteps: number[]) => {
    setLifecycleAlerts(prev =>
      prev.map(a => (a.id === alertId ? { ...a, sop: { type: a.type, completed: completedSteps } } : a))
    );
  }, []);

  /** Derived demo chart */
  const fuelConsumptionData = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(2024, 11, i + 1),
        truckId: 'fleet',
        liters: Math.round(2400 + rngRef.current.range(-200, 300) + Math.sin(i * 0.2) * 150),
      })),
    []
  );

  return {
    trucks,
    alerts,
    lifecycleAlerts,
    totalSavings,
    fuelConsumptionData,
    fuelLossHistory,
    routeCompliancePercent,
    uptimePercent,
    acknowledgeAlert,
    updateSopProgress,
    assignTrip,   // single
    assignTrips,  // bulk
  };
};
