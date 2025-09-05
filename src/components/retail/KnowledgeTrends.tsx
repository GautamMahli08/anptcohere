import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function KnowledgeTrends({
  highlights,
}: {
  highlights: Array<{ title: string; detail: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Knowledge: Delivery Quality Trends</CardTitle>
        <CardDescription>Insights generated from recent delivery performance</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {highlights.map((h, i) => (
            <li key={i} className="p-2 rounded border">
              <div className="font-medium">{h.title}</div>
              <div className="text-sm text-muted-foreground">{h.detail}</div>
            </li>
          ))}
          {highlights.length === 0 && (
            <li className="text-sm text-muted-foreground">No insights yet.</li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
