'use client';

/**
 * GoLiveStep — Step 9 of 9: "Does this sound like you, and are you ready to send?"
 *
 * Three cards, top to bottom:
 *  1. Try your agent — one press runs a 3-message test against the live
 *     agent (POST /studio/test-run; nothing is stored). Each reply gets a
 *     thumbs up/down; a thumbs-down opens reason chips and an "it should have
 *     said" box. The verdicts become ONE Tailor proposal plus a one-line
 *     summary (POST /studio/test-run/feedback), applied with a single press
 *     that also regenerates every ready channel's agent (POST /studio/apply-and-update).
 *  2. Launch checklist — GET /studio/launch, computed server-side so this
 *     card, the rooms and the dashboard banner agree. Every amber row links
 *     to the step or page that fixes it and returns here.
 *  3. Confirmation — the plain-English summary of what happens on Go live,
 *     editable; what the tenant edits is what POST /studio/go-live stores.
 *     Go live does NOT send from here: it marks setup complete and hands off
 *     to the campaign builder with `autoLaunch=1`, the one proven launch path.
 *     CURATED workspaces are the exception: their first campaign is a
 *     pipeline, and POST /studio/go-live switches it on server-side (409
 *     `activation_failed` with `reason` if it cannot) — no builder hand-off.
 *     A launch row may then point at a Studio ROOM (`fix.room: 'pipelines'`)
 *     rather than a step; the page opens it and comes back here.
 *
 * Mobile first: everything stacks at 390px; the turns reveal one at a time.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Check, CheckCircle2, ChevronDown, ChevronUp, Circle, CircleAlert, Coins, Loader2, Mic, MicOff, Play,
  RefreshCw, Rocket, Save, Send, Sparkles, ThumbsDown, ThumbsUp, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { isApiError } from '@lad/shared/apiError';
import {
  isPipelineDraft,
  useApplyAndUpdate,
  useFirstCampaign,
  useGoLive,
  useLaunchStatus,
  useTestRun,
  useTestRunFeedback,
  type ApplyAndUpdateResult,
  type LaunchRow,
  type LaunchRowRoom,
  type LaunchStatus,
  type ReasonKey,
  type StudioChannel,
  type StudioState,
  type TestRun,
  type TestRunChannel,
  type TestRunErrorReason,
  type TestRunFeedback,
  type TestRunVerdict,
} from '@lad/frontend-features/tenant-studio';
import { useDictation } from './speech';
import PromptSourceNote from '../PromptSourceNote';
import { publishLine, readsSnapshotPrompt } from '../publish-copy';
import { BORDER, BUBBLE_AGENT, BUBBLE_ME, CARD, CHIP_BASE, CHIP_IDLE, CHIP_SELECTED, CTA_PRIMARY, DIVIDE, H_STEP, INPUT_FOCUS, LINK, PANEL, ROW_NEEDED, SKELETON, STATUS, TINT } from '../studio-theme';

/** Where this step sits in the 9-step setup. */
export const GO_LIVE_STEP = 9;

/** The builder hand-off after Go live: loads the draft AND presses Launch for the tenant. */
export const GO_LIVE_BUILDER_HREF = '/campaigns/workflow?from=studio-first-campaign&autoLaunch=1';

const TESTABLE: TestRunChannel[] = ['linkedin', 'email', 'whatsapp'];
const CHANNEL_LABEL: Record<StudioChannel, string> = { linkedin: 'LinkedIn', email: 'Email', whatsapp: 'WhatsApp', instagram: 'Instagram', voice: 'Voice' };
const CREDITS_HREF = '/settings?tab=credits';

const REASON_KEYS: ReasonKey[] = ['too_pushy', 'gave_up_too_early', 'missed_guarantee', 'should_have_asked_first', 'wrong_audience_voice', 'other'];
function reasonLabel(key: ReasonKey, vertical: string | null): string {
  switch (key) {
    case 'too_pushy': return 'Too pushy';
    case 'gave_up_too_early': return 'Gave up too early';
    case 'missed_guarantee': return 'Missed our guarantee';
    case 'should_have_asked_first': return 'Should have asked first';
    case 'wrong_audience_voice': return vertical === 'staffing' ? 'Talked to a candidate like a client' : 'Talked to the wrong kind of person';
    default: return 'Something else';
  }
}

