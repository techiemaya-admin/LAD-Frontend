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
import { PhoneOutgoing } from 'lucide-react';
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
      icon={<PhoneOutgoing className="h-4 w-4" />}
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
      <div className="h-full flex flex-col border rounded-lg p-4 bg-white dark:bg-[#071131] border-slate-200 dark:border-[#262831]">
        <p className="text-xs text-slate-500 dark:text-slate-300 mb-4">{chartRangeLabel}</p>
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
              <CartesianGrid vertical={false} stroke="#1e2e4a" strokeDasharray="3 3" />
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
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white dark:bg-[#071131] border border-slate-200 dark:border-blue-950/60 rounded-lg p-2.5 shadow-md">
                        <p className="text-xs font-semibold text-slate-800 dark:text-white">{label}</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 font-medium">
                          calls : <span className="font-bold">{payload[0].value}</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
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
