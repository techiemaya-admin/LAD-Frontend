'use client';

/**
 * PlanReview — the review card for a proposed setup.
 *
 * The plan the manager proposed is a DRAFT the tenant edits in place: the
 * summary, every profile value, goals, channel and routine toggles, the
 * first campaign, and the answers to what it still needs. Nothing is saved
 * until "Looks right, save" posts the edited plan + answers + approval mode
 * to /api/snapshot/studio/brief/apply.
 *
 * Field names come from the tenant's profile contract
 * (GET /api/ai-playground/contract) so a vertical's wording shows here too;
 * the key is humanised when the contract has no label for it.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle, Building2, ChevronDown, ChevronRight, Flag, Loader2, Mail, MessageCircle, Instagram, Linkedin, Phone,
  Repeat, Rocket, RotateCcw, Check, Trash2, Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { getProfileContract, humaniseFieldKey } from '@lad/frontend-features/ai-icp-assistant';
import {
  useApplyBrief,
  type ApplyResult,
  type ApprovalMode,
  type BriefChannel,
  type BriefPlan,
  type BriefResult,
  type BriefRoutineKey,
  type GoalHorizon,
  type GoalInput,
} from '@lad/frontend-features/tenant-studio';

const CHANNEL_META: Record<BriefChannel, { label: string; icon: typeof Mail }> = {
  email: { label: 'Email', icon: Mail },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle },
  instagram: { label: 'Instagram', icon: Instagram },
  linkedin: { label: 'LinkedIn', icon: Linkedin },
  voice: { label: 'Voice calls', icon: Phone },
};
const ROUTINE_LABELS: Record<BriefRoutineKey, string> = {
  daily_summary_8am: 'Daily summary at 8am',
  weekly_pipeline_review: 'Weekly pipeline review',
  reply_within_1h: 'Reply within an hour',
  followup_every_3_days: 'Follow up every 3 days',
};
const HORIZONS: { value: GoalHorizon; label: string }[] = [
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
  { value: '3y', label: '3 years' },
];

function Section({ icon: Icon, title, count, defaultOpen = true, children }: {
  icon: typeof Mail; title: string; count?: string; defaultOpen?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
      >
        <span className="rounded-md bg-primary/10 p-1.5 text-primary"><Icon className="h-4 w-4" /></span>
        <span className="flex-1 font-semibold">{title}</span>
        {count && <span className="text-xs text-muted-foreground">{count}</span>}
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="border-t px-4 py-3">{children}</div>}
    </section>
  );
}

/** A label: value row whose value edits in place. */
function ValueRow({ label, value, onChange, multiline }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean;
}) {
  const id = `plan-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[180px_1fr] sm:gap-3">
      <Label htmlFor={id} className="text-xs text-muted-foreground sm:pt-2.5 sm:text-sm">{label}</Label>
      {multiline || value.length > 80 ? (
        <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={2} className="min-h-[60px] text-sm" />
      ) : (
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-9 text-sm" />
      )}
    </div>
  );
}

export interface PlanReviewProps {
  result: BriefResult;
  /** What the tenant said and linked — sent with the apply so it is stored with the setup. */
  brief: string;
  links: string[];
  onApplied: (result: ApplyResult) => void;
  onStartOver: () => void;
}

export default function PlanReview({ result, brief, links, onApplied, onStartOver }: PlanReviewProps) {
  const { toast } = useToast();
  const apply = useApplyBrief();
  const [plan, setPlan] = useState<BriefPlan>(() => ({
    ...result.plan,
    profile: { ...result.plan.profile },
    goals: result.plan.goals.map((g) => ({ ...g })),
    channels: result.plan.channels.map((c) => ({ ...c })),
    routines: result.plan.routines.map((r) => ({ ...r })),
    firstCampaign: result.plan.firstCampaign ? { ...result.plan.firstCampaign } : null,
  }));
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>('ask_first');

  const contract = useQuery({
    queryKey: ['profileContract'],
    queryFn: getProfileContract,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const labelFor = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of contract.data?.fields ?? []) if (f.label) map.set(f.key, f.label);
    return (key: string, fallback?: string) => map.get(key) ?? fallback ?? humaniseFieldKey(key);
  }, [contract.data]);

  const blocking = new Set(plan.blockingMissing);
  const isNeeded = (q: { field: string; required: boolean }) => q.required || blocking.has(q.field);
  const unansweredBlocking = plan.questions.filter((q) => isNeeded(q) && !(answers[q.field] ?? '').trim());

  const setProfile = (key: string, value: string) => setPlan((p) => ({ ...p, profile: { ...p.profile, [key]: value } }));
  const setGoal = (i: number, patch: Partial<GoalInput>) =>
    setPlan((p) => ({ ...p, goals: p.goals.map((g, j) => (j === i ? { ...g, ...patch } : g)) }));
  const removeGoal = (i: number) => setPlan((p) => ({ ...p, goals: p.goals.filter((_, j) => j !== i) }));
  const addGoal = () => setPlan((p) => ({ ...p, goals: [...p.goals, { horizon: '90d', metric: '', target: 0, unit: null, dueDate: null, notes: null }] }));
  const setChannel = (key: BriefChannel, on: boolean) =>
    setPlan((p) => ({ ...p, channels: p.channels.map((c) => (c.key === key ? { ...c, on } : c)) }));
  const setRoutine = (key: string, on: boolean) =>
    setPlan((p) => ({ ...p, routines: p.routines.map((r) => (r.key === key ? { ...r, on } : r)) }));
  const setCampaign = (field: 'offering' | 'channel' | 'audience' | 'goal', value: string) =>
    setPlan((p) => (p.firstCampaign ? { ...p, firstCampaign: { ...p.firstCampaign, [field]: field === 'channel' && !value.trim() ? null : value } } : p));

  const save = () => {
    const trimmedAnswers: Record<string, string> = {};
    for (const [k, v] of Object.entries(answers)) if (v.trim()) trimmedAnswers[k] = v.trim();
    apply.mutate(
      { plan, answers: trimmedAnswers, approvalMode, brief, links },
      {
        onSuccess: (res) => {
          toast({
            title: 'Setup saved',
            description: `${res.saved.profileKeys} profile answer${res.saved.profileKeys === 1 ? '' : 's'} and ${res.saved.goals} goal${res.saved.goals === 1 ? '' : 's'} recorded.`,
          });
          onApplied(res);
        },
        onError: (err) => {
          toast({ title: 'Could not save', description: err instanceof Error ? err.message : 'Try again in a moment.', variant: 'destructive' });
        },
      },
    );
  };

  const profileEntries = Object.entries(plan.profile);
  const sources = [result.sources.website && 'website', result.sources.linkedin && 'LinkedIn', result.sources.instagram && 'Instagram'].filter(Boolean) as string[];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold leading-snug sm:text-2xl">Here&apos;s what we understood. Edit anything that looks wrong.</h2>
        {sources.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">Read your {sources.join(', ')} alongside what you told it.</p>
        )}
        <Label htmlFor="plan-summary" className="sr-only">Summary</Label>
        <Textarea
          id="plan-summary"
          value={plan.summary}
          onChange={(e) => setPlan((p) => ({ ...p, summary: e.target.value }))}
          rows={4}
          className="mt-3 min-h-[100px] text-base leading-relaxed"
        />
      </div>

      <Section icon={Building2} title="About your business" count={`${profileEntries.length} field${profileEntries.length === 1 ? '' : 's'}`}>
        {profileEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing proposed yet — the questions below fill this in.</p>
        ) : (
          <div className="divide-y">
            {profileEntries.map(([key, value]) => (
              <ValueRow key={key} label={labelFor(key)} value={value} onChange={(v) => setProfile(key, v)} />
            ))}
          </div>
        )}
      </Section>

      <Section icon={Flag} title="Goals" count={`${plan.goals.length}`} defaultOpen={plan.goals.length > 0}>
        <div className="space-y-3">
          {plan.goals.length === 0 && <p className="text-sm text-muted-foreground">No goals proposed. Add one, or skip — goals improve results but are not required.</p>}
          {plan.goals.map((g, i) => (
            <div key={i} className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_100px_100px_110px_auto] sm:items-end">
              <div>
                <Label htmlFor={`goal-metric-${i}`} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  What to hit
                  {g.suggested && <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal" title="A starting target it invented — change it to yours">suggested</Badge>}
                </Label>
                <Input id={`goal-metric-${i}`} value={g.metric} onChange={(e) => setGoal(i, { metric: e.target.value })} placeholder="New customers" className="mt-1 h-9 text-sm" />
              </div>
              <div>
                <Label htmlFor={`goal-target-${i}`} className="text-xs text-muted-foreground">Target</Label>
                <Input id={`goal-target-${i}`} type="number" inputMode="decimal" value={Number.isFinite(g.target) ? g.target : ''} onChange={(e) => setGoal(i, { target: Number(e.target.value), suggested: false })} className="mt-1 h-9 text-sm" />
              </div>
              <div>
                <Label htmlFor={`goal-unit-${i}`} className="text-xs text-muted-foreground">Unit</Label>
                <Input id={`goal-unit-${i}`} value={g.unit ?? ''} onChange={(e) => setGoal(i, { unit: e.target.value })} placeholder="deals" className="mt-1 h-9 text-sm" />
              </div>
              <div>
                <Label htmlFor={`goal-horizon-${i}`} className="text-xs text-muted-foreground">By when</Label>
                <select
                  id={`goal-horizon-${i}`}
                  value={g.horizon ?? '90d'}
                  onChange={(e) => setGoal(i, { horizon: e.target.value as GoalHorizon })}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                >
                  {HORIZONS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                </select>
              </div>
              <Button type="button" size="icon-sm" variant="ghost" onClick={() => removeGoal(i)} aria-label={`Remove goal ${i + 1}`} className="justify-self-end">
                <Trash2 className="h-4 w-4" />
              </Button>
              {typeof g.dailyPace === 'number' && g.dailyPace > 0 && (
                <p className="text-xs text-muted-foreground sm:col-span-5">About {g.dailyPace} {g.unit || ''} a day to stay on pace.</p>
              )}
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={addGoal}><Plus className="h-4 w-4" />Add a goal</Button>
        </div>
      </Section>

      <Section icon={Mail} title="Channels" count={`${plan.channels.filter((c) => c.on).length} on`}>
        <ul className="divide-y">
          {plan.channels.map((c) => {
            const meta = CHANNEL_META[c.key] ?? { label: c.key, icon: Mail };
            const Icon = meta.icon;
            return (
              <li key={c.key} className="flex items-start gap-3 py-2.5">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <Label htmlFor={`channel-${c.key}`} className="font-medium">{meta.label}</Label>
                  {c.reason && <p className="mt-0.5 text-xs text-muted-foreground">{c.reason}</p>}
                </div>
                <Switch id={`channel-${c.key}`} checked={c.on} onCheckedChange={(on) => setChannel(c.key, on)} aria-label={`${meta.label} ${c.on ? 'on' : 'off'}`} />
              </li>
            );
          })}
        </ul>
      </Section>

      <Section icon={Repeat} title="Routines" count={`${plan.routines.filter((r) => r.on).length} on`} defaultOpen={plan.routines.length > 0}>
        {plan.routines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No routines proposed.</p>
        ) : (
          <ul className="divide-y">
            {plan.routines.map((r) => (
              <li key={r.key} className="flex items-center gap-3 py-2.5">
                <Label htmlFor={`routine-${r.key}`} className="flex-1 font-normal">{ROUTINE_LABELS[r.key] ?? humaniseFieldKey(r.key)}</Label>
                <Switch id={`routine-${r.key}`} checked={r.on} onCheckedChange={(on) => setRoutine(r.key, on)} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section icon={Rocket} title="First campaign" defaultOpen={Boolean(plan.firstCampaign)}>
        {plan.firstCampaign ? (
          <div className="divide-y">
            <ValueRow label="What to offer" value={plan.firstCampaign.offering} onChange={(v) => setCampaign('offering', v)} />
            <ValueRow label="Channel" value={plan.firstCampaign.channel ?? ''} onChange={(v) => setCampaign('channel', v)} />
            <ValueRow label="Who to reach" value={plan.firstCampaign.audience} onChange={(v) => setCampaign('audience', v)} />
            <ValueRow label="Goal" value={plan.firstCampaign.goal} onChange={(v) => setCampaign('goal', v)} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">It will suggest one once the questions below are answered.</p>
        )}
      </Section>

      {plan.questions.length > 0 && (
        <section className="rounded-lg border bg-card">
          <div className="px-4 py-3">
            <h3 className="font-semibold">A few things we still need</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Short answers are fine. You can leave the optional ones for later.</p>
          </div>
          <ul className="divide-y border-t">
            {plan.questions.map((q) => {
              const needed = isNeeded(q);
              const id = `answer-${q.field}`;
              return (
                <li key={q.field} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Label htmlFor={id} className="font-medium">{labelFor(q.field, q.label)}</Label>
                    {needed && (
                      <Badge variant="destructive" className="gap-1 text-[11px]"><AlertCircle className="h-3 w-3" />Needed before launch</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{q.question}</p>
                  <Input
                    id={id}
                    value={answers[q.field] ?? ''}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.field]: e.target.value }))}
                    className="mt-2 h-9 text-sm"
                    aria-required={needed}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="rounded-lg border bg-card px-4 py-3">
        <h3 className="font-semibold">How should it work?</h3>
        <RadioGroup value={approvalMode} onValueChange={(v) => setApprovalMode(v as ApprovalMode)} className="mt-3 gap-2.5">
          <label htmlFor="approval-ask" className="flex cursor-pointer items-start gap-3 rounded-md border p-3 has-[[data-state=checked]]:border-primary">
            <RadioGroupItem id="approval-ask" value="ask_first" className="mt-0.5" />
            <span className="text-sm">
              <span className="font-medium">Ask me before anything is sent</span>
              <span className="block text-xs text-muted-foreground">Recommended for the first weeks.</span>
            </span>
          </label>
          <label htmlFor="approval-auto" className="flex cursor-pointer items-start gap-3 rounded-md border p-3 has-[[data-state=checked]]:border-primary">
            <RadioGroupItem id="approval-auto" value="autopilot" className="mt-0.5" />
            <span className="text-sm">
              <span className="font-medium">Let it run</span>
              <span className="block text-xs text-muted-foreground">It sends and follows up on its own; you see everything in the overview.</span>
            </span>
          </label>
        </RadioGroup>
      </section>

      {unansweredBlocking.length > 0 && (
        <p className="text-xs text-muted-foreground">
          You can save now; {unansweredBlocking.length} answer{unansweredBlocking.length === 1 ? ' is' : 's are'} still needed before the first campaign can launch.
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="ghost" onClick={onStartOver} disabled={apply.isPending}>
          <RotateCcw className="h-4 w-4" />Start over
        </Button>
        <Button type="button" size="lg" onClick={save} disabled={apply.isPending} className="w-full sm:w-auto">
          {apply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Looks right, save
        </Button>
      </div>
    </div>
  );
}
