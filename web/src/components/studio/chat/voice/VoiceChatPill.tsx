'use client';

/**
 * VoiceChatPill — the Grok-style pill above the composer while a voice
 * session is live: waveform + "Voice chat", the state ("Listening…" /
 * "Thinking…" / "Speaking…" / "Paused"), the words heard so far, an mm:ss
 * timer, a "…" menu (mute / read aloud / voice / end) and a chevron that
 * folds it to one line.
 *
 * The waveform is a button: it interrupts the voice (barge-in), resumes a
 * paused mic, or mutes a listening one. `role="status"` + `aria-live=
 * "polite"` so the state reads out; the bars animate only while listening
 * or speaking and stay still under reduced motion (studio.css).
 */
import { useState } from 'react';
import { AudioLines, ChevronDown, ChevronUp, Loader2, Mic, MicOff, MoreHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { VOICE_PILL, VOICE_PILL_BREAKOUT, VOICE_PILL_ICON, VOICE_PILL_ICON_ACTIVE, VOICE_PILL_ICON_IDLE } from '../chat-theme';
import type { VoicePhase, VoiceSession } from './useVoiceSession';

const PHASE_LABEL: Record<VoicePhase, string> = {
  idle: '', ended: '', listening: 'Listening…', thinking: 'Thinking…', speaking: 'Speaking…', paused: 'Paused',
};

function mmss(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Four bars; `live` animates them, `speaking` a touch faster. */
export function Waveform({ live, speaking, className = '' }: { live: boolean; speaking?: boolean; className?: string }) {
  return (
    <span className={`inline-flex h-4 w-4 items-end justify-center gap-[2px] ${live ? 'studio-voice-bars-live' : ''} ${speaking ? 'studio-voice-bars-speaking' : ''} ${className}`} aria-hidden>
      {[0, 1, 2, 3].map((i) => <span key={i} className="studio-voice-bar h-full w-[2.5px] rounded-full bg-current" />)}
    </span>
  );
}

export interface VoiceChatPillProps {
  session: VoiceSession;
}

export default function VoiceChatPill({ session }: VoiceChatPillProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { phase } = session;
  if (!session.live) return null;

  const listening = phase === 'listening';
  const speaking = phase === 'speaking';
  const thinking = phase === 'thinking';
  const paused = phase === 'paused';
  const pausedWhy = paused ? (session.muted ? 'Microphone muted' : session.held ? 'Finish typing, or clear the box' : 'Paused') : null;
  const iconLabel = speaking ? 'Interrupt and speak' : paused ? 'Resume listening' : listening ? 'Mute microphone' : 'Thinking';
  const onIcon = () => {
    if (speaking) session.interrupt();
    else if (paused) session.interrupt();
    else if (listening) session.setMuted(true);
  };

  return (
    <div
      className={`mb-2 ${VOICE_PILL} ${VOICE_PILL_BREAKOUT}`}
      role="status"
      aria-live="polite"
      aria-label={`Voice chat: ${PHASE_LABEL[phase]}`}
      data-testid="voice-pill"
      data-phase={phase}
      data-collapsed={collapsed ? '1' : '0'}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onIcon}
          disabled={thinking}
          aria-label={iconLabel}
          title={iconLabel}
          className={`${VOICE_PILL_ICON} ${listening || speaking ? VOICE_PILL_ICON_ACTIVE : VOICE_PILL_ICON_IDLE}`}
          data-testid="voice-pill-icon"
        >
          {thinking ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : paused ? <MicOff className="h-4 w-4" /> : <Waveform live={listening || speaking} speaking={speaking} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-2 text-[13px]">
            <span className="shrink-0 whitespace-nowrap font-semibold text-[#0b1957] dark:text-white">Voice chat</span>
            <span className="truncate text-gray-600 dark:text-slate-300" data-testid="voice-pill-state">{PHASE_LABEL[phase]}</span>
          </div>
          {!collapsed && (
            <p className="mt-0.5 min-h-[16px] truncate text-[12px] text-gray-500 dark:text-slate-400" data-testid="voice-pill-interim">
              {listening ? (session.interim || 'Say something — I send it after a short pause.') : paused ? pausedWhy : speaking ? (session.readAloud ? 'Talk over me any time.' : '') : 'One moment.'}
            </p>
          )}
        </div>
        <span className="shrink-0 tabular-nums text-[12px] text-gray-500 dark:text-slate-400" aria-label={`Elapsed ${mmss(session.elapsed)}`} data-testid="voice-pill-timer">{mmss(session.elapsed)}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="icon-sm" variant="ghost" aria-label="Voice chat options" className="shrink-0 rounded-full text-gray-600 hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/10" data-testid="voice-pill-menu">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-64">
            <DropdownMenuItem onSelect={() => session.setMuted(!session.muted)} data-testid="voice-menu-mute">
              {session.muted ? <Mic className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden /> : <MicOff className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />}
              {session.muted ? 'Resume microphone' : 'Mute microphone'}
            </DropdownMenuItem>
            <DropdownMenuCheckboxItem checked={session.readAloud} onCheckedChange={(v) => session.setReadAloud(Boolean(v))} data-testid="voice-menu-read-aloud">
              Read replies aloud
            </DropdownMenuCheckboxItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger data-testid="voice-menu-voice">
                <AudioLines className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />
                <span className="truncate">Voice: {session.voices.find((v) => v.id === session.voiceId)?.name ?? 'Automatic'}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="max-h-72 w-64 overflow-y-auto">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Voices on this device</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={session.voiceId ?? ''} onValueChange={(v) => session.setVoiceId(v || null)}>
                    <DropdownMenuRadioItem value="">Automatic</DropdownMenuRadioItem>
                    {session.voices.map((v) => (
                      <DropdownMenuRadioItem key={v.id} value={v.id} className="pr-2">
                        <span className="truncate">{v.name}</span>
                        <span className="ml-auto pl-2 text-[11px] text-muted-foreground">{v.lang}</span>
                      </DropdownMenuRadioItem>
                    ))}
                    {session.voices.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">No voices reported yet — the browser fills this in a moment.</p>}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={session.end} className="text-rose-600 focus:text-rose-600 dark:text-rose-400" data-testid="voice-menu-end">
              <X className="mr-2 h-4 w-4" aria-hidden />End voice chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand voice chat' : 'Collapse voice chat'}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/10"
          data-testid="voice-pill-collapse"
        >
          {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/**
 * `/studio?voice=1` before any click: browsers only let a page speak after a
 * gesture, so the session waits for this tap.
 */
export function VoiceStartPill({ onStart, onDismiss, supported }: { onStart: () => void; onDismiss: () => void; supported: boolean }) {
  return (
    <div className={`mb-2 ${VOICE_PILL} ${VOICE_PILL_BREAKOUT}`} role="status" data-testid="voice-start-pill">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onStart}
          disabled={!supported}
          title={supported ? 'Start voice chat' : 'Voice chat needs Chrome, Edge or Safari.'}
          className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="voice-start-pill-button"
        >
          <span className={`${VOICE_PILL_ICON} ${VOICE_PILL_ICON_ACTIVE}`}><Waveform live={false} /></span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-[#0b1957] dark:text-white">{supported ? 'Tap to start voice chat' : 'Voice chat is not available here'}</span>
            <span className="block truncate text-[12px] text-gray-500 dark:text-slate-400">{supported ? 'Talk to Mr LAD; it answers out loud and asks the next question.' : 'Voice chat needs Chrome, Edge or Safari.'}</span>
          </span>
        </button>
        <button type="button" onClick={onDismiss} aria-label="Not now" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/10" data-testid="voice-start-pill-dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
