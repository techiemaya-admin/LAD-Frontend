'use client';

/**
 * useVoiceSession — the hands-free loop on the Studio thread, as a state
 * machine:
 *
 *   idle → listening → thinking → speaking → listening … → ended
 *                 ↘ paused ↗   (mute, or typing in the composer)
 *
 * Listening runs the browser's SpeechRecognition (continuous, interim
 * results shown by the pill); a final result followed by ~1.2 s of silence
 * is sent as an owner turn with `voice: true` through the same `useSendChat`
 * the composer uses, so the thread shows the recognised words. Thinking is
 * the POST in flight. Speaking says each lad turn's `speech` (falling back to
 * its prose) through `tts.ts` — the one seam — then listens again. Barge-in:
 * speech, a tap on the pill's mic, or typed text cancels the voice mid-
 * sentence. Ending tears everything down.
 *
 * Nothing here decides what a spoken answer means: the backend matches it
 * against the pending picker / review / plan when `voice: true`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import type { ChatMessage } from '@lad/frontend-features/tenant-studio';
import { getSpeechRecognition, isMicBlocked, speechLang, type SpeechRecognitionLike } from '../../setup/speech';
import { cancel as cancelTts, fallbackSpeech, listVoices, onVoicesChanged, speak, ttsSupported, type TtsVoice } from './tts';

export type VoicePhase = 'idle' | 'listening' | 'thinking' | 'speaking' | 'paused' | 'ended';
export type VoiceError = 'unsupported' | 'denied' | 'audio' | null;

export interface VoiceSessionOptions {
  /**
   * Post the words as an owner turn with `voice: true`. Resolves the lad
   * turns to speak; `null` when the send failed (the thread already shows
   * the error — the loop just listens again).
   */
  sendTurn: (text: string) => Promise<ChatMessage[] | null>;
}

export interface VoiceSession {
  /** Both SpeechRecognition and speechSynthesis exist in this browser. */
  supported: boolean;
  phase: VoicePhase;
  /** A session is on screen (anything but idle / ended). */
  live: boolean;
  /** What the recogniser has heard so far in this utterance (interim + final). */
  interim: string;
  /** Seconds since the session started. */
  elapsed: number;
  muted: boolean;
  /** Typed text is in the composer: the mic waits until it is sent or cleared. */
  held: boolean;
  readAloud: boolean;
  voiceId: string | null;
  voices: TtsVoice[];
  error: VoiceError;
  /** `greeting`: words to say first (the thread's open lad turn — the seeded greeting on a fresh thread), then listen. */
  start: (opts?: { greeting?: string | null }) => void;
  end: () => void;
  setMuted: (muted: boolean) => void;
  /** Barge-in: stop the voice mid-sentence and listen. Resumes when paused. */
  interrupt: () => void;
  setReadAloud: (on: boolean) => void;
  setVoiceId: (id: string | null) => void;
  hold: (held: boolean) => void;
  /** Typed words while the session is live: same loop, no recognition. */
  sendText: (text: string) => void;
}

const SILENCE_MS = 1200;
const UTTERANCE_CAP_MS = 45_000;
const MIN_CHARS = 2;
const VOICE_KEY = 'studio.voice.voiceId';
const READ_ALOUD_KEY = 'studio.voice.readAloud';

interface RecognitionWithAbort extends SpeechRecognitionLike { abort?: () => void; onspeechstart?: (() => void) | null }

