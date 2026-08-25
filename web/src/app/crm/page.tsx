'use client';
// /crm - Pipeline + Prospect list/board, wired to the Master Agent.
//
// Live data: prospect_state via @lad/frontend-features/prospects. Clicking a row
// navigates to /crm/[id] (full detail page). The dummy data in ./data is no
// longer used for values - only its types + STAGES + the adapter.

import * as React from 'react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';

import { useProspects, useDeleteProspect } from '@lad/frontend-features/prospects';

import TopBar, { type Crumb } from '@/components/crm/top-bar';
import StatsCards, { type CrmView } from '@/components/crm/stats-cards';
import ViewPills from '@/components/crm/view-pills';
import KanbanBoard from '@/components/crm/kanban-board';
import {
  AllContactsTable, ProspectsTable, LeadsTable, ClientsTable,
} from '@/components/crm/tables';
import { Pager, type CrmPagination } from '@/components/crm/shared';
import { STAGES, type CrmContact } from '@/components/crm/data';
import { toCrmContacts, toKanbanLeads } from '@/components/crm/adapt';
import { useToast } from '@/components/ui/app-toaster';

export const dynamic = 'force-dynamic';

// Server-side page size. The Master Agent caps a single page at 500; 50 keeps
// the board + tables snappy while the pager walks through every record.
const PAGE_SIZE = 50;

// Mirrors ListProspectsParams['sort_by'] — the only fields the backend
// actually indexes on prospect_state (sdk/features/prospects/types.ts).
type ServerSortBy = 'last_event_at' | 'fit_score' | 'sah_at' | 'created_at';

const VIEW_TITLES: Record<Exclude<CrmView, 'board'>, string> = {
  all: 'All Contacts',
  prospects: 'Prospects',
  leads: 'Leads',
  clients: 'Clients',
};

const EMPTY_BOX =
  'rounded-[20px] border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] p-10 text-center text-[13px] text-slate-500 dark:text-slate-300';

