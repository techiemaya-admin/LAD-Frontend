'use client';
// /crm/[id] — full-page prospect / lead / client detail.
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

import TopBar from '@/components/crm/top-bar';
import ProspectDetail from '@/components/crm/prospect-detail';
import { WARM_PATH } from '@/components/crm/data';
import { toProspectFixture, toCrmEvents } from '@/components/crm/adapt';

export const dynamic = 'force-dynamic';

const BOX =
  'rounded-[20px] border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] p-10 text-center text-[13px] text-slate-500 dark:text-[#7a8ba3]';

export default function CrmDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const detailQuery = useProspect(id);
  const eventsQuery = useProspectEvents(id, { limit: 100 });
  const followupsQuery = useProspectFollowups(id);

  // CRM "Take action" — pause outreach (quiet) or hard-suppress (do not contact).
  // The mutation invalidates the prospect cache, so do_not_contact / quiet_until
  // re-render from the refreshed detailQuery.
  const actionMutation = useProspectAction();
  const handleAction = (params: { doNotContact?: boolean; quietDays?: number }) => {
    if (!id) return;
    actionMutation.mutate({ id, ...params });
  };

  const fixture = useMemo(
    () => (detailQuery.data ? toProspectFixture(detailQuery.data) : null),
    [detailQuery.data]
  );
  const events = useMemo(() => toCrmEvents(eventsQuery.data), [eventsQuery.data]);

  // Option C — enrich the prospect's LinkedIn profile on first open (company +
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
      { onSuccess: () => router.push('/crm') },
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
        {detailQuery.isError ? (
          <div className={BOX}>
            Could not load this contact: {(detailQuery.error as Error)?.message ?? 'Unknown error'}
          </div>
        ) : detailQuery.isLoading || !fixture ? (
          <div className={BOX}>Loading contact…</div>
        ) : (
          <ProspectDetail
            prospect={fixture}
            events={events}
            warmPath={WARM_PATH}
            warmPathSample
            onClose={back}
            onRemove={handleRemove}
            isRemoving={removeMutation.isPending}
            onAction={handleAction}
            isActing={actionMutation.isPending}
            doNotContact={detailQuery.data?.do_not_contact ?? false}
            quietUntil={detailQuery.data?.quiet_until ?? null}
            followups={followupsQuery.data ?? []}
            followupsLoading={followupsQuery.isLoading}
            // The report + accelerator API is keyed by the CORE lead id, not
            // this page's Master Agent prospect id.
            coreLeadId={detailQuery.data?.core_lead_id ?? null}
          />
        )}
      </main>
    </div>
  );
}
