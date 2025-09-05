import React from 'react';
import { RetailDelivery } from '@/types/retail';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function DeliveryHistoryTable({
  deliveries,
  onConfirmReceived,
  onOpenDispute,
}: {
  deliveries: RetailDelivery[];
  onConfirmReceived?: (id: string) => void;
  onOpenDispute?: (id: string) => void;
}) {
  const lossPct = (d: RetailDelivery) =>
    d.assignedLiters > 0 ? Math.max(0, ((d.assignedLiters - d.deliveredLiters) / d.assignedLiters) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery History</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">Client</th>
              <th className="text-left p-2">Site</th>
              <th className="text-right p-2">Assigned</th>
              <th className="text-right p-2">Delivered</th>
              <th className="text-right p-2">Loss %</th>
              <th className="text-left p-2">Status</th>
              <th className="text-right p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map(d => (
              <tr key={d.id} className="border-t">
                <td className="p-2">{new Date(d.deliveryTs).toLocaleString()}</td>
                <td className="p-2">{d.clientName}</td>
                <td className="p-2">{d.siteAddress}</td>
                <td className="p-2 text-right">{d.assignedLiters.toLocaleString()} L</td>
                <td className="p-2 text-right text-success">{d.deliveredLiters.toLocaleString()} L</td>
                <td className="p-2 text-right">{lossPct(d).toFixed(1)}%</td>
                <td className="p-2">
                  <div className="flex gap-2 items-center">
                    {d.confirmedByClient ? (
                      <Badge variant="secondary">Confirmed</Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                    {d.disputeStatus !== 'none' && (
                      <Badge variant={d.disputeStatus === 'open' ? 'destructive' : 'secondary'}>
                        {d.disputeStatus}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="p-2 text-right">
                  <div className="flex gap-2 justify-end">
                    {!d.confirmedByClient && (
                      <Button size="sm" onClick={() => onConfirmReceived?.(d.id)}>
                        Confirm Received
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => onOpenDispute?.(d.id)}>
                      Dispute
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {deliveries.length === 0 && (
              <tr>
                <td className="p-4 text-center text-muted-foreground" colSpan={8}>
                  No deliveries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
