"use client";
import React from 'react';
import { Brain, Lightbulb, TrendingUp, AlertCircle } from 'lucide-react';
import { WidgetWrapper } from '../WidgetWrapper';
import { cn } from '@/lib/utils';
interface Insight {
  id: string;
  type: 'tip' | 'warning' | 'trend';
  title: string;
  description: string;
}
interface AIInsightsWidgetProps {
  id: string;
}
const demoInsights: Insight[] = [
  {
    id: '1',
    type: 'tip',
    title: 'Best calling time detected',
    description: 'Your leads respond best between 10 AM - 12 PM',
  },
  {
    id: '2',
    type: 'trend',
    title: 'Answer rate improving',
    description: '+12% increase in answer rate this week',
  },
  {
    id: '3',
    type: 'warning',
    title: '15 follow-ups pending',
    description: 'Schedule these before end of day for best results',
  },
];
const insightIcons = {
  tip: Lightbulb,
  trend: TrendingUp,
  warning: AlertCircle,
};
const insightStyles = {
  tip: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-[#2B7CFF]/15 dark:border-[#2B7CFF]/40 dark:text-white',
  trend: 'bg-green-50 border-green-200 text-green-700 dark:bg-[#2EE6A6]/15 dark:border-[#2EE6A6]/40 dark:text-white',
  warning: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-[#FF6B6B]/15 dark:border-[#FF6B6B]/40 dark:text-white',
};
export const AIInsightsWidget: React.FC<AIInsightsWidgetProps> = ({ id }) => {
  return (
    <WidgetWrapper id={id} title="AI Insights">
      <div className="space-y-3">
        {demoInsights.map((insight) => {
          const Icon = insightIcons[insight.type];
          return (
            <div
              key={insight.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border',
                insightStyles[insight.type]
              )}
            >
              <Icon className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">{insight.title}</p>
                <p className="text-xs opacity-80 mt-0.5">{insight.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </WidgetWrapper>
  );
};