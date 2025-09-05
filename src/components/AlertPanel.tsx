import React from 'react';
import { Alert } from '@/types/truck';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Shield,
  WifiOff,
  RotateCcw,
  Settings,
  MapPin,
} from 'lucide-react';

interface AlertPanelProps {
  alerts: Alert[];
  onAcknowledge: (alertId: string) => void;
  showAll?: boolean;
}

/** Explicit styles so Tailwind doesn't purge them */
const SEVERITY_STYLES: Record<
  'critical' | 'high' | 'medium' | 'low' | 'default',
  { bg: string; border: string; text: string }
> = {
  critical: { bg: 'bg-danger/10',      border: 'border-danger/20',      text: 'text-danger' },
  high:     { bg: 'bg-destructive/10', border: 'border-destructive/20', text: 'text-destructive' },
  medium:   { bg: 'bg-warning/10',     border: 'border-warning/20',     text: 'text-warning' },
  low:      { bg: 'bg-secondary/10',   border: 'border-secondary/20',   text: 'text-secondary-foreground' },
  default:  { bg: 'bg-secondary/10',   border: 'border-secondary/20',   text: 'text-secondary-foreground' },
};

const getAlertIcon = (type: string) => {
  switch (type) {
    case 'theft':
      return <Shield className="w-4 h-4" />;
    case 'tampering':
      return <Settings className="w-4 h-4" />;
    case 'offline':
      return <WifiOff className="w-4 h-4" />;
    case 'tilt':
      return <RotateCcw className="w-4 h-4" />;
    case 'route_deviation':
      return <MapPin className="w-4 h-4" />;
    default:
      return <AlertTriangle className="w-4 h-4" />;
  }
};

/** Safe date → time string */
const formatTime = (ts: unknown) => {
  const d =
    ts instanceof Date ? ts :
    typeof ts === 'string' || typeof ts === 'number' ? new Date(ts) :
    null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const AlertPanel = ({ alerts, onAcknowledge, showAll = false }: AlertPanelProps) => {
  const displayedAlerts = showAll ? alerts : alerts.slice(0, 5);

  if (!alerts || alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-success">
            <Shield className="w-5 h-5" />
            All Clear
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <Shield className="w-6 h-6 text-success" />
            </div>
            <p className="text-sm text-muted-foreground">No active alerts</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-warning/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-warning">
          <AlertTriangle className="w-5 h-5" />
          Active Alerts ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {displayedAlerts.map((alert) => {
            const sev =
              SEVERITY_STYLES[
                (alert.severity as keyof typeof SEVERITY_STYLES) ?? 'default'
              ] ?? SEVERITY_STYLES.default;

            const container = alert.acknowledged
              ? 'bg-muted/50 border-border opacity-60'
              : `${sev.bg} ${sev.border}`;

            const iconColor = alert.acknowledged ? 'text-muted-foreground' : sev.text;
            const textColor = alert.acknowledged ? 'text-muted-foreground' : 'text-foreground';
            const badgeText = alert.acknowledged ? 'text-muted-foreground' : sev.text;

            return (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border transition-all duration-300 ${container}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    <div className={`mt-0.5 ${iconColor}`}>{getAlertIcon(alert.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${textColor}`}>{alert.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatTime((alert as any).timestamp)}
                        </span>
                        <Badge variant="outline" className={`text-xs capitalize ${badgeText}`}>
                          {String(alert.severity ?? 'low')}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {!alert.acknowledged && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAcknowledge(alert.id)}
                      className="shrink-0 text-xs px-2 py-1 h-auto"
                    >
                      Ack
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {!showAll && alerts.length > 5 && (
            <div className="text-center pt-2">
              <span className="text-xs text-muted-foreground">
                +{alerts.length - 5} more alerts
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AlertPanel;
