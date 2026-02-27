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
          <div className={cn(
            "p-2 rounded-lg",
            icon === 'check' ? "bg-green-100" : icon === 'trending' ? "bg-blue-100" : "bg-primary/10"
          )}>
            <IconComponent className={cn(
              "h-5 w-5",
              icon === 'check' ? "text-green-600" : icon === 'trending' ? "text-blue-600" : "text-primary"
            )} />
          </div>
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-2 mt-4">
            <div className="p-1 rounded bg-blue-100">
              <span className={cn('flex items-center gap-1 text-xs', getTrendColor())}>
                {getTrendIcon()}
              </span>
            </div>
            <span className={cn('text-xs font-medium', getTrendColor())}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
            {trendLabel && (
              <span className="text-xs text-muted-foreground">{trendLabel}</span>
            )}
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
};
