import React, { useMemo, useState } from 'react';
import { Truck, Alert, FuelLossHistory, UserRole } from '@/types/truck';
import DashboardLayout from './DashboardLayout';
import FleetMap from '../FleetMap';
import KPIGrid from '../KPIGrid';
import AlertPanel from '../AlertPanel';
import FleetStatusSummary from '../FleetStatusSummary';
import MonthlyFuelChart from '../MonthlyFuelChart';
import StatusBadge from '../StatusBadge';
import SpeedGauge from '../SpeedGauge';
import RetailLensToggle from '../RetailLensToggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Activity, DollarSign, Download, FileText } from 'lucide-react';
import { exportToCSV, printFuelLossReport } from '@/utils/export';
import { format } from 'date-fns';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

interface ManagerDashboardProps {
  trucks: Truck[];
  alerts: Alert[];
  totalSavings: number;
  fuelConsumptionData: Array<{ timestamp: Date; truckId: string; liters: number }>;
  fuelLossHistory: FuelLossHistory[];
  acknowledgeAlert: (alertId: string) => void;
  assignTrip: (truckId: string, destination: { lat: number; lng: number; name: string }) => void;
  currentUser: { role: UserRole; name: string };
  onLogout: () => void;
}

/** safe helpers */
const num = (v: unknown, fallback = 0) =>
  typeof v === 'number' && !Number.isNaN(v) ? v : fallback;
const clampPct = (v: number) => Math.min(100, Math.max(0, v));

