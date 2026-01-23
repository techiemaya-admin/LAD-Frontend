
"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { Bot, Phone, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { WidgetWrapper } from '../WidgetWrapper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/lib/api';
import { cn } from '@/lib/utils';

interface VoiceAgent {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'busy';
  callsToday: number;
  successRate: number;
}

interface VoiceAgentsWidgetProps {
  id: string;
}

const statusStyles = {
  active: 'bg-green-100 text-green-700',
  busy: 'bg-amber-100 text-amber-700',
  idle: 'bg-gray-100 text-gray-600',
};

// Helper to get full agent name
const getFullAgentName = (fullName: string): string => {
  return fullName && fullName.trim() ? fullName.trim() : 'Unknown Agent';
};

// Helper to determine status based on call count and success rate
const determineStatus = (callsToday: number, successRate: number): 'active' | 'busy' | 'idle' => {
  if (callsToday > 15) return 'busy';
  if (callsToday > 5) return 'active';
  return 'idle';
};

export const VoiceAgentsWidget: React.FC<VoiceAgentsWidgetProps> = ({ id }) => {
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 3;
  const totalPages = useMemo(() => Math.ceil(agents.length / ITEMS_PER_PAGE), [agents.length]);
  const paginatedAgents = useMemo(
    () => {
      const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
      return agents.slice(startIdx, startIdx + ITEMS_PER_PAGE);
    },
    [agents, currentPage]
  );

  useEffect(() => {
    const fetchAgentMetrics = async () => {
      try {
        setLoading(true);

        // Fetch available agents
        const availableAgentsRes = await apiGet<{ success: boolean; data?: any[]; agents?: any[] }>(
          '/api/voice-agent/user/available-agents'
        );
        const availableAgents = availableAgentsRes.data || availableAgentsRes.agents || [];

        // Fetch call logs for metrics
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(now.getDate() - 30); // Last 30 days

        const startDateISO = startDate.toISOString();
        const endDateISO = now.toISOString();
        const qs = `?startDate=${encodeURIComponent(startDateISO)}&endDate=${encodeURIComponent(endDateISO)}`;

        const callsRes = await apiGet<{ success: boolean; logs: any[] }>(
          `/api/dashboard/calls${qs}`
        );
        const logs = callsRes.logs || [];

        // Group call logs by agent
        const agentMetrics = new Map<string, {
          totalCalls: number;
          todayCalls: number;
          successCalls: number;
        }>();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const log of logs) {
          const agentName = getFullAgentName(log.agent_name || log.agent || 'Unknown Agent');
          const status = log.status?.toLowerCase() || '';
          const isToday = new Date(log.startedAt || log.created_at).toDateString() === today.toDateString();

          if (!agentMetrics.has(agentName)) {
            agentMetrics.set(agentName, {
              totalCalls: 0,
              todayCalls: 0,
              successCalls: 0,
            });
          }

          const metric = agentMetrics.get(agentName)!;
          metric.totalCalls++;

          if (isToday) {
            metric.todayCalls++;
          }

          // Count as success: ended, completed, answered
          if (status === 'ended' || status === 'completed' || status === 'answered') {
            metric.successCalls++;
          }
        }

        // Map available agents to display format
        const agentList: VoiceAgent[] = availableAgents
          .map((agent: any, idx: number) => {
            const agentName = getFullAgentName(
              agent.name || agent.agent_name || agent.label || 'Unknown Agent'
            );
            const metrics = agentMetrics.get(agentName) || {
              totalCalls: 0,
              todayCalls: 0,
              successCalls: 0,
            };

            const successRate =
              metrics.totalCalls > 0
                ? Math.round((metrics.successCalls / metrics.totalCalls) * 100)
                : 0;

            return {
              id: agent.id || `agent-${idx}`,
              name: agentName,
              status: determineStatus(metrics.todayCalls, successRate),
              callsToday: metrics.todayCalls,
              successRate,
            };
          })
          .sort((a, b) => b.callsToday - a.callsToday); // Sort by calls today descending

        setAgents(agentList.length > 0 ? agentList : []);
      } catch (error) {
        console.error('Error fetching agent metrics:', error);
        setAgents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentMetrics();
  }, []);

  if (loading) {
    return (
      <WidgetWrapper id={id} title="Voice Agents">
        <div className="flex items-center justify-center h-40">
          <p className="text-sm text-muted-foreground">Loading agents...</p>
        </div>
      </WidgetWrapper>
    );
  }

  return (
    <WidgetWrapper id={id} title="Voice Agents">
      <div className="space-y-3 h-full flex flex-col">
        {agents.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-muted-foreground">No agents found</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 flex-1">
              {paginatedAgents.map((agent) => (
                <div
                  key={agent.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-xl border border-border bg-background/50',
                    'hover:bg-secondary/30 transition-all duration-200 ease-out will-change-transform hover:-translate-y-0.5 hover:scale-[1.01]'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate" title={agent.name}>{agent.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge
                          variant="secondary"
                          className={`text-xs px-2 py-0 ${statusStyles[agent.status]}`}
                        >
                          {agent.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Today
                      </p>
                      <p className="font-semibold text-sm">{agent.callsToday}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        Success
                      </p>
                      <p className={cn('font-semibold text-sm', agent.successRate >= 80 ? 'text-green-600' : agent.successRate >= 60 ? 'text-amber-600' : 'text-red-600')}>
                        {agent.successRate}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
                <span className="text-xs text-muted-foreground">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                  {Math.min(currentPage * ITEMS_PER_PAGE, agents.length)} of {agents.length}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </WidgetWrapper>
  );
};
