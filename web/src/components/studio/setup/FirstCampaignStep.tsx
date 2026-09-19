'use client';

/**
 * FirstCampaignStep — Step 7: "Your first campaign".
 *
 * Who to reach first, on which channel, saying what. The fastest path is
 * "Draft one for me": the backend picks the offer and audience from the
 * profile, the readiest channel from Step 6, and writes three messages over
 * ten days plus a builder-ready template (POST /studio/first-campaign/draft).
 * The tenant then reads the three messages one at a time, keeps or rewrites
 * each, and confirms. Nothing sends from here — the draft only goes live
 * from the campaign builder ("Review and send") or the last step.
 *
 * Edits to a message body save on blur (PUT, no LLM); a rewrite is one LLM
 * call for that message only.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check, CheckCircle2, ChevronLeft, ChevronRight, LayoutTemplate, Linkedin, Loader2, Mail, MessageCircle, Mic, MicOff,
  Pencil, RefreshCw, Send, Sparkles, Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { isApiError } from '@lad/shared/apiError';
import { useBusinessProfile } from '@lad/frontend-features/ai-icp-assistant';
import {
  useDraftFirstCampaign,
  useFirstCampaign,
  useRewriteFirstCampaign,
  useUpdateFirstCampaign,
  type FirstCampaignChannel,
  type FirstCampaignDraft,
  type FirstCampaignErrorReason,
  type FirstCampaignMessage,
  type FirstCampaignResult,
  type StudioChannelSummary,
} from '@lad/frontend-features/tenant-studio';
import { useDictation } from './speech';
import { BORDER, CARD, CHIP_BASE, CHIP_IDLE, CHIP_SELECTED, CTA_PRIMARY, H_STEP, INPUT_FOCUS, LINK, PANEL, READY_PULSE, SKELETON, STATUS, TINT } from '../studio-theme';

/** Where this step sits in the 9-step setup. */
export const FIRST_CAMPAIGN_STEP = 7;

/** The builder reads this query flag and loads the draft as its starting template. */
export const FIRST_CAMPAIGN_BUILDER_HREF = '/campaigns/workflow?from=studio-first-campaign';

const DRAFTABLE: FirstCampaignChannel[] = ['linkedin', 'email', 'whatsapp'];
const CHANNEL_META: Record<FirstCampaignChannel, { label: string; icon: typeof Mail }> = {
  linkedin: { label: 'LinkedIn', icon: Linkedin },
  email: { label: 'Email', icon: Mail },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle },
};
const MIN_PEOPLE = 10;
const MAX_PEOPLE = 200;
const DEFAULT_PEOPLE = 50;
const BODY_MAX = 1200;
const SUBJECT_MAX = 120;

const REASON_COPY: Record<FirstCampaignErrorReason, string> = {
  channel_not_draftable: 'It cannot draft for that channel yet — pick LinkedIn, email or WhatsApp.',
  no_offering: 'Tell it what you are offering first — pick one above or type your own.',
  validation: 'Something in the draft is not right. Check the messages and try again.',
  no_ready_channel: 'No channel is ready yet. Switch one on and give it a first line in step 6, then come back.',
  no_draft: 'There is no draft to work on yet — draft one first.',
  no_rewrite: 'It could not come up with a better version this time. Try again, or say what should change.',
};

function describeError(err: unknown): string {
  if (isApiError(err)) {
    const body = err.body as { error?: string; message?: string; details?: unknown } | undefined;
    const reason = body?.error as FirstCampaignErrorReason | undefined;
    if (reason && REASON_COPY[reason]) return REASON_COPY[reason];
    if (err.status === 401) return 'Your session has expired — sign in again.';
    if (err.status === 403) return 'Only an owner or admin can change the first campaign.';
    if (body?.message) return body.message;
    if (body?.error) return body.error;
  }
  return err instanceof Error ? err.message : 'Try again in a moment.';
}

/** Offer lines from whichever profile field the tenant's pack filled. */
function offeringLines(profile: Record<string, unknown> | null | undefined): string[] {
  if (!profile) return [];
  const raw = [profile.offerings, profile.mainOfferings, profile.productsServices].find((v) => typeof v === 'string' && v.trim()) as string | undefined;
  if (!raw) return [];
  return raw
    .split(/\r?\n|;|\u2022/)
    .map((l) => l.replace(/^[\s\-–*\d.)]+/, '').trim())
    .filter((l) => l.length >= 3 && l.length <= 120)
    .slice(0, 6);
}

