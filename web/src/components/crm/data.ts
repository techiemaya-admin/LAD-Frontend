// Mock CRM dataset for the /crm prototype. Mirrors prospect_state +
// prospect_events + prospect_relationships shape from the Master Agent design.
// Replace with real data when the four CRM views ship to production.

export type ContactType = 'prospect' | 'lead' | 'client' | 'imported' | 'inbound';
export type ChannelKey = 'linkedin' | 'whatsapp' | 'wapa' | 'email' | 'voice' | 'instagram' | 'intent' | 'system';
export type LifecycleStage = 'new' | 'contacted' | 'engaged' | 'qualified' | 'sah' | 'won' | 'lost' | 'archived';

export interface CrmOwner {
  name: string;
  initials: string;
  tone: string;
}

export const CRM_OWNERS: Record<string, CrmOwner> = {
  rk: { name: 'Rashed Khalid', initials: 'RK', tone: 'linear-gradient(135deg,#fbbf24,#ef4444)' },
  am: { name: 'Aisha Mahmoud', initials: 'AM', tone: 'linear-gradient(135deg,#34d399,#0ea5e9)' },
  jt: { name: 'Jamil Tabet',   initials: 'JT', tone: 'linear-gradient(135deg,#a78bfa,#6366f1)' },
  nl: { name: 'Noor Lutfi',    initials: 'NL', tone: 'linear-gradient(135deg,#fb923c,#ec4899)' },
};

export interface CrmContact {
  id: string;
  type: ContactType;
  source: string;
  name: string;
  initials: string;
  title: string;
  company: string;
  industry?: string;
  geo?: string;
  email?: string | null;
  emailVerified?: boolean;
  phone?: string | null;
  phoneVerified?: boolean;
  channels?: ChannelKey[];
  owner: string;
  createdAt: string;
  lastActivityAt: string | null;
  fit?: number;
  intentSignals?: number;
  warmPath?: string | null;
  stage?: LifecycleStage;
  value?: number;
  probability?: number;
  nextStep?: string;
  expectedClose?: string;
  plan?: 'Enterprise' | 'Growth' | 'Starter';
  mrr?: number;
  health?: number;
  renewalDate?: string;
  nps?: number;
  csm?: string;
}

