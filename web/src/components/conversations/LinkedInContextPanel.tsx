'use client';

/**
 * LinkedIn Context Panel — right-rail companion to the LinkedIn chat view.
 *
 * Mirrors the WhatsApp ConversationContextPanel but is scoped to what the
 * LinkedIn backend currently supports:
 *   - Profile (name, headline, LinkedIn URL, avatar)
 *   - Connection status & metadata
 *   - Labels (wired: GET/POST/DELETE /conversations/:id/labels)
 *   - Notes (wired: GET/POST /conversations/:id/notes)
 *   - AI Chat Agent toggle (wired: /api/social-integration/linkedin/automation-settings)
 *   - Assignment + Internal tabs (placeholder; backend assignment endpoint
 *     for LinkedIn channel still needs wiring)
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X, Linkedin, ExternalLink, Tag, Plus, Trash2, Check, Loader2,
  StickyNote, UserCheck, Sparkles, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

type ConnectionStatus = 'pending' | 'accepted' | 'active';

export interface LinkedInPanelContact {
  id: string;
  name: string;
  avatar?: string | null;
  headline?: string | null;
}

export interface LinkedInPanelConversation {
  id: string;
  connection_status: ConnectionStatus;
  campaign_id: string | null;
  lead_id: string | null;
  lead_linkedin: string | null;
  contact: LinkedInPanelContact;
  unread_count?: number;
  last_message_time?: string | null;
}

interface LinkedInLabel {
  id: string;
  name: string;
  color?: string;
}

interface LinkedInNote {
  id: string;
  content: string;
  created_at: string;
  author_name?: string | null;
}

const API_BASE = '/api/linkedin-conversations';

// ─── Avatar (uses our same-origin proxy for LinkedIn CDN images) ──────────────

function toProxiedAvatarUrl(raw?: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith('/') || raw.startsWith('data:') || raw.startsWith('blob:')) return raw;
  try {
    const u = new URL(raw);
    if (
      /\.licdn\.com$/.test(u.hostname) ||
      /\.linkedin\.com$/.test(u.hostname) ||
      /\.unipile\.com$/.test(u.hostname) ||
      u.hostname === 'static.licdn.com'
    ) {
      return `/api/proxy-image?url=${encodeURIComponent(raw)}`;
    }
    return raw;
  } catch {
    return null;
  }
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface Props {
  conversation: LinkedInPanelConversation;
  onClose: () => void;
}

export function LinkedInContextPanel({ conversation, onClose }: Props) {
  const { contact, connection_status, campaign_id, lead_id, lead_linkedin } = conversation;
  const proxied = toProxiedAvatarUrl(contact.avatar);

  // ── Tab state ───────────────────────────────────────────────────────────
  const [tab, setTab] = useState<'assignment' | 'notes' | 'internal'>('assignment');

  // ── Labels ──────────────────────────────────────────────────────────────
  const [labels, setLabels] = useState<LinkedInLabel[]>([]);
  const [allLabels, setAllLabels] = useState<LinkedInLabel[]>([]);
  const [labelLoading, setLabelLoading] = useState(false);
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');

  const loadLabels = useCallback(async () => {
    try {
      setLabelLoading(true);
      const [convRes, allRes] = await Promise.all([
        fetch(`${API_BASE}/conversations/${conversation.id}/labels`),
        fetch(`${API_BASE}/labels`),
      ]);
      const convData = await convRes.json().catch(() => ({}));
      const allData  = await allRes.json().catch(() => ({}));
      setLabels(convData?.data || convData?.labels || []);
      setAllLabels(allData?.data || allData?.labels || []);
    } catch { /* non-fatal */ } finally { setLabelLoading(false); }
  }, [conversation.id]);

  useEffect(() => { loadLabels(); }, [loadLabels]);

  const addLabel = async (labelId: string) => {
    try {
      await fetch(`${API_BASE}/conversations/${conversation.id}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label_id: labelId }),
      });
      const matched = allLabels.find(l => l.id === labelId);
      if (matched) setLabels(prev => [...prev, matched]);
    } catch { /* non-fatal */ }
  };

  const removeLabel = async (labelId: string) => {
    try {
      await fetch(`${API_BASE}/conversations/${conversation.id}/labels/${labelId}`, {
        method: 'DELETE',
      });
      setLabels(prev => prev.filter(l => l.id !== labelId));
    } catch { /* non-fatal */ }
  };

  const createLabel = async () => {
    const name = newLabelName.trim();
    if (!name) return;
    try {
      const resp = await fetch(`${API_BASE}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await resp.json().catch(() => ({}));
      if (data?.success && data?.data) {
        setAllLabels(prev => [...prev, data.data]);
        addLabel(data.data.id);
      }
    } catch { /* non-fatal */ }
    setNewLabelName('');
    setShowLabelInput(false);
  };

  // ── Notes ───────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState<LinkedInNote[]>([]);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const loadNotes = useCallback(async () => {
    try {
      const resp = await fetch(`${API_BASE}/conversations/${conversation.id}/notes`);
      const data = await resp.json().catch(() => ({}));
      setNotes(data?.data || data?.notes || []);
    } catch { /* non-fatal */ }
  }, [conversation.id]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const addNote = async () => {
    const content = noteText.trim();
    if (!content) return;
    setSavingNote(true);
    try {
      const resp = await fetch(`${API_BASE}/conversations/${conversation.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await resp.json().catch(() => ({}));
      if (data?.success && data?.data) {
        setNotes(prev => [data.data, ...prev]);
      }
      setNoteText('');
    } catch { /* non-fatal */ } finally { setSavingNote(false); }
  };

  // ── AI Chat Agent toggle (tenant-wide automation flag) ──────────────────
  const [agentEnabled, setAgentEnabled] = useState<boolean | null>(null);
  const [agentSaving, setAgentSaving] = useState(false);

  useEffect(() => {
    fetch('/api/social-integration/linkedin/automation-settings')
      .then(r => r.json())
      .then(d => setAgentEnabled(d?.success ? !!d.data?.ai_agent_enabled : false))
      .catch(() => setAgentEnabled(false));
  }, []);

  const toggleAgent = async () => {
    if (agentEnabled === null) return;
    const next = !agentEnabled;
    setAgentSaving(true);
    setAgentEnabled(next);   // optimistic
    try {
      // Read current values then PUT — backend expects all flags
      const cur = await fetch('/api/social-integration/linkedin/automation-settings').then(r => r.json()).catch(() => ({}));
      const data = cur?.data || {};
      await fetch('/api/social-integration/linkedin/automation-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auto_like_posts:    !!data.auto_like_posts,
          auto_comment_posts: !!data.auto_comment_posts,
          ai_agent_enabled:   next,
        }),
      });
    } catch {
      setAgentEnabled(!next); // revert on error
    } finally {
      setAgentSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  const headlineDisplay = contact.headline?.replace(/\s+/g, ' ').trim();

  return (
    <div className="flex flex-col h-full bg-white border-l border-border w-[340px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <h3 className="text-sm font-semibold text-slate-800">Contact Details</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile */}
        <div className="flex flex-col items-center px-4 pt-6 pb-4 border-b border-border">
          <div className="relative">
            {proxied ? (
              <img
                src={proxied}
                alt={contact.name}
                className="w-20 h-20 rounded-full object-cover bg-blue-100"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-xl">
                {contact.name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'}
              </div>
            )}
            {/* LinkedIn ring */}
            <span className="absolute -bottom-1 -right-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#0A66C2] ring-2 ring-white">
              <Linkedin className="w-3.5 h-3.5 text-white" />
            </span>
          </div>
          <p className="mt-3 text-base font-semibold text-slate-900 text-center">{contact.name}</p>
          {headlineDisplay && (
            <p className="mt-0.5 text-xs text-slate-500 text-center line-clamp-2 max-w-[260px]">
              {headlineDisplay}
            </p>
          )}
          {lead_linkedin && (
            <a
              href={lead_linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline truncate max-w-[260px]"
            >
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">View LinkedIn profile</span>
            </a>
          )}
        </div>

        {/* Labels */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Labels</p>
            <Button
              variant="ghost" size="icon" className="h-6 w-6"
              onClick={() => setShowLabelInput(s => !s)}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>

          {labels.length === 0 && !labelLoading && (
            <p className="text-xs text-slate-400">No labels assigned</p>
          )}

          {labelLoading && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
          )}

          <div className="flex flex-wrap gap-1.5">
            {labels.map(l => (
              <span
                key={l.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full border"
                style={{
                  backgroundColor: l.color ? `${l.color}15` : '#eef2ff',
                  borderColor: l.color || '#c7d2fe',
                  color: l.color || '#4338ca',
                }}
              >
                <Tag className="w-3 h-3" />
                {l.name}
                <button
                  onClick={() => removeLabel(l.id)}
                  className="ml-0.5 hover:opacity-70"
                  title="Remove label"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {showLabelInput && (
            <div className="mt-3 space-y-2">
              {/* Existing labels not yet assigned */}
              {allLabels.filter(l => !labels.some(x => x.id === l.id)).length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase">Add existing</p>
                  <div className="flex flex-wrap gap-1">
                    {allLabels.filter(l => !labels.some(x => x.id === l.id)).map(l => (
                      <button
                        key={l.id}
                        onClick={() => addLabel(l.id)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600"
                      >
                        <Plus className="w-3 h-3" />
                        {l.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-1">
                <Input
                  value={newLabelName}
                  onChange={e => setNewLabelName(e.target.value)}
                  placeholder="New label name"
                  className="h-7 text-xs"
                  onKeyDown={e => e.key === 'Enter' && createLabel()}
                />
                <Button size="sm" className="h-7 text-xs" onClick={createLabel} disabled={!newLabelName.trim()}>
                  <Check className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="px-4 py-4 border-b border-border space-y-2">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase mb-2">Metadata</p>
          <Row label="Status" value={
            <span className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
              connection_status === 'active'   ? 'bg-emerald-50 text-emerald-700' :
              connection_status === 'accepted' ? 'bg-amber-50 text-amber-700' :
                                                  'bg-slate-100 text-slate-600'
            )}>
              {connection_status === 'accepted' ? 'Connected' : connection_status === 'active' ? 'Active' : 'Pending'}
            </span>
          } />
          <Row label="Channel" value="LinkedIn" />
          {campaign_id && (
            <Row label="Campaign" value={
              <a
                href={`/campaigns/${campaign_id}/analytics/leads`}
                className="text-blue-600 hover:underline truncate max-w-[160px] inline-block"
                title={campaign_id}
              >
                {campaign_id.slice(0, 8)}…
              </a>
            } />
          )}
          {conversation.last_message_time && (
            <Row label="Last activity" value={
              formatDistanceToNow(new Date(conversation.last_message_time), { addSuffix: true })
            } />
          )}
        </div>

        {/* AI Chat Agent toggle */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800">AI Chat Agent</p>
                <p className="text-[10px] text-slate-500 truncate">
                  Auto-replies to inbound LinkedIn DMs
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!agentEnabled}
              onClick={toggleAgent}
              disabled={agentEnabled === null || agentSaving}
              className={cn(
                'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors',
                agentEnabled ? 'bg-blue-600' : 'bg-slate-300',
                agentSaving && 'opacity-60'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 mt-0.5 ml-0.5 rounded-full bg-white transition-transform',
                  agentEnabled && 'translate-x-4'
                )}
              />
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-400">
            Tenant-wide setting (Settings → Chat → LinkedIn).
          </p>
        </div>

        {/* Tabs: Assignment | Notes | Internal */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="px-4 py-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="assignment" className="text-xs">
              <UserCheck className="w-3 h-3 mr-1" />
              Assignment
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-xs">
              <StickyNote className="w-3 h-3 mr-1" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="internal" className="text-xs">
              Internal
            </TabsTrigger>
          </TabsList>

          {/* Assignment */}
          <TabsContent value="assignment" className="pt-3">
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-800">
                  <p className="font-semibold mb-0.5">Assignment for LinkedIn — coming soon</p>
                  <p className="text-amber-700">
                    Per-conversation assignment for LinkedIn requires the
                    <code className="mx-1 px-1 rounded bg-amber-100">/api/threads/…?channel=linkedin</code>
                    endpoint. Available now for WhatsApp; LinkedIn parity is queued.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Notes */}
          <TabsContent value="notes" className="pt-3 space-y-3">
            <div className="space-y-2">
              <Textarea
                placeholder="Add an internal note for this lead…"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                rows={3}
                className="text-xs resize-none"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={addNote}
                  disabled={savingNote || !noteText.trim()}
                >
                  {savingNote && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  Save note
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {notes.length === 0 && (
                <p className="text-[11px] text-slate-400 text-center py-2">No notes yet.</p>
              )}
              {notes.map(n => (
                <div key={n.id} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{n.content}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {n.author_name ? `${n.author_name} · ` : ''}
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Internal comments — placeholder */}
          <TabsContent value="internal" className="pt-3">
            <p className="text-[11px] text-slate-400 text-center py-3">
              Internal comments coming soon.
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-700 text-right">{value}</span>
    </div>
  );
}
