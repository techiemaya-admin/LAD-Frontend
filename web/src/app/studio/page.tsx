'use client';

/**
 * Tenant Studio — train your own workspace.
 *
 * Two modes on one route:
 *
 * SETUP (first visit): `state.setup.completedAt` is null and step 1 is not
 * done. The tenant briefs their new business development manager (Step 1),
 * edits the plan it proposes, applies it, and lands on the launch checklist
 * ("Step 9 of 9"). "Skip to the studio" marks step 1 done without a brief.
 * From the checklist (or the rooms view) Steps 6, 7 and 8 — how your agents
 * talk, your first campaign, brand and references — open in the same frame
 * and return where they came from; a visit that was saved mid-step resumes
 * on that step.
 *
 * STUDIO (returning): three rooms share one loop — every room ends in a
 * Tailor proposal with a review card, applied through the same customisation
 * PUT a hand-made change takes. The unapplied proposal is a DRAFT the next
 * request builds on, across rooms, until it is applied or discarded.
 */
import { useState } from 'react';
import { Loader2, MessagesSquare, Target, Theater } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import StudioStatus from '@/components/studio/StudioStatus';
import TeamStrip from '@/components/studio/TeamStrip';
import { FirstCampaignBanner, NeutralVoiceBanner, StudioEntries } from '@/components/studio/StudioBanners';
import RehearsalRoom from '@/components/studio/RehearsalRoom';
import IcpRoom from '@/components/studio/IcpRoom';
import TailorRoom from '@/components/studio/TailorRoom';
import {
  BriefStep, ChannelsStep, CHANNELS_STEP, FirstCampaignStep, FIRST_CAMPAIGN_BUILDER_HREF, FIRST_CAMPAIGN_STEP, PlanReview,
  ReferencesStep, REFERENCES_STEP, SetupChecklist, SetupShell, SETUP_TOTAL_STEPS,
} from '@/components/studio/setup';
import {
  useSaveSetup,
  useStudioState,
  type ApplyResult,
  type BriefResult,
  type Overlay,
  type StudioState,
} from '@lad/frontend-features/tenant-studio';

type SetupPhase = 'brief' | 'review' | 'checklist' | 'channels' | 'campaign' | 'references' | 'studio';
type StepPhase = Extract<SetupPhase, 'channels' | 'campaign' | 'references'>;

function needsSetup(state: StudioState): boolean {
  const setup = state.setup;
  if (!setup) return false; // backend predates the setup flow: straight to the rooms
  return setup.completedAt === null && !setup.completedSteps.includes(1);
}

/** Whether the backend reports the data a step is built on (absence = not reported, so the step stays hidden). */
function reports(state: StudioState, phase: StepPhase): boolean {
  if (phase === 'channels') return Array.isArray(state.channels);
  if (phase === 'campaign') return state.firstCampaign !== undefined;
  return state.references !== undefined;
}

const STEP_OF: Record<StepPhase, number> = { channels: CHANNELS_STEP, campaign: FIRST_CAMPAIGN_STEP, references: REFERENCES_STEP };
const STEP_TITLE: Record<StepPhase, string> = { channels: 'How your agents talk', campaign: 'Your first campaign', references: 'Brand and references' };

/** "Save and continue later" on Step 6, 7 or 8 lands the next visit back on that step. */
function resumesStep(state: StudioState): StepPhase | null {
  const setup = state.setup;
  if (!setup || setup.completedAt !== null) return null;
  for (const phase of ['channels', 'campaign', 'references'] as StepPhase[]) {
    const step = STEP_OF[phase];
    if (setup.currentStep === step && !setup.completedSteps.includes(step) && reports(state, phase)) return phase;
  }
  return null;
}

