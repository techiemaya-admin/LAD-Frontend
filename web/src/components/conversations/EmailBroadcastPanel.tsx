'use client';

/**
 * EmailBroadcastPanel — focused, minimal UI for sending and tracking
 * broadcasts via LAD-Email-Comms.
 *
 * Intentionally scoped narrow:
 *   * Compose form on the left (account picker, subject, html body, recipients paste)
 *   * Sent folder on the right (auto-refreshing list of runs + click-through to detail)
 *   * Detail drawer with live polling for not-yet-terminal broadcasts
 *
 * NOT covered here (deliberately deferred):
 *   * Group / contact list management (Phase 2 once email_groups CRUD lands)
 *   * Recipient CSV import (basic textarea-paste is enough for v1)
 *   * Rich-text body editor (raw HTML textarea is enough for v1)
 *   * AI-personalised body (Phase 2)
 *
 * Integration: render this component inside an EmailChannelView tab, or
 * mount it as its own /conversations/broadcast route. The hooks it uses
 * (useEmailBroadcast) are pure data-fetching — no global state needed.
 */
import { useMemo, useState } from 'react';

import {
  BroadcastRunSummary,
  ConnectedAccount,
  useBroadcastRun,
  useBroadcastRuns,
  useConnectedEmailAccounts,
  useSendBroadcast,
} from '@/features/conversations/useEmailBroadcast';

// Shadcn primitives the rest of the app uses.
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ── Helpers ─────────────────────────────────────────────────────────────────

function statusBadgeVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
      return 'default';
    case 'running':
    case 'queued':
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
      completed: 'Completed',
      failed: 'Failed',
      paused_quota_exceeded: 'Paused (quota)',
      cancelled: 'Cancelled',
    }[status] ?? status
  );
}

