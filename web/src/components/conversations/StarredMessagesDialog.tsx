'use client';

import { useEffect, useState, useCallback } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import { usePhoneMasking } from '@/hooks/usePhoneMasking';

interface StarredRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  metadata?: Record<string, unknown> | string | null;
  created_at: string;
  contact_name?: string | null;
  contact_phone?: string | null;
  is_group?: boolean;
}

interface StarredMessagesDialogProps {
  open: boolean;
  onClose: () => void;
  channel: 'personal' | 'waba';
  onSelectConversation?: (id: string) => void;
}

/**
 * Global "Starred messages" viewer - lists starred messages across ALL
 * conversations for the tenant (personal WhatsApp). Opened from the sidebar
 * kebab menu. Clicking a row jumps to that conversation; the star button unstars.
 */
export function StarredMessagesDialog({
  open,
  onClose,
  channel,
  onSelectConversation,
}: StarredMessagesDialogProps) {
  // Starred rows are labelled by contact, falling back to the raw number.
  const { displayNameOrPhone } = usePhoneMasking();
  const [rows, setRows] = useState<StarredRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetchWithTenant(
          `/api/whatsapp-conversations/conversations/starred-messages?channel=${channel}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setRows(Array.isArray(data?.data) ? data.data : []);
      } catch {
        if (!cancelled) setError('Could not load starred messages');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, channel]);

  const handleUnstar = useCallback(
    async (row: StarredRow) => {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      try {
        await fetchWithTenant(
          `/api/whatsapp-conversations/conversations/${row.conversation_id}/messages/${row.id}/star?channel=${channel}`,
          { method: 'PATCH', headers: { 'Content-Type': 'application/json' } }
        );
      } catch {
        /* best-effort - already removed from the view */
      }
    },
    [channel]
  );

  const previewOf = (row: StarredRow): string => {
    if (row.content && row.content.trim()) return row.content;
    const meta =
      typeof row.metadata === 'string'
        ? (() => {
            try {
              return JSON.parse(row.metadata as string);
            } catch {
              return {};
            }
          })()
        : row.metadata || {};
    const type = (meta as Record<string, unknown>)?.message_type || (meta as Record<string, unknown>)?.media_type;
    return type ? `📎 ${String(type)[0].toUpperCase()}${String(type).slice(1)}` : '📎 Attachment';
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-[17px]">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            Starred messages
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
              No starred messages yet. Hover a message and choose “Star message”.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-start gap-3 px-5 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => {
                    onSelectConversation?.(row.conversation_id);
                    onClose();
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[14px] font-semibold truncate">
                        {displayNameOrPhone(row.contact_name, row.contact_phone)}
                      </span>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {(() => {
                          try {
                            return format(new Date(row.created_at), 'MMM d, h:mm a');
                          } catch {
                            return '';
                          }
                        })()}
                      </span>
                    </div>
                    <p className="text-[13px] text-muted-foreground truncate mt-0.5">{previewOf(row)}</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Unstar message"
                    title="Unstar"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnstar(row);
                    }}
                    className="shrink-0 mt-0.5"
                  >
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400 hover:opacity-70 transition-opacity" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
