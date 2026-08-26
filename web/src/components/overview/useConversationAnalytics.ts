'use client';

/**
 * useConversationAnalytics - shared client hook for the tenant Overview's
 * conversation analytics (funnel + daily-volume spike + unconverted-topic
 * segments), served by LAD-Master-Agent via /api/analytics/overview.
 *
 * The funnel + spike are fast SQL; topic extraction adds an LLM round-trip. So
 * the funnel widget fetches with includeTopics=false (instant, and still renders
 * if the LLM is down) while the Re-engage widget fetches topics separately. Each
 * (window, includeTopics) pair is its own cache entry, deduped onto one in-flight
 * request with a tiny pub/sub so a refresh updates every subscriber.
 */
import { useCallback, useEffect, useState } from 'react';

import { fetchWithTenant } from '@/lib/fetch-with-tenant';

export interface FunnelStep {
  key: string;
  label: string;
  count: number;
  pct_of_prev: number;
}
export interface Funnel {
  steps: FunnelStep[];
  conversion_rate: number;
  cancelled: number;
  escalated_to_human: number;
  total: number;
  converted: number;
}
export interface VolumePoint {
  day: string;
  count: number;
}
export interface VolumeSpike {
  latest: number;
  latest_day?: string;
  trailing_avg: number;
  pct_change: number;
  is_spike: boolean;
}
export interface TopicContact {
  conversation_id: string;
  wa_contact_id: string | null;
  contact_name: string | null;
  phone: string | null;
}
export interface TopicSegment {
  topic: string;
  count: number;
  contacts: TopicContact[];
}
export interface OverviewAnalytics {
  tenant_id: string;
  window_days: number;
  funnel: Funnel;
  daily_volume: VolumePoint[];
  volume_spike: VolumeSpike;
  unconverted_topics: TopicSegment[];
  unconverted_total: number;
  /**
   * The topic labelling could not RUN (LLM unavailable / unconfigured), so
   * `unconverted_topics` is empty because we could not compute it — not
   * because the tenant has no unconverted demand. Optional: older Master Agent
   * builds do not send it, and `undefined` correctly reads as "not degraded".
   */
  topics_degraded?: boolean;
}

interface State {
  data: OverviewAnalytics | null;
  loading: boolean;
  error: string | null;
}

interface Entry {
  state: State;
  listeners: Set<(s: State) => void>;
  promise: Promise<void> | null;
}

const entries = new Map<string, Entry>();

const keyOf = (windowDays: number, includeTopics: boolean) =>
  `${windowDays}:${includeTopics ? 1 : 0}`;

function getEntry(key: string): Entry {
  let e = entries.get(key);
  if (!e) {
    e = { state: { data: null, loading: false, error: null }, listeners: new Set(), promise: null };
    entries.set(key, e);
  }
  return e;
}

function setState(e: Entry, next: State) {
  e.state = next;
  e.listeners.forEach((l) => l(next));
}

function load(windowDays: number, includeTopics: boolean, force: boolean): Promise<void> {
  const e = getEntry(keyOf(windowDays, includeTopics));
  if (e.promise && !force) return e.promise;
  if (e.state.data && !force) return Promise.resolve();

  setState(e, { ...e.state, loading: true, error: null });

  const url = `/api/analytics/overview?window_days=${windowDays}&include_topics=${includeTopics ? 1 : 0}`;
  const p = fetchWithTenant(url, { method: 'GET', cache: 'no-store' })
    .then(async (r) => {
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(body?.detail || body?.error || `Request failed (${r.status})`);
      }
      return body as OverviewAnalytics;
    })
    .then((data) => {
      setState(e, { data, loading: false, error: null });
    })
    .catch((err: unknown) => {
      setState(e, {
        data: e.state.data,
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      });
    })
    .finally(() => {
      e.promise = null;
    });

  e.promise = p;
  return p;
}

export function useConversationAnalytics(windowDays = 30, includeTopics = true) {
  const key = keyOf(windowDays, includeTopics);
  const [state, setLocal] = useState<State>(() => getEntry(key).state);

  useEffect(() => {
    const e = getEntry(key);
    setLocal(e.state);
    const listener = (s: State) => setLocal(s);
    e.listeners.add(listener);
    void load(windowDays, includeTopics, false);
    return () => {
      e.listeners.delete(listener);
    };
  }, [key, windowDays, includeTopics]);

  const refresh = useCallback(() => load(windowDays, includeTopics, true), [windowDays, includeTopics]);

  return { ...state, refresh };
}
