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
 * From the checklist (or the rooms' "Your team" strip) Step 6 — how your
 * agents talk — opens in the same frame and returns where it came from.
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
import RehearsalRoom from '@/components/studio/RehearsalRoom';
import IcpRoom from '@/components/studio/IcpRoom';
import TailorRoom from '@/components/studio/TailorRoom';
import { BriefStep, ChannelsStep, CHANNELS_STEP, PlanReview, SetupChecklist, SetupShell, SETUP_TOTAL_STEPS } from '@/components/studio/setup';
import {
  useSaveSetup,
  useStudioState,
  type ApplyResult,
  type BriefResult,
  type Overlay,
  type StudioState,
} from '@lad/frontend-features/tenant-studio';

type SetupPhase = 'brief' | 'review' | 'checklist' | 'channels' | 'studio';

function needsSetup(state: StudioState): boolean {
  const setup = state.setup;
  if (!setup) return false; // backend predates the setup flow: straight to the rooms
  return setup.completedAt === null && !setup.completedSteps.includes(1);
}

/** "Save and continue later" on Step 6 lands the next visit back on it. */
function resumesChannels(state: StudioState): boolean {
  const setup = state.setup;
  if (!setup || !Array.isArray(state.channels)) return false;
  return setup.completedAt === null && setup.currentStep === CHANNELS_STEP && !setup.completedSteps.includes(CHANNELS_STEP);
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
  // Where Step 6 returns to: the checklist mid-setup, the rooms otherwise.
  const [channelsReturn, setChannelsReturn] = useState<SetupPhase>('checklist');
  const [channelsVisited, setChannelsVisited] = useState(false);

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

  const openChannels = (from: SetupPhase) => {
    setChannelsReturn(from);
    setChannelsVisited(true);
    setPhase('channels');
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
  const effectivePhase: SetupPhase = phase ?? (needsSetup(data) ? 'brief' : resumesChannels(data) ? 'channels' : 'studio');
  const hasChannels = Array.isArray(data.channels);
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

  if (effectivePhase === 'channels') {
    // A returning tenant resumed here: go to the rooms afterwards, not a checklist they already passed.
    const backTo: SetupPhase = phase === null ? 'studio' : channelsReturn;
    return (
      <SetupShell
        step={CHANNELS_STEP}
        title="How your agents talk"
        aside={(
          <button type="button" onClick={() => setPhase(backTo)} className="underline-offset-2 hover:underline">
            {backTo === 'studio' ? 'Back to the studio' : 'Back to the checklist'}
          </button>
        )}
      >
        <ChannelsStep
          defaultAgentName={personaName}
          continuing={saveSetup.isPending}
          onContinue={() => markStepDone(CHANNELS_STEP, CHANNELS_STEP + 1, () => setPhase(backTo))}
        />
      </SetupShell>
    );
  }

  if (effectivePhase === 'checklist' || (effectivePhase === 'review' && !proposal)) {
    // The apply snapshot is freshest right after the apply; once Step 6 has written, the live state is.
    const latest: StudioState = channelsVisited ? data : (applied?.state ?? data);
    return (
      <SetupShell step={SETUP_TOTAL_STEPS} title="Review and go live">
        <SetupChecklist
          state={latest}
          firstCampaign={plan?.firstCampaign ?? null}
          blockingMissing={(plan?.blockingMissing ?? []).filter((k) => latest.interview.missing.includes(k))}
          hasReferences={(proposal?.links.length ?? 0) > 0}
          opening={saveSetup.isPending}
          onOpenStudio={() => markStepOneDone(() => setPhase('studio'))}
          onSetupChannels={hasChannels ? () => openChannels('checklist') : undefined}
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
      <StudioStatus state={data} />
      {hasChannels && (
        <div className="mt-3">
          <TeamStrip channels={data.channels} onEdit={() => openChannels('studio')} />
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
