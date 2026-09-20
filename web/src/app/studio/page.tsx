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
 * From the checklist (or the rooms view) Steps 6, 7, 8 and 9 — how your
 * agents talk, your first campaign, brand and references, try your agent
 * and go live — open in the same frame and return where they came from; a
 * visit that was saved mid-step resumes on that step. Go live (Step 9) marks
 * setup complete and hands off to the campaign builder, which launches the
 * first campaign and comes back here with `?live=1`.
 *
 * STUDIO (returning): three rooms share one loop — every room ends in a
 * Tailor proposal with a review card, applied through the same customisation
 * PUT a hand-made change takes. The unapplied proposal is a DRAFT the next
 * request builds on, across rooms, until it is applied or discarded.
 *
 * CURATED WORKSPACES (`state.workspace.curated`): an industry edition that
 * ships pipelines gets a fourth room, Pipelines, first in the tab rail and
 * reachable directly at `/studio?room=pipelines` (the sidebar item and the
 * old `/pipelines` routes point there). Step 7 picks a pipeline instead of
 * drafting messages, and Go live switches it on server-side — no builder
 * hand-off. The Rehearse and Tailor rooms speak of the WhatsApp support
 * agent (member presets, `refine` targets `customer_support`), and while
 * that agent still runs its stored prompt (`workspace.promptSource`) the
 * Pipelines room and Step 9 say so. A tenant outside an edition sees none
 * of this.
 */
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, MessagesSquare, SlidersHorizontal, Target, Theater } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import StudioStatus from '@/components/studio/StudioStatus';
import TeamStrip from '@/components/studio/TeamStrip';
import { FirstCampaignBanner, LiveBanner, NeutralVoiceBanner, SetupHistoryLink, StudioEntries } from '@/components/studio/StudioBanners';
import StudioHistory from '@/components/studio/StudioHistory';
import QuestionsInbox from '@/components/studio/QuestionsInbox';
import RehearsalRoom from '@/components/studio/RehearsalRoom';
import IcpRoom from '@/components/studio/IcpRoom';
import TailorRoom from '@/components/studio/TailorRoom';
import PipelinesRoom from '@/components/studio/PipelinesRoom';
import {
  BriefStep, ChannelsStep, CHANNELS_STEP, FirstCampaignStep, FIRST_CAMPAIGN_BUILDER_HREF, FIRST_CAMPAIGN_STEP, GoLiveStep,
  GO_LIVE_BUILDER_HREF, GO_LIVE_STEP, PlanReview, ReferencesStep, REFERENCES_STEP, SetupChecklist, SetupShell, SETUP_TOTAL_STEPS,
} from '@/components/studio/setup';
import { AI_TEXT, SKELETON, STATUS, SURFACE, TAB_LIST, TAB_TRIGGER } from '@/components/studio/studio-theme';
import '@/components/studio/studio.css';
import {
  useSaveSetup,
  useStudioState,
  type ApplyResult,
  type BriefResult,
  type LaunchRowRoom,
  type Overlay,
  type StudioState,
} from '@lad/frontend-features/tenant-studio';

/** 'pipelines' = the Pipelines room opened inside the setup frame from Step 7 or 9, returning there afterwards. */
type SetupPhase = 'brief' | 'review' | 'checklist' | 'channels' | 'campaign' | 'references' | 'golive' | 'pipelines' | 'studio';
type StepPhase = Extract<SetupPhase, 'channels' | 'campaign' | 'references' | 'golive'>;
type RoomTab = 'pipelines' | 'icp' | 'rehearse' | 'tailor';
const ROOM_TABS: RoomTab[] = ['pipelines', 'icp', 'rehearse', 'tailor'];
function isRoomTab(v: string | null): v is RoomTab {
  return v !== null && (ROOM_TABS as string[]).includes(v);
}
function isCurated(state: StudioState): boolean {
  return state.workspace?.curated === true;
}
/** Where the profile answers (setup steps 1–5) are fixed when a launch row points at one of them. */
const PROFILE_HREF = '/settings?tab=businessprofile';

function needsSetup(state: StudioState): boolean {
  const setup = state.setup;
  if (!setup) return false; // backend predates the setup flow: straight to the rooms
  return setup.completedAt === null && !setup.completedSteps.includes(1);
}

/** Whether the backend reports the data a step is built on (absence = not reported, so the step stays hidden). */
function reports(state: StudioState, phase: StepPhase): boolean {
  if (phase === 'channels') return Array.isArray(state.channels);
  if (phase === 'campaign') return state.firstCampaign !== undefined;
  if (phase === 'golive') return state.launch !== undefined;
  return state.references !== undefined;
}