function readPref(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function writePref(key: string, value: string | null) {
  try { if (value === null) window.localStorage.removeItem(key); else window.localStorage.setItem(key, value); } catch { /* private mode: not remembered */ }
}

export function useVoiceSession({ sendTurn }: VoiceSessionOptions): VoiceSession {
  const { toast } = useToast();
  const [supported, setSupported] = useState(false);
  const [phase, setPhaseState] = useState<VoicePhase>('idle');
  const [interim, setInterim] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMutedState] = useState(false);
  const [held, setHeldState] = useState(false);
  const [readAloud, setReadAloudState] = useState(true);
  const [voiceId, setVoiceIdState] = useState<string | null>(null);
  const [voices, setVoices] = useState<TtsVoice[]>([]);
  const [error, setError] = useState<VoiceError>(null);

  const phaseRef = useRef<VoicePhase>('idle');
  const mutedRef = useRef(false);
  const heldRef = useRef(false);
  const readAloudRef = useRef(true);
  const voiceIdRef = useRef<string | null>(null);
  const recRef = useRef<RecognitionWithAbort | null>(null);
  const finalRef = useRef('');
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const capRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const queueRef = useRef<string[]>([]);
  const audioErrorsRef = useRef(0);
  const sendTurnRef = useRef(sendTurn);
  sendTurnRef.current = sendTurn;

  const setPhase = useCallback((p: VoicePhase) => { phaseRef.current = p; setPhaseState(p); }, []);
  const isLive = (p: VoicePhase) => p !== 'idle' && p !== 'ended';

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognition()) && ttsSupported());
    readAloudRef.current = readPref(READ_ALOUD_KEY) !== '0';
    setReadAloudState(readAloudRef.current);
    voiceIdRef.current = readPref(VOICE_KEY);
    setVoiceIdState(voiceIdRef.current);
    const refresh = () => setVoices(listVoices());
    refresh();
    // Chrome fills the list after load; Safari on first use.
    const off = onVoicesChanged(refresh);
    const late = setTimeout(refresh, 800);
    return () => { off(); clearTimeout(late); };
  }, []);

  /* ── timers ─────────────────────────────────────────────── */
  const clearUtteranceTimers = () => {
    if (silenceRef.current) clearTimeout(silenceRef.current);
    if (capRef.current) clearTimeout(capRef.current);
    silenceRef.current = null;
    capRef.current = null;
  };

  /* ── recognition ────────────────────────────────────────── */
  const stopRec = useCallback(() => {
    if (restartRef.current) clearTimeout(restartRef.current);
    restartRef.current = null;
    const rec = recRef.current;
    recRef.current = null;
    if (!rec) return;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    try { (rec.abort ?? rec.stop).call(rec); } catch { /* already stopped */ }
  }, []);

  // Declared as refs so the recogniser's callbacks always see the latest
  // versions without re-creating the recogniser.
  const commitRef = useRef<(text: string) => void>(() => undefined);
  const goListeningRef = useRef<() => void>(() => undefined);
  const endRef = useRef<() => void>(() => undefined);

  const startRec = useCallback(() => {
    if (recRef.current) return;
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    const rec = new Ctor() as RecognitionWithAbort;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = speechLang();
    rec.onresult = (e) => {
      if (recRef.current !== rec) return;
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript;
        else interimText += r[0].transcript;
      }
      const heard = `${finalRef.current}${interimText}`.trim();
      // Barge-in: the owner started talking over the voice.
      if (phaseRef.current === 'speaking' && heard.length >= MIN_CHARS) {
        queueRef.current = [];
        cancelTts();
        setPhase('listening');
      }
      if (phaseRef.current !== 'listening') return;
      setInterim(heard);
      if (heard && !capRef.current) capRef.current = setTimeout(() => commitRef.current(`${finalRef.current}`.trim() || heard), UTTERANCE_CAP_MS);
      if (silenceRef.current) clearTimeout(silenceRef.current);
      if (finalRef.current.trim()) silenceRef.current = setTimeout(() => commitRef.current(finalRef.current.trim()), SILENCE_MS);
    };
    rec.onerror = (e) => {
      if (recRef.current !== rec) return;
      if (e.error === 'aborted' || e.error === 'no-speech') return;
      if (isMicBlocked(e.error)) {
        toast({ title: 'Microphone blocked', description: 'Allow microphone access in your browser, or type instead.', variant: 'destructive' });
        setError('denied');
        endRef.current();
        return;
      }
      audioErrorsRef.current += 1;
      if (audioErrorsRef.current >= 3) {
        toast({ title: 'Voice chat stopped', description: 'The microphone or the connection kept failing — type instead.', variant: 'destructive' });
        setError('audio');
        endRef.current();
      }
    };
    rec.onend = () => {
      if (recRef.current !== rec) return;
      recRef.current = null;
      // Chrome ends a continuous session after a stretch of silence: pick it up again while we should be hearing.
      const p = phaseRef.current;
      if ((p === 'listening' || p === 'speaking') && !mutedRef.current && !heldRef.current) {
        restartRef.current = setTimeout(() => { restartRef.current = null; if (phaseRef.current === p && !recRef.current) startRec(); }, 250);
      }
    };
    try {
      rec.start();
      recRef.current = rec;
    } catch {
      // `InvalidStateError` when a previous instance is still winding down: try once more shortly.
      restartRef.current = setTimeout(() => { restartRef.current = null; if (!recRef.current && isLive(phaseRef.current)) startRec(); }, 400);
    }
  }, [setPhase, toast]);

  /* ── the loop ───────────────────────────────────────────── */
  const goListening = useCallback(() => {
    if (!isLive(phaseRef.current)) return;
    finalRef.current = '';
    setInterim('');
    clearUtteranceTimers();
    if (mutedRef.current || heldRef.current) {
      stopRec();
      setPhase('paused');
      return;
    }
    setPhase('listening');
    startRec();
  }, [setPhase, startRec, stopRec]);
  goListeningRef.current = goListening;

  const speakQueue = useCallback(() => {
    const next = queueRef.current.shift();
    if (next === undefined) { goListeningRef.current(); return; }
    setPhase('speaking');
    try {
      speak(next, {
        voiceId: voiceIdRef.current,
        onEnd: ({ interrupted }) => {
          if (!isLive(phaseRef.current)) return;
          // A barge-in or an interrupt already moved the phase on.
          if (interrupted) return;
          if (phaseRef.current !== 'speaking') return;
          speakQueue();
        },
      });
    } catch {
      // The seam must never strand the loop in "Speaking…".
      queueRef.current = [];
      goListeningRef.current();
    }
  }, [setPhase]);

  const commit = useCallback(async (raw: string, { typed = false }: { typed?: boolean } = {}) => {
    const words = raw.replace(/\s+/g, ' ').trim();
    clearUtteranceTimers();
    finalRef.current = '';
    setInterim('');
    if (!isLive(phaseRef.current)) return;
    if (!typed && words.length < MIN_CHARS) return; // noise
    queueRef.current = [];
    cancelTts();
    stopRec();
    setPhase('thinking');
    const turns = await sendTurnRef.current(words);
    if (!isLive(phaseRef.current) || phaseRef.current !== 'thinking') return;
    if (!turns || turns.length === 0 || !readAloudRef.current) { goListeningRef.current(); return; }
    queueRef.current = turns.filter((m) => m.role === 'lad').map(fallbackSpeech).filter((s) => s.length > 0);
    // Barge-in needs an open mic while the voice talks.
    if (!mutedRef.current && !heldRef.current) startRec();
    speakQueue();
  }, [setPhase, speakQueue, startRec, stopRec]);
  commitRef.current = (text) => { void commit(text); };

  const end = useCallback(() => {
    clearUtteranceTimers();
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    queueRef.current = [];
    cancelTts();
    stopRec();
    finalRef.current = '';
    setInterim('');
    if (isLive(phaseRef.current)) setPhase('ended');
  }, [setPhase, stopRec]);
  endRef.current = end;

  const start = useCallback((opts: { greeting?: string | null } = {}) => {
    if (isLive(phaseRef.current)) return;
    const ok = Boolean(getSpeechRecognition()) && ttsSupported();
    setSupported(ok);
    if (!ok) { setError('unsupported'); return; }
    setError(null);
    audioErrorsRef.current = 0;
    mutedRef.current = false;
    heldRef.current = false;
    setMutedState(false);
    setHeldState(false);
    startedAtRef.current = Date.now();
    setElapsed(0);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)), 1000);
    finalRef.current = '';
    setInterim('');
    const greeting = (opts.greeting ?? '').trim();
    if (greeting && readAloudRef.current) {
      // The question already on screen is asked aloud first; the mic is open meanwhile (barge-in).
      setPhase('speaking');
      queueRef.current = [greeting];
      startRec();
      speakQueue();
      return;
    }
    setPhase('listening');
    startRec();
  }, [setPhase, startRec, speakQueue]);

  const setMuted = useCallback((on: boolean) => {
    mutedRef.current = on;
    setMutedState(on);
    if (!isLive(phaseRef.current)) return;
    if (on) {
      if (phaseRef.current === 'listening') { clearUtteranceTimers(); finalRef.current = ''; setInterim(''); stopRec(); setPhase('paused'); }
      else if (phaseRef.current === 'speaking') stopRec(); // the voice finishes, then we pause instead of listening
    } else if (phaseRef.current === 'paused') {
      goListeningRef.current();
    } else if (phaseRef.current === 'speaking' && !heldRef.current) {
      startRec();
    }
  }, [setPhase, startRec, stopRec]);

  const hold = useCallback((on: boolean) => {
    if (heldRef.current === on) return;
    heldRef.current = on;
    setHeldState(on);
    if (!isLive(phaseRef.current)) return;
    if (on) {
      if (phaseRef.current === 'listening') { clearUtteranceTimers(); finalRef.current = ''; setInterim(''); stopRec(); setPhase('paused'); }
      else if (phaseRef.current === 'speaking') stopRec();
    } else if (phaseRef.current === 'paused' && !mutedRef.current) {
      goListeningRef.current();
    } else if (phaseRef.current === 'speaking' && !mutedRef.current) {
      startRec();
    }
  }, [setPhase, startRec, stopRec]);

  const interrupt = useCallback(() => {
    const p = phaseRef.current;
    if (p === 'speaking') {
      queueRef.current = [];
      cancelTts();
      goListeningRef.current();
    } else if (p === 'paused') {
      if (mutedRef.current) setMuted(false);
      else if (!heldRef.current) goListeningRef.current();
    }
  }, [setMuted]);

  const sendText = useCallback((text: string) => {
    if (!isLive(phaseRef.current)) return;
    heldRef.current = false;
    setHeldState(false);
    void commit(text, { typed: true });
  }, [commit]);

  const setReadAloud = useCallback((on: boolean) => {
    readAloudRef.current = on;
    setReadAloudState(on);
    writePref(READ_ALOUD_KEY, on ? '1' : '0');
    if (!on && phaseRef.current === 'speaking') { queueRef.current = []; cancelTts(); goListeningRef.current(); }
  }, []);

  const setVoiceId = useCallback((id: string | null) => {
    voiceIdRef.current = id;
    setVoiceIdState(id);
    writePref(VOICE_KEY, id);
  }, []);

  // Tear down with the component (leaving the Studio must not leave a voice talking).
  useEffect(() => () => {
    clearUtteranceTimers();
    if (tickRef.current) clearInterval(tickRef.current);
    queueRef.current = [];
    cancelTts();
    stopRec();
  }, [stopRec]);

  // Dev-only hook: the harness has no microphone, so a test feeds a final transcript.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return undefined;
    const w = window as unknown as { __studioVoice?: unknown };
    w.__studioVoice = {
      simulate: (text: string) => {
        const p = phaseRef.current;
        if (!isLive(p)) return 'not live';
        if (p === 'speaking') { queueRef.current = []; cancelTts(); setPhase('listening'); }
        if (p === 'paused') return 'paused';
        commitRef.current(text);
        return 'sent';
      },
      start, end,
      get phase() { return phaseRef.current; },
    };
    return () => { delete w.__studioVoice; };
  }, [start, end, setPhase]);

  return useMemo<VoiceSession>(() => ({
    supported, phase, live: isLive(phase), interim, elapsed, muted, held, readAloud, voiceId, voices, error,
    start, end, setMuted, interrupt, setReadAloud, setVoiceId, hold, sendText,
  }), [supported, phase, interim, elapsed, muted, held, readAloud, voiceId, voices, error, start, end, setMuted, interrupt, setReadAloud, setVoiceId, hold, sendText]);
}
