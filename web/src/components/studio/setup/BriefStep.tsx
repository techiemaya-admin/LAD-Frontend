'use client';

/**
 * BriefStep — Step 1: the brain-dump.
 *
 * The tenant talks (Web Speech API, when the browser has it) or types about
 * their business, adds up to five links, and asks the manager to propose the
 * whole setup. The proposal comes back as a BriefPlan the PlanReview card
 * edits; nothing is saved here.
 */
import { useEffect, useRef, useState } from 'react';
import { Globe, Instagram, Link2, Linkedin, Loader2, Mic, MicOff, Plus, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { isApiError } from '@lad/shared/apiError';
import { useProposeBrief, type BriefErrorReason, type BriefResult } from '@lad/frontend-features/tenant-studio';

/* The brief endpoint's 400/502 reasons, in the tenant's words. */
const REASON_COPY: Record<BriefErrorReason, string> = {
  empty_brief: 'Say a little more about your business first.',
  brief_too_long: 'That is more than it can read at once — trim it down and try again.',
  too_many_links: 'Up to 5 links.',
  bad_url: 'One of the links is not a valid address.',
  no_plan: 'It could not write a plan from that. Try again, or add a line or two.',
};

function describeBriefError(err: unknown): string {
  if (isApiError(err)) {
    const body = err.body as { reason?: BriefErrorReason; url?: string; error?: string } | undefined;
    const reason = body?.reason;
    if (reason && REASON_COPY[reason]) {
      return reason === 'bad_url' && body?.url ? `${REASON_COPY[reason]} (${body.url})` : REASON_COPY[reason];
    }
    if (err.status === 401) return 'Your session has expired — sign in again.';
  }
  return err instanceof Error ? err.message : 'Try again in a moment.';
}

/* Minimal Web Speech API surface — TS's DOM lib does not ship it. */
interface SpeechAlternativeLike { transcript: string }
interface SpeechResultLike { isFinal: boolean; 0: SpeechAlternativeLike }
interface SpeechResultEventLike { resultIndex: number; results: ArrayLike<SpeechResultLike> }
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechResultEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

type LinkKind = 'website' | 'linkedin' | 'instagram' | 'other';
interface LinkRow { id: number; kind: LinkKind; url: string }

const MAX_LINKS = 5;
const CHIPS: { kind: LinkKind; label: string; icon: typeof Globe; placeholder: string }[] = [
  { kind: 'website', label: 'Website', icon: Globe, placeholder: 'https://yourcompany.com' },
  { kind: 'linkedin', label: 'LinkedIn page', icon: Linkedin, placeholder: 'https://linkedin.com/company/…' },
  { kind: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/…' },
];
const KIND_META: Record<LinkKind, { icon: typeof Globe; placeholder: string; label: string }> = {
  website: { icon: Globe, placeholder: 'https://yourcompany.com', label: 'Website' },
  linkedin: { icon: Linkedin, placeholder: 'https://linkedin.com/company/…', label: 'LinkedIn page' },
  instagram: { icon: Instagram, placeholder: 'https://instagram.com/…', label: 'Instagram' },
  other: { icon: Link2, placeholder: 'https://…', label: 'Link' },
};

const PLACEHOLDER = `What do you sell, to whom, and what makes you different?
Where do your best customers come from today? What should we never do or say?
Rough numbers help: deal size, how many new customers a month you want.`;

export interface BriefStepProps {
  onProposed: (result: BriefResult, input: { brief: string; links: string[] }) => void;
}

export default function BriefStep({ onProposed }: BriefStepProps) {
  const { toast } = useToast();
  const propose = useProposeBrief();
  const [brief, setBrief] = useState('');
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const baseRef = useRef('');
  const finalRef = useRef('');
  const nextId = useRef(1);

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognition()));
    return () => { recRef.current?.stop(); };
  }, []);

  const stopListening = () => {
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
  };

  const startListening = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
    baseRef.current = brief.trim() ? `${brief.trim()} ` : '';
    finalRef.current = '';
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript;
        else interim += r[0].transcript;
      }
      setBrief((baseRef.current + finalRef.current + interim).trimStart());
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        toast({ title: 'Microphone blocked', description: 'Allow microphone access in your browser, or type instead.', variant: 'destructive' });
      }
      if (e.error !== 'aborted') setListening(false);
    };
    rec.onend = () => { setListening(false); recRef.current = null; };
    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const addLink = (kind: LinkKind) => {
    if (links.length >= MAX_LINKS) return;
    setLinks((rows) => [...rows, { id: nextId.current++, kind, url: '' }]);
  };
  const setUrl = (id: number, url: string) => setLinks((rows) => rows.map((r) => (r.id === id ? { ...r, url } : r)));
  const removeLink = (id: number) => setLinks((rows) => rows.filter((r) => r.id !== id));

  const cleanLinks = links.map((l) => l.url.trim()).filter(Boolean);
  const canPropose = brief.trim().length >= 20 && !propose.isPending;

  const submit = () => {
    if (!canPropose) return;
    if (listening) stopListening();
    const input = { brief: brief.trim(), links: cleanLinks };
    propose.mutate(input, {
      onSuccess: (result) => onProposed(result, input),
      onError: (err) => {
        toast({ title: 'Could not write your plan', description: describeBriefError(err), variant: 'destructive' });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold leading-snug sm:text-2xl">
          Tell your new business development manager about your business
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Three minutes, spoken or typed. It will propose your whole setup and you approve it.
        </p>
      </div>

      <div className="relative">
        <label htmlFor="setup-brief" className="sr-only">Your brief</label>
        <Textarea
          id="setup-brief"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={9}
          disabled={propose.isPending}
          className={`min-h-[220px] resize-y text-base leading-relaxed ${speechSupported ? 'pr-14' : ''}`}
          aria-describedby="setup-brief-hint"
        />
        {speechSupported && (
          <Button
            type="button"
            size="icon"
            variant={listening ? 'destructive' : 'outline'}
            className={`absolute right-2 top-2 rounded-full ${listening ? 'animate-pulse' : 'text-foreground'}`}
            onClick={listening ? stopListening : startListening}
            disabled={propose.isPending}
            aria-pressed={listening}
            aria-label={listening ? 'Stop dictating' : 'Dictate with your microphone'}
            title={listening ? 'Stop dictating' : 'Dictate with your microphone'}
          >
            {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        )}
        <p id="setup-brief-hint" className="mt-1.5 text-xs text-muted-foreground" aria-live="polite">
          {listening
            ? 'Listening… speak naturally; tap the mic again when you are done.'
            : speechSupported
              ? 'Tap the mic to talk instead of typing.'
              : 'Type as much as you like — rough notes are fine.'}
        </p>
      </div>

      <div className="space-y-2.5">
        <p className="text-sm font-medium">Links it should read</p>
        <div className="flex flex-wrap gap-2">
          {CHIPS.map(({ kind, label, icon: Icon }) => (
            <button
              key={kind}
              type="button"
              onClick={() => addLink(kind)}
              disabled={links.length >= MAX_LINKS || propose.isPending}
              className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon className="h-3.5 w-3.5" />{label}<Plus className="h-3 w-3 text-muted-foreground" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => addLink('other')}
            disabled={links.length >= MAX_LINKS || propose.isPending}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed bg-background px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Link2 className="h-3.5 w-3.5" />Other link
          </button>
        </div>
        {links.length > 0 && (
          <ul className="space-y-2">
            {links.map((row) => {
              const meta = KIND_META[row.kind];
              const Icon = meta.icon;
              return (
                <li key={row.id} className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground" title={meta.label}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <Input
                    type="url"
                    inputMode="url"
                    value={row.url}
                    onChange={(e) => setUrl(row.id, e.target.value)}
                    placeholder={meta.placeholder}
                    aria-label={`${meta.label} URL`}
                    disabled={propose.isPending}
                    className="h-9"
                  />
                  <Button type="button" size="icon-sm" variant="ghost" onClick={() => removeLink(row.id)} aria-label={`Remove ${meta.label}`} disabled={propose.isPending}>
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Up to {MAX_LINKS} links. {links.length > 0 ? `${links.length} of ${MAX_LINKS} added.` : 'Your website is the most useful one.'}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="button" size="lg" onClick={submit} disabled={!canPropose} className="w-full sm:w-auto">
          {propose.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Propose my setup
        </Button>
        {propose.isPending ? (
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            Reading your website and writing your plan…
          </p>
        ) : brief.trim().length > 0 && brief.trim().length < 20 ? (
          <p className="text-xs text-muted-foreground">A sentence or two more and it can start.</p>
        ) : null}
      </div>
    </div>
  );
}
