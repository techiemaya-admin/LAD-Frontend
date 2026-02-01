'use client';
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  BarChart3, Play, Linkedin, Mail, Phone, Video, Users, MessageCircle
} from 'lucide-react';
import type { CampaignStats } from '@/features/campaigns';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  bgColor: string;
}

const StatCard = ({ title, value, icon, bgColor }: StatCardProps) => (
  <div className="flex-1 min-w-0 w-full sm:w-[calc(50%-8px)] md:w-auto flex">
    <Card className="rounded-[20px] border border-slate-200 shadow-sm w-full flex flex-col">
      <CardContent className="flex-1 flex flex-col p-4">
        <div className="flex items-center justify-between flex-1">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-500 mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
              {title}
            </p>
            <h5 className="text-2xl font-bold text-slate-800">
              {value}
            </h5>
          </div>
          <Avatar className={`${bgColor} w-12 h-12`}>
            <AvatarFallback className={bgColor}>
              {icon}
            </AvatarFallback>
          </Avatar>
        </div>
      </CardContent>
    </Card>
  </div>
);

interface CampaignStatsCardsProps {
  stats: CampaignStats;
}
export default function CampaignStatsCards({ stats }: CampaignStatsCardsProps) {
  return (
    <div className="flex gap-4 mb-6 flex-wrap md:flex-nowrap items-stretch">
      <div className="flex-1 min-w-0 w-full sm:w-[calc(50%-8px)] md:w-auto flex">
        <Card className="rounded-[20px] border border-slate-200 shadow-sm w-full flex flex-col">
          <CardContent className="flex-1 flex flex-col p-4">
            <div className="flex items-center justify-between flex-1">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-500 mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  Total Campaigns
                </p>
                <h5 className="text-2xl font-bold text-slate-800">
                  {stats.total_campaigns}
                </h5>
              </div>
              <Avatar className="bg-blue-500 w-12 h-12">
                <AvatarFallback className="bg-blue-500">
                  <BarChart3 className="w-6 h-6 text-white" />
                </AvatarFallback>
              </Avatar>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Remaining stat cards with Tailwind */}
      <StatCard title="Active Campaigns" value={stats.active_campaigns} icon={<Play className="w-6 h-6 text-white" />} bgColor="bg-green-500" />
      <StatCard title="Total Leads" value={stats.total_leads || 0} icon={<Users className="w-6 h-6 text-white" />} bgColor="bg-indigo-500" />
      <StatCard title="Connection Rate" value={`${(stats.avg_connection_rate ?? 0).toFixed(1)}%`} icon={<Linkedin className="w-6 h-6 text-white" />} bgColor="bg-[#0077B5]" />
      <StatCard title="Reply Rate" value={`${(stats.avg_reply_rate ?? 0).toFixed(1)}%`} icon={<Mail className="w-6 h-6 text-white" />} bgColor="bg-amber-500" />
      <StatCard title="Instagram Connection Rate" value={`${(stats.instagram_connection_rate ?? 0).toFixed(1)}%`} icon={<svg className="w-6 h-6 fill-white" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>} bgColor="bg-[#E4405F]" />
      <StatCard title="WhatsApp Connection Rate" value={`${(stats.whatsapp_connection_rate ?? 0).toFixed(1)}%`} icon={<MessageCircle className="w-6 h-6 text-white" />} bgColor="bg-[#25D366]" />
      <StatCard title="Voice Agent Connection Rate" value={`${(stats.voice_agent_connection_rate ?? 0).toFixed(1)}%`} icon={<Video className="w-6 h-6 text-white" />} bgColor="bg-purple-600" />
    </div>
  );
}