export default function CrmPage() {
  const router = useRouter();
  const { push } = useToast();
  const [view, setView] = useState<CrmView>('board');
  const [page, setPage] = useState(1); // 1-indexed
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ by: ServerSortBy; dir: 'asc' | 'desc' } | null>(null);

  // The table's own search box narrows the current page instantly and
  // locally; this debounced callback additionally re-queries the server
  // across the WHOLE tenant, not just the loaded page - without it, a real
  // contact outside the current page read as a false "No matches" on any
  // tenant with more than one page. A new search term needs its own page
  // count, so land back on page 1 rather than stranding the user on
  // whatever page number they were on for the old (unfiltered) list.
  const handleSearchChange = (q: string) => {
    setSearch(q);
    setPage(1);
  };

  // Mirrors handleSearchChange: a column's local sort only reordered the
  // loaded page (e.g. "oldest first" surfaced the oldest of THIS page's 50,
  // not the tenant's true oldest contact, who could be on any other page).
  // Only fires for columns whose Column.serverSortKey is set - see tables.tsx.
  const handleSortChange = (by: ServerSortBy, dir: 'asc' | 'desc') => {
    setSort({ by, dir });
    setPage(1);
  };

  // Each table tab mounts a fresh CrmTable (its own local search/sort state
  // always starts empty), and the board view has no search box or column
  // headers at all - so a lifted search/sort surviving a tab switch would
  // silently keep filtering/reordering rows on a screen with no visible way
  // to see or clear it.
  React.useEffect(() => {
    setSearch('');
    setSort(null);
    setPage(1);
  }, [view]);

  // ── Live data (one server-side page at a time) ──────────────────────────────
  const listQuery = useProspects({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    sort_by: sort?.by,
    sort_dir: sort?.dir,
    search: search.trim() || undefined,
  });
  const prospects = useMemo(() => listQuery.data?.items ?? [], [listQuery.data]);
  const total = listQuery.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Guard against a page that no longer exists (e.g. after deletions shrink the
  // list): snap back to the last valid page once the new total is known.
  React.useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  // React Query serves the PREVIOUS page as placeholderData while the next one
  // loads. If that fetch then fails, placeholder data still counts as data, so
  // `status` stays 'success' and `listQuery.isError` never fires — the error
  // banner below is only ever reached on a cold load with an empty cache.
  //
  // Measured on develop: with every /api/prospects request returning 503, the
  // page still read "Showing 51–100 of 571" above rows byte-identical to page 1,
  // and showed nothing at all to say the load had failed. The user reads 50
  // people as records 51–100.
  //
  // isPlaceholderData says "these rows are not for the current query key";
  // combined with the fetch having settled, that means it failed.
  const showingStaleRows = listQuery.isPlaceholderData && !listQuery.isFetching;

  const pagination: CrmPagination = {
    page,
    pageCount,
    total,
    pageSize: PAGE_SIZE,
    onPageChange: setPage,
    loading: listQuery.isFetching,
    stale: showingStaleRows,
  };

  const contacts = useMemo(() => toCrmContacts(prospects), [prospects]);
  const kanbanLeads = useMemo(() => toKanbanLeads(prospects), [prospects]);

  // The 4 summary cards must reflect the TENANT'S true totals, not just the
  // current 50-row page — contacts.length silently capped every count at
  // PAGE_SIZE for any tenant with more than one page. lifecycleToType's
  // bucketing (adapt.ts) only has 3 "non-prospect" source stages (qualified/
  // sah -> lead, won -> client; everything else, including the new
  // 'contacted' stage, falls into the prospect catch-all) — so 3 cheap
  // limit=1 requests (read only X-Total-Count, no rows) are enough to get
  // every bucket's real total, instead of fetching + counting every row.
  //
  // Unfiltered on purpose: `total` above now reflects an active table
  // search (server-side, see `search` state), so the summary cards need
  // their OWN unsearched total — otherwise typing into the search box
  // made "All Contacts"/"Prospects" collapse to the search's match count
  // instead of staying the tenant's real totals.
  // `?? 0` on all of these meant an outage rendered "All Contacts 0 · Prospects
  // 0 · Leads 0 · Clients 0" — a tenant with 571 contacts told their CRM was
  // empty. Keep them nullable so a figure we could not load reads as "—".
  //
  // Each bucket is its OWN request, so they fail INDEPENDENTLY: on a cold cache
  // a partial outage can resolve the tenant total while one bucket comes back
  // undefined. Coercing that bucket to 0 published two lies at once — "Clients
  // 0" for a tenant that has clients, and a Prospects figure inflated by the
  // clients that silently went missing from the subtraction below. Stay null
  // all the way to the render so each card can say "—" on its own.
  const trueTotalQuery = useProspects({ limit: 1 });
  const trueTotal = trueTotalQuery.data?.total ?? null;
  const qualifiedTotal = useProspects({ lifecycle_stage: 'qualified', limit: 1 }).data?.total ?? null;
  const sahTotal = useProspects({ lifecycle_stage: 'sah', limit: 1 }).data?.total ?? null;
  const wonTotal = useProspects({ lifecycle_stage: 'won', limit: 1 }).data?.total ?? null;

  // Same problem, one view over: the board buckets `kanbanLeads`, which is only
  // the current 50-row page, so its column headers capped at PAGE_SIZE too —
  // 550 "new" prospects rendered as "New 38" right under "All Contacts 571".
  // 'qualified' and 'sah' are already fetched above, so only 3 more limit=1
  // requests are needed to cover all five STAGES.
  //
  // Left UNDEFINED when the count did not load: KanbanBoard already falls back
  // to the number of cards it actually has (`stageTotal ?? loaded`). Passing 0
  // defeated that fallback — 0 is not nullish — so a failed stage count printed
  // "Engaged 0 · AED 0 pipeline" directly above the Engaged cards on the page.
  const newTotal = useProspects({ lifecycle_stage: 'new', limit: 1 }).data?.total;
  const contactedTotal = useProspects({ lifecycle_stage: 'contacted', limit: 1 }).data?.total;
  const engagedTotal = useProspects({ lifecycle_stage: 'engaged', limit: 1 }).data?.total;
  const stageTotals = useMemo(
    () => ({
      new: newTotal,
      contacted: contactedTotal,
      engaged: engagedTotal,
      qualified: qualifiedTotal ?? undefined,
      sah: sahTotal ?? undefined,
    }),
    [newTotal, contactedTotal, engagedTotal, qualifiedTotal, sahTotal],
  );
  const counts = useMemo(() => {
    // Derive each card only from figures we actually have. `leads` needs both
    // of its halves; `prospects` is `all` minus the others, so it needs all
    // three. Anything underivable stays null and renders "—" rather than a
    // zero we cannot stand behind.
    const leads = qualifiedTotal != null && sahTotal != null ? qualifiedTotal + sahTotal : null;
    const clients = wonTotal;
    const prospects =
      trueTotal != null && leads != null && clients != null
        ? Math.max(0, trueTotal - leads - clients)
        : null;
    return { all: trueTotal, prospects, leads, clients };
  }, [trueTotal, qualifiedTotal, sahTotal, wonTotal]);

  // The list itself never loaded — distinct from "this tenant has no contacts".
  // On a cold cache during an outage this rendered the FIRST-RUN message ("No
  // prospects yet. As your channels engage prospects, they'll appear here.")
  // with no error at all, telling a tenant with 571 contacts they were a brand
  // new empty account. Same reason as the other guards: isError does not fire.
  const listUnavailable = !listQuery.isFetching && listQuery.data === undefined;

  // Open a contact's full detail page.
  const openDetail = (idOrContact: string | CrmContact) => {
    const id = typeof idOrContact === 'string' ? idOrContact : idOrContact.id;
    if (id) router.push(`/crm/${id}`);
  };

  // Soft-delete a prospect ("not a fit"). The list auto-refetches via cache invalidation.
  const removeMutation = useDeleteProspect();
  const handleRemove = (c: CrmContact) => {
    const ok = window.confirm(
      `Remove ${c.name} as “not a fit”? They’ll be hidden from your pipeline (an admin can restore it).`,
    );
    if (!ok) return;
    removeMutation.mutate(
      { id: c.id, reason: 'not_a_fit' },
      {
        // Bare .mutate() with no callbacks — a failed removal left the row
        // sitting there with zero indication anything went wrong, same gap
        // as the detail page's own handleRemove and the action mutation
        // fixed earlier this session.
        onError: (err) =>
          push({
            variant: 'error',
            title: 'Could not remove contact',
            description: (err as Error)?.message || 'Please try again.',
          }),
      },
    );
  };

  const crumbs: Crumb[] =
    view === 'board'
      ? [{ label: 'Deals Pipeline' }]
      : [{ label: 'Deals Pipeline', href: '/crm' }, { label: VIEW_TITLES[view] }];

  const handleStatSelect = (key: Exclude<CrmView, 'board'>) => {
    setView((prev) => (prev === key ? 'board' : key));
  };

  const filteredContacts = useMemo(() => {
    if (view === 'prospects') return contacts.filter((c) => c.type === 'prospect');
    if (view === 'leads') return contacts.filter((c) => c.type === 'lead');
    if (view === 'clients') return contacts.filter((c) => c.type === 'client');
    return contacts;
  }, [view, contacts]);

  const renderMain = () => {
    if (view === 'board')
      return (
        <div className="space-y-3">
          <KanbanBoard
            stages={STAGES}
            leads={kanbanLeads}
            stageTotals={stageTotals}
            // Board is the DEFAULT view, so during an outage it is the first
            // thing a user sees. Without this it falls back to counting the
            // (empty) page and reads "New 0 · Contacted 0 · …" directly under
            // summary cards that correctly read "—".
            unavailable={listUnavailable || trueTotal === null}
            selectedLeadId={null}
            onSelectLead={openDetail}
          />
          {pageCount > 1 && (
            <div className="rounded-[20px] border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] px-5 py-3">
              <Pager pagination={pagination} />
            </div>
          )}
        </div>
      );
    if (view === 'all') return <AllContactsTable rows={filteredContacts} onSelect={openDetail} onRemove={handleRemove} pagination={pagination} onSearchChange={handleSearchChange} onSortChange={handleSortChange} />;
    if (view === 'prospects') return <ProspectsTable rows={filteredContacts} onSelect={openDetail} onRemove={handleRemove} pagination={pagination} onSearchChange={handleSearchChange} onSortChange={handleSortChange} />;
    if (view === 'leads') return <LeadsTable rows={filteredContacts} onSelect={openDetail} onRemove={handleRemove} pagination={pagination} onSearchChange={handleSearchChange} onSortChange={handleSortChange} />;
    if (view === 'clients') return <ClientsTable rows={filteredContacts} onSelect={openDetail} onRemove={handleRemove} pagination={pagination} onSearchChange={handleSearchChange} onSortChange={handleSortChange} />;
    return null;
  };

  return (
    <div className="min-h-screen bg-[#F8F9FE] dark:bg-[#000724]">
      <TopBar crumbs={crumbs} />
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
        <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-[#1e293b] dark:text-white" />
            <div>
              <h1
                className="text-2xl sm:text-3xl font-bold text-[#1e293b] dark:text-white"
                style={{ fontFamily: '"Space Grotesk", system-ui' }}
              >
                Deals Pipeline
              </h1>
              <p className="text-[13px] text-[#6b7280] dark:text-slate-300">
                Live cross-channel prospects across all your channels
              </p>
            </div>
          </div>
          <Link
            href="/crm/zoho"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] text-[13px] font-medium text-slate-700 dark:text-[#c7d2e0] hover:bg-slate-50 dark:hover:bg-[#1a2a43] transition-colors"
          >
            <span className="text-red-600 font-bold leading-none" aria-hidden>Z</span> Zoho CRM
          </Link>
        </div>

        {(listQuery.isError || showingStaleRows || listUnavailable) && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30 p-4 text-[13px] text-rose-700 dark:text-rose-300">
            {listQuery.isError ? (
              <>Could not load prospects: {(listQuery.error as Error)?.message ?? 'Unknown error'}</>
            ) : listUnavailable ? (
              <>Could not load your contacts. This is a loading problem, not an empty
                pipeline — please try again.</>
            ) : (
              // The stale branch exists precisely BECAUSE the query stays in
              // 'success' when placeholder data is present — which also means
              // `listQuery.error` is null here. Interpolating it printed the
              // literal "Could not load prospects: Unknown error", which reads
              // as a second, mysterious failure mode rather than the plain
              // "your refresh didn't land" that it actually is.
              <>Couldn&apos;t refresh this view — the contacts below are from your previous
                view, not this one.</>
            )}
          </div>
        )}

        <StatsCards counts={counts} selected={view} onSelect={handleStatSelect} />
        <ViewPills view={view} onChange={(v) => setView(v)} />

        {listQuery.isLoading ? (
          <div className={EMPTY_BOX}>Loading prospects…</div>
        ) : !listQuery.isError && !listUnavailable && prospects.length === 0 && !search.trim() ? (
          // "No prospects yet" is the FIRST-RUN message, so it must only show
          // when the tenant genuinely has nothing — never as the result of a
          // search. Since search became server-side, a query with no hits
          // empties `prospects`, which used to swap the whole table out for
          // this box: the message was flatly wrong (the tenant has 571), and
          // it removed the search input, so the user could not clear their
          // own search without reloading. With a search active we always
          // render the table, which has its own "No matches." state and
          // keeps the box, filters and Export in place.
          <div className={EMPTY_BOX}>
            No prospects yet. As your channels engage prospects, they&apos;ll appear here.
          </div>
        ) : (
          renderMain()
        )}

        <footer className="pt-6 pb-2 text-[11.5px] text-slate-400 dark:text-slate-300/60 flex items-center justify-between">
          {/* Every non-board view already renders its own Pager (see CrmTable),
              sourced from this same `pagination` object - repeating the raw
              total here duplicated it and, once a table search/filter was
              active, contradicted the filtered count shown above it. Only the
              board view has no other totals indicator, so it's the only one
              shown here. */}
          <span>{view === 'board' ? `${total.toLocaleString()} contacts total · page ${page} of ${pageCount}` : ''}</span>
          <span>Mr LAD · Master Agent</span>
        </footer>
      </main>
    </div>
  );
}
