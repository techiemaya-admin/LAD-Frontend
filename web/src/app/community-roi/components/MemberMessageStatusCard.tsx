/**
 * MemberMessageStatusCard
 *
 * Surfaces the template-broadcast delivery state for a given chapter member.
 * Renders KPI badges (Sent / Delivered / Read / Failed) and a scrollable
 * recent-messages list with per-message status pills.
 *
 * Data source: GET /api/whatsapp-conversations/members/by-phone/:phone/message-status
 *   → proxies to LAD-WABA-Comms which joins wa_contacts → messages.
 */
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface MessageRow {
  id: string;
  external_message_id: string | null;
  status: 'sent' | 'delivered' | 'read' | 'failed' | string;
  template_name: string | null;
  preview: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ApiResp {
  success: boolean;
  contact_found: boolean;
  contact?: { id: string; name: string; phone: string };
  summary: {
    total_sent: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    last_read_at: string | null;
  };
  messages: MessageRow[];
}

interface Props {
  memberName: string;
  memberPhone: string | null | undefined;
}

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  sent:      { label: 'Sent',      cls: 'bg-slate-100 text-slate-700' },
  delivered: { label: 'Delivered', cls: 'bg-blue-100 text-blue-700' },
  read:      { label: 'Read',      cls: 'bg-emerald-100 text-emerald-700' },
  failed:    { label: 'Failed',    cls: 'bg-rose-100 text-rose-700' },
};

export function MemberMessageStatusCard({ memberName, memberPhone }: Props) {
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberPhone) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(
      `/api/whatsapp-conversations/members/by-phone/${encodeURIComponent(memberPhone)}/message-status?limit=50`,
      { cache: 'no-store' },
    )
      .then(r => r.json())
      .then((json: ApiResp) => {
        if (!json?.success) throw new Error('Service returned non-success');
        setData(json);
      })
      .catch(e => setError(e?.message || 'Failed to load status'))
      .finally(() => setLoading(false));
  }, [memberPhone]);

  if (!memberPhone) {
    return (
      <Card className="rounded-[1.5rem] border-slate-100 shadow-sm">
        <CardContent className="p-8 text-center text-sm text-slate-400">
          No phone on file for <span className="font-semibold">{memberName}</span> — can't fetch
          WhatsApp delivery status.
        </CardContent>
      </Card>
    );
  }

  const s = data?.summary;
  const messages = data?.messages || [];

  return (
    <Card className="rounded-[1.5rem] border-slate-100 shadow-sm">
      <CardHeader className="p-6 pb-4 border-b border-slate-50">
        <CardTitle className="text-lg font-bold text-slate-900">Template Delivery Status</CardTitle>
        <CardDescription className="text-slate-400 text-xs font-medium mt-0.5">
          Broadcast outcomes for {memberName} · {memberPhone}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-5">
        {loading && <div className="text-sm text-slate-400">Loading…</div>}
        {error && <div className="text-sm text-rose-500">⚠ {error}</div>}

        {data && !data.contact_found && (
          <div className="text-sm text-slate-500">
            No WhatsApp contact found for this number — no templates have been delivered to this
            member yet, or their phone hasn't been used in any broadcast.
          </div>
        )}

        {s && data?.contact_found && (
          <>
            {/* KPI tiles */}
            <div className="grid grid-cols-4 gap-3">
              <KpiTile label="Sent"      value={s.total_sent} accent="bg-slate-50 text-slate-700" />
              <KpiTile label="Delivered" value={s.delivered}  accent="bg-blue-50 text-blue-700" />
              <KpiTile label="Read"      value={s.read}       accent="bg-emerald-50 text-emerald-700" />
              <KpiTile label="Failed"    value={s.failed}     accent="bg-rose-50 text-rose-700" />
            </div>

            {s.last_read_at && (
              <div className="text-xs text-slate-500">
                Last read: <span className="font-semibold text-slate-700">
                  {formatDistanceToNow(parseISO(s.last_read_at), { addSuffix: true })}
                </span>
              </div>
            )}

            {/* Message list */}
            {messages.length > 0 ? (
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {messages.map(m => {
                    const pill = STATUS_PILL[m.status] || { label: m.status, cls: 'bg-slate-100 text-slate-700' };
                    return (
                      <div key={m.id} className="px-4 py-3 hover:bg-slate-50/60">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-800 truncate">
                                {m.template_name || 'template'}
                              </span>
                              <Badge className={`${pill.cls} hover:${pill.cls} border-0 text-[10px] font-semibold px-2 py-0`}>
                                {pill.label}
                              </Badge>
                            </div>
                            {m.preview && (
                              <p className="text-xs text-slate-500 mt-1 truncate">{m.preview}</p>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 whitespace-nowrap">
                            {m.created_at && formatDistanceToNow(parseISO(m.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400">No template messages sent to this member yet.</div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function KpiTile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className={`rounded-2xl px-3 py-2.5 ${accent}`}>
      <div className="text-2xl font-bold leading-none">{value}</div>
      <div className="text-[11px] uppercase tracking-wider opacity-70 mt-1">{label}</div>
    </div>
  );
}