export const CRM_CONTACTS: CrmContact[] = [
  // ── Prospects ───────────────────────────────────────────────────────────
  {
    id: 'psp_01HYV3K2QW4A8X', type: 'prospect', source: 'Apollo',
    name: 'Sarah Lin', initials: 'SL', title: 'Director of Growth',
    company: 'Catalyst Health', industry: 'Healthtech', geo: 'Dubai, UAE',
    email: 'sarah.lin@catalysthealth.ae', emailVerified: true,
    phone: '+971 50 123 4567', phoneVerified: false,
    channels: ['linkedin', 'whatsapp', 'email'],
    owner: 'rk', createdAt: '2026-05-12T10:00:00Z', lastActivityAt: '2026-05-27T08:14:00Z',
    fit: 0.86, intentSignals: 3, warmPath: 'Anil Mehra',
  },
  {
    id: 'psp_2', type: 'prospect', source: 'LinkedIn Sales Nav',
    name: 'Reem Al-Hashimi', initials: 'RH', title: 'VP Marketing',
    company: 'Sehha Health', industry: 'Healthtech', geo: 'Abu Dhabi, UAE',
    email: 'reem@sehha.com', emailVerified: true,
    phone: '+971 50 999 0011', phoneVerified: true,
    channels: ['linkedin', 'email'],
    owner: 'am', createdAt: '2026-05-09T09:00:00Z', lastActivityAt: '2026-05-25T11:30:00Z',
    fit: 0.81, intentSignals: 2, warmPath: 'Anil Mehra',
  },
  {
    id: 'psp_3', type: 'prospect', source: 'Apollo',
    name: 'Priya Nair', initials: 'PN', title: 'GM',
    company: 'Telr', industry: 'Fintech', geo: 'Dubai, UAE',
    email: 'priya.nair@telr.com', emailVerified: false,
    phone: null, phoneVerified: false,
    channels: ['linkedin'],
    owner: 'jt', createdAt: '2026-05-15T14:00:00Z', lastActivityAt: '2026-05-26T17:00:00Z',
    fit: 0.58, intentSignals: 1, warmPath: null,
  },
  {
    id: 'psp_4', type: 'prospect', source: 'CSV Import',
    name: 'Faisal Bouchareb', initials: 'FB', title: 'CTO',
    company: 'Cairo Robotics', industry: 'Industrial', geo: 'Cairo, EG',
    email: 'faisal@cairorobotics.eg', emailVerified: true,
    phone: '+20 100 555 0123', phoneVerified: true,
    channels: ['linkedin'],
    owner: 'nl', createdAt: '2026-05-18T12:00:00Z', lastActivityAt: '2026-05-21T09:00:00Z',
    fit: 0.49, intentSignals: 0, warmPath: null,
  },

  // ── Leads ──────────────────────────────────────────────────────────────
  {
    id: 'lead_1', type: 'lead', source: 'LinkedIn',
    name: 'Omar Kassem', initials: 'OK', title: 'Head of Marketing',
    company: 'Catalyst Health', industry: 'Healthtech', geo: 'Dubai, UAE',
    email: 'omar.kassem@catalysthealth.ae', emailVerified: true,
    phone: '+971 50 211 7788', phoneVerified: true,
    channels: ['linkedin', 'email'],
    owner: 'rk', createdAt: '2026-04-22T10:00:00Z', lastActivityAt: '2026-05-26T14:00:00Z',
    stage: 'qualified', value: 32000, probability: 0.55,
    nextStep: 'Pricing call · Thu 14:00', expectedClose: '2026-06-21',
  },
  {
    id: 'lead_2', type: 'lead', source: 'Apollo',
    name: 'Daniel Okonkwo', initials: 'DO', title: 'Founder',
    company: 'Loop Capital', industry: 'Financial Services', geo: 'Lagos, NG',
    email: 'daniel@loop.capital', emailVerified: true,
    phone: '+234 803 555 0199', phoneVerified: false,
    channels: ['whatsapp'],
    owner: 'am', createdAt: '2026-04-18T08:00:00Z', lastActivityAt: '2026-05-24T09:10:00Z',
    stage: 'contacted', value: 65000, probability: 0.30,
    nextStep: 'Send proposal', expectedClose: '2026-07-10',
  },
  {
    id: 'lead_3', type: 'lead', source: 'Inbound · Web form',
    name: 'Yara Saeed', initials: 'YS', title: 'CMO',
    company: 'PayMint', industry: 'Fintech', geo: 'Riyadh, SA',
    email: 'yara.saeed@paymint.sa', emailVerified: true,
    phone: '+966 55 444 1212', phoneVerified: true,
    channels: ['email', 'linkedin'],
    owner: 'jt', createdAt: '2026-05-02T11:30:00Z', lastActivityAt: '2026-05-23T08:00:00Z',
    stage: 'qualified', value: 41000, probability: 0.65,
    nextStep: 'Security review', expectedClose: '2026-06-30',
  },
  {
    id: 'lead_4', type: 'lead', source: 'Referral',
    name: 'Hassan Riad', initials: 'HR', title: 'Operating Partner',
    company: 'Maktoob Ventures', industry: 'Venture Capital', geo: 'Dubai, UAE',
    email: 'hassan@maktoob.vc', emailVerified: true,
    phone: '+971 56 700 8800', phoneVerified: true,
    channels: ['linkedin', 'email', 'voice'],
    owner: 'rk', createdAt: '2026-03-30T09:00:00Z', lastActivityAt: '2026-05-22T10:00:00Z',
    stage: 'sah', value: 95000, probability: 0.90,
    nextStep: 'Contract red-line', expectedClose: '2026-06-05',
  },
  {
    id: 'lead_5', type: 'lead', source: 'Outbound · WhatsApp',
    name: 'Lina Tabbara', initials: 'LT', title: 'Investments Lead',
    company: 'BeeKeeper Capital', industry: 'Venture Capital', geo: 'Beirut, LB',
    email: 'lina@beekeepercap.com', emailVerified: false,
    phone: '+961 3 222 3344', phoneVerified: true,
    channels: ['linkedin'],
    owner: 'nl', createdAt: '2026-04-29T15:00:00Z', lastActivityAt: '2026-05-22T14:20:00Z',
    stage: 'contacted', value: 27000, probability: 0.25,
    nextStep: 'Discovery call', expectedClose: '2026-07-25',
  },

  // ── Clients ────────────────────────────────────────────────────────────
  {
    id: 'cli_1', type: 'client', source: 'Customer',
    name: 'Anil Mehra', initials: 'AM', title: 'Head of Partnerships',
    company: 'BlueBridge MENA', industry: 'B2B SaaS', geo: 'Dubai, UAE',
    email: 'anil@bluebridge.io', emailVerified: true,
    phone: '+971 55 111 2233', phoneVerified: true,
    channels: ['linkedin', 'email', 'whatsapp'],
    owner: 'rk', createdAt: '2025-08-04T10:00:00Z', lastActivityAt: '2026-05-26T16:00:00Z',
    plan: 'Enterprise', mrr: 8400, health: 92, renewalDate: '2026-09-01',
    nps: 9, csm: 'rk',
  },
  {
    id: 'cli_2', type: 'client', source: 'Customer',
    name: 'Tariq Younis', initials: 'TY', title: 'VP Sales',
    company: 'Sehha Health', industry: 'Healthtech', geo: 'Abu Dhabi, UAE',
    email: 'tariq@sehha.com', emailVerified: true,
    phone: '+971 50 800 7777', phoneVerified: true,
    channels: ['whatsapp', 'email'],
    owner: 'am', createdAt: '2025-11-12T09:00:00Z', lastActivityAt: '2026-05-25T10:00:00Z',
    plan: 'Growth', mrr: 3600, health: 78, renewalDate: '2026-11-12',
    nps: 8, csm: 'am',
  },
  {
    id: 'cli_3', type: 'client', source: 'Customer',
    name: 'Zainab Qureshi', initials: 'ZQ', title: 'Founder',
    company: 'Loop Capital', industry: 'Financial Services', geo: 'Lagos, NG',
    email: 'zainab@loop.capital', emailVerified: true,
    phone: null, phoneVerified: false,
    channels: ['email'],
    owner: 'jt', createdAt: '2025-12-01T11:00:00Z', lastActivityAt: '2026-04-19T13:00:00Z',
    plan: 'Starter', mrr: 990, health: 54, renewalDate: '2026-06-01',
    nps: 6, csm: 'jt',
  },

  // ── Imported / inbound ─────────────────────────────────────────────────
  {
    id: 'imp_1', type: 'imported', source: 'CSV Import · Q2 list',
    name: 'Maya Hosseini', initials: 'MH', title: 'Director of Marketing',
    company: 'Vista Realty', industry: 'Real Estate', geo: 'Dubai, UAE',
    email: 'maya@vistarealty.ae', emailVerified: false,
    phone: null, phoneVerified: false,
    channels: [],
    owner: 'nl', createdAt: '2026-05-20T08:00:00Z', lastActivityAt: null,
  },
  {
    id: 'inb_1', type: 'inbound', source: 'Inbound · Web form',
    name: 'Karim El-Sayed', initials: 'KS', title: 'Operations Manager',
    company: 'Sandstorm Logistics', industry: 'Logistics', geo: 'Jeddah, SA',
    email: 'karim.s@sandstorm.sa', emailVerified: true,
    phone: '+966 50 222 8899', phoneVerified: false,
    channels: ['email'],
    owner: 'am', createdAt: '2026-05-26T19:42:00Z', lastActivityAt: '2026-05-26T19:42:00Z',
  },
  {
    id: 'inb_2', type: 'inbound', source: 'Inbound · WhatsApp',
    name: 'Eden Tesfaye', initials: 'ET', title: 'CEO',
    company: 'Habesha Foods', industry: 'F&B', geo: 'Addis Ababa, ET',
    email: 'eden@habeshafoods.et', emailVerified: false,
    phone: '+251 91 555 1212', phoneVerified: true,
    channels: ['whatsapp'],
    owner: 'rk', createdAt: '2026-05-27T07:00:00Z', lastActivityAt: '2026-05-27T07:00:00Z',
  },
];

