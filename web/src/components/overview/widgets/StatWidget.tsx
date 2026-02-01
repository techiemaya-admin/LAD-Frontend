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
            <p className="text-3xl font-bold font-display tracking-tight">
              {value}
            </p>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className="p-2 rounded-lg bg-primary/10">
            <IconComponent className="h-5 w-5 text-primary" />
          </div>
        </div>
        {trend !== undefined && (
          <div className={cn('flex items-center gap-1 text-xs mt-4', getTrendColor())}>
            {getTrendIcon()}
            <span className="font-medium">
              {trend > 0 ? '+' : ''}{trend}%
            </span>
            {trendLabel && (
              <span className="text-muted-foreground ml-1">{trendLabel}</span>
            )}
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
};