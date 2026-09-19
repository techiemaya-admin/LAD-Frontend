'use client';

/**
 * Browser dictation — the minimal Web Speech API surface the setup steps
 * share (TS's DOM lib does not ship it). Step 1 dictates the brief, Step 7
 * a rewrite instruction, Step 8 the story; all three go through here so
 * "is the mic available?" has one answer.
 */
import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

export interface SpeechAlternativeLike { transcript: string }
export interface SpeechResultLike { isFinal: boolean; 0: SpeechAlternativeLike }
export interface SpeechResultEventLike { resultIndex: number; results: ArrayLike<SpeechResultLike> }
export interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechResultEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
export type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/** The browser's language for the recogniser, defaulting to English. */
export function speechLang(): string {
  return typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
}

/** True when the user denied the mic; callers show a "type instead" hint. */
export function isMicBlocked(error: string): boolean {
  return error === 'not-allowed' || error === 'service-not-allowed';
}

/**
 * Dictate into a field: the mic appends to whatever is there until it is
 * tapped again (or `maxSeconds` runs out). `onText` receives the full text
 * including interim results, so the field updates as the tenant speaks.
 */
export function useDictation(onText: (text: string) => void, maxSeconds?: number) {
  const { toast } = useToast();
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const baseRef = useRef('');
  const finalRef = useRef('');
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  const clearTick = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    setSecondsLeft(null);
  };

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognition()));
    return () => {
      recRef.current?.stop();
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const stop = () => {
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
    clearTick();
  };

  const start = (current: string) => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = speechLang();
    baseRef.current = current.trim() ? `${current.trim()} ` : '';
    finalRef.current = '';
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript;
        else interim += r[0].transcript;
      }
      onTextRef.current((baseRef.current + finalRef.current + interim).trimStart());
    };
    rec.onerror = (e) => {
      if (isMicBlocked(e.error)) toast({ title: 'Microphone blocked', description: 'Allow microphone access in your browser, or type instead.', variant: 'destructive' });
      if (e.error !== 'aborted') { setListening(false); clearTick(); }
    };
    rec.onend = () => { setListening(false); recRef.current = null; clearTick(); };
    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
      if (maxSeconds && maxSeconds > 0) {
        let left = maxSeconds;
        setSecondsLeft(left);
        tickRef.current = setInterval(() => {
          left -= 1;
          setSecondsLeft(left);
          if (left <= 0) stop();
        }, 1000);
      }
    } catch {
      setListening(false);
      clearTick();
    }
  };

  return { supported, listening, secondsLeft, start, stop };
}
