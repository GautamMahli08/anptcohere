import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import RetailPanel from '@/components/RetailPanel';
import { useMuscatSimulation } from '@/hooks/useMuscatSimulation';
import { exportToCSV } from '@/utils/export';

const Retail = () => {
  const { trucks } = useMuscatSimulation();

  const handleExportCSV = () => {
    // Generate retail metrics for CSV export
    const retailData = [
      { station: 'Qurum Station A', ordered: 3000, delivered: 2950, loss: 50, status: 'Completed' },
      { station: 'Al Khuwair Station B', ordered: 2600, delivered: 2580, loss: 20, status: 'Completed' },
      { station: 'Rusayl Industrial Estate', ordered: 2300, delivered: 2290, loss: 10, status: 'Completed' }
    ];

    const csvContent = [
      ['Station', 'Ordered (L)', 'Delivered (L)', 'Loss (L)', 'Loss %', 'Status'],
      ...retailData.map(row => [
        row.station,
        row.ordered.toString(),
        row.delivered.toString(),
        row.loss.toString(),
        ((row.loss / row.ordered) * 100).toFixed(2) + '%',
        row.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retail-stations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Retail Stations</h1>
          <p className="text-muted-foreground mt-1">
            Monitor delivery progress and confirm receipt at retail locations
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <RetailPanel trucks={trucks} />
        
        <Card>
          <CardHeader>
            <CardTitle>Delivery Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-foreground">3</div>
                <div className="text-sm text-muted-foreground">Active Stations</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">9,900L</div>
                <div className="text-sm text-muted-foreground">Total Ordered</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-success">9,820L</div>
                <div className="text-sm text-muted-foreground">Total Delivered</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-destructive">80L</div>
                <div className="text-sm text-muted-foreground">Total Loss</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Retail;