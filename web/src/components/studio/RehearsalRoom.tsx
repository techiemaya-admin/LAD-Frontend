'use client';

/**
 * RehearsalRoom — the owner plays a prospect against their own LinkedIn agent,
 * then gives feedback that becomes a Tailor proposal.
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

const PRESETS: Persona[] = [
  { name: 'Priya Nair', role: 'VP Talent Acquisition', company: 'Beta Health', situation: 'Just posted 12 nursing roles; already uses two agencies.' },
  { name: 'Marcus Lee', role: 'Founder', company: 'Lee & Co', situation: 'Small business owner, sceptical of anything that looks like a sales pitch.' },
  { name: 'Dana Ortiz', role: 'Operations Director', company: 'Orbit Logistics', situation: 'Interested but says budget opens next quarter.' },
];

export default function RehearsalRoom({ ready, draft, onDraft }: { ready: boolean; draft?: Overlay; onDraft: (o?: Overlay) => void }) {
  const { toast } = useToast();
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
      setResult(await refine.mutateAsync({ transcript, feedback: text, persona, draft }));
    } catch (e: unknown) {
      toast({ title: 'The Tailor could not answer', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    }
  };

  if (!ready) {
    return <p className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">The rehearsal room opens once your LinkedIn agent prompt exists. See the status above.</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="space-y-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Who are you playing?</h3>
            <div className="flex gap-1">
              {PRESETS.map(p => (
                <button key={p.name} type="button" onClick={() => { setPersona(p); reset(); }}
                  className={`rounded-md px-2 py-1 text-xs ${persona.name === p.name ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'}`}>
                  {p.name?.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Input placeholder="Name" value={persona.name ?? ''} onChange={e => setPersona({ ...persona, name: e.target.value })} />
            <Input placeholder="Role" value={persona.role ?? ''} onChange={e => setPersona({ ...persona, role: e.target.value })} />
            <Input placeholder="Company" value={persona.company ?? ''} onChange={e => setPersona({ ...persona, company: e.target.value })} />
          </div>
          <Textarea className="mt-2" rows={2} placeholder="Their situation (what the agent could plausibly know)" value={persona.situation ?? ''} onChange={e => setPersona({ ...persona, situation: e.target.value })} />
        </div>

        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <h3 className="text-sm font-semibold">Conversation</h3>
            <Button size="sm" variant="ghost" onClick={reset} disabled={!transcript.length}><RotateCcw className="mr-1 h-3.5 w-3.5" />Start over</Button>
          </div>
          <div className="max-h-[420px] min-h-[160px] space-y-2 overflow-y-auto px-4 py-3" aria-live="polite">
            {transcript.length === 0 && <p className="text-sm text-muted-foreground">Write what {persona.name?.split(' ')[0] || 'the prospect'} would say after connecting. Your agent replies as it would to a real prospect.</p>}
            {transcript.map((t, i) => (
              <div key={i} className={`flex ${t.role === 'prospect' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${t.role === 'prospect' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <div className="mb-0.5 text-[10px] uppercase tracking-wide opacity-70">{t.role === 'prospect' ? persona.name : 'Your agent'}</div>
                  {t.content}
                </div>
              </div>
            ))}
            {ended && <p className="text-center text-xs text-muted-foreground">The agent would stop here ({ended.replace(/_/g, ' ')}).</p>}
          </div>
          <div className="flex gap-2 border-t p-3">
            <Textarea rows={2} value={message} onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
              placeholder={`Say something as ${persona.name?.split(' ')[0] || 'the prospect'}…`} disabled={rehearse.isPending} />
            <Button onClick={send} disabled={rehearse.isPending || !message.trim()} aria-label="Send">
              {rehearse.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold">What should the agent have done differently?</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Plain words. The Tailor turns it into a change to the agent&apos;s instructions and shows you exactly what would change before anything is applied.</p>
          <Textarea className="mt-2" rows={4} value={feedback} onChange={e => setFeedback(e.target.value)}
            placeholder="e.g. Too pushy on the first message. Ask what they are hiring for before proposing a call, and mention our replacement guarantee when they raise risk." />
          <div className="mt-2 flex items-center gap-2">
            <Button size="sm" onClick={askTailor} disabled={refine.isPending || !feedback.trim()}>
              {refine.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />} Propose a change
            </Button>
            {transcript.length === 0 && <span className="text-xs text-muted-foreground">Works without a transcript too, but a rehearsal gives the Tailor something concrete.</span>}
          </div>
        </div>
        {result && (
          result.proposal ? (
            <ReviewCard proposal={result.proposal} reply={result.reply} appliesOnNextGenerate noteDefault="Studio rehearsal feedback"
              onApplied={() => onDraft(undefined)} onDiscard={() => setResult(null)} />
          ) : (
            <div className="rounded-lg border bg-card px-4 py-3 text-sm">{result.reply}</div>
          )
        )}
      </section>
    </div>
  );
}
