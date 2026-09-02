'use client';

import React, { useMemo } from 'react';
import {
  Phone, Video, MoreVertical, CheckCheck,
  Smile, Paperclip, Mic, Globe, Reply, FileText,
  Play, Image as ImageIcon, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBusinessProfile } from '@lad/frontend-features/ai-icp-assistant';

// ── Types ────────────────────────────────────────────────────────────────────

export type HeaderType = 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
export type ButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';

export interface TemplatePreviewButton {
  id: string;
  type: ButtonType;
  text: string;
  url?: string;
  phone?: string;
}

export interface WhatsAppChatPreviewProps {
  headerType?: HeaderType;
  headerText?: string;
  headerVarExample?: string;
  headerMediaUrl?: string;
  mediaFileName?: string;
  mediaUploadStatus?: 'idle' | 'uploading' | 'done' | 'error';
  bodyText: string;
  bodyVars?: string[];
  bodyExamples?: Record<string, string>;
  footerText?: string;
  buttons?: TemplatePreviewButton[];
  businessName?: string;
  businessAvatar?: string;
  className?: string;
}

// ── WhatsApp Markdown Renderer ───────────────────────────────────────────────

function renderWAMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>')
    .replace(/~([^~\n]+)~/g, '<s>$1</s>')
    .replace(/`([^`\n]+)`/g, '<code class="font-mono text-[12px] bg-black/10 dark:bg-white/15 px-1 py-0.5 rounded">$1</code>');
}

export function WhatsAppChatPreview({
  headerType = 'NONE',
  headerText = '',
  headerVarExample = '',
  headerMediaUrl = '',
  mediaFileName = '',
  mediaUploadStatus = 'idle',
  bodyText = '',
  bodyVars = [],
  bodyExamples = {},
  footerText = '',
  buttons = [],
  businessName,
  businessAvatar,
  className,
}: WhatsAppChatPreviewProps) {
  const { profile } = useBusinessProfile();

  const resolvedBusinessName: string = (businessName || profile?.companyName || 'Your Business').trim() || 'Your Business';
  const resolvedInitials = resolvedBusinessName
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'YB';

  // ── Substitute variables in body ────────────────────────────────────────────
  const substitutedBody = useMemo(() => {
    let text = bodyText || '';
    if (bodyVars && bodyVars.length > 0) {
      bodyVars.forEach((v) => {
        const val = bodyExamples[v];
        const replacement = val && val.trim() ? val.trim() : `{{${v}}}`;
        text = text.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), () => replacement);
      });
    }
    return text;
  }, [bodyText, bodyVars, bodyExamples]);

  // ── Substitute variables in header text ─────────────────────────────────────
  const substitutedHeaderText = useMemo(() => {
    if (headerType !== 'TEXT' || !headerText) return '';
    const replacement = headerVarExample && headerVarExample.trim() ? headerVarExample.trim() : '{{1}}';
    return headerText.replace(/\{\{1\}\}/g, () => replacement);
  }, [headerType, headerText, headerVarExample]);

  const validButtons = useMemo(() => buttons.filter(b => b.text && b.text.trim()), [buttons]);

  return (
    <div className={cn(
      'w-full max-w-[340px] mx-auto rounded-2xl overflow-hidden shadow-lg border border-black/10 dark:border-white/10 flex flex-col bg-[#efeae2] dark:bg-[#161717] select-none transition-all',
      className
    )}>
      {/* ── WhatsApp App Bar Header ── */}
      <div className="h-14 px-3 flex items-center justify-between bg-[#f0f2f5] dark:bg-[#202c33] border-b border-black/5 dark:border-white/5 shrink-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-[#00a884] dark:bg-[#00a884] text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow-xs ring-1 ring-black/5">
            {businessAvatar ? (
              <img src={businessAvatar} alt={resolvedBusinessName} className="w-full h-full rounded-full object-cover" />
            ) : (
              resolvedInitials
            )}
          </div>
          {/* Contact Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-[13.5px] text-[#111b21] dark:text-[#e9edef] truncate leading-tight">
                {resolvedBusinessName}
              </span>
              <CheckCircle2 className="w-3 h-3 text-[#00a884] shrink-0" fill="currentColor" />
            </div>
            <p className="text-[10.5px] text-[#667781] dark:text-[#8696a0] leading-none mt-0.5 truncate">
              Official Business Account
            </p>
          </div>
        </div>

        {/* WhatsApp App Bar Icons */}
        <div className="flex items-center gap-3 text-[#54656f] dark:text-[#aebac1]">
          <Video className="w-4 h-4 cursor-pointer hover:text-[#111b21] dark:hover:text-white transition-colors" />
          <Phone className="w-3.5 h-3.5 cursor-pointer hover:text-[#111b21] dark:hover:text-white transition-colors" />
          <MoreVertical className="w-4 h-4 cursor-pointer hover:text-[#111b21] dark:hover:text-white transition-colors" />
        </div>
      </div>

      {/* ── WhatsApp Chat Background Area ── */}
      <div className="relative flex-1 p-3.5 min-h-[320px] flex flex-col justify-between overflow-hidden">
        {/* Doodle wallpaper overlay matching WABusinessView */}
        <div
          className="absolute inset-0 pointer-events-none z-0 bg-repeat opacity-[0.4] dark:opacity-[0.06]"
          style={{ backgroundImage: 'url("/assets/wa-dark-bg.png")' }}
        />

        {/* Chat area content */}
        <div className="relative z-10 flex flex-col gap-2">
          {/* Date Separator */}
          <div className="flex justify-center mb-1">
            <span className="bg-white/80 dark:bg-[#182229]/90 text-[#54656f] dark:text-[#8696a0] text-[10.5px] font-medium px-2.5 py-0.5 rounded-md shadow-2xs uppercase tracking-wider backdrop-blur-xs">
              Today
            </span>
          </div>

          {/* ── Outgoing WhatsApp Message Bubble ── */}
          <div className="self-end max-w-[88%] min-w-[190px] rounded-lg rounded-tr-none bg-[#d9fdd3] dark:bg-[#144d37] text-[#111b21] dark:text-[#e9edef] shadow-xs overflow-hidden transition-all duration-200 border border-black/5 dark:border-white/5">
            {/* ── Media Header (if selected) ── */}
            {headerType !== 'NONE' && (
              <div>
                {headerType === 'TEXT' && substitutedHeaderText && (
                  <div className="px-3 pt-2 pb-1 font-bold text-[13.5px] text-[#111b21] dark:text-[#e9edef] leading-snug border-b border-black/5 dark:border-white/5">
                    {substitutedHeaderText}
                  </div>
                )}

                {headerType === 'IMAGE' && (
                  <div className="bg-black/5 dark:bg-black/20 overflow-hidden">
                    {headerMediaUrl ? (
                      <img
                        src={headerMediaUrl}
                        alt="Header preview"
                        className="w-full h-36 object-cover"
                      />
                    ) : (
                      <div className="h-32 flex flex-col items-center justify-center gap-1.5 p-3 text-[#54656f] dark:text-[#8696a0] bg-black/5 dark:bg-white/5">
                        <ImageIcon className="w-7 h-7 opacity-60" />
                        <span className="text-[11px] font-medium">
                          {mediaUploadStatus === 'done' && mediaFileName
                            ? mediaFileName
                            : 'Image Header Sample'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {headerType === 'VIDEO' && (
                  <div className="h-32 bg-black/80 dark:bg-black/60 relative flex items-center justify-center overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white ring-1 ring-white/30">
                      <Play className="w-5 h-5 ml-0.5 fill-current" />
                    </div>
                    {mediaFileName && (
                      <span className="absolute bottom-2 left-2 right-2 text-[10px] text-white/90 truncate bg-black/40 px-1.5 py-0.5 rounded">
                        {mediaFileName}
                      </span>
                    )}
                  </div>
                )}

                {headerType === 'DOCUMENT' && (
                  <div className="p-2.5 m-1.5 rounded-md bg-black/5 dark:bg-white/5 flex items-center gap-2.5 border border-black/5 dark:border-white/10">
                    <div className="w-8 h-8 rounded bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium truncate text-[#111b21] dark:text-[#e9edef]">
                        {mediaFileName || 'document.pdf'}
                      </p>
                      <p className="text-[10px] text-[#667781] dark:text-[#8696a0] uppercase">
                        Document
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Body Text ── */}
            <div className="px-3 pt-2 pb-1.5">
              {substitutedBody.trim() ? (
                <div className="text-[13px] leading-relaxed break-words font-sans">
                  {substitutedBody.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <br />}
                      <span dangerouslySetInnerHTML={{ __html: renderWAMarkdown(line) }} />
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <span className="text-[12.5px] italic text-[#667781] dark:text-[#8696a0] opacity-70">
                  Body text will appear here...
                </span>
              )}
            </div>

            {/* ── Footer text (optional) ── */}
            {footerText && (
              <div className="px-3 pb-1">
                <p className="text-[11px] text-[#667781] dark:text-[#8696a0] leading-snug">
                  {footerText}
                </p>
              </div>
            )}

            {/* ── Timestamp + Double Blue Ticks ── */}
            <div className="px-3 pb-1.5 flex items-center justify-end gap-1 -mt-0.5">
              <span className="text-[10px] text-[#667781] dark:text-white/60">
                10:42 AM
              </span>
              <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
            </div>

            {/* ── Action Buttons ── */}
            {validButtons.length > 0 && (
              <div className="border-t border-[#c6e6be] dark:border-[#1e5842] flex flex-col divide-y divide-[#c6e6be] dark:divide-[#1e5842]">
                {validButtons.map((btn) => (
                  <div
                    key={btn.id}
                    className="py-2 px-3 text-center text-[12.5px] font-semibold text-[#00a884] dark:text-[#53bdeb] flex items-center justify-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    {btn.type === 'QUICK_REPLY' && <Reply className="w-3 h-3 rotate-180 shrink-0" />}
                    {btn.type === 'URL' && <Globe className="w-3 h-3 shrink-0" />}
                    {btn.type === 'PHONE_NUMBER' && <Phone className="w-3 h-3 shrink-0" />}
                    <span className="truncate">{btn.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── WhatsApp Bottom Chat Input Bar ── */}
        <div className="relative z-10 pt-3 flex items-center gap-1.5">
          <div className="flex-1 h-9 bg-white dark:bg-[#202c33] rounded-full px-3 flex items-center gap-2 shadow-xs border border-black/5 dark:border-white/5">
            <Smile className="w-4 h-4 text-[#54656f] dark:text-[#8696a0] shrink-0 cursor-pointer" />
            <span className="text-[12px] text-[#8696a0] dark:text-[#8696a0] flex-1 truncate">
              Type a message
            </span>
            <Paperclip className="w-4 h-4 text-[#54656f] dark:text-[#8696a0] shrink-0 -rotate-45 cursor-pointer" />
          </div>
          <div className="w-9 h-9 rounded-full bg-[#00a884] text-white flex items-center justify-center shrink-0 shadow-xs cursor-pointer hover:bg-[#009575] transition-colors">
            <Mic className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
