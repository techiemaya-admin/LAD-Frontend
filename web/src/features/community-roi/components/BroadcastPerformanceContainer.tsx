/**
 * BroadcastPerformanceContainer
 * -----------------------------
 * Thin data adapter around the pure <BroadcastPerformance /> component.
 *
 *   1. Fetches GET /api/whatsapp-conversations/broadcasts/template-stats
 *   2. Maps the API row shape onto the component's Template[] contract
 *      (adds an `id`, computes `pending` from sent − read − delivered − failed,
 *       formats `last_sent_at` as a relative string).
 *   3. Hands the array to <BroadcastPerformance/>.
 *
 * Pure / presentational logic lives in BroadcastPerformance.tsx; this file
 * deals only with the I/O wiring so the visual component stays test-friendly.
 */
'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { BroadcastPerformance, type Template } from './BroadcastPerformance';

/**
 * One row out of GET /api/whatsapp-conversations/broadcasts/template-stats.
 *
 * Important semantic note on the count fields - they describe *current
 * message status*, not a cumulative funnel:
 *
 *   total      = COUNT(*)                                       all dispatches
 *   sent       = COUNT(*) FILTER (message_status = 'sent')      stuck pre-ack
 *   delivered  = COUNT(*) FILTER (message_status = 'delivered') ack'd, unread
 *   read       = COUNT(*) FILTER (message_status = 'read')      seen
 *   failed     = COUNT(*) FILTER (message_status = 'failed')    errored
 *
 * The WhatsApp lifecycle is sent → delivered → read (status progresses,
 * old status is overwritten). So `sent` here is the count of messages
 * still WAITING for a delivery ack - NOT the total dispatched.
 *
 *   total = sent + delivered + read + failed
 *
 * Map `total` to the UI's "Sent" column (= total dispatched, what users
 * intuitively expect) and `sent` to the delivery bar's "pending" segment
 * (= awaiting Meta's delivery webhook).
 */
interface ApiRow {
  template_name: string;
  total: number;
  distinct_recipients: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  read_rate: number;
  last_sent_at: string | null;
}

/** One run out of GET /api/email-comms/broadcast/runs (BroadcastRunSummary). */
interface EmailRun {
  id: string;
  from_email: string;
  subject: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  unsubscribed_skipped_count: number;
  created_at: string;
}

/** Template + raw timestamp, so WhatsApp and email rows sort by recency
 *  before the display string is all that's left. */
type TemplateWithTs = Template & { _ts: string | null };

function shortRelative(iso: string | null): string {
  if (!iso) return '-';
  try {
    // formatDistanceToNow returns "about 10 hours ago"; tighten to "10h ago"
    const long = formatDistanceToNow(parseISO(iso), { addSuffix: true });
    return long
      .replace(/^about\s+/, '')
      .replace(/^less than a minute/, '<1m')
      .replace(/(\d+)\s+seconds?/, '$1s')
      .replace(/(\d+)\s+minutes?/, '$1m')
      .replace(/(\d+)\s+hours?/,   '$1h')
      .replace(/(\d+)\s+days?/,    '$1d')
      .replace(/(\d+)\s+months?/,  '$1mo')
      .replace(/(\d+)\s+years?/,   '$1y');
  } catch {
    return iso;
  }
}

export interface BroadcastPerformanceContainerProps {
  /**
   * When true, suppress the outer card frame on loading/error states and
   * forward `chromeless` to the inner component. Used by the dashboard
   * overview widget, which provides its own card chrome via `WidgetWrapper`.
   */
  chromeless?: boolean;
}

