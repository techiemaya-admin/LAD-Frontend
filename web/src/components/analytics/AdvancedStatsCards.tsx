import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar } from '@/components/ui/avatar';
import { TrendingUp, Users, Send, CheckCircle, Mail, Linkedin } from 'lucide-react';
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  progress?: number;
  subtitle?: string;
}
const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, progress, subtitle }) => (
  <Card className="min-w-[220px] rounded-2xl shadow-lg bg-white/85 backdrop-blur-sm transition-transform hover:-translate-y-1 hover:scale-105 hover:shadow-xl">
    <CardContent className="p-6">
      <div className="flex items-center space-x-4">
        <Avatar className="w-12 h-12" style={{ backgroundColor: color }}>
          {icon}
        </Avatar>
        <div>
          <h5 className="text-2xl font-bold">{value}</h5>
          <p className="text-sm text-muted-foreground">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {progress !== undefined && (
        <div className="mt-4">
          <Progress value={progress} className="h-2 bg-slate-100" />
          <p className="text-xs text-muted-foreground mt-1">{progress}% Complete</p>
        </div>
      )}
    </CardContent>
  </Card>
);
export const AdvancedStatsCards: React.FC<{ stats: any }> = ({ stats }) => (
  <div className="flex flex-col md:flex-row gap-6 mb-8">
    <StatCard title="Total Leads" value={stats.leads} icon={<Users className="w-6 h-6" />} color="#6366F1" />
    <StatCard title="Messages Sent" value={stats.messages} icon={<Send className="w-6 h-6" />} color="#06b6d4" />
    <StatCard title="Replies" value={stats.replies} icon={<CheckCircle className="w-6 h-6" />} color="#10b981" progress={stats.replyRate} subtitle="Reply Rate" />
    <StatCard title="Emails Sent" value={stats.emails} icon={<Mail className="w-6 h-6" />} color="#f59e42" />
    <StatCard title="LinkedIn Actions" value={stats.linkedin} icon={<Linkedin className="w-6 h-6" />} color="#0077b5" />
    <StatCard title="Growth" value={stats.growth} icon={<TrendingUp className="w-6 h-6" />} color="#f43f5e" progress={stats.growthRate} subtitle="Growth Rate" />
  </div>
);
export default AdvancedStatsCards;
