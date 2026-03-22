'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Send,
  RefreshCw,
  Settings,
  Calendar,
  MessageSquare,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  Loader2,
  GitFork,
  X,
  Play,
  Ban,
  Search,
  Info,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FollowupStatus {
  scheduled_count: number;
  recent_sent_24h: number;
  eligible_leads: number;
  business_hours: boolean;
  scheduler_active: boolean;
}

interface InactiveLead {
  lead_id: string;
  phone_number: string;
  first_name?: string;
  last_name?: string;
  context_status?: string;
  hours_inactive?: number;
  last_message_at?: string;
  followup_scheduled?: boolean;
}

interface IcpConfig {
  enabled: boolean;
  idle_hours: number;
  interval_minutes: number;
  max_attempts: number;
  message_type: 'template' | 'custom';
  template_message: string;
  custom_message: string;
}

interface IcpStatusData {
  total_idle: number;
  eligible_for_followup: number;
  already_scheduled: number;
  last_sent?: string;
}

interface WaTemplate {
  name: string;
  language: string;
  status: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...((options.headers as Record<string, string>) || {}) },
    ...options,
  });
  return res.json();
}

function formatHours(h?: number) {
  if (h === undefined || h === null) return '—';
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_COLORS: Record<string, string> = {
  Greeting: 'bg-blue-100 text-blue-700',
  'Info Gathering': 'bg-yellow-100 text-yellow-700',
  'Slot Finalizing': 'bg-purple-100 text-purple-700',
  default: 'bg-gray-100 text-gray-600',
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-semibold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FollowUpsPage() {
  const [activeTab, setActiveTab] = useState<'leads' | 'settings'>('leads');

  // ── Status & leads state ──
  const [status, setStatus] = useState<FollowupStatus | null>(null);
  const [leads, setLeads] = useState<InactiveLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [actionResult, setActionResult] = useState<{ id: string; ok: boolean; msg: string } | null>(null);

  // ── ICP settings state ──
  const [config, setConfig] = useState<IcpConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [configDirty, setConfigDirty] = useState(false);
  const [icpStatus, setIcpStatus] = useState<IcpStatusData | null>(null);
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [templateSending, setTemplateSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateTarget, setTemplateTarget] = useState<'all' | 'eligible'>('eligible');

  // ── Load followup status ──
  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const d = await apiFetch('/api/whatsapp-conversations/followup/status');
      if (d?.success !== false) setStatus(d);
    } catch {/* ignore */} finally {
      setStatusLoading(false);
    }
  }, []);

  // ── Load inactive leads ──
  const loadLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      const d = await apiFetch('/api/whatsapp-conversations/followup/leads-inactive');
      if (Array.isArray(d)) setLeads(d);
      else if (Array.isArray(d?.data)) setLeads(d.data);
    } catch {/* ignore */} finally {
      setLeadsLoading(false);
    }
  }, []);

  // ── Load ICP config ──
  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const d = await apiFetch('/api/whatsapp-conversations/followup-settings');
      if (d && !d.error) { setConfig(d); setConfigDirty(false); }
    } catch {/* ignore */} finally {
      setConfigLoading(false);
    }
  }, []);

  // ── Load ICP status ──
  const loadIcpStatus = useCallback(async () => {
    try {
      const d = await apiFetch('/api/whatsapp-conversations/followup-settings/status');
      if (d && !d.error) setIcpStatus(d);
    } catch {/* ignore */}
  }, []);

  // ── Load WA templates ──
  const loadTemplates = useCallback(async () => {
    try {
      const d = await apiFetch('/api/whatsapp-conversations/followup-settings/templates');
      if (Array.isArray(d?.data)) {
        setTemplates(d.data.filter((t: WaTemplate) => t.status === 'APPROVED'));
        if (d.data.length > 0) setSelectedTemplate(d.data[0].name);
      }
    } catch {/* ignore */}
  }, []);

  useEffect(() => {
    loadStatus();
    loadLeads();
    loadConfig();
    loadIcpStatus();
    loadTemplates();
  }, [loadStatus, loadLeads, loadConfig, loadIcpStatus, loadTemplates]);

  // ── Schedule / cancel followup ──
  const scheduleFollowup = useCallback(async (lead: InactiveLead) => {
    setActionLoading((p) => ({ ...p, [lead.lead_id]: true }));
    try {
      const d = await apiFetch(
        `/api/whatsapp-conversations/followup/schedule/${lead.lead_id}`,
        {
          method: 'POST',
          body: JSON.stringify({ phone_number: lead.phone_number, delay_hours: 1 }),
        },
      );
      setActionResult({
        id: lead.lead_id,
        ok: d?.success !== false,
        msg: d?.message || (d?.success !== false ? 'Scheduled!' : d?.error || 'Failed'),
      });
      await loadLeads();
      await loadStatus();
    } catch {
      setActionResult({ id: lead.lead_id, ok: false, msg: 'Network error' });
    } finally {
      setActionLoading((p) => ({ ...p, [lead.lead_id]: false }));
    }
  }, [loadLeads, loadStatus]);

  const cancelFollowup = useCallback(async (lead: InactiveLead) => {
    setActionLoading((p) => ({ ...p, [lead.lead_id]: true }));
    try {
      const d = await apiFetch(
        `/api/whatsapp-conversations/followup/schedule/${lead.lead_id}`,
        { method: 'DELETE' },
      );
      setActionResult({
        id: lead.lead_id,
        ok: d?.success !== false,
        msg: d?.message || (d?.success !== false ? 'Cancelled' : d?.error || 'Failed'),
      });
      await loadLeads();
      await loadStatus();
    } catch {
      setActionResult({ id: lead.lead_id, ok: false, msg: 'Network error' });
    } finally {
      setActionLoading((p) => ({ ...p, [lead.lead_id]: false }));
    }
  }, [loadLeads, loadStatus]);

  // ── Save ICP config ──
  const saveConfig = async () => {
    if (!config) return;
    setConfigSaving(true);
    try {
      const d = await apiFetch('/api/whatsapp-conversations/followup-settings', {
        method: 'PUT',
        body: JSON.stringify(config),
      });
      if (d && !d.error) { setConfig(d); setConfigDirty(false); }
    } catch {/* ignore */} finally {
      setConfigSaving(false);
    }
  };

  const updateConfig = (patch: Partial<IcpConfig>) => {
    setConfig((c) => c ? { ...c, ...patch } : c);
    setConfigDirty(true);
  };

  // ── Send template ──
  const sendTemplate = async () => {
    if (!selectedTemplate) return;
    setTemplateSending(true);
    try {
      await apiFetch('/api/whatsapp-conversations/followup-settings/send-template', {
        method: 'POST',
        body: JSON.stringify({
          template_name: selectedTemplate,
          language_code: 'en_GB',
          member_phones: [templateTarget === 'all' ? 'all' : 'eligible'],
        }),
      });
      await loadIcpStatus();
    } catch {/* ignore */} finally {
      setTemplateSending(false);
    }
  };

  // ── Filtered leads ──
  const filteredLeads = leads.filter((l) => {
    const name = `${l.first_name || ''} ${l.last_name || ''}`.trim().toLowerCase();
    const phone = (l.phone_number || '').toLowerCase();
    const q = search.toLowerCase();
    return !q || name.includes(q) || phone.includes(q);
  });

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <GitFork className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Follow-ups</h1>
            <p className="text-sm text-gray-500">Manage automated follow-ups and re-engagement messages</p>
          </div>
        </div>
        <button
          onClick={() => { loadStatus(); loadLeads(); loadConfig(); loadIcpStatus(); }}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Scheduled"
            value={statusLoading ? '—' : (status?.scheduled_count ?? 0)}
            icon={Calendar}
            color="bg-blue-50 text-blue-600"
            sub="Pending send"
          />
          <StatCard
            label="Sent (24h)"
            value={statusLoading ? '—' : (status?.recent_sent_24h ?? 0)}
            icon={CheckCircle}
            color="bg-green-50 text-green-600"
            sub="Last 24 hours"
          />
          <StatCard
            label="Eligible Leads"
            value={statusLoading ? '—' : (status?.eligible_leads ?? 0)}
            icon={Users}
            color="bg-orange-50 text-orange-600"
            sub="Need follow-up"
          />
          <StatCard
            label="Scheduler"
            value={statusLoading ? '—' : (status?.scheduler_active ? 'Active' : 'Paused')}
            icon={status?.scheduler_active ? Bell : AlertCircle}
            color={status?.scheduler_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}
            sub={status?.business_hours ? 'Business hours' : 'Outside hours'}
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('leads')}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'leads'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-4 h-4" />
              Inactive Leads
              {leads.length > 0 && (
                <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  {leads.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings className="w-4 h-4" />
              ICP Follow-up Settings
            </button>
          </div>

          {/* ── Inactive Leads Tab ─────────────────────────────────────────── */}
          {activeTab === 'leads' && (
            <div className="p-5">
              {/* Search bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  placeholder="Search by name or phone…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>

              {/* Toast notification */}
              {actionResult && (
                <div
                  className={`mb-4 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm ${
                    actionResult.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {actionResult.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  {actionResult.msg}
                  <button className="ml-auto" onClick={() => setActionResult(null)}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {leadsLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading inactive leads…
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                  <CheckCircle className="w-10 h-10 text-green-300" />
                  <p className="font-medium text-gray-600">No inactive leads found</p>
                  <p className="text-sm">All leads are engaged or there are no eligible leads at this time.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Lead</th>
                        <th className="pb-3 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="pb-3 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Inactive for</th>
                        <th className="pb-3 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Last message</th>
                        <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredLeads.map((lead) => {
                        const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.phone_number;
                        const statusColor = STATUS_COLORS[lead.context_status ?? ''] ?? STATUS_COLORS.default;
                        const isLoading = actionLoading[lead.lead_id];
                        return (
                          <tr key={lead.lead_id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3.5 pr-4">
                              <div className="font-medium text-gray-900">{name}</div>
                              <div className="text-xs text-gray-400 mt-0.5">{lead.phone_number}</div>
                            </td>
                            <td className="py-3.5 pr-4">
                              {lead.context_status && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                                  {lead.context_status}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 pr-4">
                              <div className="flex items-center gap-1.5 text-orange-600 font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                {formatHours(lead.hours_inactive)}
                              </div>
                            </td>
                            <td className="py-3.5 pr-4 text-gray-500 text-xs">
                              {formatDate(lead.last_message_at)}
                            </td>
                            <td className="py-3.5">
                              {lead.followup_scheduled ? (
                                <button
                                  disabled={isLoading}
                                  onClick={() => cancelFollowup(lead)}
                                  className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                                >
                                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                                  Cancel
                                </button>
                              ) : (
                                <button
                                  disabled={isLoading}
                                  onClick={() => scheduleFollowup(lead)}
                                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                                >
                                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                                  Schedule
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── ICP Settings Tab ───────────────────────────────────────────── */}
          {activeTab === 'settings' && (
            <div className="p-5 space-y-6">
              {configLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading settings…
                </div>
              ) : !config ? (
                <div className="flex items-center justify-center py-16 text-gray-400">
                  Failed to load settings.
                </div>
              ) : (
                <>
                  {/* ICP Status cards */}
                  {icpStatus && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                        <p className="text-2xl font-semibold text-blue-700">{icpStatus.total_idle}</p>
                        <p className="text-xs text-blue-500 mt-1">Total idle members</p>
                      </div>
                      <div className="bg-orange-50 rounded-xl p-4 text-center border border-orange-100">
                        <p className="text-2xl font-semibold text-orange-700">{icpStatus.eligible_for_followup}</p>
                        <p className="text-xs text-orange-500 mt-1">Eligible for follow-up</p>
                      </div>
                      <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                        <p className="text-2xl font-semibold text-green-700">{icpStatus.already_scheduled}</p>
                        <p className="text-xs text-green-500 mt-1">Already scheduled</p>
                      </div>
                    </div>
                  )}

                  {/* Config form */}
                  <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">Automated ICP Follow-ups</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          Automatically follow up with members who haven't completed their profile
                        </p>
                      </div>
                      <button
                        onClick={() => updateConfig({ enabled: !config.enabled })}
                        className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                          config.enabled
                            ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {config.enabled
                          ? <ToggleRight className="w-4 h-4" />
                          : <ToggleLeft className="w-4 h-4" />}
                        {config.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Idle Hours Before First Follow-up
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={168}
                          value={config.idle_hours}
                          onChange={(e) => updateConfig({ idle_hours: parseInt(e.target.value) || 1 })}
                          className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                        />
                        <p className="text-xs text-gray-400 mt-1">Hours of inactivity before sending (1–168)</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Repeat Interval (minutes)
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={1440}
                          value={config.interval_minutes}
                          onChange={(e) => updateConfig({ interval_minutes: parseInt(e.target.value) || 5 })}
                          className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                        />
                        <p className="text-xs text-gray-400 mt-1">Minutes between repeat messages (5–1440)</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Max Attempts
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={config.max_attempts}
                          onChange={(e) => updateConfig({ max_attempts: parseInt(e.target.value) || 1 })}
                          className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                        />
                        <p className="text-xs text-gray-400 mt-1">Max follow-up messages per member (1–10)</p>
                      </div>
                    </div>

                    {/* Message type */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Message Type
                      </label>
                      <div className="flex gap-3 mt-1.5">
                        {(['template', 'custom'] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => updateConfig({ message_type: t })}
                            className={`flex-1 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${
                              config.message_type === t
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                            }`}
                          >
                            {t === 'template' ? '📋 Template' : '✏️ Custom'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {config.message_type === 'custom' && (
                      <div>
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Custom Message
                          <span className="ml-1 text-gray-400 normal-case font-normal">(use {'{member_name}'} for personalisation)</span>
                        </label>
                        <textarea
                          rows={3}
                          value={config.custom_message}
                          onChange={(e) => updateConfig({ custom_message: e.target.value })}
                          className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white resize-none"
                          placeholder="Hi {member_name}, we noticed…"
                        />
                      </div>
                    )}

                    {config.message_type === 'template' && (
                      <div className="flex items-start gap-2 bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-600">
                          Template messages use pre-approved WhatsApp templates. Use the <strong>Send Template</strong> section below to send to members immediately.
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        disabled={!configDirty || configSaving}
                        onClick={saveConfig}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                      >
                        {configSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        {configSaving ? 'Saving…' : 'Save Settings'}
                      </button>
                    </div>
                  </div>

                  {/* Send template section */}
                  <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900">Send Template Now</h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Immediately send a WhatsApp template to eligible members
                      </p>
                    </div>

                    {templates.length === 0 ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400 bg-white rounded-lg border border-dashed border-gray-200 p-4">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        No approved templates found. Create templates in Meta Business Manager.
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-3 flex-wrap">
                          <div className="flex-1 min-w-48">
                            <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Template</label>
                            <div className="relative mt-1.5">
                              <select
                                value={selectedTemplate}
                                onChange={(e) => setSelectedTemplate(e.target.value)}
                                className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                              >
                                {templates.map((t) => (
                                  <option key={t.name} value={t.name}>
                                    {t.name} ({t.language})
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-36">
                            <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Send to</label>
                            <div className="relative mt-1.5">
                              <select
                                value={templateTarget}
                                onChange={(e) => setTemplateTarget(e.target.value as 'all' | 'eligible')}
                                className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                              >
                                <option value="eligible">Eligible members only</option>
                                <option value="all">All idle members</option>
                              </select>
                              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          {icpStatus && (
                            <p className="text-sm text-gray-500">
                              Will send to{' '}
                              <strong className="text-gray-700">
                                {templateTarget === 'eligible'
                                  ? icpStatus.eligible_for_followup
                                  : icpStatus.total_idle}
                              </strong>{' '}
                              member{(templateTarget === 'eligible' ? icpStatus.eligible_for_followup : icpStatus.total_idle) !== 1 ? 's' : ''}
                            </p>
                          )}
                          <button
                            disabled={templateSending || !selectedTemplate}
                            onClick={sendTemplate}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors ml-auto"
                          >
                            {templateSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {templateSending ? 'Sending…' : 'Send Template'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
