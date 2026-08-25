'use client';
// /crm/[id] - full-page prospect / lead / client detail.
//
// Opened when a row is clicked in /crm. Fetches the prospect + its event
// timeline from the Master Agent and renders the rich ProspectDetail panel
// as a standalone page (instead of the inline bottom panel).

import { useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

import {
  useProspect, useProspectEvents, useDeleteProspect, useEnrichProspect,
  useProspectAction, useProspectFollowups,
} from '@lad/frontend-features/prospects';
import { apiErrorStatus } from '@lad/frontend-features';

import TopBar from '@/components/crm/top-bar';
import ProspectDetail from '@/components/crm/prospect-detail';
import { WARM_PATH } from '@/components/crm/data';
import { toProspectFixture, toCrmEvents } from '@/components/crm/adapt';
import { useToast } from '@/components/ui/app-toaster';

export const dynamic = 'force-dynamic';

// The events endpoint has no total-count support (unlike /api/prospects'
// X-Total-Count) — capping the fetch here means we can only ever know
// "at least this many", never a true total, for any contact whose real
// history exceeds this limit.
const EVENTS_LIMIT = 100;

const BOX =
  'rounded-[20px] border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] p-10 text-center text-[13px] text-slate-500 dark:text-[#7a8ba3]';

export default function CrmDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const detailQuery = useProspect(id);
  const eventsQuery = useProspectEvents(id, { limit: EVENTS_LIMIT });
  const followupsQuery = useProspectFollowups(id);
  const { push } = useToast();

  // CRM "Take action" - pause outreach (quiet) or hard-suppress (do not contact).
  // The mutation invalidates the prospect cache, so do_not_contact / quiet_until
  // re-render from the refreshed detailQuery. onError surfaces a toast — without
  // one, a failed click and a click that never registered look identical (the
  // button just goes back to its normal state either way).
  const actionMutation = useProspectAction();
  const handleAction = (params: { doNotContact?: boolean; quietDays?: number; clearQuiet?: boolean }) => {
    if (!id) return;
    actionMutation.mutate(
      { id, ...params },
      {
        onError: (err) =>
          push({
            variant: 'error',
            title: 'Action failed',
            description: (err as Error)?.message || 'Could not update this contact. Please try again.',
          }),
      },
    );
  };

  const fixture = useMemo(
    () => (detailQuery.data ? toProspectFixture(detailQuery.data) : null),
    [detailQuery.data]
  );
  const events = useMemo(() => toCrmEvents(eventsQuery.data), [eventsQuery.data]);
  const eventsTruncated = events.length >= EVENTS_LIMIT;

  // A failed events fetch leaves eventsQuery.data undefined, which toCrmEvents
  // turns into [] — and every aggregate below then renders a confident 0.
  // Reproduced by blocking /events (both as a 503 and as a network error): a
  // contact with 5 real events showed "ENGAGEMENT · 7D 0" and "Recent activity
  // 0 total events", while "Channel mix" — read from the prospect's OWN
  // channel_rollups, which loaded fine — still said 2 on the same screen.
  //
  // Keyed on data being absent rather than on isError, because that is the
  // thing the UI actually cannot render honestly: it covers a failed fetch, a
  // query stuck pending, and anything else that leaves us without events.
  // Excludes the in-flight case so a normal load doesn't flash the warning.
  const eventsUnavailable = !eventsQuery.isFetching && eventsQuery.data === undefined;

  // Same shape, same reason, one panel over. NextFollowups already has a
  // well-written error branch — it even says "this isn't necessarily 'no
  // follow-ups queued'" — but it was gated on `isError`, which (as with the
  // events query) does not fire here. Blocking the follow-ups endpoint with a
  // 503 rendered the confident "No automatic follow-ups queued." instead.
  const followupsUnavailable =
    !followupsQuery.isFetching && followupsQuery.data === undefined;

  // Third instance of the same shape, and the most misleading of them: a failed
  // detail fetch left `fixture` null and fell through to "This contact could not
  // be found. It may have been removed." Blocking the endpoint with a 503
  // produced exactly that for a contact that exists.
  //
  // Only claim removal when the API actually said 404. When the status is
  // unknown — the error object is not always populated, which is the same
  // reason these guards key off absent data rather than isError — the safe
  // default is "could not load", which is never false.
  // `error` alone is NOT enough. Verified live against a genuinely missing id:
  // the API answers 404, and `isError` stays false — the page reaches its
  // "could not be found" message through the !fixture fallthrough, never the
  // error branch. So reading only `error` would leave detailStatus undefined for
  // the one case this check exists to identify, and a deleted contact would get
  // the vague "Could not load this contact. Please try again." — pointing the
  // user at a retry that can never succeed. `failureReason` carries the last
  // failed attempt's error even while status is not 'error'.
  const detailStatus = apiErrorStatus(
    (detailQuery.error ?? detailQuery.failureReason) as unknown,
  );
  const detailNotFound = detailStatus === 404;
  const detailUnavailable = !detailQuery.isFetching && detailQuery.data === undefined;
  const detailMessage = ((detailQuery.error ?? detailQuery.failureReason) as Error | null)
    ?.message;

  // Option C - enrich the prospect's LinkedIn profile on first open (company +
  // employment + warm-path signals) when it hasn't been enriched yet. Fire once,
  // best-effort; refetch shortly after so the freshly-pulled data renders.
  const enrichMutation = useEnrichProspect();
  const enrichTriggered = useRef(false);
  useEffect(() => {
    const p = detailQuery.data;
    if (!p || !id || enrichTriggered.current) return;
    if (p.linkedin_url && !p.profile_enriched_at) {
      enrichTriggered.current = true;
      enrichMutation.mutate(id, {
        onSuccess: () => setTimeout(() => { void detailQuery.refetch(); }, 2500),
      });
    }
  }, [detailQuery.data, id, enrichMutation, detailQuery]);

  const removeMutation = useDeleteProspect();
  const handleRemove = () => {
    if (!id || !fixture) return;
    const ok = window.confirm(
      `Remove ${fixture.full_name} as “not a fit”? They’ll be hidden from your pipeline (an admin can restore it).`,
    );
    if (!ok) return;
    removeMutation.mutate(
      { id, reason: 'not_a_fit' },
      {
        onSuccess: () => router.push('/crm'),
        // Same gap as the action mutation above, same fix: without this,
        // a failed removal leaves the user on the same page with the
        // button just back to normal — no way to tell "it failed" from
        // "it never registered".
        onError: (err) =>
          push({
            variant: 'error',
            title: 'Could not remove contact',
            description: (err as Error)?.message || 'Please try again.',
          }),
      },
    );
  };

  const back = () => router.push('/crm');

  return (
    <div className="min-h-screen bg-[#F8F9FE] dark:bg-[#000724]">
      <TopBar
        crumbs={[
          { label: 'Deals Pipeline', href: '/crm' },
          { label: fixture?.full_name ?? 'Prospect' },
        ]}
      />
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
        {detailNotFound ? (
          // ONLY when the API actually answered 404. The old code reached this
          // message for ANY settled-with-no-contact state, so a 503 rendered
          // "It may have been removed." for a contact that exists — a specific
          // claim about the RECORD when the truth was about the connection.
          //
          // (Kept from the original fix: a missing id used to sit on "Loading
          // contact…" forever, because the condition treated "no data" as
          // "still loading". Anything terminal still lands somewhere honest.)
          <div className={BOX}>
            This contact could not be found. It may have been removed.
          </div>
        ) : detailQuery.isError || detailUnavailable ? (
          <div className={BOX}>
            Could not load this contact
            {detailMessage ? `: ${detailMessage}` : '. Please try again.'}
          </div>
        ) : !fixture && (detailQuery.isLoading || detailQuery.isFetching) ? (
          <div className={BOX}>Loading contact…</div>
        ) : !fixture ? (
          // Settled, no contact, and we never saw a 404 — say what we know
          // rather than guessing that it was deleted.
          <div className={BOX}>Could not load this contact. Please try again.</div>
        ) : (
          <ProspectDetail
            prospect={fixture}
            events={events}
            eventsTruncated={eventsTruncated}
            eventsError={eventsQuery.isError}
            eventsUnavailable={eventsUnavailable}
            warmPath={WARM_PATH}
            warmPathSample
            onClose={back}
            onRemove={handleRemove}
            isRemoving={removeMutation.isPending}
            onAction={handleAction}
            isActing={actionMutation.isPending}
            doNotContact={detailQuery.data?.do_not_contact ?? false}
            quietUntil={detailQuery.data?.quiet_until ?? null}
            followups={followupsQuery.data?.followups ?? []}
            followupsDegradedChannels={followupsQuery.data?.degradedChannels ?? []}
            followupsLoading={followupsQuery.isLoading}
            followupsError={followupsQuery.isError || followupsUnavailable}
            // The report + accelerator API is keyed by the CORE lead id, not
            // this page's Master Agent prospect id.
            coreLeadId={detailQuery.data?.core_lead_id ?? null}
          />
        )}
      </main>
    </div>
  );
}
