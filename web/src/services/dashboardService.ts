import { getApiUrl, defaultFetchOptions } from '../config/api';

function sanitizeChange(change: unknown): string {
  if (typeof change === 'string' && change.includes('Infinity')) return '+100%';
  if (typeof change === 'string') return change;
  return '0%';
}

function sanitizeNumber(val: unknown): number {
  return typeof val === 'number' && !isNaN(val) ? val : 0;
}

function buildQuery(params: Record<string, string | number>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

export type AnalyticsResponse = {
  leads: { count: number; change: string; details: unknown[] };
  sessions: { count: number; change: string; details: unknown[] };
  sessionDuration: { avg: number; change: string; details: unknown[] };
  wonLeads: { count: number; avg: number; change: string; details: unknown[] };
};

export async function fetchAnalytics(params: Record<string, string | number> = { period: 'month' }): Promise<AnalyticsResponse> {
  const query = buildQuery(params);
  const url = getApiUrl(`/api/dashboard/analytics?${query}`);
  const response = await fetch(url, defaultFetchOptions());
  if (!response.ok) {
    throw new Error(`Failed to fetch analytics: ${response.status}`);
  }
  const data = await response.json();
  return {
    leads: {
      count: sanitizeNumber(data.leads?.count),
      change: sanitizeChange(data.leads?.change),
      details: data.leads?.details || [],
    },
    sessions: {
      count: sanitizeNumber(data.sessions?.count),
      change: sanitizeChange(data.sessions?.change),
      details: data.sessions?.details || [],
    },
    sessionDuration: {
      avg: sanitizeNumber(data.sessionDuration?.avg),
      change: sanitizeChange(data.sessionDuration?.change),
      details: data.sessionDuration?.details || [],
    },
    wonLeads: {
      count: sanitizeNumber(data.wonLeads?.count),
      avg: sanitizeNumber(data.wonLeads?.avg),
      change: sanitizeChange(data.wonLeads?.change),
      details: data.wonLeads?.details || [],
    },
  };
}

export async function fetchLeadConversionStats(): Promise<unknown> {
  const url = getApiUrl('/api/dashboard/lead-conversion-stats');
  const response = await fetch(url, defaultFetchOptions());
  if (!response.ok) {
    throw new Error(`Failed to fetch lead conversion stats: ${response.status}`);
  }
  return response.json();
}

export async function fetchLeadStats(params: Record<string, string | number> = { period: 'month' }): Promise<unknown> {
  const query = buildQuery(params);
  const url = getApiUrl(`/api/dashboard/leads/stats?${query}`);
  const response = await fetch(url, defaultFetchOptions());
  if (!response.ok) {
    throw new Error(`Failed to fetch lead stats: ${response.status}`);
  }
  return response.json();
}

