import React from 'react';
import { Card, CardContent, Typography, Box, Stack, LinearProgress, Avatar } from '@mui/material';
import { TrendingUp, People, Send, CheckCircle, Email, LinkedIn } from '@mui/icons-material';
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  progress?: number;
  subtitle?: string;
}
const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, progress, subtitle }) => (
  <Card sx={{
    minWidth: 220,
    borderRadius: 4,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    background: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(6px)',
    transition: 'transform 0.2s',
    '&:hover': { transform: 'translateY(-4px) scale(1.03)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }
  }}>
    <CardContent>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Avatar sx={{ bgcolor: color, width: 48, height: 48 }}>{icon}</Avatar>
        <Box>
          <Typography variant="h5" fontWeight={700}>{value}</Typography>
          <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
      </Stack>
      {progress !== undefined && (
        <Box mt={2}>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4, background: '#F1F5F9' }} />
          <Typography variant="caption" color="text.secondary">{progress}% Complete</Typography>
        </Box>
      )}
    </CardContent>
  </Card>
);
export const AdvancedStatsCards: React.FC<{ stats: any }> = ({ stats }) => (
  <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} mb={4}>
    <StatCard title="Total Leads" value={stats.leads} icon={<People />} color="#6366F1" />
    <StatCard title="Messages Sent" value={stats.messages} icon={<Send />} color="#06b6d4" />
    <StatCard title="Replies" value={stats.replies} icon={<CheckCircle />} color="#10b981" progress={stats.replyRate} subtitle="Reply Rate" />
    <StatCard title="Emails Sent" value={stats.emails} icon={<Email />} color="#f59e42" />
    <StatCard title="LinkedIn Actions" value={stats.linkedin} icon={<LinkedIn />} color="#0077b5" />
    <StatCard title="Growth" value={stats.growth} icon={<TrendingUp />} color="#f43f5e" progress={stats.growthRate} subtitle="Growth Rate" />
  </Stack>
);
export default AdvancedStatsCards;