"use client";

import { useState, useCallback } from "react";
import {
  Clock,
  Play,
  Users,
  CalendarClock,
  Send,
  XCircle,
  RefreshCw,
  Activity,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useFollowupStatus,
  useInactiveLeads,
  useContextStats,
  useScheduleFollowup,
  useCancelFollowup,
  executeFollowups,
} from "@lad/frontend-features/followups";
import type {
  FollowupStatus,
  InactiveLead,
  FollowupContextStats,
} from "@lad/frontend-features/followups";

// ─── Status Card ───────────────────────────────────────────────────────────────

function StatusCard({ status, isFetching, onRefresh }: {
  status: FollowupStatus | undefined;
  isFetching: boolean;
  onRefresh: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Scheduler Status
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {!status ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${status.isRunning ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
              <span className="text-sm font-medium">
                {status.isRunning ? "Running" : "Stopped"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MetricItem icon={CalendarClock} label="Scheduled" value={status.scheduledCount} />
              <MetricItem icon={Send} label="Sent (24h)" value={status.recentSent24h} />
              <MetricItem icon={Users} label="Eligible" value={status.eligibleCount} />
              <MetricItem icon={Clock} label="Timezone" value={status.timezone} />
            </div>
            {status.businessHours && (
              <p className="text-xs text-muted-foreground">
                Business hours: {status.businessHours}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricItem({ icon: Icon, label, value }: {
  icon: any;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

// ─── Context Stats Card ────────────────────────────────────────────────────────

function ContextStatsCard({ stats }: { stats: FollowupContextStats | undefined }) {
  if (!stats) return null;

  const maxCount = Math.max(...stats.contextDistribution.map((d) => d.leadCount), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Context Distribution (7 days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.totalLeads7Days}</p>
            <p className="text-xs text-muted-foreground">Total Leads</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{stats.eligibleCount}</p>
            <p className="text-xs text-muted-foreground">Eligible</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.eligiblePercentage}%</p>
            <p className="text-xs text-muted-foreground">Eligible Rate</p>
          </div>
        </div>
        <div className="space-y-2">
          {stats.contextDistribution.map((item) => (
            <div key={item.contextStatus} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium truncate max-w-[60%]">{item.contextStatus}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{item.leadCount}</span>
                  {item.eligibleForFollowup && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-green-600 border-green-200">
                      eligible
                    </Badge>
                  )}
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${item.eligibleForFollowup ? "bg-green-500" : "bg-muted-foreground/30"}`}
                  style={{ width: `${(item.leadCount / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Inactive Leads Table ──────────────────────────────────────────────────────

function InactiveLeadsTable({ leads, onSchedule, onCancel, scheduleLoading, cancelLoading }: {
  leads: InactiveLead[];
  onSchedule: (lead: InactiveLead) => void;
  onCancel: (lead: InactiveLead) => void;
  scheduleLoading: boolean;
  cancelLoading: boolean;
}) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <CheckCircle2 className="h-10 w-10 mb-3 text-green-500" />
        <p className="text-sm font-medium">No inactive leads</p>
        <p className="text-xs mt-1">All leads are actively engaged</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="pb-2 font-medium text-muted-foreground">Name</th>
            <th className="pb-2 font-medium text-muted-foreground">Phone</th>
            <th className="pb-2 font-medium text-muted-foreground">Context</th>
            <th className="pb-2 font-medium text-muted-foreground">Inactive</th>
            <th className="pb-2 font-medium text-muted-foreground">Status</th>
            <th className="pb-2 font-medium text-muted-foreground text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={`${lead.leadId}-${lead.phone}`} className="border-b last:border-0 hover:bg-muted/50">
              <td className="py-2.5 font-medium">
                {lead.firstName} {lead.lastName}
              </td>
              <td className="py-2.5 text-muted-foreground">{lead.phone}</td>
              <td className="py-2.5">
                <Badge variant="outline" className="text-xs">
                  {lead.contextStatus}
                </Badge>
              </td>
              <td className="py-2.5 text-muted-foreground">
                {lead.hoursSinceBotMessage.toFixed(1)}h
              </td>
              <td className="py-2.5">
                {lead.isScheduled ? (
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                    <CalendarClock className="h-3 w-3 mr-1" />
                    Scheduled
                  </Badge>
                ) : lead.eligibleForFollowup ? (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Eligible
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Not eligible
                  </Badge>
                )}
              </td>
              <td className="py-2.5 text-right">
                {lead.isScheduled ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onCancel(lead)}
                    disabled={cancelLoading}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Cancel
                  </Button>
                ) : lead.eligibleForFollowup ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:text-primary/80"
                    onClick={() => onSchedule(lead)}
                    disabled={scheduleLoading}
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Schedule
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function FollowupsPage() {
  const { status, isLoading: statusLoading, isFetching: statusFetching, refetch: refetchStatus } = useFollowupStatus();
  const { leads, isLoading: leadsLoading, refetch: refetchLeads } = useInactiveLeads();
  const { stats, isLoading: statsLoading } = useContextStats();
  const { schedule, isLoading: scheduleLoading } = useScheduleFollowup();
  const { cancel, isLoading: cancelLoading } = useCancelFollowup();

  const [isExecuting, setIsExecuting] = useState(false);

  const handleSchedule = useCallback((lead: InactiveLead) => {
    schedule({ leadId: lead.leadId, data: { phoneNumber: lead.phone } });
  }, [schedule]);

  const handleCancel = useCallback((lead: InactiveLead) => {
    cancel(lead.leadId);
  }, [cancel]);

  const handleExecute = useCallback(async () => {
    setIsExecuting(true);
    try {
      await executeFollowups();
      refetchStatus();
      refetchLeads();
    } finally {
      setIsExecuting(false);
    }
  }, [refetchStatus, refetchLeads]);

  const isLoading = statusLoading || leadsLoading || statsLoading;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Follow-ups</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage automated follow-up messages for inactive leads
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { refetchStatus(); refetchLeads(); }}
              disabled={statusFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${statusFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleExecute}
              disabled={isExecuting || !status?.isRunning}
            >
              {isExecuting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Execute Now
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Top Row: Status + Context Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StatusCard
                status={status}
                isFetching={statusFetching}
                onRefresh={refetchStatus}
              />
              <ContextStatsCard stats={stats} />
            </div>

            {/* Inactive Leads */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Inactive Leads
                  <Badge variant="secondary" className="ml-1">
                    {leads.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InactiveLeadsTable
                  leads={leads}
                  onSchedule={handleSchedule}
                  onCancel={handleCancel}
                  scheduleLoading={scheduleLoading}
                  cancelLoading={cancelLoading}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
