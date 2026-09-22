'use client';

/**
 * tts — the ONE place the Studio voice chat turns words into sound.
 *
 * v1 is the browser's `speechSynthesis` (no server TTS endpoint exists; the
 * VOAG voices live inside LiveKit calls). Everything the session needs —
 * `speak`, `cancel`, `listVoices`, `pickVoice` — goes through here, so a
 * server voice can replace this file later without touching the state
 * machine or the pill.
 *
 * `window.speechSynthesis` is read lazily on every call: tests swap it for
 * a mock after the page loads, and Safari populates the voice list late.
 */
import { speechLang } from '../../setup/speech';

export interface TtsVoice {
  /** Stable id for the picker and localStorage: `voiceURI`, falling back to the name. */
  id: string;
  name: string;
  lang: string;
  /** The name suggests a natural / premium / neural voice — preferred when nothing is chosen. */
  premium: boolean;
  default: boolean;
}

export interface SpeakOptions {
  voiceId?: string | null;
  /** 1.0 unless the owner changes it later. */
  rate?: number;
  onStart?: () => void;
  /** Fires exactly once: on natural end, on cancel (`interrupted: true`), or on error. */
  onEnd?: (info: { interrupted: boolean; error?: string }) => void;
}

export interface SpeakHandle {
  cancel: () => void;
}

/** The minimal surface we use, so a test mock only has to provide this much. */
interface SynthLike {
  speak: (u: SpeechSynthesisUtterance) => void;
  cancel: () => void;
  getVoices: () => SpeechSynthesisVoice[];
  speaking?: boolean;
  addEventListener?: (type: 'voiceschanged', cb: () => void) => void;
  removeEventListener?: (type: 'voiceschanged', cb: () => void) => void;
}

function synth(): SynthLike | null {
  if (typeof window === 'undefined') return null;
  const s = (window as unknown as { speechSynthesis?: SynthLike }).speechSynthesis;
  return s && typeof s.speak === 'function' ? s : null;
}

