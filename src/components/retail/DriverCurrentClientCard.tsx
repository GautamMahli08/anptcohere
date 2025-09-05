import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DriverCurrentClientCard({
  clientName,
  siteAddress,
  targets, // [{compartmentId, liters}]
  canStart,
  canConfirm,
  onStart,
  onConfirm,
}: {
  clientName: string;
  siteAddress: string;
  targets: Array<{ compartmentId: string; liters: number }>;
  canStart: boolean;
  canConfirm: boolean;
  onStart?: () => void;
  onConfirm?: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Client</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="font-medium">{clientName}</div>
          <div className="text-sm text-muted-foreground">{siteAddress}</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {targets.map(t => (
            <div key={t.compartmentId} className="border rounded p-2 text-xs">
              <div className="font-medium">{t.compartmentId}</div>
              <div className="text-muted-foreground">Target</div>
              <div className="font-semibold">{t.liters.toLocaleString()} L</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button className="flex-1" onClick={onStart} disabled={!canStart}>Start Offload</Button>
          <Button variant="outline" className="flex-1" onClick={onConfirm} disabled={!canConfirm}>
            Confirm Offload
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
