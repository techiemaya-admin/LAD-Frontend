'use client';

/**
 * IcpRoom — paste sample leads, see how the platform scores them, mark each
 * as a fit or not with a reason, and let the Tailor propose what should
 * change so the platform reads leads the way the owner does.
 *
 * Profile suggestions come back as text: the profile's values are not part
 * of the customisation and are edited on the Business Profile page.
 */
import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Sparkles, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  useIcpScore, useIcpTrain, type IcpTrainResult, type Overlay, type SampleLead, type Verdict,
} from '@lad/frontend-features/tenant-studio';
import ReviewCard from './ReviewCard';

interface Sample {
  id: number;
  lead: SampleLead;
  score: number | null;
  level: string | null;
  reasoning: string;
  verdict: Verdict | null;
  reason: string;
}

const LEVEL_TONE: Record<string, string> = { strong: 'text-emerald-700', moderate: 'text-amber-700', weak: 'text-rose-700' };
const EMPTY: SampleLead = { name: '', title: '', company: '', location: '', summary: '' };

export default function IcpRoom({ ready, draft, onDraft }: { ready: boolean; draft?: Overlay; onDraft: (o?: Overlay) => void }) {
  const { toast } = useToast();
  const [lead, setLead] = useState<SampleLead>(EMPTY);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [result, setResult] = useState<IcpTrainResult | null>(null);
  const score = useIcpScore();
  const train = useIcpTrain();

  const addAndScore = async () => {
    if (!lead.name?.trim() || score.isPending) return;
    try {
      const r = await score.mutateAsync(lead);
      setSamples(s => [...s, { id: Date.now(), lead, score: r.icpScore, level: r.matchLevel, reasoning: r.reasoning, verdict: null, reason: '' }]);
      setLead(EMPTY);
    } catch (e: unknown) {
      toast({ title: 'Could not score the lead', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const judged = samples.filter(s => s.verdict);
  const runTrain = async () => {
    if (!judged.length || train.isPending) return;
    try {
      setResult(await train.mutateAsync({ samples: judged.map(s => ({ lead: s.lead, verdict: s.verdict!, reason: s.reason, score: s.score })), draft }));
    } catch (e: unknown) {
      toast({ title: 'The Tailor could not answer', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const setSample = (id: number, patch: Partial<Sample>) => setSamples(s => s.map(x => (x.id === id ? { ...x, ...patch } : x)));

  if (!ready) {
    return <p className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">ICP training opens once the required Business Profile answers are in — the scorer reads them.</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="space-y-3">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold">Add a sample lead</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">A real one from LinkedIn or a made-up one that is typical. The platform scores it against your profile.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Input placeholder="Name *" value={lead.name ?? ''} onChange={e => setLead({ ...lead, name: e.target.value })} />
            <Input placeholder="Title / headline" value={lead.title ?? ''} onChange={e => setLead({ ...lead, title: e.target.value })} />
            <Input placeholder="Company" value={lead.company ?? ''} onChange={e => setLead({ ...lead, company: e.target.value })} />
            <Input placeholder="Location" value={lead.location ?? ''} onChange={e => setLead({ ...lead, location: e.target.value })} />
          </div>
          <Textarea className="mt-2" rows={2} placeholder="About / summary (optional)" value={lead.summary ?? ''} onChange={e => setLead({ ...lead, summary: e.target.value })} />
          <Button size="sm" className="mt-2" onClick={addAndScore} disabled={score.isPending || !lead.name?.trim()}>
            {score.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Score this lead
          </Button>
        </div>

        <ul className="space-y-2">
          {samples.map(s => (
            <li key={s.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{s.lead.name} <span className="font-normal text-muted-foreground">{[s.lead.title, s.lead.company].filter(Boolean).join(' · ')}</span></div>
                  <div className="text-xs">
                    <span className={`font-semibold ${LEVEL_TONE[s.level ?? ''] ?? ''}`}>{s.score ?? '—'}{s.level ? ` · ${s.level}` : ''}</span>
                    {s.reasoning && <span className="text-muted-foreground"> — {s.reasoning}</span>}
                  </div>
                </div>
                <button type="button" onClick={() => setSamples(x => x.filter(y => y.id !== s.id))} className="text-muted-foreground hover:text-foreground" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button size="sm" variant={s.verdict === 'fit' ? 'default' : 'outline'} onClick={() => setSample(s.id, { verdict: 'fit' })}><ThumbsUp className="mr-1 h-3.5 w-3.5" />A fit</Button>
                <Button size="sm" variant={s.verdict === 'not_fit' ? 'default' : 'outline'} onClick={() => setSample(s.id, { verdict: 'not_fit' })}><ThumbsDown className="mr-1 h-3.5 w-3.5" />Not a fit</Button>
                <Input className="min-w-[200px] flex-1" placeholder="Why? (one line helps the Tailor most)" value={s.reason} onChange={e => setSample(s.id, { reason: e.target.value })} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold">Teach the platform</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {judged.length ? `${judged.length} judged lead${judged.length === 1 ? '' : 's'}. ` : 'Judge at least one lead. '}
            The Tailor proposes which signals to watch, what to research about a company, and which profile answers to sharpen.
          </p>
          <Button size="sm" className="mt-2" onClick={runTrain} disabled={train.isPending || !judged.length}>
            {train.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />} Propose changes
          </Button>
        </div>
        {result && (
          <>
            {result.proposal ? (
              <ReviewCard proposal={result.proposal} reply={result.reply} noteDefault="Studio ICP training" onApplied={() => onDraft(undefined)} onDiscard={() => setResult(null)} />
            ) : (
              <div className="rounded-lg border bg-card px-4 py-3 text-sm">{result.reply}</div>
            )}
            {result.profileSuggestions && result.profileSuggestions.length > 0 && (
              <div className="rounded-lg border bg-card p-4">
                <h4 className="text-sm font-semibold">Suggested profile edits</h4>
                <p className="mt-0.5 text-xs text-muted-foreground">These are answers in your Business Profile, not part of the change above. Edit them on the{' '}
                  <Link href="/settings?tab=businessprofile" className="text-primary underline-offset-2 hover:underline">Business Profile</Link> page.</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {result.profileSuggestions.map((p, i) => (
                    <li key={i}><span className="font-medium">{p.field}</span> — {p.suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
