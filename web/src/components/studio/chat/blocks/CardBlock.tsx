'use client';

/**
 * CardBlock — the compact, read-only summaries a lad turn embeds. Each kind
 * carries the SAME data shape the full surface reads (the brief plan, the
 * first-campaign draft, the launch status, a pipeline summary, the studio
 * state), so the card never invents a field; the full surface stays one
 * "expand" away through the actions the turn carries.
 */
import { useState } from 'react';
import {
  CheckCircle2, ChevronDown, ChevronRight, Circle, CircleAlert, Flag, ListChecks, MessageSquareText, Pencil, Rocket, SlidersHorizontal, Target, Users,
} from 'lucide-react';
import { humaniseFieldKey } from '@lad/frontend-features/ai-icp-assistant';
import {
  isPipelineDraft,
  type BriefPlan,
  type ChatCardBlock,
  type FirstCampaignDraft,
  type LaunchStatus,
  type PipelineSummary,
  type StudioState,
} from '@lad/frontend-features/tenant-studio';
import { buildStateLabel, goalLabel, isLivePipeline } from '@/components/pipelines/PipelineCard';
import { launchRowTitle } from '../../StudioLaunchBanner';
import { useStudioChatContext } from '../chat-context';
import { BORDER, CARD, DIVIDE, ICON_TILE, LINK, ROW_NEEDED, STATUS, TINT } from '../../studio-theme';

const CHANNEL_LABEL: Record<string, string> = { linkedin: 'LinkedIn', email: 'Email', whatsapp: 'WhatsApp', instagram: 'Instagram', voice: 'Voice' };
const ROUTINE_LABEL: Record<string, string> = {
  daily_summary_8am: 'Daily summary at 8am',
  weekly_pipeline_review: 'Weekly pipeline review',
  reply_within_1h: 'Reply within an hour',
  followup_every_3_days: 'Follow up every 3 days',
};

function Shell({ icon: Icon, title, hint, children, testId }: { icon: typeof Flag; title: string; hint?: string; children: React.ReactNode; testId: string }) {
  return (
    <section className={`${CARD} overflow-hidden`} data-testid={testId}>
      <header className={`flex items-start gap-2.5 border-b ${BORDER} px-3.5 py-2.5`}>
        <span className={`${ICON_TILE} mt-0.5 h-7 w-7 shrink-0`}><Icon className="h-4 w-4" aria-hidden /></span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </header>
      <div className="px-3.5 py-2.5 text-sm">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-1 text-sm">
      <dt className="w-24 shrink-0 text-xs text-muted-foreground sm:w-32 sm:text-sm">{label}</dt>
      <dd className="min-w-0 flex-1 break-words">{children}</dd>
    </div>
  );
}

function More({ open, onToggle, label }: { open: boolean; onToggle: () => void; label: string }) {
  return (
    <button type="button" onClick={onToggle} aria-expanded={open} className={`mt-1 inline-flex items-center gap-1 text-xs ${LINK}`}>
      {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}{label}
    </button>
  );
}

/* ------------------------------------------------------------------ */

/** The profile facts a plan card leads with, in reading order; everything else sits behind "All N details". */
const PLAN_HEADLINE = ['companyName', 'industry', 'productsServices', 'valueProposition', 'targetCustomers', 'icpJobTitles', 'icpLocations', 'geographicFocus', 'website'];
const PLAN_SHOWN = 5;

