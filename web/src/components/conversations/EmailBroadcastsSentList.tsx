'use client';

/**
 * EmailBroadcastsSentList - Gmail-styled Sent folder powered by LAD-Email-Comms.
 *
 * Replaces the side-by-side compose+list panel with a single-column list of
 * rows that match the existing EmailChannelView's Gmail aesthetic:
 *
 *   [avatar] [sender]  [To: <recipients>]  [subject] · [preview]   [time] [status]
 *
 * Hovering the "To: …" pill reveals a tooltip listing every recipient email
 * in that broadcast (lazy-fetched on first open).
 *
 * Compose lives in a dialog triggered from the header button. The send path is
 * the same `useSendBroadcast` mutation used by the (now deprecated) inline
 * EmailBroadcastPanel - once this view ships, the broadcast-test debug route
 * and the panel can be removed.
 */
import { useMemo, useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import DragDropEmailEditor from '@/components/templates/DragDropEmailEditor';
import { Loader2, Pencil, Inbox, AlertCircle, Users, X } from 'lucide-react';

import {
  BroadcastRunStats,
  BroadcastRunSummary,
  ConnectedAccount,
  EmailChannel,
  useBroadcastRecipients,
  useBroadcastRun,
  useBroadcastRuns,
  useBroadcastStats,
  useConnectedEmailAccounts,
  useEmailGroups,
  useSendBroadcast,
} from '@/features/conversations/useEmailBroadcast';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ── Display helpers ────────────────────────────────────────────────────────

function avatarInitials(email: string): string {
  const left = email.split('@')[0] || email;
  const parts = left.split(/[.\-_]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return left.slice(0, 2).toUpperCase();
}

// Deterministic gradient per sender - matches the rest of EmailChannelView's vibe.
const AVATAR_GRADIENTS = [
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-blue-600',
  'from-fuchsia-500 to-pink-600',
];

function avatarGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, sameYear
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' });
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function statusBadgeVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
      return 'default';
    case 'queued':
    case 'running':
      return 'secondary';
    case 'failed':
      return 'destructive';
    case 'paused_quota_exceeded':
    case 'cancelled':
      return 'outline';
    default:
      return 'outline';
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'running':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
    case 'queued':
      return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/50';
    default:
      return '';
  }
}

function statusLabel(status: string): string {
  return (
    {
      queued: 'Queued',
      running: 'Sending',
      completed: 'Sent',
      failed: 'Failed',
      paused_quota_exceeded: 'Paused',
      cancelled: 'Cancelled',
    }[status] ?? status
  );
}

// ── Recipients pill (hover-tooltip with lazy fetch) ────────────────────────

