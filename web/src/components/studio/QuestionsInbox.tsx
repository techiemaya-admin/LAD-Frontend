'use client';

/**
 * QuestionsInbox — "Mr LAD has N questions for you" on the rooms view.
 *
 * Questions are raised by the agents themselves (a hand-over it could not
 * answer, a thumbs-down in a test run) and listed from GET /studio/questions.
 * An answer becomes a Tailor proposal (POST …/answer) shown on the usual
 * ReviewCard; applying it goes through the one-press apply-and-update path so
 * the agents pick it up straight away. Dismiss closes a question for good.
 *
 * An answered question leaves the open list on the next fetch, so the inbox
 * keeps its card (and the proposal) mounted itself until the tenant applies
 * or closes it — otherwise the card would vanish before it could be applied.
 */
import { useState } from 'react';
import { HelpCircle, Loader2, Mic, MicOff, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { isApiError } from '@lad/shared/apiError';
import {
  useAnswerQuestion, useDismissQuestion, useQuestions,
  type AgentQuestion, type AnswerQuestionResult, type Proposal, type StudioChannel, type StudioState,
} from '@lad/frontend-features/tenant-studio';
import ReviewCard from './ReviewCard';
import { useDictation } from './setup/speech';

const CHANNEL_LABEL: Record<StudioChannel, string> = { linkedin: 'LinkedIn', email: 'Email', whatsapp: 'WhatsApp', instagram: 'Instagram', voice: 'Voice' };
const SOURCE_LABEL: Record<AgentQuestion['source'], string> = { handover: 'from a real conversation', rehearsal: 'from a rehearsal', test_run: 'from your test run', manual: 'added by you' };

function describeError(err: unknown): string {
  if (isApiError(err)) {
    const body = err.body as { error?: string; message?: string } | undefined;
    if (err.status === 403) return 'Only a workspace owner or admin can answer.';
    if (err.status === 404) return 'That question is no longer there. Refresh and try again.';
    if (body?.message) return body.message;
  }
  return err instanceof Error ? err.message : 'Try again in a moment.';
}

function excerpt(s: string | undefined, max = 220): string {
  if (!s) return '';
  const t = s.trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function QuestionCard({ q, canAnswer, result, onAnswered, onDone }: {
  q: AgentQuestion;
  canAnswer: boolean;
  /** The answer's outcome, held by the inbox so the card survives the list refetch. */
  result: AnswerQuestionResult | null;
  onAnswered: (r: AnswerQuestionResult) => void;
  /** Applied, discarded or read: the card can go. */
  onDone: () => void;
}) {
  const { toast } = useToast();
  const answer = useAnswerQuestion();
  const dismiss = useDismissQuestion();
  const [text, setText] = useState('');
  const mic = useDictation(setText);

  const send = async () => {
    const a = text.trim();
    if (!a || answer.isPending) return;
    if (mic.listening) mic.stop();
    try {
      onAnswered(await answer.mutateAsync({ id: q.id, answer: a }));
    } catch (e: unknown) {
      toast({ title: 'Could not use that answer', description: describeError(e), variant: 'destructive' });
    }
  };
  const doDismiss = async () => {
    try {
      await dismiss.mutateAsync(q.id);
    } catch (e: unknown) {
      toast({ title: 'Could not dismiss', description: describeError(e), variant: 'destructive' });
    }
  };

  // `ok: false` means the Tailor asked for a fact or found nothing to change — its reply is the answer, not a card.
  const proposal: Proposal | null = result?.proposal.ok && result.proposal.overlay
    ? { ok: true, overlay: result.proposal.overlay, review: result.proposal.review ?? null, errors: result.proposal.errors ?? [] }
    : null;
  const ctx = q.context ?? {};

  return (
    <li className="rounded-lg border bg-card p-4" data-testid={`question-${q.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{CHANNEL_LABEL[q.channel] ?? q.channel} · {SOURCE_LABEL[q.source] ?? q.source}</p>
          <p className="mt-1 text-sm font-medium">{q.question}</p>
        </div>
        {!result && (
          <button type="button" onClick={doDismiss} disabled={dismiss.isPending} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Dismiss this question">
            {dismiss.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          </button>
        )}
      </div>
      {(ctx.prospectMessage || ctx.agentReply) && (
        <div className="mt-2 space-y-1 rounded-md bg-muted/50 px-3 py-2 text-xs">
          {ctx.prospectMessage && <p><span className="font-medium">{ctx.leadName || 'Prospect'}:</span> {excerpt(ctx.prospectMessage)}</p>}
          {ctx.agentReply && <p><span className="font-medium">Your agent:</span> {excerpt(ctx.agentReply)}</p>}
        </div>
      )}
      {!result && canAnswer && (
        <div className="mt-3">
          <div className="flex items-start gap-2">
            <Textarea
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What should it say?"
              className="min-h-[56px] text-sm"
              aria-label="Your answer"
              disabled={answer.isPending}
            />
            {mic.supported && (
              <Button type="button" size="icon" variant={mic.listening ? 'default' : 'outline'} onClick={() => (mic.listening ? mic.stop() : mic.start(text))} aria-label={mic.listening ? 'Stop dictating' : 'Dictate'} aria-pressed={mic.listening} className="shrink-0">
                {mic.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
          </div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Button type="button" size="sm" onClick={send} disabled={!text.trim() || answer.isPending} data-testid="question-answer">
              {answer.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {answer.isPending ? 'Turning that into a change…' : 'Answer'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={doDismiss} disabled={dismiss.isPending || answer.isPending}>Dismiss</Button>
          </div>
        </div>
      )}
      {!result && !canAnswer && <p className="mt-2 text-xs text-muted-foreground">Only a workspace owner or admin can answer. Share it with one.</p>}
      {result && proposal && (
        <div className="mt-3" data-testid="question-proposal">
          <ReviewCard proposal={proposal} reply={result.proposal.reply} applyAndUpdate noteDefault={`Answer to: ${q.question.slice(0, 80)}`} onApplied={onDone} onDiscard={onDone} />
        </div>
      )}
      {result && !proposal && (
        <div className="mt-2 rounded-md bg-muted/50 px-3 py-2 text-sm" data-testid="question-reply">
          <p>{result.proposal.reply || 'Noted — nothing in how it talks needs to change for that.'}</p>
          <Button type="button" size="sm" variant="ghost" className="mt-1" onClick={onDone}>Close</Button>
        </div>
      )}
    </li>
  );
}

export interface QuestionsInboxProps {
  state: StudioState;
}

export default function QuestionsInbox({ state }: QuestionsInboxProps) {
  const { user } = useAuth();
  const canAnswer = user?.role === 'admin' || user?.role === 'owner';
  const reported = state.questions !== undefined;
  const list = useQuestions('open', reported);
  // Answered this session: { question, result } by id, kept until applied or closed.
  const [answered, setAnswered] = useState<Record<string, { q: AgentQuestion; result: AnswerQuestionResult }>>({});
  if (!reported) return null;
  const open = list.data?.questions ?? [];
  const held = Object.values(answered).filter((a) => !open.some((q) => q.id === a.q.id));
  const questions: { q: AgentQuestion; result: AnswerQuestionResult | null }[] = [
    ...held.map((a) => ({ q: a.q, result: a.result })),
    ...open.map((q) => ({ q, result: answered[q.id]?.result ?? null })),
  ];
  const count = list.data ? list.data.openCount : state.questions?.open ?? 0;
  if (list.data && questions.length === 0) return null;
  const remove = (id: string) => setAnswered((all) => { const next = { ...all }; delete next[id]; return next; });
  return (
    <section className="rounded-lg border bg-card p-4" data-testid="questions-inbox">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="font-semibold">{count > 0 ? `Mr LAD has ${count} question${count === 1 ? '' : 's'} for you` : 'Your answers to Mr LAD'}</h2>
        {count > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground" data-testid="questions-badge">{count}</span>}
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">Things a prospect asked that it did not know how to answer. One line from you teaches it for next time.</p>
      {list.isLoading && <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading…</p>}
      {list.data === undefined && !list.isLoading && (
        <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Could not load the questions right now.{' '}
          <button type="button" onClick={() => { void list.refetch(); }} className="font-medium underline-offset-2 hover:underline">Try again</button>
        </p>
      )}
      {questions.length > 0 && (
        <ul className="mt-3 space-y-3">
          {questions.map(({ q, result }) => (
            <QuestionCard
              key={q.id}
              q={q}
              canAnswer={canAnswer}
              result={result}
              onAnswered={(r) => setAnswered((all) => ({ ...all, [q.id]: { q, result: r } }))}
              onDone={() => remove(q.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
