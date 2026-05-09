'use client';

/**
 * LinkedIn Follow-up Composer
 *
 * Renders inside the LinkedIn chat panel when a conversation is in the
 * "accepted" state (Connected, awaiting follow-up). Lets the user:
 *   1. Choose AI-generated vs Template message
 *   2. Preview/edit the message
 *   3. Regenerate the AI version if they don't like it
 *   4. Send via the same backend endpoints the leads page uses:
 *        POST /api/campaigns/:id/leads/:leadId/preview-followup
 *        POST /api/campaigns/:id/leads/:leadId/send-followup
 *
 * After a successful send, calls `onSent` so the parent can refresh the
 * conversation (the chat unlocks once the follow-up message is logged).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Sparkles, FileText, Send, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type Mode = 'ai' | 'template';

interface PreviewResp {
  success: boolean;
  message: string | null;
  mode?: Mode;
  context?: any;
  error?: string;
}

interface SendResp {
  success: boolean;
  channel?: string;
  messageId?: string;
  error?: string;
}

interface Props {
  campaignId: string;
  leadId: string;          // Either campaign_leads.id OR campaign_leads.lead_id — backend accepts either
  contactName?: string;
  /** Called after a successful send so the parent can refetch the conversation */
  onSent?: () => void;
}

export function LinkedInFollowupComposer({ campaignId, leadId, contactName, onSent }: Props) {
  const [mode, setMode] = useState<Mode>('ai');
  const [message, setMessage] = useState<string>('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [hasTemplate, setHasTemplate] = useState<boolean>(true); // assume yes until backend says otherwise

  // ── Preview / regenerate ──────────────────────────────────────────────────
  const fetchPreview = useCallback(async (m: Mode) => {
    setError(null);
    setInfo(null);
    setIsPreviewing(true);
    try {
      const resp = await fetch(`/api/campaigns/${campaignId}/leads/${leadId}/preview-followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'linkedin', mode: m }),
      });
      const data: PreviewResp = await resp.json().catch(() => ({ success: false, message: null }));
      if (!resp.ok || !data.success) {
        setError(data.error || `Could not generate ${m === 'ai' ? 'AI message' : 'template'}`);
        return;
      }
      if (m === 'template' && data.context?.hasTemplate === false) {
        setHasTemplate(false);
        setMessage('');
        setInfo('No follow-up template configured for this campaign.');
        return;
      }
      setHasTemplate(true);
      setMessage(data.message || '');
      if (!data.message) {
        setInfo(m === 'ai'
          ? 'AI returned an empty message — try regenerating.'
          : 'Template is empty.');
      }
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setIsPreviewing(false);
    }
  }, [campaignId, leadId]);

  // Auto-load AI preview on first mount
  useEffect(() => {
    fetchPreview('ai');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    fetchPreview(next);
  };

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      setError('Message is empty');
      return;
    }
    setError(null);
    setInfo(null);
    setIsSending(true);
    try {
      const resp = await fetch(`/api/campaigns/${campaignId}/leads/${leadId}/send-followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'linkedin', message: trimmed }),
      });
      const data: SendResp = await resp.json().catch(() => ({ success: false }));
      if (!resp.ok || !data.success) {
        setError(data.error || 'Send failed');
        return;
      }
      setInfo(`Follow-up sent${contactName ? ` to ${contactName}` : ''}.`);
      setMessage('');
      onSent?.();
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setIsSending(false);
    }
  }, [campaignId, leadId, message, contactName, onSent]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="mx-4 my-3 rounded-lg border border-blue-200 bg-blue-50/40 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-blue-50 border-b border-blue-200">
        <div className="flex items-center gap-2">
          <Send className="w-3.5 h-3.5 text-blue-600" />
          <p className="text-xs font-semibold text-blue-900">
            Send follow-up now
          </p>
        </div>

        {/* Mode toggle */}
        <div className="inline-flex rounded-md border border-blue-200 bg-white overflow-hidden text-[11px]">
          <button
            type="button"
            onClick={() => switchMode('ai')}
            disabled={isPreviewing || isSending}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 transition-colors',
              mode === 'ai'
                ? 'bg-blue-600 text-white'
                : 'text-slate-700 hover:bg-blue-50',
            )}
            title="Generate a personalised follow-up using web presence + recent posts"
          >
            <Sparkles className="w-3 h-3" />
            AI
          </button>
          <button
            type="button"
            onClick={() => switchMode('template')}
            disabled={isPreviewing || isSending}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 transition-colors border-l border-blue-200',
              mode === 'template'
                ? 'bg-blue-600 text-white'
                : 'text-slate-700 hover:bg-blue-50',
            )}
            title="Use the campaign's static follow-up template"
          >
            <FileText className="w-3 h-3" />
            Template
          </button>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {/* Status messages */}
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
        {info && !error && (
          <p className="text-xs text-emerald-700">{info}</p>
        )}

        {/* Message editor */}
        <div className="relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              isPreviewing
                ? mode === 'ai' ? 'Generating personalised follow-up…' : 'Loading template…'
                : mode === 'template' && !hasTemplate
                  ? 'No template configured for this campaign — switch to AI or add one in Edit Campaign.'
                  : 'Edit the follow-up message before sending…'
            }
            rows={5}
            disabled={isPreviewing || isSending || (mode === 'template' && !hasTemplate)}
            className="text-sm resize-none"
          />
          {isPreviewing && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/40">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            </div>
          )}
        </div>

        {/* Char count + actions */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">
            {message.length} char{message.length === 1 ? '' : 's'}
          </span>

          {mode === 'ai' && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fetchPreview('ai')}
              disabled={isPreviewing || isSending}
              className="ml-auto h-7 text-xs"
              title="Regenerate the AI follow-up"
            >
              <RefreshCw className={cn('w-3 h-3 mr-1', isPreviewing && 'animate-spin')} />
              Regenerate
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            onClick={handleSend}
            disabled={isPreviewing || isSending || !message.trim()}
            className={cn(
              'h-7 text-xs bg-blue-600 hover:bg-blue-700',
              mode === 'template' && 'ml-auto',
            )}
          >
            {isSending ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Send className="w-3 h-3 mr-1" />
            )}
            Send follow-up
          </Button>
        </div>

        <p className="text-[10px] text-slate-500 pt-1">
          Sending unlocks the chat. {mode === 'ai'
            ? 'AI uses recent posts and web presence to personalise the message.'
            : 'Uses your campaign\'s follow-up template with placeholders substituted.'}
        </p>
      </div>
    </div>
  );
}