function RecipientsPill({ run }: { run: BroadcastRunSummary }) {
  // Open the tooltip → fetch (`enabled` flips true). Subsequent hovers reuse
  // the cached result via react-query's staleTime.
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = useBroadcastRecipients(run.id, open);

  // Inline label: keep it scannable. Single recipient → just the email.
  // Multiple → "(N recipients)" so the row doesn't get overwhelmed by a long
  // comma-separated list. Real groups land in Phase 2 - synthesize a name
  // here using metadata.group_name if/when callers start sending it.
  const inlineLabel = useMemo(() => {
    if (run.recipient_count === 1) {
      // We don't have the recipient_email in the summary; show a generic
      // single-recipient hint and let the tooltip surface the address.
      return '1 recipient';
    }
    return `${run.recipient_count} recipients`;
  }, [run.recipient_count]);

  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-[#f6f8fc] dark:bg-[#3c4043] text-[11px] text-[#444746] dark:text-[#9aa0a6] cursor-default"
            aria-label={`To ${inlineLabel}`}
          >
            <Users className="h-3 w-3 opacity-70" />
            <span>{inlineLabel}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="start"
          className="max-w-sm max-h-72 overflow-auto p-2 text-xs"
        >
          {isLoading ? (
            <div className="flex items-center gap-2 px-1 py-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading recipients…
            </div>
          ) : error ? (
            <div className="text-destructive">Failed to load recipients.</div>
          ) : !data || data.recipients.length === 0 ? (
            <div className="text-muted-foreground">No recipients.</div>
          ) : (
            <ul className="space-y-1">
              {data.recipients.map((r) => (
                <li key={r.id} className="flex items-center gap-2">
                  <span
                    className={
                      r.status === 'sent'
                        ? 'h-1.5 w-1.5 rounded-full bg-emerald-500'
                        : r.status === 'failed'
                          ? 'h-1.5 w-1.5 rounded-full bg-red-500'
                          : r.status === 'skipped_unsubscribed'
                            ? 'h-1.5 w-1.5 rounded-full bg-amber-500'
                            : 'h-1.5 w-1.5 rounded-full bg-slate-300'
                    }
                    aria-hidden
                  />
                  <span className="font-medium">
                    {r.recipient_name ? `${r.recipient_name} · ` : ''}
                    {r.recipient_email}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── One Gmail-styled row ────────────────────────────────────────────────────

function BroadcastRow({
  run,
  onClick,
}: {
  run: BroadcastRunSummary;
  onClick: () => void;
}) {
  return (
    <div
      role="listitem"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`Open broadcast: ${run.subject || '(no subject)'}`}
      className="group border-b border-[#f0f0f0] dark:border-white/5 text-sm hover:shadow-[inset_1px_0_0_#dadce0,inset_-1px_0_0_#dadce0,0_1px_2px_0_rgba(60,64,67,.3),0_1px_3px_1px_rgba(60,64,67,.15)] dark:hover:shadow-[inset_1px_0_0_rgba(255,255,255,0.06),inset_-1px_0_0_rgba(255,255,255,0.06),0_1px_2px_0_rgba(0,0,0,.4)] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* ── Desktop view (>= sm) - Original untouched layout ── */}
      <div className="hidden sm:flex items-center gap-3 px-4 py-2">
        {/* Avatar - sender initials */}
        <div
          className={`h-9 w-9 rounded-full bg-gradient-to-br ${avatarGradient(
            run.from_email,
          )} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}
          aria-hidden
        >
          {avatarInitials(run.from_email)}
        </div>

        {/* Sender + recipients pill */}
        <div className="min-w-0 w-44 flex flex-col">
          <span className="truncate font-medium text-[#202124] dark:text-[#e8eaed]">
            {run.from_email}
          </span>
          <span className="mt-0.5">
            <RecipientsPill run={run} />
          </span>
        </div>

        {/* Subject + counts */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="truncate text-[#202124] dark:text-[#e8eaed]">
            {run.subject || '(no subject)'}
          </span>
          <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6] flex-shrink-0">
            · {run.sent_count}/{run.recipient_count} sent
            {run.failed_count > 0 && (
              <span className="text-destructive ml-1">· {run.failed_count} failed</span>
            )}
            {run.unsubscribed_skipped_count > 0 && (
              <span className="ml-1">· {run.unsubscribed_skipped_count} opted out</span>
            )}
          </span>
        </div>

        {/* Time + status */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge
            variant={statusBadgeVariant(run.status)}
            className={statusBadgeClass(run.status)}
          >
            {statusLabel(run.status)}
          </Badge>
          <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6] tabular-nums w-16 text-right">
            {relativeTime(run.created_at)}
          </span>
        </div>
      </div>

      {/* ── Mobile view (< sm) - 2-line compact responsive layout ── */}
      <div className="flex sm:hidden items-start gap-3 px-3 py-2.5">
        {/* Avatar */}
        <div
          className={`h-9 w-9 rounded-full bg-gradient-to-br ${avatarGradient(
            run.from_email,
          )} flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mt-0.5`}
          aria-hidden
        >
          {avatarInitials(run.from_email)}
        </div>

        {/* Content container */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          {/* Line 1: Sender (left) & Badge + Date (right) */}
          <div className="flex items-center justify-between min-w-0">
            <span className="truncate font-medium text-[#202124] dark:text-[#e8eaed] min-w-0 flex-1">
              {run.from_email}
            </span>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
              <Badge
                variant={statusBadgeVariant(run.status)}
                className={statusBadgeClass(run.status)}
              >
                {statusLabel(run.status)}
              </Badge>
              <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6] tabular-nums">
                {relativeTime(run.created_at)}
              </span>
            </div>
          </div>

          {/* Line 2: Subject (left) & Recipients pill + Sent counts (right) */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="truncate text-[#202124] dark:text-[#e8eaed] min-w-0 flex-1">
              {run.subject || '(no subject)'}
            </span>
            <div className="text-xs text-[#5f6368] dark:text-[#9aa0a6] flex-shrink-0 flex items-center gap-1.5 ml-auto">
              <span className="flex-shrink-0">
                <RecipientsPill run={run} />
              </span>
              <span className="flex-shrink-0 whitespace-nowrap">
                · {run.sent_count}/{run.recipient_count} sent
                {run.failed_count > 0 && (
                  <span className="text-destructive ml-1">· {run.failed_count} failed</span>
                )}
                {run.unsubscribed_skipped_count > 0 && (
                  <span className="ml-1">· {run.unsubscribed_skipped_count} opted out</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Compose dialog ─────────────────────────────────────────────────────────

function parseRecipients(raw: string): { email: string; name?: string }[] {
  const tokens = raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const out: { email: string; name?: string }[] = [];
  for (const tok of tokens) {
    const m = tok.match(/^(.+?)\s*<([^<>]+@[^<>]+)>$/);
    if (m) {
      out.push({ name: m[1].trim().replace(/^["']|["']$/g, ''), email: m[2].trim() });
    } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tok)) {
      out.push({ email: tok });
    }
  }
  return out;
}

function ComposeBroadcastDialog({
  open,
  onOpenChange,
  accounts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: ConnectedAccount[];
}) {
  const send = useSendBroadcast();
  const activeAccounts = useMemo(
    () => accounts.filter((a) => a.status === 'active'),
    [accounts],
  );

  // Recipient source - 'manual' (paste-a-list) or 'group' (pick a saved group).
  // The backend enforces exactly-one; the UI mirrors that with a tab-style
  // toggle so it's clear which one will be sent.
  const [mode, setMode] = useState<'manual' | 'group'>('manual');

  const [accountId, setAccountId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientsRaw, setRecipientsRaw] = useState('');
  const [groupId, setGroupId] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Saved templates → power the "Use template" picker. The drag-drop editor
  // only reads htmlContent on mount, so we bump editorKey to remount it (and
  // re-parse the blocks) whenever a template is loaded.
  const [templates, setTemplates] = useState<{ id: string; name: string; subject?: string; body_html: string | null; body?: string }[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/campaigns/email-templates?is_active=true', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.templates ?? data.data ?? []);
        if (!cancelled) setTemplates(list);
      } catch { /* non-fatal - picker just stays empty */ }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    setBody(tpl.body_html ?? tpl.body ?? '');
    if (!subject.trim() && tpl.subject) setSubject(tpl.subject);
    setEditorKey((k) => k + 1); // force the editor to re-init from the new HTML
  };

  const recipients = useMemo(() => parseRecipients(recipientsRaw), [recipientsRaw]);

  // Map account provider → group channel so the group picker only shows
  // groups usable with the currently-selected From account.
  const selectedAccount = useMemo(
    () => activeAccounts.find((a) => a.id === accountId) ?? null,
    [accountId, activeAccounts],
  );
  const channelForGroups: EmailChannel | undefined =
    selectedAccount?.provider === 'google'
      ? 'gmail'
      : selectedAccount?.provider === 'microsoft'
        ? 'outlook'
        : undefined;
  const groupsQuery = useEmailGroups(channelForGroups);
  const groupsList = groupsQuery.data?.groups ?? [];
  const selectedGroup = useMemo(
    () => groupsList.find((g) => g.id === groupId) ?? null,
    [groupId, groupsList],
  );

  // When the account (and therefore channel) changes, clear the group
  // selection so we don't send to a group meant for a different channel.
  useMemo(() => {
    if (groupId && !groupsList.some((g) => g.id === groupId)) {
      setGroupId('');
    }
  }, [groupId, groupsList]);

  const reset = () => {
    setMode('manual');
    setAccountId('');
    setSubject('');
    setBody('');
    setRecipientsRaw('');
    setGroupId('');
    setTemplateId('');
    setEditorKey((k) => k + 1);
    setError(null);
  };

  const handleSend = async () => {
    setError(null);
    if (!accountId) return setError('Pick a sender account.');
    if (!subject.trim()) return setError('Subject is required.');
    if (!body.trim()) return setError('Body cannot be empty.');
    if (mode === 'manual' && recipients.length === 0)
      return setError('Add at least one recipient.');
    if (mode === 'group' && !groupId)
      return setError('Pick a group to send to.');
    if (mode === 'group' && selectedGroup && selectedGroup.member_count === 0)
      return setError(
        `Group "${selectedGroup.name}" has no members. Add contacts before sending.`,
      );

    try {
      await send.mutateAsync({
        from_email_account_id: accountId,
        subject: subject.trim(),
        body_html: body,
        ...(templateId ? { template_id: templateId } : {}),
        ...(mode === 'group' ? { group_id: groupId } : { recipients }),
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue broadcast.');
    }
  };

  // How many recipients will actually go? Used to drive the send-button label.
  const sendCount =
    mode === 'group'
      ? (selectedGroup?.member_count ?? 0)
      : recipients.length;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-zinc-800 focus:outline-none focus-visible:ring-0 focus:ring-0">
        <DialogHeader className="flex-col items-start lg:flex-row lg:items-center gap-1 lg:gap-4 mb-6 pr-10 lg:pr-0 pt-6">
          <DialogTitle>New broadcast</DialogTitle>
          <DialogDescription className="text-[13px] sm:text-sm">
            Send the same message to many recipients via a connected Gmail or Outlook account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-4 sm:px-8 pb-6">
          <div>
            <label className="text-sm font-medium block mb-1.5">From</label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="border-gray-200 dark:border-input">
                <SelectValue placeholder="Pick a connected account" />
              </SelectTrigger>
              <SelectContent>
                {activeAccounts.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No active accounts - connect Gmail / Outlook in Settings.
                  </div>
                ) : (
                  activeAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.email} {a.display_name ? `· ${a.display_name}` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">Subject</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Welcome to Mr LAD" className="border-gray-200 dark:border-input" />
          </div>

          {/* Recipients - tab toggle between manual list and saved group */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Recipients</label>
              <div
                role="tablist"
                aria-label="Recipient source"
                className="inline-flex items-center rounded-md border border-gray-200 dark:border-input p-0.5 text-xs"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'manual'}
                  onClick={() => setMode('manual')}
                  className={`px-2 py-1 rounded transition-colors ${
                    mode === 'manual'
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-muted-foreground hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-300'
                  }`}
                >
                  Manual List
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'group'}
                  onClick={() => setMode('group')}
                  className={`px-2 py-1 rounded transition-colors ${
                    mode === 'group'
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-muted-foreground hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-300'
                  }`}
                >
                  From Group
                </button>
              </div>
            </div>

            {mode === 'manual' ? (
              <>
                <Textarea
                  value={recipientsRaw}
                  onChange={(e) => setRecipientsRaw(e.target.value)}
                  rows={3}
                  placeholder={`alice@example.com, "Bob Smith" <bob@example.com>\nor one per line`}
                  className="border-gray-200 dark:border-input"
                />
                <p className="mt-3 text-xs text-muted-foreground">
                  {recipients.length} parsed. Names in{' '}
                  <code>{'"Name" <email>'}</code> format are picked up too.
                </p>
              </>
            ) : (
              <>
                <Select value={groupId} onValueChange={setGroupId}>
                  <SelectTrigger className="border-gray-200 dark:border-input">
                    <SelectValue
                      placeholder={
                        !accountId
                          ? 'Pick a sender account first'
                          : groupsQuery.isLoading
                            ? 'Loading groups…'
                            : groupsList.length === 0
                              ? 'No groups for this channel yet'
                              : 'Pick a group'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {groupsList.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Create a group in the sidebar first, then add contacts to it.
                      </div>
                    ) : (
                      groupsList.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                          <span className="text-muted-foreground">
                            {' '}
                            · {g.member_count} member
                            {g.member_count === 1 ? '' : 's'}
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedGroup && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Sending to{' '}
                    <span className="font-medium">{selectedGroup.name}</span>{' '}
                    ({selectedGroup.member_count} recipient
                    {selectedGroup.member_count === 1 ? '' : 's'}). Add or
                    remove members from the sidebar.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Start from a saved template - loads its HTML into the editor below */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Template</label>
            <Select value={templateId} onValueChange={applyTemplate}>
              <SelectTrigger className="border-gray-200 dark:border-input">
                <SelectValue placeholder={templates.length ? 'Start from a saved template (optional)' : 'No saved templates yet'} />
              </SelectTrigger>
              <SelectContent>
                {templates.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Create templates under Conversations → Templates.
                  </div>
                ) : (
                  templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">Body</label>
            <div className="rounded-lg border border-gray-200 dark:border-input bg-zinc-100 dark:bg-black/20 p-3">
              <DragDropEmailEditor
                key={editorKey}
                htmlContent={body}
                subject={subject}
                onContentChange={setBody}
              />
            </div>
            <p className="mt-3.5 text-xs text-muted-foreground">
              Build the email with blocks (header, image, button, signature…). Use{' '}
              <code>{'{{first_name}}'}</code> or <code>{'{first_name}'}</code> to personalise -
              unknown placeholders are removed before sending.
            </p>
          </div>

          {(() => {
            // Mirrors LAD-Email-Comms quota defaults - warn before the
            // orchestrator has to pace/pause a too-big send.
            const safeDaily: Record<string, number> = { google: 400, microsoft: 250, custom_smtp: 1000 };
            const cap = selectedAccount ? (safeDaily[selectedAccount.provider] ?? 1000) : null;
            return cap !== null && sendCount > cap ? (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {sendCount} recipients exceeds the safe daily volume for this account
                (~{cap}/day). Sending is paced and may spread across days to protect your
                sender reputation - for regular large sends, connect an email service
                (Brevo / Amazon SES) via Custom SMTP.
              </p>
            ) : null;
          })()}

          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={send.isPending}>
            {send.isPending ? 'Queuing…' : `Send to ${sendCount}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Detail dialog (click a row to open the rendered email) ─────────────────

/** "2h 14m" / "34m" / "45s" from seconds. */
function formatDuration(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '-';
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;

function BroadcastPerformancePanel({ stats }: { stats: BroadcastRunStats }) {
  const cards: Array<{ label: string; value: string; sub?: string }> = [
    { label: 'Delivered', value: `${stats.sent_count}/${stats.recipient_count}`, sub: pct(stats.delivery_rate) },
    { label: 'Failed', value: String(stats.failed_count) },
    {
      label: 'Opened',
      value: `${stats.unique_opens}`,
      sub: `${pct(stats.open_rate)} · ${stats.total_opens} total opens`,
    },
    { label: 'Not opened', value: String(stats.not_opened_count) },
    {
      label: 'Clicked',
      value: String(stats.unique_clickers),
      sub: `${pct(stats.click_rate)} · ${stats.total_clicks} total clicks`,
    },
    { label: 'Repeat openers', value: String(stats.repeat_openers_count), sub: 'opened 2+ times' },
    { label: 'Avg time to open', value: formatDuration(stats.avg_seconds_to_first_open) },
    { label: 'Median time to open', value: formatDuration(stats.median_seconds_to_first_open) },
  ];

  return (
    <div className="mb-6">
      <div className="text-xs font-semibold uppercase tracking-wide text-[#5f6368] dark:text-[#9aa0a6] mb-2">
        Performance
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {cards.map(({ label, value, sub }) => (
          <div
            key={label}
            className="p-3 rounded-lg border border-[#e0e0e0] dark:border-[#3c4043] bg-[#fafafa] dark:bg-white/5"
          >
            <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">{label}</p>
            <p className="text-lg font-semibold text-[#202124] dark:text-[#e8eaed] leading-tight">{value}</p>
            {sub && <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">{sub}</p>}
          </div>
        ))}
      </div>

      {stats.proxy_opens > 0 && (
        <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] mb-3">
          {stats.proxy_opens} open{stats.proxy_opens === 1 ? '' : 's'} came from mail-client
          privacy proxies (Apple/Gmail prefetch) - treat open counts as an upper bound.
        </p>
      )}

      {stats.repeat_openers.length > 0 && (
        <details className="mb-2 rounded-lg border border-[#e0e0e0] dark:border-[#3c4043]">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-[#202124] dark:text-[#e8eaed]">
            Repeat openers ({stats.repeat_openers_count}) - most engaged first
          </summary>
          <div className="px-3 pb-2 divide-y divide-[#f0f0f0] dark:divide-white/5">
            {stats.repeat_openers.map((o) => (
              <div key={o.email} className="py-1.5 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <span className="text-[#202124] dark:text-[#e8eaed] truncate">{o.name || o.email}</span>
                  {o.name && <span className="ml-2 text-xs text-[#5f6368] dark:text-[#9aa0a6]">{o.email}</span>}
                </div>
                <span className="flex-shrink-0 text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                  {o.opens}× · last {relativeTime(o.last_open_at)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {stats.top_links.length > 0 && (
        <details className="mb-2 rounded-lg border border-[#e0e0e0] dark:border-[#3c4043]">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-[#202124] dark:text-[#e8eaed]">
            Top links ({stats.top_links.length})
          </summary>
          <div className="px-3 pb-2 divide-y divide-[#f0f0f0] dark:divide-white/5">
            {stats.top_links.map((l) => (
              <div key={l.url} className="py-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-[#202124] dark:text-[#e8eaed]" title={l.url}>{l.url}</span>
                <span className="flex-shrink-0 text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                  {l.clicks} click{l.clicks === 1 ? '' : 's'} · {l.unique_clickers} unique
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {stats.failures_by_code.length > 0 && (
        <details className="rounded-lg border border-red-200 dark:border-red-900">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300">
            Failures by cause
          </summary>
          <div className="px-3 pb-2 divide-y divide-red-100 dark:divide-red-900/40">
            {stats.failures_by_code.map((f) => (
              <div key={f.error_code} className="py-1.5 flex items-center justify-between text-sm">
                <span className="text-[#202124] dark:text-[#e8eaed]">{f.error_code}</span>
                <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">{f.count}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function BroadcastDetailDialog({
  runId,
  open,
  onOpenChange,
}: {
  runId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Detail hook auto-polls while non-terminal (queued/running/paused), so
  // the open dialog updates progress live without any extra wiring.
  const { data, isLoading, error } = useBroadcastRun(runId);
  // Recipients fetched eagerly while the dialog is open - feeds the "To" list.
  const recipients = useBroadcastRecipients(runId, open);
  // Engagement stats - refreshes every 30s while the dialog is open.
  const stats = useBroadcastStats(runId, open);

  const sanitizedHtml = useMemo(() => {
    if (!data?.body_html) return '';
    // DOMPurify is configured app-wide; here we just need a safe HTML render.
    return DOMPurify.sanitize(data.body_html, {
      USE_PROFILES: { html: true },
    });
  }, [data?.body_html]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        {/* Header - subject + status + close */}
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-[#f0f0f0] dark:border-white/5 flex-row items-start justify-between space-y-0">
          <div className="min-w-0 pr-4">
            <DialogTitle className="text-base font-semibold truncate">
              {isLoading ? 'Loading…' : data?.subject || '(no subject)'}
            </DialogTitle>
            {data && (
              <DialogDescription className="mt-1 flex items-center gap-2 text-xs">
                <Badge
                  variant={statusBadgeVariant(data.status)}
                  className={statusBadgeClass(data.status)}
                >
                  {statusLabel(data.status)}
                </Badge>
                <span>·</span>
                <span>
                  {data.sent_count}/{data.recipient_count} sent
                </span>
                {data.failed_count > 0 && (
                  <span className="text-destructive">
                    · {data.failed_count} failed
                  </span>
                )}
                {data.unsubscribed_skipped_count > 0 && (
                  <span>· {data.unsubscribed_skipped_count} opted out</span>
                )}
                <span>·</span>
                <span>{relativeTime(data.created_at)}</span>
              </DialogDescription>
            )}
          </div>
        </DialogHeader>

        {/* Sender + recipient strip */}
        {data && (
          <div className="px-6 py-3 border-b border-[#f0f0f0] dark:border-white/5 flex items-start gap-3 text-sm">
            <div
              className={`h-9 w-9 rounded-full bg-gradient-to-br ${avatarGradient(
                data.from_email,
              )} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}
              aria-hidden
            >
              {avatarInitials(data.from_email)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-[#202124] dark:text-[#e8eaed]">
                {data.from_email}
              </div>
              <div className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5 flex items-start gap-1">
                <span className="font-medium">To:</span>
                <span className="flex-1">
                  {recipients.isLoading ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> loading…
                    </span>
                  ) : recipients.data ? (
                    recipients.data.recipients
                      .map((r) =>
                        r.recipient_name
                          ? `"${r.recipient_name}" <${r.recipient_email}>`
                          : r.recipient_email,
                      )
                      .join(', ')
                  ) : (
                    `${data.recipient_count} recipient${
                      data.recipient_count === 1 ? '' : 's'
                    }`
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Body - sanitized HTML render */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-[#5f6368] dark:text-[#9aa0a6]" />
            </div>
          ) : error ? (
            <div className="text-destructive text-sm">
              {error instanceof Error
                ? error.message
                : 'Failed to load broadcast.'}
            </div>
          ) : (
            <>
              {data?.error_message && (
                <div className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-800 dark:text-red-200">
                  <div className="font-medium mb-0.5">Broadcast error</div>
                  <div>{data.error_message}</div>
                </div>
              )}

              {/* ── Performance ─────────────────────────────────────────── */}
              {stats.data && (
                <BroadcastPerformancePanel stats={stats.data} />
              )}

              <div className="text-xs font-semibold uppercase tracking-wide text-[#5f6368] dark:text-[#9aa0a6] mb-2">
                Message
              </div>
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-[#202124] dark:text-[#e8eaed]"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function EmailBroadcastsSentList() {
  const runs = useBroadcastRuns(50, 0);
  const accounts = useConnectedEmailAccounts();
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const accountsList = accounts.data ?? [];
  const list = runs.data?.runs ?? [];

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#f0f0f0] dark:border-white/5">
        <div className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">
          {runs.isLoading
            ? 'Loading…'
            : list.length === 0
              ? 'No broadcasts yet'
              : `${list.length} broadcast${list.length === 1 ? '' : 's'}`}
        </div>
        <Button size="sm" onClick={() => setComposeOpen(true)}>
          <Pencil className="h-3.5 w-3.5 mr-1.5" /> New broadcast
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto" role="list">
        {runs.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#5f6368] dark:text-[#9aa0a6]" />
          </div>
        ) : runs.error ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-destructive">
            <AlertCircle className="h-8 w-8 mb-3" />
            <div className="text-sm">
              {runs.error instanceof Error
                ? runs.error.message
                : 'Failed to load broadcasts.'}
            </div>
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="h-16 w-16 rounded-full bg-[#f6f8fc] dark:bg-[#3c4043] flex items-center justify-center mb-4">
              <Inbox className="h-8 w-8 text-[#5f6368] dark:text-[#9aa0a6]" />
            </div>
            <h3 className="font-semibold text-base text-[#202124] dark:text-[#e8eaed] mb-1">
              No broadcasts yet
            </h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] max-w-xs mb-5">
              Compose a new broadcast to send the same message to many recipients at once.
            </p>
            <Button onClick={() => setComposeOpen(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> New broadcast
            </Button>
          </div>
        ) : (
          list.map((r) => (
            <BroadcastRow
              key={r.id}
              run={r}
              onClick={() => setSelectedRunId(r.id)}
            />
          ))
        )}
      </div>

      <ComposeBroadcastDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        accounts={accountsList}
      />

      <BroadcastDetailDialog
        runId={selectedRunId}
        open={selectedRunId !== null}
        onOpenChange={(o) => {
          if (!o) setSelectedRunId(null);
        }}
      />
    </div>
  );
}
