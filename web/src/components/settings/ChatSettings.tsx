'use client';
import { createPortal } from 'react-dom';
import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Save,
  Plus,
  Trash2,
  Loader2,
  BookOpen,
  Clock,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
  AlertCircle,
  Bell,
  Zap,
  Linkedin,
  ThumbsUp,
  MessageCircle,
  FlaskConical,
  Globe,
  Calendar,
  Info,
  X,
  Send,
  Sparkles,
  Check,
  UserMinus,
  EyeOff,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useConnectedChannels, type ChannelId } from '@/hooks/useConnectedChannels';
import KnowledgeBaseManager from './KnowledgeBaseManager';
import FollowupTouchesEditor, {
  defaultFollowupTouches,
  prepareTouchesForSave,
  touchesFromApi,
  type FollowupTouch,
} from './FollowupTouchesEditor';
import dynamic from 'next/dynamic';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import { TeamPersonasCard } from './TeamPersonasCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
// AIPlayground is a heavy client-only component (framer-motion, refs, browser
// APIs). Loading it dynamically with ssr:false keeps it out of the SSR bundle
// and only fetches the chunk when the user clicks "Test in AI Playground".
const AIPlayground = dynamic(
  () => import('../conversations/AIPlayground').then((m) => m.AIPlayground),
  { ssr: false },
);

// ── Types ────────────────────────────────────────────────────────

interface Prompt {
  name: string;
  prompt_text: string;
  version: number;
  is_active: boolean;
  channel: string;
  created_at: string | null;
  updated_at: string | null;
}

interface ChatSettingsConfig {
  knowledge_base: string;
  typing_indicator: boolean;          // personal WA
  waba_typing_indicator: boolean;     // WABA (API channel)
  campaign_frequency: {
    enabled: boolean;
    interval_hours: number;
    max_daily_messages: number;
  };
  web_scraping_enabled: boolean;
  web_scraping_urls: string[];
}

interface ShareableAsset {
  key?: string;
  url: string;
  filename?: string;
  mime_type?: string;
  media_type?: 'document' | 'image';
  trigger_keywords: string[];
}

// ── Types ────────────────────────────────────────────────────────

interface FollowupStageConfig {
  enabled: boolean;
  delay_hours: number;
}

interface FollowupStageConfigWithTemplate extends FollowupStageConfig {
  // Approved WhatsApp template name to use for this stage.  Required for
  // any stage whose delay pushes the customer outside Meta's 24-hour
  // free-text window (anything > 24 h, in practice).  Empty = AI-generated
  // free text (only safe within 24 h).
  template_name?: string;
}

interface BookingReminderEntry {
  delay_hours: number;
  template_name: string;
}

interface FollowupTimingConfig {
  enabled: boolean;
  stages: {
    FIRST: FollowupStageConfigWithTemplate;
    SECOND: FollowupStageConfigWithTemplate;
    THIRD: FollowupStageConfigWithTemplate;
    FOURTH: FollowupStageConfigWithTemplate;
  };
  // List of pre-booking reminders (e.g. 24h heads-up + 3h nudge).
  // Each entry has its own delay-before-start + template.
  booking_reminders: BookingReminderEntry[];
  // ── Legacy fields (kept readable for back-compat with older API versions);
  // the backend transparently migrates these into booking_reminders[0].
  booking_reminder_delay_hours?: number;
  booking_reminder_template_name?: string;
  meeting_reminder_delay_hours?: number;
}

interface WhatsAppApprovedTemplate {
  name: string;
  language: string;
  status: string;
  category: string;
  body: string;
  parameter_count: number;
}

const DEFAULT_FOLLOWUP_CONFIG: FollowupTimingConfig = {
  enabled: true,
  stages: {
    FIRST:  { enabled: true, delay_hours: 24,  template_name: '' },
    SECOND: { enabled: true, delay_hours: 72,  template_name: '' },
    THIRD:  { enabled: true, delay_hours: 168, template_name: '' },
    FOURTH: { enabled: true, delay_hours: 336, template_name: '' },
  },
  booking_reminders: [
    { delay_hours: 24, template_name: '' },
    { delay_hours: 3,  template_name: '' },
  ],
};

// ── API helpers ──────────────────────────────────────────────────

const PROMPTS_API = '/api/whatsapp-conversations/prompts';
const SETTINGS_API = '/api/whatsapp-conversations/chat-settings';
const FOLLOWUP_CONFIG_API = '/api/whatsapp-conversations/followup-config';
const SHAREABLE_ASSETS_API = '/api/whatsapp-conversations/chat-settings/shareable-assets';
const APPROVED_TEMPLATES_API = '/api/whatsapp-conversations/followup-settings/templates';
const GENERATE_PROMPT_API = '/api/ai-playground/generate-prompt';

interface MissingField { key: string; label: string; placeholder?: string; severity?: 'required' | 'optional'; }
interface GenerateResult {
  success: boolean;
  prompt_text: string | null;
  missing_fields?: MissingField[];
  error?: string;
  supported?: string[];
}

/** Generate a channel system prompt from the tenant's ICP/business knowledge (review-before-save). */
async function generatePrompt(channel: string, providedFields: Record<string, string> = {}): Promise<GenerateResult> {
  const res = await fetchWithTenant(GENERATE_PROMPT_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, provided_fields: providedFields }),
  });
  return res.json();
}

async function fetchApprovedTemplates(): Promise<WhatsAppApprovedTemplate[]> {
  try {
    const res = await fetchWithTenant(APPROVED_TEMPLATES_API);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.success) return [];
    const list = Array.isArray(data.data) ? data.data : [];
    return list.filter((t: WhatsAppApprovedTemplate) =>
      t && typeof t.name === 'string' && t.status === 'APPROVED'
    );
  } catch {
    return [];
  }
}

async function fetchShareableAssets(): Promise<ShareableAsset[]> {
  try {
    const res = await fetchWithTenant(SHAREABLE_ASSETS_API);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.assets) ? data.assets : [];
  } catch {
    return [];
  }
}

