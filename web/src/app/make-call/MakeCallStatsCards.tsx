'use client';
import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, Bot, Languages, Globe } from 'lucide-react';

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
}

const StatCard = ({ title, value, icon, bgColor }: StatCardProps) => (
  <div className="w-full sm:w-[calc(50%-8px)] md:w-[calc(25%-12px)]">
    <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm w-full flex flex-col h-full min-h-[120px]">
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

interface MakeCallStatsCardsProps {
  totalNumbers: number;
  totalAgents: number;
  totalLanguages: number;
  totalAccents: number;
  loading?: boolean;
}

export default function MakeCallStatsCards({
  totalNumbers,
  totalAgents,
  totalLanguages,
  totalAccents,
  loading = false,
}: MakeCallStatsCardsProps) {
  if (loading) {
    return (
      <div className="flex gap-4 mb-6 flex-wrap items-stretch">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 mb-6 flex-wrap items-stretch">
      {/* Total Numbers */}
      <StatCard
        title="Total Numbers"
        value={totalNumbers || 0}
        icon={<Phone className="w-6 h-6 text-blue-600" />}
        bgColor="bg-blue-100"
      />

      {/* Total Agents */}
      <StatCard
        title="Total Agents"
        value={totalAgents || 0}
        icon={<Bot className="w-6 h-6 text-green-600" />}
        bgColor="bg-green-100"
      />

      {/* Languages */}
      <StatCard
        title="Languages"
        value={totalLanguages || 0}
        icon={<Languages className="w-6 h-6 text-purple-600" />}
        bgColor="bg-purple-100"
      />

      {/* Accents */}
      <StatCard
        title="Accents"
        value={totalAccents || 0}
        icon={<Globe className="w-6 h-6 text-amber-600" />}
        bgColor="bg-amber-100"
      />
    </div>
  );
}
