import { getApiUrl, defaultFetchOptions } from '../config/api';
import type { Lead, LeadMetrics } from '../components/leads/types';

type LeadListItem = {
  id: number;
  name: string;
  channel?: string;
  platform?: string;
  status?: 'Active' | 'Inactive';
  company?: string;
  role?: string;
  stage?: string;
  lastActivity?: string;
  engagement?: number;
};

type LeadDetailResponse = LeadListItem & {
  email?: string;
  location?: string;
  phoneNumber?: string;
  bio?: string;
  profileUrl?: string;
  postContent?: string;
  metrics?: LeadMetrics;
  socialMedia?: Lead['socialMedia'];
};

type EngagementFeedEntry = {
  id: number;
  title: string;
  subtitle?: string;
  timestamp: string;
  icon?: string;
};

type OutreachEntry = {
  id: number;
  platform: string;
  direction: 'inbound' | 'outbound';
  message: string;
  timestamp: string;
  durationMinutes?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
};

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string;
};

type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const DEFAULT_LEAD: Lead = {
  id: '',
  name: 'Unknown Lead',
  channel: 'whatsapp',
  status: 'Active',
  bio: '',
  role: '',
  stage: '',
  lastActivity: '',
  socialMedia: {},
  metrics: {
    conversionScore: 0,
    engagementScore: 0,
    lifetimeValue: 0,
    averageLifetimeValue: 0,
    engagementStatus: 'Unknown',
    engagementComparison: '',
  },
};

async function request<T>(path: string): Promise<ApiResult<T>> {
  const url = getApiUrl(path);
  try {
    const response = await fetch(url, {
      method: 'GET',
      ...defaultFetchOptions(),
      cache: 'no-store',
    });

    if (!response.ok) {
      return { success: false, error: `Request failed with status ${response.status}` };
    }

    const payload = (await response.json()) as ApiEnvelope<T> | T;

    if (typeof payload === 'object' && payload !== null && 'success' in payload) {
      if (payload.success === false) {
        return { success: false, error: payload.error ?? 'Request failed' };
      }
      if ('data' in payload && payload.data !== undefined) {
        return { success: true, data: payload.data as T };
      }
    }

    return { success: true, data: payload as T };
  } catch (error) {
    console.error(`Customer360Service request failed for ${path}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function ensureNumber(value: unknown, fallback = 0): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function stringOrDefault(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function normalizeStatus(status: unknown): Lead['status'] {
  if (status === 'Active' || status === 'Inactive') {
    return status;
  }
  if (typeof status === 'string') {
    const lower = status.toLowerCase();
    if (lower.includes('inactive')) return 'Inactive';
    if (lower.includes('active')) return 'Active';
  }
  return DEFAULT_LEAD.status;
}

function normalizeMetrics(metrics: unknown): LeadMetrics {
  if (metrics && typeof metrics === 'object') {
    const data = metrics as Partial<LeadMetrics> & Record<string, unknown>;
    return {
      conversionScore: ensureNumber(data.conversionScore),
      engagementScore: ensureNumber(data.engagementScore),
      lifetimeValue: ensureNumber(data.lifetimeValue),
      averageLifetimeValue: ensureNumber(data.averageLifetimeValue),
      engagementStatus: stringOrDefault(data.engagementStatus, 'Unknown'),
      engagementComparison: stringOrDefault(data.engagementComparison, ''),
    };
  }
  return { ...DEFAULT_LEAD.metrics };
}

export function normalizeHotLeadData(raw: unknown): Lead {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_LEAD };
  }

  const data = raw as Record<string, unknown>;
  const metrics = normalizeMetrics(data.metrics);

  const socialMedia: Lead['socialMedia'] = {};
  if (typeof data.socialMedia === 'object' && data.socialMedia !== null) {
    Object.assign(socialMedia, data.socialMedia as Lead['socialMedia']);
  }

  const potentialSocialKeys: Array<[keyof Lead['socialMedia'], unknown]> = [
    ['linkedin', data.linkedin],
    ['whatsapp', data.whatsapp],
    ['instagram', data.instagram],
    ['facebook', data.facebook],
    ['twitter', data.twitter],
  ];

  potentialSocialKeys.forEach(([key, value]) => {
    const normalized = stringOrUndefined(value);
    if (normalized) {
      socialMedia[key] = normalized;
    }
  });

  const normalized: Lead = {
    ...DEFAULT_LEAD,
    id: (data.id ?? data.leadId ?? data.user_id ?? DEFAULT_LEAD.id) as Lead['id'],
    name: stringOrDefault(data.name ?? data.fullName, DEFAULT_LEAD.name),
    email: stringOrUndefined(data.email ?? data.contactEmail),
    channel: stringOrDefault(data.channel ?? data.platform, DEFAULT_LEAD.channel),
    platform: stringOrDefault(data.platform ?? data.channel, DEFAULT_LEAD.channel),
    status: normalizeStatus(data.status),
    role: stringOrUndefined(data.role ?? data.title) ?? DEFAULT_LEAD.role,
    company: stringOrUndefined(data.company ?? data.organization),
    location: stringOrUndefined(data.location ?? data.city),
    phoneNumber: stringOrUndefined(data.phoneNumber ?? data.phone),
    bio: stringOrUndefined(data.bio ?? data.summary) ?? DEFAULT_LEAD.bio,
    lastActivity: stringOrDefault(data.lastActivity ?? data.last_contacted_at, DEFAULT_LEAD.lastActivity),
    stage: stringOrUndefined(data.stage ?? data.pipelineStage) ?? DEFAULT_LEAD.stage,
    profileUrl: stringOrUndefined(data.profileUrl ?? data.social_profile_url),
    postContent: stringOrUndefined(data.postContent ?? data.post_content),
    engagement: ensureNumber(data.engagement ?? data.engagementScore, DEFAULT_LEAD.metrics.engagementScore ?? 0),
    metrics,
    socialMedia,
  };

  return normalized;
}

async function getLeads(): Promise<ApiResult<LeadListItem[]>> {
  return request<LeadListItem[]>('/api/leads');
}

async function getHotLeadById(id: number | string): Promise<ApiResult<LeadDetailResponse>> {
  return request<LeadDetailResponse>(`/api/leads/${id}`);
}

async function getEngagementFeed(leadId: number | string): Promise<ApiResult<EngagementFeedEntry[]>> {
  return request<EngagementFeedEntry[]>(`/api/leads/${leadId}/engagement`);
}

async function getLeadOutreachByUserId(leadId: number | string): Promise<ApiResult<OutreachEntry[]>> {
  return request<OutreachEntry[]>(`/api/leads/${leadId}/outreach`);
}

const customer360Service = {
  getLeads,
  getHotLeadById,
  getEngagementFeed,
  getLeadOutreachByUserId,
  normalizeHotLeadData,
};

export type { LeadListItem, LeadDetailResponse, EngagementFeedEntry, OutreachEntry, ApiResult };

export default customer360Service;