const ManagerDashboard = ({
  trucks,
  alerts,
  totalSavings,
  fuelLossHistory,
  fuelConsumptionData,
  acknowledgeAlert,
  currentUser,
  onLogout,
}: ManagerDashboardProps) => {
  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);
  const securityUptime = 99.2;
  const theftRate = 0.03;
  const monthlyLiters = trucks.reduce(
    (total, truck) => total + truck.compartments.reduce((sum, comp) => sum + num(comp.currentLevel), 0),
    0
  );

  const [detailsTruckId, setDetailsTruckId] = useState<string>(trucks[0]?.id ?? '');
  const detailsTruck =
    trucks.find(t => t.id === detailsTruckId) || trucks[0] || null;

  const kpis = [
    { label: 'Security Uptime', value: `${securityUptime}%`, trend: 'up' as const, color: 'success' as const },
    { label: 'Theft Rate', value: `${theftRate}%`, trend: 'down' as const, color: 'success' as const },
    { label: 'Monthly Liters', value: `${Math.round(monthlyLiters / 1000)}K`, unit: 'L', trend: 'up' as const, color: 'primary' as const },
    { label: 'Total Savings', value: `₹${(totalSavings / 100000).toFixed(1)}L`, trend: 'up' as const, color: 'warning' as const },
  ];

  return (
    <DashboardLayout
      title="Fleet Management Center"
      user={currentUser}
      onLogout={onLogout}
    >
      <div className="space-y-8">
        {/* Header with Retail Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Fleet Overview</h1>
            <p className="text-muted-foreground">Complete operational visibility</p>
          </div>
          <div className="flex gap-2">
            <RetailLensToggle />
            <Button variant="outline" size="sm" onClick={() => exportToCSV(fuelLossHistory, 'fleet-data')}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => printFuelLossReport(fuelLossHistory)}>
              <FileText className="w-4 h-4 mr-2" />
              Print Report
            </Button>
          </div>
        </div>

        {/* Fleet Status Summary */}
        <FleetStatusSummary trucks={trucks} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Map + Chart */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="h-96">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Live Fleet Tracking
                </CardTitle>
                <CardDescription>Real-time positions and delivery status</CardDescription>
              </CardHeader>
              <CardContent className="p-0 h-80">
                <FleetMap trucks={trucks} userRole="manager" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Fuel Chart</CardTitle>
                <CardDescription>Consumption & deliveries trend</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="w-full h-[24rem] relative">
                  <div className="absolute inset-0">
                    <MonthlyFuelChart trucks={trucks} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel */}
          <div className="space-y-8">
            <Card className="bg-amber-50 border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <DollarSign className="w-5 h-5" />
                  Live Savings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-800">
                  ${(totalSavings / 100000).toFixed(2)}L
                </div>
                <div className="text-sm text-amber-700/80">
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  +${Math.floor(Math.random() * 1000)} this hour
                </div>
              </CardContent>
            </Card>

            <AlertPanel
              alerts={unacknowledgedAlerts.slice(0, 5)}
              onAcknowledge={acknowledgeAlert}
              showAll={false}
            />

            {/* Active Deliveries (unchanged) */}
            <Card>
              <CardHeader>
                <CardTitle>Active Deliveries</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {trucks.filter(t => t.status === 'delivering').map(truck => (
                  <div key={truck.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium">{truck.name}</div>
                        <div className="text-sm text-muted-foreground">{truck.driver}</div>
                        {truck.destination && truck.startPoint && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Route: START → {truck.destination.name}
                          </div>
                        )}
                      </div>
                      <StatusBadge status={truck.telemetry.online ? truck.status : 'offline'} />
                    </div>
                    <div className="flex items-center justify-between">
                      <SpeedGauge speed={num(truck.telemetry.speed)} size={60} heading={num(truck.telemetry.heading)} />
                      <div className="text-right text-sm">
                        <div>Tilt: {num(truck.telemetry.tilt).toFixed(1)}°</div>
                        <div>Valve: {truck.telemetry.valveStatus ? 'Open' : 'Closed'}</div>
                      </div>
                    </div>

                    {/* Compartment mini-bars */}
                    <div className="grid grid-cols-4 gap-1 mt-2">
                      {truck.compartments.map(comp => {
                        const percentage = clampPct((num(comp.currentLevel) / Math.max(1, num(comp.capacity, 1))) * 100);
                        const progressColor =
                          percentage > 50 ? 'bg-success' : percentage > 20 ? 'bg-warning' : 'bg-danger';
                        return (
                          <div key={comp.id} className="text-center">
                            <div className="text-xs">{comp.id}</div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-500 ease-out ${progressColor} ${
                                  comp.isOffloading ? 'animate-pulse' : ''
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <div className="text-xs">{Math.round(num(comp.currentLevel))}L</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {trucks.filter(t => t.status === 'delivering').length === 0 && (
                  <div className="text-sm text-muted-foreground">No active deliveries right now.</div>
                )}
              </CardContent>
            </Card>

            {/* All Vehicles Overview */}
            <Card>
              <CardHeader>
                <CardTitle>All Vehicles</CardTitle>
                <CardDescription>Complete fleet status overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2 font-medium">Vehicle</th>
                          <th className="text-left p-2 font-medium">Driver</th>
                          <th className="text-left p-2 font-medium">Client</th>
                          <th className="text-left p-2 font-medium">Status</th>
                          <th className="text-left p-2 font-medium">Speed</th>
                          <th className="text-left p-2 font-medium">Location</th>
                          <th className="text-left p-2 font-medium">Last Update</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trucks.map(truck => (
                          <tr key={truck.id} className="border-t hover:bg-muted/50">
                            <td className="p-2 font-medium">{truck.name}</td>
                            <td className="p-2 text-muted-foreground">{truck.driver}</td>
                            <td className="p-2 text-muted-foreground">{truck.client}</td>
                            <td className="p-2">
                              <StatusBadge status={truck.telemetry.online ? truck.status : 'offline'} />
                            </td>
                            <td className="p-2 text-muted-foreground">
                              {truck.telemetry.online ? `${num(truck.telemetry.speed)} km/h` : '—'}
                            </td>
                            <td className="p-2 text-muted-foreground text-xs">
                              {truck.position.lat.toFixed(4)}, {truck.position.lng.toFixed(4)}
                            </td>
                            <td className="p-2 text-muted-foreground">
                              {truck.telemetry.online ? format(truck.telemetry.lastUpdate, 'HH:mm:ss') : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* NEW: Compartment Details (for any truck) */}
        <Card>
          <CardHeader>
            <CardTitle>Compartment Details</CardTitle>
            <CardDescription>Select a vehicle to inspect individual compartments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-1">
                <Select value={detailsTruck?.id ?? ''} onValueChange={setDetailsTruckId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {trucks.map(t => (
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

export default ManagerDashboard;