export function BroadcastPerformanceContainer({
  chromeless = false,
}: BroadcastPerformanceContainerProps = {}) {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // WhatsApp template stats (existing source).
    const fetchWhatsApp = async (): Promise<TemplateWithTs[]> => {
      const res = await fetch('/api/whatsapp-conversations/broadcasts/template-stats', { cache: 'no-store' });
      const json = await res.json();
      if (!json?.success) throw new Error('non-success response');
      const rows: ApiRow[] = json.templates ?? [];
      return rows.map((r) => {
        // The UI's "Sent" column means "total dispatched" - map from
        // r.total, NOT r.sent (which is messages currently stuck in
        // 'sent' status awaiting a delivery ack). Use r.sent as the
        // delivery bar's pending segment instead.
        //
        // Sanity-clamp pending so it can't exceed total - terminal-states,
        // in case the DB has stale rows where a delivery webhook was
        // missed (status would still read 'sent' even though the user
        // already saw it).
        const terminal = r.delivered + r.read + r.failed;
        const pending  = Math.max(0, Math.min(r.sent, r.total - terminal));
        return {
          id:         r.template_name,
          name:       r.template_name,
          recipients: r.distinct_recipients,
          lastSent:   shortRelative(r.last_sent_at),
          sent:       r.total,            // total dispatched (what user expects)
          delivered:  r.delivered,
          read:       r.read,
          failed:     r.failed,
          pending,                         // still awaiting Meta's delivery ack
          channel:    'WhatsApp' as const,
          _ts:        r.last_sent_at,
        };
      });
    };

    // Email broadcasts (LAD-Email-Comms): recent runs + per-run open stats.
    // "Read" = unique opens (tracking pixel - an upper bound, mail-client
    // proxies prefetch), "Delivered" = sent-but-not-opened. Tenants without
    // the email feature just contribute [] here.
    const fetchEmail = async (): Promise<TemplateWithTs[]> => {
      const res = await fetch('/api/email-comms/broadcast/runs?limit=6', { cache: 'no-store' });
      if (!res.ok) return [];
      const json = await res.json().catch(() => null);
      const runs: EmailRun[] = json?.runs ?? [];
      if (runs.length === 0) return [];

      // Sender-address → provider so the chip says Gmail/Outlook. Best-effort.
      const providerByEmail: Record<string, string> = {};
      try {
        const a = await fetch('/api/email-comms/accounts', { cache: 'no-store' }).then((r) => r.json());
        for (const acc of a?.accounts ?? []) {
          if (acc?.email) providerByEmail[String(acc.email).toLowerCase()] = acc.provider;
        }
      } catch { /* chip falls back to 'Email' */ }

      // Open counts per run - parallel, individually best-effort.
      const stats = await Promise.all(
        runs.map((r) =>
          fetch(`/api/email-comms/broadcast/runs/${encodeURIComponent(r.id)}/stats`, { cache: 'no-store' })
            .then((s) => (s.ok ? s.json() : null))
            .catch(() => null),
        ),
      );

      return runs.map((r, i) => {
        const opened   = Number(stats[i]?.unique_opens ?? 0);
        const skipped  = r.unsubscribed_skipped_count ?? 0;
        const provider = providerByEmail[(r.from_email || '').toLowerCase()];
        const channel: Template['channel'] =
          provider === 'google' ? 'Gmail'
          : provider === 'microsoft' ? 'Outlook'
          : 'Email';
        return {
          id:         `email-${r.id}`,
          name:       r.subject || '(no subject)',
          recipients: r.recipient_count,
          lastSent:   shortRelative(r.created_at),
          sent:       r.sent_count,
          read:       opened,
          delivered:  Math.max(r.sent_count - opened, 0),   // sent, not (yet) opened
          failed:     r.failed_count,
          pending:    Math.max(r.recipient_count - r.sent_count - r.failed_count - skipped, 0),
          channel,
          _ts:        r.created_at,
        };
      });
    };

    Promise.allSettled([fetchWhatsApp(), fetchEmail()]).then(([wa, email]) => {
      if (cancelled) return;
      // Only error out when BOTH channels failed - a tenant without one
      // channel should still see the other's broadcasts.
      if (wa.status === 'rejected' && email.status === 'rejected') {
        setError((wa.reason as Error | undefined)?.message || 'Failed to load');
        return;
      }
      const merged = [
        ...(wa.status === 'fulfilled' ? wa.value : []),
        ...(email.status === 'fulfilled' ? email.value : []),
      ]
        .sort((a, b) => (b._ts ?? '').localeCompare(a._ts ?? ''))
        .map(({ _ts: _ignored, ...t }) => t);
      setTemplates(merged);
    });
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div style={chromeless ? {
        padding: '12px 4px',
        color: '#B43A2A', fontSize: 13, fontWeight: 500,
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      } : {
        maxWidth: 640, margin: '0 auto', padding: '20px 24px',
        background: '#fff', border: '1px solid #E6E4DE', borderRadius: 18,
        color: '#B43A2A', fontSize: 13, fontWeight: 500,
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      }}>
        ⚠ Couldn’t load broadcast stats: {error}
      </div>
    );
  }
  if (!templates) {
    return (
      <div style={chromeless ? {
        padding: '12px 4px',
        color: '#7A8290', fontSize: 13, fontWeight: 500,
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      } : {
        maxWidth: 640, margin: '0 auto', padding: '20px 24px',
        background: '#fff', border: '1px solid #E6E4DE', borderRadius: 18,
        color: '#7A8290', fontSize: 13, fontWeight: 500,
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      }}>
        Loading broadcast performance…
      </div>
    );
  }

  return <BroadcastPerformance templates={templates} chromeless={chromeless} />;
}

export default BroadcastPerformanceContainer;