const TEST_RUN_COPY: Record<TestRunErrorReason, string> = {
  channel_not_testable: 'That channel cannot be tested this way yet — try LinkedIn, email or WhatsApp.',
  validation: 'Something in the request was not right. Pick a channel and try again.',
  no_ready_channel: 'No channel is on and ready yet. Switch one on and give it a first line in step 6, then come back.',
  no_agent_prompt: 'That channel has no agent yet. Generate it in step 6, then come back.',
  no_persona: 'It could not invent a prospect this time. Try again in a moment.',
  no_reply: 'Your agent did not answer this time. Try again in a moment.',
};

function describeError(err: unknown, copy: Partial<Record<string, string>> = {}): string {
  if (isApiError(err)) {
    const body = err.body as { error?: string; message?: string } | undefined;
    const code = body?.error;
    if (code && copy[code]) return copy[code] as string;
    if (err.status === 401) return 'Your session has expired — sign in again.';
    if (err.status === 403) return 'Only an owner or admin can do this.';
    if (body?.message) return body.message;
    if (code) return code;
  }
  return err instanceof Error ? err.message : 'Try again in a moment.';
}

/** The server's `reason` for a failed pipeline activation, in plain English. */
function activationReason(reason: string | undefined): string {
  switch (reason) {
    case 'not_entitled': return 'That pipeline is not in your plan.';
    case 'pipeline_not_built_yet':
    case 'not_live': return 'That pipeline is not running yet — it is still being built.';
    case 'no_snapshot':
    case 'not_curated': return 'This workspace has no pipelines to switch on.';
    case 'unknown_pipeline': return 'That pipeline no longer exists in your edition.';
    case 'knobs_missing': return 'The pipeline still has settings to fill in.';
    default: return reason ? `It said: ${reason.replace(/[_-]/g, ' ')}.` : 'The pipeline could not be switched on.';
  }
}

function firstName(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] || 'the prospect';
}

function money(usd: number): string {
  return usd < 1 ? `$${usd.toFixed(2)}` : `$${Math.round(usd).toLocaleString()}`;
}

function whenLabel(iso: string, timezone: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' };
    try {
      return new Intl.DateTimeFormat(undefined, { ...opts, timeZone: timezone }).format(d);
    } catch {
      return new Intl.DateTimeFormat(undefined, opts).format(d);
    }
  } catch {
    return iso;
  }
}

