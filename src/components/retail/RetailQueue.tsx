import React from 'react';
import { RetailStop } from '@/types/retail';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const ExcBadge = ({ type }: { type: 'delay' | 'diversion' | 'risk' }) => {
  const map = {
    delay: { label: 'Delay', v: 'warning' as const },
    diversion: { label: 'Diversion', v: 'outline' as const },
    risk: { label: 'Risk', v: 'destructive' as const },
  };
  const m = map[type];
  return <Badge variant={m.v} className="text-xs">{m.label}</Badge>;
};

export default function RetailQueue({
  stops,
  onSendUpdate,
}: {
  stops: RetailStop[];
  onSendUpdate?: (stopId: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Retail Queue — Today</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stops.map(s => (
          <div key={s.id} className="border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{s.clientName}</div>
                <div className="text-xs text-muted-foreground">{s.siteAddress}</div>
                <div className="text-xs text-muted-foreground">
                  ETA: {new Date(s.eta).toLocaleTimeString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(s.exceptions ?? []).map(e => <ExcBadge key={e} type={e} />)}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
              {s.assigned.map(a => (
                <div key={a.compartmentId} className="text-xs border rounded p-2">
                  <div className="flex justify-between">
                    <span className="font-medium">{a.compartmentId}</span>
                    <span className="text-muted-foreground">{a.fuelType ?? ''}</span>
                  </div>
                  <div className="font-semibold">{a.liters.toLocaleString()} L</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-right">
              <Button size="sm" variant="outline" onClick={() => onSendUpdate?.(s.id)}>
                Send Update
              </Button>
            </div>
          </div>
        ))}
        {stops.length === 0 && (
          <div className="text-sm text-muted-foreground">No scheduled retail stops for today.</div>
        )}
      </CardContent>
    </Card>
  );
}
