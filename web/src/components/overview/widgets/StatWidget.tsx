"use client";
import React from 'react';
import { 
  Phone, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  Minus
} from 'lucide-react';
import { WidgetWrapper } from '../WidgetWrapper';
import { cn } from '@/lib/utils';
interface StatWidgetProps {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  icon?: 'phone' | 'check' | 'trending';
}
export const StatWidget: React.FC<StatWidgetProps> = ({
  id,
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  icon = 'phone',
}) => {
  const IconComponent = {
    phone: Phone,
    check: CheckCircle,
    trending: TrendingUp,
  }[icon];
  const getTrendIcon = () => {
    if (trend === undefined || trend === 0) {
      return <Minus className="h-3 w-3" />;
    }
    return trend > 0 ? (
      <TrendingUp className="h-3 w-3" />
    ) : (
      <TrendingDown className="h-3 w-3" />
    );
  };
  const getTrendColor = () => {
    if (trend === undefined || trend === 0) return 'text-muted-foreground';
    return trend > 0 ? 'text-success' : 'text-destructive';
  };
  return (
    <WidgetWrapper id={id} title={title}>
      <div className="flex flex-col justify-between h-full">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg sm:text-3xl font-bold font-display tracking-tight text-white">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className="p-1.5 sm:p-2 rounded-lg border bg-[#F8F9FE] dark:bg-[#0b1941] border-[#E2E8F0] dark:border-[#262831]">
            <IconComponent className="h-4 w-4 sm:h-5 sm:h-5 text-primary" />
          </div>
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1.5 mt-2 sm:mt-4">
            <div className="p-0.5 sm:p-1 rounded bg-[#F8F9FE] border border-[#E2E8F0] dark:bg-[#0b1941] dark:border-[#262831]">
              <span className={cn('flex items-center gap-1 text-xs', getTrendColor())}>
                {getTrendIcon()}
              </span>
            </div>
            <span className={cn('text-xs font-medium', getTrendColor())}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
            {trendLabel && (
              <span className="text-xs text-slate-400 hidden xs:inline">{trendLabel}</span>
            )}
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
};
