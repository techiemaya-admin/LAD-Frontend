'use client';

/**
 * StudioBanners — the two nudges on the Studio rooms view.
 *
 * Blue: a first campaign is drafted and waiting (Step 7) — one tap to
 * review and send. Grey, dismissible: nothing real has been shared yet, so
 * the agents write in a neutral voice (Step 8). Both key on fields the
 * backend reports; absence renders nothing (not reported ≠ none).
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, History, MessagesSquare, Rocket, Send, X } from 'lucide-react';
import type { StudioState } from '@lad/frontend-features/tenant-studio';
import { launchRowTitle } from './StudioLaunchBanner';

const VOICE_DISMISS_KEY = 'studio.neutralVoiceBanner.dismissed';

/** Green, once: the tenant just came back from the builder after Go live. */
export function LiveBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" data-testid="live-banner" role="status">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1">
        <span className="font-medium">You&rsquo;re live.</span> Your first campaign is sending. You&rsquo;ll get a daily summary, and it hands over to you the moment someone is interested.{' '}
        <Link href="/campaigns" className="font-medium underline-offset-2 hover:underline">Watch it →</Link>
      </span>
      <button type="button" onClick={onDismiss} className="shrink-0 rounded p-0.5 hover:bg-emerald-100" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function FirstCampaignBanner({ state, href }: { state: StudioState; href: string }) {
  const fc = state.firstCampaign;
  if (!fc || !fc.drafted || fc.status === 'launched' || fc.launchedCampaignId) return null;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 sm:flex-row sm:items-center sm:justify-between" data-testid="first-campaign-banner" role="status">
      <span className="flex items-start gap-2">
        <Send className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>Your first campaign is drafted and waiting. Review and send (2 min).</span>
      </span>
      <Link href={href} className="inline-flex shrink-0 items-center gap-1 font-medium underline-offset-2 hover:underline">
        Review and send<ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

export function NeutralVoiceBanner({ state, onAdd }: { state: StudioState; onAdd: () => void }) {
  const [dismissed, setDismissed] = useState(true); // hidden until localStorage is read, so it never flashes
  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(VOICE_DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);
  const refs = state.references;
  if (!refs || refs.conversations !== 0 || dismissed) return null;
  const dismiss = () => {
    setDismissed(true);
    try { window.localStorage.setItem(VOICE_DISMISS_KEY, '1'); } catch { /* private mode: it just comes back next visit */ }
  };
  return (
    <div className="flex items-start gap-2 rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground" data-testid="neutral-voice-banner" role="status">
      <MessagesSquare className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1">
        Mr LAD is writing in a neutral voice. Add a few real conversations to make it sound like you (3 min).{' '}
        <button type="button" onClick={onAdd} className="font-medium text-primary underline-offset-2 hover:underline">Add conversations →</button>
      </span>
      <button type="button" onClick={dismiss} className="shrink-0 rounded p-0.5 hover:bg-muted" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * The rooms-view entry points into Steps 7, 8 and 9, next to the team strip.
 * The "Go live" tile shows only until setup is complete; `onGoLive` is
 * omitted on backends that do not report `state.launch`.
 */
export function StudioEntries({ state, onFirstCampaign, onReferences, onGoLive }: { state: StudioState; onFirstCampaign: () => void; onReferences: () => void; onGoLive?: () => void }) {
  const fc = state.firstCampaign;
  const refs = state.references;
  const launch = state.launch;
  const showGoLive = Boolean(onGoLive && launch && state.setup && state.setup.completedAt === null);
  if (fc === undefined && refs === undefined && !showGoLive) return null;
  const refCount = refs ? refs.documents + refs.links + refs.posts + refs.conversations + (refs.story ? 1 : 0) + refs.brand.logos + refs.brand.palette + refs.brand.fonts : 0;
  const cols = [fc !== undefined, refs !== undefined, showGoLive].filter(Boolean).length;
  return (
    <div className={`grid gap-2 ${cols >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`} data-testid="studio-entries">
      {showGoLive && launch && (
        <button type="button" onClick={onGoLive} className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-left hover:bg-muted/60 ${launch.canGoLive ? 'border-emerald-200 bg-emerald-50/60' : 'bg-card'}`} data-testid="go-live-tile">
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-sm font-semibold"><Rocket className="h-3.5 w-3.5 text-primary" aria-hidden />Go live</span>
            <span className="block truncate text-xs text-muted-foreground">
              {launch.canGoLive
                ? 'Everything is ready — try your agent, then press Go live'
                : `${launch.blocking.length} thing${launch.blocking.length === 1 ? '' : 's'} first: ${launch.blocking.map(launchRowTitle).join(', ')}`}
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      )}
      {fc !== undefined && (
        <button type="button" onClick={onFirstCampaign} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 text-left hover:bg-muted/60">
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Your first campaign</span>
            <span className="block truncate text-xs text-muted-foreground">
              {fc?.status === 'launched' ? 'Live' : fc?.drafted ? `Drafted${fc.summary ? ` — ${fc.summary}` : fc.offering ? ` — "${fc.offering}"` : ''}` : 'Not drafted yet — it takes a minute'}
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      )}
      {refs !== undefined && (
        <button type="button" onClick={onReferences} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 text-left hover:bg-muted/60">
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Brand &amp; references</span>
            <span className="block truncate text-xs text-muted-foreground">
              {refs.summary ?? (refCount ? `${refCount} thing${refCount === 1 ? '' : 's'} shared` : 'Nothing shared yet')}
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      )}
    </div>
  );
}

/** After go-live the setup entry points go away; this is the one link left. */
export function SetupHistoryLink({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline" data-testid="setup-history-link">
      <History className="h-3.5 w-3.5" aria-hidden />Setup history
    </button>
  );
}
