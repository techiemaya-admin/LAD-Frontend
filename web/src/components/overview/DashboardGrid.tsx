
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
import { cn } from '@/lib/utils';

// Utilities
import { safeStorage } from '@/utils/storage';
import { useCallLogs, useWallet, useAvailableAgents } from '@lad/frontend-features/overview';

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
}

const DAYS_RANGE = 30;

export const DashboardGrid: React.FC<DashboardGridProps> = ({ className }) => {
  const { layout, setLayout, isEditMode } = useDashboardStore();
  const [activeId, setActiveId] = React.useState<string | null>(null);

  // Data states
  const [chartMode, setChartMode] = useState<'month' | 'year'>('month');
  const [countToday, setCountToday] = useState(0);
  const [countYesterday, setCountYesterday] = useState(0);
  const [countThisMonth, setCountThisMonth] = useState(0);
  const [countLastMonth, setCountLastMonth] = useState(0);
  const [answerRate, setAnswerRate] = useState<number>(0);
  const [answerRateLastWeek, setAnswerRateLastWeek] = useState<number>(0);

  // Calculate date range based on chart mode
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start: Date;

    if (chartMode === 'month') {
      start = new Date(now);
      start.setDate(now.getDate() - (DAYS_RANGE - 1));
    } else {
      start = new Date(now);
      start.setFullYear(now.getFullYear() - 1);
    }

    return {
      startDate: start.toISOString(),
      endDate: now.toISOString()
    };
  }, [chartMode]);

  // Use SDK hooks
  const { calls, loading: callsLoading } = useCallLogs({ startDate, endDate });
  const { walletData: creditsData, loading: walletLoading } = useWallet();
  const { agents: availableAgents, loading: agentsLoading } = useAvailableAgents();

  // Format call duration
  const formatDuration = (call: BackendCallLog) => {
    if (call.timeline && call.timeline.length >= 2) {
      const start = new Date(call.timeline[0].t).getTime();
      const end = new Date(call.timeline[call.timeline.length - 1].t).getTime();
      const secs = Math.max(0, Math.round((end - start) / 1000));
      return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
    }
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

  // Calculate metrics from call logs
  useEffect(() => {
    if (callsLoading || !calls) return;

    const computeMetrics = () => {
      try {
        // Map call logs to BackendCallLog format
        const mapped: BackendCallLog[] = calls.map((r: any) => {
          const leadFullName = [r.lead_first_name, r.lead_last_name]
            .filter(Boolean)
            .join(' ')
            .trim();

          return {
            id: String(r.id ?? r.call_id ?? r.call_log_id ?? r.uuid ?? crypto.randomUUID()),
            from: r.agent || r.initiated_by || r.from || r.from_number || r.fromnum || r.source || r.from_number_id || '-',
            to: r.to || r.to_number || r.tonum || '-',
            startedAt: r.startedAt || r.started_at || r.created_at || r.createdAt || r.start_time || r.timestamp || '',
            endedAt: r.endedAt ?? r.ended_at ?? r.end_time ?? undefined,
            status: r.status || r.call_status || r.result || 'unknown',
            recordingUrl: r.recordingUrl ?? r.call_recording_url ?? r.recording_url ?? undefined,
            timeline: r.timeline,
            agentName: r.agent_name ?? r.agent ?? r.voice ?? undefined,
            leadName: leadFullName || (r.lead_name ?? r.target ?? r.client_name ?? r.customer_name ?? undefined),
          };
        });

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayCalls = mapped.filter((i) => new Date(i.startedAt) >= todayStart);
        setCountToday(todayCalls.length);

        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const yesterdayCalls = mapped.filter((i) => {
          const callDate = new Date(i.startedAt);
          return callDate >= yesterdayStart && callDate < todayStart;
        });
        setCountYesterday(yesterdayCalls.length);

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthCalls = mapped.filter((i) => new Date(i.startedAt) >= monthStart);
        setCountThisMonth(thisMonthCalls.length);

        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        const lastMonthCalls = mapped.filter((i) => {
          const callDate = new Date(i.startedAt);
          return callDate >= lastMonthStart && callDate <= lastMonthEnd;
        });
        setCountLastMonth(lastMonthCalls.length);

        // Answer rate calculations
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const thisWeekCalls = mapped.filter((i) => new Date(i.startedAt) >= weekStart);
        const answeredThisWeek = thisWeekCalls.filter(
          (i) => i.status === 'completed' || i.status === 'answered' || i.status === 'ended'
        ).length;
        const answerRateThisWeek = thisWeekCalls.length > 0 ? Math.round((answeredThisWeek / thisWeekCalls.length) * 100) : 0;
        setAnswerRate(answerRateThisWeek);

        const lastWeekStart = new Date(weekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const lastWeekEnd = new Date(weekStart);
        const lastWeekCalls = mapped.filter((i) => {
          const callDate = new Date(i.startedAt);
          return callDate >= lastWeekStart && callDate < lastWeekEnd;
        });
        const answeredLastWeek = lastWeekCalls.filter(
          (i) => i.status === 'completed' || i.status === 'answered' || i.status === 'ended'
        ).length;
        const answerRateLastWeekValue = lastWeekCalls.length > 0 ? Math.round((answeredLastWeek / lastWeekCalls.length) * 100) : 0;
        setAnswerRateLastWeek(answerRateLastWeekValue);
      } catch (error) {
        console.error('[Dashboard] Error computing metrics:', error);
      }
    };

    computeMetrics();
  }, [calls, callsLoading]);

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
  const chartData = useMemo(() => {
    if (!calls || calls.length === 0) return [];

    if (chartMode === 'month') {
      const counts = new Map<string, number>();
      for (const c of calls) {
        const callStartedAt = c.startedAt || c.started_at || c.created_at || c.createdAt || c.start_time || c.timestamp;
        const d = new Date(callStartedAt);
        if (isNaN(d.getTime())) continue;
        const key = d.toISOString().slice(0, 10);
        counts.set(key, (counts.get(key) || 0) + 1);
      }

      const out: Array<{ dateKey: string; date: string; calls: number }> = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(today);
      start.setDate(today.getDate() - (DAYS_RANGE - 1));

      for (let dt = new Date(start); dt <= today; ) {
        const key = dt.toISOString().slice(0, 10);
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
      
      return out;
    }

    // Year mode - group by month
    const monthly = new Map<string, number>();
    for (const c of calls) {
      const callStartedAt = c.startedAt || c.started_at || c.created_at || c.createdAt || c.start_time || c.timestamp;
      const d = new Date(callStartedAt);
      if (isNaN(d.getTime())) continue;
      const key = d.toISOString().slice(0, 7);
      monthly.set(key, (monthly.get(key) || 0) + 1);
    }

    const out: Array<{ dateKey: string; date: string; calls: number }> = [];
    const now = new Date();
    const yearAgo = new Date();
    yearAgo.setFullYear(now.getFullYear() - 1);

    const cursor = new Date(yearAgo.getFullYear(), yearAgo.getMonth(), 1);

    while (cursor <= now) {
      const key = cursor.toISOString().slice(0, 7);
      out.push({
        dateKey: key,
        date: cursor.toLocaleDateString('en-GB', {
          month: 'short',
          year: 'numeric',
        }),
        calls: monthly.get(key) ?? 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return out;
  }, [calls, chartMode]);

  // Transform calls to widget format
  const latestCalls: CallLog[] = useMemo(
    () => {
      if (!calls || calls.length === 0) return [];

      return calls.slice(0, 10).map((call: any) => {
        const callStartedAt = call.startedAt || call.started_at || call.created_at || call.createdAt || call.start_time || call.timestamp;
        const leadFullName = [call.lead_first_name, call.lead_last_name].filter(Boolean).join(' ').trim();
        const leadName = call.leadName || call.lead_name || leadFullName || call.target || call.client_name || 'Unknown Lead';
        const agentName = call.agentName || call.agent_name || call.agent || call.voice || 'AI Assistant';
        
        return {
          id: String(call.id ?? call.call_id ?? call.call_log_id ?? call.uuid ?? crypto.randomUUID()),
          leadName,
          agentName,
          status: call.status || call.call_status || call.result || 'unknown',
          duration: formatDuration({
            ...call,
            startedAt: callStartedAt,
            endedAt: call.endedAt ?? call.ended_at ?? call.end_time
          } as BackendCallLog),
          date: formatCallDate(callStartedAt),
        };
      });
    },
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
            value={countToday}
            trend={countToday - countYesterday}
            trendLabel="vs yesterday"
            icon="phone"
          />
        );
      case 'answer-rate':
        return (
          <StatWidget
            id={widgetId}
            title="Answer Rate"
            value={`${answerRate}%`}
            subtitle="This week"
            trend={answerRate - answerRateLastWeek}
            trendLabel="vs last week"
            icon="check"
          />
        );
      case 'calls-monthly':
        return (
          <StatWidget
            id={widgetId}
            title="Monthly Calls"
            value={countThisMonth}
            trend={countThisMonth - countLastMonth}
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
        return (
          <VoiceAgentsWidget 
            id={widgetId} 
            availableAgents={availableAgents}
            callLogs={calls}
            loading={agentsLoading || callsLoading}
          />
        );
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