import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function ManagerRetailTiles({
  totalDeliveriesToday,
  topClients, // [{ clientName, totalLiters }]
  lossByClient, // [{ clientName, lossPercent }]
  openDisputes,
}: {
  totalDeliveriesToday: number;
  topClients: Array<{ clientName: string; totalLiters: number }>;
  lossByClient: Array<{ clientName: string; lossPercent: number }>;
  openDisputes: number;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-sm">Total Deliveries Today</CardTitle></CardHeader>
        <CardContent className="text-2xl font-semibold">{totalDeliveriesToday}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Top Clients by Volume</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {topClients.slice(0, 3).map(c => (
            <div key={c.clientName} className="flex justify-between text-sm">
              <span>{c.clientName}</span>
              <span className="font-medium">{(c.totalLiters/1000).toFixed(1)}K L</span>
            </div>
          ))}
          {topClients.length === 0 && <div className="text-sm text-muted-foreground">—</div>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Loss% by Client</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {lossByClient.slice(0, 3).map(c => (
            <div key={c.clientName} className="flex justify-between text-sm">
              <span>{c.clientName}</span>
              <span className={`${c.lossPercent<2?'text-success':c.lossPercent<5?'text-warning':'text-destructive'} font-medium`}>
                {c.lossPercent.toFixed(1)}%
              </span>
            </div>
          ))}
          {lossByClient.length === 0 && <div className="text-sm text-muted-foreground">—</div>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Open Disputes</CardTitle></CardHeader>
        <CardContent className="text-2xl font-semibold">{openDisputes}</CardContent>
      </Card>
    </div>
  );
}
