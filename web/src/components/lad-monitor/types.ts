export type TimeRange = '1h' | '24h' | '7d' | '30d';

export type HealthStatus = 'healthy' | 'warning' | 'critical';
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
export type TenantPlan = 'free' | 'trial' | 'pro' | 'enterprise' | 'starter' | 'professional' | 'business' | 'enterprise_starter' | 'enterprise_professional' | 'enterprise_business';
export type UserRole = 'admin' | 'manager' | 'agent' | 'viewer';
export type UserStatus = 'active' | 'inactive';

export interface MetricCardData {
  label: string;
  value: string | number;
  trend?: { value: number; direction: 'up' | 'down' };
  icon: string;
}

export interface SystemHealthItem {
  name: string;
  status: HealthStatus;
}

export interface TrendDataPoint {
  time: string;
  requests: number;
}

export interface RecentActivity {
  id: string;
  type: string;
  status: string;
  timestamp: string;
  title: string;
  description: string;
  meta?: string;
  source: 'campaign' | 'voice' | 'lead';
}

export interface TenantUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role?: UserRole;
  status?: UserStatus;
  lastActive?: string;
}

export interface TenantIntegration {
  name: string;
  connected: boolean;
  account?: string;
  accounts?: {
    id: string;
    email: string;
    name: string;
    connectedAt: string;
    status?: string;
    profileUrl?: string;
  }[];
}

export interface TenantVoiceAgent {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  language: string;
  gender: string;
  provider: string;
  instructions?: string;
  systemInstructions?: string;
  outboundStarterPrompt?: string;
  inboundStarterPrompt?: string;
  voiceId?: string;
}

export interface TenantBilling {
  creditsBalance: number;
  monthlyUsage: number;
  totalSpent: string;
  plan: TenantPlan;
  renewsOn: string;
  totalCreditsUsed?: number;
  monthlyTrend?: string;
  mostUsedFeature?: {
    name: string;
    credits: number;
    percentage: number;
  };
  usageByFeature?: {
    feature: string;
    credits: number;
    color: string;
  }[];
}

export interface TenantCampaign {
  id: string;
  name: string;
  status: string;
  type: string;
  createdAt: string;
  leads?: number;
  sent?: number;
  connected?: number;
  replied?: number;
  channels?: string[];
  actions?: number;
  creditsUsed?: number;
}

export interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalLeadsGenerated: number;
  connectionRequestsSent: number;
  connectionAccepted?: number;
  messagesSent?: number;
  replyRate: number;
  linkedin: {
    dailyLimit: number;
    actionsToday: number;
    totalAccounts: number;
  };
}

export interface CallLog {
  id: string;
  startedAt: string;
  duration: number;
  status: string;
  direction: string;
  cost: number;
  agentName: string;
  leadName: string;
  tags?: string[];
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  website?: string;
  plan: TenantPlan;
  status: HealthStatus | 'active' | 'trial';
  activeUsers: number;
  apiCalls: number;
  errorRate: number;
  storageUsed: number;
  storageLimit: number;
  users: TenantUser[];
  integrations: TenantIntegration[];
  voiceAgents: TenantVoiceAgent[];
  voiceAgentsCount?: number;
  billing: TenantBilling;
  campaigns: number;
  campaignStats?: CampaignStats;
  campaignsList?: TenantCampaign[];
  conversations: number;
  calls: number;
  callLogs?: CallLog[];
  leadTemperatures?: {
    hot: number;
    warm: number;
    cold: number;
    notQualified: number;
  };
  industry?: string;
  pipelineLeads: number;
  pipelineLeadsTotal?: number;
  pipelineLeadsList?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    stage: string;
    status: string;
    priority: string;
    amount: string;
    source: string;
    createdAt: string;
    lastActivity: string;
  }[];
}

export interface UserActivity {
  id: string;
  user: string;
  email: string;
  action: string;
  resource: string;
  timestamp: string;
  sessionDuration: string;
}

export interface AuditEntry {
  id: string;
  user: string;
  action: string;
  timestamp: string;
}

export interface ApiPerformance {
  endpoint: string;
  requestsPerSec: number;
  avgResponse: number;
  p95: number;
  p99: number;
  errorRate: number;
}

export interface SlowQuery {
  query: string;
  duration: number;
  timestamp: string;
  tenant: string;
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  status: AlertStatus;
  category: string;
  title: string;
  message: string;
  tenant: string;
  timestamp: string;
}

export interface HttpLogEntry {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  status: number;
  duration: string;
  host: string;
  client: string;
  requestId: string;
}

export interface NetworkLogEntry {
  id: string;
  timestamp: string;
  direction: 'inbound' | 'outbound';
  protocol: string;
  source: string;
  destination: string;
  peer: string;
  traffic: string;
  latency: string;
  status: 'OK' | 'Blocked';
}

export interface DashboardStats {
  totalTenants: number;
  totalUsers: number;
  callsToday: number;
  totalCalls: number;
  campaignsToday: number;
  totalCampaigns: number;
  activeCampaigns: number;
  voiceAgents: number;
  pipelineLeads: number;
  totalLeads: number;
  conversations: number;
  totalConversations: number;
  tenantsByPlan?: { name: string; value: number }[];
  voiceCallStatus?: { name: string; value: number }[];
  campaignDistribution?: { name: string; value: number }[];
  serviceMetrics?: {
    callSuccessRate: string;
    campaignQueue: string;
    avgCallDuration: string;
    leadEnrichment: string;
  };
}