const STEP_OF: Record<StepPhase, number> = { channels: CHANNELS_STEP, campaign: FIRST_CAMPAIGN_STEP, references: REFERENCES_STEP, golive: GO_LIVE_STEP };
const PHASE_OF_STEP: Partial<Record<number, StepPhase>> = { [CHANNELS_STEP]: 'channels', [FIRST_CAMPAIGN_STEP]: 'campaign', [REFERENCES_STEP]: 'references', [GO_LIVE_STEP]: 'golive' };
const STEP_TITLE: Record<StepPhase, string> = { channels: 'How your agents talk', campaign: 'Your first campaign', references: 'Brand and references', golive: 'Try your agent and go live' };

/**
 * "Save and continue later" on Step 6, 7, 8 or 9 lands the next visit back on
 * that step. Step 9 only resumes for a tenant who walked the later steps —
 * "Open the studio" on the checklist also records step 9, and a tenant who
 * skipped straight to the rooms must not be pulled back into a launch flow.
 */
function resumesStep(state: StudioState): StepPhase | null {
  const setup = state.setup;
  if (!setup || setup.completedAt !== null) return null;
  for (const phase of ['channels', 'campaign', 'references', 'golive'] as StepPhase[]) {
    const step = STEP_OF[phase];
    if (setup.currentStep !== step || setup.completedSteps.includes(step) || !reports(state, phase)) continue;
    if (phase === 'golive' && !setup.completedSteps.some((s) => s >= CHANNELS_STEP && s < GO_LIVE_STEP)) continue;
    return phase;
  }
  return null;
}

const BACK_LABEL: Record<SetupPhase, string> = {
  studio: 'Back to the studio', checklist: 'Back to the checklist', golive: 'Back to go live', campaign: 'Back to your first campaign',
  brief: 'Back', review: 'Back', channels: 'Back', references: 'Back', pipelines: 'Back',
};

/** `useSearchParams` needs a Suspense boundary above it for the static shell; the page itself is unchanged. */
export default function StudioPage() {
  return (
    <Suspense fallback={null}>
      <StudioPageInner />
    </Suspense>
  );
}

