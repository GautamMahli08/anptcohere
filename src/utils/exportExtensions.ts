export const exportAlertsCSV = (alerts: any[]) => {
  const csvContent = [
    ['Alert ID', 'Type', 'Severity', 'Message', 'Truck ID', 'Timestamp', 'Acknowledged', 'Location'],
    ...alerts.map(alert => [
      alert.id,
      alert.type,
      alert.severity,
      alert.message,
      alert.truckId,
      alert.timestamp.toISOString(),
      alert.acknowledged ? 'Yes' : 'No',
      alert.location ? `${alert.location.lat},${alert.location.lng}` : 'N/A'
    ])
  ].map(row => row.join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `alerts-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const exportRetailCSV = (stopsWithMetrics: any[]) => {
  const csvContent = [
    ['Station', 'Ordered (L)', 'Delivered (L)', 'Loss (L)', 'Loss %', 'Status'],
    ...stopsWithMetrics.map(stop => [
      stop.name,
      stop.assigned.toString(),
      stop.delivered.toString(),
      stop.loss.toString(),
      ((stop.loss / stop.assigned) * 100).toFixed(2) + '%',
      stop.status
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