function parseRecipients(raw: string): { email: string; name?: string }[] {
  // Accept comma-, newline-, or semicolon-separated. Also accept
  //   "Name <a@b.com>" → {email, name}.
  const tokens = raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const out: { email: string; name?: string }[] = [];
  for (const tok of tokens) {
    const match = tok.match(/^(.+?)\s*<([^<>]+@[^<>]+)>$/);
    if (match) {
      out.push({ name: match[1].trim().replace(/^["']|["']$/g, ''), email: match[2].trim() });
    } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tok)) {
      out.push({ email: tok });
    }
  }
  return out;
}

// ── Subcomponents ───────────────────────────────────────────────────────────

function ComposeForm({
  accounts,
  onSubmit,
  isSubmitting,
}: {
  accounts: ConnectedAccount[];
  onSubmit: (payload: {
    from_email_account_id: string;
    subject: string;
    body_html: string;
    recipients: { email: string; name?: string }[];
  }) => Promise<void> | void;
  isSubmitting: boolean;
}) {
  const activeAccounts = useMemo(
    () => accounts.filter((a) => a.status === 'active'),
    [accounts],
  );

  const [accountId, setAccountId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [recipientsRaw, setRecipientsRaw] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recipients = useMemo(() => parseRecipients(recipientsRaw), [recipientsRaw]);

  const handleSubmit = async () => {
    setError(null);
    if (!accountId) {
      setError('Pick a sender account.');
      return;
    }
    if (!subject.trim()) {
      setError('Subject is required.');
      return;
    }
    if (!bodyHtml.trim()) {
      setError('Body cannot be empty.');
      return;
    }
    if (recipients.length === 0) {
      setError('Add at least one recipient.');
      return;
    }
    try {
      await onSubmit({
        from_email_account_id: accountId,
        subject: subject.trim(),
        body_html: bodyHtml,
        recipients,
      });
      // Reset on success
      setSubject('');
      setBodyHtml('');
      setRecipientsRaw('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue broadcast.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New broadcast</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-sm font-medium">From</label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a connected account" />
            </SelectTrigger>
            <SelectContent>
              {activeAccounts.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No active accounts — connect Gmail / Outlook in Settings.
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
          <label className="text-sm font-medium">Subject</label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Welcome to Mr LAD"
          />
        </div>

        <div>
          <label className="text-sm font-medium">
            Recipients{' '}
            <span className="text-muted-foreground">
              ({recipients.length} parsed)
            </span>
          </label>
          <Textarea
            value={recipientsRaw}
            onChange={(e) => setRecipientsRaw(e.target.value)}
            rows={3}
            placeholder={`alice@example.com, "Bob Smith" <bob@example.com>\nor one per line`}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Body (HTML)</label>
          <Textarea
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            rows={10}
            placeholder={`<p>Hi {{first_name}},</p><p>...</p>`}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Use <code>{'{{first_name}}'}</code> or <code>{'{first_name}'}</code>{' '}
            to personalise. Unknown placeholders are removed before sending.
          </p>
        </div>

        {error && <div className="text-sm text-destructive">{error}</div>}

        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Queuing…' : `Send to ${recipients.length}`}
        </Button>
      </CardContent>
    </Card>
  );
}

function SentList({
  runs,
  selectedId,
  onSelect,
}: {
  runs: BroadcastRunSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (runs.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4">
        No broadcasts yet. Send your first one from the form on the left.
      </div>
    );
  }
  return (
    <div className="divide-y">
      {runs.map((r) => {
        const isSelected = r.id === selectedId;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r.id)}
            className={`w-full text-left p-3 hover:bg-accent ${
              isSelected ? 'bg-accent' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="font-medium truncate pr-2">{r.subject}</div>
              <Badge
                variant={statusBadgeVariant(r.status)}
                className={statusBadgeClass(r.status)}
              >
                {statusLabel(r.status)}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {r.from_email} · {r.sent_count}/{r.recipient_count} sent
              {r.failed_count > 0 ? ` · ${r.failed_count} failed` : ''}
              {r.unsubscribed_skipped_count > 0
                ? ` · ${r.unsubscribed_skipped_count} opted out`
                : ''}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function RunDetail({ id }: { id: string }) {
  const { data, isLoading, error } = useBroadcastRun(id);
  if (isLoading) return <div className="p-4 text-sm">Loading…</div>;
  if (error)
    return (
      <div className="p-4 text-sm text-destructive">
        {error instanceof Error ? error.message : 'Failed to load run.'}
      </div>
    );
  if (!data) return null;

  const total = data.recipient_count || 1;
  const sentPct = Math.round((100 * data.sent_count) / total);
  const failedPct = Math.round((100 * data.failed_count) / total);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium truncate pr-2">{data.subject}</h3>
        <Badge
          variant={statusBadgeVariant(data.status)}
          className={statusBadgeClass(data.status)}
        >
          {statusLabel(data.status)}
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground">
        From {data.from_email} · created {new Date(data.created_at).toLocaleString()}
      </div>

      <div className="text-sm">
        {data.sent_count} / {data.recipient_count} sent ({sentPct}%)
        {data.failed_count > 0 && (
          <span className="text-destructive ml-2">
            · {data.failed_count} failed ({failedPct}%)
          </span>
        )}
        {data.unsubscribed_skipped_count > 0 && (
          <span className="text-muted-foreground ml-2">
            · {data.unsubscribed_skipped_count} opted out
          </span>
        )}
      </div>

      {data.error_message && (
        <div className="text-sm text-destructive">{data.error_message}</div>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">
          Preview body
        </summary>
        <div
          className="mt-2 p-3 border rounded prose prose-sm max-w-none"
          // The body is content authored by the tenant in this same UI;
          // not externally-sourced. Acceptable trust boundary for preview.
          dangerouslySetInnerHTML={{ __html: data.body_html }}
        />
      </details>
    </div>
  );
}

// ── Main panel ──────────────────────────────────────────────────────────────

export function EmailBroadcastPanel() {
  const accounts = useConnectedEmailAccounts();
  const runs = useBroadcastRuns(20, 0);
  const sendBroadcast = useSendBroadcast();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
      <ComposeForm
        accounts={accounts.data ?? []}
        isSubmitting={sendBroadcast.isPending}
        onSubmit={async (payload) => {
          const result = await sendBroadcast.mutateAsync(payload);
          setSelectedRunId(result.broadcast_run_id);
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Sent</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {runs.isLoading ? (
            <div className="p-4 text-sm">Loading…</div>
          ) : runs.error ? (
            <div className="p-4 text-sm text-destructive">
              {runs.error instanceof Error
                ? runs.error.message
                : 'Failed to load broadcasts.'}
            </div>
          ) : (
            <SentList
              runs={runs.data?.runs ?? []}
              selectedId={selectedRunId}
              onSelect={setSelectedRunId}
            />
          )}
          {selectedRunId && (
            <div className="border-t">
              <RunDetail id={selectedRunId} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default EmailBroadcastPanel;
