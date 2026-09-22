'use client';

/**
 * Composer — the box at the bottom of the thread. Enter sends, Shift+Enter
 * breaks a line, the mic dictates into it (the same Web Speech surface the
 * setup steps use), and "+" offers the quick intents so a tenant who does
 * not know what to type has six good things to say. The waveform button
 * beside the mic starts (or ends) a hands-free voice session; while one is
 * live the box still takes typed text, and typing holds the mic until the
 * line is sent. Pinned to the bottom, safe-area aware, so it stays above a
 * phone keyboard.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AudioLines, Flag, HelpCircle, ListChecks, Loader2, MessageCircleQuestion, Mic, MicOff, Plus, Rocket, RotateCcw, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useDictation } from '../setup/speech';
import { CHAT_COLUMN, COMPOSER_BOX, SEND_CIRCLE, VOICE_BTN, VOICE_BTN_IDLE, VOICE_BTN_LIVE } from './chat-theme';

export interface QuickIntent {
  intent: string;
  label: string;
  icon: typeof Flag;
  /** Owner/admin only (the server refuses it for members anyway). */
  ownerOnly?: boolean;
}

/** The six most useful things to say, in the order they help a new tenant. */
export const QUICK_INTENTS: QuickIntent[] = [
  { intent: 'status', label: "What's my status?", icon: Flag },
  { intent: 'launch', label: "What's blocking go-live?", icon: Rocket },
  { intent: 'questions', label: 'Answer your open questions', icon: MessageCircleQuestion },
  { intent: 'first_campaign', label: 'Draft my first campaign', icon: ListChecks, ownerOnly: true },
  { intent: 'undo', label: 'Undo the last change', icon: RotateCcw, ownerOnly: true },
  { intent: 'help', label: 'What can I ask you?', icon: HelpCircle },
];

export interface ComposerProps {
  onSend: (text: string) => void;
  onQuick: (q: QuickIntent) => void;
  sending: boolean;
  canAct: boolean;
  placeholder?: string;
  /** Text to put in the box (a failed send hands the words back). Applied whenever it changes. */
  restore?: { text: string; at: number } | null;
  /** Something rendered above the box, inside the sticky footer (a hint, the voice pill). */
  above?: ReactNode;
  /** The voice session the waveform button drives; omitted = no button. */
  voice?: ComposerVoice;
}

export interface ComposerVoice {
  /** SpeechRecognition + speechSynthesis exist; otherwise the button is disabled with the reason as its title. */
  supported: boolean;
  live: boolean;
  onStart: () => void;
  onEnd: () => void;
  /** Typed text is in the box: the session's mic waits (`true`) until it is sent or cleared (`false`). */
  onHold: (held: boolean) => void;
}

export const VOICE_UNSUPPORTED_TITLE = 'Voice chat needs Chrome, Edge or Safari.';

const MAX_ROWS = 6;

