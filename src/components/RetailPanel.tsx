import React, { useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Truck as TruckIcon, AlertTriangle } from 'lucide-react';
import { Truck as TruckType } from '@/types/truck';
import { eventBus } from '@/lib/socket';

type StopStatus = 'pending' | 'delivering' | 'draining' | 'completed';

interface RetailStop {
  key: string;
  name: string;
  assigned: number;     // target (sum of targetDelivery across compartments)
  delivered: number;    // sum of deliveredLiters across compartments (if present)
  loss: number;         // max(0, assigned - delivered)
  status: StopStatus;
  podTimestamp?: Date;
}

interface RetailPanelProps {
  trucks: TruckType[];
  onConfirmReceived?: (stopKey: string) => void;
}

const num = (v: unknown, f = 0) =>
  typeof v === 'number' && !Number.isNaN(v) ? v : f;

const RetailPanel = ({ trucks, onConfirmReceived }: RetailPanelProps) => {
  /** Build dynamic stops from truck state (assigned/delivering/draining/completed) */
  const retailStops = useMemo<RetailStop[]>(() => {
    const list = (trucks ?? []).filter(
      (t) =>
        t.destination ||                     // actively headed to a site
        (t.compartments ?? []).some(c => c.isOffloading) || // on-site draining
        t.telemetry?.valveStatus ||          // valve open = draining
        t.lastTripSummary                    // recently finished
    );

    return list.map((t) => {
      const name = t.destination?.name ?? t.lastTripSummary?.destinationName ?? t.client ?? 'Site';
      const comps = Array.isArray(t.compartments) ? t.compartments : [];

      // Assigned target = sum of targetDelivery (if any)
      const assigned = comps.reduce((s, c) => s + Math.max(0, num(c.targetDelivery)), 0);

      // Delivered = sum of deliveredLiters (if tracked); fallback 0
      const delivered = comps.reduce((s, c) => s + Math.max(0, num((c as any).deliveredLiters)), 0);

      // Status
      const draining = !!t.telemetry?.valveStatus || comps.some((c) => !!c.isOffloading);
      let status: StopStatus = 'pending';
      if (draining) status = 'draining';
      else if (t.destination && (t.status === 'assigned' || t.status === 'delivering')) status = 'delivering';
      else if (t.lastTripSummary?.completedAt) status = 'completed';

      const loss = Math.max(0, assigned - delivered);

      return {
        key: t.id,
        name,
        assigned,
        delivered,
        loss,
        status,
        podTimestamp: t.lastTripSummary?.completedAt as any,
      };
    });
  }, [trucks]);

  /** Emit notifications when a stop changes status (delivering → draining → completed) */
  const prevStatusRef = useRef<Record<string, StopStatus>>({});
  useEffect(() => {
    const prev = prevStatusRef.current;
    retailStops.forEach((s) => {
      const before = prev[s.key];
      if (before !== s.status) {
        // basic transition notifications
        if (s.status === 'delivering') {
          eventBus.emit('retail:delivering', {
            stopKey: s.key,
            stopName: s.name,
            targetLiters: s.assigned,
            at: Date.now(),
          });
        }
        if (s.status === 'draining') {
          eventBus.emit('retail:draining', {
            stopKey: s.key,
            stopName: s.name,
            targetLiters: s.assigned,
            deliveredLiters: s.delivered,
            at: Date.now(),
          });
        }
        if (s.status === 'completed') {
          eventBus.emit('retail:completed', {
            stopKey: s.key,
            stopName: s.name,
            targetLiters: s.assigned,
            deliveredLiters: s.delivered,
            lossLiters: s.loss,
            at: Date.now(),
          });
        }
      }
      prev[s.key] = s.status;
    });
  }, [retailStops]);

  const handleConfirmReceived = (stop: RetailStop) => {
    const timestamp = new Date();
    eventBus.emit('retail:confirmed', {
      stopKey: stop.key,
      stopName: stop.name,
      timestamp,
    });
    onConfirmReceived?.(stop.key);
  };

  const getStatusIcon = (status: StopStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'delivering':
        return <TruckIcon className="w-4 h-4 text-primary" />;
      case 'draining':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: StopStatus) => {
    const variants = {
      pending: 'secondary' as const,
      delivering: 'default' as const,
      draining: 'outline' as const,
      completed: 'default' as const,
    };
    return (
      <Badge variant={variants[status]} className="text-xs">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-retail" />
          Retail Stations
          <Badge variant="outline" className="text-retail border-retail/20 bg-retail/10 text-xs ml-2">
            Retail
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {retailStops.length === 0 ? (
          <div className="text-sm text-muted-foreground">No retail deliveries in progress.</div>
        ) : (
          <div className="space-y-4">
            {retailStops.map((stop) => (
              <div
                key={stop.key}
                className="flex items-center justify-between p-3 border border-border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(stop.status)}
                  <div>
                    <h4 className="font-medium text-sm">{stop.name}</h4>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span>Target: {Math.round(stop.assigned)}L</span>
                      <span>Delivered: {Math.round(stop.delivered)}L</span>
                      {stop.loss > 0 && <span className="text-destructive">Loss: {Math.round(stop.loss)}L</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(stop.status)}

                  {/* Optional client POD confirmation (only if no completedAt persisted) */}
                  {stop.status === 'completed' && !stop.podTimestamp && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleConfirmReceived(stop)}
                      className="text-xs"
                    >
                      Confirm Received
                    </Button>
                  )}

                  {stop.podTimestamp && (
                    <div className="text-xs text-success flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      POD: {new Date(stop.podTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RetailPanel;
