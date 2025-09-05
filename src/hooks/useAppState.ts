// hooks/useAppState.ts
import { useState, useMemo } from 'react';
import type { Truck, Alert, FuelLossHistory, UserRole } from '@/types/truck';

// ⚠️ If your simulator exports the hook as a named export, switch to:
// import { useMuscatSimulation } from '@/hooks/useMuscatSimulation';
import useMuscatSimulation from '@/hooks/useMuscatSimulation';

type AppUser = { role: UserRole; name: string } | null;

/**
 * Adapter that normalizes whatever useMuscatSimulation returns
 * into the shape consumed by your dashboards.
 */
export default function useAppState() {
  const sim = useMuscatSimulation() as any;

  // local auth/user
  const [currentUser, setCurrentUser] = useState<AppUser>(null);

  const onLogin = (role: UserRole, name: string) => setCurrentUser({ role, name });
  const onLogout = () => setCurrentUser(null);

  // soft defaults in case the simulator doesn't return some fields
  const trucks: Truck[] = sim?.trucks ?? [];
  const alerts: Alert[] = sim?.alerts ?? [];
  const fuelLossHistory: FuelLossHistory[] = sim?.fuelLossHistory ?? [];
  const fuelConsumptionData: any[] = sim?.fuelConsumptionData ?? [];
  const totalSavings: number = sim?.totalSavings ?? 874000;

  const acknowledgeAlert =
    (sim?.acknowledgeAlert as ((id: string) => void)) ??
    ((_: string) => { /* no-op fallback */ });

  const assignTrip =
    (sim?.assignTrip as ((truckId: string, dest: { lat: number; lng: number; name: string }) => void)) ??
    ((_: string, __: { lat: number; lng: number; name: string }) => { /* no-op fallback */ });

  return {
    // state
    currentUser,
    trucks,
    alerts,
    totalSavings,
    fuelConsumptionData,
    fuelLossHistory,

    // actions
    onLogin,
    onLogout,
    acknowledgeAlert,
    assignTrip,
  };
}
