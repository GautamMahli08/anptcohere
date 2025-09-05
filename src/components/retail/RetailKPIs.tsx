import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function RetailKPIs({
  orderedLiters,
  deliveredLiters,
  lossPercent, // 0..100
}: {
  orderedLiters: number;
  deliveredLiters: number;
  lossPercent: number;
}) {
  const fmtK = (n: number) => `${(n / 1000).toFixed(1)}K L`;
  const safeLoss = Math.max(0, Math.min(100, lossPercent));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-sm">Ordered</CardTitle></CardHeader>
        <CardContent className="text-2xl font-semibold">{fmtK(orderedLiters)}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Delivered</CardTitle></CardHeader>
        <CardContent className="text-2xl font-semibold text-success">{fmtK(deliveredLiters)}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Loss %</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-semibold">{safeLoss.toFixed(1)}%</div>
            <div className="w-28 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-2 ${safeLoss < 2 ? 'bg-success' : safeLoss < 5 ? 'bg-warning' : 'bg-destructive'}`}
                style={{ width: `${safeLoss}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
