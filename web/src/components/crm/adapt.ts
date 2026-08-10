// Adapts Master Agent ProspectState / ProspectEvent (SDK) into the shapes the
// CRM prototype components expect. This is the bridge that replaces the dummy
// data in ./data with live data from the Master Agent.

import type {
  ProspectState,
  ProspectEvent as SdkEvent,
} from '@lad/frontend-features/prospects';
import type {
  CrmContact,
  ContactType,
  ChannelKey,
  KanbanLead,
  LifecycleStage,
  ProspectFixture,
  ProspectEvent as CrmEvent,
} from './data';

const KNOWN_CHANNELS: readonly string[] = [
  'linkedin', 'whatsapp', 'wapa', 'email', 'voice', 'instagram', 'system',
];

// Kanban board only shows the active-pipeline stages (data.ts STAGES).
const BOARD_STAGES: readonly string[] = ['new', 'contacted', 'engaged', 'qualified', 'sah'];

function initials(name: string): string {
  return (
    (name || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] || '')
      .join('')
      .toUpperCase() || '?'
  );
}

function displayName(p: ProspectState): string {
  return (
    p.full_name ||
    p.email ||
    p.phone_e164 ||
    p.linkedin_url ||
    p.waba_wa_id ||
    p.id.slice(0, 8)
  );
}

function channelsOf(p: ProspectState): ChannelKey[] {
  const keys = Object.keys(p.channel_rollups || {});
  const known = keys.filter((k) => KNOWN_CHANNELS.includes(k)) as ChannelKey[];
  if (known.length) return known;
  if (p.last_channel && KNOWN_CHANNELS.includes(p.last_channel)) {
    return [p.last_channel as ChannelKey];
  }
  return [];
}

/** Map a Master Agent lifecycle stage to a CRM contact "type" bucket. */
export function lifecycleToType(stage: ProspectState['lifecycle_stage']): ContactType {
  if (stage === 'won') return 'client';
  if (stage === 'qualified' || stage === 'sah') return 'lead';
  return 'prospect'; // new, engaged, lost, archived
}

const DEGREE_SHORT: Record<string, string> = {
  FIRST_DEGREE: '1st', SECOND_DEGREE: '2nd', THIRD_DEGREE: '3rd',
};

/** Compact warm-path label from LinkedIn signals: "2 mutual · 2nd" / "2nd" / null. */
function warmLabel(p: ProspectState): string | null {
  const n = p.mutual_connections_count;
  const d = p.network_distance ? DEGREE_SHORT[p.network_distance] || null : null;
  if (typeof n === 'number' && n > 0) return d ? `${n} mutual · ${d}` : `${n} mutual`;
  return d;
}

export function toCrmContact(p: ProspectState): CrmContact {
  const name = displayName(p);
  return {
    id: p.id,
    type: lifecycleToType(p.lifecycle_stage),
    source: p.fit_source || p.last_channel || 'system',
    name,
    initials: initials(name),
    title: p.job_title || '',
    company: p.company_name || '',
    geo: p.location || undefined,
    email: p.email,
    emailVerified: p.email_verified ?? false,
    phone: p.phone_e164,
    phoneVerified: p.phone_verified ?? false,
    channels: channelsOf(p),
    owner: '',
    createdAt: p.created_at,
    lastActivityAt: p.last_event_at,
    fit: p.fit_score ?? undefined,
    warmPath: warmLabel(p),
    stage: p.lifecycle_stage as LifecycleStage,
  };
}

export function toCrmContacts(list: ProspectState[]): CrmContact[] {
  return list.map(toCrmContact);
}

const STAGE_TONE: Record<string, string> = {
  new: '#475569',
  engaged: '#0ea5e9',
  qualified: '#4f46e5',
  sah: '#16a34a',
};

export function toKanbanLeads(list: ProspectState[]): KanbanLead[] {
  return list
    .filter((p) => BOARD_STAGES.includes(p.lifecycle_stage))
    .map((p) => {
      const name = displayName(p);
      return {
        id: p.id,
        name,
        company: p.company_name || '',
        initials: initials(name),
        value: 0, // no deal value in prospect_state yet
        stageKey: p.lifecycle_stage as LifecycleStage,
        fit: p.fit_score ?? 0,
        lastAt: p.last_event_at || p.updated_at,
        channels: channelsOf(p),
        warmPath: null,
        tone: STAGE_TONE[p.lifecycle_stage] || '#0B1957',
      };
    });
}

/** Sum a real channel_rollup's events_by_type, or pass through a numeric count. */
function rollupCount(r: unknown): number {
  if (!r || typeof r !== 'object') return 0;
  const obj = r as Record<string, unknown>;
  if (typeof obj.count === 'number') return obj.count;
  const ebt = (obj.events_by_type as Record<string, unknown>) || {};
  return Object.values(ebt).reduce<number>((a, b) => a + (Number(b) || 0), 0);
}

export function toProspectFixture(p: ProspectState): ProspectFixture {
  const channel_rollups: ProspectFixture['channel_rollups'] = {};
  for (const [ch, r] of Object.entries(p.channel_rollups || {})) {
    channel_rollups[ch] = {
      count: rollupCount(r),
      last_event_at: (r as { last_event_at?: string | null })?.last_event_at ?? null,
    };
  }

  // fit_signals may arrive as numbers (0..1) or booleans — coerce to numbers.
  const fit_signals: Record<string, number> = {};
  for (const [k, v] of Object.entries(p.fit_signals || {})) {
    fit_signals[k] = typeof v === 'number' ? v : v ? 1 : 0;
  }

  return {
    id: p.id,
    full_name: displayName(p),
    job_title: p.job_title || '',
    company_name: p.company_name || '',
    location: p.location || '',
    email: p.email || '',
    phone_e164: p.phone_e164 || '',
    email_verified: p.email_verified ?? false,
    phone_verified: p.phone_verified ?? false,
    lifecycle_stage: p.lifecycle_stage as LifecycleStage,
    last_channel: (p.last_channel as ChannelKey) || 'system',
    last_event_at: p.last_event_at || p.updated_at,
    fit_score: p.fit_score ?? null,
    fit_signals,
    channel_rollups,
    intent_signals: [], // no Master Agent intent source yet
    network_distance: p.network_distance || null,
    mutual_connections_count: p.mutual_connections_count ?? null,
    connections_count: p.connections_count ?? null,
    experience_throttled: p.experience_throttled ?? false,
  };
}

export function toCrmEvents(events: SdkEvent[] | undefined): CrmEvent[] {
  if (!events) return [];
  return events.map((e) => ({
    seq: e.seq,
    channel: (KNOWN_CHANNELS.includes(e.channel) ? e.channel : 'system') as ChannelKey,
    event_type: e.event_type,
    direction: (e.direction ?? 'system') as CrmEvent['direction'],
    occurred_at: e.occurred_at,
    payload: e.payload || {},
  }));
}
