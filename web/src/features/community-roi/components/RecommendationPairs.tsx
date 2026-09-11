'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, ChevronDown, Send } from 'lucide-react';
import {
  useGenerateBulkRecommendations, useSavedRecommendations, useListMembers,
  useCoordinationSelections, useSelectCoordination, useSendCoordination,
} from '@lad/frontend-features/community-roi';
import type { DaySlot } from '@lad/frontend-features/community-roi';
import MessageTemplateSender from './MessageTemplateSender';
import {
  MemberCoordinationCard, SendCoordinationPanel, DAY_SLOTS, selectionFor,
  type Pair, type MemberLite,
} from './CoordinationRows';

interface RecommendationPair {
  recommendation_id?: string | null;
  member_a_id?: string | null;
  member_b_id?: string | null;
  day_slot?: number | null;
  member_a: string;
  member_b: string;
  member_a_company?: string;
  member_b_company?: string;
  industry_a?: string;
  industry_b?: string;
  score: number;
  reason: string;
  combination_type: number;
}

interface WeekData {
  week_number: number;
  pairs: RecommendationPair[];
}

interface GenerateResult {
  success: boolean;
  totalPairs: number;
  totalMembers: number;
  weeks: WeekData[];
  error?: string;
}

// ── Week selector options ────────────────────────────────────────────────────
const WEEK_OPTIONS = [1, 2, 3, 4, 6, 8, 12];

/**
 * Returns the Monday date label for week N.
 * If the API attached a stored `week_start_date` (anchored to when the batch
 * was generated), use that - that way the label doesn't shift forward as the
 * calendar advances. Falls back to "next Monday from today" only when no
 * stored date is available (e.g. very old data, fresh generation in flight).
 */