async function saveShareableAssets(assets: ShareableAsset[]): Promise<boolean> {
  try {
    const res = await fetchWithTenant(SHAREABLE_ASSETS_API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assets }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function fetchFollowupConfig(): Promise<FollowupTimingConfig> {
  try {
    const res = await fetchWithTenant(FOLLOWUP_CONFIG_API);
    if (!res.ok) return DEFAULT_FOLLOWUP_CONFIG;
    const data = await res.json();
    if (!data.success) return DEFAULT_FOLLOWUP_CONFIG;
    const cfg = data.data ?? data.config;
    if (!cfg || typeof cfg !== 'object') return DEFAULT_FOLLOWUP_CONFIG;
    const merged: FollowupTimingConfig = { ...DEFAULT_FOLLOWUP_CONFIG, ...cfg };
    // Defence-in-depth: if the backend returned only the legacy singular
    // fields (older deploys, in-flight migration), synthesize a one-item
    // booking_reminders list so the UI's add/remove buttons still work.
    if (!Array.isArray(merged.booking_reminders) || merged.booking_reminders.length === 0) {
      const legacyDelay =
        merged.booking_reminder_delay_hours
        ?? merged.meeting_reminder_delay_hours
        ?? 24;
      merged.booking_reminders = [{
        delay_hours:   legacyDelay,
        template_name: merged.booking_reminder_template_name ?? '',
      }];
    }
    return merged;
  } catch {
    return DEFAULT_FOLLOWUP_CONFIG;
  }
}

async function updateFollowupConfig(
  config: FollowupTimingConfig
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetchWithTenant(FOLLOWUP_CONFIG_API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json().catch(() => ({}));
    if (data.success) return { ok: true };
    // Surface the backend's reason - FastAPI validation errors arrive as
    // `detail` (e.g. the H16 guard: an enabled stage past the 24h window
    // with no template). A bare "Failed to save" hides the actionable part.
    return {
      ok: false,
      error:
        (typeof data.detail === 'string' && data.detail) ||
        data.error ||
        data.message ||
        `Save failed (HTTP ${res.status})`,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error while saving' };
  }
}

async function fetchPrompts(): Promise<Prompt[]> {
  const res = await fetchWithTenant(PROMPTS_API);
  const data = await res.json();
  // Node.js backend returns { success, prompts: [] }; Python returns { success, data: [] }
  const list = data.prompts ?? data.data ?? [];
  return Array.isArray(list) ? list : [];
}

async function updatePrompt(name: string, updates: Partial<Prompt>): Promise<boolean> {
  const res = await fetchWithTenant(`${PROMPTS_API}/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  return data.success;
}

async function createPrompt(prompt: { name: string; prompt_text: string; channel: string }): Promise<boolean> {
  const res = await fetchWithTenant(PROMPTS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prompt),
  });
  const data = await res.json();
  return data.success;
}

async function deletePrompt(name: string): Promise<boolean> {
  const res = await fetchWithTenant(`${PROMPTS_API}/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  return data.success;
}

const DEFAULT_CHAT_SETTINGS: ChatSettingsConfig = {
  knowledge_base: '',
  typing_indicator: true,
  waba_typing_indicator: true,
  campaign_frequency: { enabled: true, interval_hours: 24, max_daily_messages: 50 },
  web_scraping_enabled: false,
  web_scraping_urls: [],
};

async function fetchChatSettings(): Promise<ChatSettingsConfig> {
  // Load personal WA settings and WABA settings in parallel
  const [personalRes, wabaRes] = await Promise.allSettled([
    fetchWithTenant(`${SETTINGS_API}?channel=personal`),
    fetchWithTenant(`${SETTINGS_API}?channel=waba`),
  ]);

  // Personal WA
  let personalRaw: Record<string, any> = {};
  if (personalRes.status === 'fulfilled' && personalRes.value.ok) {
    try {
      const data = await personalRes.value.json();
      personalRaw = data.data ?? data.settings ?? data ?? {};
    } catch { /* ignore */ }
  }

  // WABA - Python service returns the row directly (not wrapped in { success, data })
  let wabaRaw: Record<string, any> = {};
  if (wabaRes.status === 'fulfilled' && wabaRes.value.ok) {
    try {
      const data = await wabaRes.value.json();
      wabaRaw = data.data ?? data.settings ?? data ?? {};
    } catch { /* ignore */ }
  }

  const wabaMeta: Record<string, any> =
    wabaRaw.metadata && typeof wabaRaw.metadata === 'object' ? wabaRaw.metadata : {};

  return {
    knowledge_base: personalRaw.knowledge_base ?? '',
    typing_indicator: personalRaw.typing_indicator !== false,
    waba_typing_indicator: wabaRaw.typing_indicator !== false,
    campaign_frequency: personalRaw.campaign_frequency ?? DEFAULT_CHAT_SETTINGS.campaign_frequency,
    web_scraping_enabled: Boolean(wabaMeta.web_scraping_enabled),
    web_scraping_urls: Array.isArray(wabaMeta.web_scraping_urls) ? wabaMeta.web_scraping_urls : [],
  };
}

async function updateChatSettings(updates: Partial<ChatSettingsConfig>): Promise<boolean> {
  try {
    const res = await fetchWithTenant(SETTINGS_API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    return data.success ?? false;
  } catch {
    return false;
  }
}

// ── Human-readable prompt names ──────────────────────────────────

const PROMPT_LABELS: Record<string, string> = {
  ONBOARDING_GREETING: 'Onboarding Greeting',
  ONBOARDING_PROFILE: 'Profile Collection',
  ICP_DISCOVERY: 'ICP Discovery',
  ONBOARDING_COMPLETE: 'Onboarding Complete',
  MATCH_SUGGESTION: 'Match Suggestion',
  COORDINATION_AVAILABILITY: 'Meeting Coordination',
  POST_MEETING_FOLLOWUP: 'Post-Meeting Followup',
  KPI_QUERY: 'KPI & Stats Query',
  GENERAL_QA: 'General Q&A',
  IDLE: 'Idle / Default',
};

function getLabel(name: string): string {
  return PROMPT_LABELS[name] || name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Channel tabs ─────────────────────────────────────────────────

const CHANNELS = [
  { id: 'waba', label: 'WABA', color: 'bg-green-500' },
  { id: 'personal_whatsapp', label: 'Personal Whatsapp', color: 'bg-emerald-400' },
  { id: 'linkedin', label: 'LinkedIn', color: 'bg-blue-600' },
  { id: 'gmail', label: 'Gmail', color: 'bg-red-500' },
  { id: 'instagram', label: 'Instagram', color: 'bg-pink-500' },
];

// ── Toast notification ───────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${
        type === 'success' ? 'bg-green-600' : 'bg-red-600'
      }`}
    >
      {type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {message}
    </div>
  );
}

// ── Email agent card (Gmail/Outlook tab) ─────────────────────────
// The email counterpart of the WABA/LinkedIn chat agents: the inbound poller
// (LAD-Email-Comms) answers new emails using this prompt via the shared AI
// stack (LAD-WABA-Comms). Prompt lives in the prompts table (channel='email',
// name='default'); the on/off flag in chat_settings.metadata.email_agent_enabled.

// ── Human takeover ──────────────────────────────────────────────────────────
// When a human agent replies in a chat the AI is muted so it cannot talk over
// them. This controls whether that mute ever lifts. Note it governs REAL
// takeovers only - a mute the escalation logic set on its own always expires,
// so this cannot re-create the "nobody ever replied" bug.
function HumanMuteCard({ showToast }: { showToast: (msg: string, type: 'success' | 'error') => void }) {
  const [policy, setPolicy] = useState<'permanent' | 'expire'>('permanent');
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithTenant(SETTINGS_API);
        if (cancelled || !res.ok) return;
        const s = await res.json();
        const d = s?.data ?? s;
        if (d?.human_mute_policy === 'expire') setPolicy('expire');
        const n = Number(d?.human_mute_expiry_days);
        if (Number.isFinite(n) && n >= 1 && n <= 365) setDays(n);
      } catch { /* card renders with defaults */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const save = async (nextPolicy: 'permanent' | 'expire', nextDays: number) => {
    const prevPolicy = policy;
    const prevDays = days;
    setPolicy(nextPolicy);
    setDays(nextDays);
    setSaving(true);
    try {
      const res = await fetchWithTenant(`${SETTINGS_API}?channel=waba`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          human_mute_policy: nextPolicy,
          human_mute_expiry_days: nextDays,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast(
        nextPolicy === 'permanent'
          ? 'Chats stay with the human agent'
          : `AI resumes after ${nextDays} day${nextDays === 1 ? '' : 's'}`,
        'success',
      );
    } catch {
      setPolicy(prevPolicy);
      setDays(prevDays);
      showToast('Failed to update handover setting', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900">When a human takes over a chat</h3>
      <p className="text-sm text-gray-600 mt-1 mb-4">
        Once one of your agents replies to a customer, the AI stops replying in that chat
        so it never talks over them. Choose whether it ever picks the chat back up.
      </p>

      <label className="flex items-start gap-3 mb-3 cursor-pointer">
        <input
          type="radio"
          className="mt-1"
          checked={policy === 'permanent'}
          disabled={saving}
          onChange={() => save('permanent', days)}
        />
        <span>
          <span className="font-medium text-gray-900">Keep it with the agent</span>
          <span className="block text-sm text-gray-600">
            The chat stays human-handled until someone turns the AI back on from the
            conversation. Recommended - a customer mid-conversation with a person is
            never handed back to the bot.
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="radio"
          className="mt-1"
          checked={policy === 'expire'}
          disabled={saving}
          onChange={() => save('expire', days)}
        />
        <span>
          <span className="font-medium text-gray-900">Give it back to the AI after a while</span>
          <span className="block text-sm text-gray-600">
            If the agent has not replied for this many days, the AI resumes.
          </span>
          <span className="flex items-center gap-2 mt-2">
            <input
              type="number"
              min={1}
              max={365}
              value={days}
              disabled={saving || policy !== 'expire'}
              onChange={(e) => setDays(Number(e.target.value))}
              onBlur={() => {
                const clamped = Math.min(365, Math.max(1, Math.round(days) || 7));
                if (clamped !== days) setDays(clamped);
                if (policy === 'expire') save('expire', clamped);
              }}
              className="w-20 px-2 py-1 border border-gray-300 rounded disabled:bg-gray-100"
            />
            <span className="text-sm text-gray-600">days</span>
          </span>
        </span>
      </label>
    </div>
  );
}

function EmailAgentCard({ showToast }: { showToast: (msg: string, type: 'success' | 'error') => void }) {
  const [enabled, setEnabled] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [promptExists, setPromptExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [settingsRes, promptsRes] = await Promise.all([
          fetchWithTenant(SETTINGS_API),
          fetchWithTenant(PROMPTS_API),
        ]);
        if (cancelled) return;
        if (settingsRes.ok) {
          const s = await settingsRes.json();
          setEnabled(Boolean(s?.email_agent_enabled ?? s?.data?.email_agent_enabled));
        }
        if (promptsRes.ok) {
          const p = await promptsRes.json();
          const list: Array<{ name: string; channel?: string; prompt_text?: string; is_active?: boolean }> =
            p?.data ?? p?.prompts ?? [];
          const emailPrompt = list.find((x) => x.channel === 'email' && x.name === 'default');
          if (emailPrompt) {
            setPromptText(emailPrompt.prompt_text || '');
            setPromptExists(true);
          }
        }
      } catch { /* card renders with defaults */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleToggle = async (next: boolean) => {
    setEnabled(next);
    try {
      const res = await fetchWithTenant(`${SETTINGS_API}?channel=waba`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_agent_enabled: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast(next ? 'Email agent enabled' : 'Email agent disabled', 'success');
    } catch {
      setEnabled(!next);
      showToast('Failed to update email agent toggle', 'error');
    }
  };

  const handleSavePrompt = async () => {
    if (!promptText.trim()) { showToast('Write a system prompt first', 'error'); return; }
    setSaving(true);
    try {
      const res = promptExists
        ? await fetchWithTenant(`${PROMPTS_API}/default?channel=email`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt_text: promptText, channel: 'email' }),
          })
        : await fetchWithTenant(PROMPTS_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'default', prompt_text: promptText, channel: 'email' }),
          });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPromptExists(true);
      showToast('Email agent prompt saved', 'success');
    } catch {
      showToast('Failed to save email agent prompt', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm dark:bg-[#030a21]/60 dark:border-blue-950/40">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-blue-950/40 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Email agent (Gmail &amp; Outlook)</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Automatically replies to new emails in your connected inboxes using the prompt
            below - same AI brain as your WhatsApp agent. Replies stay in the original thread.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => handleToggle(!enabled)}
          disabled={loading}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
            enabled ? 'bg-red-500' : 'bg-gray-300'
          } ${loading ? 'opacity-50' : ''}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div className="px-5 py-4 space-y-3">
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Reading inboxes needs the new read permission - accounts connected before the email
          agent existed must be <span className="font-medium">disconnected and reconnected once</span>{' '}
          in Settings → Integrations. The agent only answers mail received after it&apos;s enabled.
        </p>
        <div>
          <label className="text-xs font-medium text-gray-700 dark:text-gray-500">System prompt</label>
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={8}
            disabled={loading}
            placeholder={
              'You are the assistant for <business>. Answer questions about our services, ' +
              'pricing and availability using the knowledge base. Be concise and professional. ' +
              'If the sender asks for anything you are unsure about, say a team member will follow up.'
            }
            className="mt-1 w-full rounded-lg border border-gray-200 dark:border-blue-950/60 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-red-400 disabled:bg-gray-50"
          />
          <p className="mt-1 text-[11px] text-gray-500">
            The knowledge base and tone from your chat settings are added automatically.
          </p>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSavePrompt}
            disabled={saving || loading}
            className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save prompt'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────

export function ChatSettings() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [chatSettings, setChatSettings] = useState<ChatSettingsConfig>({
    knowledge_base: '',
    campaign_frequency: { enabled: true, interval_hours: 24, max_daily_messages: 50 },
  });
  const [followupConfig, setFollowupConfig] = useState<FollowupTimingConfig>(DEFAULT_FOLLOWUP_CONFIG);
  // Approved WhatsApp templates fetched from Meta - used to populate the
  // template-picker dropdown for each follow-up stage + booking reminder.
  const [approvedTemplates, setApprovedTemplates] = useState<WhatsAppApprovedTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [savingFollowup, setSavingFollowup] = useState(false);

  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState('waba');
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);

  // ── Connection-aware visibility ─────────────────────────────────────────
  // Only connected channels get their settings shown; a channel that is
  // positively NOT connected is hidden (tabs, typing rows, LinkedIn cards).
  // Nothing is deleted - reconnecting brings the settings back with their
  // saved values, because visibility is derived from live status per mount.
  // Fail-open: while probing (or if a probe errors) the channel stays visible.
  const router = useRouter();
  const { loaded: channelsLoaded, isVisible: isChannelVisible } = useConnectedChannels();
  const visibleChannels = CHANNELS.filter((c) => isChannelVisible(c.id as ChannelId));
  const hiddenChannels = CHANNELS.filter((c) => !isChannelVisible(c.id as ChannelId));
  const visibleIds = visibleChannels.map((c) => c.id).join(',');
  // If the active tab's channel just got hidden, snap to the first visible one.
  useEffect(() => {
    if (!channelsLoaded) return;
    const ids = visibleIds ? visibleIds.split(',') : [];
    if (ids.length > 0 && !ids.includes(activeChannel)) {
      setActiveChannel(ids[0]);
    }
  }, [channelsLoaded, visibleIds, activeChannel]);
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});
  const [savingPrompt, setSavingPrompt] = useState<string | null>(null);
  const [savingKb, setSavingKb] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Shareable assets - files (price list, brochure…) the AI can auto-attach
  const [shareableAssets, setShareableAssets] = useState<ShareableAsset[]>([]);
  const [savingAssets, setSavingAssets] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(true);
  // Track which asset row is expanded for editing (others render as compact row).
  // Newly-added (unsaved) assets are auto-expanded; saved ones collapse by default.
  const [expandedAssetIdx, setExpandedAssetIdx] = useState<number | null>(null);
  // Per-row in-progress draft for the trigger-keywords text input.
  // Without this the input filtered/dedupes mid-keystroke and the cursor
  // jumped backwards as soon as the user typed a comma + space.
  const [triggerInputDrafts, setTriggerInputDrafts] = useState<Record<number, string>>({});

  // AI Playground panel - testers can validate prompt + KB + assets without leaving the page
  const [playgroundOpen, setPlaygroundOpen] = useState(false);

  // New prompt form
  const [showNewPrompt, setShowNewPrompt] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptText, setNewPromptText] = useState('');
  const [creatingPrompt, setCreatingPrompt] = useState(false);

  // AI prompt generation
  const [generatingPrompt, setGeneratingPrompt] = useState<string | null>(null); // prompt.name or '__new__'
  const [missingFieldsModal, setMissingFieldsModal] = useState<{
    promptName: string | null;
    fields: MissingField[];
    values: Record<string, string>;
  } | null>(null);

  // Web scraping state
  const [newWebUrl, setNewWebUrl] = useState('');
  const [webScrapingSaving, setWebScrapingSaving] = useState(false);
  const [webScrapingDiagnostics, setWebScrapingDiagnostics] = useState<
    Array<{
      url: string;
      ok: boolean;
      chars: number;
      error: string | null;
      status: number | null;
      content_type: string | null;
      method?: string | null;
      auto_discovered?: boolean;
      discovered_from?: string | null;
      discovery_method?: string | null;
    }>
  >([]);

  // Web scraping test chat state - Claude-powered preview against scraped content
  const [showWebTestChat, setShowWebTestChat] = useState(false);
  const [webChatInput, setWebChatInput] = useState('');
  const [webChatBusy, setWebChatBusy] = useState(false);
  const [webChatMessages, setWebChatMessages] = useState<
    { role: 'user' | 'assistant'; content: string; sources?: string[] }[]
  >([]);

  // LinkedIn automation settings
  const [linkedinAutomation, setLinkedinAutomation] = useState<{
    auto_like_posts: boolean;
    auto_comment_posts: boolean;
    /** Ongoing background sweep of accepted connections' NEW posts. Separate
     *  opt-in from the two flags above, which only fire at campaign-step time. */
    post_monitoring_enabled: boolean;
    /** Inbound connection requests: research the sender and ask the tenant to
     *  approve before anything is accepted. */
    inbound_invite_review_enabled: boolean;
    /** Where the approval card is delivered (phone number or email address). */
    invite_approval_to: string;
    invite_approval_channel: 'whatsapp' | 'email';
    ai_agent_reply_delay_seconds: number;
    auto_withdraw_pending_enabled: boolean;
    auto_withdraw_pending_days: number;
  }>({
    auto_like_posts: false,
    auto_comment_posts: false,
    post_monitoring_enabled: false,
    inbound_invite_review_enabled: false,
    invite_approval_to: '',
    invite_approval_channel: 'whatsapp' as 'whatsapp' | 'email',
    ai_agent_reply_delay_seconds: 0,
    auto_withdraw_pending_enabled: false,
    auto_withdraw_pending_days: 90,
  });
  const [savingLinkedinAutomation, setSavingLinkedinAutomation] = useState(false);

  // LinkedIn follow-up sequence settings (TENANT-level cadence for the
  // post-acceptance sequence - see LinkedInAutoFollowupService). A campaign can
  // override this from the Scheduled Follow-ups modal; the touch model and the
  // editor UI are shared (./FollowupTouchesEditor).
  const [linkedinFollowup, setLinkedinFollowup] = useState<{
    enabled: boolean;
    touches: FollowupTouch[];
  }>({
    enabled: true,
    touches: defaultFollowupTouches(),
  });
  const [savingLinkedinFollowup, setSavingLinkedinFollowup] = useState(false);

  // Load data on mount
  useEffect(() => {
    setLoadingTemplates(true);
    Promise.all([
      fetchPrompts(),
      fetchChatSettings(),
      fetchFollowupConfig(),
      fetch('/api/social-integration/linkedin/automation-settings').then((r) => r.json()).catch(() => null),
      fetch('/api/social-integration/linkedin/followup-settings').then((r) => r.json()).catch(() => null),
      fetchShareableAssets(),
      fetchApprovedTemplates(),
    ])
      .then(([p, s, f, liSettings, liFollowup, assets, tmpl]) => {
        setPrompts(Array.isArray(p) ? p : []);
        setChatSettings(s);
        setFollowupConfig(f);
        if (liSettings?.success && liSettings.data) {
          const rawDelay = Number(liSettings.data.ai_agent_reply_delay_seconds);
          const rawWithdrawDays = Number(liSettings.data.auto_withdraw_pending_days);
          setLinkedinAutomation({
            auto_like_posts:              !!liSettings.data.auto_like_posts,
            auto_comment_posts:           !!liSettings.data.auto_comment_posts,
            post_monitoring_enabled:      !!liSettings.data.post_monitoring_enabled,
            inbound_invite_review_enabled: !!liSettings.data.inbound_invite_review_enabled,
            invite_approval_to:            liSettings.data.invite_approval_to || '',
            invite_approval_channel:       liSettings.data.invite_approval_channel === 'email' ? 'email' : 'whatsapp',
            ai_agent_reply_delay_seconds: Number.isFinite(rawDelay) ? Math.max(0, Math.min(300, rawDelay)) : 0,
            auto_withdraw_pending_enabled: !!liSettings.data.auto_withdraw_pending_enabled,
            auto_withdraw_pending_days:   Number.isFinite(rawWithdrawDays) ? Math.max(30, rawWithdrawDays) : 90,
          });
        }
        if (liFollowup?.success && liFollowup.data) {
          // Per-touch model, else legacy plain hours, else the default cadence.
          const touches = touchesFromApi(liFollowup.data);
          setLinkedinFollowup({
            enabled: liFollowup.data.enabled !== false,
            touches: touches.length > 0 ? touches : defaultFollowupTouches(),
          });
        }
        setShareableAssets(Array.isArray(assets) ? assets : []);
        setLoadingAssets(false);
        setApprovedTemplates(Array.isArray(tmpl) ? tmpl : []);
        setLoadingTemplates(false);
      })
      .catch(() => { setLoadingAssets(false); setLoadingTemplates(false); })
      .finally(() => setLoading(false));
  }, []);

  // Normalize legacy/ambiguous prompt channels to the canonical tab id so prompts
  // aren't hidden. Older WABA-agent prompts are tagged 'whatsapp'/'business_whatsapp'
  // (there is no such tab) - treat them as 'waba'. Personal WA stays 'personal_whatsapp'.
  const normalizePromptChannel = (c?: string | null): string =>
    !c || c === 'whatsapp' || c === 'business_whatsapp' ? 'waba' : c;
  const filteredPrompts = prompts.filter((p) => normalizePromptChannel(p.channel) === activeChannel);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  // ── Prompt actions ───────────────────────────────────────────

  const handleToggleActive = useCallback(
    async (prompt: Prompt) => {
      const ok = await updatePrompt(prompt.name, { is_active: !prompt.is_active });
      if (ok) {
        setPrompts((prev) =>
          prev.map((p) => (p.name === prompt.name ? { ...p, is_active: !p.is_active } : p))
        );
        showToast(`${getLabel(prompt.name)} ${!prompt.is_active ? 'activated' : 'deactivated'}`, 'success');
      } else {
        showToast('Failed to update prompt', 'error');
      }
    },
    [showToast]
  );

  const handleSavePrompt = useCallback(
    async (name: string) => {
      const text = editedTexts[name];
      if (!text) return;
      setSavingPrompt(name);
      const ok = await updatePrompt(name, { prompt_text: text });
      if (ok) {
        setPrompts((prev) =>
          prev.map((p) => (p.name === name ? { ...p, prompt_text: text, version: (p.version || 0) + 1 } : p))
        );
        setEditedTexts((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
        showToast(`${getLabel(name)} saved`, 'success');
      } else {
        showToast('Failed to save prompt', 'error');
      }
      setSavingPrompt(null);
    },
    [editedTexts, showToast]
  );

  const handleDeletePrompt = useCallback(
    async (name: string) => {
      if (!confirm(`Delete "${getLabel(name)}"? This cannot be undone.`)) return;
      const ok = await deletePrompt(name);
      if (ok) {
        setPrompts((prev) => prev.filter((p) => p.name !== name));
        showToast(`${getLabel(name)} deleted`, 'success');
      } else {
        showToast('Failed to delete prompt', 'error');
      }
    },
    [showToast]
  );

  const handleCreatePrompt = useCallback(async () => {
    if (!newPromptName.trim() || !newPromptText.trim()) return;
    setCreatingPrompt(true);
    const promptName = newPromptName.trim().toUpperCase().replace(/\s+/g, '_');
    const ok = await createPrompt({
      name: promptName,
      prompt_text: newPromptText.trim(),
      channel: activeChannel,
    });
    if (ok) {
      setPrompts((prev) => [
        ...prev,
        {
          name: promptName,
          prompt_text: newPromptText.trim(),
          version: 1,
          is_active: true,
          channel: activeChannel,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
      setNewPromptName('');
      setNewPromptText('');
      setShowNewPrompt(false);
      showToast(`${getLabel(promptName)} created`, 'success');
    } else {
      showToast('Failed to create prompt', 'error');
    }
    setCreatingPrompt(false);
  }, [newPromptName, newPromptText, activeChannel, showToast]);

  // ── AI prompt generation ─────────────────────────────────────
  const runGenerate = useCallback(
    async (promptName: string | null, providedFields: Record<string, string> = {}) => {
      const busyKey = promptName ?? '__new__';
      setGeneratingPrompt(busyKey);
      try {
        const out = await generatePrompt(activeChannel, providedFields);
        if (out?.error === 'unsupported_channel') {
          showToast('Prompt generation is available for LinkedIn only right now', 'error');
          return;
        }
        const requiredMissing = (out?.missing_fields || []).filter((f) => f.severity !== 'optional');
        if (out?.success && !out.prompt_text && requiredMissing.length) {
          // Need a few facts that aren't on file yet - open the collect-info form.
          setMissingFieldsModal({ promptName, fields: out.missing_fields || [], values: providedFields });
          return;
        }
        if (out?.success && out.prompt_text) {
          setMissingFieldsModal(null);
          if (promptName) {
            // Existing card → stage as an unsaved edit for review, then user clicks Save Changes.
            setEditedTexts((prev) => ({ ...prev, [promptName]: out.prompt_text as string }));
            setExpandedPrompt(promptName);
          } else {
            // No prompt for this channel yet → prefill the "Add New Prompt" form.
            setShowNewPrompt(true);
            setNewPromptName('SYSTEM_PROMPT');
            setNewPromptText(out.prompt_text);
          }
          showToast('Draft generated - review it, then Save Changes', 'success');
        } else {
          showToast('Failed to generate prompt', 'error');
        }
      } catch {
        showToast('Failed to generate prompt', 'error');
      } finally {
        setGeneratingPrompt(null);
      }
    },
    [activeChannel, showToast]
  );

  // ── Knowledge Base save ──────────────────────────────────────

  const handleSaveKb = useCallback(async () => {
    setSavingKb(true);
    const ok = await updateChatSettings({ knowledge_base: chatSettings.knowledge_base });
    showToast(ok ? 'Knowledge base saved' : 'Failed to save', ok ? 'success' : 'error');
    setSavingKb(false);
  }, [chatSettings.knowledge_base, showToast]);

  // ── Shareable Assets handlers ─────────────────────────────────
  const addShareableAsset = useCallback(() => {
    setShareableAssets((prev) => {
      const next = [
        ...prev,
        {
          key: '',
          url: '',
          filename: '',
          mime_type: 'application/pdf',
          media_type: 'document' as const,
          trigger_keywords: [],
        },
      ];
      // Auto-expand the just-added row so the user can fill it in immediately
      setExpandedAssetIdx(next.length - 1);
      return next;
    });
  }, []);

  const updateShareableAsset = useCallback(
    (idx: number, patch: Partial<ShareableAsset>) => {
      setShareableAssets((prev) =>
        prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)),
      );
    },
    [],
  );

  const removeShareableAsset = useCallback((idx: number) => {
    setShareableAssets((prev) => prev.filter((_, i) => i !== idx));
    setExpandedAssetIdx((cur) => (cur === idx ? null : cur && cur > idx ? cur - 1 : cur));
  }, []);

  const handleSaveShareableAssets = useCallback(async () => {
    // Client-side validation matching backend rules
    for (const [i, a] of shareableAssets.entries()) {
      const url = (a.url || '').trim();
      if (!url) {
        showToast(`Asset #${i + 1}: URL is required`, 'error');
        setExpandedAssetIdx(i);
        return;
      }
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showToast(`Asset #${i + 1}: URL must start with http(s)://`, 'error');
        setExpandedAssetIdx(i);
        return;
      }
      if (!a.trigger_keywords?.length) {
        showToast(`Asset #${i + 1}: at least one trigger keyword is required`, 'error');
        setExpandedAssetIdx(i);
        return;
      }
    }
    setSavingAssets(true);
    const ok = await saveShareableAssets(shareableAssets);
    showToast(ok ? 'Shareable assets saved' : 'Failed to save shareable assets',
              ok ? 'success' : 'error');
    if (ok) setExpandedAssetIdx(null); // Collapse all on successful save
    setSavingAssets(false);
  }, [shareableAssets, showToast]);

  // ── Chat Behaviour save (typing indicator - separate per channel) ──

  const [savingBehaviour, setSavingBehaviour] = useState(false);

  const handleSaveBehaviour = useCallback(async () => {
    setSavingBehaviour(true);
    // Personal WA → PUT (Node.js backend)
    const personalOk = await updateChatSettings({ typing_indicator: chatSettings.typing_indicator });
    // WABA → PATCH (Python WABA service)
    let wabaOk = false;
    try {
      const res = await fetchWithTenant(`${SETTINGS_API}?channel=waba`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ typing_indicator: chatSettings.waba_typing_indicator }),
      });
      wabaOk = res.ok;
    } catch { /* ignore */ }
    const allOk = personalOk && wabaOk;
    showToast(allOk ? 'Chat behaviour saved' : 'Partially saved - check console', allOk ? 'success' : 'error');
    setSavingBehaviour(false);
  }, [chatSettings.typing_indicator, chatSettings.waba_typing_indicator, showToast]);

  // ── Follow-up Timing save ────────────────────────────────────

  const handleSaveFollowup = useCallback(async () => {
    // Pre-check mirroring the backend H16 guard: an ENABLED stage that fires
    // past Meta's 24h customer-service window MUST have an approved template
    // (free-form text is rejected there, so the stage would never send).
    // Catching it here gives a friendlier message than the API's 400.
    const STAGE_LABELS: Record<string, string> = {
      FIRST: '1st Follow-up', SECOND: '2nd Follow-up', THIRD: '3rd Follow-up', FOURTH: 'Final message',
    };
    const offending = (Object.keys(followupConfig.stages) as Array<keyof typeof followupConfig.stages>)
      .filter((k) => {
        const s = followupConfig.stages[k];
        return s.enabled && (s.delay_hours ?? 0) > 24 && !(s.template_name || '').trim();
      })
      .map((k) => STAGE_LABELS[k] || k);
    // NOTE: the backend enforces this per-stage regardless of the master
    // enabled flag, so the pre-check must too.
    if (offending.length > 0) {
      showToast(
        `${offending.join(', ')}: delays past 24h need an approved WhatsApp template - pick one or disable the stage`,
        'error'
      );
      return;
    }

    setSavingFollowup(true);
    const result = await updateFollowupConfig(followupConfig);
    showToast(result.ok ? 'Follow-up timing saved' : (result.error || 'Failed to save'), result.ok ? 'success' : 'error');
    setSavingFollowup(false);
  }, [followupConfig, showToast]);

  const handleSaveLinkedinAutomation = useCallback(async () => {
    setSavingLinkedinAutomation(true);
    // Floor the withdraw window at 30 days (backend clamps too) so a stray small
    // value can never retract fresh invitations. Reflect the clamp in the UI.
    const cleanDays = Math.max(30, Math.floor(Number(linkedinAutomation.auto_withdraw_pending_days) || 90));
    const payload = { ...linkedinAutomation, auto_withdraw_pending_days: cleanDays };
    try {
      const res = await fetch('/api/social-integration/linkedin/automation-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setLinkedinAutomation((prev) => ({
          ...prev,
          auto_withdraw_pending_enabled: !!data.data.auto_withdraw_pending_enabled,
          auto_withdraw_pending_days: Number.isFinite(Number(data.data.auto_withdraw_pending_days))
            ? Math.max(30, Number(data.data.auto_withdraw_pending_days))
            : cleanDays,
        }));
      }
      showToast(data.success ? 'LinkedIn automation settings saved' : 'Failed to save', data.success ? 'success' : 'error');
    } catch {
      showToast('Failed to save', 'error');
    } finally {
      setSavingLinkedinAutomation(false);
    }
  }, [linkedinAutomation, showToast]);

  const handleSaveLinkedinFollowup = useCallback(async () => {
    // Clamp + validate cadence before sending - backend re-validates but a
    // fast frontend check gives the user immediate, touch-numbered feedback.
    const prepared = prepareTouchesForSave(linkedinFollowup.touches);
    if (!prepared.ok) {
      showToast(prepared.error, 'error');
      return;
    }
    const cleanTouches = prepared.touches;
    setSavingLinkedinFollowup(true);
    try {
      const res = await fetch('/api/social-integration/linkedin/followup-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: linkedinFollowup.enabled,
          touches: cleanTouches,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        // Echo back what the server stored (it normalises), falling back to what
        // we just sent if the response omits the cadence.
        const echoed = touchesFromApi(data.data);
        setLinkedinFollowup({
          enabled: data.data.enabled !== false,
          touches: echoed.length > 0 ? echoed : cleanTouches,
        });
      }
      showToast(data.success ? 'LinkedIn follow-up settings saved' : 'Failed to save', data.success ? 'success' : 'error');
    } catch {
      showToast('Failed to save', 'error');
    } finally {
      setSavingLinkedinFollowup(false);
    }
  }, [linkedinFollowup, showToast]);

  const handleSaveWebScraping = useCallback(async () => {
    setWebScrapingSaving(true);
    try {
      const res = await fetchWithTenant('/api/whatsapp-conversations/chat-settings/web-scraping', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: chatSettings.web_scraping_enabled,
          urls: chatSettings.web_scraping_urls,
        }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok) {
        const diagnostics = Array.isArray(data?.scraping_diagnostics) ? data.scraping_diagnostics : [];
        setWebScrapingDiagnostics(diagnostics);

        const okCount = diagnostics.filter((d: any) => d.ok).length;
        const failCount = diagnostics.length - okCount;
        const totalChars = data?.scraped_chars ?? 0;

        if (chatSettings.web_scraping_urls.length === 0) {
          showToast('Website settings saved', 'success');
        } else if (okCount > 0 && failCount === 0) {
          showToast(`Scraped ${okCount} URL${okCount > 1 ? 's' : ''} (${totalChars} chars)`, 'success');
        } else if (okCount > 0 && failCount > 0) {
          showToast(`Scraped ${okCount}/${diagnostics.length} URLs - see diagnostics below`, 'success');
        } else {
          showToast('No content extracted - see diagnostics below', 'error');
        }
      } else {
        const errMsg = data?.detail || `HTTP ${res.status}`;
        showToast(`Failed to save: ${errMsg}`, 'error');
      }
    } catch (err: any) {
      showToast(`Failed to save: ${err?.message || 'network error'}`, 'error');
    } finally {
      setWebScrapingSaving(false);
    }
  }, [chatSettings.web_scraping_enabled, chatSettings.web_scraping_urls, showToast]);

  const handleWebTestChatSend = useCallback(async () => {
    const text = webChatInput.trim();
    if (!text || webChatBusy) return;

    // Build the history payload from prior turns BEFORE we mutate state
    const historyForApi = webChatMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setWebChatMessages((prev) => [...prev, { role: 'user', content: text }]);
    setWebChatInput('');
    setWebChatBusy(true);

    try {
      const res = await fetchWithTenant(
        '/api/whatsapp-conversations/chat-settings/web-scraping/test-chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history: historyForApi }),
        },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const errMsg = data?.detail || data?.error || `HTTP ${res.status}`;
        setWebChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Error: ${errMsg}` },
        ]);
      } else {
        setWebChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data?.answer || '(no response)',
            sources: Array.isArray(data?.sources) ? data.sources : undefined,
          },
        ]);
      }
    } catch (err: any) {
      setWebChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err?.message || 'Request failed'}` },
      ]);
    } finally {
      setWebChatBusy(false);
    }
  }, [webChatInput, webChatBusy, webChatMessages]);

  const updateStage = useCallback(
    (
      stage: keyof FollowupTimingConfig['stages'],
      field: 'enabled' | 'delay_hours' | 'template_name',
      value: boolean | number | string,
    ) => {
      setFollowupConfig((prev) => ({
        ...prev,
        stages: {
          ...prev.stages,
          [stage]: { ...prev.stages[stage], [field]: value },
        },
      }));
    },
    []
  );

  // ── Render ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative text-gray-900 dark:text-white">
      {/* ── Sticky "Test in Playground" button ─────────────────────── */}
      {/* ── Test in Playground button ─────────────────────── */}
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={() => setPlaygroundOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0B1957] dark:bg-blue-600 rounded-xl shadow-md hover:opacity-90 dark:hover:bg-blue-700 transition-all active:scale-95"
          title="Open the AI Playground to test your prompts, knowledge base, and shareable assets"
        >
          <FlaskConical className="h-4 w-4" />
          Test in AI Playground
        </button>
      </div>

      {/* ── Section 1: System Prompts ─────────────────────────────── */}
      <div className="bg-white dark:bg-[#071131] rounded-lg border border-gray-200 dark:border-blue-950/40 shadow-sm">
        <div className="p-6 border-b border-gray-100 dark:border-blue-950/40">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">System Prompts</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-300">
            Manage AI conversation prompts for each channel. Edit prompt text to customize agent behavior.
          </p>
        </div>

        {/* Channel tabs - only connected channels; hidden ones collapse into
            a "+N more" chip that jumps to the Integrations tab. */}
        <div className="border-b border-gray-100 dark:border-blue-950/40 overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-1 -mb-px px-6 min-w-max flex-nowrap">
            {visibleChannels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeChannel === ch.id
                    ? 'border-[#0B1957] text-[#0B1957] dark:border-blue-500 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-slate-300 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-blue-950/50'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${ch.color}`} />
                {ch.label}
              </button>
            ))}
            {hiddenChannels.length > 0 && (
              <button
                onClick={() => router.push('/settings?tab=integrations')}
                title={`Not connected: ${hiddenChannels.map((c) => c.label).join(', ')}. Connect to configure.`}
                className="flex items-center gap-1 px-3 py-1 my-1.5 text-xs text-gray-400 border border-dashed border-gray-300 rounded-full hover:text-gray-600 hover:border-gray-400 transition-colors whitespace-nowrap"
              >
                <Plus className="h-3 w-3" />
                {hiddenChannels.length} more
              </button>
            )}
          </div>
        </div>

        {/* No channels connected at all - invite to connect instead of blank tabs */}
        {channelsLoaded && visibleChannels.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-400 dark:text-slate-300">
            <EyeOff className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm text-gray-500 dark:text-slate-300">No channels connected</p>
            <p className="text-xs mt-1 mb-4">Connect WhatsApp, LinkedIn, Gmail or Instagram to configure AI prompts</p>
            <button
              onClick={() => router.push('/settings?tab=integrations')}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              Connect a channel →
            </button>
          </div>
        )}

        {/* Prompts list - hidden entirely when no channel is connected */}
        {(!channelsLoaded || visibleChannels.length > 0) && (
        <div className="divide-y dark:bg-black/20 divide-gray-100 dark:divide-blue-950/40">
          {filteredPrompts.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400 dark:text-slate-300">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No prompts for {CHANNELS.find((c) => c.id === activeChannel)?.label}</p>
              <p className="text-xs mt-1">Create one to get started</p>
              {activeChannel === 'linkedin' && (
                <button
                  onClick={() => runGenerate(null)}
                  disabled={generatingPrompt === '__new__'}
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 rounded-md hover:bg-blue-50 disabled:opacity-40"
                >
                  {generatingPrompt === '__new__' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Generate with AI
                </button>
              )}
            </div>
          ) : (
            filteredPrompts.map((prompt) => {
              const isExpanded = expandedPrompt === prompt.name;
              const hasEdit = editedTexts[prompt.name] !== undefined;

              return (
                <div key={prompt.name} className="group">
                  {/* Prompt header row */}
                  <div
                    className="flex items-center gap-3 px-6 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#061033]/40 transition-colors"
                    onClick={() => setExpandedPrompt(isExpanded ? null : prompt.name)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400 dark:text-slate-300 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400 dark:text-slate-300 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1">
                      {getLabel(prompt.name)}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-300 font-mono mr-2">v{prompt.version || 1}</span>

                    {/* Active toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(prompt);
                      }}
                      className="flex-shrink-0"
                      title={prompt.is_active ? 'Active - click to deactivate' : 'Inactive - click to activate'}
                    >
                      {prompt.is_active ? (
                        <ToggleRight className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                      )}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePrompt(prompt.name);
                      }}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete prompt"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400" />
                    </button>
                  </div>

                  {/* Expanded editor */}
                  {isExpanded && (
                    <div className="px-6 pb-4">
                      <textarea
                        className="w-full h-64 p-3 text-sm font-mono border border-gray-200 dark:border-blue-950/60 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50 dark:bg-[#061033]/70 dark:text-white"
                        value={hasEdit ? editedTexts[prompt.name] : prompt.prompt_text}
                        onChange={(e) =>
                          setEditedTexts((prev) => ({ ...prev, [prompt.name]: e.target.value }))
                        }
                        placeholder="Enter prompt text..."
                      />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-gray-400 dark:text-slate-300">
                          {prompt.updated_at
                            ? `Last updated: ${new Date(prompt.updated_at).toLocaleDateString()}`
                            : ''}
                        </span>
                        <div className="flex items-center gap-2">
                          {activeChannel === 'linkedin' && (
                            <button
                              onClick={() => runGenerate(prompt.name)}
                              disabled={generatingPrompt === prompt.name}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-950/50 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30 disabled:opacity-40 transition-colors"
                              title="Generate a prompt from your business profile & ICP"
                            >
                              {generatingPrompt === prompt.name ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Sparkles className="h-3 w-3" />
                              )}
                              Generate with AI
                            </button>
                          )}
                          <button
                            onClick={() => handleSavePrompt(prompt.name)}
                            disabled={!hasEdit || savingPrompt === prompt.name}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:bg-blue-600 dark:hover:bg-blue-700"
                          >
                            {savingPrompt === prompt.name ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3" />
                            )}
                            Save Changes
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        )}

        {/* Add new prompt - needs at least one connected channel */}
        {(!channelsLoaded || visibleChannels.length > 0) && (
        <div className="px-6 py-3 border-t border-gray-100 dark:border-blue-950/40">
          {!showNewPrompt ? (
            <button
              onClick={() => setShowNewPrompt(true)}
              className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              Add New Prompt
            </button>
          ) : (
            <div className="space-y-3 p-4 rounded-lg border border-blue-100 dark:border-blue-950/50 bg-blue-50/30 dark:bg-blue-950/20">
              <input
                type="text"
                placeholder="Prompt name (e.g. WELCOME_MESSAGE)"
                value={newPromptName}
                onChange={(e) => setNewPromptName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-blue-950/60 bg-white dark:bg-[#061033]/70 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                autoFocus
              />
              {/* Channel selector - pre-fills from active tab but user can override */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 dark:text-slate-300 whitespace-nowrap">Channel:</label>
                <Select
                  value={newPromptName ? activeChannel : activeChannel}
                    onValueChange={(value: string) => setActiveChannel(value)}
                >
                  <SelectTrigger className="h-auto flex-1 border-0 rounded-none focus:ring-0 shadow-none bg-transparent px-3 text-left min-h-[48px]">
                    <SelectValue placeholder="Select a channel" />
                  </SelectTrigger>

                  {/* FIXED: Mapped content backing panel box directly to your theme tokens (#00051d) to ensure smooth legibility */}
                  <SelectContent className="bg-white dark:bg-[#000724] border-slate-200 dark:border-[#262831]">
                    {visibleChannels.map((ch) => (
                        <SelectItem
                            key={ch.id}
                            value={ch.id}
                            className="pl-3 pr-6 text-xs justify-start transition-colors cursor-pointer text-slate-800 dark:text-white dark:focus:bg-[#2563eb] dark:focus:text-white dark:data-[state=checked]:focus:bg-[#2563eb] dark:data-[state=checked]:focus:text-white">
                          {ch.label}
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <textarea
                placeholder="Enter the prompt text..."
                value={newPromptText}
                onChange={(e) => setNewPromptText(e.target.value)}
                className="w-full h-32 px-3 py-2 text-sm font-mono border border-gray-200 dark:border-blue-950/60 bg-white dark:bg-[#061033]/70 dark:text-white rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
              {/* LinkedIn-only: draft a fresh prompt from the business profile & ICP into the fields above */}
              {activeChannel === 'linkedin' && (
                <button
                  onClick={() => runGenerate(null)}
                  disabled={generatingPrompt === '__new__'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 rounded-md hover:bg-blue-50 disabled:opacity-40"
                  title="Generate a prompt from your business profile & ICP"
                >
                  {generatingPrompt === '__new__' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Generate with AI
                </button>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreatePrompt}
                  disabled={!newPromptName.trim() || !newPromptText.trim() || creatingPrompt}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#0B1957] dark:bg-[#1d4ed8] rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  {creatingPrompt ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Create Prompt
                </button>
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      <div className="bg-white dark:bg-[#030a21]/60 rounded-lg border border-gray-200 dark:border-blue-950/40 shadow-sm">
        <KnowledgeBaseManager />
      </div>

      {/* ── Shareable Assets ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#071131] rounded-lg border border-gray-200 dark:border-blue-950/40 shadow-sm">
        <div className="p-6 border-b border-gray-100 dark:border-blue-950/40">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Shareable Assets</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-300">
            Files (price list, brochure, menu…) the AI agents can attach automatically
            when the customer asks - on WhatsApp, LinkedIn, and email. The system
            listens for the trigger keywords in the AI&apos;s reply, downloads the file
            from the URL, and sends it as a real attachment - so customers never see
            a raw link.
          </p>
        </div>
        <div className="p-6 space-y-4">
          {loadingAssets ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading assets…
            </div>
          ) : (
            <>
              {shareableAssets.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-slate-300 italic">
                  No assets configured yet. Click &quot;Add Asset&quot; to register your first one.
                </p>
              )}

              {shareableAssets.map((asset, idx) => {
                const isExpanded = expandedAssetIdx === idx;

                // ── Compact (collapsed) row - like a Knowledge Base folder ──
                if (!isExpanded) {
                  const triggers = (asset.trigger_keywords || []).join(', ');
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between border border-gray-200 dark:border-blue-950/40 rounded-lg p-3 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-[#061033]/40 cursor-pointer transition-colors"
                      onClick={() => setExpandedAssetIdx(idx)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <BookOpen className="h-5 w-5 text-violet-500 dark:text-violet-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {asset.filename || asset.key || `Asset #${idx + 1}`}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-slate-300 truncate">
                            {triggers ? `Triggers: ${triggers}` : 'No trigger keywords set'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <ChevronRight className="h-4 w-4 text-gray-400 dark:text-slate-300" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeShareableAsset(idx);
                          }}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                          title="Remove this asset"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                }

                // ── Expanded editor (existing detailed form) ──
                return (
                  <div
                    key={idx}
                    className="border border-violet-300 dark:border-blue-900/50 rounded-lg p-4 space-y-3 bg-gray-50 dark:bg-[#061033]/50"
                  >
                    <div className="flex items-start justify-between">
                      <button
                        type="button"
                        onClick={() => setExpandedAssetIdx(null)}
                        className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide hover:text-violet-700 dark:hover:text-violet-300 flex items-center gap-1"
                        title="Collapse"
                      >
                        <ChevronDown className="h-3 w-3" />
                        Asset #{idx + 1}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeShareableAsset(idx)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        title="Remove this asset"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Display Filename
                        </label>
                        <input
                          type="text"
                          placeholder="Price_List.pdf"
                          value={asset.filename || ''}
                          onChange={(e) =>
                            updateShareableAsset(idx, { filename: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-blue-950/60 bg-white dark:bg-[#030a21] dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Internal Key (optional)
                        </label>
                        <input
                          type="text"
                          placeholder="price_list"
                          value={asset.key || ''}
                          onChange={(e) =>
                            updateShareableAsset(idx, { key: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-blue-950/60 bg-white dark:bg-[#030a21] dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        File URL <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="url"
                        placeholder="https://drive.google.com/uc?export=download&id=…"
                        value={asset.url}
                        onChange={(e) =>
                          updateShareableAsset(idx, { url: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-blue-950/60 bg-white dark:bg-[#030a21] dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 dark:text-slate-300 mt-1">
                        Must be a publicly downloadable URL. For Google Drive use
                        <code className="text-xs bg-gray-200 dark:bg-blue-950 px-1 mx-1 rounded dark:text-gray-300">uc?export=download&id=…</code>
                        format (not the share-view link).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          MIME Type
                        </label>
                        <input
                          type="text"
                          placeholder="application/pdf"
                          value={asset.mime_type || 'application/pdf'}
                          onChange={(e) =>
                            updateShareableAsset(idx, { mime_type: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-blue-950/60 bg-white dark:bg-[#030a21] dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Send As
                        </label>
                        <select
                          value={asset.media_type || 'document'}
                          onChange={(e) =>
                            updateShareableAsset(idx, {
                              media_type: e.target.value as 'document' | 'image',
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-blue-950/60 bg-white dark:bg-[#030a21] dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-blue-500"
                        >
                          <option value="document" className="dark:bg-[#030a21]">Document (file)</option>
                          <option value="image" className="dark:bg-[#030a21]">Image (preview)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Trigger Keywords <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="price list, pricing, rates, cost per session"
                        // Show the raw in-progress text when editing, fall back
                        // to the joined array otherwise.  Without this, every
                        // keystroke ran .split(',').filter(Boolean) → typing
                        // "price list," and a space would drop the trailing
                        // empty token mid-edit, kicking the cursor backwards
                        // and making it impossible to add more keywords.
                        value={
                          triggerInputDrafts[idx] !== undefined
                            ? triggerInputDrafts[idx]
                            : (asset.trigger_keywords || []).join(', ')
                        }
                        onChange={(e) =>
                          // Hold the raw text in a per-row draft state - do NOT
                          // split/filter on each keystroke (was the bug).
                          setTriggerInputDrafts((prev) => ({
                            ...prev,
                            [idx]: e.target.value,
                          }))
                        }
                        onBlur={(e) => {
                          // Commit on blur: split + trim + dedupe + drop empties
                          const parsed = Array.from(new Set(
                            e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean)
                          ));
                          updateShareableAsset(idx, { trigger_keywords: parsed });
                          // Clear the draft so the value field reflects the
                          // canonical joined-array view (with our normalised spacing)
                          setTriggerInputDrafts((prev) => {
                            const next = { ...prev };
                            delete next[idx];
                            return next;
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-blue-950/60 bg-white dark:bg-[#030a21] dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 dark:text-slate-300 mt-1">
                        Comma-separated. The file is sent when ANY keyword appears in
                        the AI&apos;s reply (matches plurals + variants - e.g. &quot;pricelist&quot;
                        also matches &quot;prices&quot;, &quot;pricing&quot;, &quot;price list&quot;).
                      </p>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={addShareableAsset}
                  className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  <Plus className="h-5 w-5" /> Add Asset
                </button>

                <button
                  type="button"
                  onClick={handleSaveShareableAssets}
                  disabled={savingAssets}
                  className="h-12 px-6 bg-[#0B1957] hover:bg-[#0B1957]/90 dark:bg-[#1d4ed8] text-white dark:hover:bg-blue-700 rounded-2xl shadow-lg transition-all font-bold flex items-center gap-2"
                >
                  {savingAssets ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Assets
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Section 2.5: Company Website Context ─────────────────── */}
      <div className="bg-white dark:bg-[#071131] rounded-lg border border-gray-200 dark:border-blue-950/40 shadow-sm">
        <div className="p-6 border-b border-gray-100 dark:border-blue-950/40">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Company Website Context</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-300">
            Let the AI answer customer questions using content from your website or blog pages -
            on WhatsApp, LinkedIn, and email. URLs are scraped once when you save and the text is
            cached - no live requests on each reply.
          </p>
        </div>
        <div className="p-6 space-y-5">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Enable Website Context</p>
              <p className="text-xs text-gray-500 dark:text-slate-300 mt-0.5">
                When ON, scraped website content is included in AI replies on every channel
              </p>
            </div>
            <button
              onClick={() =>
                setChatSettings((prev) => ({
                  ...prev,
                  web_scraping_enabled: !prev.web_scraping_enabled,
                }))
              }
              title={chatSettings.web_scraping_enabled ? 'On - click to disable' : 'Off - click to enable'}
            >
              {chatSettings.web_scraping_enabled ? (
                <ToggleRight className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              ) : (
                <ToggleLeft className="h-6 w-6 text-gray-300 dark:text-gray-600" />
              )}
            </button>
          </div>

          {/* URL list */}
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Website URLs</p>
            <p className="text-xs text-gray-500 dark:text-slate-300 mb-3">
              Add your company website homepage, about page, pricing page, blog, FAQ, etc.
            </p>

            {chatSettings.web_scraping_urls.length > 0 && (
              <div className="mb-3 border border-gray-100 dark:border-blue-950/40 rounded-lg divide-y divide-gray-100 dark:divide-blue-950/40 overflow-hidden">
                {chatSettings.web_scraping_urls.map((url, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-2.5 bg-white dark:bg-blue-950/20 hover:bg-gray-50 dark:hover:bg-[#061033]/60">
                    <div className="flex items-center gap-2 overflow-hidden min-w-0">
                      <Globe className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{url}</span>
                    </div>
                    <button
                      onClick={() =>
                        setChatSettings((prev) => ({
                          ...prev,
                          web_scraping_urls: prev.web_scraping_urls.filter((_, i) => i !== idx),
                        }))
                      }
                      className="ml-2 p-1 text-gray-400 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded flex-shrink-0 transition-colors"
                      title="Remove URL"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add URL input */}
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://yourcompany.com/about"
                value={newWebUrl}
                onChange={(e) => setNewWebUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const u = newWebUrl.trim();
                    if (u && (u.startsWith('http://') || u.startsWith('https://')) &&
                        !chatSettings.web_scraping_urls.includes(u)) {
                      setChatSettings((prev) => ({
                        ...prev,
                        web_scraping_urls: [...prev.web_scraping_urls, u],
                      }));
                      setNewWebUrl('');
                    }
                  }
                }}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-blue-950/60 bg-white dark:bg-[#030a21] dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
              <button
                onClick={() => {
                  const u = newWebUrl.trim();
                  if (!u) return;
                  if (!u.startsWith('http://') && !u.startsWith('https://')) return;
                  if (chatSettings.web_scraping_urls.includes(u)) return;
                  setChatSettings((prev) => ({
                    ...prev,
                    web_scraping_urls: [...prev.web_scraping_urls, u],
                  }));
                  setNewWebUrl('');
                }}
                disabled={
                  !newWebUrl.trim() ||
                  (!newWebUrl.trim().startsWith('http://') && !newWebUrl.trim().startsWith('https://'))
                }
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 border border-blue-200 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:border-blue-950/40 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-950/70"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-300 mt-1.5">Press Enter or click Add. Must start with https://</p>
          </div>

          {/* Per-URL scrape diagnostics - appears after Save & Scrape */}
          {webScrapingDiagnostics.length > 0 && (
            <div className="border border-gray-100 dark:border-blue-950/40 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 dark:bg-[#051139] border-b border-gray-100 dark:border-blue-950/40 text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider flex items-center justify-between">
                <span>Last Scrape Result</span>
                <span className="text-gray-400 dark:text-slate-300 normal-case tracking-normal">
                  {webScrapingDiagnostics.filter((d) => d.ok).length} / {webScrapingDiagnostics.length} pages scraped
                </span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-blue-950/40">
                {webScrapingDiagnostics.map((d, i) => (
                  <div
                    key={i}
                    className={`flex items-start justify-between px-3 py-2.5 gap-3 ${
                      d.auto_discovered ? 'pl-8 bg-gray-50/30 dark:bg-[#061033]/20' : 'dark:bg-[#030a21]/20'
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      {d.ok ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs text-gray-700 dark:text-gray-300 truncate" title={d.url}>{d.url}</p>
                          {d.auto_discovered && (
                            <span
                              className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-slate-300 bg-gray-100 dark:bg-blue-950 px-1.5 py-0.5 rounded font-medium"
                              title={
                                d.discovery_method === 'sitemap'
                                  ? `Auto-discovered from sitemap.xml of ${d.discovered_from}`
                                  : `Auto-discovered from links on ${d.discovered_from}`
                              }
                            >
                              auto · {d.discovery_method === 'sitemap' ? 'sitemap' : 'links'}
                            </span>
                          )}
                        </div>
                        {d.ok ? (
                          <p className="text-[11px] text-green-600 dark:text-emerald-400 mt-0.5">
                            ✓ {d.chars.toLocaleString()} chars extracted
                          </p>
                        ) : (
                          <p className="text-[11px] text-red-600 dark:text-rose-400 mt-0.5">
                            {d.error || 'Failed'}
                            {d.status ? ` (HTTP ${d.status})` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 gap-2">
            <button
              onClick={() => setShowWebTestChat((v) => !v)}
              className="h-12 px-6 bg-[#0B1957] hover:bg-[#0B1957]/90 dark:bg-[#1d4ed8] text-white dark:hover:bg-blue-700 rounded-2xl shadow-lg transition-all font-bold flex items-center gap-2"
              title="Preview how the AI answers using your scraped website content"
            >
              <Sparkles className="h-4 w-4" />
              {showWebTestChat ? 'Hide Test Chat' : 'Test Chat'}
            </button>
            <button
              onClick={handleSaveWebScraping}
              disabled={webScrapingSaving}
              className="h-12 px-6 bg-[#0B1957] hover:bg-[#0B1957]/90 dark:bg-[#1d4ed8] text-white dark:hover:bg-blue-700 rounded-2xl shadow-lg transition-all font-bold flex items-center gap-2"
            >
              {webScrapingSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {webScrapingSaving ? 'Scraping & saving…' : 'Save & Scrape'}
            </button>
          </div>

          {/* Test Chat panel - Claude-powered preview against cached scraped content */}
          {showWebTestChat && (
            <div className="mt-4 border border-blue-200 dark:border-blue-950/40 rounded-xl overflow-hidden bg-slate-50/40 dark:bg-[#061033]/20">
              <div className="px-4 py-2.5 bg-blue-50 dark:bg-[#051139] border-b border-blue-200 dark:border-blue-950/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-900 dark:text-white">
                    Test against scraped content
                  </span>
                </div>
                {webChatMessages.length > 0 && (
                  <button
                    onClick={() => setWebChatMessages([])}
                    className="text-xs text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="max-h-[360px] overflow-y-auto p-4 space-y-3">
                {webChatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-300">
                    <Sparkles className="h-7 w-7 mb-2 opacity-50" />
                    <p className="text-xs text-center max-w-xs">
                      Ask a question to see how the AI answers it using only your scraped website content.
                      Save & Scrape first if you haven&apos;t yet.
                    </p>
                  </div>
                ) : (
                  webChatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex flex-col w-fit max-w-[85%] ${
                        msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                      }`}
                    >
                      <div
                        className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-white dark:bg-[#030a21] border border-slate-200 dark:border-blue-950/60 text-slate-700 dark:text-gray-200 rounded-bl-sm shadow-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                      {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-1 px-1 text-[10px] text-slate-400 dark:text-slate-300 flex flex-wrap gap-1">
                          <span className="font-semibold uppercase tracking-wider">Sources:</span>
                          {msg.sources.map((s, idx) => (
                            <span key={idx} className="bg-slate-100 dark:bg-blue-950/80 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-300 truncate max-w-[200px]" title={s}>
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
                {webChatBusy && (
                  <div className="flex w-fit max-w-[85%] mr-auto">
                    <div className="px-3.5 py-2 bg-white dark:bg-[#030a21] border border-slate-200 dark:border-blue-950/60 text-slate-500 rounded-2xl rounded-bl-sm shadow-sm text-sm flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" /> Thinking…
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-blue-200 dark:border-blue-950/40 bg-white dark:bg-[#030a21]/80">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ask a customer-style question…"
                    value={webChatInput}
                    onChange={(e) => setWebChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleWebTestChatSend();
                      }
                    }}
                    disabled={webChatBusy}
                    className="flex-1 px-3.5 py-2 text-sm bg-slate-50 dark:bg-[#061033]/60 border border-slate-200 dark:border-blue-950/50 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:text-white disabled:opacity-60"
                  />
                  <button
                    onClick={handleWebTestChatSend}
                    disabled={!webChatInput.trim() || webChatBusy}
                    className="flex items-center justify-center h-9 w-9 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Send"
                  >
                    {webChatBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 3: Chat Behaviour ────────────────────────────── */}
      {/* Channel-specific settings follow the ACTIVE System Prompts tab: the
          typing rows are WhatsApp settings, so this card only shows while a
          WhatsApp tab is selected - and only the selected flavour's row. */}
      {(activeChannel === 'personal_whatsapp' || activeChannel === 'waba') && (
      <div className="bg-white dark:bg-[#071131] rounded-lg border border-gray-200 dark:border-blue-950/40 shadow-sm">
        <div className="p-6 border-b border-gray-100 dark:border-blue-950/40">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Chat Behaviour</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-300">
            Control how the AI agent behaves during conversations.
          </p>
        </div>
        <div className="p-6 space-y-5">
          {/* Typing indicator - per channel */}
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Typing Indicator</p>
            <p className="text-xs text-gray-500 dark:text-slate-300 mb-3">
              Show &quot;typing…&quot; to the contact while the AI is composing a reply.
            </p>

            <div className="space-y-3 border border-gray-100 dark:border-blue-950/80 rounded-lg divide-y divide-gray-100 dark:divide-blue-950/40 overflow-hidden">
              {/* Personal WhatsApp row */}
              {activeChannel === 'personal_whatsapp' && (
              <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-blue-950/20">
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Personal WhatsApp</p>
                    <p className="text-xs text-gray-500 dark:text-slate-300">Shows a &quot;typing…&quot; presence to the contact while replying</p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setChatSettings((prev) => ({ ...prev, typing_indicator: !prev.typing_indicator }))
                  }
                  title={chatSettings.typing_indicator ? 'On - click to disable' : 'Off - click to enable'}
                >
                  {chatSettings.typing_indicator ? (
                    <ToggleRight className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                  )}
                </button>
              </div>
              )}

              {/* WABA row */}
              {activeChannel === 'waba' && (
              <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-transparent">
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">WhatsApp Business API</p>
                    <p className="text-xs text-gray-500 dark:text-slate-300">Sends a read receipt and shows a typing bubble while replying</p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setChatSettings((prev) => ({ ...prev, waba_typing_indicator: !prev.waba_typing_indicator }))
                  }
                  title={chatSettings.waba_typing_indicator ? 'On - click to disable' : 'Off - click to enable'}
                >
                  {chatSettings.waba_typing_indicator ? (
                    <ToggleRight className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                  )}
                </button>
              </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveBehaviour}
              disabled={savingBehaviour}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-[#0B1957] dark:bg-blue-600 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-md active:scale-95"
            >
              {savingBehaviour ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Behaviour
            </button>
          </div>
        </div>
      </div>
      )}

      {/* NOTE: the old Section 5 "Campaign Settings" card (campaign_frequency:
          enable/interval/max-daily) was removed 2026-07-05 - the values were
          never consumed by any campaign path. The field remains in the
          ChatSettings API type because the backend still stores/returns it. */}

      {/* ── Section 6: WhatsApp Post-Conversation Follow-up Timing ── */}
      {/* WhatsApp-only: the config lives in the whatsapp-conversations service
          (FOLLOWUP_CONFIG_API) and the stages/booking reminders send via
          WhatsApp templates. Titled + badged accordingly (users assumed it
          applied to every channel) and shown only while a WhatsApp tab is
          selected. LinkedIn has its own follow-up card; other channels none. */}
      {(activeChannel === 'waba' || activeChannel === 'personal_whatsapp') && (
        <div className="relative bg-white dark:bg-[#071131] rounded-2xl border border-gray-200 dark:border-blue-950/40 shadow-sm overflow-hidden text-slate-800 dark:text-slate-100">
          {/* Card Header */}
          <div className="p-6 border-b border-gray-100 dark:border-blue-950/40">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">WhatsApp Follow-ups</h2>
              <span className="flex items-center gap-1.5 ml-1 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                WhatsApp only
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-300">
              Configure when automated follow-up messages are sent after a WhatsApp conversation ends.
              Each stage fires once at the scheduled delay. Booking reminders below also send via WhatsApp.
            </p>
          </div>

          <div className="p-6 space-y-5">
            {/* Master enable */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Enable WhatsApp Follow-ups</p>
                <p className="text-xs text-gray-500 dark:text-slate-300 mt-0.5">
                  Automatically send follow-up messages when a customer stops responding on WhatsApp
                </p>
              </div>
              <button
                onClick={() => setFollowupConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
                className="cursor-pointer"
              >
                {followupConfig.enabled ? (
                  <ToggleRight className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                )}
              </button>
            </div>

            {/* Stage timing table */}
            <div className="border border-gray-100 dark:border-blue-950/40 rounded-lg overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50 dark:bg-[#051139] border-b border-gray-100 dark:border-blue-950/40">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-slate-300 px-4 py-3 w-32">Stage</th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-slate-300 px-4 py-3">Description</th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-slate-300 px-4 py-3 w-32">Delay (hrs)</th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-slate-300 px-4 py-3 w-56">WhatsApp Template</th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-slate-300 px-4 py-3 w-20">Enabled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-blue-950/40">
                  {(
                    [
                      { key: 'FIRST',  label: '1st Follow-up', desc: 'Warm first check-in',          color: 'text-green-600 bg-green-50 dark:text-emerald-400 dark:bg-emerald-950/30' },
                      { key: 'SECOND', label: '2nd Follow-up', desc: 'Value offer / nudge',            color: 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/20' },
                      { key: 'THIRD',  label: '3rd Follow-up', desc: 'Non-pushy check-in (1 week)',    color: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950/20' },
                      { key: 'FOURTH', label: 'Final message', desc: 'Warm goodbye (2 weeks)',         color: 'text-red-600 bg-red-50 dark:text-rose-400 dark:bg-rose-950/30' },
                    ] as Array<{ key: keyof FollowupTimingConfig['stages']; label: string; desc: string; color: string }>
                  ).map(({ key, label, desc, color }) => {
                    const stage = followupConfig.stages[key];
                    const needsTemplate = stage.delay_hours > 24;
                    const templateMissing = needsTemplate && !(stage.template_name || '').trim();
                    return (
                      <tr key={key} className={`dark:bg-transparent transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/20 ${!followupConfig.enabled ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
                            {label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-300">{desc}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              max={720}
                              value={stage.delay_hours}
                              disabled={!followupConfig.enabled || !stage.enabled}
                              onChange={(e) => updateStage(key, 'delay_hours', parseInt(e.target.value) || 24)}
                              className="w-20 px-2 py-1.5 text-xs text-center border border-gray-200 dark:border-blue-950/60 bg-white dark:bg-[#030a21] dark:text-white rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-40"
                            />
                            <span className="text-xs text-gray-400 dark:text-slate-400">h</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={stage.template_name || "placeholder-fallback"}
                            disabled={!followupConfig.enabled || !stage.enabled || loadingTemplates}
                            onValueChange={(value: string) => updateStage(key, 'template_name', value === "placeholder-fallback" ? "" : value)}
                          >
                            <SelectTrigger
                              className={`h-auto flex-1 border rounded-none focus:ring-0 shadow-none bg-transparent px-2 text-left min-h-[38px] ${
                                templateMissing
                                  ? 'border-red-300 dark:border-red-500/50 text-red-900 dark:text-rose-400 font-medium'
                                  : 'border-gray-200 dark:border-blue-950/60 dark:text-slate-200'
                              }`}
                              title={
                                needsTemplate
                                  ? 'Required: Meta blocks free-text replies after 24 h'
                                  : 'Optional: leave blank to use AI-generated reply within 24 h window'
                              }
                            >
                              <SelectValue placeholder="Select a template" />
                            </SelectTrigger>

                            <SelectContent className="bg-white dark:bg-[#000724] border-slate-200 dark:border-[#262831]">
                              <SelectItem
                                value="placeholder-fallback"
                                className="pl-3 pr-6 text-xs justify-start transition-colors cursor-pointer text-slate-800 dark:text-white dark:focus:bg-[#2563eb] dark:focus:text-white"
                              >
                                {loadingTemplates
                                  ? 'Loading templates…'
                                  : needsTemplate
                                  ? '- Pick a template (required) -'
                                  : '- AI-generated (within 24 h) -'}
                              </SelectItem>

                              {approvedTemplates.map((t) => (
                                <SelectItem
                                  key={`${t.name}-${t.language}`}
                                  value={t.name}
                                  className="pl-3 pr-6 text-xs justify-start transition-colors cursor-pointer text-slate-800 dark:text-white dark:focus:bg-[#2563eb] dark:focus:text-white"
                                >
                                  {t.name} {t.parameter_count > 0 ? `({{${t.parameter_count}}})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {templateMissing && (
                            <p className="text-[10px] text-red-600 dark:text-rose-400 mt-1">
                              Required - delays past 24 h need an approved template
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            disabled={!followupConfig.enabled}
                            onClick={() => updateStage(key, 'enabled', !stage.enabled)}
                            className="cursor-pointer"
                          >
                            {stage.enabled ? (
                              <ToggleRight className="h-5 w-5 text-blue-500 dark:text-blue-400 disabled:opacity-40" />
                            ) : (
                              <ToggleLeft className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!loadingTemplates && approvedTemplates.length === 0 && (
                <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-100 dark:border-amber-900/40 text-[11px] text-amber-700 dark:text-amber-400">
                  No approved WhatsApp templates found. Add and approve templates in your Meta Business Manager - without a template, follow-ups past 24 h will fail to send.
                </div>
              )}
            </div>

            {/* Booking reminders */}
            <div className="border border-gray-100 dark:border-blue-950/40 rounded-xl p-5 bg-transparent space-y-4">
              {/* Section Header */}
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl dark:bg-blue-950/40 dark:border dark:border-blue-800/30 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Booking Reminders</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Sent to the customer BEFORE their booking start time so they don&apos;t miss the session. Add as many reminders as you need (e.g. a 24h heads-up + a 3h nudge).
                  </p>
                </div>
              </div>

              {/* Reminders Rows */}
              <div className="space-y-3 pt-1">
                {followupConfig.booking_reminders.map((reminder, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-4 text-xs"
                  >
                    {/* Reminder Label */}
                    <span className="w-24 shrink-0 text-slate-400 font-medium">
                      Reminder #{idx + 1}
                    </span>

                    {/* Delay Input */}
                    <div className="flex items-center gap-2 w-36 shrink-0">
                      <input
                        type="number"
                        min={1}
                        max={168}
                        value={reminder.delay_hours}
                        onChange={(e) =>
                          setFollowupConfig((prev) => ({
                            ...prev,
                            booking_reminders: prev.booking_reminders.map((r, i) =>
                              i === idx ? { ...r, delay_hours: parseInt(e.target.value) || 1 } : r
                            ),
                          }))
                        }
                        className="w-16 px-2.5 py-1.5 text-center font-semibold bg-white dark:bg-[#03091e] text-slate-800 dark:text-white border border-gray-200 dark:border-[#1e293b] rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-slate-400">h before</span>
                    </div>

                    {/* Template Select Dropdown */}
                    <div className="flex-1 min-w-[220px]">
                      <Select
                        value={reminder.template_name || "placeholder-fallback"}
                        disabled={loadingTemplates}
                        onValueChange={(value: string) =>
                          setFollowupConfig((prev) => ({
                            ...prev,
                            booking_reminders: prev.booking_reminders.map((r, i) =>
                              i === idx ? { ...r, template_name: value === "placeholder-fallback" ? "" : value } : r
                            ),
                          }))
                        }
                      >
                        <SelectTrigger className="w-full h-8 px-3 text-xs dark:bg-blue-950/20 bg-transparent border border-gray-200 dark:border-blue-950/60 rounded-md focus:ring-0 shadow-none text-slate-700 dark:text-slate-200 flex items-center justify-between">
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>

                        <SelectContent className="bg-white dark:bg-[#000724] border-slate-200 dark:border-[#262831]">
                          <SelectItem value="placeholder-fallback" className="text-xs">
                            {loadingTemplates ? 'Loading templates…' : '- AI-generated (default) -'}
                          </SelectItem>
                          {approvedTemplates.map((t) => (
                            <SelectItem key={`${t.name}-${t.language}`} value={t.name} className="text-xs">
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Delete Row Button */}
                    <button
                      type="button"
                      onClick={() =>
                        setFollowupConfig((prev) => ({
                          ...prev,
                          booking_reminders: prev.booking_reminders.filter((_, i) => i !== idx),
                        }))
                      }
                      disabled={followupConfig.booking_reminders.length <= 1}
                      className="p-1 text-rose-500 hover:text-rose-400 disabled:opacity-20 cursor-pointer shrink-0 ml-2"
                      title="Remove reminder"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Another Reminder Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() =>
                    setFollowupConfig((prev) => ({
                      ...prev,
                      booking_reminders: [...prev.booking_reminders, { delay_hours: 1, template_name: '' }],
                    }))
                  }
                  disabled={followupConfig.booking_reminders.length >= 10}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                >
                  <span className="text-sm">＋</span> Add another reminder
                </button>
              </div>

              {/* Info Box */}
              <div className="flex items-start gap-2.5 pt-2 text-xs text-slate-400">
                <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <p>
                  AI-generated reminders send as personalised free-text while the customer&apos;s 24-hour conversation window is open, and fall back to your approved follow-up template when it isn&apos;t. Pick an approved template instead for guaranteed delivery regardless of the window.
                </p>
              </div>
            </div>

            {/* Reliability indicator */}
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-100 dark:border-blue-900/40">
              <Zap className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-400">
                Follow-ups are delivered reliably even if the server restarts.
              </p>
            </div>

            {/* Footer save button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveFollowup}
                disabled={savingFollowup}
                className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 dark:bg-blue-600 rounded-xl hover:bg-blue-500 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {savingFollowup ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Follow-up Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Section 7: LinkedIn Automation ──────────────────────── */}
      {/* Both LinkedIn cards (Automation + Follow-up Sequence) follow the
          active System Prompts tab - shown only while LinkedIn is selected.
          Saved values persist regardless of visibility. */}
      {activeChannel === 'linkedin' && (
      <>
      <div className="bg-white dark:bg-[#030a21]/60 rounded-lg border border-gray-200 dark:border-blue-950/40 shadow-sm">
        <div className="p-6 border-b border-gray-100 dark:border-blue-950/40">
          <div className="flex items-center gap-2 mb-1">
            <Linkedin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">LinkedIn Automation</h2>
            <span className="flex items-center gap-1.5 ml-1 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              LinkedIn only
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-300">
            Automatically engage with the post used to personalise each connection request or follow-up message.
            Actions fire after a successful send - never before.
          </p>
        </div>
        <div className="p-6 space-y-5">
          <div className="border border-gray-100 dark:border-blue-950/40 rounded-lg divide-y divide-gray-100 dark:divide-blue-950/40 overflow-hidden">
            {/* Auto Like */}
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-transparent">
              <div className="flex items-center gap-2.5">
                <ThumbsUp className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Auto Like Post</p>
                  <p className="text-xs text-gray-500 dark:text-slate-300">
                    Like the lead&apos;s most recent LinkedIn post when a connection request or follow-up is sent
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setLinkedinAutomation((prev) => ({ ...prev, auto_like_posts: !prev.auto_like_posts }))
                }
                title={linkedinAutomation.auto_like_posts ? 'On - click to disable' : 'Off - click to enable'}
              >
                {linkedinAutomation.auto_like_posts ? (
                  <ToggleRight className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                )}
              </button>
            </div>

            {/* Auto Comment */}
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-transparent">
              <div className="flex items-center gap-2.5">
                <MessageCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Auto Comment on Post</p>
                  <p className="text-xs text-gray-500 dark:text-slate-300">
                    AI generates a short, natural comment on the lead&apos;s most recent post - no generic phrases
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setLinkedinAutomation((prev) => ({ ...prev, auto_comment_posts: !prev.auto_comment_posts }))
                }
                title={linkedinAutomation.auto_comment_posts ? 'On - click to disable' : 'Off - click to enable'}
              >
                {linkedinAutomation.auto_comment_posts ? (
                  <ToggleRight className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                )}
              </button>
            </div>

            {/* Ongoing post monitoring */}
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-transparent">
              <div className="flex items-center gap-2.5">
                <Bell className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Monitor Prospect Posts</p>
                  <p className="text-xs text-gray-500 dark:text-slate-300">
                    Keep watching accepted connections and engage each time they post something new, not only during a campaign step. Uses the two settings above, capped daily and limited to business hours.
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setLinkedinAutomation((prev) => ({ ...prev, post_monitoring_enabled: !prev.post_monitoring_enabled }))
                }
                title={linkedinAutomation.post_monitoring_enabled ? 'On - click to disable' : 'Off - click to enable'}
              >
                {linkedinAutomation.post_monitoring_enabled ? (
                  <ToggleRight className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                )}
              </button>
            </div>

            {/* Inbound connection requests → approval card */}
            <div className="px-4 py-3 bg-white dark:bg-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Review Inbound Requests</p>
                    <p className="text-xs text-gray-500 dark:text-slate-300">
                      When someone asks to connect, Mr LAD researches them and sends you a card to approve. Nothing is accepted without your say-so.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setLinkedinAutomation((prev) => ({ ...prev, inbound_invite_review_enabled: !prev.inbound_invite_review_enabled }))
                  }
                  title={linkedinAutomation.inbound_invite_review_enabled ? 'On — click to disable' : 'Off — click to enable'}
                >
                  {linkedinAutomation.inbound_invite_review_enabled ? (
                    <ToggleRight className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                  )}
                </button>
              </div>

              {/* Where the card goes. Only meaningful once review is on, and the
                  sweep silently does nothing without a contact — so surface that. */}
              {linkedinAutomation.inbound_invite_review_enabled && (
                <div className="mt-3 pl-6 space-y-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={linkedinAutomation.invite_approval_channel}
                      onChange={(e) =>
                        setLinkedinAutomation((prev) => ({
                          ...prev,
                          invite_approval_channel: e.target.value === 'email' ? 'email' : 'whatsapp',
                        }))
                      }
                      className="px-2 py-1.5 border border-gray-200 dark:border-blue-950/60 bg-white dark:bg-[#030a21] dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="email">Email</option>
                    </select>
                    <input
                      type="text"
                      value={linkedinAutomation.invite_approval_to}
                      onChange={(e) =>
                        setLinkedinAutomation((prev) => ({ ...prev, invite_approval_to: e.target.value }))
                      }
                      placeholder={
                        linkedinAutomation.invite_approval_channel === 'email'
                          ? 'you@company.com'
                          : '+971500000000'
                      }
                      className="flex-1 px-2 py-1.5 border border-gray-200 dark:border-blue-950/60 bg-white dark:bg-[#030a21] dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  {!linkedinAutomation.invite_approval_to.trim() && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Add a contact — without one the approval card cannot be delivered and nothing will reach you.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* AI Agent reply delay */}
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-transparent">
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">AI Agent Reply Delay</p>
                  <p className="text-xs text-gray-500 dark:text-slate-300">
                    Hold the AI&apos;s reply for this many seconds before sending - makes the response feel more human. 0 = instant.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={300}
                  step={1}
                  value={linkedinAutomation.ai_agent_reply_delay_seconds}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setLinkedinAutomation((prev) => ({
                      ...prev,
                      ai_agent_reply_delay_seconds: Number.isFinite(v) ? Math.max(0, Math.min(300, v)) : 0,
                    }));
                  }}
                  className="w-20 px-2 py-1.5 border border-gray-200 dark:border-blue-950/60 bg-white dark:bg-[#030a21] dark:text-white rounded-md text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <span className="text-xs text-gray-500 dark:text-slate-300 w-8">sec</span>
              </div>
            </div>

            {/* Auto-withdraw old pending connection requests */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5">
                <UserMinus className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Auto-withdraw old pending requests</p>
                  <p className="text-xs text-gray-500">
                    Withdraw connection requests that are still pending after the set number of days (minimum 30)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1.5 ${linkedinAutomation.auto_withdraw_pending_enabled ? '' : 'opacity-40'}`}>
                  <span className="text-xs text-gray-500">older than</span>
                  <input
                    type="number"
                    min={30}
                    step={1}
                    value={linkedinAutomation.auto_withdraw_pending_days}
                    disabled={!linkedinAutomation.auto_withdraw_pending_enabled}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setLinkedinAutomation((prev) => ({
                        ...prev,
                        auto_withdraw_pending_days: Number.isFinite(v) ? v : 0,
                      }));
                    }}
                    onBlur={() =>
                      setLinkedinAutomation((prev) => ({
                        ...prev,
                        auto_withdraw_pending_days: Math.max(30, Math.floor(Number(prev.auto_withdraw_pending_days) || 90)),
                      }))
                    }
                    className="w-16 px-2 py-1.5 border border-gray-200 rounded-md text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                  />
                  <span className="text-xs text-gray-500">days</span>
                </div>
                <button
                  onClick={() =>
                    setLinkedinAutomation((prev) => ({ ...prev, auto_withdraw_pending_enabled: !prev.auto_withdraw_pending_enabled }))
                  }
                  title={linkedinAutomation.auto_withdraw_pending_enabled ? 'On - click to disable' : 'Off - click to enable'}
                >
                  {linkedinAutomation.auto_withdraw_pending_enabled ? (
                    <ToggleRight className="h-6 w-6 text-blue-500" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-gray-300" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveLinkedinAutomation}
              disabled={savingLinkedinAutomation}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-[#0B1957] dark:bg-blue-600 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-md active:scale-95"
            >
              {savingLinkedinAutomation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save LinkedIn Settings
            </button>
          </div>
        </div>
      </div>

      {/* ───── LinkedIn Follow-up Sequence (post-acceptance cadence) ───── */}
      <div className="bg-white dark:bg-[#030a21]/60 rounded-xl border border-gray-200 dark:border-blue-950/40 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-blue-950/40">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">LinkedIn Follow-up Sequence</h3>
            <span className="flex items-center gap-1.5 ml-1 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              LinkedIn only
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-300">
            After a connection request is accepted, the AI agent schedules this sequence of messages towards booking a meeting. Each touch is AI-generated from your LinkedIn chat-agent prompt (above) by default, or you can pin a saved LinkedIn template (body + media) to a specific touch. Every message is auto-cancelled when the lead replies, and is dynamically rescheduled when the lead asks for a specific future time.
          </p>
        </div>
        <div className="p-6 space-y-5">
          {/* On/off toggle */}
          <div className="border border-gray-100 dark:border-blue-950/40 rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Auto-schedule sequence on acceptance</p>
                <p className="text-xs text-gray-500 dark:text-slate-300">When off, no scheduled follow-ups are created. The live agent still replies to inbound DMs.</p>
              </div>
            </div>
            <button
              onClick={() => setLinkedinFollowup((prev) => ({ ...prev, enabled: !prev.enabled }))}
              title={linkedinFollowup.enabled ? 'On - click to disable' : 'Off - click to enable'}
            >
              {linkedinFollowup.enabled ? (
                <ToggleRight className="h-6 w-6 text-amber-500" />
              ) : (
                <ToggleLeft className="h-6 w-6 text-gray-300 dark:text-gray-600" />
              )}
            </button>
          </div>

          {/* Cadence editor - shared with the per-campaign override in the
              Scheduled Follow-ups modal (components/settings/FollowupTouchesEditor). */}
          <FollowupTouchesEditor
            touches={linkedinFollowup.touches}
            onChange={(touches) => setLinkedinFollowup((prev) => ({ ...prev, touches }))}
            disabled={!linkedinFollowup.enabled}
          />

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveLinkedinFollowup}
              disabled={savingLinkedinFollowup}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-[#0B1957] dark:bg-blue-600 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-md active:scale-95"
            >
              {savingLinkedinFollowup ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Follow-up Cadence
            </button>
          </div>
        </div>
      </div>
      </>
      )}

      {/* ── Email agent (Gmail/Outlook tab) ──────────────────────── */}
      {activeChannel === 'waba' && <HumanMuteCard showToast={showToast} />}
      {/* WABA only: a persona is keyed on the user who owns a NUMBER, and no
          other channel has that ownership model. */}
      {activeChannel === 'waba' && <TeamPersonasCard showToast={showToast} />}
      {activeChannel === 'gmail' && <EmailAgentCard showToast={showToast} />}

      {/* ── Hidden channels hint ─────────────────────────────────── */}
      {/* One quiet strip so hidden settings are discoverable - the settings
          themselves are kept and reappear once the channel is reconnected. */}
      {channelsLoaded && hiddenChannels.length > 0 && (
        <div className="bg-white dark:bg-[#071131] rounded-lg border border-gray-200 dark:border-blue-950/40 shadow-sm px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <EyeOff className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <p className="text-sm text-gray-500">
              {hiddenChannels.map((c) => c.label).join(', ')} settings are hidden because
              {hiddenChannels.length === 1 ? " it isn't" : " they aren't"} connected. Your saved settings are kept.
            </p>
          </div>
          <button
            onClick={() => router.push('/settings?tab=integrations')}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
          >
            Connect channels →
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Missing-fields modal - collects the few facts needed to generate the prompt */}
      {missingFieldsModal && (
        <>
          <div className="fixed inset-0 z-[100] bg-black/30" onClick={() => setMissingFieldsModal(null)} />
          <div className="fixed left-1/2 top-1/2 z-[110] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white dark:bg-[#030a21] p-5 shadow-2xl">
            <div className="flex items-start justify-between mb-1">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">A few details to tailor the prompt</h3>
              <button onClick={() => setMissingFieldsModal(null)} className="text-gray-400 hover:text-gray-600 dark:text-slate-300 dark:hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-300 mb-4">
              These aren&apos;t on file yet. We&apos;ll remember them for next time.
            </p>
            <div className="space-y-3">
              {missingFieldsModal.fields.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1">
                    {f.label}
                    {f.severity !== 'optional' && <span className="text-red-500"> *</span>}
                  </label>
                  <input
                    type="text"
                    value={missingFieldsModal.values[f.key] || ''}
                    placeholder={f.placeholder || ''}
                    onChange={(e) =>
                      setMissingFieldsModal((prev) =>
                        prev ? { ...prev, values: { ...prev.values, [f.key]: e.target.value } } : prev
                      )
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-blue-950/60 bg-white dark:bg-[#061033]/70 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setMissingFieldsModal(null)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 dark:text-slate-300 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => runGenerate(missingFieldsModal.promptName, missingFieldsModal.values)}
                disabled={
                  generatingPrompt !== null ||
                  missingFieldsModal.fields.some(
                    (f) => f.severity !== 'optional' && !(missingFieldsModal.values[f.key] || '').trim()
                  )
                }
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {generatingPrompt !== null ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Generate
              </button>
            </div>
          </div>
        </>
      )}

      {/* AI Playground side panel - opens over current page */}
      {playgroundOpen && typeof window !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
            onClick={() => setPlaygroundOpen(false)}
          />

          <div
            className="fixed right-0 top-0 bottom-0 z-[150] h-full w-full"
          >
            <AIPlayground onClose={() => setPlaygroundOpen(false)} />
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
