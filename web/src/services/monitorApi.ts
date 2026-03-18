"use client";
import { useQuery } from '@tanstack/react-query';
import type {
    Alert,
    DashboardStats,
} from '@/components/lad-monitor/types';

const getApiBase = () => {
    if (typeof window !== 'undefined') {
        return (process.env.NEXT_PUBLIC_MONITOR_API_URL as string) || 'http://localhost:3002/api';
    }
    return (process.env.MONITOR_API_URL as string) || 'http://localhost:3002/api';
};

interface RequestOptions extends RequestInit {
    transform?: (data: any) => any;
}

const monitorFetch = async (endpoint: string, options: RequestOptions = {}) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('monitorAuthToken') : null;
    const schema = process.env.NEXT_PUBLIC_LAD_SCHEMA || 'lad_dev';

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(schema ? { 'X-Schema': schema } : {}),
        ...options.headers,
    };

    const API_BASE = getApiBase();

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
        cache: 'no-store',
    });

    if (response.status === 401) {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('monitorAuthToken');
        }
    }

    if (!response.ok) {
        throw new Error(`Monitor API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return options.transform ? options.transform(data) : data;
};

// ─── API Methods ─────────────────────────────────────────────────────────────
const monitorApiBase = {
    getDashboardStats: (timeView?: string): Promise<DashboardStats | null> => {
        const now = new Date();
        let startDate: string;
        switch (timeView) {
            case '1h': startDate = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); break;
            case '24h': startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(); break;
            case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(); break;
            case 'year': startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString(); break;
            case '30d':
            default: startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(); break;
        }
        const endDate = now.toISOString();
        return monitorFetch(`/dashboard/stats?startDate=${startDate}&endDate=${endDate}`).catch(() => null);
    },

    getTenants: (timeView?: string) => {
        const now = new Date();
        let startDate: string;
        switch (timeView) {
            case '1h': startDate = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); break;
            case '24h': startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(); break;
            case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(); break;
            case 'year': startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString(); break;
            case '30d':
            default: startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(); break;
        }
        const endDate = now.toISOString();
        return monitorFetch(`/tenants?startDate=${startDate}&endDate=${endDate}`).catch(() => []);
    },

    getUsers: () => monitorFetch('/users').catch(() => []),

    getAlerts: (): Promise<Alert[]> => monitorFetch('/alerts').catch(() => []),

    getSystemHealth: () => monitorFetch('/system-health').catch(() => []),

    getTrendData: (range: string) => monitorFetch(`/trends?range=${range}`).catch(() => []),

    getApiPerformance: () => monitorFetch('/performance/api').catch(() => []),

    getSlowQueries: () => monitorFetch('/performance/slow-queries').catch(() => []),

    getHttpLogs: () => monitorFetch('/logs/http').catch(() => []),

    getNetworkLogs: () => monitorFetch('/logs/network').catch(() => []),

    getRecentActivities: () => monitorFetch('/activities').catch(() => []),

    getCampaigns: (status?: string) => {
        let url = '/campaigns';
        if (status) url += `?status=${status}`;
        return monitorFetch(url).then((r) => Array.isArray(r) ? r : ((r as any)?.data || [])).catch(() => []);
    },

    getVoiceAgents: () =>
        monitorFetch('/voice-agent/user/available-agents')
            .then((r) => Array.isArray(r) ? r : ((r as any)?.data || []))
            .catch(() => []),

    getCallLogs: (fromDate?: string, toDate?: string, tenantId?: string) => {
        if (tenantId) {
            let url = `/tenants/${tenantId}/call-logs?limit=500`;
            if (fromDate) url += `&startDate=${fromDate}`;
            if (toDate) url += `&endDate=${toDate}`;
            return monitorFetch(url).catch(() => []);
        }
        let url = '/voice-agent/calls';
        const params = new URLSearchParams();
        if (fromDate) params.append('startDate', fromDate);
        if (toDate) params.append('endDate', toDate);
        const qs = params.toString();
        if (qs) url += `?${qs}`;
        return monitorFetch(url).catch(() => []);
    },

    getCloudLogs: (params: {
        limit?: number;
        severity?: string;
        service?: string;
        pageToken?: string;
        startTime?: string;
        endTime?: string;
    } = {}) => {
        const q = new URLSearchParams();
        if (params.limit) q.set('limit', String(params.limit));
        if (params.severity) q.set('severity', params.severity);
        if (params.service) q.set('service', params.service);
        if (params.pageToken) q.set('pageToken', params.pageToken);
        if (params.startTime) q.set('startTime', params.startTime);
        if (params.endTime) q.set('endTime', params.endTime);
        return monitorFetch(`/cloud-logs${q.toString() ? '?' + q.toString() : ''}`).catch(() => ({ entries: [] }));
    },

    getCloudLogServices: () => monitorFetch('/cloud-logs/services').catch(() => []),
    getCloudLogConfig: () => monitorFetch('/cloud-logs/config').catch(() => null),

    createVoiceAgent: (data: any, tenantId: string) =>
        monitorFetch('/voice-agent', {
            method: 'POST',
            headers: { 'X-Tenant-Id': tenantId },
            body: JSON.stringify(data),
        }),

    updateVoiceAgent: (agentId: string, data: any, tenantId: string) =>
        monitorFetch(`/voice-agent/${agentId}`, {
            method: 'PUT',
            headers: { 'X-Tenant-Id': tenantId },
            body: JSON.stringify(data),
        }),

    inviteTenant: (email: string) =>
        monitorFetch('/tenants/invite', {
            method: 'POST',
            body: JSON.stringify({ email }),
        }),

    createTenant: (data: any) =>
        monitorFetch('/tenants', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    createUser: (data: any, tenantId: string) =>
        monitorFetch('/users', {
            method: 'POST',
            headers: { 'X-Tenant-Id': tenantId },
            body: JSON.stringify(data),
        }),

    updateUser: (userId: string, data: any, tenantId: string) =>
        monitorFetch(`/users/${userId}`, {
            method: 'PUT',
            headers: { 'X-Tenant-Id': tenantId },
            body: JSON.stringify(data),
        }),
};

const proxyFetch = async (endpoint: string, options: any = {}, tenantId?: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('monitorAuthToken') : null;
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(tenantId ? { 'X-Tenant-Id': tenantId } : {}),
        ...options.headers,
    };
    const response = await fetch(endpoint, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || `Proxy Error: ${response.status}`);
    }
    return data;
};

export const monitorApi = {
    ...monitorApiBase,
    settings: {
        getAgents: (tenantId?: string) => proxyFetch('/api/voice-agent/settings/agents', {}, tenantId),
        getAgentById: (id: string, tenantId?: string) => proxyFetch(`/api/voice-agent/settings/agents/${id}`, {}, tenantId),
        createAgent: (data: any, tenantId?: string) => proxyFetch('/api/voice-agent/settings/agents', {
            method: 'POST',
            body: JSON.stringify(data)
        }, tenantId),
        updateAgent: (id: string, data: any, tenantId?: string) => proxyFetch(`/api/voice-agent/settings/agents/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }, tenantId),
        deleteAgent: (id: string, tenantId?: string) => proxyFetch(`/api/voice-agent/settings/agents/${id}`, {
            method: 'DELETE'
        }, tenantId),
        searchAgents: (query: string, tenantId?: string) =>
            proxyFetch(`/api/voice-agent/settings/agents/search?q=${encodeURIComponent(query)}`, {}, tenantId),

        getVoices: (tenantId?: string) => proxyFetch('/api/voice-agent/settings/voices', {}, tenantId),
        getVoiceById: (id: string, tenantId?: string) => proxyFetch(`/api/voice-agent/settings/voices/${id}`, {}, tenantId),
        createVoice: (data: any, tenantId?: string) => proxyFetch('/api/voice-agent/settings/voices', {
            method: 'POST',
            body: JSON.stringify(data)
        }, tenantId),
        updateVoice: (id: string, data: any, tenantId?: string) => proxyFetch(`/api/voice-agent/settings/voices/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }, tenantId),
        deleteVoice: (id: string, tenantId?: string) => proxyFetch(`/api/voice-agent/settings/voices/${id}`, {
            method: 'DELETE'
        }, tenantId),
        getVoicesByProvider: (provider: string, tenantId?: string) =>
            proxyFetch(`/api/voice-agent/settings/voices/provider/${provider}`, {}, tenantId),
        searchVoices: (query: string, tenantId?: string) =>
            proxyFetch(`/api/voice-agent/settings/voices/search?q=${encodeURIComponent(query)}`, {}, tenantId),
        getAgentsByVoiceId: (voiceId: string, tenantId?: string) =>
            proxyFetch(`/api/voice-agent/settings/voices/${voiceId}/agents`, {}, tenantId),
    }
};

// ─── React Query Hooks ────────────────────────────────────────────────────────

export function useSystemHealth() {
    return useQuery({
        queryKey: ['monitor', 'system-health'],
        queryFn: monitorApi.getSystemHealth,
        refetchInterval: 30000,
    });
}

export function useTrendData(range: string) {
    return useQuery({
        queryKey: ['monitor', 'trends', range],
        queryFn: () => monitorApi.getTrendData(range),
        refetchInterval: 60000,
    });
}

export function useDashboardStats(timeView?: string) {
    return useQuery({
        queryKey: ['monitor', 'dashboard-stats', timeView],
        queryFn: () => monitorApi.getDashboardStats(timeView),
        refetchInterval: 30000,
    });
}

export function useTenants(timeView?: string) {
    return useQuery({
        queryKey: ['monitor', 'tenants', timeView],
        queryFn: () => monitorApi.getTenants(timeView),
        refetchInterval: 60000,
    });
}

export function useAlerts(enabled = true) {
    return useQuery({
        queryKey: ['monitor', 'alerts'],
        queryFn: monitorApi.getAlerts,
        enabled,
        refetchInterval: 30000,
    });
}

export function useRecentActivities() {
    return useQuery({
        queryKey: ['monitor', 'activities'],
        queryFn: monitorApi.getRecentActivities,
        refetchInterval: 15000,
    });
}

export function useCampaigns(status?: string) {
    return useQuery({
        queryKey: ['monitor', 'campaigns', status],
        queryFn: () => monitorApi.getCampaigns(status),
        refetchInterval: 60000,
        initialData: [] as any[],
    });
}

export function useVoiceAgents() {
    return useQuery({
        queryKey: ['monitor', 'voice-agents'],
        queryFn: monitorApi.getVoiceAgents,
        refetchInterval: 60000,
        initialData: [] as any[],
    });
}

export function useTenantVoiceAgents(tenantId?: string) {
    return useQuery({
        queryKey: ['monitor', 'tenant-agents', tenantId],
        queryFn: () => monitorApi.settings.getAgents(tenantId),
        refetchInterval: 60000,
        enabled: !!tenantId,
        initialData: [] as any[],
    });
}

export function useUsers() {
    return useQuery({
        queryKey: ['monitor', 'users'],
        queryFn: monitorApi.getUsers,
        refetchInterval: 60000,
    });
}

export function useCallLogs(fromDate?: string, toDate?: string, tenantId?: string) {
    return useQuery({
        queryKey: ['monitor', 'call-logs', fromDate, toDate, tenantId],
        queryFn: () => monitorApi.getCallLogs(fromDate, toDate, tenantId),
        refetchInterval: 60000,
        enabled: tenantId !== undefined ? !!tenantId : true,
        staleTime: 0,
        refetchOnMount: true,
    });
}

export function useHttpLogs() {
    return useQuery({
        queryKey: ['monitor', 'http-logs'],
        queryFn: monitorApi.getHttpLogs,
        refetchInterval: 30000,
    });
}

export function useNetworkLogs() {
    return useQuery({
        queryKey: ['monitor', 'network-logs'],
        queryFn: monitorApi.getNetworkLogs,
        refetchInterval: 30000,
    });
}

export function useApiPerformance() {
    return useQuery({
        queryKey: ['monitor', 'api-performance'],
        queryFn: monitorApi.getApiPerformance,
        refetchInterval: 30000,
    });
}

export function useSlowQueries() {
    return useQuery({
        queryKey: ['monitor', 'slow-queries'],
        queryFn: monitorApi.getSlowQueries,
        refetchInterval: 60000,
    });
}

export function useCloudLogs(params: Parameters<typeof monitorApi.getCloudLogs>[0] = {}) {
    return useQuery({
        queryKey: ['monitor', 'cloud-logs', params],
        queryFn: () => monitorApi.getCloudLogs(params),
        refetchInterval: 30000,
    });
}

export function useCloudLogServices() {
    return useQuery({
        queryKey: ['monitor', 'cloud-log-services'],
        queryFn: monitorApi.getCloudLogServices,
        staleTime: 5 * 60 * 1000,
    });
}

export function useCloudLogConfig() {
    return useQuery({
        queryKey: ['monitor', 'cloud-log-config'],
        queryFn: monitorApi.getCloudLogConfig,
        staleTime: 5 * 60 * 1000,
    });
}
