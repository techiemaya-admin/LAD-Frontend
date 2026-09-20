'use client';

/**
 * RehearsalRoom — the owner plays a prospect against their own LinkedIn agent,
 * then gives feedback that becomes a Tailor proposal.
 *
 * CURATED workspaces (`curated`): the agent on the other side is the WhatsApp
 * support agent (the pipeline prompt), the presets are members of the
 * studio, and the feedback targets the support agent's sections
 * (`refine({ target: 'customer_support' })`); applying goes through
 * apply-and-update so the card can say when the support agent picks the
 * change up. A builder workspace is unchanged: no target is sent, the
 * backend keeps its LinkedIn default, and the plain overlay PUT applies.
 *
 * The transcript lives only in this component; nothing is stored server-side.
 * Voice: the message box accepts dictation like any textarea.
 */
import { useState } from 'react';
import { Loader2, RotateCcw, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  useRefine, useRehearse, type Overlay, type Persona, type RefineResult, type TranscriptTurn,
} from '@lad/frontend-features/tenant-studio';
import ReviewCard from './ReviewCard';
import { BORDER, BUBBLE_AGENT, BUBBLE_ME, CARD, CHIP_BASE, CHIP_IDLE, CHIP_SELECTED, CTA_PRIMARY, INPUT_FOCUS, PANEL } from './studio-theme';

/** Builder workspaces: B2B prospects for the LinkedIn agent. */
const BUILDER_PRESETS: Persona[] = [
  { name: 'Priya Nair', role: 'VP Talent Acquisition', company: 'Beta Health', situation: 'Just posted 12 nursing roles; already uses two agencies.' },
  { name: 'Marcus Lee', role: 'Founder', company: 'Lee & Co', situation: 'Small business owner, sceptical of anything that looks like a sales pitch.' },
  { name: 'Dana Ortiz', role: 'Operations Director', company: 'Orbit Logistics', situation: 'Interested but says budget opens next quarter.' },
];

/** Curated workspaces (wellness): members and would-be members of the studio, messaging its support agent on WhatsApp. */
const CURATED_PRESETS: Persona[] = [
  { name: 'Aisha Khan', role: 'Prospective member', company: '', situation: 'Wants to try reformer pilates, asks about price and parking.' },
  { name: 'Omar Haddad', role: 'Current member', company: '', situation: 'Booked into tomorrow 7am and needs to move it to the evening.' },
  { name: 'Lena Fischer', role: 'Current member', company: '', situation: 'Wants to cancel a class that starts in two hours — inside the cancellation cutoff.' },
];

export interface RehearsalRoomProps {
  ready: boolean;
  draft?: Overlay;
  onDraft: (o?: Overlay) => void;
  /** Curated workspace: rehearse the WhatsApp support agent, not the LinkedIn agent. */
  curated?: boolean;
}

