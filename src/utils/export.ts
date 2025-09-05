import { FuelLossHistory } from '@/types/truck';

export const exportTripCSV = (trucks: any[], alerts: any[], tripSummary: any) => {
  const headers = ['Stop', 'Client', 'Compartment', 'Assigned (L)', 'Delivered (L)', 'Loss (L)', 'Loss %', 'Timestamp', 'Alerts'];
  const rows: string[] = [];
  
  // Add trip summary data
  rows.push(`TRIP SUMMARY,Mumbai Route,Total,${tripSummary.assignedLiters},${tripSummary.deliveredLiters},${tripSummary.lossLiters},${tripSummary.lossPercent.toFixed(2)}%,${new Date().toISOString()},${alerts.length} alerts`);
  
  // Add stop-by-stop data (simulated for demo)
  const stops = [
    { name: 'Bandra Station A', client: 'Shell', comp: 'C1', assigned: 3000, delivered: 2950, loss: 50 },
    { name: 'Andheri East Station B', client: 'BP', comp: 'C2', assigned: 2600, delivered: 2595, loss: 5 },
    { name: 'Vashi Station C', client: 'Total', comp: 'C3', assigned: 2300, delivered: 2300, loss: 0 },
    { name: 'Vashi Station C', client: 'Total', comp: 'C4', assigned: 1800, delivered: 1795, loss: 5 }
  ];
  
  stops.forEach(stop => {
    const lossPercent = stop.assigned > 0 ? (stop.loss / stop.assigned) * 100 : 0;
    rows.push(`${stop.name},${stop.client},${stop.comp},${stop.assigned},${stop.delivered},${stop.loss},${lossPercent.toFixed(2)}%,${new Date().toISOString()},${stop.loss > 0 ? 'Loss detected' : 'Normal'}`);
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `mumbai-trip-report-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

export const exportToCSV = (data: FuelLossHistory[], filename: string) => {
  const headers = ['Timestamp', 'Truck ID', 'Assigned Liters', 'Delivered Liters', 'Loss Liters', 'Loss Percent'];
  const csvContent = [
    headers.join(','),
    ...data.map(row => [
      row.timestamp.toISOString(),
      row.truckId,
      row.assignedLiters,
      row.deliveredLiters.toFixed(1),
      row.lossLiters.toFixed(1),
      row.lossPercent.toFixed(2)
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

export const printTripReport = (trucks: any[], alerts: any[], tripSummary: any) => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Mumbai Trip Report</title>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
            .metric { text-align: center; padding: 15px; background: white; border-radius: 6px; border: 1px solid #ddd; }
            .metric-value { font-size: 24px; font-weight: bold; color: #2563eb; }
            .metric-label { font-size: 12px; color: #666; margin-top: 4px; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .loss { color: #dc2626; font-weight: bold; }
            .success { color: #16a34a; }
            .route-info { margin: 20px 0; padding: 15px; background: #e7f3ff; border-radius: 6px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>FSaaS Mumbai Delivery Trip Report</h1>
            <p><strong>Route:</strong> Mahul Depot → Bandra(A) → Andheri-E(B) → Vashi(C) → Mahul</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="summary">
            <h2>Trip Summary</h2>
            <div class="metrics">
              <div class="metric">
                <div class="metric-value">${tripSummary.assignedLiters}L</div>
                <div class="metric-label">Assigned</div>
              </div>
              <div class="metric">
                <div class="metric-value">${tripSummary.deliveredLiters}L</div>
                <div class="metric-label">Delivered</div>
              </div>
              <div class="metric">
                <div class="metric-value loss">${tripSummary.lossLiters}L</div>
                <div class="metric-label">Loss</div>
              </div>
              <div class="metric">
                <div class="metric-value">${tripSummary.lossPercent.toFixed(2)}%</div>
                <div class="metric-label">Loss Rate</div>
              </div>
            </div>
            <div class="route-info">
              <strong>Performance Metrics:</strong><br>
              Route Compliance: 96.8% | Uptime: 94.5% | Savings: ₹9,200
            </div>
          </div>

          <h2>Delivery Details</h2>
          <table>
            <thead>
              <tr>
                <th>Stop</th>
                <th>Client</th>
                <th>Compartment</th>
                <th>Assigned (L)</th>
                <th>Delivered (L)</th>
                <th>Loss (L)</th>
                <th>Loss %</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Bandra Station A</td>
                <td>Shell</td>
                <td>C1</td>
                <td>3000</td>
                <td>2950</td>  
                <td class="loss">50</td>
                <td class="loss">1.67%</td>
                <td>⚠️ Theft Alert</td>
              </tr>
              <tr>
                <td>Andheri East Station B</td>
                <td>BP</td>
                <td>C2</td>
                <td>2600</td>
                <td>2595</td>
                <td>5</td>
                <td>0.19%</td>
                <td class="success">✓ Normal</td>
              </tr>
              <tr>
                <td>Vashi Station C</td>
                <td>Total</td>
                <td>C3</td>
                <td>2300</td>
                <td>2300</td>
                <td class="success">0</td>
                <td class="success">0.00%</td>
                <td class="success">✓ Perfect</td>
              </tr>
              <tr>
                <td>Vashi Station C</td>
                <td>Total</td>
                <td>C4</td>
                <td>1800</td>
                <td>1795</td>
                <td>5</td>
                <td>0.28%</td>
                <td class="success">✓ Normal</td>
              </tr>
            </tbody>
          </table>

          <h2>Alerts Summary (${alerts.length} total)</h2>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${alerts.slice(0, 5).map(alert => `
                <tr>
                  <td>${alert.timestamp.toLocaleTimeString()}</td>
                  <td>${alert.type.replace('_', ' ').toUpperCase()}</td>
                  <td>${alert.severity.toUpperCase()}</td>
                  <td>${alert.message}</td>
                  <td>${alert.acknowledged ? '✓ Acked' : '⚠️ Pending'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
            This report was generated by FSaaS Mumbai Demo System<br>
            For questions, contact fleet.operations@fsaas-demo.com
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
};

export const printFuelLossReport = (data: FuelLossHistory[]) => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Fuel Loss Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { text-align: center; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Fuel Loss Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Truck ID</th>
                <th>Assigned (L)</th>
                <th>Delivered (L)</th>
                <th>Loss (L)</th>
                <th>Loss %</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  <td>${row.timestamp.toLocaleDateString()}</td>
                  <td>${row.truckId}</td>
                  <td>${row.assignedLiters}</td>
                  <td>${row.deliveredLiters.toFixed(1)}</td>
                  <td>${row.lossLiters.toFixed(1)}</td>
                  <td>${row.lossPercent.toFixed(2)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
};