function getWeekMonday(weekNumber: number, storedISO?: string | null): string {
  if (storedISO) {
    return new Date(storedISO + 'T00:00:00Z').toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', timeZone: 'UTC',
    });
  }
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToNextMonday = (8 - dayOfWeek) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToNextMonday + (weekNumber - 1) * 7);
  return monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export const RecommendationPairs: React.FC = () => {
  const { generate, isGenerating, result: generateResult } = useGenerateBulkRecommendations();
  const { data: savedData, isLoading: isSavedLoading, refetch } = useSavedRecommendations();
  const { members } = useListMembers();

  const [activeWeek, setActiveWeek] = useState(1);
  const [selectedWeeks, setSelectedWeeks] = useState(2);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMessageSender, setShowMessageSender] = useState(false);
  const [showCoordinate, setShowCoordinate] = useState(false);
  const [broadcastToast, setBroadcastToast] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  // Persisted picks for the active week, and who is taken on each day.
  const { data: selData, refetch: refetchSelections } = useCoordinationSelections(activeWeek);
  const { select, deselect, isSaving } = useSelectCoordination();
  const { seed, send, isSeeding, isSending } = useSendCoordination();
  useEffect(() => { refetchSelections(); }, [activeWeek, refetchSelections]);

  // Load saved recommendations on mount
  useEffect(() => { refetch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The SAVED payload is canonical. The generate-bulk response is the
  // generator's in-memory shape — it carries day_slot but NO member ids, so a
  // screen that rendered it straight after Regenerate filtered every row to
  // nothing ("Wednesday · 0 pairs" over 626 real ones). handleGenerate refetches
  // the saved payload the moment generation finishes; generateResult is only a
  // fallback for the instant before that lands.
  const data = (savedData ?? generateResult) as GenerateResult | null;
  const isLoading = isSavedLoading && !generateResult;

  const weekData = data?.weeks?.find(w => w.week_number === activeWeek);

  const selections = useMemo(() => selData?.selections ?? [], [selData]);
  // useListMembers returns a PaginatedResponse, not an array — the rows are
  // under .data. The informational sender below used to be handed the whole
  // object as `allMembers`; fixed here since it sits next to this change.
  const memberLites: MemberLite[] = useMemo(
    () => (members?.data ?? []).map((m) => ({ id: m.id, name: m.name, industry: m.industry ?? null })),
    [members],
  );

  // memberId -> name of who they are paired with, per day. Drives the greyed-
  // out options so a taken partner explains itself instead of being a 409.
  const takenByDay = useMemo(() => {
    const out: Record<DaySlot, Map<string, string>> = { 1: new Map(), 2: new Map() };
    for (const sel of selections) {
      if (sel.status === 'skipped') continue;
      const day = sel.day_slot as DaySlot;
      if (!out[day]) continue;
      out[day].set(sel.member_a_id, sel.member_b_name);
      out[day].set(sel.member_b_id, sel.member_a_name);
    }
    return out;
  }, [selections]);

  // One row per member, with the recommender's pair for each day. Pairs are
  // stored in both directions, so every member appears as member_a somewhere.
  const memberRows = useMemo(() => {
    const byMember = new Map<string, { member: MemberLite; generatedByDay: Partial<Record<DaySlot, Pair>> }>();
    for (const pair of (weekData?.pairs ?? []) as Pair[]) {
      if (!pair.member_a_id) continue;   // pre-#832 payload: no ids, nothing to pick against
      if (!byMember.has(pair.member_a_id)) {
        byMember.set(pair.member_a_id, {
          member: { id: pair.member_a_id, name: pair.member_a, industry: pair.industry_a ?? null },
          generatedByDay: {},
        });
      }
      const day = pair.day_slot as DaySlot | null | undefined;
      if (day && DAY_SLOTS.includes(day)) byMember.get(pair.member_a_id)!.generatedByDay[day] = pair;
    }
    return [...byMember.values()].sort((a, b) => a.member.name.localeCompare(b.member.name));
  }, [weekData]);

  const generatedCount = useMemo(() => {
    const c: Record<DaySlot, number> = { 1: 0, 2: 0 };
    const seen = new Set<string>();
    for (const pair of (weekData?.pairs ?? []) as Pair[]) {
      const day = pair.day_slot as DaySlot | null | undefined;
      if (!day || !pair.member_a_id || !pair.member_b_id) continue;
      const key = [pair.member_a_id, pair.member_b_id].sort().join('|') + `|${day}`;
      if (seen.has(key)) continue;   // both directions are stored; count the pair once
      seen.add(key);
      c[day] = (c[day] ?? 0) + 1;
    }
    return c;
  }, [weekData]);

  // Changing a pick: drop the old selection for this member+day, record the new
  // one, and say exactly who is in the way if the service refuses.
  const handlePick = async (member: MemberLite, day: DaySlot, partnerId: string | null) => {
    setPickError(null);
    const existing = selectionFor(selections, member.id, day);
    if (existing && existing.status !== 'pending') return;   // already coordinated
    try {
      if (existing) {
        const removed = await deselect(existing.id);
        if (!removed) { setPickError('That pair has already been coordinated and cannot be changed.'); return; }
      }
      if (partnerId) {
        const gen = memberRows.find((r) => r.member.id === member.id)?.generatedByDay[day];
        const isGenerated = !!gen && (gen.member_b_id === partnerId || gen.member_a_id === partnerId);
        const out = await select({
          weekNumber: activeWeek, daySlot: day, memberAId: member.id, memberBId: partnerId,
          recommendationId: isGenerated ? gen?.recommendation_id ?? null : null,
          reason: isGenerated ? gen?.reason ?? null : null,
        });
        if (!out.ok) {
          const who = out.members
            .map((id) => memberLites.find((m) => m.id === id)?.name ?? id)
            .filter((n) => n !== member.name);
          setPickError(
            who.length
              ? `${who.join(', ')} already has a 1-2-1 on ${day === 1 ? 'Wednesday' : 'Friday'}. Pick someone else, or change theirs first.`
              : `That pick was refused: ${out.reason}.`,
          );
        }
      }
    } catch (e) {
      setPickError((e as Error).message);
    } finally {
      refetchSelections();
    }
  };

  const handleGenerate = async () => {
    await generate(selectedWeeks);
    // Re-read the canonical shape (ids + day_slot + recommendation_id) rather
    // than rendering the generator's response, and drop any picks that were
    // made against the previous generation.
    await refetch();
    setActiveWeek(1);
    refetchSelections();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-800"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <ChevronDown 
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
            />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900">1-to-1 Meeting Recommendations</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Each member gets two suggestions a week — one for each coordination day — chosen so nobody is booked twice on a day. Pick a partner per day, then send that day&apos;s slot offers.
            </p>
          </div>
        </div>

        {/* Controls: week selector + generate button */}
        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Week count selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Next</span>
            <select
              value={selectedWeeks}
              onChange={e => setSelectedWeeks(Number(e.target.value))}
              disabled={isGenerating}
              className="text-sm font-semibold text-slate-800 bg-transparent border-none outline-none cursor-pointer disabled:opacity-60"
            >
              {WEEK_OPTIONS.map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'week' : 'weeks'}</option>
              ))}
            </select>
          </div>

          {/* Send Messages button (only show if data loaded with results) */}
          {!isLoading && data?.success && !!(data as GenerateResult)?.weeks?.length && (
            <>
            <button
              onClick={() => setShowCoordinate(true)}
              disabled={isGenerating}
              title="Send each member a slot offer for their pick that day and open the negotiation"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
              Coordinate 1-2-1s
            </button>
            <button
              onClick={() => setShowMessageSender(true)}
              disabled={isGenerating}
              title="Send an informational template (no slots, no negotiation)"
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 transition-colors"
            >
              Info message
            </button>
            </>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating&hellip;
              </>
            ) : data ? 'Regenerate' : 'Generate Recommendations'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-6">
          {/* Loading saved data */}
          {isLoading && (
            <div className="flex items-center justify-center py-16 gap-3">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
              <span className="text-sm text-slate-500">Loading recommendations&hellip;</span>
            </div>
          )}

          {/* Generating */}
          {isGenerating && (
            <div className="flex items-center justify-center py-16 gap-3">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
              <span className="text-sm text-slate-500">Analysing industries and building conflict-free pairs&hellip;</span>
            </div>
          )}

          {/* Empty state - only after load completes and nothing found */}
          {!isLoading && !isGenerating && (!data || !data.weeks?.length) && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl">🤝</div>
              <div>
                <p className="text-sm font-semibold text-slate-700">No recommendations yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Select how many weeks ahead to plan, then click <strong>Generate Recommendations</strong>.
                  Each member gets two 1-to-1 suggestions per week, one for each coordination day.
                </p>
              </div>
            </div>
          )}

          {/* Results */}
        {data?.success && !isGenerating && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-indigo-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-indigo-700">{data.totalPairs}</p>
                <p className="text-xs text-indigo-500 font-medium mt-0.5">Total recommendations ({data.weeks?.length} weeks)</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700">{data.totalMembers}</p>
                <p className="text-xs text-emerald-500 font-medium mt-0.5">Members with options</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-yellow-700">
                  {data.weeks?.reduce((sum, w) => sum + w.pairs.filter(p => p.combination_type === 2).length, 0)}
                </p>
                <p className="text-xs text-yellow-600 font-medium mt-0.5">With referral exist</p>
              </div>
            </div>

            {/* Week tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {data.weeks?.map(w => (
                <button
                  key={w.week_number}
                  onClick={() => setActiveWeek(w.week_number)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    activeWeek === w.week_number
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Week {w.week_number}
                  <span className={`ml-1.5 text-xs ${activeWeek === w.week_number ? 'text-indigo-200' : 'text-slate-400'}`}>
                    · {getWeekMonday(w.week_number, (w as any).week_start_date)}
                  </span>
                  <span className={`ml-1 text-xs ${activeWeek === w.week_number ? 'text-indigo-200' : 'text-slate-400'}`}>
                    ({w.pairs.length})
                  </span>
                </button>
              ))}
            </div>

            {/* Search Filter */}
            <div className="mb-6 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 pl-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded transition-colors text-slate-400 hover:text-slate-600"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

      {/* Pairs for selected week */}
            {weekData?.pairs?.length ? (
              <div className="flex flex-col gap-2">
                {pickError && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{pickError}</p>
                )}
                {memberRows
                  .filter(({ member }) => member.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(({ member, generatedByDay }, index) => (
                    <MemberCoordinationCard
                      key={member.id}
                      index={index}
                      member={member}
                      generatedByDay={generatedByDay}
                      selections={selections}
                      takenByDay={takenByDay}
                      allMembers={memberLites}
                      saving={isSaving}
                      onPick={(day, partnerId) => handlePick(member, day, partnerId)}
                    />
                  ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">
                {searchQuery ? 'No members match your search.' : 'No options for this week.'}
              </p>
            )}
          </>
        )}
        </div>
      )}

      {/* Broadcast toast */}
      {broadcastToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-700 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg animate-fade-in">
          {broadcastToast}
        </div>
      )}

      {/* Message Sender Modal */}
      {showCoordinate && (
        <SendCoordinationPanel
          weekNumber={activeWeek}
          generatedCount={generatedCount}
          selections={selections}
          isSeeding={isSeeding}
          isSending={isSending}
          onSeed={(day) => seed(activeWeek, day).finally(() => refetchSelections())}
          onSend={(day) => send(activeWeek, day).finally(() => refetchSelections())}
          onClose={() => setShowCoordinate(false)}
        />
      )}
      {showMessageSender && data?.success && (
        <MessageTemplateSender
          memberName={data?.weeks?.[0]?.pairs?.[0]?.member_a || 'Member'}
          noInteractionCount={0}
          recommendations={data?.weeks?.flatMap(w => w.pairs) || []}
          allMembers={members?.data ?? []}
          onClose={() => setShowMessageSender(false)}
          onSuccess={(result) => {
            setShowMessageSender(false);
            const r = result as {
              broadcasting?: boolean; broadcastComplete?: boolean;
              total?: number; sent?: number; failed?: number; error?: string;
            };
            if (r?.broadcasting) {
              setBroadcastToast(`📤 Broadcasting to ${r.total ?? ''} members in background...`);
              setTimeout(() => setBroadcastToast(null), 6000);
              return;
            }
            // The toast above fires BEFORE the request, so without this a
            // broadcast that failed — or partly failed — still read as sent.
            if (r?.broadcastComplete) {
              setBroadcastToast(
                r.error
                  ? `⚠️ Broadcast failed — ${r.error}. No messages were sent.`
                  : (r.failed ?? 0) > 0
                    ? `⚠️ Broadcast finished: ${r.sent ?? 0} sent, ${r.failed} failed.`
                    : `✅ Broadcast finished: ${r.sent ?? 0} sent.`,
              );
              setTimeout(() => setBroadcastToast(null), 12000);
            }
          }}
        />
      )}
    </div>
  );
};

export default RecommendationPairs;
