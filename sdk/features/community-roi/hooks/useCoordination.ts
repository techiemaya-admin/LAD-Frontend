/**
 * Community ROI - coordination selections and sending.
 *
 * The recommendations screen used to hold its selection in the page (gone on
 * reload) and its "Send Messages" button sent an informational template that
 * opened no negotiation. These hooks back the real thing:
 *
 *   - which pair the chapter chose for each of the week's two coordination
 *     days, persisted per (week, day, pair);
 *   - who is already spoken for on a day, so a partner cannot be picked twice;
 *   - seeding a day's selections from the generated pairs in ONE call;
 *   - sending a day, which opens a negotiation and puts the slot offer in
 *     front of the initiator — the same path the weekly cron takes.
 */
import { useCallback, useState } from 'react';
import { communityROIApiClient, type ApiClientError } from '../communityROIApiClient';

/** 1 = the week's first coordination day, 2 = the second. */
export type DaySlot = 1 | 2;

export interface CoordinationSelection {
  id: string;
  week_number: number;
  day_slot: DaySlot;
  member_a_id: string;
  member_b_id: string;
  member_a_name: string;
  member_b_name: string;
  recommendation_id: string | null;
  reason: string | null;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  negotiation_id: string | null;
  skip_reason: string | null;
  sent_at: string | null;
}

export interface CoordinationSelectionsResponse {
  selections: CoordinationSelection[];
  /** member ids already spoken for, keyed by day slot */
  takenByDay: Record<string, string[]>;
}

export interface SeedSummary {
  weekNumber: number;
  daySlot: number;
  generated: number;
  created: number;
  alreadySelected: number;
  skippedConflict: number;
  skipped: Array<{ a: string; b: string; reason: string; members: string[] }>;
}

export interface SendSummary {
  weekNumber: number;
  daySlot: number;
  selected: number;
  pending: number;
  proposed: number;
  notified: number;
  skipped: number;
  failed: number;
  cappedOut: number;
}

interface Envelope<T> { success: boolean; data: T; error?: string; members?: string[] }

/**
 * The week's picks plus who is already taken on each day.
 * GET /api/community-roi/coordination/selections?weekNumber=N
 */
export function useCoordinationSelections(weekNumber: number) {
  const [data, setData] = useState<CoordinationSelectionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await communityROIApiClient.get<Envelope<CoordinationSelectionsResponse>>(
        `/api/community-roi/coordination/selections?weekNumber=${encodeURIComponent(weekNumber)}`,
      );
      setData(res.data?.data ?? null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [weekNumber]);

  return { data, isLoading, error, refetch };
}

export interface SelectArgs {
  weekNumber: number;
  daySlot: DaySlot;
  memberAId: string;
  memberBId: string;
  recommendationId?: string | null;
  reason?: string | null;
}

/**
 * Record one pick. A 409 means a partner is already taken that day — the
 * response names WHICH member, and that is surfaced rather than swallowed.
 * POST /api/community-roi/coordination/selections
 */
export function useSelectCoordination() {
  const [isSaving, setIsSaving] = useState(false);

  const select = useCallback(async (args: SelectArgs): Promise<
    { ok: true; selection: CoordinationSelection } | { ok: false; reason: string; members: string[] }
  > => {
    setIsSaving(true);
    try {
      const res = await communityROIApiClient.post<Envelope<CoordinationSelection>>(
        '/api/community-roi/coordination/selections', args,
      );
      return { ok: true, selection: res.data.data };
    } catch (e) {
      const err = e as ApiClientError;
      if (err.status === 409) {
        const body = (err.data ?? {}) as Envelope<unknown>;
        return { ok: false, reason: body.error ?? 'conflict', members: body.members ?? [] };
      }
      throw e;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const deselect = useCallback(async (selectionId: string): Promise<boolean> => {
    setIsSaving(true);
    try {
      await communityROIApiClient.delete(`/api/community-roi/coordination/selections/${encodeURIComponent(selectionId)}`);
      return true;
    } catch (e) {
      // Already coordinated: the members have the message; the row stays.
      if ((e as ApiClientError).status === 409) return false;
      throw e;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { select, deselect, isSaving };
}

/**
 * Seed a day's picks from the generated pairs, then send them.
 * POST .../coordination/selections/seed  then  POST .../coordination/send
 *
 * Two calls rather than one endpoint on purpose: the seed summary is shown
 * BEFORE anything is sent, so an admin sees "42 pairs, 2 skipped because you
 * already overrode them" and can stop.
 */
export function useSendCoordination() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const seed = useCallback(async (weekNumber: number, daySlot: DaySlot): Promise<SeedSummary> => {
    setIsSeeding(true);
    try {
      const res = await communityROIApiClient.post<Envelope<SeedSummary>>(
        '/api/community-roi/coordination/selections/seed', { weekNumber, daySlot },
      );
      return res.data.data;
    } finally {
      setIsSeeding(false);
    }
  }, []);

  const send = useCallback(async (weekNumber: number, daySlot: DaySlot, cap?: number): Promise<SendSummary> => {
    setIsSending(true);
    try {
      const res = await communityROIApiClient.post<Envelope<SendSummary>>(
        '/api/community-roi/coordination/send', { weekNumber, daySlot, ...(cap ? { cap } : {}) },
      );
      return res.data.data;
    } finally {
      setIsSending(false);
    }
  }, []);

  return { seed, send, isSeeding, isSending };
}