// ── Kanban-only mock leads (richer per-card fields than CRM rows) ─────────
export interface KanbanLead {
  id: string;
  name: string;
  company: string;
  initials: string;
  /** Undefined when deal value isn't tracked for this prospect — distinct
   *  from a real value of 0. KanbanBoard hides the badge/pipeline total
   *  in that case rather than showing a misleading "AED 0". */
  value?: number;
  stageKey: LifecycleStage;
  /** Undefined when the prospect hasn't been fit-scored yet — distinct from a
   *  real score of 0. KanbanBoard hides the badge entirely in that case. */
  fit?: number;
  lastAt: string;
  channels: ChannelKey[];
  warmPath: string | null;
  tone: string;
}

export const KANBAN_LEADS: KanbanLead[] = [
  { id: 'psp_01HYV3K2QW4A8X', name: 'Sarah Lin',       company: 'Catalyst Health',   initials: 'SL', value: 48000, stageKey: 'engaged',   fit: 0.86, lastAt: '2026-05-27T08:14:00Z', channels: ['linkedin','whatsapp','email'], warmPath: 'Anil Mehra', tone: '#4f46e5' },
  { id: 'lead_omar',         name: 'Omar Kassem',     company: 'Catalyst Health',   initials: 'OK', value: 32000, stageKey: 'qualified', fit: 0.72, lastAt: '2026-05-26T14:00:00Z', channels: ['linkedin','email'],            warmPath: null,         tone: '#0ea5e9' },
  { id: 'lead_reem',         name: 'Reem Al-Hashimi', company: 'Sehha Health',      initials: 'RH', value: 22000, stageKey: 'engaged',   fit: 0.81, lastAt: '2026-05-25T11:30:00Z', channels: ['linkedin'],                     warmPath: 'Anil Mehra', tone: '#10b981' },
  { id: 'lead_daniel',       name: 'Daniel Okonkwo',  company: 'Loop Capital',      initials: 'DO', value: 65000, stageKey: 'contacted', fit: 0.68, lastAt: '2026-05-24T09:10:00Z', channels: ['whatsapp'],                     warmPath: null,         tone: '#f59e0b' },
  { id: 'lead_priya',        name: 'Priya Nair',      company: 'Telr',              initials: 'PN', value: 18000, stageKey: 'new',       fit: 0.58, lastAt: '2026-05-26T17:00:00Z', channels: ['linkedin'],                     warmPath: null,         tone: '#a855f7' },
  { id: 'lead_yara',         name: 'Yara Saeed',      company: 'PayMint',           initials: 'YS', value: 41000, stageKey: 'qualified', fit: 0.74, lastAt: '2026-05-23T08:00:00Z', channels: ['email','linkedin'],             warmPath: null,         tone: '#0B1957' },
  { id: 'lead_hassan',       name: 'Hassan Riad',     company: 'Maktoob Ventures',  initials: 'HR', value: 95000, stageKey: 'sah',       fit: 0.91, lastAt: '2026-05-22T10:00:00Z', channels: ['linkedin','email','voice'],     warmPath: null,         tone: '#16a34a' },
  { id: 'lead_lina',         name: 'Lina Tabbara',    company: 'BeeKeeper Capital', initials: 'LT', value: 27000, stageKey: 'contacted', fit: 0.65, lastAt: '2026-05-22T14:20:00Z', channels: ['linkedin'],                     warmPath: null,         tone: '#0ea5e9' },
  { id: 'lead_faisal',       name: 'Faisal Bouchareb',company: 'Cairo Robotics',    initials: 'FB', value: 12000, stageKey: 'new',       fit: 0.49, lastAt: '2026-05-21T09:00:00Z', channels: ['linkedin'],                     warmPath: null,         tone: '#475569' },
];