function Card({ title, hint, children, 'data-testid': testId }: { title: string; hint?: string; children: ReactNode; 'data-testid'?: string }) {
  return (
    <section className={`${CARD} p-4`} data-testid={testId}>
      <h3 className="font-semibold tracking-tight">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`${CHIP_BASE} gap-1.5 px-3 py-1.5 text-xs ${selected ? CHIP_SELECTED : CHIP_IDLE}`}
    >
      {selected && <Check className="h-3 w-3" />}{children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Try your agent                                                    */
/* ------------------------------------------------------------------ */

interface VerdictDraft {
  thumbs: 'up' | 'down';
  reasons: ReasonKey[];
  shouldHaveSaid: string;
}

function ShouldHaveSaid({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const mic = useDictation(onChange);
  return (
    <div className="mt-2">
      <div className="flex items-start gap-2">
        <Textarea
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="It should have said…"
          className={`min-h-[56px] text-sm ${INPUT_FOCUS}`}
          aria-label="It should have said"
        />
        {mic.supported && (
          <Button
            type="button"
            size="icon"
            variant={mic.listening ? 'default' : 'outline'}
            onClick={() => (mic.listening ? mic.stop() : mic.start(value))}
            aria-label={mic.listening ? 'Stop dictating' : 'Dictate'}
            aria-pressed={mic.listening}
            className={`shrink-0 ${mic.listening ? CTA_PRIMARY : 'hover:border-[#7C5CFF]/50'}`}
          >
            {mic.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        )}
      </div>
      {mic.listening && <p className="mt-1 text-[11px] text-muted-foreground">Listening… tap the mic again to stop.</p>}
    </div>
  );
}

function TurnCard({ index, prospect, reply, personaName, agentName, vertical, verdict, onVerdict }: {
  index: number;
  prospect: string;
  reply: string;
  personaName: string;
  agentName: string;
  vertical: string | null;
  verdict: VerdictDraft | undefined;
  onVerdict: (v: VerdictDraft) => void;
}) {
  const down = verdict?.thumbs === 'down';
  const toggleReason = (k: ReasonKey) => {
    if (!verdict) return;
    const has = verdict.reasons.includes(k);
    onVerdict({ ...verdict, reasons: has ? verdict.reasons.filter((r) => r !== k) : [...verdict.reasons, k] });
  };
  return (
    <div className="space-y-2" data-testid={`test-turn-${index}`}>
      <div className="flex justify-end">
        <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-br-md px-3 py-2 text-sm ${BUBBLE_ME}`}>
          <div className="mb-0.5 text-[10px] uppercase tracking-wide opacity-80">{personaName}</div>
          {prospect}
        </div>
      </div>
      <div className="flex justify-start">
        <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-bl-md px-3 py-2 text-sm ${BUBBLE_AGENT}`}>
          <div className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{agentName}</div>
          {reply}
        </div>
      </div>
      <div className="flex items-center gap-2 pl-1">
        <span className="text-xs text-muted-foreground">Sounds right?</span>
        <Button
          type="button"
          size="sm"
          variant={verdict?.thumbs === 'up' ? 'default' : 'outline'}
          aria-pressed={verdict?.thumbs === 'up'}
          aria-label={`Thumbs up for reply ${index + 1}`}
          onClick={() => onVerdict({ thumbs: 'up', reasons: [], shouldHaveSaid: '' })}
          className={verdict?.thumbs === 'up' ? CTA_PRIMARY : 'hover:border-[#7C5CFF]/50'}
        >
          <ThumbsUp className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={down ? 'default' : 'outline'}
          aria-pressed={down}
          aria-label={`Thumbs down for reply ${index + 1}`}
          onClick={() => onVerdict({ thumbs: 'down', reasons: verdict?.reasons ?? [], shouldHaveSaid: verdict?.shouldHaveSaid ?? '' })}
          className={down ? CTA_PRIMARY : 'hover:border-[#7C5CFF]/50'}
        >
          <ThumbsDown className="h-4 w-4" />
        </Button>
      </div>
      {down && verdict && (
        <div className={`${PANEL} p-3`} data-testid={`test-turn-${index}-reasons`}>
          <p className="text-xs font-medium">What went wrong?</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {REASON_KEYS.map((k) => (
              <Chip key={k} selected={verdict.reasons.includes(k)} onClick={() => toggleReason(k)}>{reasonLabel(k, vertical)}</Chip>
            ))}
          </div>
          <ShouldHaveSaid value={verdict.shouldHaveSaid} onChange={(v) => onVerdict({ ...verdict, shouldHaveSaid: v })} />
        </div>
      )}
    </div>
  );
}

function PublishResults({ result }: { result: ApplyAndUpdateResult }) {
  return (
    <ul className="mt-2 space-y-1 text-sm" data-testid="apply-results">
      {result.published.map((p) => (
        <li key={`${p.channel}-${p.readBy ?? ''}`} className="flex items-start gap-2" data-testid={readsSnapshotPrompt(p) ? 'apply-result-snapshot-prompt' : undefined}>
          {p.ok
            ? <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${TINT.ready}`} aria-hidden />
            : <XCircle className={`mt-0.5 h-4 w-4 shrink-0 ${TINT.needed}`} aria-hidden />}
          <span>{publishLine(p)}</span>
        </li>
      ))}
      {result.skipped.length > 0 && (
        <li className="flex items-start gap-2 text-muted-foreground">
          <Circle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{result.skipped.map((c) => CHANNEL_LABEL[c] ?? c).join(', ')} skipped — off or not ready yet.</span>
        </li>
      )}
    </ul>
  );
}

function TryYourAgent({ state }: { state: StudioState }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const canApply = user?.role === 'admin' || user?.role === 'owner';
  const testRun = useTestRun();
  const feedback = useTestRunFeedback();
  const apply = useApplyAndUpdate();

  const testable = useMemo(() => {
    if (!Array.isArray(state.channels)) return TESTABLE;
    const ready = new Set(state.channels.filter((c) => c.isOn && c.ready).map((c) => c.channel));
    return TESTABLE.filter((c) => ready.has(c));
  }, [state.channels]);
  const [channel, setChannel] = useState<TestRunChannel | null>(null);
  useEffect(() => {
    if (channel === null && testable.length) setChannel(testable[0]);
  }, [channel, testable]);

  const [run, setRun] = useState<TestRun | null>(null);
  const [revealed, setRevealed] = useState(1);
  const [verdicts, setVerdicts] = useState<Record<number, VerdictDraft>>({});
  const [result, setResult] = useState<TestRunFeedback | null>(null);
  const [applied, setApplied] = useState<ApplyAndUpdateResult | null>(null);
  const [declined, setDeclined] = useState(false);

  const curated = state.workspace?.curated === true;
  const agentName = useMemo(() => {
    const ch = run?.channel ?? channel;
    const row = state.channels?.find((c) => c.channel === ch);
    // A curated workspace's WhatsApp test is the support agent (the pipeline prompt), which has no channel profile name.
    return row?.agentName?.trim() || (curated && ch === 'whatsapp' ? 'Your support agent' : 'Your agent');
  }, [state.channels, run, channel, curated]);

  const reset = () => {
    setRun(null); setRevealed(1); setVerdicts({}); setResult(null); setApplied(null); setDeclined(false);
  };

  const start = async () => {
    reset();
    try {
      const r = await testRun.mutateAsync(channel ? { channel } : {});
      setRun(r);
    } catch (e: unknown) {
      toast({ title: 'Could not run the test', description: describeError(e, TEST_RUN_COPY), variant: 'destructive' });
    }
  };

  const setVerdict = (index: number, v: VerdictDraft) => {
    setVerdicts((all) => ({ ...all, [index]: v }));
    if (run && index === revealed - 1 && revealed < run.turns.length) setRevealed(revealed + 1);
  };

  const allJudged = Boolean(run) && run!.turns.every((t) => verdicts[t.index]);

  const send = async () => {
    if (!run) return;
    const list: TestRunVerdict[] = run.turns.map((t) => {
      const v = verdicts[t.index];
      const said = v.shouldHaveSaid.trim();
      return v.thumbs === 'up'
        ? { index: t.index, thumbs: 'up' }
        : { index: t.index, thumbs: 'down', reasons: v.reasons.length ? v.reasons : ['other'], ...(said ? { shouldHaveSaid: said } : {}) };
    });
    try {
      setResult(await feedback.mutateAsync({ channel: run.channel, persona: run.persona, transcript: run.transcript, verdicts: list }));
    } catch (e: unknown) {
      toast({ title: 'Could not send your feedback', description: describeError(e), variant: 'destructive' });
    }
  };

  const doApply = async () => {
    if (!result?.proposal) return;
    try {
      const r = await apply.mutateAsync({ overlay: result.proposal.overlay, note: 'Test run feedback (Step 9)' });
      setApplied(r);
      const failed = r.published.filter((p) => !p.ok).length;
      toast({
        title: failed ? 'Applied, with one thing to check' : 'Your agent is updated',
        description: failed ? `${failed} channel${failed === 1 ? '' : 's'} could not be republished — see below.` : `Saved as version ${r.overlayVersion}.`,
      });
    } catch (e: unknown) {
      toast({ title: 'Could not apply', description: describeError(e), variant: 'destructive' });
    }
  };

  const hint = testable.length === 0
    ? 'No channel is on and ready yet, so there is nothing to test. Set one up in step 6 first.'
    : 'It invents a likely prospect from your ideal customer and sends three lines that get harder: curious, then an objection, then a price or meeting ask. Your agent answers each one for real. Nothing is sent to anyone.';

  return (
    <Card title="Try your agent" hint={hint} data-testid="try-your-agent">
      {testable.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5" aria-label="Channel to test">
          {testable.map((c) => (
            <Chip key={c} selected={channel === c} onClick={() => { setChannel(c); reset(); }}>{CHANNEL_LABEL[c]}</Chip>
          ))}
        </div>
      )}

      {!run && (
        <Button type="button" onClick={start} disabled={testRun.isPending || testable.length === 0} className={`w-full sm:w-auto ${CTA_PRIMARY}`} data-testid="run-test">
          {testRun.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {testRun.isPending ? 'Running the test…' : 'Run a 3-message test'}
        </Button>
      )}

      {run && (
        <div className="space-y-4">
          <p className={`${PANEL} px-3 py-2 text-sm`} data-testid="test-persona">
            Meet <span className="font-medium">{run.persona.name}</span>, {run.persona.role}{run.persona.company ? ` at ${run.persona.company}` : ''}. {run.persona.situation}
          </p>
          <div className="space-y-4" aria-live="polite">
            {run.turns.slice(0, revealed).map((t) => (
              <TurnCard
                key={t.index}
                index={t.index}
                prospect={t.prospect}
                reply={t.reply}
                personaName={firstName(run.persona.name)}
                agentName={agentName}
                vertical={state.vertical}
                verdict={verdicts[t.index]}
                onVerdict={(v) => setVerdict(t.index, v)}
              />
            ))}
          </div>
          {revealed < run.turns.length && (
            <p className="text-xs text-muted-foreground">Give this reply a thumbs up or down to see the next one ({revealed} of {run.turns.length}).</p>
          )}

          {!result && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" onClick={send} disabled={!allJudged || feedback.isPending} className={`w-full sm:w-auto ${CTA_PRIMARY}`} data-testid="send-feedback">
                {feedback.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {feedback.isPending ? 'Reading your feedback…' : 'Send my feedback'}
              </Button>
              <Button type="button" variant="ghost" onClick={start} disabled={testRun.isPending || feedback.isPending} className="w-full sm:w-auto">
                <RefreshCw className="h-4 w-4" />Run it again
              </Button>
            </div>
          )}

          {result && (
            <div className={`${PANEL} p-3`} data-testid="feedback-summary">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#7C5CFF] dark:text-[#B69CFF]" aria-hidden />
                <p className="text-sm">{result.summary}</p>
              </div>
              {(result.questionsQueued ?? 0) > 0 && (
                <p className="mt-1 pl-6 text-xs text-muted-foreground" data-testid="questions-queued">
                  {result.questionsQueued} question{result.questionsQueued === 1 ? '' : 's'} saved for you in the inbox — answer {result.questionsQueued === 1 ? 'it' : 'them'} on the studio page when you have a minute.
                </p>
              )}
              {result.proposal && !applied && !declined && (
                canApply ? (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Button type="button" size="sm" onClick={doApply} disabled={apply.isPending || !result.proposal.ok} data-testid="apply-and-update" className={CTA_PRIMARY}>
                      {apply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      {apply.isPending ? 'Updating your agent…' : 'Apply and update my agent'}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setDeclined(true)} disabled={apply.isPending}>Not now</Button>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">Only a workspace owner or admin can apply this. Share it with one.</p>
                )
              )}
              {result.proposal && !result.proposal.ok && !applied && (
                <p className={`mt-2 text-xs ${TINT.warnText}`}>The change it proposed does not fit the rules, so it cannot be applied as is. Run the test again with different words.</p>
              )}
              {applied && <PublishResults result={applied} />}
              {declined && <p className="mt-2 text-xs text-muted-foreground">Kept as is. You can run another test any time.</p>}
              <div className="mt-3">
                <Button type="button" size="sm" variant="outline" onClick={start} disabled={testRun.isPending || apply.isPending} className="hover:border-[#7C5CFF]/50">
                  <RefreshCw className="h-4 w-4" />Run it again
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Launch checklist                                                  */
/* ------------------------------------------------------------------ */

function CreditsDetail({ launch }: { launch: LaunchStatus }) {
  const [open, setOpen] = useState(false);
  const c = launch.credits;
  const balance = c.unknown || c.balance === null ? null : Number(c.balance);
  return (
    <div className="mt-1 space-y-1 text-sm text-muted-foreground" data-testid="credits-detail">
      <p className={balance === null ? TINT.warnText : undefined}>
        {balance === null ? 'We couldn’t read your wallet, so it cannot tell whether the first week is covered. Open your wallet to check.' : `${balance.toLocaleString()} credits available.`}
        {c.firstWeek && ` About ${Math.ceil(c.firstWeek.credits).toLocaleString()} credits for the first week (≈ ${money(c.firstWeek.usd)}).`}
        {/* Curated: pipelines bill per conversation, so there is no first-week estimate — the server says why. */}
        {!c.firstWeek && c.note && <span data-testid="credits-note"> {c.note}</span>}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {c.firstWeek && c.firstWeek.breakdown.length > 0 && (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={`inline-flex items-center gap-1 text-sm ${LINK}`}>
            {open ? 'Hide the breakdown' : 'See the breakdown'}{open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
        <Link href={CREDITS_HREF} className={`inline-flex items-center gap-1 text-sm ${LINK}`}>
          <Coins className="h-3.5 w-3.5" />{balance === null ? 'Open your wallet' : 'Add credits'}
        </Link>
      </div>
      {open && c.firstWeek && (
        <ul className={`${PANEL} mt-1 divide-y ${DIVIDE} text-xs`} data-testid="credits-breakdown">
          {c.firstWeek.breakdown.map((line, i) => (
            <li key={`${line.item}-${i}`} className="flex items-center justify-between gap-2 px-3 py-1.5">
              <span className="min-w-0 flex-1 truncate">{line.item}{line.qty > 1 ? ` × ${line.qty.toLocaleString()}` : ''}</span>
              <span className="shrink-0 font-medium text-foreground">{Math.ceil(line.credits).toLocaleString()} cr</span>
            </li>
          ))}
          <li className="flex items-center justify-between gap-2 px-3 py-1.5 font-medium text-foreground">
            <span>First week</span>
            <span>{Math.ceil(c.firstWeek.credits).toLocaleString()} cr · {money(c.firstWeek.usd)}</span>
          </li>
        </ul>
      )}
    </div>
  );
}

function LaunchRowItem({ row, launch, onJumpToStep, onJumpToRoom }: { row: LaunchRow; launch: LaunchStatus; onJumpToStep: (step: number) => void; onJumpToRoom?: (room: LaunchRowRoom) => void }) {
  const icon = row.status === 'ready'
    ? <CheckCircle2 className={`h-5 w-5 ${TINT.ready}`} aria-label="ready" />
    : row.status === 'needed'
      ? <CircleAlert className={`h-5 w-5 ${TINT.warn}`} aria-label="needed" />
      : <Circle className="h-5 w-5 text-muted-foreground" aria-label="optional" />;
  const fix = row.fix ?? null;
  const isCredits = row.key === 'credits';
  // Ready, but the balance will not last the first week: the row stays green and the detail turns amber.
  const amberDetail = isCredits && row.status === 'ready' && launch.credits.enough === false;
  return (
    <li className={`flex gap-3 px-4 py-3 first:rounded-t-2xl last:rounded-b-2xl ${row.status === 'needed' ? ROW_NEEDED : ''}`} data-testid={`launch-row-${row.key}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className={`font-medium ${row.status === 'optional' ? 'text-muted-foreground' : ''}`}>{row.title}</span>
          {row.status === 'optional' && <span className="text-[11px] text-muted-foreground">Improves results, not required</span>}
        </div>
        <p className={`mt-0.5 text-sm ${amberDetail ? TINT.warnText : 'text-muted-foreground'}`} data-testid={amberDetail ? 'credits-amber' : undefined}>{row.detail}</p>
        {isCredits && <CreditsDetail launch={launch} />}
        {fix && !(isCredits && fix.href === CREDITS_HREF) && (
          fix.room && onJumpToRoom ? (
            <button type="button" onClick={() => onJumpToRoom(fix.room as LaunchRowRoom)} className={`mt-1 inline-flex items-center gap-1 text-sm ${LINK}`} data-testid={`launch-fix-room-${row.key}`}>
              {fix.label}<ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : fix.step !== undefined && fix.step !== null ? (
            <button type="button" onClick={() => onJumpToStep(fix.step as number)} className={`mt-1 inline-flex items-center gap-1 text-sm ${LINK}`}>
              {fix.label}<ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : fix.href ? (
            <Link href={fix.href} className={`mt-1 inline-flex items-center gap-1 text-sm ${LINK}`}>
              {fix.label}<ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null
        )}
      </div>
    </li>
  );
}

function LaunchChecklist({ launch, loading, failed, onJumpToStep, onJumpToRoom, onRetry }: {
  launch: LaunchStatus | undefined;
  loading: boolean;
  failed: boolean;
  onJumpToStep: (step: number) => void;
  onJumpToRoom?: (room: LaunchRowRoom) => void;
  onRetry: () => void;
}) {
  const blockers = launch?.blocking.length ?? 0;
  return (
    <Card
      title="Launch checklist"
      hint={launch ? (blockers === 0 ? 'Everything a launch needs is in place.' : `${blockers} thing${blockers === 1 ? '' : 's'} to fix before the first send. Each one links to where it is fixed and brings you back here.`) : undefined}
      data-testid="launch-checklist"
    >
      {loading && (
        <div className="space-y-2" aria-busy="true">
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Checking what a launch needs…</p>
          <div className={`${SKELETON} h-12`} />
          <div className={`${SKELETON} h-12`} />
          <div className={`${SKELETON} h-12`} />
        </div>
      )}
      {failed && !loading && (
        <p className={`rounded-xl border px-3 py-2 text-sm ${STATUS.needed}`}>
          Could not check the launch list right now.{' '}
          <button type="button" onClick={onRetry} className="font-medium underline-offset-2 hover:underline">Try again</button>
        </p>
      )}
      {launch && (
        <ul className={`divide-y ${DIVIDE} overflow-hidden rounded-2xl border ${BORDER}`}>
          {launch.rows.map((row) => <LaunchRowItem key={row.key} row={row} launch={launch} onJumpToStep={onJumpToStep} onJumpToRoom={onJumpToRoom} />)}
        </ul>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Confirmation                                                      */
/* ------------------------------------------------------------------ */

function Confirmation({ launch, pipeline, onWentLive, onSaveForLater, saving }: {
  launch: LaunchStatus | undefined;
  /** Curated: the first campaign is a pipeline the server switches on at go-live. */
  pipeline: boolean;
  onWentLive: () => void;
  onSaveForLater: () => void;
  saving?: boolean;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const canGo = user?.role === 'admin' || user?.role === 'owner';
  const goLive = useGoLive();
  const [summary, setSummary] = useState('');
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (launch && !touched) setSummary(launch.summary);
  }, [launch, touched]);

  const blockingRows = launch ? launch.rows.filter((r) => launch.blocking.includes(r.key)) : [];
  const ready = Boolean(launch?.canGoLive);

  const go = async () => {
    try {
      await goLive.mutateAsync({ summary: summary.trim() || undefined });
      onWentLive();
    } catch (e: unknown) {
      const body = isApiError(e) ? (e.body as { error?: string; message?: string; blocking?: string[]; reason?: string } | undefined) : undefined;
      const activationFailed = body?.error === 'activation_failed';
      toast({
        title: body?.error === 'not_ready' ? 'Not quite ready' : activationFailed ? 'Could not switch the pipeline on' : 'Could not go live',
        description: body?.error === 'not_ready'
          ? 'Something on the checklist changed. Look at the amber rows and try again.'
          : activationFailed
            // The server's own sentence first; its `reason` code in plain words when it gave none.
            ? `${body?.message || activationReason(body?.reason)} Nothing was switched on; fix that and press Go live again.`
            : describeError(e),
        variant: 'destructive',
      });
    }
  };

  return (
    <Card
      title={ready ? 'You’re ready. Here’s what happens when you press Go live.' : 'Almost there.'}
      hint={ready ? (pipeline ? 'Go live switches the pipeline on. Edit the plan in your own words if anything is off — what you see here is what it does.' : 'Edit the plan in your own words if anything is off — what you see here is what it does.') : undefined}
      data-testid="go-live-card"
    >
      {!launch && <p className="text-sm text-muted-foreground">Waiting for the checklist…</p>}
      {launch && (
        <div className="space-y-3">
          {!ready && (
            <p className={`rounded-xl border px-3 py-2 text-sm ${STATUS.warn}`} data-testid="go-live-blockers">
              Go live is off until {blockingRows.length ? 'these are done: ' : 'the checklist is green.'}
              {blockingRows.length > 0 && <span className="font-medium">{blockingRows.map((r) => r.title).join(', ')}</span>}
            </p>
          )}
          <Textarea
            rows={4}
            value={summary}
            onChange={(e) => { setTouched(true); setSummary(e.target.value); }}
            className={`min-h-[96px] text-sm leading-relaxed ${INPUT_FOCUS}`}
            aria-label="What happens when you go live"
            data-testid="go-live-summary"
          />
          <p className="text-xs text-muted-foreground">
            Starts {whenLabel(launch.schedule.startsAt, launch.schedule.timezone)} ({launch.schedule.timezone}){pipeline ? '' : `, ${launch.schedule.perDay} people a day`}
            {launch.schedule.businessHours ? `, during ${launch.schedule.businessHours}` : ''}. It pauses on its own if credits run out.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="lg" onClick={onSaveForLater} disabled={saving || goLive.isPending} className="w-full hover:border-[#7C5CFF]/50 sm:w-auto" data-testid="save-decide-later">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save and decide later
            </Button>
            <Button type="button" size="lg" onClick={go} disabled={!ready || !canGo || saving || goLive.isPending} className={`w-full sm:w-auto ${CTA_PRIMARY}`} data-testid="go-live">
              {goLive.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              {goLive.isPending ? 'Going live…' : 'Go live'}
            </Button>
          </div>
          {!canGo && ready && <p className="text-right text-xs text-muted-foreground">Only a workspace owner or admin can press Go live.</p>}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Step                                                                 */
/* ------------------------------------------------------------------ */

export interface GoLiveStepProps {
  state: StudioState;
  /** Jump to the setup step (1–8) that fixes a row; the page returns here afterwards. */
  onJumpToStep: (step: number) => void;
  /** Curated: open the Studio room a row's `fix.room` names (with the drafted pipeline's key, so its settings open); the page returns here afterwards. */
  onJumpToRoom?: (room: LaunchRowRoom, focusKey: string | null) => void;
  /** The go-live POST succeeded: the page hands off to the builder (`GO_LIVE_BUILDER_HREF`), or, for a pipeline, shows the rooms with the live banner. */
  onWentLive: () => void;
  /** "Save and decide later": the page records step 9 and goes back to the rooms. */
  onSaveForLater: () => void;
  saving?: boolean;
}

export default function GoLiveStep({ state, onJumpToStep, onJumpToRoom, onWentLive, onSaveForLater, saving }: GoLiveStepProps) {
  const launch = useLaunchStatus();
  const curated = state.workspace?.curated === true;
  const pipeline = curated && state.firstCampaign?.kind === 'pipeline';
  // The drafted pipeline's key, for a `fix.room` jump that should land on its
  // settings. The state slice does not carry it, so read the draft itself.
  const draft = useFirstCampaign(pipeline);
  const focusKey = isPipelineDraft(draft.data) ? draft.data.pipeline.key : null;
  const jumpToRoom = onJumpToRoom ? (room: LaunchRowRoom) => onJumpToRoom(room, focusKey) : undefined;
  return (
    <div className="space-y-5">
      <div>
        <h2 className={H_STEP}>Does this sound like you, and are you ready to send?</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Try your agent on a made-up prospect first. Then check the list, read what will happen, and press Go live when it looks right.
        </p>
      </div>
      <PromptSourceNote workspace={state.workspace} />
      <TryYourAgent state={state} />
      <LaunchChecklist
        launch={launch.data}
        loading={launch.isLoading}
        failed={launch.data === undefined && !launch.isLoading}
        onJumpToStep={onJumpToStep}
        onJumpToRoom={jumpToRoom}
        onRetry={() => { void launch.refetch(); }}
      />
      <Confirmation launch={launch.data} pipeline={pipeline} onWentLive={onWentLive} onSaveForLater={onSaveForLater} saving={saving} />
    </div>
  );
}
