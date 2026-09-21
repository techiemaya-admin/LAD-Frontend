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
 *
 * CHAT (`state.chat` reported): the Studio's front door is one persistent
 * "Mr LAD" thread. It is the home once setup is complete or for a brand-new
 * tenant (setup runs in the thread, with "Use the step-by-step setup
 * instead" opening the frame above), and always at `/studio?chat=1`. Every
 * room and step stays reachable — `?room=`, `?step=N`, the thread's own
 * `open`/launch actions — and comes back to the thread. `/studio?voice=1`
 * opens the thread with the voice-chat offer (a tap starts it).
 */
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, MessagesSquare, SlidersHorizontal, Sparkles, Target, Theater } from 'lucide-react';
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
import { StudioChat } from '@/components/studio/chat';
import {
  BriefStep, ChannelsStep, CHANNELS_STEP, FirstCampaignStep, FIRST_CAMPAIGN_BUILDER_HREF, FIRST_CAMPAIGN_STEP, GoLiveStep,
  GO_LIVE_BUILDER_HREF, GO_LIVE_STEP, PlanReview, ReferencesStep, REFERENCES_STEP, SetupChecklist, SetupShell, SETUP_TOTAL_STEPS,
} from '@/components/studio/setup';
import { AI_TEXT, CHIP_BASE, CHIP_IDLE, SKELETON, STATUS, SURFACE, TAB_LIST, TAB_TRIGGER } from '@/components/studio/studio-theme';
import '@/components/studio/studio.css';
import {
  useSaveSetup,
  useStudioState,
  type ApplyResult,
  type BriefPlan,
  type BriefResult,
  type LaunchRowRoom,
  type Overlay,
  type StudioState,
} from '@lad/frontend-features/tenant-studio';

/** 'pipelines' = the Pipelines room opened inside the setup frame from Step 7 or 9, returning there afterwards; 'chat' = the Mr LAD thread. */
type SetupPhase = 'brief' | 'review' | 'checklist' | 'channels' | 'campaign' | 'references' | 'golive' | 'pipelines' | 'studio' | 'chat';
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
  brief: 'Back', review: 'Back', channels: 'Back', references: 'Back', pipelines: 'Back', chat: 'Back to Mr LAD',
};

/** Set once the tenant has talked to Mr LAD mid-setup, so the next visit lands on the thread rather than a resumed step. */
const CHAT_PREFERRED_KEY = 'studio.chat.preferred'; // mirrored in components/studio/chat/StudioChat.tsx

/**
 * The thread is the home once setup is complete, for a brand-new tenant, or
 * for one who chose it mid-setup; `?chat=1` opens it on any backend that has it.
 */
