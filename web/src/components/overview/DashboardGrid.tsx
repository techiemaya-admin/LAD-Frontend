
"use client";
import React, { useMemo, useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';

import { useDashboardStore } from '@/store/dashboardStore';
import { getWidgetTypeFromId, WidgetLayoutItem } from '@/types/dashboard';

// Widget components
import { StatWidget } from './widgets/StatWidget';
import { ChartWidget } from './widgets/ChartWidget';
import { CreditsWidget } from './widgets/CreditsWidget';
import { LatestCallsWidget } from './widgets/LatestCallsWidget';
import { VoiceAgentsWidget } from './widgets/VoiceAgentsWidget';
import { AIInsightsWidget } from './widgets/AIInsightsWidget';
import { QuickActionsWidget } from './widgets/QuickActionsWidget';
import { CalendarWidget } from './widgets/CalendarWidget';
// Utilities
import { cn } from '@/lib/utils';
import {
  useDashboardCalls,
  useWalletStats,
  useAvailableNumbers
} from '@lad/frontend-features/overview';

// Types
type BackendCallLog = {
  id: string;
  from: string;
  to: string;
  startedAt: string;
  endedAt?: string;
  status: string;
  recordingUrl?: string;
  timeline?: Array<{ t: string; title: string; desc?: string }>;
  agentName?: string;
  leadName?: string;
  duration_seconds?: number;
};

type PhoneNumber = {
  id: string;
  e164: string;
  label?: string;
  provider?: string;
  sid?: string;
  account?: string;
};

type CallLog = {
  id: string;
  leadName: string;
  agentName: string;
  status: string;
  duration: string;
  date: string;
};

interface DashboardGridProps {
  className?: string;
  onLoadingChange?: (loading: boolean) => void;
}

const DAYS_RANGE = 30;

export const DashboardGrid: React.FC<DashboardGridProps> = ({ className, onLoadingChange }) => {
  const { layout, setLayout, isEditMode } = useDashboardStore();
  const [activeId, setActiveId] = React.useState<string | null>(null);

  // Data states
  // SDK Data
  const [chartMode, setChartMode] = useState<'month' | 'year'>('month');

  // Stats from hook - will be populated by API or calculated by hook
  const [statsData, setStatsData] = useState<{
    countToday: number;
    countYesterday: number;
    countThisMonth: number;
    countLastMonth: number;
    answerRate: number;
    answerRateLastWeek: number;
  }>({
    countToday: 0,
    countYesterday: 0,
    countThisMonth: 0,
    countLastMonth: 0,
    answerRate: 0,
    answerRateLastWeek: 0,
  });

  // SDK Hooks
  const dateRange = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    if (chartMode === 'month') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - (DAYS_RANGE - 1));
    } else {
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
    }
    return { startDate: startDate.toISOString(), endDate: now.toISOString() };
  }, [chartMode]);

  const { calls, summary, stats: apiStats, loading: callsLoading } = useDashboardCalls(dateRange);
  const { stats: creditsData, loading: creditsLoading } = useWalletStats();
  const { numbers, loading: numbersLoading } = useAvailableNumbers();

  const isLoading = callsLoading || creditsLoading || numbersLoading;

  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  // Format call duration - prefer duration_seconds from API if available
  const formatDuration = (call: BackendCallLog) => {
    // Use duration_seconds from API if available
    if (call.duration_seconds !== undefined && call.duration_seconds !== null) {
      const secs = Math.max(0, Math.round(call.duration_seconds));
      return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
    }
    // Fallback to calculating from timeline
    if (call.timeline && call.timeline.length >= 2) {
      const start = new Date(call.timeline[0].t).getTime();
      const end = new Date(call.timeline[call.timeline.length - 1].t).getTime();
      const secs = Math.max(0, Math.round((end - start) / 1000));
      return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
    }
    // Fallback to calculating from startedAt/endedAt
    if (call.startedAt && call.endedAt) {
      const secs = Math.max(
        0,
        Math.round((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000)
      );
      return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
    }
    return '-';
  };

  // Format call date
  const formatCallDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    return (
      date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) +
      ' · ' +
      date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    );
  };

  // Calculate/Update metrics when calls or summary change
  useEffect(() => {
    // If API provides stats, we use them as a baseline, but we'll override
    // the monthly counts with summary-based calculation for stability if possible.
    const baseStats = (Object.keys(apiStats || {}).length > 0) ? apiStats : null;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // Filter calls for high-frequency stats (today/yesterday)
    const todayCalls = calls.filter((i) => {
      const start = i.startedAt || i.call_date;
      return start && new Date(start) >= todayStart;
    });

    const yesterdayCalls = calls.filter((i) => {
      const start = i.startedAt || i.call_date;
      const callDate = start ? new Date(start) : null;
      return callDate && callDate >= yesterdayStart && callDate < todayStart;
    });

    // Calendar Month Logic for "Monthly" stats
    // This Month: 1st of current month to now
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    // Last Month: 1st of previous month to end of previous month
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    let thisMonthCount = 0;
    let lastMonthCount = 0;

    // Use summary for stable monthly counts (preferred over truncated 'calls' list)
    if (summary && summary.length > 0) {
      summary.forEach(item => {
        const itemDate = new Date(item.call_date);
        if (itemDate >= monthStart) {
          thisMonthCount += item.total_calls;
        } else if (itemDate >= lastMonthStart && itemDate <= lastMonthEnd) {
          lastMonthCount += item.total_calls;
        }
      });
    } else {
      // Fallback: local calculation from calls array
      thisMonthCount = calls.filter((i) => {
        const start = i.startedAt || i.call_date;
        return start && new Date(start) >= monthStart;
      }).length;

      lastMonthCount = calls.filter((i) => {
        const start = i.startedAt || i.call_date;
        const callDate = start ? new Date(start) : null;
        return callDate && callDate >= lastMonthStart && callDate <= lastMonthEnd;
      }).length;
    }

    // Answer rate logic remains weekly based on fetched calls
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const thisWeekCalls = calls.filter((i) => {
      const start = i.startedAt || i.call_date;
      return start && new Date(start) >= weekStart;
    });
    const answeredThisWeekCount = thisWeekCalls.filter(
      (i) => i.status === 'completed' || i.status === 'answered' || i.status === 'ended'
    ).length;

    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekStart);
    const lastWeekCalls = calls.filter((i) => {
      const start = i.startedAt || i.call_date;
      const callDate = start ? new Date(start) : null;
      return callDate && callDate >= lastWeekStart && callDate < lastWeekEnd;
    });
    const answeredLastWeekCount = lastWeekCalls.filter(
      (i) => i.status === 'completed' || i.status === 'answered' || i.status === 'ended'
    ).length;

    setStatsData({
      countToday: baseStats?.countToday ?? todayCalls.length,
      countYesterday: baseStats?.countYesterday ?? yesterdayCalls.length,
      countThisMonth: thisMonthCount, // Prioritize our stable calendar-month calculation
      countLastMonth: lastMonthCount,
      answerRate: baseStats?.answerRate ?? (thisWeekCalls.length > 0 ? Math.round((answeredThisWeekCount / thisWeekCalls.length) * 100) : 0),
      answerRateLastWeek: baseStats?.answerRateLastWeek ?? (lastWeekCalls.length > 0 ? Math.round((answeredLastWeekCount / lastWeekCalls.length) * 100) : 0),
    });
  }, [calls, summary, apiStats]);


  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = layout.findIndex((item) => item.i === active.id);
      const newIndex = layout.findIndex((item) => item.i === over.id);

      const newLayout = arrayMove(layout, oldIndex, newIndex);
      setLayout(newLayout);
    }
  };

  // Calculate chart data
  // Calculate chart data
  const chartData = useMemo(() => {
    const counts = new Map<string, number>();

    // Helper to get local date key "YYYY-MM-DD" or "YYYY-MM"
    const getLocalKey = (date: Date, mode: 'month' | 'year') => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return mode === 'month' ? `${yyyy}-${mm}-${dd}` : `${yyyy}-${mm}`;
    };

    // Fill map from summary if available
    if (summary && summary.length > 0) {
      summary.forEach(item => {
        // Normalize YYYY-MM-DD to YYYY-MM if in year mode
        const key = chartMode === 'month'
          ? item.call_date
          : item.call_date.slice(0, 7);

        counts.set(key, (counts.get(key) || 0) + item.total_calls);
      });
    } else {
      // Fallback: fill map from local calls
      for (const c of calls) {
        const start = c.startedAt || c.call_date;
        const d = start ? new Date(start) : null;
        if (!d || isNaN(d.getTime())) continue;

        const key = getLocalKey(d, chartMode);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }

    const out: Array<{ dateKey: string; date: string; calls: number }> = [];
    const today = new Date();

    if (chartMode === 'month') {
      const start = new Date(today);
      start.setHours(0, 0, 0, 0);
      start.setDate(today.getDate() - (DAYS_RANGE - 1));

      for (let dt = new Date(start); dt <= today;) {
        const key = getLocalKey(dt, 'month');
        out.push({
          dateKey: key,
          date: dt.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
          }),
          calls: counts.get(key) ?? 0,
        });
        dt.setDate(dt.getDate() + 1);
      }
    } else {
      // Year mode - group by 12 months ending today
      const start = new Date(today.getFullYear(), today.getMonth() - 11, 1);
      const cursor = new Date(start);

      while (cursor <= today) {
        const key = getLocalKey(cursor, 'year');
        out.push({
          dateKey: key,
          date: cursor.toLocaleDateString('en-GB', {
            month: 'short',
            year: 'numeric',
          }),
          calls: counts.get(key) ?? 0,
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }

    return out;
  }, [calls, summary, chartMode]);

  // Transform calls to widget format
  const latestCalls: CallLog[] = useMemo(
    () =>
      calls.slice(0, 10).map((call) => ({
        id: call.id,
        leadName: call.leadName || 'Unknown Lead',
        agentName: call.agentName || 'AI Assistant',
        status: call.status,
        duration: formatDuration(call as any),
        date: formatCallDate(call.startedAt || call.call_date || ''),
      })),
    [calls]
  );

  const calculatePercentageChange = (current: number, previous: number): string => {
    if (previous === 0) {
      if (current === 0) return '0%';
      return '+100%';
    }
    const change = ((current - previous) / previous) * 100;
    const formatted = Math.round(change);
    return formatted > 0 ? `+${formatted}%` : `${formatted}%`;
  };


  const renderWidget = (widgetId: string, isOverlay = false) => {
    const widgetType = getWidgetTypeFromId(widgetId);

    switch (widgetType) {
      case 'calls-today':
        return (
          <StatWidget
            id={widgetId}
            title="Calls Today"
            value={statsData.countToday}
            trend={statsData.countToday - statsData.countYesterday}
            trendLabel="vs yesterday"
            icon="phone"
          />
        );
      case 'answer-rate':
        return (
          <StatWidget
            id={widgetId}
            title="Answer Rate"
            value={`${statsData.answerRate}%`}
            subtitle="This week"
            trend={statsData.answerRate - statsData.answerRateLastWeek}
            trendLabel="vs last week"
            icon="check"
          />
        );
      case 'calls-monthly':
        return (
          <StatWidget
            id={widgetId}
            title="Monthly Calls"
            value={statsData.countThisMonth}
            trend={statsData.countThisMonth - statsData.countLastMonth}
            trendLabel="vs last month"
            icon="trending"
          />
        );
      case 'calls-chart':
        return (
          <ChartWidget
            id={widgetId}
            data={chartData}
            chartMode={chartMode}
            onChartModeChange={setChartMode}
          />
        );
      case 'credits-overview':
        return (
          <CreditsWidget
            id={widgetId}
            balance={creditsData?.balance || 0}
            totalMinutes={creditsData?.totalMinutes || 0}
            remainingMinutes={creditsData?.remainingMinutes || 0}
            usageThisMonth={creditsData?.usageThisMonth || 0}
          />
        );
      case 'latest-calls':
        return <LatestCallsWidget id={widgetId} calls={latestCalls} />;
      case 'voice-agents':
        return <VoiceAgentsWidget id={widgetId} />;
      case 'ai-insights':
        return <AIInsightsWidget id={widgetId} />;
      case 'quick-actions':
        return <QuickActionsWidget id={widgetId} />;
      case 'calendar':
        return <CalendarWidget id={widgetId} />;
      default:
        return <div className="widget-card h-full flex items-center justify-center text-muted-foreground">Unknown widget</div>;
    }
  };

  // Get grid style based on widget size
  const getGridStyle = (item: WidgetLayoutItem) => {
    return {
      gridColumn: `span ${Math.min(item.w, 12)}`,
      minHeight: `${item.h * 80}px`,
    };
  };

  // Get responsive grid style for mobile
  const getResponsiveGridStyle = (item: WidgetLayoutItem) => {
    // On mobile (< 768px), ignore gridColumn span. On desktop, use it.
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return {
        minHeight: `${item.h * 80}px`,
      };
    }
    return getGridStyle(item);
  };

  const sortableItems = layout.map(item => item.i);

  return (
    <div className={cn('dashboard-grid', className)}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortableItems} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 auto-rows-min">
            {layout.map((item) => (
              <div
                key={item.i}
                style={getResponsiveGridStyle(item)}
                className={cn(
                  'transition-all duration-200 group',
                  activeId === item.i && 'opacity-50'
                )}
              >
                {renderWidget(item.i)}
              </div>
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeId ? (
            <div
              className="opacity-90 shadow-2xl"
              style={{
                width: '400px',
                minHeight: '160px',
              }}
            >
              {renderWidget(activeId, true)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {isEditMode && (
        <div className="mt-6 p-4 border-2 border-dashed border-accent/30 rounded-xl text-center">
          <p className="text-sm text-muted-foreground">
            🎯 <span className="font-medium">Drag widgets</span> by their header to reorder •
            <span className="font-medium"> Click "+ Add Widget"</span> to add more
          </p>
        </div>
      )}
    </div>
  );
};