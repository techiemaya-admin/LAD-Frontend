'use client';

/**
 * LinkedIn Chat Toolbar — adds parity with the WhatsApp chat toolbar.
 *
 * Renders above the message input row when a LinkedIn conversation is active.
 *  - AI on/off pill         (tenant-wide; persists via /automation-settings)
 *  - Attach media           (UI present; upstream Unipile DM media endpoint
 *                            still needs backend wiring — surfaces a tooltip)
 *  - Templates              (loads /api/campaigns/linkedin-message-templates,
 *                            inserts into the message input)
 *  - Assign to team member  (placeholder until LinkedIn assignment route ships)
 *  - Toggle context panel   (eye icon)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Sparkles, Paperclip, FileText, UserPlus, PanelRightOpen, PanelRightClose,
  Loader2, ChevronDown, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

interface LinkedInTemplate {
  id: string;
  name: string;
  // The API (/api/campaigns/linkedin-message-templates) returns the body in the
  // `content` column. A connection-only template can legitimately have a null
  // content, so callers must guard before using it.
  content: string | null;
  category?: string | null;
  // Media (image / video / voice note / document) lives in the template's
  // metadata JSONB. A media-only template can have null content but still carry
  // an attachment, so it must ride along with the inserted text.
  metadata?: {
    media_url?: string | null;
    media_type?: string | null;
    media_filename?: string | null;
  } | null;
}

/**
 * Payload handed to the composer when a template is inserted: the body text plus
 * any attachment carried on the template, so a media template visibly stages its
 * video/image before sending (fixes templates that dropped their media).
 */
export interface InsertTemplatePayload {
  text: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaFilename?: string | null;
}

interface Props {
  contextPanelOpen: boolean;
  onToggleContextPanel: () => void;
  /** Insert a template (text + optional media) into the chat composer */
  onInsertTemplate: (payload: InsertTemplatePayload) => void;
  /** Disabled when chat is locked (pending / accepted-awaiting-followup) */
  chatEnabled: boolean;
}

export function LinkedInChatToolbar({
  contextPanelOpen,
  onToggleContextPanel,
  onInsertTemplate,
  chatEnabled,
}: Props) {
  // ── AI Chat Agent toggle ────────────────────────────────────────────────
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
    setAgentEnabled(next);
    try {
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
      setAgentEnabled(!next);
    } finally {
      setAgentSaving(false);
    }
  };

  // ── Templates ───────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<LinkedInTemplate[]>([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [tplLoaded, setTplLoaded] = useState(false);

  const loadTemplates = useCallback(async () => {
    if (tplLoaded) return;
    setTplLoading(true);
    try {
      const resp = await fetch('/api/campaigns/linkedin-message-templates');
      const data = await resp.json().catch(() => ({}));
      const list = data?.data || data?.templates || [];
      setTemplates(Array.isArray(list) ? list : []);
    } catch { /* non-fatal */ } finally {
      setTplLoaded(true);
      setTplLoading(false);
    }
  }, [tplLoaded]);

  // ── Attach media (stubbed) ──────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachInfo, setAttachInfo] = useState<string | null>(null);

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Backend wiring for Unipile DM media upload is not yet implemented.
    // Surface a clear status so users aren't left guessing.
    setAttachInfo(`Selected "${file.name}" — media upload to LinkedIn DMs is queued for the next backend release.`);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => setAttachInfo(null), 6000);
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 px-3 py-1.5 border-t border-border bg-slate-50/50 dark:bg-slate-700/50 overflow-x-auto no-scrollbar">
        {/* AI Agent pill */}
        <div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleAgent}
                disabled={agentEnabled === null || agentSaving}
                className={cn(
                  'inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-medium transition-colors',
                  agentEnabled
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200',
                  agentSaving && 'opacity-60'
                )}
              >
                {agentSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                AI {agentEnabled ? 'on' : 'off'}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {agentEnabled
                ? 'AI auto-replies are ON — turn off to take human control'
                : 'AI auto-replies are OFF — turn on to let the agent respond'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Attach media */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,application/pdf"
            onChange={handleFileChosen}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7"
                onClick={handleAttachClick}
                disabled={!chatEnabled}
              >
                <Paperclip className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Attach media (image / PDF)</TooltipContent>
          </Tooltip>
        </div>

        {/* Templates */}
        <div>
          <DropdownMenu onOpenChange={(open) => open && loadTemplates()}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    disabled={!chatEnabled}
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" />
                    Templates
                    <ChevronDown className="w-3 h-3 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">Insert a saved LinkedIn template</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-64 max-h-[320px] overflow-y-auto">
              <DropdownMenuLabel className="text-xs">LinkedIn templates</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {tplLoading && (
                <DropdownMenuItem disabled className="text-xs text-slate-500">
                  <Loader2 className="w-3 h-3 animate-spin mr-1" /> Loading…
                </DropdownMenuItem>
              )}
              {!tplLoading && templates.length === 0 && (
                <DropdownMenuItem disabled className="text-xs text-slate-500">
                  No templates configured
                </DropdownMenuItem>
              )}
              {templates.map(t => {
                const media = t.metadata || {};
                const hasMedia = !!media.media_url;
                return (
                  <DropdownMenuItem
                    key={t.id}
                    className="text-xs flex flex-col items-start gap-0.5 py-1.5"
                    onClick={() => onInsertTemplate({
                      text: t.content || '',
                      mediaUrl: media.media_url ?? null,
                      mediaType: media.media_type ?? null,
                      mediaFilename: media.media_filename ?? null,
                    })}
                  >
                    <span className="font-medium text-slate-800 truncate w-full flex items-center gap-1">
                      {hasMedia && <Paperclip className="w-3 h-3 flex-shrink-0 text-slate-400" />}
                      <span className="truncate">{t.name}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 truncate w-full">
                      {t.content || (hasMedia ? (media.media_filename || 'Attachment') : '')}
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Assign to team */}
        <div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() => alert('Assignment for LinkedIn is queued for the next backend release.')}
                disabled={!chatEnabled}
              >
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                Assign
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Hand this conversation to a team member</TooltipContent>
          </Tooltip>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Context panel toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7"
              onClick={onToggleContextPanel}
            >
              {contextPanelOpen
                ? <PanelRightClose className="w-3.5 h-3.5" />
                : <PanelRightOpen  className="w-3.5 h-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {contextPanelOpen ? 'Hide contact details' : 'Show contact details'}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Inline status row (e.g. attach feedback) */}
      {attachInfo && (
        <div className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-amber-700 bg-amber-50 border-t border-amber-200">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {attachInfo}
        </div>
      )}
    </TooltipProvider>
  );
}