function StudioPageInner() {
  const state = useStudioState();
  const router = useRouter();
  const searchParams = useSearchParams();
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
  // Step 9 keeps its own way back: its fix links open Steps 6–8 with `stepReturn = 'golive'`.
  const [goLiveReturn, setGoLiveReturn] = useState<SetupPhase>('studio');
  // The Pipelines room opened from Step 7 or 9 (curated): where it returns to, and which pipeline's settings to open.
  const [pipelinesReturn, setPipelinesReturn] = useState<SetupPhase>('golive');
  const [pipelinesFocus, setPipelinesFocus] = useState<string | null>(null);
  const [stepVisited, setStepVisited] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  // Which room the tab rail shows. `?room=` (sidebar, redirects, bookmarks)
  // wins whenever it changes; a tab press only changes local state.
  const roomParam = searchParams.get('room');
  const [tab, setTab] = useState<RoomTab | null>(isRoomTab(roomParam) ? roomParam : null);
  useEffect(() => {
    if (isRoomTab(roomParam)) setTab(roomParam);
  }, [roomParam]);
  // `?live=1` — the first campaign just went live (the builder launched it, or
  // a curated workspace's pipeline was switched on). Read once and cleared
  // from the address bar so a refresh does not repeat it.
  const liveParam = searchParams.get('live');
  const [justLive, setJustLive] = useState(false);
  useEffect(() => {
    if (liveParam !== '1') return;
    setJustLive(true);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('live');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    } catch { /* no window: nothing to clear */ }
  }, [liveParam]);

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
    if (step === 'golive') setGoLiveReturn(from);
    else setStepReturn(from);
    setStepVisited(true);
    setPhase(step);
  };
  /** A launch row's `fix.step`: Steps 6–8 open in the frame and return to Step 9; 1–5 live in the profile settings. */
  const jumpToStep = (step: number) => {
    const target = PHASE_OF_STEP[step];
    if (target && target !== 'golive' && state.data && reports(state.data, target)) openStep(target, 'golive');
    else router.push(PROFILE_HREF);
  };
  /** Open the Pipelines room inside the setup frame (from Step 7 or 9) and come back to that step afterwards. */
  const openPipelinesRoom = (from: SetupPhase, focusKey: string | null = null) => {
    setPipelinesReturn(from);
    setPipelinesFocus(focusKey);
    setStepVisited(true);
    setPhase('pipelines');
  };
  /** A launch row's `fix.room`. Only 'pipelines' exists today; an unknown room is a no-op rather than a wrong page. */
  const jumpToRoom = (room: LaunchRowRoom, focusKey: string | null) => {
    if (room === 'pipelines') openPipelinesRoom('golive', focusKey);
  };

  if (state.isLoading) {
    return (
      <div className={`min-h-full ${SURFACE}`}>
        <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6" aria-busy="true">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading your studio…</div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className={`${SKELETON} h-28`} />
            <div className={`${SKELETON} h-28`} />
            <div className={`${SKELETON} h-28`} />
          </div>
          <div className={`${SKELETON} mt-3 h-24`} />
        </div>
      </div>
    );
  }
  if (state.isError || !state.data) {
    return (
      <div className={`min-h-full ${SURFACE}`}>
        <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6">
          <p className={`rounded-2xl border p-4 text-sm ${STATUS.needed}`}>The studio could not load. Refresh, or try again in a moment.</p>
        </div>
      </div>
    );
  }

  const data = state.data;
  const curated = isCurated(data);
  // A curated tenant sent straight to the Pipelines room (sidebar, redirect,
  // bookmark) gets the room, not a brief or a resumed step.
  const roomRequested = curated && tab === 'pipelines' && isRoomTab(roomParam);
  const effectivePhase: SetupPhase = phase ?? (roomRequested ? 'studio' : needsSetup(data) ? 'brief' : resumesStep(data) ?? 'studio');
  const hasChannels = reports(data, 'channels');
  const hasFirstCampaign = reports(data, 'campaign');
  const hasReferences = reports(data, 'references');
  const hasLaunch = reports(data, 'golive');
  const hasHistory = data.history !== undefined;
  const setupDone = Boolean(data.setup && data.setup.completedAt !== null);
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
            className="underline-offset-2 transition-colors duration-150 hover:text-[#7C5CFF] hover:underline disabled:opacity-50 dark:hover:text-[#B69CFF]"
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
          <button type="button" onClick={() => setPhase(backTo)} className="underline-offset-2 transition-colors duration-150 hover:text-[#7C5CFF] hover:underline dark:hover:text-[#B69CFF]">
            {BACK_LABEL[backTo]}
          </button>
        )}
      >
        {effectivePhase === 'channels' && (
          <ChannelsStep defaultAgentName={personaName} continuing={saveSetup.isPending} onContinue={onContinue} />
        )}
        {effectivePhase === 'campaign' && (
          <FirstCampaignStep
            channels={data.channels}
            workspace={data.workspace}
            continuing={saveSetup.isPending}
            onContinue={onContinue}
            onSetupChannels={hasChannels ? () => openStep('channels', backTo) : undefined}
            onOpenPipelines={curated ? (focusKey) => openPipelinesRoom('campaign', focusKey) : undefined}
          />
        )}
        {effectivePhase === 'references' && (
          <ReferencesStep continuing={saveSetup.isPending} onContinue={onContinue} />
        )}
      </SetupShell>
    );
  }

  if (effectivePhase === 'pipelines') {
    // Curated only: the room inside the frame, returning to the step that sent us.
    const backTo: SetupPhase = pipelinesReturn;
    const step = backTo === 'campaign' ? FIRST_CAMPAIGN_STEP : GO_LIVE_STEP;
    return (
      <SetupShell
        step={step}
        progress={backTo === 'golive' ? 100 : undefined}
        title="Pipelines"
        aside={(
          <button type="button" onClick={() => setPhase(backTo)} className="underline-offset-2 transition-colors duration-150 hover:text-[#7C5CFF] hover:underline dark:hover:text-[#B69CFF]" data-testid="pipelines-back">
            {BACK_LABEL[backTo]}
          </button>
        )}
      >
        <PipelinesRoom focusKey={pipelinesFocus} workspace={data.workspace} />
      </SetupShell>
    );
  }

  if (effectivePhase === 'golive') {
    const backTo: SetupPhase = phase === null ? 'studio' : goLiveReturn;
    // Curated + pipeline draft: the server switched the pipeline on; there is no builder to hand off to.
    const pipelineLive = curated && data.firstCampaign?.kind === 'pipeline';
    const wentLive = () => {
      if (!pipelineLive) { router.push(GO_LIVE_BUILDER_HREF); return; }
      setGoLiveReturn('studio');
      setPhase('studio');
      router.replace('/studio?live=1');
    };
    const saveForLater = () => saveSetup.mutate(
      { currentStep: GO_LIVE_STEP },
      {
        onSuccess: () => { setGoLiveReturn('studio'); setPhase('studio'); },
        onError: () => toast({ title: 'Could not save', description: 'Try again in a moment.', variant: 'destructive' }),
      },
    );
    return (
      <SetupShell
        step={GO_LIVE_STEP}
        progress={100}
        title={STEP_TITLE.golive}
        aside={(
          <button type="button" onClick={() => setPhase(backTo)} className="underline-offset-2 transition-colors duration-150 hover:text-[#7C5CFF] hover:underline dark:hover:text-[#B69CFF]">
            {BACK_LABEL[backTo]}
          </button>
        )}
      >
        <GoLiveStep
          state={data}
          onJumpToStep={jumpToStep}
          onJumpToRoom={curated ? jumpToRoom : undefined}
          onWentLive={wentLive}
          onSaveForLater={saveForLater}
          saving={saveSetup.isPending}
        />
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
          onGoLive={hasLaunch ? () => openStep('golive', 'checklist') : undefined}
        />
      </SetupShell>
    );
  }

  return (
    <div className={`min-h-full ${SURFACE}`}>
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tenant <span className={AI_TEXT}>Studio</span></h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Teach the platform your business: finish the interview, train it on real leads, rehearse against your own agent, and turn feedback into changes you review before they apply.
        </p>
      </header>
      <div className="mb-3 space-y-3 empty:hidden">
        {justLive && <LiveBanner onDismiss={() => setJustLive(false)} pipelineName={curated && data.firstCampaign?.kind === 'pipeline' ? data.firstCampaign.offering : null} />}
        {!justLive && (
          <FirstCampaignBanner
            state={data}
            href={FIRST_CAMPAIGN_BUILDER_HREF}
            // A pipeline draft has nothing to review in the builder; Go live (Step 9) switches it on.
            onReview={data.firstCampaign?.kind === 'pipeline' && hasLaunch ? () => openStep('golive', 'studio') : undefined}
          />
        )}
        <NeutralVoiceBanner state={data} onAdd={() => openStep('references', 'studio')} />
      </div>
      <StudioStatus state={data} onHistory={hasHistory ? () => setHistoryOpen(true) : undefined} />
      {hasChannels && (
        <div className="mt-3">
          <TeamStrip channels={data.channels} onEdit={() => openStep('channels', 'studio')} />
        </div>
      )}
      {/* The setup entry points go away once the tenant is live; the history link is what remains.
          The Pipelines tile (curated) stays: it is the workspace's home. */}
      {(curated || (!setupDone && (hasFirstCampaign || hasReferences || hasLaunch))) && (
        <div className="mt-3">
          <StudioEntries
            state={data}
            onFirstCampaign={!setupDone && hasFirstCampaign ? () => openStep('campaign', 'studio') : undefined}
            onReferences={!setupDone && hasReferences ? () => openStep('references', 'studio') : undefined}
            onGoLive={!setupDone && hasLaunch ? () => openStep('golive', 'studio') : undefined}
            onPipelines={curated ? () => setTab('pipelines') : undefined}
          />
        </div>
      )}
      {setupDone && hasHistory && (
        <div className="mt-3"><SetupHistoryLink onOpen={() => setHistoryOpen(true)} /></div>
      )}
      <div className="mt-3 empty:hidden">
        <QuestionsInbox state={data} />
      </div>
      {hasHistory && <StudioHistory open={historyOpen} onOpenChange={setHistoryOpen} />}
      {draft && (
        <p className={`mt-3 rounded-xl border px-3 py-2 text-xs ${STATUS.warn}`}>
          You have an unapplied proposal. The next request in any room builds on it; apply or discard it from its review card.
        </p>
      )}
      <Tabs
        value={tab && (tab !== 'pipelines' || curated) ? tab : (data.rehearsal.ready ? 'rehearse' : data.icpTraining.ready ? 'icp' : 'tailor')}
        onValueChange={(v) => { if (isRoomTab(v)) setTab(v); }}
        className="mt-5"
      >
        <TabsList className={TAB_LIST}>
          {curated && (
            <TabsTrigger value="pipelines" className={TAB_TRIGGER} data-testid="tab-pipelines"><SlidersHorizontal className="mr-1.5 h-4 w-4" />Pipelines</TabsTrigger>
          )}
          <TabsTrigger value="icp" className={TAB_TRIGGER}><Target className="mr-1.5 h-4 w-4" />Train the ICP</TabsTrigger>
          <TabsTrigger value="rehearse" className={TAB_TRIGGER}><Theater className="mr-1.5 h-4 w-4" />Rehearse</TabsTrigger>
          <TabsTrigger value="tailor" className={TAB_TRIGGER}><MessagesSquare className="mr-1.5 h-4 w-4" />Ask the Tailor</TabsTrigger>
        </TabsList>
        {curated && (
          <TabsContent value="pipelines" className="mt-4">
            <PipelinesRoom workspace={data.workspace} />
          </TabsContent>
        )}
        <TabsContent value="icp" className="mt-4">
          <IcpRoom ready={data.icpTraining.ready} draft={draft} onDraft={setDraft} />
        </TabsContent>
        <TabsContent value="rehearse" className="mt-4">
          <RehearsalRoom ready={data.rehearsal.ready} draft={draft} onDraft={setDraft} curated={curated} />
        </TabsContent>
        <TabsContent value="tailor" className="mt-4">
          <TailorRoom draft={draft} onDraft={setDraft} curated={curated} />
        </TabsContent>
      </Tabs>
    </div>
    </div>
  );
}
