import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';

const COLORS = ['#6366F1', '#06b6d4', '#10b981', '#f59e42', '#0077b5', '#f43f5e'];

export const AnalyticsCharts: React.FC<{ data: any }> = ({ data }) => (
  <div className="flex flex-wrap gap-8">
    {/* Leads Over Time */}
    <Card className="flex-1 min-w-[350px] rounded-2xl shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Leads Over Time</CardTitle>
      </CardHeader>
      <CardContent>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data.leadsOverTime}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="leads" stroke="#6366F1" strokeWidth={3} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
      </CardContent>
    </Card>
    {/* Channel Breakdown */}
    <Card className="flex-1 min-w-[350px] rounded-2xl shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Channel Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data.channelBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
              {data.channelBreakdown.map((entry: any, idx: number) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
    {/* Conversion Funnel */}
    <Card className="flex-1 min-w-[350px] rounded-2xl shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.funnel}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="stage" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#10b981" radius={[8,8,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  </div>
);
export default AnalyticsCharts;