export const STAGES: { key: LifecycleStage; label: string }[] = [
  { key: 'new',       label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'engaged',   label: 'Engaged' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'sah',       label: 'Handed off' },
];

// ── Prospect-detail fixture (what the right rail / KPIs render) ───────────
export interface ProspectFixture {
  id: string;
  full_name: string;
  job_title: string;
  company_name: string;
  location: string;
  email: string;
  phone_e164: string;
  email_verified: boolean;
  phone_verified: boolean;
  lifecycle_stage: LifecycleStage;
  last_channel: ChannelKey;
  last_event_at: string;
  fit_score: number | null;
  fit_signals: Record<string, number>;
  channel_rollups: Record<string, { count: number; last_event_at: string | null }>;
  intent_signals: Array<{ signal_type: string; confidence: number; recency_days: number; payload: Record<string, unknown> }>;
  // LinkedIn warm-path signals (migration 035)
  network_distance?: string | null;
  mutual_connections_count?: number | null;
  connections_count?: number | null;
  experience_throttled?: boolean;
}

export const PROSPECT: ProspectFixture = {
  id: 'psp_01HYV3K2QW4A8X',
  full_name: 'Sarah Lin',
  job_title: 'Director of Growth',
  company_name: 'Catalyst Health',
  location: 'Dubai, UAE',
  email: 'sarah.lin@catalysthealth.ae',
  phone_e164: '+971501234567',
  email_verified: true,
  phone_verified: false,
  lifecycle_stage: 'engaged',
  last_channel: 'linkedin',
  last_event_at: '2026-05-27T08:14:00Z',
  fit_score: 0.86,
  fit_signals: {
    title_match: 0.95,
    industry_match: 0.88,
    size_match: 0.82,
    geo_match: 1.00,
    seniority_match: 0.90,
    tech_stack_match: 0.61,
  },
  channel_rollups: {
    linkedin: { count: 11, last_event_at: '2026-05-27T08:14:00Z' },
    whatsapp: { count: 4,  last_event_at: '2026-05-24T12:30:00Z' },
    email:    { count: 6,  last_event_at: '2026-05-22T09:11:00Z' },
    voice:    { count: 0,  last_event_at: null },
    instagram:{ count: 0,  last_event_at: null },
  },
  intent_signals: [
    { signal_type: 'hiring.detected', confidence: 0.91, recency_days: 6, payload: { role: 'Senior Performance Marketing Manager' } },
    { signal_type: 'funding.raised',  confidence: 0.99, recency_days: 21, payload: { round: 'Series B', amount_usd: 34_000_000 } },
    { signal_type: 'website.visited', confidence: 0.78, recency_days: 1,  payload: { pages: ['/pricing', '/case-studies/sehha'], session_dur_s: 412 } },
  ],
};

