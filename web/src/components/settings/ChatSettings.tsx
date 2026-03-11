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
} from 'lucide-react';

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
  campaign_frequency: {
    enabled: boolean;
    interval_hours: number;
    max_daily_messages: number;
  };
}

// ── API helpers ──────────────────────────────────────────────────

const PROMPTS_API = '/api/whatsapp-conversations/prompts';
const SETTINGS_API = '/api/whatsapp-conversations/chat-settings';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function fetchPrompts(): Promise<Prompt[]> {
  const res = await fetch(PROMPTS_API, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  return data.success ? data.data : [];
}

async function updatePrompt(name: string, updates: Partial<Prompt>): Promise<boolean> {
  const res = await fetch(`${PROMPTS_API}/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  return data.success;
}

async function createPrompt(prompt: { name: string; prompt_text: string; channel: string }): Promise<boolean> {
  const res = await fetch(PROMPTS_API, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(prompt),
  });
  const data = await res.json();
  return data.success;
}

async function deletePrompt(name: string): Promise<boolean> {
  const res = await fetch(`${PROMPTS_API}/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  return data.success;
}

async function fetchChatSettings(): Promise<ChatSettingsConfig> {
  const res = await fetch(SETTINGS_API, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  return data.success
    ? data.data
    : { knowledge_base: '', campaign_frequency: { enabled: true, interval_hours: 24, max_daily_messages: 50 } };
}

async function updateChatSettings(updates: Partial<ChatSettingsConfig>): Promise<boolean> {
  const res = await fetch(SETTINGS_API, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  return data.success;
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
  { id: 'whatsapp', label: 'WhatsApp', color: 'bg-green-500' },
  { id: 'linkedin', label: 'LinkedIn', color: 'bg-blue-600' },
  { id: 'gmail', label: 'Gmail', color: 'bg-red-500' },
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

  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState('whatsapp');
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});
  const [savingPrompt, setSavingPrompt] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingKb, setSavingKb] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // New prompt form
  const [showNewPrompt, setShowNewPrompt] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptText, setNewPromptText] = useState('');
  const [creatingPrompt, setCreatingPrompt] = useState(false);

  // Load data on mount
  useEffect(() => {
    Promise.all([fetchPrompts(), fetchChatSettings()])
      .then(([p, s]) => {
        setPrompts(p);
        setChatSettings(s);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredPrompts = prompts.filter((p) => (p.channel || 'whatsapp') === activeChannel);

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

  // ── Campaign Settings save ───────────────────────────────────

  const handleSaveCampaign = useCallback(async () => {
    setSavingSettings(true);
    const ok = await updateChatSettings({ campaign_frequency: chatSettings.campaign_frequency });
    showToast(ok ? 'Campaign settings saved' : 'Failed to save', ok ? 'success' : 'error');
    setSavingSettings(false);
  }, [chatSettings.campaign_frequency, showToast]);

  // ── Render ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
                        <ToggleRight className="h-5 w-5 text-green-500" />
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
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {creatingPrompt ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowNewPrompt(false);
                    setNewPromptName('');
                    setNewPromptText('');
                  }}
                  className="px-4 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <span className="text-[10px] text-gray-400 ml-auto">
                  Channel: {CHANNELS.find((c) => c.id === activeChannel)?.label}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: Knowledge Base ─────────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Knowledge Base</h2>
          </div>
          <p className="text-sm text-gray-500">
            This content is injected into all AI conversations as context. Add company info, FAQs, product details, etc.
          </p>
        </div>
        <div className="p-6">
          <textarea
            className="w-full h-48 p-3 text-sm border border-gray-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 bg-gray-50"
            value={chatSettings.knowledge_base}
            onChange={(e) =>
              setChatSettings((prev) => ({ ...prev, knowledge_base: e.target.value }))
            }
            placeholder="Enter knowledge base content here...&#10;&#10;Example:&#10;- Company name: Acme Corp&#10;- Products: Widget A, Widget B&#10;- Support hours: 9am-5pm EST"
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={handleSaveKb}
              disabled={savingKb}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {savingKb ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Knowledge Base
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 3: Campaign Settings ──────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-5 w-5 text-orange-600" />
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
                <ToggleRight className="h-6 w-6 text-green-500" />
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
              className="w-32 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
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
              className="w-32 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveCampaign}
              disabled={savingSettings}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50 transition-colors"
            >
              {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Campaign Settings
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
