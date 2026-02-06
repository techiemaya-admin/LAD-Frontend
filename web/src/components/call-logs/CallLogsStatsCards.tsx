'use client';
import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Phone, PhoneOff, PhoneMissed, PhoneCall, Clock, Flame, Sun, Snowflake, BookUser
} from 'lucide-react';
import type { CallLogsStats } from '@lad/frontend-features/call-logs';

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

// Component to handle animated values
const AnimatedValue = ({ value }: { value: number | string }) => {
  const numericValue = typeof value === 'string' ? parseInt(value) || 0 : value || 0;
  const animatedValue = useCountUp(numericValue, 2000);
  return <>{animatedValue}</>;
};

interface StatCardProps {
  title: string;
  value: number | string;
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

interface CallLogsStatsCardsProps {
  stats: CallLogsStats;
  loading?: boolean;
}

export default function CallLogsStatsCards({ stats, loading = false }: CallLogsStatsCardsProps) {
  if (loading) {
    return (
      <div className="flex gap-4 mb-6 flex-wrap items-stretch">
        {/* Show 8 skeleton cards to match the actual number of cards */}
        {Array.from({ length: 8 }, (_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 mb-6 flex-wrap items-stretch">
      {/* Total Calls */}
      <StatCard 
        title="Total Calls" 
        value={stats.total_calls || 0} 
        icon={<BookUser className="w-6 h-6 text-blue-600" />} 
        bgColor="bg-blue-100" 
      />
      
      {/* Completed Calls (Ended) */}
      <StatCard 
        title="Completed Calls" 
        value={stats.completed_calls || 0} 
        icon={<Phone className="w-6 h-6 text-green-600" />} 
        bgColor="bg-green-100" 
      />
      
      {/* Failed Calls */}
      <StatCard 
        title="Failed Calls" 
        value={stats.failed_calls || 0} 
        icon={<PhoneMissed className="w-6 h-6 text-red-600" />} 
        bgColor="bg-red-100" 
      />
      
      {/* Ongoing Calls */}
      <StatCard 
        title="Ongoing" 
        value={stats.ongoing || 0} 
        icon={<PhoneCall className="w-6 h-6 text-purple-600" />} 
        bgColor="bg-purple-100" 
      />
      
      {/* Queue */}
      <StatCard 
        title="Queue" 
        value={stats.queue || 0} 
        icon={<Clock className="w-6 h-6 text-amber-600" />} 
        bgColor="bg-amber-100" 
      />
      
      {/* Hot Leads */}
      <StatCard 
        title="Hot Leads" 
        value={stats.hot_leads || 0} 
        icon={<Flame className="w-6 h-6 text-orange-600" />} 
        bgColor="bg-orange-100" 
      />
      
      {/* Warm Leads */}
      <StatCard 
        title="Warm Leads" 
        value={stats.warm_leads || 0} 
        icon={<Sun className="w-6 h-6 text-yellow-600" />} 
        bgColor="bg-yellow-100" 
      />
      
      {/* Cold Leads */}
      <StatCard 
        title="Cold Leads" 
        value={stats.cold_leads || 0} 
        icon={<Snowflake className="w-6 h-6 text-cyan-600" />} 
        bgColor="bg-cyan-100" 
      />
    </div>
  );
}