export interface WarmPath {
  top_connection: { name: string; headline: string; confidence: number };
  shared_employer: { company: string; overlap: string; confidence: number } | null;
  mutual_connections: Array<{ name: string; title: string; confidence: number }>;
  customer_reference: { via: string; confidence: number } | null;
  account_pipeline: { company: string; other_contacts_in_pipeline: Array<{ name: string; title: string; stage: string }> } | null;
}

export const WARM_PATH: WarmPath = {
  top_connection: {
    name: 'Anil Mehra',
    headline: 'Head of Partnerships, BlueBridge',
    confidence: 0.92,
  },
  shared_employer: { company: 'Cigna MENA', overlap: '2019-2022 (3 yrs)', confidence: 0.88 },
  mutual_connections: [
    { name: 'Reem Al-Hashimi', title: 'VP Marketing, Sehha', confidence: 0.74 },
    { name: 'Daniel Okonkwo',  title: 'Founder, Loop Capital', confidence: 0.61 },
    { name: 'Priya Nair',      title: 'GM, Telr',              confidence: 0.55 },
  ],
  customer_reference: { via: 'Sehha Health', confidence: 0.80 },
  account_pipeline: {
    company: 'Catalyst Health',
    other_contacts_in_pipeline: [{ name: 'Omar Kassem', title: 'Head of Marketing', stage: 'qualified' }],
  },
};

