import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Truck, Alert, UserRole, FuelLossHistory } from '@/types/truck';
import DashboardLayout from './DashboardLayout';
import FleetMap from '../FleetMap';
import { Badge } from '@/components/ui/badge';
import FleetStatusSummary from '../FleetStatusSummary';
import MonthlyFuelChart from '../MonthlyFuelChart';
import StatusBadge from '../StatusBadge';
import SpeedGauge from '../SpeedGauge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, MapPin, Fuel, AlertTriangle } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

/** ---- Safe helpers ---- */
const num = (v: unknown, fallback = 0) =>
  typeof v === 'number' && !Number.isNaN(v) ? v : fallback;

const clampPct = (v: number) => Math.min(100, Math.max(0, v));

const headingToCardinal = (deg: number) => {
  if (!Number.isFinite(deg)) return '—';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
  return dirs[Math.round(deg / 45)];
};

interface DriverDashboardProps {
  trucks: Truck[];
  alerts: Alert[];
  totalSavings: number;
  fuelConsumptionData: any[];
  fuelLossHistory: FuelLossHistory[];
  acknowledgeAlert: (alertId: string) => void;
  assignTrip: (truckId: string, destination: { lat: number; lng: number; name: string }) => void;
  currentUser: { role: UserRole; name: string };
  onLogout: () => void;
}

