import React, { useEffect, useMemo, useState } from 'react';
import { Truck, Alert, UserRole, FuelLossHistory } from '@/types/truck';
import DashboardLayout from './DashboardLayout';
import FleetMap from '../FleetMap';
import AlertPanel from '../AlertPanel';
import FleetStatusSummary from '../FleetStatusSummary';
import MonthlyFuelChart from '../MonthlyFuelChart';
import CompartmentLevelBar from '../CompartmentLevelBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Navigation, Phone, Lock, Route, Download, FileText } from 'lucide-react';
import StatusBadge from '../StatusBadge';
import { exportToCSV, printFuelLossReport } from '@/utils/export';
import { format } from 'date-fns';

import RetailQueue from '@/components/retail/RetailQueue';
import KnowledgeTrends from '@/components/retail/KnowledgeTrends';
import { OMAN_STOPS } from '@/hooks/useMuscatSimulation';

/** Helpers */
const num = (v: unknown, fallback = 0) =>
  typeof v === 'number' && !Number.isNaN(v) ? v : fallback;

const fmtTime = (d?: Date | string | number) => {
  if (!d) return '--';
  if (d instanceof Date) return d.toLocaleTimeString();
  const dd = new Date(d);
  return Number.isNaN(dd.getTime()) ? '--' : dd.toLocaleTimeString();
};

const fmtHhmm = (d?: Date | string | number) => {
  if (!d) return '--';
  try {
    return format(new Date(d as any), 'HH:mm');
  } catch {
    return '--';
  }
};

const toRad = (deg: number) => (deg * Math.PI) / 180;
const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

function estimateEtaMs(truck: Truck): number {
  const spdKph = Math.max(1, num(truck.telemetry?.speed, 40));
  if (truck.routePlan?.coords?.length && Number.isFinite(truck.routePlan.cursor)) {
    const { coords, cursor, segProgressKm } = truck.routePlan;
    let remainingKm = 0;
    for (let i = cursor; i < coords.length - 1; i++) {
      const A = coords[i];
      const B = coords[i + 1];
      const segKm = haversineKm(A, B);
      if (i === cursor) {
        remainingKm += Math.max(0, segKm - num(segProgressKm));
      } else {
        remainingKm += segKm;
      }
    }
    return (remainingKm / spdKph) * 3600 * 1000;
  }
  if (truck.destination) {
    const distKm = haversineKm(truck.position, truck.destination);
    return (distKm / spdKph) * 3600 * 1000;
  }
  return 0;
}