export interface ProspectEvent {
  seq: number;
  channel: ChannelKey;
  event_type: string;
  direction: 'inbound' | 'outbound' | 'system';
  occurred_at: string;
  payload: Record<string, unknown>;
}

export const EVENTS: ProspectEvent[] = [
  { seq: 187, channel: 'linkedin', event_type: 'message.received', direction: 'inbound',  occurred_at: '2026-05-27T08:14:00Z', payload: { preview: 'Thanks for the deck - would love to chat next week. Tuesday afternoons work for me.' } },
  { seq: 186, channel: 'intent',   event_type: 'website.visited',  direction: 'system',   occurred_at: '2026-05-26T22:48:00Z', payload: { pages: ['/pricing', '/case-studies/sehha'], duration_s: 412 } },
  { seq: 185, channel: 'linkedin', event_type: 'message.sent',     direction: 'outbound', occurred_at: '2026-05-26T17:02:00Z', payload: { preview: 'Sharing the one-pager and 3 reference customers in MENA - happy to walk through any of them.' } },
  { seq: 184, channel: 'whatsapp', event_type: 'message.sent',     direction: 'outbound', occurred_at: '2026-05-24T12:30:00Z', payload: { preview: 'Following up on LinkedIn - quicker here if easier.' } },
  { seq: 183, channel: 'intent',   event_type: 'hiring.detected',  direction: 'system',   occurred_at: '2026-05-21T09:00:00Z', payload: { role: 'Senior Performance Marketing Manager' } },
  { seq: 182, channel: 'email',    event_type: 'email.opened',     direction: 'inbound',  occurred_at: '2026-05-22T09:11:00Z', payload: { subject: 'MENA growth benchmarks - Q2', opens: 3 } },
  { seq: 181, channel: 'email',    event_type: 'email.sent',       direction: 'outbound', occurred_at: '2026-05-22T08:00:00Z', payload: { subject: 'MENA growth benchmarks - Q2', preview: 'Hi Sarah - saw the team is hiring on perf. Sharing benchmarks.' } },
  { seq: 180, channel: 'intent',   event_type: 'funding.raised',   direction: 'system',   occurred_at: '2026-05-06T00:00:00Z', payload: { round: 'Series B', amount_usd: 34_000_000 } },
  { seq: 179, channel: 'linkedin', event_type: 'connection.accepted', direction: 'inbound',  occurred_at: '2026-05-15T14:20:00Z', payload: {} },
  { seq: 178, channel: 'linkedin', event_type: 'connection.requested', direction: 'outbound', occurred_at: '2026-05-14T11:00:00Z', payload: { note: 'Hi Sarah - Anil mentioned your work at Cigna. Would love to connect.' } },
  { seq: 177, channel: 'system',   event_type: 'enrichment.completed', direction: 'system', occurred_at: '2026-05-13T04:21:00Z', payload: { provider: 'fullenrich' } },
  { seq: 176, channel: 'system',   event_type: 'fit.scored',          direction: 'system', occurred_at: '2026-05-12T10:00:00Z', payload: { score: 0.86 } },
];

// Demo "now" so the screen looks alive regardless of wallclock.
export const NOW = new Date('2026-05-27T12:30:00Z');
