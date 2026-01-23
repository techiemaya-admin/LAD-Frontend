import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
const COLORS = ['#6366F1', '#06b6d4', '#10b981', '#f59e42', '#0077b5', '#f43f5e'];
export const AnalyticsCharts: React.FC<{ data: any }> = ({ data }) => (
  <Box display="flex" flexWrap="wrap" gap={4}>
    {/* Leads Over Time */}
    <Paper sx={{ p: 3, flex: 1, minWidth: 350, borderRadius: 4, boxShadow: 2 }}>
      <Typography variant="h6" fontWeight={700} mb={2}>Leads Over Time</Typography>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data.leadsOverTime}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="leads" stroke="#6366F1" strokeWidth={3} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
    {/* Channel Breakdown */}
    <Paper sx={{ p: 3, flex: 1, minWidth: 350, borderRadius: 4, boxShadow: 2 }}>
      <Typography variant="h6" fontWeight={700} mb={2}>Channel Breakdown</Typography>
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
    </Paper>
    {/* Conversion Funnel */}
    <Paper sx={{ p: 3, flex: 1, minWidth: 350, borderRadius: 4, boxShadow: 2 }}>
      <Typography variant="h6" fontWeight={700} mb={2}>Conversion Funnel</Typography>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data.funnel}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="stage" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#10b981" radius={[8,8,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  </Box>
);
export default AnalyticsCharts;