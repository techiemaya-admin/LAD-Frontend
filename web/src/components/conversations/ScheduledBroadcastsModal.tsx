'use client';

import { useEffect, useState, useCallback } from 'react';
import { CalendarClock, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

interface ScheduledRow {
  id: number | string;
  scheduled_at: string;
  status: string;
  group_count: number;
  message_preview: string;
  recurrence?: string | null;       // 'daily' | 'weekly' | 'monthly' | null (one-shot)
  recurrence_day?: number | null;   // weekly 0-6 (Sun=0) | monthly 1-31
  recurrence_time?: string | null;  // 'HH:MM'
}

interface ScheduledBroadcastsModalProps {
  open: boolean;
  onClose: () => void;
  channel: 'personal' | 'waba';
}

/** Lists upcoming/in-flight scheduled broadcasts with a cancel action. */
export function ScheduledBroadcastsModal({ open, onClose, channel }: ScheduledBroadcastsModalProps) {
  const [rows, setRows] = useState<ScheduledRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchWithTenant(`/api/whatsapp-conversations/chat-groups/scheduled-broadcasts?channel=${channel}`)
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data?.data) ? data.data : []))
      .catch(() => setError('Could not load scheduled broadcasts'))
      .finally(() => setLoading(false));
  }, [channel]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const cancel = useCallback(async (id: string | number) => {
    setCancelingId(id);
    try {
      const res = await fetchWithTenant(
        `/api/whatsapp-conversations/chat-groups/scheduled-broadcasts/${id}?channel=${channel}`,
        { method: 'DELETE' }
      );
      if (res.ok) setRows((prev) => prev.filter((r) => r.id !== id));
    } catch {
      /* ignore - leave the row; the user can retry */
    } finally {
      setCancelingId(null);
    }
  }, [channel]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-emerald-600" /> Scheduled broadcasts
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
            </div>
          ) : error ? (
            <div className="py-16 text-center text-sm text-muted-foreground">{error}</div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground px-6">
              No upcoming scheduled broadcasts.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold">
                        {(() => { try { return format(new Date(r.scheduled_at), 'MMM d, h:mm a'); } catch { return r.scheduled_at; } })()}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        · {r.group_count} group{r.group_count === 1 ? '' : 's'}
                      </span>
                      {r.recurrence && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                          🔁 {r.recurrence === 'daily'
                            ? 'Daily'
                            : r.recurrence === 'weekly'
                              ? `Weekly · ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][r.recurrence_day ?? 0]}`
                              : `Monthly · day ${r.recurrence_day ?? 1}`}
                        </span>
                      )}
                      {r.status === 'sending' && <span className="text-[10px] text-amber-600">sending…</span>}
                    </div>
                    <p className="text-[13px] text-muted-foreground truncate mt-0.5">{r.message_preview || '-'}</p>
                  </div>
                  {r.status === 'scheduled' && (
                    <button
                      type="button"
                      onClick={() => cancel(r.id)}
                      disabled={cancelingId === r.id}
                      title="Cancel"
                      aria-label="Cancel scheduled broadcast"
                      className="shrink-0 mt-0.5 text-muted-foreground hover:text-red-500 disabled:opacity-50"
                    >
                      {cancelingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