interface OperatorDashboardProps {
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

const OperatorDashboard = ({
  trucks,
  alerts,
  fuelConsumptionData,
  fuelLossHistory,
  acknowledgeAlert,
  assignTrip,
  currentUser,
  onLogout,
}: OperatorDashboardProps) => {
  const [selectedTruck, setSelectedTruck] = useState<string>('');
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  /** Details card picker */
  const [detailsTruckId, setDetailsTruckId] = useState<string>('');

  /** Normalize inputs */
  const allTrucks = Array.isArray(trucks) ? trucks : [];
  const allAlerts = Array.isArray(alerts) ? alerts : [];

  /** Destinations (clean names) */
  const destinations = useMemo(
    () => OMAN_STOPS.map(s => ({ ...s, displayName: s.name.replace(/\+/g, ' ') })),
    []
  );

  /** Make sure selector lists are NEVER empty:
   *  1) idle + online
   *  2) else all online
   *  3) else all trucks
   */
  const idleOnline = allTrucks.filter(t => t.status === 'idle' && t.telemetry?.online);
  const onlineOnly = allTrucks.filter(t => t.telemetry?.online);
  const selectableForAssignment =
    idleOnline.length > 0 ? idleOnline : (onlineOnly.length > 0 ? onlineOnly : allTrucks);

  /** If trucks prop changes, auto-select a sensible default for details + assignment */
  useEffect(() => {
    if (!detailsTruckId) {
      const first = selectableForAssignment[0]?.id || allTrucks[0]?.id || '';
      setDetailsTruckId(first);
    } else {
      // if current detailsTruckId no longer exists, pick first
      const stillExists = allTrucks.some(t => t.id === detailsTruckId);
      if (!stillExists) {
        const first = selectableForAssignment[0]?.id || allTrucks[0]?.id || '';
        setDetailsTruckId(first);
      }
    }

    // If assignment selected truck fell out of the list, keep it but allow user to re-pick.
    if (!selectedTruck && selectableForAssignment[0]) {
      setSelectedTruck(selectableForAssignment[0].id);
    }
  }, [allTrucks, selectableForAssignment, detailsTruckId, selectedTruck]);

  const detailsTruck = allTrucks.find(t => t.id === detailsTruckId) || null;

  const activeTrucks = allTrucks.filter(t => ['delivering', 'assigned'].includes(t.status));
  const unacknowledgedAlerts = allAlerts.filter(a => !a.acknowledged);

  const handleAssignTrip = () => {
    if (selectedTruck && selectedDestination) {
      const destination = destinations.find(d => d.id === selectedDestination);
      if (destination) {
        assignTrip(selectedTruck, {
          lat: destination.lat,
          lng: destination.lng,
          name: destination.displayName,
        });
        // keep selectedTruck (operator often assigns multiple) but clear destination
        setSelectedDestination('');
      }
    }
  };

  const handleAssignFromStatus = (truckId: string) => {
    setSelectedTruck(truckId);
    const el = document.getElementById('trip-assignment');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  /** Filtering for Vehicle Status table */
  const filteredTrucks = useMemo(
    () => (statusFilter === 'all' ? allTrucks : allTrucks.filter(t => t.status === statusFilter)),
    [allTrucks, statusFilter]
  );

  const statusCounts = {
    all: allTrucks.length,
    idle: allTrucks.filter(t => t.status === 'idle').length,
    delivering: allTrucks.filter(t => t.status === 'delivering').length,
    assigned: allTrucks.filter(t => t.status === 'assigned').length,
    uplifting: allTrucks.filter(t => t.status === 'uplifting').length,
    offline: allTrucks.filter(t => !t.telemetry?.online).length,
    completed: allTrucks.filter(t => t.status === 'completed').length,
  };

  const truckLossCounts = (fuelLossHistory ?? []).reduce((acc, loss) => {
    acc[loss.truckId] = (acc[loss.truckId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const trucksWithRepeatedLosses = Object.entries(truckLossCounts)
    .filter(([, count]) => count > 2)
    .sort(([, a], [, b]) => b - a);

  const securityEvents = allTrucks
    .flatMap(truck =>
      (truck.logs ?? [])
        .filter(log =>
          typeof log.msg === 'string' &&
          (log.msg.toLowerCase().includes('deviation') ||
            log.msg.toLowerCase().includes('restricted') ||
            log.msg.toLowerCase().includes('corridor')))
        .map(log => ({ ...log, truckName: truck.name ?? truck.id }))
    )
    .sort((a, b) => new Date(b.ts as any).getTime() - new Date(a.ts as any).getTime())
    .slice(0, 10);

  const handleExportCSV = () => {
    exportToCSV(fuelLossHistory ?? [], `fuel-loss-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const handlePrintReport = () => {
    printFuelLossReport(fuelLossHistory ?? []);
  };

  /** Retail Queue */
  const todayStops = useMemo(() => {
    const now = Date.now();
    return allTrucks
      .filter(t => (t.status === 'assigned' || t.status === 'delivering' || t.status === 'uplifting') && !!t.destination)
      .map(t => {
        const dest = t.destination!;
        const etaMs = estimateEtaMs(t);
        const lastUpdate = new Date(t.telemetry?.lastUpdate as any).getTime();
        const delay = Number.isFinite(lastUpdate) ? now - lastUpdate > 10 * 60 * 1000 : false;

        const exceptions: Array<'delay' | 'diversion' | 'risk'> = [];
        if (delay) exceptions.push('delay');
        const anyDeviation = (t.logs ?? []).some(l => typeof l.msg === 'string' && l.msg.toLowerCase().includes('deviation'));
        if (anyDeviation) exceptions.push('diversion');
        if (!t.telemetry?.online) exceptions.push('risk');

        const assigned = (t.compartments ?? []).map(c => ({
          compartmentId: c.id,
          liters:
            typeof c.targetDelivery === 'number'
              ? Math.max(0, c.targetDelivery)
              : Math.max(0, num(c.capacity) - num(c.currentLevel)),
          fuelType: c.fuelType,
        }));

        return {
          id: t.id,
          clientName: t.client ?? '—',
          siteAddress: dest.name,
          eta: new Date(now + etaMs),
          assigned,
          exceptions,
        };
      })
      .sort((a, b) => (a.eta as any) - (b.eta as any));
  }, [allTrucks]);

  const opsHighlights = useMemo(() => {
    return [
      { title: 'Idle vehicles', detail: `${statusCounts.idle}` },
      { title: 'Delivering', detail: `${statusCounts.delivering}` },
      { title: 'Uplifting', detail: `${statusCounts.uplifting}` },
    ];
  }, [statusCounts.idle, statusCounts.delivering, statusCounts.uplifting]);

  return (
    <DashboardLayout
      title="Operations Control Center"
      user={currentUser ?? { role: 'operator', name: 'Operator' }}
      onLogout={onLogout}
    >
      <div className="space-y-8">
        {/* 1) Fleet Status */}
        <FleetStatusSummary trucks={allTrucks} />

        {/* 2) Main grid: Map (2/3) + Control rail (1/3) */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="xl:col-span-2 space-y-8">
            <RetailQueue
              stops={todayStops as any}
              onSendUpdate={(id) => {
                console.log('[Operator] Send update to stop/truck:', id);
              }}
            />

            {/* Map */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="w-5 h-5" />
                  Fleet Operations Map
                </CardTitle>
                <CardDescription>Monitor routes and assign deliveries</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[32rem]">
                  <FleetMap trucks={allTrucks} userRole="operator" />
                </div>
              </CardContent>
            </Card>

            {/* Active Trips */}
            <Card>
              <CardHeader>
                <CardTitle>Active Trips</CardTitle>
                <CardDescription>Live trip status, compartments, and quick actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeTrucks.length === 0 && (
                    <div className="text-sm text-muted-foreground">No active trips.</div>
                  )}

                  {activeTrucks.map(truck => (
                    <div key={truck.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{truck.name ?? truck.id}</h4>
                          <p className="text-sm text-muted-foreground">Driver: {truck.driver ?? '--'}</p>
                          {truck.destination && (
                            <p className="text-xs text-muted-foreground">
                              Route: Start → {truck.destination.name}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={truck.telemetry?.online ? truck.status : 'offline'} />
                          <Badge variant="secondary">
                            {num(truck.telemetry?.speed).toFixed(0)} km/h
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                        {(truck.compartments ?? []).map(comp => (
                          <div key={comp.id} className="text-center p-2 bg-muted rounded">
                            <div className="text-xs text-muted-foreground">{comp.id}</div>
                            <div className="mb-1">
                              <CompartmentLevelBar
                                currentLevel={num(comp.currentLevel)}
                                capacity={num(comp.capacity, 1)}
                                isOffloading={!!comp.isOffloading}
                                className="h-2"
                              />
                            </div>
                            <div className="font-medium text-xs">{Math.round(num(comp.currentLevel))}L</div>
                            {comp.isOffloading && <div className="text-xs text-warning">Draining</div>}
                            {typeof comp.targetDelivery === 'number' && (
                              <div className="text-xs text-muted-foreground">Target: {comp.targetDelivery}L</div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          Call Driver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => handleAssignFromStatus(truck.id)}
                        >
                          <Route className="w-3 h-3" />
                          Reroute
                        </Button>
                        <Button variant="destructive" size="sm" className="flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Emergency Stop
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Status Overview</CardTitle>
                <CardDescription>Filter vehicles by status to monitor fleet availability</CardDescription>
              </CardHeader>
              <CardContent>
                {/* your existing filters + table go here */}
              </CardContent>
            </Card>
          </div>

          {/* Right rail */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Ops Snapshot</CardTitle>
                <CardDescription>Quick view of fleet activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded border">
                    <div className="text-2xl font-semibold">{statusCounts.idle}</div>
                    <div className="text-xs text-muted-foreground">Idle</div>
                  </div>
                  <div className="p-3 rounded border">
                    <div className="text-2xl font-semibold">{statusCounts.delivering}</div>
                    <div className="text-xs text-muted-foreground">Delivering</div>
                  </div>
                  <div className="p-3 rounded border">
                    <div className="text-2xl font-semibold">{statusCounts.uplifting}</div>
                    <div className="text-xs text-muted-foreground">Uplifting</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <AlertPanel alerts={unacknowledgedAlerts} onAcknowledge={acknowledgeAlert} showAll={true} />

            {/* Trip Assignment */}
            <Card id="trip-assignment">
              <CardHeader>
                <CardTitle>Assign New Trip</CardTitle>
                <CardDescription>Choose a truck and destination</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Select Truck</label>
                    <Select value={selectedTruck} onValueChange={setSelectedTruck}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose truck" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectableForAssignment.map(truck => (
                          <SelectItem key={truck.id} value={truck.id}>
                            {truck.name ?? truck.id} — {truck.driver ?? 'No driver'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectableForAssignment.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-2">No trucks available.</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Destination</label>
                    <Select value={selectedDestination} onValueChange={setSelectedDestination}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose destination" />
                      </SelectTrigger>
                      <SelectContent>
                        {destinations.map(dest => (
                          <SelectItem key={dest.id} value={dest.id}>
                            {dest.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleAssignTrip}
                      disabled={!selectedTruck || !selectedDestination}
                      className="w-full"
                    >
                      Assign Trip
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security & Zone Events */}
            <Card>
              <CardHeader>
                <CardTitle>Security & Zone Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {securityEvents.length === 0 && (
                    <p className="text-muted-foreground text-sm">No security events.</p>
                  )}
                  {securityEvents.map(ev => (
                    <div key={ev.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                      <div>
                        <span className="font-medium">{ev.truckName}</span>
                        <span className="text-muted-foreground ml-2">{ev.msg}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{fmtTime(ev.ts as any)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Fuel Events */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Fuel Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {allTrucks
                    .flatMap(truck => (truck.logs ?? []).map(log => ({ ...log, truckName: truck.name ?? truck.id })))
                    .sort((a, b) => new Date(b.ts as any).getTime() - new Date(a.ts as any).getTime())
                    .slice(0, 10)
                    .map(log => (
                      <div key={log.id} className="text-xs border-l-2 border-primary pl-2">
                        <div className="text-muted-foreground">
                          {fmtTime(log.ts as any)} — {log.truckName}
                        </div>
                        <div>{log.msg}</div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Trip Results & Fuel Loss Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Trip Results & Fuel Loss Analysis
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportCSV}>
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrintReport}>
                      <FileText className="w-4 h-4 mr-2" />
                      Print Report
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Recent Completions</h4>
                    <div className="space-y-2">
                      {allTrucks
                        .filter(t => !!t.lastTripSummary)
                        .slice(0, 5)
                        .map(t => (
                          <div key={t.id} className="flex items-center justify-between p-2 bg-muted rounded">
                            <div>
                              <span className="font-medium">{t.name ?? t.id}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                Assigned: {num(t.lastTripSummary!.assignedLiters)}L → Delivered{' '}
                                {num(t.lastTripSummary!.deliveredLiters).toFixed(1)}L
                              </span>
                            </div>
                            <Badge variant={num(t.lastTripSummary!.lossPercent) > 2 ? 'destructive' : 'secondary'}>
                              Loss: {num(t.lastTripSummary!.lossLiters).toFixed(1)}L (
                              {num(t.lastTripSummary!.lossPercent).toFixed(1)}%)
                            </Badge>
                          </div>
                        ))}
                      {allTrucks.filter(t => !!t.lastTripSummary).length === 0 && (
                        <div className="text-sm text-muted-foreground">No recent trip completions.</div>
                      )}
                    </div>
                  </div>

                  {trucksWithRepeatedLosses.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-orange-600">Trucks with Repeated Losses</h4>
                      <div className="space-y-1">
                        {trucksWithRepeatedLosses.slice(0, 3).map(([truckId, count]) => {
                          const truck = allTrucks.find(t => t.id === truckId);
                          return (
                            <div
                              key={truckId}
                              className="flex items-center justify-between text-sm p-2 bg-orange-50 rounded"
                            >
                              <span>{(truck && (truck.name ?? truck.id)) || truckId}</span>
                              <Badge variant="destructive">{count} loss events</Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <KnowledgeTrends highlights={opsHighlights} />
          </div>
        </div>

        {/* Monthly Fuel Chart (full width) */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Fuel Chart</CardTitle>
            <CardDescription>Consumption & deliveries trend</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="w-full h-[24rem] relative">
              <div className="absolute inset-0">
                <MonthlyFuelChart trucks={allTrucks} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compartment Details */}
        <Card>
          <CardHeader>
            <CardTitle>Compartment Details</CardTitle>
            <CardDescription>Inspect compartments for any vehicle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-1">
                <Select value={detailsTruckId} onValueChange={setDetailsTruckId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {allTrucks.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name ?? t.id} — {t.driver ?? 'No driver'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!detailsTruck ? (
              <div className="text-sm text-muted-foreground">No vehicle selected.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(detailsTruck.compartments ?? []).map((comp: any) => {
                  const cap = Math.max(1, num(comp.capacity, 1));
                  const cur = num(comp.currentLevel);
                  const pct = Math.min(100, Math.max(0, (cur / cap) * 100));
                  const progressColor = pct > 50 ? 'bg-success' : pct > 20 ? 'bg-warning' : 'bg-danger';

                  return (
                    <div key={comp.id} className="border border-border rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{comp.id}</span>
                        <span className="text-sm text-muted-foreground">{comp.fuelType ?? ''}</span>
                      </div>
                      <div className="w-full bg-muted-foreground/20 rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ease-out ${progressColor} ${comp.isOffloading ? 'animate-pulse' : ''}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Current</span>
                        <span>{Math.round(cur)}L</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Capacity</span>
                        <span>{cap}L</span>
                      </div>
                      {typeof comp.deliveredLiters === 'number' && comp.deliveredLiters > 0 && (
                        <div className="flex justify-between text-sm text-success">
                          <span>Delivered</span>
                          <span>{num(comp.deliveredLiters)}L</span>
                        </div>
                      )}
                      {typeof comp.targetDelivery === 'number' && (
                        <div className="text-xs text-muted-foreground mt-1">Target: {num(comp.targetDelivery)}L</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default OperatorDashboard;
