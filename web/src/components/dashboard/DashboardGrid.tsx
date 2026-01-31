
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
import { apiGet } from '@/lib/api';
import { safeStorage } from '@/utils/storage';

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
}

const DAYS_RANGE = 30;

export const DashboardGrid: React.FC<DashboardGridProps> = ({ className }) => {
  const { layout, setLayout, isEditMode } = useDashboardStore();
  const [activeId, setActiveId] = React.useState<string | null>(null);

  // Data states
  const [calls, setCalls] = useState<BackendCallLog[]>([]);
  const [chartMode, setChartMode] = useState<'month' | 'year'>('month');
  const [countToday, setCountToday] = useState(0);
  const [countYesterday, setCountYesterday] = useState(0);
  const [countThisMonth, setCountThisMonth] = useState(0);
  const [countLastMonth, setCountLastMonth] = useState(0);
  const [answerRate, setAnswerRate] = useState<number>(0);
  const [answerRateLastWeek, setAnswerRateLastWeek] = useState<number>(0);
  const [creditsData, setCreditsData] = useState<{
    balance: number;
    totalMinutes: number;
    remainingMinutes: number;
    usageThisMonth: number;
  } | null>(null);
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);

  // Fetch credits data
  const fetchCredits = useCallback(async () => {
    try {
      const token = safeStorage.getItem('token') || safeStorage.getItem('token');
      if (!token) return;

      const userData = await apiGet<{
        balance?: number;
        credit_balance?: number;
        credits?: number;
        monthly_usage?: number;
      }>('/api/auth/me');

      const balance = userData.balance || userData.credit_balance || userData.credits || 0;
      const usageThisMonth = userData.monthly_usage || 0;
      const totalMinutes = balance * 3.7;
      const remainingMinutes = totalMinutes * (1 - usageThisMonth / 100);

      setCreditsData({
        balance,
        totalMinutes,
        remainingMinutes,
        usageThisMonth,
      });
    } catch (error) {
      // Error already logged by apiGet
      setCreditsData({
        balance: 0,
        totalMinutes: 0,
        remainingMinutes: 0,
        usageThisMonth: 0,
      });
    }
  }, []);

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

  // Fetch call logs
  const fetchCallLogs = useCallback(async () => {
    try {
      const now = new Date();
      let startDate: Date;

      if (chartMode === 'month') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - (DAYS_RANGE - 1));
      } else {
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
      }

      const startDateISO = startDate.toISOString();
      const endDateISO = now.toISOString();
      let qs = `?startDate=${encodeURIComponent(startDateISO)}&endDate=${encodeURIComponent(endDateISO)}`;

      const res = await apiGet<{ success: boolean; logs?: any[]; calls?: any[]; data?: any[] }>(
        `/api/dashboard/calls${qs}`
      );

      const rows: any[] = Array.isArray(res) ? res : (res.data || res.logs || res.calls || []);
      const mapped: BackendCallLog[] = rows.map((r: any) => {
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

      setCalls(mapped);

      // Calculate metrics
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
      console.error('[Dashboard] Error fetching call logs:', error);
      setCalls([]);
    }
  }, [chartMode]);

  // Fetch phone numbers
  useEffect(() => {
    const loadNumbers = async () => {
      try {
        const data = await apiGet<{ numbers?: PhoneNumber[]; items?: PhoneNumber[] }>('/api/voice-agent/user/available-numbers');
        setNumbers(data?.numbers || data?.items || []);
      } catch {}
    };
    loadNumbers();
  }, []);

  // Fetch all data on mount and when chartMode changes
  useEffect(() => {
    fetchCallLogs();
    fetchCredits();
  }, [fetchCallLogs, fetchCredits]);

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
    if (chartMode === 'month') {
      const counts = new Map<string, number>();
      for (const c of calls) {
        const d = new Date(c.startedAt);
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
      const d = new Date(c.startedAt);
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
    () =>
      calls.slice(0, 10).map((call) => ({
        id: call.id,
        leadName: call.leadName || 'Unknown Lead',
        agentName: call.agentName || 'AI Assistant',
        status: call.status,
        duration: formatDuration(call),
        date: formatCallDate(call.startedAt),
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