export default function RehearsalRoom({ ready, draft, onDraft, curated = false }: RehearsalRoomProps) {
  const { toast } = useToast();
  const PRESETS = curated ? CURATED_PRESETS : BUILDER_PRESETS;
  const agentLabel = curated ? 'Your support agent' : 'Your agent';
  const [persona, setPersona] = useState<Persona>(PRESETS[0]);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [message, setMessage] = useState('');
  const [ended, setEnded] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [result, setResult] = useState<RefineResult | null>(null);
  const rehearse = useRehearse();
  const refine = useRefine();

  const send = async () => {
    const text = message.trim();
    if (!text || rehearse.isPending) return;
    try {
      const r = await rehearse.mutateAsync({ persona, history: transcript, message: text });
      setTranscript(r.transcript);
      setMessage('');
      if (r.stopAgent) setEnded(r.stopReason ?? 'stopped');
    } catch (e: unknown) {
      toast({ title: 'The agent could not answer', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const reset = () => { setTranscript([]); setEnded(null); setResult(null); setFeedback(''); };

  const askTailor = async () => {
    const text = feedback.trim();
    if (!text || refine.isPending) return;
    try {
      setResult(await refine.mutateAsync({ transcript, feedback: text, persona, draft, ...(curated ? { target: 'customer_support' as const } : {}) }));
    } catch (e: unknown) {
      toast({ title: 'The Tailor could not answer', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    }
  };

  if (!ready) {
    return (
      <p className={`${PANEL} p-4 text-sm text-muted-foreground`}>
        {curated
          ? 'The rehearsal room opens once your support agent can answer — switch the customer support pipeline on and fill in its settings in the Pipelines room.'
          : 'The rehearsal room opens once your LinkedIn agent prompt exists. See the status above.'}
      </p>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="space-y-3">
        <div className={`${CARD} p-4`}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight">Who are you playing?</h3>
            <div className="flex gap-1">
              {PRESETS.map(p => (
                <button key={p.name} type="button" onClick={() => { setPersona(p); reset(); }}
                  className={`${CHIP_BASE} px-2.5 py-1 text-xs ${persona.name === p.name ? CHIP_SELECTED : CHIP_IDLE}`}>
                  {p.name?.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
          <div className={`grid gap-2 ${curated ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
            <Input placeholder="Name" value={persona.name ?? ''} onChange={e => setPersona({ ...persona, name: e.target.value })} className={INPUT_FOCUS} />
            <Input placeholder={curated ? 'Member or prospective member' : 'Role'} value={persona.role ?? ''} onChange={e => setPersona({ ...persona, role: e.target.value })} className={INPUT_FOCUS} />
            {!curated && <Input placeholder="Company" value={persona.company ?? ''} onChange={e => setPersona({ ...persona, company: e.target.value })} className={INPUT_FOCUS} />}
          </div>
          <Textarea className={`mt-2 ${INPUT_FOCUS}`} rows={2} placeholder={curated ? 'Their situation (what they want, what they have booked)' : 'Their situation (what the agent could plausibly know)'} value={persona.situation ?? ''} onChange={e => setPersona({ ...persona, situation: e.target.value })} />
        </div>

        <div className={CARD}>
          <div className={`flex items-center justify-between border-b ${BORDER} px-4 py-2`}>
            <h3 className="text-sm font-semibold tracking-tight" data-testid="rehearsal-header">{curated ? 'Your support agent on WhatsApp' : 'Conversation'}</h3>
            <Button size="sm" variant="ghost" onClick={reset} disabled={!transcript.length}><RotateCcw className="mr-1 h-3.5 w-3.5" />Start over</Button>
          </div>
          <div className="max-h-[420px] min-h-[160px] space-y-2 overflow-y-auto px-4 py-3" aria-live="polite">
            {transcript.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {curated
                  ? `Write what ${persona.name?.split(' ')[0] || 'the member'} would send on WhatsApp. Your support agent replies as it would to a real member.`
                  : `Write what ${persona.name?.split(' ')[0] || 'the prospect'} would say after connecting. Your agent replies as it would to a real prospect.`}
              </p>
            )}
            {transcript.map((t, i) => (
              <div key={i} className={`flex ${t.role === 'prospect' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap px-3 py-2 text-sm ${t.role === 'prospect' ? `rounded-2xl rounded-br-md ${BUBBLE_ME}` : `rounded-2xl rounded-bl-md ${BUBBLE_AGENT}`}`}>
                  <div className={`mb-0.5 text-[10px] uppercase tracking-wide ${t.role === 'prospect' ? 'opacity-80' : 'text-muted-foreground'}`}>{t.role === 'prospect' ? persona.name : agentLabel}</div>
                  {t.content}
                </div>
              </div>
            ))}
            {ended && <p className="text-center text-xs text-muted-foreground">The agent would stop here ({ended.replace(/_/g, ' ')}).</p>}
          </div>
          <div className={`flex gap-2 border-t ${BORDER} p-3`}>
            <Textarea rows={2} value={message} onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
              placeholder={`Say something as ${persona.name?.split(' ')[0] || (curated ? 'the member' : 'the prospect')}…`} disabled={rehearse.isPending} className={INPUT_FOCUS} />
            <Button onClick={send} disabled={rehearse.isPending || !message.trim()} aria-label="Send" className={CTA_PRIMARY}>
              {rehearse.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className={`${CARD} p-4`}>
          <h3 className="text-sm font-semibold tracking-tight">{curated ? 'What should the support agent have done differently?' : 'What should the agent have done differently?'}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Plain words. The Tailor turns it into a change to the {curated ? 'support ' : ''}agent&apos;s instructions and shows you exactly what would change before anything is applied.</p>
          <Textarea className={`mt-2 ${INPUT_FOCUS}`} rows={4} value={feedback} onChange={e => setFeedback(e.target.value)}
            placeholder={curated
              ? 'e.g. It handed over as soon as she asked the price. Say the class-pack range first and offer a trial class, and mention the parking behind the building.'
              : 'e.g. Too pushy on the first message. Ask what they are hiring for before proposing a call, and mention our replacement guarantee when they raise risk.'} />
          <div className="mt-2 flex items-center gap-2">
            <Button size="sm" onClick={askTailor} disabled={refine.isPending || !feedback.trim()} className={CTA_PRIMARY}>
              {refine.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />} Propose a change
            </Button>
            {transcript.length === 0 && <span className="text-xs text-muted-foreground">Works without a transcript too, but a rehearsal gives the Tailor something concrete.</span>}
          </div>
        </div>
        {result && (
          result.proposal ? (
            <ReviewCard proposal={result.proposal} reply={result.reply}
              appliesOnNextConversation={result.appliesOn === 'next_conversation'}
              appliesOnNextGenerate={result.appliesOn !== 'next_conversation'}
              applyAndUpdate={curated}
              noteDefault="Studio rehearsal feedback"
              onApplied={() => onDraft(undefined)} onDiscard={() => setResult(null)} />
          ) : (
            <div className={`${CARD} px-4 py-3 text-sm`}>{result.reply}</div>
          )
        )}
      </section>
    </div>
  );
}
