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
import { Sparkles, FileText, Send, RefreshCw, Loader2, Film, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import TemplateSelector from '@/components/campaigns/linkedin-templates/TemplateSelector';
import type { LinkedInMessageTemplate } from '@lad/frontend-features/campaigns';

type Mode = 'ai' | 'template';

interface SelectedMedia {
  url: string;
  type?: string | null;
  filename?: string | null;
}

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
  leadId: string;          // Either campaign_leads.id OR campaign_leads.lead_id - backend accepts either
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
  // Chosen library template (Template mode) + its media attachment.
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);

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
          ? 'AI returned an empty message - try regenerating.'
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

  // ── Template library picker ────────────────────────────────────────────────
  const handleTemplateSelect = (tpl: LinkedInMessageTemplate | null) => {
    if (!tpl) {
      // "Custom Messages" - drop the template + media, keep the current text so
      // the user can type their own.
      setSelectedTemplateId(null);
      setSelectedMedia(null);
      return;
    }
    setSelectedTemplateId(tpl.id);
    setHasTemplate(true);
    setError(null);
    setInfo(null);
    // Prefer the follow-up body; fall back to the connection message.
    setMessage(tpl.followup_message || tpl.connection_message || '');
    const meta = (tpl.metadata ?? {}) as Record<string, any>;
    setSelectedMedia(meta.media_url
      ? { url: meta.media_url, type: meta.media_type ?? null, filename: meta.media_filename ?? null }
      : null);
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
        body: JSON.stringify({
          channel: 'linkedin',
          message: trimmed,
          // Attach the chosen library template + its media (Template mode). The
          // backend re-resolves the template's stored media as the source of truth.
          ...(mode === 'template' && selectedTemplateId ? { templateId: selectedTemplateId } : {}),
          ...(mode === 'template' && selectedMedia ? {
            mediaUrl: selectedMedia.url,
            mediaType: selectedMedia.type || undefined,
            mediaFilename: selectedMedia.filename || undefined,
          } : {}),
        }),
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
  }, [campaignId, leadId, message, contactName, onSent, mode, selectedTemplateId, selectedMedia]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="mx-4 my-3 rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900/40">
        <div className="flex items-center gap-2">
          <Send className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">
            Send follow-up now
          </p>
        </div>

        {/* Mode toggle */}
        <div className="inline-flex rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 overflow-hidden text-[11px]">
          <button
            type="button"
            onClick={() => switchMode('ai')}
            disabled={isPreviewing || isSending}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 transition-colors',
              mode === 'ai'
                ? 'bg-blue-600 text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800',
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
              'inline-flex items-center gap-1 px-2 py-1 transition-colors border-l border-blue-200 dark:border-blue-800',
              mode === 'template'
                ? 'bg-blue-600 text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800',
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

        {/* Template library picker (Template mode) */}
        {mode === 'template' && (
          <div className="space-y-2">
            <TemplateSelector
              selectedTemplateId={selectedTemplateId || undefined}
              onTemplateSelect={handleTemplateSelect}
              onManageClick={() => window.open('/conversations/templates', '_blank')}
            />
            {selectedMedia && (
              <div className="flex items-center gap-2 p-2 rounded-md border border-blue-200 bg-white">
                {selectedMedia.type === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedMedia.url} alt={selectedMedia.filename || 'attachment'} className="h-10 w-10 rounded object-cover border" />
                ) : (
                  <div className="h-10 w-10 rounded bg-blue-50 flex items-center justify-center text-blue-500">
                    {selectedMedia.type === 'video' ? <Film className="h-4 w-4" />
                      : selectedMedia.type === 'audio' ? <Music className="h-4 w-4" />
                      : <FileText className="h-4 w-4" />}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-slate-700 truncate">{selectedMedia.filename || 'Attachment'}</p>
                  <p className="text-[10px] text-slate-500 capitalize">{selectedMedia.type || 'file'} · sent with this follow-up</p>
                </div>
              </div>
            )}
          </div>
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
                  ? 'No template configured for this campaign - switch to AI or add one in Edit Campaign.'
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
