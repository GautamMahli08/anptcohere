import React, { useEffect, useMemo, useState } from 'react';
import { Truck, Alert, UserRole, FuelLossHistory } from '@/types/truck';
import DashboardLayout from './DashboardLayout';
import FleetMap from '../FleetMap';
import FleetStatusSummary from '../FleetStatusSummary';
import MonthlyFuelChart from '../MonthlyFuelChart';
import StatusBadge from '../StatusBadge';
import SpeedGauge from '../SpeedGauge';
import RetailPanel from '../RetailPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight, Truck as TruckIcon, Fuel, MapPin, AlertCircle } from 'lucide-react';

/** Retail additions */
import RetailKPIs from '@/components/retail/RetailKPIs';
import DeliveryHistoryTable from '@/components/retail/DeliveryHistoryTable';
import KnowledgeTrends from '@/components/retail/KnowledgeTrends';
import type { RetailDelivery } from '@/types/retail';

/** listen to simulation notifications */
import { eventBus } from '@/lib/socket';

/** NEW: truck selector for Compartment Details */
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

interface ClientDashboardProps {
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

/** ---- Safe helpers ---- */
const fmtTime = (d?: Date | string | number) => {
  if (!d) return '--';
  if (d instanceof Date) return d.toLocaleTimeString();
  const dd = new Date(d);
  return Number.isNaN(dd.getTime()) ? '--' : dd.toLocaleTimeString();
};
const fmtDateTime = (d?: Date | string | number) => {
  if (!d) return '--';
  if (d instanceof Date) return d.toLocaleString();
  const dd = new Date(d);
  return Number.isNaN(dd.getTime()) ? '--' : dd.toLocaleString();
};
const num = (v: unknown, fallback = 0) =>
  typeof v === 'number' && !Number.isNaN(v) ? v : fallback;

const clampPct = (v: number) => Math.max(0, Math.min(100, v));

/** type for the event payload emitted by the simulator */
type RetailCompletedEvent = {
  truckId: string;
  stopName?: string;
  assignedLiters: number;
  deliveredLiters: number;
  lossLiters: number;
  at: number; // epoch ms
};

const ClientDashboard = ({
  trucks,
  alerts,
  fuelConsumptionData,
  fuelLossHistory,
  currentUser,
  onLogout,
}: ClientDashboardProps) => {
  const [expandedVehicles, setExpandedVehicles] = useState<Set<string>>(new Set());
  const [deliveries, setDeliveries] = useState<RetailDelivery[]>([]);
  const [detailsTruckId, setDetailsTruckId] = useState<string>(trucks[0]?.id ?? '');

  const clientTrucks = Array.isArray(trucks) ? trucks : [];
  const clientAlerts = Array.isArray(alerts) ? alerts : [];

  const detailsTruck =
    clientTrucks.find(t => t.id === detailsTruckId) || clientTrucks[0] || null;

  const toggleVehicleExpansion = (vehicleId: string) => {
    const next = new Set(expandedVehicles);
    next.has(vehicleId) ? next.delete(vehicleId) : next.add(vehicleId);
    setExpandedVehicles(next);
  };

  /** Totals derived from active targets & delivered liters (per-compartment capped) */
  const {
    expectedLiters,
    deliveredLiters,
    lossPercent,
    progressPct,
    overUnderLiters,
  } = useMemo(() => {
    let expected = 0;
    let delivered = 0;

    for (const t of clientTrucks) {
      const comps = Array.isArray(t.compartments) ? t.compartments : [];
      for (const cAny of comps as any[]) {
        const target = num(cAny?.targetDelivery);
        if (target > 0) {
          const dl = num(cAny?.deliveredLiters);
          expected += target;
          delivered += Math.min(dl, target);
        }
      }
    }

    const progress = expected > 0 ? Math.min(100, (delivered / expected) * 100) : 0;
    const lossL = Math.max(0, expected - delivered);
    const lossP = expected > 0 ? Math.min(100, (lossL / expected) * 100) : 0;

    return {
      expectedLiters: expected,
      deliveredLiters: delivered,
      lossPercent: lossP,
      progressPct: progress,
      overUnderLiters: Math.max(0, delivered - expected),
    };
  }, [clientTrucks]);

  /** Build/merge delivery rows from trucks' lastTripSummary */
  useEffect(() => {
    const discovered: RetailDelivery[] = [];
    clientTrucks.forEach((t) => {
      const lt = t.lastTripSummary;
      if (!lt?.completedAt) return;
      const ts = new Date(lt.completedAt as any);
      if (Number.isNaN(ts.getTime())) return;
      const id = `${t.id}-${ts.getTime()}`;

      discovered.push({
        id,
        clientName: t.client ?? 'Client',
        siteAddress: (lt as any).destinationName ?? t.destination?.name ?? '—',
        assignedLiters: num(lt.assignedLiters),
        deliveredLiters: num(lt.deliveredLiters),
        deliveryTs: ts,
        confirmedByClient: false,
        disputeStatus: 'none',
      });
    });

    setDeliveries((prev) => {
      const map = new Map(prev.map((d) => [d.id, d]));
      for (const d of discovered) {
        if (!map.has(d.id)) {
          map.set(d.id, d);
        }
      }
      return Array.from(map.values()).sort((a, b) => b.deliveryTs.getTime() - a.deliveryTs.getTime());
    });
  }, [clientTrucks]);

  /** Live update on retail:completed */
  useEffect(() => {
    const onCompleted = (ev: RetailCompletedEvent) => {
      const id = `${ev.truckId}-${ev.at}`;
      setDeliveries((prev) => {
        if (prev.some((p) => p.id === id)) return prev; // de-dupe
        const t = clientTrucks.find((x) => x.id === ev.truckId);
        const row: RetailDelivery = {
          id,
          clientName: t?.client ?? 'Client',
          siteAddress: ev.stopName ?? (t?.lastTripSummary as any)?.destinationName ?? '—',
          assignedLiters: Math.round(num(ev.assignedLiters)),
          deliveredLiters: Math.round(num(ev.deliveredLiters)),
          deliveryTs: new Date(ev.at),
          confirmedByClient: false,
          disputeStatus: 'none',
        };
        return [row, ...prev].sort((a, b) => b.deliveryTs.getTime() - a.deliveryTs.getTime());
      });
    };

    eventBus.on('retail:completed', onCompleted);
    return () => {
      eventBus.off('retail:completed', onCompleted);
    };
  }, [clientTrucks]);

  /** Knowledge highlights */
  const knowledgeHighlights = useMemo(() => {
    const totalRows = deliveries.length;
    const avgLoss =
      totalRows === 0
        ? 0
        : clampPct(
            Math.max(
              0,
              (deliveries.reduce(
                (s, d) =>
                  s +
                  Math.max(0, (d.assignedLiters - d.deliveredLiters) / Math.max(1, d.assignedLiters)),
                0
              ) / totalRows) * 100
            )
          );

    const confirmed = deliveries.filter((d) => d.confirmedByClient).length;

    return [
      { title: 'Average loss% (recent)', detail: `${avgLoss.toFixed(1)}% over ${totalRows} deliveries` },
      { title: 'Client confirmations', detail: `${confirmed}/${totalRows} confirmed` },
      { title: 'On-time trend', detail: 'Stable (simulated)' },
    ];
  }, [deliveries]);

  /** Derived labels for Delivery Verification card */
  const progressBarClass = 'bg-success';
  const overUnderLabel =
    overUnderLiters > 0
      ? `Over-delivery by ${(overUnderLiters / 1000).toFixed(1)}K L`
      : expectedLiters > deliveredLiters
      ? `Shortfall of ${((expectedLiters - deliveredLiters) / 1000).toFixed(1)}K L`
      : 'Matched exactly';

  return (
    <DashboardLayout
      title="Client Fleet Dashboard"
      user={currentUser ?? { role: 'client', name: 'User' }}
      onLogout={onLogout}
    >
      <div className="space-y-8">
        {/* Fleet Status */}
        <FleetStatusSummary trucks={clientTrucks} />

        {/* Retail KPIs */}
        <RetailKPIs orderedLiters={expectedLiters} deliveredLiters={deliveredLiters} lossPercent={lossPercent} />

        {/* Map + Retail Lens */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Your Fleet Tracking</CardTitle>
              <CardDescription>Track deliveries to your stations</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[32rem]">
                <FleetMap trucks={clientTrucks} userRole="client" />
              </div>
            </CardContent>
          </Card>

          <Card className="h-[32rem]">
            <CardHeader>
              <CardTitle>Retail Lens</CardTitle>
              <CardDescription>Order mix & delivery readiness</CardDescription>
            </CardHeader>
            <CardContent className="h-[26rem] p-0">
              <div className="w-full h-full">
                <RetailPanel trucks={clientTrucks} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Fuel Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Fuel Chart</CardTitle>
            <CardDescription>Consumption & deliveries trend</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="w-full h-[24rem] relative">
              <div className="absolute inset-0">
                <MonthlyFuelChart trucks={clientTrucks} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery History & Knowledge */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <DeliveryHistoryTable
              deliveries={deliveries}
              onConfirmReceived={(id) =>
                setDeliveries((prev) => prev.map((d) => (d.id === id ? { ...d, confirmedByClient: true } : d)))
              }
              onOpenDispute={(id) => {
                const note = window.prompt('Describe the issue (shortfall, tampering, delay, etc.):')?.trim();
                if (note) {
                  setDeliveries((prev) =>
                    prev.map((d) => (d.id === id ? { ...d, disputeStatus: 'open', disputeNote: note } : d))
                  );
                }
              }}
            />
          </div>
          <div>
            <KnowledgeTrends highlights={knowledgeHighlights} />
          </div>
        </div>

        {/* All Vehicles */}
        <Card>
          <CardHeader>
            <CardTitle>All Vehicles</CardTitle>
            <CardDescription>Complete fleet overview with detailed information</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Speed</TableHead>
                  <TableHead>Fuel Flow</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Alerts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientTrucks.map((truck) => {
                  const isExpanded = expandedVehicles.has(truck.id);
                  const vehicleAlerts = clientAlerts.filter((a) => a.truckId === truck.id);

                  return (
                    <React.Fragment key={truck.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleVehicleExpansion(truck.id)}
                      >
                        <TableCell>
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TruckIcon className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{truck.name ?? 'Truck'}</div>
                              <div className="text-xs text-muted-foreground">{truck.id}</div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>{truck.driver ?? '--'}</TableCell>

                        <TableCell>
                          <StatusBadge status={truck.telemetry?.online ? (truck.status ?? 'idle') : 'offline'} />
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <SpeedGauge
                              speed={num(truck.telemetry?.speed)}
                              size={24}
                              heading={num(truck.telemetry?.heading)}
                            />
                            <span className="text-sm">{num(truck.telemetry?.speed)} km/h</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Fuel className="h-3 w-3" />
                            <span className="text-sm">{num(truck.telemetry?.fuelFlow).toFixed(1)} L/h</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-xs text-muted-foreground">
                            {typeof truck?.position?.lat === 'number' && typeof truck?.position?.lng === 'number'
                              ? `${truck.position.lat.toFixed(4)}, ${truck.position.lng.toFixed(4)}`
                              : '--'}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="text-sm">{truck.destination?.name ?? 'No destination'}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          {vehicleAlerts.length > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {vehicleAlerts.length}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={9} className="p-0">
                            {/* expanded row content unchanged */}
                            <div className="p-4 bg-muted/30 border-t">
                              {/* ... your existing expanded panels ... */}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Bottom 2x2 panels (unchanged) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Delivery Verification */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Verification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Expected:</span>
                  <span className="font-medium">{(expectedLiters / 1000).toFixed(1)}K L</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Delivered:</span>
                  <span className="font-medium text-success">{(deliveredLiters / 1000).toFixed(1)}K L</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Progress:</span>
                  <span className="font-medium">{progressPct.toFixed(1)}%</span>
                </div>
                <div className="text-xs text-muted-foreground">{overUnderLabel}</div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${progressBarClass}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Alerts */}
          <Card className={clientAlerts.length > 0 ? 'border-warning/50' : ''}>
            <CardHeader>
              <CardTitle className={clientAlerts.length > 0 ? 'text-warning' : ''}>Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {clientAlerts.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No active alerts.</div>
                ) : (
                  clientAlerts.slice(0, 6).map((alert) => (
                    <div key={alert.id} className="text-sm p-2 bg-warning/10 rounded border border-warning/20">
                      <div className="font-medium">{alert.message}</div>
                      <div className="text-xs text-muted-foreground">{fmtTime(alert.timestamp as any)}</div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Fuel Events */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Fuel Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {clientTrucks
                  .flatMap((truck) => (truck.logs ?? []).map((log) => ({ ...log, truckName: truck.name ?? 'Truck' })))
                  .sort((a, b) => new Date(b.ts as any).getTime() - new Date(a.ts as any).getTime())
                  .slice(0, 8)
                  .map((log) => (
                    <div key={log.id} className="text-xs border-l-2 border-primary pl-2">
                      <div className="text-muted-foreground">
                        {fmtTime(log.ts as any)} - {log.truckName}
                      </div>
                      <div>{log.msg ?? ''}</div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Request Trip */}
          <Card>
            <CardHeader>
              <CardTitle>Request Delivery</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Fuel Type</label>
                  <select className="w-full mt-1 p-2 bg-background border border-border rounded" defaultValue="Diesel">
                    <option>Diesel</option>
                    <option>Petrol</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Quantity (L)</label>
                  <input
                    type="number"
                    className="w-full mt-1 p-2 bg-background border border-border rounded"
                    placeholder="5000"
                    min={0}
                  />
                </div>
                <Button className="w-full" variant="outline">
                  Request Delivery
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* NEW: Compartment Details for Client view */}
        <Card>
          <CardHeader>
            <CardTitle>Compartment Details</CardTitle>
            <CardDescription>Inspect compartments for a specific vehicle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-1">
                <Select value={detailsTruck?.id ?? ''} onValueChange={setDetailsTruckId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientTrucks.map(t => (
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
                  const pct = clampPct((cur / cap) * 100);
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

export default ClientDashboard;
