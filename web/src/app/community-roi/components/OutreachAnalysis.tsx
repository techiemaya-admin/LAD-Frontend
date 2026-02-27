'use client';

import React, { useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { useMemberActivityHistory } from '@lad/frontend-features/community-roi';
import { UUID } from '@lad/frontend-features/community-roi/types';
import { format, parseISO, subDays, startOfDay } from 'date-fns';

interface OutreachAnalysisProps {
  memberId: UUID;
}

export const OutreachAnalysis: React.FC<OutreachAnalysisProps> = ({ memberId }) => {
  const { history, isLoading } = useMemberActivityHistory(memberId);

  // Process data for the chart
  const chartData = useMemo(() => {
    if (!history || history.length === 0) {
      // Return empty series for the last 30 days
      return Array.from({ length: 30 }).map((_, i) => ({
        date: format(subDays(new Date(), 29 - i), 'MMM dd'),
        meetings: 0,
        referrals: 0,
        total: 0
      }));
    }

    // Map history to a lookup object
    const historyMap = history.reduce((acc: any, item: any) => {
      const dateStr = format(parseISO(item.date), 'MMM dd');
      if (!acc[dateStr]) acc[dateStr] = { date: dateStr, meetings: 0, referrals: 0, total: 0 };
      
      if (item.type === 'meeting') acc[dateStr].meetings += parseInt(item.count);
      if (item.type === 'referral') acc[dateStr].referrals += parseInt(item.count);
      acc[dateStr].total += parseInt(item.count);
      
      return acc;
    }, {});

    // Ensure we show a continuous range (last 30 days)
    return Array.from({ length: 30 }).map((_, i) => {
      const d = subDays(new Date(), 29 - i);
      const dateStr = format(d, 'MMM dd');
      return historyMap[dateStr] || { date: dateStr, meetings: 0, referrals: 0, total: 0 };
    });
  }, [history]);

  if (isLoading) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center bg-white rounded-xl border border-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Outreach Analysis</h3>
          <p className="text-sm text-gray-500">Interaction trends over the last 30 days</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-xs text-gray-600">Meetings</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-xs text-gray-600">Referrals</span>
          </div>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorMeetings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorReferrals" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              interval={6}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9ca3af' }}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '8px', 
                border: 'none', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
              }} 
            />
            <Area 
              type="monotone" 
              dataKey="meetings" 
              stroke="#3b82f6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorMeetings)" 
            />
            <Area 
              type="monotone" 
              dataKey="referrals" 
              stroke="#10b981" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorReferrals)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
