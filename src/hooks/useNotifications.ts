import { useState, useEffect } from 'react';
import { eventBus } from '@/lib/socket';
import { toast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  type: 'trip_assigned' | 'alert_new' | 'retail_confirmed' | 'retail:confirmed' | 'notify:new';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
  severity?: 'info' | 'success' | 'warning' | 'critical';
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const handleTripAssigned = (data: any) => {
      const notification: Notification = {
        id: `trip-${Date.now()}`,
        type: 'trip_assigned',
        title: 'Trip Assigned',
        message: `${data.truckName} assigned to ${data.destination}`,
        timestamp: new Date(),
        read: false,
        data
      };
      
      setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50
      
      toast({
        title: "Trip Assigned",
        description: `${data.truckName} assigned to ${data.destination}`,
      });
    };

    const handleAlertNew = (alert: any) => {
      const notification: Notification = {
        id: `alert-${alert.id}`,
        type: 'alert_new',
        title: 'New Alert',
        message: `${alert.severity.toUpperCase()}: ${alert.message}`,
        timestamp: new Date(),
        read: false,
        data: alert
      };
      
      setNotifications(prev => [notification, ...prev].slice(0, 50));
      
      toast({
        title: "New Alert",
        description: alert.message,
        variant: alert.severity === 'critical' ? 'destructive' : 'default',
      });
    };

    const handleRetailConfirmed = (data: any) => {
      const notification: Notification = {
        id: `retail-${Date.now()}`,
        type: 'retail_confirmed',
        title: 'Delivery Confirmed',
        message: `POD confirmed for ${data.stopName || data.stopKey}`,
        timestamp: new Date(),
        read: false,
        data,
        severity: 'success'
      };
      
      setNotifications(prev => [notification, ...prev].slice(0, 50));
      
      toast({
        title: "Delivery Confirmed",
        description: `POD confirmed for ${data.stopName || data.stopKey}`,
      });
    };

    const handleNotifyNew = (notify: any) => {
      const notification: Notification = {
        id: notify.id,
        type: 'trip_assigned',
        title: notify.title,
        message: notify.body,
        timestamp: new Date(notify.ts),
        read: false,
        data: notify,
        severity: notify.severity
      };
      
      setNotifications(prev => [notification, ...prev].slice(0, 50));
      
      toast({
        title: notify.title,
        description: notify.body,
        variant: notify.severity === 'critical' ? 'destructive' : 'default',
      });
    };

    eventBus.on('trip:assigned', handleTripAssigned);
    eventBus.on('alert:new', handleAlertNew);
    eventBus.on('retail:confirmed', handleRetailConfirmed);
    eventBus.on('notify:new', handleNotifyNew);

    return () => {
      eventBus.off('trip:assigned', handleTripAssigned);
      eventBus.off('alert:new', handleAlertNew);
      eventBus.off('retail:confirmed', handleRetailConfirmed);
      eventBus.off('notify:new', handleNotifyNew);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll
  };
};