function chatIsHome(state: StudioState, wantsChat: boolean, preferred: boolean): boolean {
  if (wantsChat) return true;
  if (state.chat === undefined) return false; // backend predates the thread: the classic view stays
  const setupDone = Boolean(state.setup && state.setup.completedAt !== null);
  return setupDone || preferred || needsSetup(state);
}

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
  // The rooms view opened from the thread keeps a way back; the plan review opened from a plan card too.
  const [roomsReturn, setRoomsReturn] = useState<SetupPhase | null>(null);
  const [reviewFromChat, setReviewFromChat] = useState(false);
  const [stepVisited, setStepVisited] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  // Which room the tab rail shows. `?room=` (sidebar, redirects, bookmarks)
  // wins whenever it changes; a tab press only changes local state.
  const roomParam = searchParams.get('room');
  const wantsVoice = searchParams.get('voice') === '1';
  const wantsChat = searchParams.get('chat') === '1' || wantsVoice;
  const stepParam = searchParams.get('step');
  const [chatPreferred, setChatPreferred] = useState(false);
  useEffect(() => {
    try { setChatPreferred(window.localStorage.getItem(CHAT_PREFERRED_KEY) === '1'); } catch { /* private mode: the rule below decides */ }
  }, []);
  const [tab, setTab] = useState<RoomTab | null>(isRoomTab(roomParam) ? roomParam : null);
  // What is on screen, for effects that must not close over a stale phase.
  const phaseRef = useRef<SetupPhase | null>(null);
  useEffect(() => {
    if (!isRoomTab(roomParam) && roomParam !== 'history') return;
    if (isRoomTab(roomParam)) setTab(roomParam);
    // `?room=history` = the change timeline drawer over the rooms view.
    if (roomParam === 'history') setHistoryOpen(true);
    // A sidebar item or bookmark while the thread is up: show the room, keep the way back.
    if (phaseRef.current === 'chat') { setRoomsReturn('chat'); setPhase('studio'); }
  }, [roomParam]);
  // The address bar going back to a bare `/studio` (the sidebar's Studio item)
  // means "home" — drop the local phase so the home view recomputes. `?live=1`
  // being cleared is not that: the rooms must keep showing the live banner.
  const paramsKey = searchParams.toString();
  const prevParamsRef = useRef(paramsKey);
  useEffect(() => {
    const prev = prevParamsRef.current;
    prevParamsRef.current = paramsKey;
    if (paramsKey !== '' || prev === paramsKey) return;
    const before = new URLSearchParams(prev);
    if (before.has('room') || before.has('step') || before.has('chat') || before.has('voice')) { setPhase(null); setRoomsReturn(null); }
  }, [paramsKey]);
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
  /** A step number from a launch row or a `/studio?step=N` route: Steps 6–9 open in the frame and return to `from`; 1–5 live in the profile settings. */
  const jumpToStepFrom = (step: number, from: SetupPhase) => {
    const target = PHASE_OF_STEP[step];
    if (target && target !== 'golive' && state.data && reports(state.data, target)) openStep(target, from);
    else if (target === 'golive' && from !== 'golive' && state.data && reports(state.data, 'golive')) openStep('golive', from);
    else router.push(PROFILE_HREF);
  };
  /** A launch row's `fix.step` on Step 9: Steps 6–8 open in the frame and return to Step 9; 1–5 live in the profile settings. */
  const jumpToStep = (step: number) => jumpToStepFrom(step, 'golive');
  // `/studio?step=N` (a chat action, a bookmark): open that step once the state is here, then clear it from the address bar.
  const stepConsumedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!stepParam || !state.data || stepConsumedRef.current === stepParam) return;
    stepConsumedRef.current = stepParam;
    const n = Number(stepParam);
    if (Number.isInteger(n) && n >= 1 && n <= SETUP_TOTAL_STEPS) jumpToStepFrom(n, chatIsHome(state.data, wantsChat, chatPreferred) ? 'chat' : 'studio');
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('step');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    } catch { /* no window: nothing to clear */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepParam, state.data]);
  /**
   * A route a chat turn carries. `/studio?room=…` and `/studio?step=N` open
   * inside the Studio and come back to the thread; `/studio?chat=1` is the
   * thread itself; any other page navigates.
   */
  const navigateFromChat = (route: string) => {
    let url: URL;
    try { url = new URL(route, window.location.origin); } catch { return; }
    if (url.origin !== window.location.origin) { window.open(url.href, '_blank', 'noopener'); return; }
    if (url.pathname.replace(/\/$/, '') !== '/studio') { router.push(`${url.pathname}${url.search}${url.hash}`); return; }
    const step = Number(url.searchParams.get('step'));
    const room = url.searchParams.get('room');
    const focus = url.searchParams.get('focus');
    if (Number.isInteger(step) && step >= 1) { jumpToStepFrom(step, 'chat'); return; }
    if (isRoomTab(room)) setTab(room);
    if (room === 'history') setHistoryOpen(true);
    // `&focus=<key>` opens that pipeline's settings in the room (a switched-on pipeline still missing a setting).
    setPipelinesFocus(room === 'pipelines' && focus ? focus : null);
    if ((url.searchParams.get('chat') === '1' || url.searchParams.get('voice') === '1') && !room) { setPhase('chat'); return; }
    setRoomsReturn('chat');
    setPhase('studio');
  };
  /** A plan card's "Edit the full plan": today's review card, coming back to the thread. */
  const openPlanReviewFromChat = (plan: BriefPlan) => {
    setProposal({ result: { plan, sources: { website: false, linkedin: false, instagram: false }, model: null, links: [] }, brief: '', links: [] });
    setReviewFromChat(true);
    setPhase('review');
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
  // Sticky: a thread that is on screen stays on screen while the state it
  // was computed from changes underneath it (applying the plan marks step 1
  // done, which would otherwise flip a new tenant to the rooms mid-setup).
  const chatHome = chatIsHome(data, wantsChat, chatPreferred) || phaseRef.current === 'chat';
  const chatAvailable = data.chat !== undefined || wantsChat;
  // A curated tenant sent straight to the Pipelines room (sidebar, redirect,
  // bookmark) gets the room, not a brief or a resumed step; with the thread
  // as home, any `?room=` does.
  const roomRequested = (isRoomTab(roomParam) && ((curated && tab === 'pipelines') || (chatHome && (roomParam !== 'pipelines' || curated)))) || (chatHome && roomParam === 'history');
  const effectivePhase: SetupPhase = phase ?? (roomRequested ? 'studio' : chatHome ? 'chat' : needsSetup(data) ? 'brief' : resumesStep(data) ?? 'studio');
  phaseRef.current = effectivePhase;
  const hasChannels = reports(data, 'channels');
  const hasFirstCampaign = reports(data, 'campaign');
  const hasReferences = reports(data, 'references');
  const hasLaunch = reports(data, 'golive');
  const hasHistory = data.history !== undefined;
  const setupDone = Boolean(data.setup && data.setup.completedAt !== null);
  const plan = applied?.plan ?? proposal?.result.plan;
  const personaName = plan?.profile.senderName ?? null;

  if (effectivePhase === 'chat') {
    return (
      <StudioChat
        state={data}
        onNavigate={navigateFromChat}
        onOpenSetupSteps={setupDone ? undefined : () => { setRoomsReturn(null); setPhase(needsSetup(data) ? 'brief' : resumesStep(data) ?? 'checklist'); }}
        onOpenRooms={() => { setRoomsReturn('chat'); setPhase('studio'); }}
        onOpenPlanReview={openPlanReviewFromChat}
        autoVoice={wantsVoice}
      />
    );
  }

  if (effectivePhase === 'brief') {
    return (
      <SetupShell
        step={1}
        title="Set up your workspace"
        aside={(
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {chatAvailable && (
              <button
                type="button"
                onClick={() => setPhase('chat')}
                className="inline-flex items-center gap-1 underline-offset-2 transition-colors duration-150 hover:text-[#7C5CFF] hover:underline dark:hover:text-[#B69CFF]"
                data-testid="brief-open-chat"
              >
                <Sparkles className="h-3 w-3" aria-hidden />Set up by chatting with Mr LAD instead
              </button>
            )}
            <button
              type="button"
              onClick={() => markStepOneDone(() => setPhase('studio'))}
              disabled={saveSetup.isPending}
              className="underline-offset-2 transition-colors duration-150 hover:text-[#7C5CFF] hover:underline disabled:opacity-50 dark:hover:text-[#B69CFF]"
            >
              Skip to the studio
            </button>
          </span>
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
      <SetupShell
        step={1}
        title="Review your plan"
        aside={reviewFromChat ? (
          <button type="button" onClick={() => { setReviewFromChat(false); setPhase('chat'); }} className="underline-offset-2 transition-colors duration-150 hover:text-[#7C5CFF] hover:underline dark:hover:text-[#B69CFF]">
            {BACK_LABEL.chat}
          </button>
        ) : undefined}
      >
        <PlanReview
          key={`${proposal.result.model ?? 'plan'}-${proposal.result.plan.summary.length}`}
          result={proposal.result}
          brief={proposal.brief}
          links={proposal.links}
          onApplied={(res) => {
            setApplied(res);
            const fromChat = reviewFromChat;
            setReviewFromChat(false);
            setPhase(fromChat ? 'chat' : 'checklist');
          }}
          onStartOver={() => {
            setProposal(null);
            const fromChat = reviewFromChat;
            setReviewFromChat(false);
            setPhase(fromChat ? 'chat' : 'brief');
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
        {roomsReturn === 'chat' && (
          <button type="button" onClick={() => { setRoomsReturn(null); setPhase('chat'); }} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-150 hover:text-[#7C5CFF] dark:hover:text-[#B69CFF]" data-testid="rooms-back-to-chat">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />{BACK_LABEL.chat}
          </button>
        )}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tenant <span className={AI_TEXT}>Studio</span></h1>
          {chatAvailable && roomsReturn !== 'chat' && (
            <button type="button" onClick={() => { setRoomsReturn(null); setPhase('chat'); }} className={`${CHIP_BASE} ${CHIP_IDLE} gap-1.5 px-3 py-1.5 text-xs`} data-testid="rooms-open-chat">
              <Sparkles className="h-3.5 w-3.5 text-[#7C5CFF] dark:text-[#B69CFF]" aria-hidden />Chat with Mr LAD
            </button>
          )}
        </div>
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
            <PipelinesRoom workspace={data.workspace} focusKey={roomsReturn === 'chat' ? pipelinesFocus : null} />
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