export function ttsSupported(): boolean {
  return synth() !== null && typeof window !== 'undefined' && typeof (window as unknown as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance === 'function';
}

const PREMIUM_HINT = /natural|premium|neural|enhanced|siri|google (us|uk) english|samantha|daniel|karen|moira|aria|jenny|guy|libby/i;

function toVoice(v: SpeechSynthesisVoice): TtsVoice {
  return { id: v.voiceURI || v.name, name: v.name, lang: v.lang, premium: PREMIUM_HINT.test(v.name), default: Boolean(v.default) };
}

/**
 * Voices for the owner's language (`speechLang()`), language-family matches
 * first (en-GB for an en-US browser), then everything else — never an empty
 * list when the browser has any voice at all.
 */
export function listVoices(): TtsVoice[] {
  const s = synth();
  if (!s) return [];
  let raw: SpeechSynthesisVoice[] = [];
  try { raw = s.getVoices() || []; } catch { raw = []; }
  const lang = speechLang().toLowerCase();
  const family = lang.split('-')[0];
  const rank = (v: SpeechSynthesisVoice) => {
    const l = (v.lang || '').toLowerCase().replace('_', '-');
    if (l === lang) return 0;
    if (l.split('-')[0] === family) return 1;
    return 2;
  };
  return raw
    .map((v, i) => ({ v, i, r: rank(v) }))
    .sort((a, b) => a.r - b.r || Number(b.v.default) - Number(a.v.default) || a.i - b.i)
    .map(({ v }) => toVoice(v));
}

/**
 * The voice to use: the chosen id when it still exists, else the first
 * premium-sounding voice in the owner's language, else the language's
 * default, else the first voice. `null` = let the browser decide.
 */
export function pickVoice(voices: TtsVoice[], preferredId?: string | null): TtsVoice | null {
  if (voices.length === 0) return null;
  if (preferredId) {
    const chosen = voices.find((v) => v.id === preferredId);
    if (chosen) return chosen;
  }
  const lang = speechLang().toLowerCase();
  const family = lang.split('-')[0];
  const inFamily = voices.filter((v) => (v.lang || '').toLowerCase().replace('_', '-').split('-')[0] === family);
  const pool = inFamily.length ? inFamily : voices;
  return pool.find((v) => v.premium) ?? pool.find((v) => v.default) ?? pool[0];
}

/** Re-runs `cb` when the browser's voice list changes (Chrome fills it after load). Returns the unsubscribe. */
export function onVoicesChanged(cb: () => void): () => void {
  const s = synth();
  if (!s || typeof s.addEventListener !== 'function') return () => undefined;
  s.addEventListener('voiceschanged', cb);
  return () => { s.removeEventListener?.('voiceschanged', cb); };
}

let current: { utterance: SpeechSynthesisUtterance; done: (interrupted: boolean, error?: string) => void } | null = null;

/** Stops whatever is being said; the pending `onEnd` fires with `interrupted: true`. */
export function cancel(): void {
  const s = synth();
  const c = current;
  current = null;
  try { s?.cancel(); } catch { /* nothing was playing */ }
  c?.done(true);
}

/**
 * Says `text` with the chosen voice. Cancels anything still playing first
 * (one voice at a time). Resolves through `onEnd` exactly once — Chrome
 * reports our own `cancel()` as an `interrupted` / `canceled` error, and
 * a long utterance can end without any event, so a watchdog based on the
 * text length closes the turn either way.
 */
export function speak(text: string, opts: SpeakOptions = {}): SpeakHandle {
  const s = synth();
  const words = text.trim();
  if (!s || !words || typeof SpeechSynthesisUtterance !== 'function') {
    opts.onEnd?.({ interrupted: false, error: s ? 'empty' : 'unsupported' });
    return { cancel: () => undefined };
  }
  cancel();
  let u: SpeechSynthesisUtterance;
  try {
    u = new SpeechSynthesisUtterance(words);
  } catch (err) {
    opts.onEnd?.({ interrupted: false, error: err instanceof Error ? err.message : 'utterance_failed' });
    return { cancel: () => undefined };
  }
  const voice = pickVoice(listVoices(), opts.voiceId);
  u.lang = voice?.lang || speechLang();
  if (voice) {
    let raw: SpeechSynthesisVoice[] = [];
    try { raw = s.getVoices() || []; } catch { raw = []; }
    const match = raw.find((v) => (v.voiceURI || v.name) === voice.id);
    // A voice the browser refuses (or a test double) must not stop the turn from being said.
    if (match) { try { u.voice = match; } catch { /* the language alone picks the voice */ } }
  }
  u.rate = opts.rate ?? 1;
  u.pitch = 1;

  let settled = false;
  let watchdog: ReturnType<typeof setTimeout> | null = null;
  const done = (interrupted: boolean, error?: string) => {
    if (settled) return;
    settled = true;
    if (watchdog) clearTimeout(watchdog);
    if (current?.utterance === u) current = null;
    opts.onEnd?.({ interrupted, error });
  };
  current = { utterance: u, done };
  u.onstart = () => { opts.onStart?.(); };
  u.onend = () => done(false);
  u.onerror = (e) => {
    const code = (e as { error?: string }).error || 'error';
    done(code === 'interrupted' || code === 'canceled', code === 'interrupted' || code === 'canceled' ? undefined : code);
  };
  // ~180 words a minute at rate 1, doubled, plus a floor: a missed `end` never leaves the loop stuck in "Speaking…".
  const seconds = Math.max(8, (words.split(/\s+/).length / 3) * 2 / (u.rate || 1));
  watchdog = setTimeout(() => done(false, 'timeout'), seconds * 1000);
  try {
    s.speak(u);
  } catch (err) {
    done(false, err instanceof Error ? err.message : 'speak_failed');
  }
  return { cancel: () => { if (!settled) cancel(); } };
}

/** The words to say for a lad turn: its `speech`, else its text blocks / text, cleaned of markdown. */
export function fallbackSpeech(turn: { speech?: string; text: string | null; blocks: Array<{ type: string; text?: string }> }): string {
  if (turn.speech && turn.speech.trim()) return turn.speech.trim();
  const fromBlocks = turn.blocks.filter((b) => b.type === 'text' && b.text && b.text.trim()).map((b) => b.text as string);
  const raw = (fromBlocks.length ? fromBlocks : [turn.text ?? '']).join(' ');
  return raw
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*_#`>]+/g, '')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
