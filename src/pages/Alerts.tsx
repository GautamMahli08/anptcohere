import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import EnhancedAlertsPage from '@/components/EnhancedAlertsPage';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Printer, AlertTriangle, Check, Search } from 'lucide-react';
import { useMuscatSimulation } from '@/hooks/useMuscatSimulation';
import { Alert } from '@/types/truck';

const Alerts = () => {
  return <EnhancedAlertsPage />;
};

export default Alerts;