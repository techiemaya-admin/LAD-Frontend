"use client";
import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { WidgetWrapper } from '../WidgetWrapper';
import { Button } from '@/components/ui/button';

interface ChartWidgetProps {
  id: string;
  data: Array<{ date: string; calls: number }>;
  chartMode?: 'month' | 'year';
  onChartModeChange?: (mode: 'month' | 'year') => void;
}

export const ChartWidget: React.FC<ChartWidgetProps> = ({
  id,
  data,
  chartMode: externalChartMode,
  onChartModeChange,
}) => {
  const [localChartMode, setLocalChartMode] = useState<'month' | 'year'>('month');
  const chartMode = externalChartMode ?? localChartMode;

  const handleChartModeChange = (mode: 'month' | 'year') => {
    if (onChartModeChange) {
      onChartModeChange(mode);
    } else {
      setLocalChartMode(mode);
    }
  };

  const chartRangeLabel = useMemo(() => {
    if (!data.length) return 'No data available';
    return `From ${data[0].date} to ${data[data.length - 1].date}`;
  }, [data]);

  return (
    <WidgetWrapper
      id={id}
      title="Calls Made"
      headerActions={
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={chartMode === 'month' ? 'default' : 'ghost'}
            className="h-7 px-3 text-xs"
            onClick={() => handleChartModeChange('month')}
          >
            Month
          </Button>
          <Button
            size="sm"
            variant={chartMode === 'year' ? 'default' : 'ghost'}
            className="h-7 px-3 text-xs"
            onClick={() => handleChartModeChange('year')}
          >
            Year
          </Button>
        </div>
      }
    >
      <div className="h-full flex flex-col border rounded-lg p-4 bg-card">
        <p className="text-xs text-muted-foreground mb-4">{chartRangeLabel}</p>
        <div className="flex-1 min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="40%" stopColor="#3b82f6" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
                labelStyle={{ color: '#111827' }}
              />
              <Area
                type="monotone"
                dataKey="calls"
                stroke="#3b82f6"
                strokeWidth={3}
                fill="url(#colorCalls)"
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </WidgetWrapper>
  );
};