const DriverDashboard = ({
  trucks,
  alerts,
  fuelConsumptionData,
  fuelLossHistory,
  currentUser,
  onLogout,
}: DriverDashboardProps) => {
  const params = useParams<{ truckId?: string }>();
  const allTrucks = Array.isArray(trucks) ? trucks : [];

  // Optional manual override (UI selector)
  const [manualTruckId, setManualTruckId] = useState<string>('');

  // Candidate list (drivers → only their trucks; others → all)
  const candidates = useMemo(() => {
    if (currentUser?.role === 'driver') {
      const myName = (currentUser.name || '').toLowerCase();
      const mine = allTrucks.filter(
        (t) => (t.driver || '').toLowerCase() === myName
      );
      return mine.length ? mine : allTrucks;
    }
    return allTrucks;
  }, [allTrucks, currentUser?.role, currentUser?.name]);

  // Active truck priority:
  // 1) manual  2) route  3) driver name  4) first active  5) first
  const myTruck = useMemo(() => {
    const byManual = manualTruckId && allTrucks.find((t) => t.id === manualTruckId);
    if (byManual) return byManual;

    const byRoute = params.truckId && allTrucks.find((t) => t.id === params.truckId);
    if (byRoute) return byRoute;

    const byName =
      allTrucks.find(
        (t) =>
          (t.driver || '').toLowerCase() ===
          (currentUser?.name || '').toLowerCase()
      ) || null;
    if (byName) return byName;

    const firstActive = allTrucks.find((t) =>
      ['assigned', 'delivering', 'uplifting'].includes(t.status)
    );
    return firstActive || allTrucks[0] || null;
  }, [allTrucks, manualTruckId, params.truckId, currentUser?.name]);

  if (!myTruck) {
    return (
      <DashboardLayout title="Driver Dashboard" user={currentUser} onLogout={onLogout}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2 text-gray-900">No Truck Assigned</h2>
            <p className="text-gray-600">Please contact dispatch for truck assignment</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Narrow alerts to tampering/offload mismatch/deviation
  const myAlerts = useMemo(() => {
    const list = (alerts ?? []).filter((a) => a.truckId === myTruck.id);
    return list.filter((a) => {
      const m = (a.message || '').toLowerCase();
      return m.includes('tamper') || m.includes('mismatch') || m.includes('deviation');
    });
  }, [alerts, myTruck.id]);

  // Display status
  const getDriveDisplayStatus = (truck: Truck) => {
    const isOffloading = (truck.compartments ?? []).some((comp) => !!comp.isOffloading);
    const valveOpen = !!truck.telemetry?.valveStatus;

    if (!truck.telemetry?.online) return 'offline';
    if (truck.status === 'uplifting') return 'uplifting';
    if (isOffloading || valveOpen) return 'draining';
    if (truck.destination && truck.status === 'delivering') return 'delivering';
    return 'delivering';
  };

  // Fuel totals / percentage
  const totalFuel = (myTruck.compartments ?? []).reduce((sum, c) => sum + num(c.currentLevel), 0);
  const totalCapacity = (myTruck.compartments ?? []).reduce((sum, c) => sum + Math.max(1, num(c.capacity, 1)), 0);
  const fuelPct = clampPct((totalFuel / totalCapacity) * 100);

  const speed = num(myTruck.telemetry?.speed);
  const heading = num(myTruck.telemetry?.heading);
  const fuelFlow = num(myTruck.telemetry?.fuelFlow);
  const tilt = num(myTruck.telemetry?.tilt);
  const online = !!myTruck.telemetry?.online;
  const valveStatus = !!myTruck.telemetry?.valveStatus;

  /** Simple local Start Offload → Confirm Offload flow (UI-only) */
  const [offloadStarted, setOffloadStarted] = useState<boolean>(false);
  useEffect(() => {
    setOffloadStarted(false);
  }, [myTruck.id]);

  const handleStartOffload = () => {
    setOffloadStarted(true);
    console.log('[Driver] Start Offload triggered for truck:', myTruck.id);
  };
  const handleConfirmOffload = () => {
    setOffloadStarted(false);
    console.log('[Driver] Confirm Offload triggered for truck:', myTruck.id);
  };

  return (
    <DashboardLayout
      title={`Driver: ${myTruck.name ?? myTruck.id}`}
      user={currentUser}
      onLogout={onLogout}
    >
      <div className="space-y-8">
        {/* Quick truck switcher */}
        {candidates.length > 1 && (
          <div className="flex justify-end">
            <div className="w-64">
              <Select value={manualTruckId || myTruck.id} onValueChange={setManualTruckId}>
                <SelectTrigger className="bg-white border border-gray-300 text-gray-900">
                  <SelectValue placeholder="Choose vehicle" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {candidates.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-gray-900">
                      {t.name ?? t.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* 1) Status Summary (single-truck) */}
        <FleetStatusSummary trucks={[myTruck]} />

        {/* 2) Main grid: Map + left column details, right rail controls */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left column (span 2) */}
          <div className="xl:col-span-2 space-y-8">
            {/* Map */}
            <Card className="bg-white border border-gray-200 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <MapPin className="w-5 h-5 text-gray-800" />
                  Current Location
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Your truck position and route
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[32rem] relative z-0 rounded-b-2xl overflow-hidden bg-white">
                  <FleetMap trucks={[myTruck]} userRole="driver" />
                </div>
              </CardContent>
            </Card>

            {/* Assignment / Idle */}
            {myTruck.destination ? (
              <Card className="bg-white border border-gray-200 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-gray-900">Current Assignment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded border border-gray-200 p-3 bg-gray-50">
                      <div>
                        <div className="text-xs text-gray-600">Client</div>
                        <div className="font-medium text-gray-900">{myTruck.client ?? '—'}</div>
                        <div className="text-xs text-gray-600">{myTruck.destination?.name}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={getDriveDisplayStatus(myTruck)} />
                        <SpeedGauge speed={speed} size={40} heading={heading} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {(myTruck.compartments ?? []).map((comp) => {
                        const cap = Math.max(1, num(comp.capacity, 1));
                        const cur = num(comp.currentLevel);
                        const percentage = clampPct((cur / cap) * 100);
                        const progressColor =
                          percentage > 50
                            ? 'bg-emerald-500'
                            : percentage > 20
                            ? 'bg-amber-500'
                            : 'bg-rose-500';

                        return (
                          <div key={comp.id} className="border border-gray-200 rounded-lg p-3 text-center bg-white">
                            <div className="text-sm font-medium text-gray-900">{comp.id}</div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ease-out ${progressColor} ${
                                  comp.isOffloading ? 'animate-pulse' : ''
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <div className="text-lg font-bold text-gray-900">{Math.round(cur)}L</div>
                            <div className="text-xs text-gray-600">{comp.fuelType ?? ''}</div>
                            {typeof comp.targetDelivery === 'number' && (
                              <div className="text-xs text-amber-700">Target: {comp.targetDelivery}L</div>
                            )}
                            {typeof comp.deliveredLiters === 'number' && comp.deliveredLiters > 0 && (
                              <div className="text-xs text-emerald-700">Delivered: {comp.deliveredLiters}L</div>
                            )}
                            {comp.isOffloading && (
                              <Badge variant="outline" className="mt-1 text-xs bg-amber-50 text-amber-900 border-amber-200">
                                Draining
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex gap-2">
                      {!offloadStarted ? (
                        <Button
                          className="flex-1 border-gray-300 text-gray-800 hover:bg-gray-900 hover:text-white"
                          variant="outline"
                          onClick={handleStartOffload}
                          disabled={myTruck.status !== 'delivering'}
                          title={myTruck.status !== 'delivering' ? 'Available during delivery' : undefined}
                        >
                          Start Offload
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          className="flex-1"
                          onClick={handleConfirmOffload}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Confirm Offload
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              myTruck.status === 'idle' && (
                <Card className="bg-white border border-gray-200 shadow-sm rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Status: Available</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-emerald-600" />
                      </div>
                      <h3 className="font-medium text-gray-900 mb-2">Ready for Assignment</h3>
                      <p className="text-gray-600">Waiting for dispatch to assign next delivery</p>
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </div>

          {/* Right rail */}
          <div className="space-y-8">
            {/* Truck Status (cab view) */}
            <Card className="bg-white border border-gray-200 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Fuel className="w-5 h-5 text-gray-800" />
                  Truck Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Fuel level bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">Fuel Level</span>
                      <span className="text-gray-900">{fuelPct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-sky-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${fuelPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Speed / heading */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <SpeedGauge speed={speed} size={80} heading={heading} />
                      <div className="text-xs text-gray-600 mt-1">Current Speed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{speed.toFixed(1)}</div>
                      <div className="text-sm text-gray-600">km/h</div>
                      <div className="text-xs text-gray-600">
                        {speed > 0 ? 'Moving' : 'Stationary'}
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-900">{heading.toFixed(0)}°</div>
                      <div className="text-xs text-gray-600">Heading</div>
                      <div className="text-xs text-gray-600">{headingToCardinal(heading)}</div>
                    </div>
                  </div>

                  {/* Flow / tilt */}
                  <div className="grid grid-cols-2 gap-4 text-center mt-4">
                    <div>
                      <div className="text-lg font-bold text-gray-900">{fuelFlow.toFixed(1)}</div>
                      <div className="text-xs text-gray-600">L/min Flow</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-900">{tilt.toFixed(1)}°</div>
                      <div className="text-xs text-gray-600">Tilt Angle</div>
                    </div>
                  </div>

                  {/* Location/valve/connection */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Current Location</span>
                      <span className="text-xs text-gray-600 font-mono">
                        {typeof myTruck?.position?.lat === 'number' && typeof myTruck?.position?.lng === 'number'
                          ? `${myTruck.position.lat.toFixed(4)}, ${myTruck.position.lng.toFixed(4)}`
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Valve Status</span>
                      <Badge
                        variant="outline"
                        className={valveStatus ? 'bg-rose-50 text-rose-900 border-rose-200' : 'bg-gray-100 text-gray-800 border-gray-300'}
                      >
                        {valveStatus ? 'Open' : 'Closed'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Connection</span>
                      <Badge
                        variant="outline"
                        className={online ? 'bg-gray-100 text-gray-800 border-gray-300' : 'bg-rose-50 text-rose-900 border-rose-200'}
                      >
                        {online ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* My Alerts (tampering / mismatch / deviation) */}
            {myAlerts.length > 0 && (
              <Card className="bg-white border border-amber-300 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="w-5 h-5" />
                    Active Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {myAlerts.slice(0, 3).map((alert) => (
                      <div key={alert.id} className="p-2 bg-amber-50 rounded border border-amber-200">
                        <div className="text-sm font-medium text-amber-900">{alert.message}</div>
                        <div className="text-xs text-amber-800/80">
                          {alert.timestamp instanceof Date
                            ? alert.timestamp.toLocaleTimeString()
                            : new Date(alert.timestamp as any).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Emergency Contact */}
            <Card className="bg-white border border-gray-200 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-gray-900">Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="destructive" className="w-full">
                    Emergency Stop
                  </Button>
                  <Button variant="outline" className="w-full border-gray-300 text-gray-800 hover:bg-gray-900 hover:text-white">
                    Contact Dispatch
                  </Button>
                  <Button variant="outline" className="w-full border-gray-300 text-gray-800 hover:bg-gray-900 hover:text-white">
                    Report Issue
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Events */}
            <Card className="bg-white border border-gray-200 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-gray-900">Recent Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(myTruck.logs ?? [])
                    .slice()
                    .sort((a, b) => new Date(b.ts as any).getTime() - new Date(a.ts as any).getTime())
                    .slice(0, 8)
                    .map((log) => (
                      <div key={log.id} className="text-xs border-l-2 border-sky-500 pl-2">
                        <div className="text-gray-600">
                          {log.ts instanceof Date ? log.ts.toLocaleTimeString() : new Date(log.ts as any).toLocaleTimeString()}
                        </div>
                        <div className="text-gray-800">{log.msg}</div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 3) Last Row — 2 x 2 layout (Fuel Chart | Compartment Details) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Monthly Fuel Chart */}
          <Card className="bg-white border border-gray-200 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-gray-900">Monthly Fuel Chart</CardTitle>
              <CardDescription className="text-gray-600">Consumption & deliveries trend</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="w-full h-[24rem] relative">
                <div className="absolute inset-0">
                  <MonthlyFuelChart trucks={[myTruck]} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compartment Details */}
          <Card className="bg-white border border-gray-200 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-gray-900">Compartment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(myTruck.compartments ?? []).map((comp) => {
                  const cap = Math.max(1, num(comp.capacity, 1));
                  const cur = num(comp.currentLevel);
                  const percentage = clampPct((cur / cap) * 100);
                  const progressColor =
                    percentage > 50 ? 'bg-emerald-500' : percentage > 20 ? 'bg-amber-500' : 'bg-rose-500';

                  return (
                    <div key={comp.id} className="border border-gray-200 rounded p-2 bg-white">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-900">{comp.id}</span>
                        <span className="text-sm text-gray-600">{comp.fuelType ?? ''}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ease-out ${progressColor} ${
                            comp.isOffloading ? 'animate-pulse' : ''
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-sm text-gray-800">
                        <span>Current:</span>
                        <span>{Math.round(cur)}L</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-800">
                        <span>Capacity:</span>
                        <span>{cap}L</span>
                      </div>
                      {typeof comp.deliveredLiters === 'number' && comp.deliveredLiters > 0 && (
                        <div className="flex justify-between text-sm text-emerald-700">
                          <span>Delivered:</span>
                          <span>{comp.deliveredLiters}L</span>
                        </div>
                      )}
                      {comp.sealNumber && (
                        <div className="flex justify-between text-sm text-gray-800">
                          <span>Seal:</span>
                          <span className="font-mono">{comp.sealNumber}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DriverDashboard;
