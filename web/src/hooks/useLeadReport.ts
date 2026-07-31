'use client';

/**
 * The CRM lead page's report + accelerator data.
 *
 * Both cards come from one endpoint and one query key: the sequence renders the
 * report step's approval state, so fetching them separately would let the two
 * cards disagree about the same report for a tick.
 *
 * POLLING, AND WHY: `approval_status` changes without this app doing anything.
 * The approver clicks a link in an email or WhatsApp message, which settles the
 * report on the backend directly. There is no event pushed to the browser, so a
 * page sitting on `pending` has to ask. It polls ONLY while pending — an
 * approved or rejected report is terminal and asking again would be pure noise.
 */

import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { LeadReportBundle, ReportViewState } from '@/types/leadReport';

const BASE = '/api/campaigns/lead-reports';

/** How often to re-ask while a decision is outstanding. */
const PENDING_POLL_MS = 15_000;

export class LeadReportError extends Error {
  code?: string;
  status: number;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'LeadReportError';
    this.status = status;
    this.code = code;
  }
}

async function readJson(resp: Response) {
  const body = await resp.json().catch(() => ({} as any));
  if (!resp.ok) {
    throw new LeadReportError(
      body?.error || `Request failed (${resp.status})`,
      resp.status,
      body?.code,
    );
  }
  return body?.data ?? body;
}

export interface UseLeadReportResult {
  bundle: LeadReportBundle | null;
  isLoading: boolean;
  isError: boolean;
  /** The report card's render state, with the trigger's progress folded in. */
  state: ReportViewState;
  /** Set when generation was refused for want of grounding. */
  refusalMessage: string | null;
  advance: () => void;
  isAdvancing: boolean;
  approve: () => void;
  reject: (reason?: string) => void;
  isDeciding: boolean;
  /** The approver settled it elsewhere first; the card has re-fetched. */
  settledElsewhere: boolean;
  actionError: string | null;
}

/**
 * @param leadId the CRM prospect's `core_lead_id` — the id campaign_leads and
 *               campaign_analytics are both keyed by. The Master Agent prospect
 *               id will not resolve.
 */
export function useLeadReport(leadId: string | null | undefined): UseLeadReportResult {
  const qc = useQueryClient();
  const queryKey = useMemo(() => ['lead-report', leadId], [leadId]);

  const [refusalMessage, setRefusalMessage] = useState<string | null>(null);
  const [settledElsewhere, setSettledElsewhere] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const query = useQuery<LeadReportBundle>({
    queryKey,
    queryFn: async () => readJson(await fetch(`${BASE}/by-lead/${leadId}`)) as Promise<LeadReportBundle>,
    enabled: Boolean(leadId),
    staleTime: 15_000,
    // Only while a decision is outstanding — see the note at the top.
    refetchInterval: (q) =>
      q.state.data?.report?.approval_status === 'pending' ? PENDING_POLL_MS : false,
    // The approver may settle it while the tab is in the background.
    refetchOnWindowFocus: true,
  });

  const advanceMutation = useMutation({
    mutationFn: async () => {
      setRefusalMessage(null);
      setActionError(null);
      const resp = await fetch(`${BASE}/by-lead/${leadId}/advance`, { method: 'POST' });
      return readJson(resp);
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey }); },
    onError: (err: unknown) => {
      // A refusal is a state the card renders with a way out, not an error
      // toast. Anything else is a genuine failure and says so.
      if (err instanceof LeadReportError && err.code === 'NEEDS_RESEARCH') {
        setRefusalMessage(err.message);
        return;
      }
      setActionError(err instanceof Error ? err.message : 'Could not generate the report');
    },
  });

  const decisionMutation = useMutation({
    mutationFn: async ({ action, reason }: { action: 'approve' | 'reject'; reason?: string }) => {
      setActionError(null);
      setSettledElsewhere(false);
      const reportId = query.data?.report?.id;
      if (!reportId) throw new LeadReportError('No report to decide on', 400);
      const resp = await fetch(`${BASE}/${reportId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      return readJson(resp);
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey }); },
    onError: (err: unknown) => {
      // 409 means the emailed link won the race. Not a failure — re-fetch and
      // show whichever decision actually landed.
      if (err instanceof LeadReportError && err.code === 'ALREADY_SETTLED') {
        setSettledElsewhere(true);
        void qc.invalidateQueries({ queryKey });
        return;
      }
      setActionError(err instanceof Error ? err.message : 'Could not record the decision');
    },
  });

  const report = query.data?.report ?? null;

  const state: ReportViewState = useMemo(() => {
    if (advanceMutation.isPending) return 'running';
    if (refusalMessage) return 'needs_research';
    if (!report) return 'empty';
    switch (report.approval_status) {
      case 'pending': return 'pending';
      case 'approved': return 'approved';
      case 'rejected': return 'rejected';
      // 'none' = generated with no gate configured. It is releasable and
      // complete, so it renders as a finished report rather than as empty.
      default: return 'none';
    }
  }, [advanceMutation.isPending, refusalMessage, report]);

  const advance = useCallback(() => { advanceMutation.mutate(); }, [advanceMutation]);
  const approve = useCallback(
    () => { decisionMutation.mutate({ action: 'approve' }); },
    [decisionMutation],
  );
  const reject = useCallback(
    (reason?: string) => { decisionMutation.mutate({ action: 'reject', reason }); },
    [decisionMutation],
  );

  return {
    bundle: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    state,
    refusalMessage,
    advance,
    isAdvancing: advanceMutation.isPending,
    approve,
    reject,
    isDeciding: decisionMutation.isPending,
    settledElsewhere,
    actionError,
  };
}