export default function Composer({ onSend, onQuick, sending, canAct, placeholder = 'Ask Mr LAD anything, or tell it what to change…', restore = null, above, voice }: ComposerProps) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const dictation = useDictation((text) => setValue(text), 90);
  const voiceLive = Boolean(voice?.live);
  // The session owns the microphone while it is live: the dictation mic steps aside.
  const showDictation = dictation.supported && !voiceLive;

  // Typing while the voice session listens: hold the mic until the line goes.
  const onHold = voice?.onHold;
  const typing = voiceLive && value.trim().length > 0;
  useEffect(() => {
    if (!onHold || !voiceLive) return;
    onHold(typing);
  }, [typing, voiceLive, onHold]);

  useEffect(() => {
    if (restore) { setValue(restore.text); ref.current?.focus(); }
  }, [restore]);

  // Grow with the text, up to MAX_ROWS lines.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const line = parseFloat(getComputedStyle(el).lineHeight) || 20;
    el.style.height = `${Math.min(el.scrollHeight, line * MAX_ROWS + 16)}px`;
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if (!text || sending) return;
    if (dictation.listening) dictation.stop();
    onSend(text);
    setValue('');
  };

  return (
    <div className="sticky bottom-0 z-10 bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 dark:bg-[#000724] sm:px-5" data-testid="chat-composer">
      <div className={CHAT_COLUMN}>
        {above}
        <div className="flex items-end gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="icon" variant="outline" className="h-10 w-10 shrink-0 rounded-full border-[#e5e7eb] bg-white text-[#374151] hover:border-[#0b1957] hover:bg-[#f2f6fa] hover:text-[#0b1957] dark:border-[#1e293b] dark:bg-[#1A2A43] dark:text-white dark:hover:bg-[#253456]" aria-label="Quick actions" disabled={sending} data-testid="chat-quick-menu">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-64">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Things you can say</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {QUICK_INTENTS.filter((q) => canAct || !q.ownerOnly).map((q) => {
                const Icon = q.icon;
                return (
                  <DropdownMenuItem key={q.intent} onSelect={() => onQuick(q)} data-testid={`chat-quick-${q.intent}`}>
                    <Icon className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />{q.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="relative min-w-0 flex-1">
            <label htmlFor="studio-chat-input" className="sr-only">Message Mr LAD</label>
            <textarea
              id="studio-chat-input"
              ref={ref}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
              onFocus={() => { setTimeout(() => ref.current?.scrollIntoView({ block: 'nearest' }), 250); }}
              placeholder={dictation.listening ? 'Listening… tap the mic again when you are done.' : voiceLive ? 'Or type here — the mic waits while you do…' : placeholder}
              rows={1}
              enterKeyHint="send"
              className={`block w-full resize-none px-[18px] py-3 text-[14.5px] leading-[1.55] text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 dark:text-white dark:placeholder:text-slate-500 ${COMPOSER_BOX} ${showDictation && voice ? 'pr-[5.25rem]' : showDictation || voice ? 'pr-12' : ''}`}
              data-testid="chat-input"
            />
            {voice && (
              <button
                type="button"
                onClick={() => (voiceLive ? voice.onEnd() : voice.onStart())}
                disabled={!voice.supported}
                aria-pressed={voiceLive}
                aria-label={voiceLive ? 'End voice chat' : 'Start voice chat'}
                title={!voice.supported ? VOICE_UNSUPPORTED_TITLE : voiceLive ? 'End voice chat' : 'Voice chat — talk to Mr LAD'}
                className={`absolute bottom-2 right-2 ${VOICE_BTN} ${voiceLive ? VOICE_BTN_LIVE : VOICE_BTN_IDLE}`}
                data-testid="chat-voice"
              >
                <AudioLines className="h-4 w-4" />
              </button>
            )}
            {showDictation && (
              <button
                type="button"
                onClick={() => (dictation.listening ? dictation.stop() : dictation.start(value))}
                aria-pressed={dictation.listening}
                aria-label={dictation.listening ? 'Stop dictating' : 'Dictate with your microphone'}
                title={dictation.listening ? 'Stop dictating' : 'Dictate with your microphone'}
                className={`absolute bottom-2 ${voice ? 'right-11' : 'right-2'} inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${dictation.listening ? 'bg-rose-500 text-white animate-pulse motion-reduce:animate-none' : 'text-gray-400 hover:bg-slate-100 hover:text-foreground dark:hover:bg-white/10'}`}
                data-testid="chat-mic"
              >
                {dictation.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
          </div>
          <Button type="button" size="icon" onClick={submit} disabled={sending || !value.trim()} aria-label="Send" className={`${SEND_CIRCLE} disabled:opacity-100`} data-testid="chat-send">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        {dictation.listening && dictation.secondsLeft !== null && (
          <p className="mt-1 text-[11px] text-muted-foreground" aria-live="polite">{dictation.secondsLeft}s left</p>
        )}
      </div>
    </div>
  );
}
