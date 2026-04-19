'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  BarChart3, Play, Linkedin, Mail, Video, Users, MessageCircle, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import type { CampaignStats } from '@lad/frontend-features/campaigns';

// Custom hook for counter animation
const useCountUp = (end: number, duration: number = 2000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return count;
};

// Skeleton loading component
const SkeletonCard = () => (
  <div className="w-full sm:w-[calc(50%-8px)] md:w-[calc(25%-12px)]">
    <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm w-full flex flex-col h-full min-h-[120px]">
      <div className="flex-1 flex flex-col p-4">
        <div className="flex flex-col h-full">
          <div className="flex justify-end mb-2">
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
          <div className="flex-1 flex flex-col justify-end">
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-2 w-3/4"></div>
            <div className="h-8 bg-gray-200 rounded animate-pulse w-1/2"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Component to handle animated values with different formats
const AnimatedValue = ({ value, suffix = '' }: { value: string | number, suffix?: string }) => {
  // Extract numeric value from string (for percentages)
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  const animatedValue = useCountUp(numericValue || 0, 2000);

  // Format the animated value based on the original format
  if (typeof value === 'string' && value.includes('%')) {
    return <>{animatedValue.toFixed(1)}%</>;
  }
  return <>{animatedValue}{suffix}</>;
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  bgColor: string;
  onClick?: () => void;
}

const StatCard = ({ title, value, icon, bgColor, onClick }: StatCardProps) => (
  <div className="w-full sm:w-[calc(50%-8px)] md:w-[calc(25%-12px)]">
    <div
      className={`bg-white rounded-[20px] border border-slate-200 shadow-sm w-full flex flex-col h-full min-h-[120px] transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]' : ''}`}
      onClick={onClick}
    >
      <div className="flex-1 flex flex-col p-4">
        <div className="flex flex-col h-full">
          <div className="flex justify-end mb-2">
            <Avatar className={`${bgColor} w-12 h-12 rounded-full`}>
              <AvatarFallback className={bgColor}>
                {icon}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 flex flex-col justify-end">
            <p className="text-sm text-slate-500 mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
              {title}
            </p>
            <h5 className="text-2xl font-bold text-slate-800">
              <AnimatedValue value={value} />
            </h5>
          </div>
        </div>
      </div>
    </div>
  </div>
);

interface CampaignStatsCardsProps {
  stats: CampaignStats;
  loading?: boolean;
}
export default function CampaignStatsCards({ stats, loading = false }: CampaignStatsCardsProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex gap-4 mb-6 flex-wrap items-stretch">
        {Array.from({ length: 8 }, (_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 mb-6 flex-wrap items-stretch">
      {/* Total Campaigns — click to go to campaigns list */}
      <div
        className="w-full sm:w-[calc(50%-8px)] md:w-[calc(25%-12px)] cursor-pointer"
        onClick={() => router.push('/campaigns')}
      >
        <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm w-full flex flex-col h-full min-h-[120px] transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]">
          <div className="flex-1 flex flex-col p-4">
            <div className="flex flex-col h-full">
              <div className="flex justify-end mb-2">
                <Avatar className="bg-blue-100 w-12 h-12 rounded-full">
                  <AvatarFallback className="bg-blue-100">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 flex flex-col justify-end">
                <p className="text-sm text-slate-500 mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  Total Campaigns
                </p>
                <h5 className="text-2xl font-bold text-slate-800">
                  <AnimatedValue value={stats.total_campaigns} />
                </h5>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Campaigns → filter to active status */}
      {/* <StatCard
        title="Active Campaigns"
        value={stats.active_campaigns}
        icon={<Play className="w-6 h-6 text-green-600" />}
        bgColor="bg-green-100"
        onClick={() => router.push('/campaigns?status=active')}
      /> */}

      {/* Total Leads → campaigns list (global leads page has hardcoded ID, not working yet) */}
      <StatCard
        title="Generated Leads "
        value={stats.total_leads || 0}
        icon={<Users className="w-6 h-6 text-indigo-600" />}
        bgColor="bg-indigo-100"
        onClick={() => router.push('/campaigns')}
      />

      {/* Connection Requests Sent → running campaigns */}
      <StatCard
        title="Connection Requests Sent"
        value={stats.total_sent || 0}
        icon={<Linkedin className="w-6 h-6 text-[#0077B5]" />}
        bgColor="bg-blue-50"
        onClick={() => router.push('/campaigns?status=running')}
      />

      {/* LinkedIn Connections card — shows network size + daily accepted trend */}
      {(() => {
        const networkSize = stats.linkedin_network_size ?? null;
        const today = stats.connections_today ?? 0;
        const yesterday = stats.connections_yesterday ?? 0;
        const diff = today - yesterday;
        const TrendIcon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
        const trendColor = diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-500' : 'text-slate-400';
        const trendBg = diff > 0 ? 'bg-green-50' : diff < 0 ? 'bg-red-50' : 'bg-slate-50';
        const displayValue = networkSize != null ? networkSize : (stats.total_connected || 0);
        const displayLabel = networkSize != null ? '1st Connections' : 'Connections Accepted';
        return (
          <div className="w-full sm:w-[calc(50%-8px)] md:w-[calc(25%-12px)]">
            <div
              className="bg-white rounded-[20px] border border-slate-200 shadow-sm w-full flex flex-col h-full min-h-[120px] transition-all cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => router.push('/campaigns')}
            >
              <div className="flex-1 flex flex-col p-4">
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-start mb-2">
                    <Avatar className="bg-blue-100 w-12 h-12 rounded-full">
                      <AvatarFallback className="bg-blue-100">
                        <Linkedin className="w-6 h-6 text-[#0077B5]" />
                      </AvatarFallback>
                    </Avatar>
                    {(today > 0 || yesterday > 0) && (
                      <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trendBg} ${trendColor}`}>
                        <TrendIcon className="w-3 h-3" />
                        {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '0'} today
                      </span>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-end">
                    <p className="text-sm text-slate-500 mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
                      {displayLabel}
                    </p>
                    <h5 className="text-2xl font-bold text-slate-800">
                      <AnimatedValue value={displayValue} />
                    </h5>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Instagram → filter campaigns by instagram platform */}
      {/* <StatCard
        title="Instagram Connection Rate"
        value={`${(stats.instagram_connection_rate ?? 0).toFixed(1)}%`}
        icon={<svg className="w-6 h-6 fill-[#E4405F]" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>}
        bgColor="bg-pink-50"
        onClick={() => router.push('/campaigns?platform=instagram')}
      /> */}

      {/* WhatsApp → filter campaigns by whatsapp */}
      {/* <StatCard
        title="WhatsApp Connection Rate"
        value={`${(stats.whatsapp_connection_rate ?? 0).toFixed(1)}%`}
        icon={<MessageCircle className="w-6 h-6 text-[#25D366]" />}
        bgColor="bg-green-50"
        onClick={() => router.push('/campaigns?platform=whatsapp')}
      /> */}

      {/* Voice → filter campaigns by voice */}
      {/* <StatCard
        title="Voice Agent Connection Rate"
        value={`${(stats.voice_agent_connection_rate ?? 0).toFixed(1)}%`}
        icon={<Video className="w-6 h-6 text-purple-600" />}
        bgColor="bg-purple-100"
        onClick={() => router.push('/campaigns?platform=voice')}
      /> */}
    </div>
  );
}
