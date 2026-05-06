'use client';

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
  X,
  Send,
  Sparkles,
} from 'lucide-react';
import KnowledgeBaseManager from './KnowledgeBaseManager';
import dynamic from 'next/dynamic';

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

async function fetchApprovedTemplates(): Promise<WhatsAppApprovedTemplate[]> {
  try {
    const res = await fetch(APPROVED_TEMPLATES_API);
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
    const res = await fetch(SHAREABLE_ASSETS_API);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.assets) ? data.assets : [];
  } catch {
    return [];
  }
}

async function saveShareableAssets(assets: ShareableAsset[]): Promise<boolean> {
  try {
    const res = await fetch(SHAREABLE_ASSETS_API, {
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
    const res = await fetch(FOLLOWUP_CONFIG_API);
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

async function updateFollowupConfig(config: FollowupTimingConfig): Promise<boolean> {
  try {
    const res = await fetch(FOLLOWUP_CONFIG_API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    return data.success ?? false;
  } catch {
    return false;
  }
}

async function fetchPrompts(): Promise<Prompt[]> {
  const res = await fetch(PROMPTS_API);
  const data = await res.json();
  // Node.js backend returns { success, prompts: [] }; Python returns { success, data: [] }
  const list = data.prompts ?? data.data ?? [];
  return Array.isArray(list) ? list : [];
}

async function updatePrompt(name: string, updates: Partial<Prompt>): Promise<boolean> {
  const res = await fetch(`${PROMPTS_API}/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  return data.success;
}

async function createPrompt(prompt: { name: string; prompt_text: string; channel: string }): Promise<boolean> {
  const res = await fetch(PROMPTS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prompt),
  });
  const data = await res.json();
  return data.success;
}

async function deletePrompt(name: string): Promise<boolean> {
  const res = await fetch(`${PROMPTS_API}/${encodeURIComponent(name)}`, {
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
    fetch(`${SETTINGS_API}?channel=personal`),
    fetch(`${SETTINGS_API}?channel=waba`),
  ]);

  // Personal WA
  let personalRaw: Record<string, any> = {};
  if (personalRes.status === 'fulfilled' && personalRes.value.ok) {
    try {
      const data = await personalRes.value.json();
      personalRaw = data.data ?? data.settings ?? data ?? {};
    } catch { /* ignore */ }
  }

  // WABA — Python service returns the row directly (not wrapped in { success, data })
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
    const res = await fetch(SETTINGS_API, {
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

// ── Main Component ───────────────────────────────────────────────

export function ChatSettings() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [chatSettings, setChatSettings] = useState<ChatSettingsConfig>({
    knowledge_base: '',
    campaign_frequency: { enabled: true, interval_hours: 24, max_daily_messages: 50 },
  });
  const [followupConfig, setFollowupConfig] = useState<FollowupTimingConfig>(DEFAULT_FOLLOWUP_CONFIG);
  // Approved WhatsApp templates fetched from Meta — used to populate the
  // template-picker dropdown for each follow-up stage + booking reminder.
  const [approvedTemplates, setApprovedTemplates] = useState<WhatsAppApprovedTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [savingFollowup, setSavingFollowup] = useState(false);

  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState('waba');
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});
  const [savingPrompt, setSavingPrompt] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingKb, setSavingKb] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Shareable assets — files (price list, brochure…) the AI can auto-attach
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

  // AI Playground panel — testers can validate prompt + KB + assets without leaving the page
  const [playgroundOpen, setPlaygroundOpen] = useState(false);

  // New prompt form
  const [showNewPrompt, setShowNewPrompt] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptText, setNewPromptText] = useState('');
  const [creatingPrompt, setCreatingPrompt] = useState(false);

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

  // Web scraping test chat state — Claude-powered preview against scraped content
  const [showWebTestChat, setShowWebTestChat] = useState(false);
  const [webChatInput, setWebChatInput] = useState('');
  const [webChatBusy, setWebChatBusy] = useState(false);
  const [webChatMessages, setWebChatMessages] = useState<
    { role: 'user' | 'assistant'; content: string; sources?: string[] }[]
  >([]);

  // LinkedIn automation settings
  const [linkedinAutomation, setLinkedinAutomation] = useState({
    auto_like_posts: false,
    auto_comment_posts: false,
  });
  const [savingLinkedinAutomation, setSavingLinkedinAutomation] = useState(false);

  // Load data on mount
  useEffect(() => {
    setLoadingTemplates(true);
    Promise.all([
      fetchPrompts(),
      fetchChatSettings(),
      fetchFollowupConfig(),
      fetch('/api/social-integration/linkedin/automation-settings').then((r) => r.json()).catch(() => null),
      fetchShareableAssets(),
      fetchApprovedTemplates(),
    ])
      .then(([p, s, f, liSettings, assets, tmpl]) => {
        setPrompts(Array.isArray(p) ? p : []);
        setChatSettings(s);
        setFollowupConfig(f);
        if (liSettings?.success && liSettings.data) {
          setLinkedinAutomation({
            auto_like_posts:    !!liSettings.data.auto_like_posts,
            auto_comment_posts: !!liSettings.data.auto_comment_posts,
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

  const filteredPrompts = prompts.filter((p) => (p.channel || 'waba') === activeChannel);

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

  // ── Chat Behaviour save (typing indicator — separate per channel) ──

  const [savingBehaviour, setSavingBehaviour] = useState(false);

  const handleSaveBehaviour = useCallback(async () => {
    setSavingBehaviour(true);
    // Personal WA → PUT (Node.js backend)
    const personalOk = await updateChatSettings({ typing_indicator: chatSettings.typing_indicator });
    // WABA → PATCH (Python WABA service)
    let wabaOk = false;
    try {
      const res = await fetch(`${SETTINGS_API}?channel=waba`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ typing_indicator: chatSettings.waba_typing_indicator }),
      });
      wabaOk = res.ok;
    } catch { /* ignore */ }
    const allOk = personalOk && wabaOk;
    showToast(allOk ? 'Chat behaviour saved' : 'Partially saved — check console', allOk ? 'success' : 'error');
    setSavingBehaviour(false);
  }, [chatSettings.typing_indicator, chatSettings.waba_typing_indicator, showToast]);

  // ── Campaign Settings save ───────────────────────────────────

  const handleSaveCampaign = useCallback(async () => {
    setSavingSettings(true);
    const ok = await updateChatSettings({ campaign_frequency: chatSettings.campaign_frequency });
    showToast(ok ? 'Campaign settings saved' : 'Failed to save', ok ? 'success' : 'error');
    setSavingSettings(false);
  }, [chatSettings.campaign_frequency, showToast]);

  // ── Follow-up Timing save ────────────────────────────────────

  const handleSaveFollowup = useCallback(async () => {
    setSavingFollowup(true);
    const ok = await updateFollowupConfig(followupConfig);
    showToast(ok ? 'Follow-up timing saved' : 'Failed to save', ok ? 'success' : 'error');
    setSavingFollowup(false);
  }, [followupConfig, showToast]);

  const handleSaveLinkedinAutomation = useCallback(async () => {
    setSavingLinkedinAutomation(true);
    try {
      const res = await fetch('/api/social-integration/linkedin/automation-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(linkedinAutomation),
      });
      const data = await res.json();
      showToast(data.success ? 'LinkedIn automation settings saved' : 'Failed to save', data.success ? 'success' : 'error');
    } catch {
      showToast('Failed to save', 'error');
    } finally {
      setSavingLinkedinAutomation(false);
    }
  }, [linkedinAutomation, showToast]);

  const handleSaveWebScraping = useCallback(async () => {
    setWebScrapingSaving(true);
    try {
      const res = await fetch('/api/whatsapp-conversations/chat-settings/web-scraping', {
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
          showToast(`Scraped ${okCount}/${diagnostics.length} URLs — see diagnostics below`, 'success');
        } else {
          showToast('No content extracted — see diagnostics below', 'error');
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
      const res = await fetch(
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
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* ── Sticky "Test in Playground" button ─────────────────────── */}
      <div className="sticky top-2 z-10 flex justify-end pointer-events-none">
        <button
          type="button"
          onClick={() => setPlaygroundOpen(true)}
          className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg shadow-lg hover:bg-violet-700 transition-colors"
          title="Open the AI Playground to test your prompts, knowledge base, and shareable assets"
        >
          <FlaskConical className="h-4 w-4" />
          Test in AI Playground
        </button>
      </div>

      {/* ── Section 1: System Prompts ─────────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">System Prompts</h2>
          </div>
          <p className="text-sm text-gray-500">
            Manage AI conversation prompts for each channel. Edit prompt text to customize agent behavior.
          </p>
        </div>

        {/* Channel tabs */}
        <div className="border-b border-gray-100 px-6">
          <div className="flex gap-1 -mb-px">
            {CHANNELS.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeChannel === ch.id
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${ch.color}`} />
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        {/* Prompts list */}
        <div className="divide-y divide-gray-100">
          {filteredPrompts.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No prompts for {CHANNELS.find((c) => c.id === activeChannel)?.label}</p>
              <p className="text-xs mt-1">Create one to get started</p>
            </div>
          ) : (
            filteredPrompts.map((prompt) => {
              const isExpanded = expandedPrompt === prompt.name;
              const hasEdit = editedTexts[prompt.name] !== undefined;

              return (
                <div key={prompt.name} className="group">
                  {/* Prompt header row */}
                  <div
                    className="flex items-center gap-3 px-6 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedPrompt(isExpanded ? null : prompt.name)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium text-gray-800 flex-1">
                      {getLabel(prompt.name)}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono mr-2">v{prompt.version || 1}</span>

                    {/* Active toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(prompt);
                      }}
                      className="flex-shrink-0"
                      title={prompt.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                    >
                      {prompt.is_active ? (
                        <ToggleRight className="h-5 w-5 text-blue-500" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-gray-300" />
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
                      <Trash2 className="h-3.5 w-3.5 text-red-400 hover:text-red-600" />
                    </button>
                  </div>

                  {/* Expanded editor */}
                  {isExpanded && (
                    <div className="px-6 pb-4">
                      <textarea
                        className="w-full h-64 p-3 text-sm font-mono border border-gray-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50"
                        value={hasEdit ? editedTexts[prompt.name] : prompt.prompt_text}
                        onChange={(e) =>
                          setEditedTexts((prev) => ({ ...prev, [prompt.name]: e.target.value }))
                        }
                        placeholder="Enter prompt text..."
                      />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-gray-400">
                          {prompt.updated_at
                            ? `Last updated: ${new Date(prompt.updated_at).toLocaleDateString()}`
                            : ''}
                        </span>
                        <button
                          onClick={() => handleSavePrompt(prompt.name)}
                          disabled={!hasEdit || savingPrompt === prompt.name}
                          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Add new prompt */}
        <div className="px-6 py-3 border-t border-gray-100">
          {!showNewPrompt ? (
            <button
              onClick={() => setShowNewPrompt(true)}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              Add New Prompt
            </button>
          ) : (
            <div className="space-y-3 p-4 rounded-lg border border-blue-100 bg-blue-50/30">
              <input
                type="text"
                placeholder="Prompt name (e.g. WELCOME_MESSAGE)"
                value={newPromptName}
                onChange={(e) => setNewPromptName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                autoFocus
              />
              {/* Channel selector — pre-fills from active tab but user can override */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 whitespace-nowrap">Channel:</label>
                <select
                  value={newPromptName ? activeChannel : activeChannel}
                  onChange={(e) => setActiveChannel(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
                >
                  {CHANNELS.map((ch) => (
                    <option key={ch.id} value={ch.id}>{ch.label}</option>
                  ))}
                </select>
              </div>
              <textarea
                placeholder="Enter the prompt text..."
                value={newPromptText}
                onChange={(e) => setNewPromptText(e.target.value)}
                className="w-full h-32 px-3 py-2 text-sm font-mono border border-gray-200 rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreatePrompt}
                  disabled={!newPromptName.trim() || !newPromptText.trim() || creatingPrompt}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {creatingPrompt ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Create Prompt
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <KnowledgeBaseManager />
      </div>

      {/* ── Shareable Assets ─────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-5 w-5 text-violet-600" />
            <h2 className="text-lg font-semibold text-gray-900">Shareable Assets</h2>
          </div>
          <p className="text-sm text-gray-500">
            Files (price list, brochure, menu…) the AI agent can attach automatically
            in WhatsApp when the customer asks. The system listens for the trigger
            keywords in the AI's reply, downloads the file from the URL, and sends
            it as a real attachment — so customers never see a raw link.
          </p>
        </div>
        <div className="p-6 space-y-4">
          {loadingAssets ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading assets…
            </div>
          ) : (
            <>
              {shareableAssets.length === 0 && (
                <p className="text-sm text-gray-400 italic">
                  No assets configured yet. Click "Add Asset" to register your first one.
                </p>
              )}

              {shareableAssets.map((asset, idx) => {
                const isExpanded = expandedAssetIdx === idx;

                // ── Compact (collapsed) row — like a Knowledge Base folder ──
                if (!isExpanded) {
                  const triggers = (asset.trigger_keywords || []).join(', ');
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setExpandedAssetIdx(idx)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <BookOpen className="h-5 w-5 text-violet-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {asset.filename || asset.key || `Asset #${idx + 1}`}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {triggers ? `Triggers: ${triggers}` : 'No trigger keywords set'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeShareableAsset(idx);
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
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
                    className="border border-violet-300 rounded-lg p-4 space-y-3 bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <button
                        type="button"
                        onClick={() => setExpandedAssetIdx(null)}
                        className="text-xs font-semibold text-violet-600 uppercase tracking-wide hover:text-violet-700 flex items-center gap-1"
                        title="Collapse"
                      >
                        <ChevronDown className="h-3 w-3" />
                        Asset #{idx + 1}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeShareableAsset(idx)}
                        className="text-red-500 hover:text-red-700"
                        title="Remove this asset"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Display Filename
                        </label>
                        <input
                          type="text"
                          placeholder="Price_List.pdf"
                          value={asset.filename || ''}
                          onChange={(e) =>
                            updateShareableAsset(idx, { filename: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Internal Key (optional)
                        </label>
                        <input
                          type="text"
                          placeholder="price_list"
                          value={asset.key || ''}
                          onChange={(e) =>
                            updateShareableAsset(idx, { key: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        File URL <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="url"
                        placeholder="https://drive.google.com/uc?export=download&id=…"
                        value={asset.url}
                        onChange={(e) =>
                          updateShareableAsset(idx, { url: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Must be a publicly downloadable URL. For Google Drive use
                        <code className="text-xs bg-gray-200 px-1 mx-1 rounded">uc?export=download&id=…</code>
                        format (not the share-view link).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          MIME Type
                        </label>
                        <input
                          type="text"
                          placeholder="application/pdf"
                          value={asset.mime_type || 'application/pdf'}
                          onChange={(e) =>
                            updateShareableAsset(idx, { mime_type: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Send As
                        </label>
                        <select
                          value={asset.media_type || 'document'}
                          onChange={(e) =>
                            updateShareableAsset(idx, {
                              media_type: e.target.value as 'document' | 'image',
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                          <option value="document">Document (file)</option>
                          <option value="image">Image (preview)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
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
                          // Hold the raw text in a per-row draft state — do NOT
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Comma-separated. The file is sent when ANY keyword appears in
                        the AI's reply (matches plurals + variants — e.g. "pricelist"
                        also matches "prices", "pricing", "price list").
                      </p>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={addShareableAsset}
                  className="inline-flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700"
                >
                  <Plus className="h-4 w-4" /> Add Asset
                </button>

                <button
                  type="button"
                  onClick={handleSaveShareableAssets}
                  disabled={savingAssets}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 disabled:opacity-50"
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
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Company Website Context</h2>
          </div>
          <p className="text-sm text-gray-500">
            Let the AI answer WhatsApp questions using content from your website or blog pages.
            URLs are scraped once when you save and the text is cached — no live requests on each reply.
          </p>
        </div>
        <div className="p-6 space-y-5">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Enable Website Context</p>
              <p className="text-xs text-gray-500 mt-0.5">
                When ON, scraped website content is included in every WhatsApp AI reply
              </p>
            </div>
            <button
              onClick={() =>
                setChatSettings((prev) => ({
                  ...prev,
                  web_scraping_enabled: !prev.web_scraping_enabled,
                }))
              }
              title={chatSettings.web_scraping_enabled ? 'On — click to disable' : 'Off — click to enable'}
            >
              {chatSettings.web_scraping_enabled ? (
                <ToggleRight className="h-6 w-6 text-blue-600" />
              ) : (
                <ToggleLeft className="h-6 w-6 text-gray-300" />
              )}
            </button>
          </div>

          {/* URL list */}
          <div>
            <p className="text-sm font-medium text-gray-800 mb-2">Website URLs</p>
            <p className="text-xs text-gray-500 mb-3">
              Add your company website homepage, about page, pricing page, blog, FAQ, etc.
            </p>

            {chatSettings.web_scraping_urls.length > 0 && (
              <div className="mb-3 border border-gray-100 rounded-lg divide-y divide-gray-100 overflow-hidden">
                {chatSettings.web_scraping_urls.map((url, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-2.5 bg-white hover:bg-gray-50">
                    <div className="flex items-center gap-2 overflow-hidden min-w-0">
                      <Globe className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{url}</span>
                    </div>
                    <button
                      onClick={() =>
                        setChatSettings((prev) => ({
                          ...prev,
                          web_scraping_urls: prev.web_scraping_urls.filter((_, i) => i !== idx),
                        }))
                      }
                      className="ml-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded flex-shrink-0 transition-colors"
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
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
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
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 border border-blue-200 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Press Enter or click Add. Must start with https://</p>
          </div>

          {/* Per-URL scrape diagnostics — appears after Save & Scrape */}
          {webScrapingDiagnostics.length > 0 && (
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-600 uppercase tracking-wider flex items-center justify-between">
                <span>Last Scrape Result</span>
                <span className="text-gray-400 normal-case tracking-normal">
                  {webScrapingDiagnostics.filter((d) => d.ok).length} / {webScrapingDiagnostics.length} pages scraped
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {webScrapingDiagnostics.map((d, i) => (
                  <div
                    key={i}
                    className={`flex items-start justify-between px-3 py-2.5 gap-3 ${
                      d.auto_discovered ? 'pl-8 bg-gray-50/30' : ''
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
                          <p className="text-xs text-gray-700 truncate" title={d.url}>{d.url}</p>
                          {d.auto_discovered && (
                            <span
                              className="text-[10px] uppercase tracking-wider text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-medium"
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
                          <p className="text-[11px] text-green-600 mt-0.5">
                            ✓ {d.chars.toLocaleString()} chars extracted
                          </p>
                        ) : (
                          <p className="text-[11px] text-red-600 mt-0.5">
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
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 border border-blue-200 bg-white rounded-md hover:bg-blue-50 transition-colors"
              title="Preview how the AI answers using your scraped website content"
            >
              <Sparkles className="h-4 w-4" />
              {showWebTestChat ? 'Hide Test Chat' : 'Test Chat'}
            </button>
            <button
              onClick={handleSaveWebScraping}
              disabled={webScrapingSaving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {webScrapingSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {webScrapingSaving ? 'Scraping & saving…' : 'Save & Scrape'}
            </button>
          </div>

          {/* Test Chat panel — Claude-powered preview against cached scraped content */}
          {showWebTestChat && (
            <div className="mt-4 border border-blue-200 rounded-xl overflow-hidden bg-slate-50/40">
              <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Test against scraped content
                  </span>
                </div>
                {webChatMessages.length > 0 && (
                  <button
                    onClick={() => setWebChatMessages([])}
                    className="text-xs text-blue-700 hover:text-blue-900 font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="max-h-[360px] overflow-y-auto p-4 space-y-3">
                {webChatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400">
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
                            : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm shadow-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                      {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-1 px-1 text-[10px] text-slate-400 flex flex-wrap gap-1">
                          <span className="font-semibold uppercase tracking-wider">Sources:</span>
                          {msg.sources.map((s, idx) => (
                            <span key={idx} className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 truncate max-w-[200px]" title={s}>
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
                    <div className="px-3.5 py-2 bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-bl-sm shadow-sm text-sm flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-blue-200 bg-white">
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
                    className="flex-1 px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:opacity-60"
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
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Chat Behaviour</h2>
          </div>
          <p className="text-sm text-gray-500">
            Control how the AI agent behaves during conversations.
          </p>
        </div>
        <div className="p-6 space-y-5">
          {/* Typing indicator — per channel */}
          <div>
            <p className="text-sm font-medium text-gray-800 mb-1">Typing Indicator</p>
            <p className="text-xs text-gray-500 mb-3">
              Show "typing…" to the contact while the AI is composing a reply.
              Configure separately for each channel.
            </p>

            <div className="space-y-3 border border-gray-100 rounded-lg divide-y divide-gray-100 overflow-hidden">
              {/* Personal WhatsApp row */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Personal WhatsApp</p>
                    <p className="text-xs text-gray-500">Shows a "typing…" presence to the contact while replying</p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setChatSettings((prev) => ({ ...prev, typing_indicator: !prev.typing_indicator }))
                  }
                  title={chatSettings.typing_indicator ? 'On — click to disable' : 'Off — click to enable'}
                >
                  {chatSettings.typing_indicator ? (
                    <ToggleRight className="h-6 w-6 text-blue-500" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-gray-300" />
                  )}
                </button>
              </div>

              {/* WABA row */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">WhatsApp Business API</p>
                    <p className="text-xs text-gray-500">Sends a read receipt and shows a typing bubble while replying</p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setChatSettings((prev) => ({ ...prev, waba_typing_indicator: !prev.waba_typing_indicator }))
                  }
                  title={chatSettings.waba_typing_indicator ? 'On — click to disable' : 'Off — click to enable'}
                >
                  {chatSettings.waba_typing_indicator ? (
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
              onClick={handleSaveBehaviour}
              disabled={savingBehaviour}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {savingBehaviour ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Behaviour
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 5: Campaign Settings ──────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Campaign Settings</h2>
          </div>
          <p className="text-sm text-gray-500">
            Configure automated campaign frequency and limits.
          </p>
        </div>
        <div className="p-6 space-y-5">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Enable Automated Campaigns</p>
              <p className="text-xs text-gray-500 mt-0.5">Send automated follow-up messages to leads</p>
            </div>
            <button
              onClick={() =>
                setChatSettings((prev) => ({
                  ...prev,
                  campaign_frequency: {
                    ...prev.campaign_frequency,
                    enabled: !prev.campaign_frequency.enabled,
                  },
                }))
              }
            >
              {chatSettings.campaign_frequency.enabled ? (
                <ToggleRight className="h-6 w-6 text-blue-500" />
              ) : (
                <ToggleLeft className="h-6 w-6 text-gray-300" />
              )}
            </button>
          </div>

          {/* Interval hours */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Message Interval (hours)
            </label>
            <p className="text-xs text-gray-500 mb-2">Minimum time between automated messages to the same lead</p>
            <input
              type="number"
              min={1}
              max={168}
              value={chatSettings.campaign_frequency.interval_hours}
              onChange={(e) =>
                setChatSettings((prev) => ({
                  ...prev,
                  campaign_frequency: {
                    ...prev.campaign_frequency,
                    interval_hours: parseInt(e.target.value) || 24,
                  },
                }))
              }
              className="w-32 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          {/* Max daily messages */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Max Daily Messages
            </label>
            <p className="text-xs text-gray-500 mb-2">Maximum number of automated messages sent per day across all leads</p>
            <input
              type="number"
              min={1}
              max={1000}
              value={chatSettings.campaign_frequency.max_daily_messages}
              onChange={(e) =>
                setChatSettings((prev) => ({
                  ...prev,
                  campaign_frequency: {
                    ...prev.campaign_frequency,
                    max_daily_messages: parseInt(e.target.value) || 50,
                  },
                }))
              }
              className="w-32 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveCampaign}
              disabled={savingSettings}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Campaign Settings
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 6: Post-Conversation Follow-up Timing ────────── */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Post-Conversation Follow-ups</h2>
          </div>
          <p className="text-sm text-gray-500">
            Configure when automated follow-up messages are sent after a conversation ends.
            Each stage fires once at the scheduled delay.
          </p>
        </div>
        <div className="p-6 space-y-5">
          {/* Master enable */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Enable Post-Conversation Follow-ups</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Automatically send follow-up messages when a customer stops responding
              </p>
            </div>
            <button
              onClick={() => setFollowupConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
            >
              {followupConfig.enabled ? (
                <ToggleRight className="h-6 w-6 text-blue-500" />
              ) : (
                <ToggleLeft className="h-6 w-6 text-gray-300" />
              )}
            </button>
          </div>

          {/* Stage timing table */}
          <div className="border border-gray-100 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 w-32">Stage</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Description</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 w-32">Delay (hrs)</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 w-56">WhatsApp Template</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 w-20">Enabled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(
                  [
                    { key: 'FIRST',  label: '1st Follow-up', desc: 'Warm first check-in',           color: 'text-green-600 bg-green-50' },
                    { key: 'SECOND', label: '2nd Follow-up', desc: 'Value offer / nudge',            color: 'text-yellow-600 bg-yellow-50' },
                    { key: 'THIRD',  label: '3rd Follow-up', desc: 'Non-pushy check-in (1 week)',    color: 'text-orange-600 bg-orange-50' },
                    { key: 'FOURTH', label: 'Final message', desc: 'Warm goodbye (2 weeks)',         color: 'text-red-600 bg-red-50' },
                  ] as Array<{ key: keyof FollowupTimingConfig['stages']; label: string; desc: string; color: string }>
                ).map(({ key, label, desc, color }) => {
                  const stage = followupConfig.stages[key];
                  // Past 24h, free text is blocked by Meta — flag stages that need a template
                  const needsTemplate = stage.delay_hours > 24;
                  const templateMissing = needsTemplate && !(stage.template_name || '').trim();
                  return (
                    <tr key={key} className={!followupConfig.enabled ? 'opacity-50' : ''}>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
                          {label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{desc}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={1}
                            max={720}
                            value={stage.delay_hours}
                            disabled={!followupConfig.enabled || !stage.enabled}
                            onChange={(e) => updateStage(key, 'delay_hours', parseInt(e.target.value) || 24)}
                            className="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:opacity-40 disabled:bg-gray-50"
                          />
                          <span className="text-xs text-gray-400">h</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={stage.template_name || ''}
                          disabled={!followupConfig.enabled || !stage.enabled || loadingTemplates}
                          onChange={(e) => updateStage(key, 'template_name', e.target.value)}
                          className={`w-full px-2 py-1.5 text-sm border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:opacity-40 disabled:bg-gray-50 ${
                            templateMissing ? 'border-red-300' : 'border-gray-200'
                          }`}
                          title={
                            needsTemplate
                              ? 'Required: Meta blocks free-text replies after 24 h'
                              : 'Optional: leave blank to use AI-generated reply within 24 h window'
                          }
                        >
                          <option value="">
                            {loadingTemplates
                              ? 'Loading templates…'
                              : needsTemplate
                                ? '— Pick a template (required) —'
                                : '— AI-generated (within 24 h) —'}
                          </option>
                          {approvedTemplates.map((t) => (
                            <option key={t.name} value={t.name}>
                              {t.name} {t.parameter_count > 0 ? `({{${t.parameter_count}}})` : ''}
                            </option>
                          ))}
                        </select>
                        {templateMissing && (
                          <p className="text-[10px] text-red-600 mt-1">
                            Required — delays past 24 h need an approved template
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          disabled={!followupConfig.enabled}
                          onClick={() => updateStage(key, 'enabled', !stage.enabled)}
                        >
                          {stage.enabled ? (
                            <ToggleRight className="h-5 w-5 text-blue-500 disabled:opacity-40" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-gray-300" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!loadingTemplates && approvedTemplates.length === 0 && (
              <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 text-[11px] text-amber-700">
                No approved WhatsApp templates found.  Add and approve templates in your Meta Business Manager — without a template, follow-ups past 24 h will fail to send.
              </div>
            )}
          </div>

          {/* Booking reminders — list of N pre-booking nudges */}
          <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/40 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Booking Reminders
              </label>
              <p className="text-xs text-gray-500">
                Sent to the customer BEFORE their booking start time so they don't miss the session.
                Add as many reminders as you need (e.g. a 24h heads-up + a 3h nudge).
              </p>
            </div>
            <div className="space-y-2">
              {followupConfig.booking_reminders.map((reminder, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap items-end gap-2 p-3 bg-white rounded-md border border-gray-200"
                >
                  <div className="flex flex-col min-w-[140px]">
                    <label className="text-[11px] font-medium text-gray-600 mb-1">
                      Reminder #{idx + 1}
                    </label>
                    <div className="flex items-center gap-1.5">
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
                        className="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                      />
                      <span className="text-xs text-gray-500">h before</span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <label className="text-[11px] font-medium text-gray-600 mb-1 block">
                      WhatsApp Template
                    </label>
                    <select
                      value={reminder.template_name || ''}
                      disabled={loadingTemplates}
                      onChange={(e) =>
                        setFollowupConfig((prev) => ({
                          ...prev,
                          booking_reminders: prev.booking_reminders.map((r, i) =>
                            i === idx ? { ...r, template_name: e.target.value } : r
                          ),
                        }))
                      }
                      className={`w-full px-2 py-1.5 text-sm border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 ${
                        !reminder.template_name ? 'border-red-300' : 'border-gray-200'
                      }`}
                    >
                      <option value="">
                        {loadingTemplates
                          ? 'Loading templates…'
                          : '— Pick a template (required) —'}
                      </option>
                      {approvedTemplates.map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.name} {t.parameter_count > 0 ? `({{${t.parameter_count}}})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setFollowupConfig((prev) => ({
                        ...prev,
                        booking_reminders: prev.booking_reminders.filter((_, i) => i !== idx),
                      }))
                    }
                    disabled={followupConfig.booking_reminders.length <= 1}
                    title={
                      followupConfig.booking_reminders.length <= 1
                        ? 'At least one reminder is required'
                        : 'Remove this reminder'
                    }
                    className="px-2 py-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setFollowupConfig((prev) => ({
                  ...prev,
                  booking_reminders: [
                    ...prev.booking_reminders,
                    // New entries default to 1h before so the user is forced to
                    // choose a meaningful delay before saving.
                    { delay_hours: 1, template_name: '' },
                  ],
                }))
              }
              disabled={followupConfig.booking_reminders.length >= 10}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-lg leading-none">＋</span> Add another reminder
            </button>

            <p className="text-xs text-gray-500">
              All reminders need an APPROVED WhatsApp template — Meta blocks free-text replies outside the 24-hour conversation window.
              {followupConfig.booking_reminders.length >= 10 && (
                <span className="block mt-1 text-amber-600">Maximum 10 reminders per booking.</span>
              )}
            </p>
          </div>

          {/* Reliability indicator */}
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-md border border-blue-100">
            <Zap className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              Follow-ups are delivered reliably even if the server restarts.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveFollowup}
              disabled={savingFollowup}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {savingFollowup ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Follow-up Settings
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 7: LinkedIn Automation ──────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <Linkedin className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">LinkedIn Automation</h2>
          </div>
          <p className="text-sm text-gray-500">
            Automatically engage with the post used to personalise each connection request or follow-up message.
            Actions fire after a successful send — never before.
          </p>
        </div>
        <div className="p-6 space-y-5">
          <div className="border border-gray-100 rounded-lg divide-y divide-gray-100 overflow-hidden">
            {/* Auto Like */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5">
                <ThumbsUp className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Auto Like Post</p>
                  <p className="text-xs text-gray-500">
                    Like the lead&apos;s most recent LinkedIn post when a connection request or follow-up is sent
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setLinkedinAutomation((prev) => ({ ...prev, auto_like_posts: !prev.auto_like_posts }))
                }
                title={linkedinAutomation.auto_like_posts ? 'On — click to disable' : 'Off — click to enable'}
              >
                {linkedinAutomation.auto_like_posts ? (
                  <ToggleRight className="h-6 w-6 text-blue-500" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-gray-300" />
                )}
              </button>
            </div>

            {/* Auto Comment */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5">
                <MessageCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Auto Comment on Post</p>
                  <p className="text-xs text-gray-500">
                    AI generates a short, natural comment on the lead&apos;s most recent post — no generic phrases
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setLinkedinAutomation((prev) => ({ ...prev, auto_comment_posts: !prev.auto_comment_posts }))
                }
                title={linkedinAutomation.auto_comment_posts ? 'On — click to disable' : 'Off — click to enable'}
              >
                {linkedinAutomation.auto_comment_posts ? (
                  <ToggleRight className="h-6 w-6 text-blue-500" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-gray-300" />
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveLinkedinAutomation}
              disabled={savingLinkedinAutomation}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {savingLinkedinAutomation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save LinkedIn Settings
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* AI Playground side panel — opens over current page */}
      {playgroundOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setPlaygroundOpen(false)}
          />
          <div className="fixed top-0 right-0 z-50 h-full w-full sm:w-[480px] bg-background shadow-2xl">
            <AIPlayground onClose={() => setPlaygroundOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
