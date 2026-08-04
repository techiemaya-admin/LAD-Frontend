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
 */import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Sparkles, Paperclip, FileText, UserPlus, PanelRightOpen, PanelRightClose,
  Loader2, ChevronDown, ChevronRight, AlertCircle, Search, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredTemplates = templates.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = t.name?.toLowerCase().includes(q);
    const contentMatch = t.content?.toLowerCase().includes(q);
    const mediaMatch = t.metadata?.media_filename?.toLowerCase().includes(q);
    const categoryMatch = t.category?.toLowerCase().includes(q);
    return nameMatch || contentMatch || mediaMatch || categoryMatch;
  });

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
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-t border-border dark:border-slate-800 bg-slate-50/50 dark:bg-[#101C36] overflow-x-auto no-scrollbar">
        {/* AI Agent pill */}
        <div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleAgent}
                disabled={agentEnabled === null || agentSaving}
                className={cn(
                  'inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors shadow-2xs',
                  agentEnabled
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80',
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
                className="h-7 w-7 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/40"
                onClick={handleAttachClick}
                disabled={!chatEnabled}
              >
                <Paperclip className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Attach media (image / PDF)</TooltipContent>
          </Tooltip>
        </div>

        {/* Templates */}
        <div>
          <DropdownMenu onOpenChange={(open) => {
            if (open) {
              loadTemplates();
              setSearchQuery('');
            }
          }}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/40 shadow-2xs"
                    disabled={!chatEnabled}
                  >
                    <FileText className="w-3.5 h-3.5 mr-1 text-slate-600 dark:text-slate-300" />
                    Templates
                    <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">Insert a saved LinkedIn template</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-72 p-2 bg-white dark:bg-[#091122] border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl text-slate-900 dark:text-slate-100">
              {/* Header */}
              <div className="flex items-center justify-between px-1.5 py-1 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center flex-shrink-0 text-slate-600 dark:text-slate-300">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-100">LinkedIn templates</span>
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
                  {templates.length} {templates.length === 1 ? 'template' : 'templates'}
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative mb-2 px-0.5" onClick={(e) => e.stopPropagation()}>
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Escape') {
                      e.currentTarget.blur();
                    }
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-[#0D1527] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Separator between search and template list */}
              <div className="h-px bg-slate-200/80 dark:bg-slate-800/80 -mx-2 mb-1" />

              {/* Template Items List */}
              <div className="max-h-[260px] overflow-y-auto divide-y divide-slate-200/60 dark:divide-slate-800/80">
                {tplLoading && (
                  <div className="flex items-center justify-center py-6 text-xs text-slate-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Loading…
                  </div>
                )}
                {!tplLoading && templates.length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No templates configured
                  </div>
                )}
                {!tplLoading && templates.length > 0 && filteredTemplates.length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No templates match your search
                  </div>
                )}
                {filteredTemplates.map(t => {
                  const media = t.metadata || {};
                  const hasMedia = !!media.media_url;
                  return (
                    <DropdownMenuItem
                      key={t.id}
                      className="group text-xs flex items-center justify-between gap-2.5 px-2 py-2.5 rounded-none hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors cursor-pointer outline-none focus:bg-slate-100/70 dark:focus:bg-slate-800/50"
                      onClick={() => onInsertTemplate({
                        text: t.content || '',
                        mediaUrl: media.media_url ?? null,
                        mediaType: media.media_type ?? null,
                        mediaFilename: media.media_filename ?? null,
                      })}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-lg bg-slate-200/60 dark:bg-slate-800/80 border border-slate-300/40 dark:border-slate-700/50 flex items-center justify-center flex-shrink-0 text-slate-500 dark:text-slate-400">
                          {hasMedia ? <Paperclip className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-semibold text-slate-800 dark:text-slate-100 truncate text-xs">
                            {t.name}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {t.content || (hasMedia ? (media.media_filename || 'Attachment') : '')}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                    </DropdownMenuItem>
                  );
                })}
              </div>
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
                className="h-7 px-2.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/40 shadow-2xs"
                onClick={() => alert('Assignment for LinkedIn is queued for the next backend release.')}
                disabled={!chatEnabled}
              >
                <UserPlus className="w-3.5 h-3.5 mr-1 text-slate-600 dark:text-slate-300" />
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
              className="h-7 w-7 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/40"
              onClick={onToggleContextPanel}
            >
              {contextPanelOpen
                ? <PanelRightClose className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                : <PanelRightOpen  className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />}
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