function dayLabel(day: number): string {
  if (day <= 0) return 'Day 1';
  return `Day ${day + 1}`;
}

function messagesEqual(a: FirstCampaignMessage[], b: FirstCampaignMessage[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((m, i) => m.body === b[i].body && (m.subject ?? '') === (b[i].subject ?? '') && m.day === b[i].day);
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                         */
/* ------------------------------------------------------------------ */

function Chip({ selected, onClick, disabled, children }: { selected: boolean; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`${CHIP_BASE} gap-1.5 px-3 py-1.5 text-xs ${selected ? CHIP_SELECTED : CHIP_IDLE}`}
    >
      {selected && <Check className="h-3 w-3" />}{children}
    </button>
  );
}

function Card({ title, hint, children, className = '', 'data-testid': testId }: { title: string; hint?: string; children: ReactNode; className?: string; 'data-testid'?: string }) {
  return (
    <section className={`${CARD} p-4 ${className}`} data-testid={testId}>
      <h3 className="font-semibold tracking-tight">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Message card                                                         */
/* ------------------------------------------------------------------ */

function MessageCard({ index, message, channel, from, kept, rewriting, saving, onChange, onBlur, onKeep, onRewrite }: {
  index: number;
  message: FirstCampaignMessage;
  channel: FirstCampaignChannel;
  from: string | null;
  kept: boolean;
  rewriting: boolean;
  saving: boolean;
  onChange: (next: FirstCampaignMessage) => void;
  onBlur: () => void;
  onKeep: () => void;
  onRewrite: (instruction: string) => void;
}) {
  const [askRewrite, setAskRewrite] = useState(false);
  const [instruction, setInstruction] = useState('');
  const mic = useDictation(setInstruction);
  const isEmail = channel === 'email';
  const submitRewrite = () => {
    if (mic.listening) mic.stop();
    onRewrite(instruction.trim());
    setAskRewrite(false);
    setInstruction('');
  };
  return (
    <section className={`${kept ? 'ring-1 ring-emerald-400/50 dark:ring-emerald-400/40' : ''} ${CARD} p-4`} data-testid={`message-card-${index}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold tracking-tight">Message {index + 1} · {dayLabel(message.day)}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {index === 0 ? 'The first thing they read' : index === 1 ? 'A nudge three days later' : 'A last note ten days in'}{from ? ` · from ${from}` : ''}
          </p>
        </div>
        {kept && <CheckCircle2 className={`h-5 w-5 shrink-0 ${TINT.ready} ${READY_PULSE}`} aria-label="kept" />}
      </div>
      <div className="mt-3 space-y-2">
        {isEmail && (
          <div>
            <Label htmlFor={`fc-subject-${index}`} className="text-xs">Subject</Label>
            <Input
              id={`fc-subject-${index}`}
              value={message.subject ?? ''}
              maxLength={SUBJECT_MAX}
              onChange={(e) => onChange({ ...message, subject: e.target.value })}
              onBlur={onBlur}
              disabled={rewriting}
              className={`mt-1 h-9 text-sm ${INPUT_FOCUS}`}
            />
          </div>
        )}
        <div>
          <Label htmlFor={`fc-body-${index}`} className="sr-only">Message {index + 1}</Label>
          <Textarea
            id={`fc-body-${index}`}
            value={message.body}
            maxLength={BODY_MAX}
            rows={isEmail ? 7 : 5}
            onChange={(e) => onChange({ ...message, body: e.target.value })}
            onBlur={onBlur}
            disabled={rewriting}
            className={`min-h-[120px] text-sm leading-relaxed ${INPUT_FOCUS}`}
          />
          <p className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{message.body.length} / {BODY_MAX}</span>
            {saving && <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Saving…</span>}
          </p>
        </div>
      </div>
      {rewriting ? (
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" />Rewriting this one…
        </p>
      ) : askRewrite ? (
        <div className="mt-3 space-y-2">
          <Label htmlFor={`fc-instr-${index}`} className="text-xs">What should change? (optional)</Label>
          <div className="relative">
            <Input
              id={`fc-instr-${index}`}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Shorter, mention the free trial, less formal…"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitRewrite(); } }}
              className={`h-9 text-sm ${INPUT_FOCUS} ${mic.supported ? 'pr-11' : ''}`}
            />
            {mic.supported && (
              <Button
                type="button"
                size="icon-sm"
                variant={mic.listening ? 'destructive' : 'ghost'}
                className={`absolute right-0.5 top-0.5 rounded-full ${mic.listening ? 'animate-pulse' : ''}`}
                onClick={() => (mic.listening ? mic.stop() : mic.start(instruction))}
                aria-pressed={mic.listening}
                aria-label={mic.listening ? 'Stop dictating' : 'Dictate what should change'}
              >
                {mic.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" size="sm" onClick={submitRewrite} className={CTA_PRIMARY}><Sparkles className="h-4 w-4" />Rewrite it</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { if (mic.listening) mic.stop(); setAskRewrite(false); }}>Never mind</Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          {kept ? (
            <span className={`inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-medium ${STATUS.ready}`}><Check className="h-3.5 w-3.5" />Kept</span>
          ) : (
            <Button type="button" size="sm" onClick={onKeep} className={CTA_PRIMARY}><Check className="h-4 w-4" />Sounds like me</Button>
          )}
          <Button type="button" size="sm" variant="outline" onClick={() => setAskRewrite(true)} className="hover:border-[#7C5CFF]/50">
            <RefreshCw className="h-4 w-4" />Rewrite this
          </Button>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Step                                                                 */
/* ------------------------------------------------------------------ */

type Stage = 'setup' | 'messages' | 'confirm';

export interface FirstCampaignStepProps {
  /** `state.channels` — only channels that are on and ready are offered; undefined = not reported, offer all three. */
  channels: StudioChannelSummary[] | undefined;
  onContinue: () => void;
  continuing?: boolean;
  /** Opens Step 6 when no channel is ready. */
  onSetupChannels?: () => void;
}

export default function FirstCampaignStep({ channels, onContinue, continuing, onSetupChannels }: FirstCampaignStepProps) {
  const { toast } = useToast();
  const router = useRouter();
  const existing = useFirstCampaign();
  const profile = useBusinessProfile();
  const draftMutation = useDraftFirstCampaign();
  const update = useUpdateFirstCampaign();
  const rewrite = useRewriteFirstCampaign();

  const [stage, setStage] = useState<Stage | null>(null);
  const [draft, setDraft] = useState<FirstCampaignDraft | null>(null);
  const [offering, setOffering] = useState('');
  const [channel, setChannel] = useState<FirstCampaignChannel | null>(null);
  const [count, setCount] = useState(DEFAULT_PEOPLE);
  const [messages, setMessages] = useState<FirstCampaignMessage[]>([]);
  const [kept, setKept] = useState<boolean[]>([false, false, false]);
  const [current, setCurrent] = useState(0);
  const [rewritingIndex, setRewritingIndex] = useState<number | null>(null);

  const readyChannels = useMemo(() => {
    if (!Array.isArray(channels)) return DRAFTABLE;
    const ready = new Set(channels.filter((c) => c.isOn && c.ready).map((c) => c.channel));
    return DRAFTABLE.filter((c) => ready.has(c));
  }, [channels]);
  const offerChips = useMemo(() => offeringLines(profile.profile as Record<string, unknown>), [profile.profile]);

  // Seed from the saved draft once: a returning tenant lands on the confirmation, not a blank form.
  useEffect(() => {
    if (existing.data === undefined || stage !== null) return;
    if (existing.data) {
      setDraft(existing.data);
      setMessages(existing.data.messages);
      setOffering(existing.data.offering);
      setChannel(existing.data.channel);
      setCount(existing.data.count);
      setStage('confirm');
    } else {
      setStage('setup');
    }
  }, [existing.data, stage]);

  useEffect(() => {
    if (channel === null && readyChannels.length) setChannel(readyChannels[0]);
  }, [channel, readyChannels]);

  const applyDraft = (d: FirstCampaignDraft) => {
    setDraft(d);
    setMessages(d.messages);
    setOffering(d.offering);
    setChannel(d.channel);
    setCount(d.count);
  };
  // The backend still answers when its column is missing; the draft lives for this session only.
  const applyResult = (r: FirstCampaignResult) => {
    applyDraft(r.draft);
    if (r.warnings?.includes('not_persisted')) {
      toast({ title: 'Not saved yet', description: 'The draft is here for now, but it could not be stored. Finish it in one go, or try again later.' });
    }
  };

  const draftIt = () => {
    draftMutation.mutate(
      { offering: offering.trim() || undefined, channel: channel ?? undefined, count },
      {
        onSuccess: (r) => {
          applyResult(r);
          setKept([false, false, false]);
          setCurrent(0);
          setStage('messages');
        },
        onError: (err) => toast({ title: 'Could not draft it', description: describeError(err), variant: 'destructive' }),
      },
    );
  };

  const saveMessages = () => {
    if (!draft || messagesEqual(messages, draft.messages)) return;
    update.mutate({ messages }, {
      onSuccess: (r) => applyResult(r),
      onError: (err) => toast({ title: 'Could not save your edit', description: describeError(err), variant: 'destructive' }),
    });
  };

  const rewriteOne = (index: number, instruction: string) => {
    setRewritingIndex(index);
    rewrite.mutate({ index: index as 0 | 1 | 2, instruction: instruction || undefined }, {
      onSuccess: (r) => {
        applyResult(r);
        setKept((k) => k.map((v, i) => (i === index ? false : v)));
      },
      onError: (err) => toast({ title: 'Could not rewrite it', description: describeError(err), variant: 'destructive' }),
      onSettled: () => setRewritingIndex(null),
    });
  };

  const fromName = draft?.from.agentName?.trim() || null;

  if (existing.isLoading || stage === null) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking for a draft…</div>
        <div className={`${SKELETON} h-28`} />
        <div className={`${SKELETON} h-20`} />
      </div>
    );
  }
  if (existing.data === undefined && existing.isError) {
    return (
      <div className="space-y-3">
        <p className={`rounded-2xl border p-4 text-sm ${STATUS.needed}`}>Your first campaign could not load right now. Refresh, or try again in a moment.</p>
        <Button type="button" variant="outline" onClick={() => existing.refetch()}>Try again</Button>
      </div>
    );
  }

  const drafting = draftMutation.isPending;

  /* ---------------- Setup ---------------- */
  if (stage === 'setup') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className={H_STEP}>Who do you want to reach first, on which channel, saying what?</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">It already knows your business. Pick an offer and a channel, or just let it draft one.</p>
        </div>

        <section className={`${PANEL} p-4`}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className="font-semibold tracking-tight">Fastest path</h3>
            <p className="text-xs text-muted-foreground">Three messages, ten days, ready in a minute.</p>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <Button type="button" className={`justify-start ${CTA_PRIMARY}`} onClick={draftIt} disabled={drafting || !readyChannels.length}>
              {drafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Draft one for me
            </Button>
            <Button type="button" variant="outline" className="justify-start hover:border-[#7C5CFF]/50" onClick={() => router.push('/campaigns')} disabled={drafting}>
              <LayoutTemplate className="h-4 w-4" />Start from a template
            </Button>
            <Button type="button" variant="outline" className="justify-start hover:border-[#7C5CFF]/50" onClick={() => router.push('/campaigns/workflow')} disabled={drafting}>
              <Wrench className="h-4 w-4" />I&rsquo;ll set it up
            </Button>
          </div>
          {drafting && (
            <p className="mt-2 text-xs text-muted-foreground" role="status" aria-live="polite">Writing three messages in your voice…</p>
          )}
        </section>

        <Card title="What you are leading with" hint="Pick one, or type your own.">
          {offerChips.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {offerChips.map((o) => (
                <Chip key={o} selected={offering === o} onClick={() => setOffering(offering === o ? '' : o)} disabled={drafting}>{o}</Chip>
              ))}
            </div>
          )}
          <Input
            value={offering}
            onChange={(e) => setOffering(e.target.value)}
            placeholder={offerChips.length ? 'Or something else…' : 'e.g. Contract nursing staff for hospitals'}
            aria-label="What you are leading with"
            disabled={drafting}
            className={`h-9 text-sm ${INPUT_FOCUS}`}
          />
        </Card>

        <Card title="Which channel" hint={Array.isArray(channels) ? 'Only channels that are on and ready.' : undefined}>
          {readyChannels.length ? (
            <div className="flex flex-wrap gap-1.5">
              {readyChannels.map((c) => {
                const Icon = CHANNEL_META[c].icon;
                return (
                  <Chip key={c} selected={channel === c} onClick={() => setChannel(c)} disabled={drafting}>
                    <Icon className="h-3.5 w-3.5" />{CHANNEL_META[c].label}
                  </Chip>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              <p>No channel is ready yet. Switch one on and give it a first line, then come back.</p>
              {onSetupChannels && (
                <button type="button" onClick={onSetupChannels} className={`mt-1 inline-flex items-center gap-1 ${LINK}`}>
                  Set up your channels<ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </Card>

        <Card title="How many people this week" hint="Start small. Fifty is enough to learn what lands; you can raise it any time.">
          <div className="flex items-center gap-3">
            <Slider
              value={count}
              min={MIN_PEOPLE}
              max={MAX_PEOPLE}
              step={10}
              onValueChange={(v) => setCount(v)}
              disabled={drafting}
              aria-label="People this week"
            />
            <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums" data-testid="people-count">{count}</span>
          </div>
        </Card>
      </div>
    );
  }

  /* ---------------- Messages ---------------- */
  if (stage === 'messages' && draft) {
    const total = messages.length;
    return (
      <div className="space-y-5">
        <div>
          <h2 className={H_STEP}>Here are your three messages.</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {draft.count} people{draft.audience.summary ? ` — ${draft.audience.summary}` : ''}, on {CHANNEL_META[draft.channel].label}, leading with &ldquo;{draft.offering}&rdquo;. Read each one; keep it or ask for a rewrite.
          </p>
        </div>

        {/* Mobile: one card at a time. Desktop: all three. */}
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={i === current ? '' : 'hidden sm:block'}>
              <MessageCard
                index={i}
                message={m}
                channel={draft.channel}
                from={fromName}
                kept={kept[i] ?? false}
                rewriting={rewritingIndex === i}
                saving={update.isPending}
                onChange={(next) => setMessages((ms) => ms.map((x, j) => (j === i ? next : x)))}
                onBlur={saveMessages}
                onKeep={() => setKept((k) => k.map((v, j) => (j === i ? true : v)))}
                onRewrite={(instruction) => rewriteOne(i, instruction)}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between sm:hidden" aria-label="Message pager">
          <Button type="button" variant="ghost" size="sm" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
            <ChevronLeft className="h-4 w-4" />Previous
          </Button>
          <span className="text-xs text-muted-foreground">{current + 1} of {total}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))} disabled={current >= total - 1}>
            Next<ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => setStage('setup')} disabled={rewritingIndex !== null} className="w-full sm:w-auto">
            <ChevronLeft className="h-4 w-4" />Change the offer or channel
          </Button>
          <Button type="button" size="lg" onClick={() => { saveMessages(); setStage('confirm'); }} disabled={rewritingIndex !== null} className={`w-full sm:w-auto ${CTA_PRIMARY}`}>
            Looks good<ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  /* ---------------- Confirmation ---------------- */
  if (!draft) return null; // 'confirm' is only ever entered with a draft in hand
  const launched = draft.status === 'launched';
  return (
    <div className="space-y-5">
      <section className={`${CARD} p-4`} data-testid="first-campaign-summary">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold leading-snug tracking-tight sm:text-xl">Here&rsquo;s your first campaign.</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {launched ? 'It is live — you can watch it on the campaigns page.' : 'It won’t send until you press Go live on the last step.'}
            </p>
          </div>
          <CheckCircle2 className={`h-5 w-5 shrink-0 ${TINT.ready} ${READY_PULSE}`} aria-label="drafted" />
        </div>
        <p className="mt-3 text-sm leading-relaxed">{draft.summary}</p>
        <ul className={`mt-3 space-y-1.5 border-t ${BORDER} pt-3 text-xs text-muted-foreground`}>
          {messages.map((m, i) => (
            <li key={i} className="flex gap-2">
              <span className="w-12 shrink-0 font-medium text-foreground">{dayLabel(m.day)}</span>
              <span className="line-clamp-2">{m.subject ? `${m.subject} — ` : ''}{m.body}</span>
            </li>
          ))}
        </ul>
        {!launched && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" size="sm" variant="outline" onClick={() => { setCurrent(0); setStage('messages'); }} disabled={continuing} className="hover:border-[#7C5CFF]/50">
              <Pencil className="h-4 w-4" />Edit
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => router.push(FIRST_CAMPAIGN_BUILDER_HREF)} disabled={continuing} className="hover:border-[#7C5CFF]/50">
              <Send className="h-4 w-4" />Review and send
            </Button>
          </div>
        )}
      </section>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" size="lg" onClick={onContinue} disabled={continuing} className={`w-full sm:w-auto ${CTA_PRIMARY}`}>
          {continuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Looks right, continue
        </Button>
      </div>
    </div>
  );
}