export default function StudioPage() {
  const state = useStudioState();
  const { toast } = useToast();
  const saveSetup = useSaveSetup();
  const [draft, setDraft] = useState<Overlay | undefined>(undefined);
  // Local phase carries the tenant from brief → review → checklist even after
  // the apply marks step 1 done server-side (which would otherwise flip the
  // route to the rooms mid-flow).
  const [phase, setPhase] = useState<SetupPhase | null>(null);
  const [proposal, setProposal] = useState<{ result: BriefResult; brief: string; links: string[] } | null>(null);
  const [applied, setApplied] = useState<ApplyResult | null>(null);
  // Where a step (6, 7, 8) returns to: the checklist mid-setup, the rooms otherwise.
  const [stepReturn, setStepReturn] = useState<SetupPhase>('checklist');
  const [stepVisited, setStepVisited] = useState(false);

  const markStepDone = (step: number, nextStep: number, then: () => void) => {
    const done = state.data?.setup?.completedSteps ?? [];
    saveSetup.mutate(
      { completedSteps: done.includes(step) ? done : [...done, step], currentStep: nextStep },
      {
        onSuccess: then,
        onError: () => toast({ title: 'Could not save', description: 'Try again in a moment.', variant: 'destructive' }),
      },
    );
  };
  const markStepOneDone = (then: () => void) => markStepDone(1, SETUP_TOTAL_STEPS, then);

  const openStep = (step: StepPhase, from: SetupPhase) => {
    setStepReturn(from);
    setStepVisited(true);
    setPhase(step);
  };

  if (state.isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading your studio…</div>
      </div>
    );
  }
  if (state.isError || !state.data) {
    return (
      <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">The studio could not load. Refresh, or try again in a moment.</p>
      </div>
    );
  }

  const data = state.data;
  const effectivePhase: SetupPhase = phase ?? (needsSetup(data) ? 'brief' : resumesStep(data) ?? 'studio');
  const hasChannels = reports(data, 'channels');
  const hasFirstCampaign = reports(data, 'campaign');
  const hasReferences = reports(data, 'references');
  const plan = applied?.plan ?? proposal?.result.plan;
  const personaName = plan?.profile.senderName ?? null;

  if (effectivePhase === 'brief') {
    return (
      <SetupShell
        step={1}
        title="Set up your workspace"
        aside={(
          <button
            type="button"
            onClick={() => markStepOneDone(() => setPhase('studio'))}
            disabled={saveSetup.isPending}
            className="underline-offset-2 hover:underline disabled:opacity-50"
          >
            Skip to the studio
          </button>
        )}
      >
        <BriefStep
          onProposed={(result, input) => {
            setProposal({ result, brief: input.brief, links: input.links });
            setPhase('review');
          }}
        />
      </SetupShell>
    );
  }

  if (effectivePhase === 'review' && proposal) {
    return (
      <SetupShell step={1} title="Review your plan">
        <PlanReview
          key={`${proposal.result.model ?? 'plan'}-${proposal.result.plan.summary.length}`}
          result={proposal.result}
          brief={proposal.brief}
          links={proposal.links}
          onApplied={(res) => {
            setApplied(res);
            setPhase('checklist');
          }}
          onStartOver={() => {
            setProposal(null);
            setPhase('brief');
          }}
        />
      </SetupShell>
    );
  }

  if (effectivePhase === 'channels' || effectivePhase === 'campaign' || effectivePhase === 'references') {
    // A returning tenant resumed here: go to the rooms afterwards, not a checklist they already passed.
    const backTo: SetupPhase = phase === null ? 'studio' : stepReturn;
    const step = STEP_OF[effectivePhase];
    // Continue mid-setup (from the checklist, or a resumed visit) walks 6 → 7 → 8
    // as far as the backend supports; opened from the rooms it goes straight back.
    const resumed = phase === null;
    const nextPhase = (): SetupPhase => {
      if (backTo !== 'checklist' && !resumed) return backTo;
      if (effectivePhase === 'channels' && hasFirstCampaign) return 'campaign';
      if ((effectivePhase === 'channels' || effectivePhase === 'campaign') && hasReferences) return 'references';
      return backTo;
    };
    const onContinue = () => markStepDone(step, step + 1, () => {
      if (resumed) setStepReturn('studio'); // the later steps of a resumed visit still end in the rooms
      setPhase(nextPhase());
    });
    return (
      <SetupShell
        step={step}
        title={STEP_TITLE[effectivePhase]}
        aside={(
          <button type="button" onClick={() => setPhase(backTo)} className="underline-offset-2 hover:underline">
            {backTo === 'studio' ? 'Back to the studio' : 'Back to the checklist'}
          </button>
        )}
      >
        {effectivePhase === 'channels' && (
          <ChannelsStep defaultAgentName={personaName} continuing={saveSetup.isPending} onContinue={onContinue} />
        )}
        {effectivePhase === 'campaign' && (
          <FirstCampaignStep
            channels={data.channels}
            continuing={saveSetup.isPending}
            onContinue={onContinue}
            onSetupChannels={hasChannels ? () => openStep('channels', backTo) : undefined}
          />
        )}
        {effectivePhase === 'references' && (
          <ReferencesStep continuing={saveSetup.isPending} onContinue={onContinue} />
        )}
      </SetupShell>
    );
  }

  if (effectivePhase === 'checklist' || (effectivePhase === 'review' && !proposal)) {
    // The apply snapshot is freshest right after the apply; once a later step has written, the live state is.
    const latest: StudioState = stepVisited ? data : (applied?.state ?? data);
    return (
      <SetupShell step={SETUP_TOTAL_STEPS} title="Review and go live">
        <SetupChecklist
          state={latest}
          firstCampaign={plan?.firstCampaign ?? null}
          blockingMissing={(plan?.blockingMissing ?? []).filter((k) => latest.interview.missing.includes(k))}
          hasReferences={(proposal?.links.length ?? 0) > 0}
          opening={saveSetup.isPending}
          onOpenStudio={() => markStepOneDone(() => setPhase('studio'))}
          onSetupChannels={hasChannels ? () => openStep('channels', 'checklist') : undefined}
          onFirstCampaign={hasFirstCampaign ? () => openStep('campaign', 'checklist') : undefined}
          onReferences={hasReferences ? () => openStep('references', 'checklist') : undefined}
        />
      </SetupShell>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Tenant Studio</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Teach the platform your business: finish the interview, train it on real leads, rehearse against your own agent, and turn feedback into changes you review before they apply.
        </p>
      </header>
      <div className="mb-3 space-y-3 empty:hidden">
        <FirstCampaignBanner state={data} href={FIRST_CAMPAIGN_BUILDER_HREF} />
        <NeutralVoiceBanner state={data} onAdd={() => openStep('references', 'studio')} />
      </div>
      <StudioStatus state={data} />
      {hasChannels && (
        <div className="mt-3">
          <TeamStrip channels={data.channels} onEdit={() => openStep('channels', 'studio')} />
        </div>
      )}
      {(hasFirstCampaign || hasReferences) && (
        <div className="mt-3">
          <StudioEntries state={data} onFirstCampaign={() => openStep('campaign', 'studio')} onReferences={() => openStep('references', 'studio')} />
        </div>
      )}
      {draft && (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          You have an unapplied proposal. The next request in any room builds on it; apply or discard it from its review card.
        </p>
      )}
      <Tabs defaultValue={data.rehearsal.ready ? 'rehearse' : data.icpTraining.ready ? 'icp' : 'tailor'} className="mt-5">
        <TabsList>
          <TabsTrigger value="icp"><Target className="mr-1.5 h-4 w-4" />Train the ICP</TabsTrigger>
          <TabsTrigger value="rehearse"><Theater className="mr-1.5 h-4 w-4" />Rehearse</TabsTrigger>
          <TabsTrigger value="tailor"><MessagesSquare className="mr-1.5 h-4 w-4" />Ask the Tailor</TabsTrigger>
        </TabsList>
        <TabsContent value="icp" className="mt-4">
          <IcpRoom ready={data.icpTraining.ready} draft={draft} onDraft={setDraft} />
        </TabsContent>
        <TabsContent value="rehearse" className="mt-4">
          <RehearsalRoom ready={data.rehearsal.ready} draft={draft} onDraft={setDraft} />
        </TabsContent>
        <TabsContent value="tailor" className="mt-4">
          <TailorRoom draft={draft} onDraft={setDraft} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