function PlanCard({ plan }: { plan: BriefPlan }) {
  const { openPlanReview } = useStudioChatContext();
  const [open, setOpen] = useState(false);
  // Headline facts first (what a manager would read back), the rest behind "All N details";
  // labels come from the pack's field contract, never from humanising a key.
  const entries = Object.entries(plan.profile ?? {}).filter(([, v]) => typeof v === 'string' && v.trim());
  const rank = (k: string) => { const i = PLAN_HEADLINE.indexOf(k); return i === -1 ? PLAN_HEADLINE.length : i; };
  const profile = [...entries].sort((a, b) => rank(a[0]) - rank(b[0]));
  const labelOf = (k: string) => plan.fieldLabels?.[k] ?? humaniseFieldKey(k);
  const shown = open ? profile : profile.slice(0, PLAN_SHOWN);
  const channelsOn = (plan.channels ?? []).filter((c) => c.on).map((c) => CHANNEL_LABEL[c.key] ?? c.key);
  const routinesOn = (plan.routines ?? []).filter((r) => r.on).map((r) => ROUTINE_LABEL[r.key] ?? humaniseFieldKey(r.key));
  const needed = (plan.questions ?? []).filter((q) => q.required || (plan.blockingMissing ?? []).includes(q.field)).length;
  return (
    <Shell icon={ListChecks} title="Your plan" hint={plan.summary ? undefined : 'What it understood from your brief.'} testId="chat-card-plan">
      {plan.summary && <p className="leading-relaxed">{plan.summary}</p>}
      <dl className={`mt-2 divide-y ${DIVIDE}`}>
        {shown.map(([k, v]) => <Row key={k} label={labelOf(k)}>{v}</Row>)}
        {(plan.goals ?? []).length > 0 && (
          <Row label="Goals">
            {plan.goals.map((g, i) => (
              <span key={i} className="block">{g.metric}{Number.isFinite(g.target) && g.target > 0 ? ` — ${g.target}${g.unit ? ` ${g.unit}` : ''}` : ''}{g.horizon ? ` in ${g.horizon === '90d' ? '90 days' : g.horizon === '1y' ? 'a year' : '3 years'}` : ''}</span>
            ))}
          </Row>
        )}
        {channelsOn.length > 0 && <Row label="Channels on">{channelsOn.join(', ')}</Row>}
        {routinesOn.length > 0 && <Row label="Routines">{routinesOn.join(' · ')}</Row>}
        {plan.firstCampaign && (
          <Row label="First campaign">{plan.firstCampaign.offering}{plan.firstCampaign.channel ? ` on ${CHANNEL_LABEL[plan.firstCampaign.channel] ?? plan.firstCampaign.channel}` : ''}{plan.firstCampaign.audience ? ` to ${plan.firstCampaign.audience}` : ''}</Row>
        )}
      </dl>
      {profile.length > PLAN_SHOWN && <More open={open} onToggle={() => setOpen((o) => !o)} label={open ? 'Fewer details' : `All ${profile.length} details`} />}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {needed > 0 && <span className={TINT.warnText}>{needed} answer{needed === 1 ? '' : 's'} still needed before launch — it asks below.</span>}
        {openPlanReview && (
          <button type="button" onClick={() => openPlanReview(plan)} className={`inline-flex items-center gap-1 ${LINK}`} data-testid="chat-plan-edit">
            <Pencil className="h-3 w-3" />Edit the full plan
          </button>
        )}
      </div>
    </Shell>
  );
}

function dayLabel(day: number): string {
  return day <= 0 ? 'Day 1' : `Day ${day + 1}`;
}

function FirstCampaignCard({ draft }: { draft: FirstCampaignDraft }) {
  const [open, setOpen] = useState(false);
  if (isPipelineDraft(draft)) {
    const missing = draft.knobsMissing?.length ?? 0;
    const live = draft.status === 'launched' || Boolean(draft.launchedPipelineKey);
    return (
      <Shell icon={Rocket} title="Your first pipeline" hint={live ? 'Switched on.' : 'Go live switches it on.'} testId="chat-card-first-campaign">
        {draft.summary && <p className="leading-relaxed">{draft.summary}</p>}
        <dl className={`mt-2 divide-y ${DIVIDE}`}>
          <Row label="Pipeline">{draft.pipeline?.name}</Row>
          <Row label="Channel">WhatsApp{draft.from?.agentName ? ` · from ${draft.from.agentName}` : ''}</Row>
          {goalLabel(draft.pipeline?.goal) && <Row label="Aims for">{goalLabel(draft.pipeline?.goal)}</Row>}
          <Row label="Settings"><span className={missing ? TINT.warnText : TINT.readyText}>{missing ? `${missing} still to set` : 'All set'}</span></Row>
        </dl>
      </Shell>
    );
  }
  const live = draft.status === 'launched' || Boolean(draft.launchedCampaignId);
  const msgs = draft.messages ?? [];
  return (
    <Shell icon={Rocket} title="Your first campaign" hint={live ? 'Live.' : 'Drafted — nothing sends until you say so.'} testId="chat-card-first-campaign">
      {draft.summary && <p className="leading-relaxed">{draft.summary}</p>}
      <dl className={`mt-2 divide-y ${DIVIDE}`}>
        <Row label="Offer">{draft.offering}</Row>
        <Row label="Channel">{CHANNEL_LABEL[draft.channel] ?? draft.channel}{draft.from?.agentName ? ` · from ${draft.from.agentName}` : ''}</Row>
        {draft.audience?.summary && <Row label="Who">{draft.audience.summary}</Row>}
        {typeof draft.count === 'number' && <Row label="How many">{draft.count} people</Row>}
      </dl>
      {msgs.length > 0 && <More open={open} onToggle={() => setOpen((o) => !o)} label={open ? 'Hide the messages' : `Read the ${msgs.length} message${msgs.length === 1 ? '' : 's'}`} />}
      {open && (
        <ol className="mt-2 space-y-2">
          {msgs.map((m, i) => (
            <li key={i} className={`rounded-xl border ${BORDER} bg-slate-50/70 px-3 py-2 dark:bg-white/[.04]`} data-testid={`chat-fc-message-${i}`}>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{dayLabel(m.day)}{m.subject ? ` · ${m.subject}` : ''}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{m.body}</p>
            </li>
          ))}
        </ol>
      )}
    </Shell>
  );
}

function LaunchCard({ launch }: { launch: LaunchStatus }) {
  const rows = Array.isArray(launch.rows) ? launch.rows : [];
  const blocking = Array.isArray(launch.blocking) ? launch.blocking : [];
  const c = launch.credits;
  const balance = c && !c.unknown && c.balance !== null ? Number(c.balance) : null;
  return (
    <Shell
      icon={Rocket}
      title={launch.canGoLive ? 'Ready to go live' : `${blocking.length} thing${blocking.length === 1 ? '' : 's'} before go-live`}
      hint={launch.canGoLive ? 'Everything a launch needs is in place.' : blocking.map(launchRowTitle).join(', ')}
      testId="chat-card-launch"
    >
      {launch.summary && <p className="leading-relaxed">{launch.summary}</p>}
      {rows.length > 0 && (
        <ul className={`mt-2 divide-y ${DIVIDE} overflow-hidden rounded-xl border ${BORDER}`}>
          {rows.map((row) => (
            <li key={row.key} className={`flex gap-2.5 px-3 py-2 ${row.status === 'needed' ? ROW_NEEDED : ''}`} data-testid={`chat-launch-row-${row.key}`}>
              <span className="mt-0.5 shrink-0">
                {row.status === 'ready'
                  ? <CheckCircle2 className={`h-4 w-4 ${TINT.ready}`} aria-label="ready" />
                  : row.status === 'needed'
                    ? <CircleAlert className={`h-4 w-4 ${TINT.warn}`} aria-label="needed" />
                    : <Circle className="h-4 w-4 text-muted-foreground" aria-label="optional" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm ${row.status === 'optional' ? 'text-muted-foreground' : 'font-medium'}`}>{row.title}</span>
                {row.detail && <span className="block text-xs text-muted-foreground">{row.detail}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {c && (
        <p className={`mt-2 text-xs ${balance === null ? TINT.warnText : 'text-muted-foreground'}`}>
          {balance === null ? 'Your wallet could not be read.' : `${balance.toLocaleString()} credits available.`}
          {c.firstWeek ? ` About ${Math.ceil(c.firstWeek.credits).toLocaleString()} for the first week.` : c.note ? ` ${c.note}` : ''}
        </p>
      )}
    </Shell>
  );
}

function PipelineCardCompact({ pipeline }: { pipeline: PipelineSummary }) {
  const live = isLivePipeline(pipeline);
  const on = pipeline.entitled && pipeline.active;
  const missing = pipeline.knobsMissing?.length ?? 0;
  const goal = goalLabel(pipeline.goal);
  return (
    <Shell icon={SlidersHorizontal} title={pipeline.name} hint={pipeline.blurb} testId={`chat-card-pipeline-${pipeline.key}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full border px-2 py-0.5 font-medium ${!pipeline.entitled ? STATUS.optional : on ? STATUS.ready : STATUS.optional}`}>
          {!pipeline.entitled ? 'Not in your plan' : !live ? buildStateLabel(pipeline) : on ? (pipeline.campaignCount > 0 ? `On — ${pipeline.campaignCount} campaign${pipeline.campaignCount === 1 ? '' : 's'}` : 'On') : 'Off'}
        </span>
        {goal && <span className="inline-flex items-center gap-1 text-muted-foreground"><Target className="h-3.5 w-3.5 text-[#7C5CFF] dark:text-[#B69CFF]" aria-hidden />Aims for {goal}</span>}
      </div>
      {missing > 0 && <p className={`mt-2 rounded-xl border px-3 py-1.5 text-xs ${STATUS.warn}`}>{missing} setting{missing === 1 ? '' : 's'} still to fill in before it can run.</p>}
    </Shell>
  );
}

function StateCard({ state }: { state: StudioState }) {
  const { curated } = useStudioChatContext();
  const setup = state.setup;
  const setupDone = Boolean(setup && setup.completedAt !== null);
  const channels = state.channels ?? [];
  const on = channels.filter((c) => c.isOn);
  const ready = on.filter((c) => c.ready);
  const fc = state.firstCampaign;
  const launch = state.launch;
  const ws = state.workspace;
  const pipelinesOn = ws?.pipelines?.filter((p) => p.entitled && p.active).length ?? 0;
  const pipelinesAvail = ws?.pipelines?.filter((p) => p.entitled).length ?? 0;
  const items: { icon: typeof Flag; label: string; value: string; tone?: 'ok' | 'warn' }[] = [
    {
      icon: MessageSquareText, label: 'Business profile',
      value: state.interview?.complete ? 'Complete' : `${state.interview?.filled ?? 0} of ${state.interview?.required ?? 0} required answered`,
      tone: state.interview?.complete ? 'ok' : 'warn',
    },
  ];
  if (state.channels !== undefined) items.push({ icon: Users, label: 'Your team', value: on.length === 0 ? 'No channels on yet' : `${ready.length} of ${on.length} on and ready`, tone: on.length > 0 && ready.length === on.length ? 'ok' : 'warn' });
  if (curated && ws) items.push({ icon: SlidersHorizontal, label: 'Pipelines', value: `${pipelinesOn} on, ${pipelinesAvail} available`, tone: pipelinesOn > 0 ? 'ok' : undefined });
  if (fc !== undefined) {
    items.push({
      icon: Rocket, label: fc?.kind === 'pipeline' ? 'First pipeline' : 'First campaign',
      value: fc?.status === 'launched' ? 'Live' : fc?.drafted ? `${fc.kind === 'pipeline' ? 'Picked' : 'Drafted'}${fc.offering ? ` — ${fc.offering}` : ''}` : 'Not drafted yet',
      tone: fc?.status === 'launched' ? 'ok' : undefined,
    });
  }
  if (launch) items.push({ icon: Flag, label: 'Go live', value: setupDone || launch.completedAt ? 'Done' : launch.canGoLive ? 'Ready when you are' : `${launch.blocking.length} thing${launch.blocking.length === 1 ? '' : 's'} first: ${launch.blocking.map(launchRowTitle).join(', ')}`, tone: setupDone || launch.canGoLive ? 'ok' : 'warn' });
  if (state.questions) items.push({ icon: MessageSquareText, label: 'Open questions', value: state.questions.open === 0 ? 'None' : `${state.questions.open} waiting for you`, tone: state.questions.open > 0 ? 'warn' : undefined });
  return (
    <Shell icon={Flag} title="Where you are" hint={setup ? (setupDone ? 'Setup complete.' : `Setup step ${setup.currentStep} of 9`) : undefined} testId="chat-card-state">
      <ul className={`divide-y ${DIVIDE}`}>
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.label} className="flex items-start gap-2.5 py-1.5">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-muted-foreground">{it.label}</span>
                <span className={`block text-sm ${it.tone === 'ok' ? TINT.readyText : it.tone === 'warn' ? TINT.warnText : ''}`}>{it.value}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */

export default function CardBlock({ block }: { block: ChatCardBlock }) {
  if (!block.data) return null;
  switch (block.kind) {
    case 'plan': return <PlanCard plan={block.data} />;
    case 'first_campaign': return <FirstCampaignCard draft={block.data} />;
    case 'launch': return <LaunchCard launch={block.data} />;
    case 'pipeline': return <PipelineCardCompact pipeline={block.data} />;
    case 'state': return <StateCard state={block.data} />;
    default: return null;
  }
}
