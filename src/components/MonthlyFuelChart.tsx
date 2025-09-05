import React, { useState, useMemo } from 'react';
import { Truck } from '@/types/truck';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

interface MonthlyFuelChartProps {
  trucks: Truck[];
}

const MonthlyFuelChart = ({ trucks }: MonthlyFuelChartProps) => {
  const [viewMode, setViewMode] = useState<'fleet' | string>('fleet');

  // Generate seeded monthly data with consistent values
  const chartData = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Use seeded RNG for consistent results
    const seed = viewMode === 'fleet' ? 12345 : viewMode.charCodeAt(0) * 1000;
    let rngSeed = seed;
    const seededRandom = () => {
      rngSeed = (rngSeed * 9301 + 49297) % 233280;
      return rngSeed / 233280;
    };

    return daysInMonth.map((day, index) => {
      const dayLabel = format(day, 'd');
      
      if (viewMode === 'fleet') {
        // Fleet total with deterministic pattern
        const baseConsumption = 2600 + Math.sin(index * 0.3) * 300;
        const randomVariation = (seededRandom() - 0.5) * 400;
        const weekendReduction = [0, 6].includes(day.getDay()) ? -200 : 0;
        
        return {
          day: dayLabel,
          fuel: Math.max(2000, Math.round(baseConsumption + randomVariation + weekendReduction)),
        };
      } else {
        // Individual truck consumption
        const truck = trucks.find(t => t.id === viewMode);
        if (!truck) return { day: dayLabel, fuel: 0 };
        
        const baseConsumption = 260 + Math.sin(index * 0.4) * 40;
        const randomVariation = (seededRandom() - 0.5) * 60;
        const weekendReduction = [0, 6].includes(day.getDay()) ? -30 : 0;
        
        return {
          day: dayLabel,
          fuel: Math.max(180, Math.round(baseConsumption + randomVariation + weekendReduction)),
        };
      }
    });
  }, [viewMode, trucks]);

  const handleViewModeChange = (mode: string) => {
    setViewMode(mode);
  };

  const selectedTruckName = viewMode === 'fleet' ? 'Fleet Total' : trucks.find(t => t.id === viewMode)?.name || 'Select Truck';

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Monthly Fuel Consumption
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Monthly fuel consumption and losses - Muscat run (demo)
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {selectedTruckName}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleViewModeChange('fleet')}>
                Fleet Total
              </DropdownMenuItem>
              {trucks.map(truck => (
                <DropdownMenuItem 
                  key={truck.id} 
                  onClick={() => handleViewModeChange(truck.id)}
                >
                  {truck.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="h-full max-h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="day" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
              label={{ value: 'Liters', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
              formatter={(value) => [`${value}L`, 'Fuel Consumed']}
              labelFormatter={(label) => `Day ${label}`}
            />
            <Line 
              type="monotone" 
              dataKey="fuel" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default MonthlyFuelChart;