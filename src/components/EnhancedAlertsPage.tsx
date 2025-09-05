import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Clock, CheckCircle, Download, Printer } from 'lucide-react';
import { useMuscatSimulation } from '@/hooks/useMuscatSimulation';
import { Alert } from '@/types/truck';
import { AlertLifecycle } from '@/types/lifecycle';
import AlertKnowledgeDrawer from '@/components/AlertKnowledgeDrawer';

const EnhancedAlertsPage: React.FC = () => {
  const { trucks, alerts, lifecycleAlerts, acknowledgeAlert, updateSopProgress } = useMuscatSimulation();
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);

  // Use lifecycle alerts directly
  const allAlerts: AlertLifecycle[] = useMemo(() => { 
    return lifecycleAlerts.sort((a, b) => b.tsRaised - a.tsRaised);
  }, [lifecycleAlerts]);

  const filteredAlerts = useMemo(() => {
    return allAlerts.filter(alert => {
      const matchesSearch = searchTerm === '' || 
        alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.truckId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
      const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
      
      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [allAlerts, searchTerm, severityFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: allAlerts.length,
      raised: allAlerts.filter(a => a.status === 'raised').length,
      critical: allAlerts.filter(a => a.severity === 'critical').length,
      warning: allAlerts.filter(a => a.severity === 'warning').length
    };
  }, [allAlerts]);

  const getSeverityColor = (severity: AlertLifecycle['severity']) => {
    switch (severity) {
      case 'critical': return 'text-danger border-danger/20 bg-danger/5';
      case 'warning': return 'text-warning border-warning/20 bg-warning/5';
      case 'info': return 'text-info border-info/20 bg-info/5';
      default: return 'text-muted-foreground';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'outline';
    }
  };

  const handleSelectAlert = (alertId: string, checked: boolean) => {
    setSelectedAlerts(prev => 
      checked 
        ? [...prev, alertId]
        : prev.filter(id => id !== alertId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedAlerts(checked ? filteredAlerts.map(a => a.id) : []);
  };

  const handleAcknowledge = (alertId: string) => {
    acknowledgeAlert(alertId, { role: 'operator', name: 'System User' });
  };

  const handleBulkAcknowledge = () => {
    selectedAlerts.forEach(alertId => {
      const alert = allAlerts.find(a => a.id === alertId);
      if (alert && alert.status === 'raised') {
        acknowledgeAlert(alertId, { role: 'operator', name: 'System User' });
      }
    });
    setSelectedAlerts([]);
  };

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Truck ID', 'Type', 'Severity', 'Status', 'Message'];
    const rows = filteredAlerts.map(alert => [
      new Date(alert.tsRaised).toISOString(),
      alert.truckId,
      alert.type,
      alert.severity,
      alert.status,
      alert.message
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Alert Center</h1>
          <p className="text-muted-foreground">Monitor and manage fleet alerts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Alerts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-warning">{stats.raised}</div>
            <div className="text-sm text-muted-foreground">Unacknowledged</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-danger">{stats.critical}</div>
            <div className="text-sm text-muted-foreground">Critical</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-warning">{stats.warning}</div>
            <div className="text-sm text-muted-foreground">Warning</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filters & Actions</CardTitle>
            {selectedAlerts.length > 0 && (
              <Button onClick={handleBulkAcknowledge} variant="outline" size="sm">
                Acknowledge Selected ({selectedAlerts.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectedAlerts.length === filteredAlerts.length && filteredAlerts.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium">
                Select All
              </label>
            </div>
            
            <Input
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="raised">Raised</SelectItem>
                <SelectItem value="ack">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Select</th>
                  <th className="text-left p-4 font-medium">Time</th>
                  <th className="text-left p-4 font-medium">Truck</th>
                  <th className="text-left p-4 font-medium">Type</th>
                  <th className="text-left p-4 font-medium">Severity</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Message</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert) => (
                  <tr key={alert.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <Checkbox
                        checked={selectedAlerts.includes(alert.id)}
                        onCheckedChange={(checked) => handleSelectAlert(alert.id, checked as boolean)}
                      />
                    </td>
                    <td className="p-4 text-sm">
                      {new Date(alert.tsRaised).toLocaleString()}
                    </td>
                    <td className="p-4 text-sm font-medium">
                      {alert.truckId}
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="capitalize">
                        {alert.type}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={getSeverityBadge(alert.severity) as any}>
                        {alert.severity}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {alert.status === 'raised' && <AlertTriangle className="w-4 h-4 text-warning" />}
                        {alert.status === 'ack' && <Clock className="w-4 h-4 text-info" />}
                        {alert.status === 'resolved' && <CheckCircle className="w-4 h-4 text-success" />}
                        <span className="capitalize text-sm">{alert.status}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm max-w-xs truncate">
                      {alert.message}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {alert.status === 'raised' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledge(alert.id)}
                          >
                            Acknowledge
                          </Button>
                        )}
                        <AlertKnowledgeDrawer 
                          alert={alert} 
                          onSopUpdate={updateSopProgress}
                          readOnly={false}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedAlertsPage;