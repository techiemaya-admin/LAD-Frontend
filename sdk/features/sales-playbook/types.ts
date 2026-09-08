/**
 * Sales Playbook feature — types.
 *
 * A call record is a flat, fixed-shape row: the same field names in the same
 * order on every call, so a record written today reads the same as one written
 * six months ago. Field order lives in the web layer's script module; this file
 * only describes the wire shape.
 */

export type LeadScore = 'Hot' | 'Warm' | 'Cold';

/** Answers, scores and costing for one discovery call. */
export interface CallRecord {
  id?: string;
  /** Header */
  date?: string;
  prospectName?: string;
  company?: string;
  industry?: string;
  source?: string;
  callLength?: string;
  othersOnCall?: string;
  /** Phase answers and per-phase scores are addressed by key (q1…q20, painScore…). */
  [field: string]: string | undefined;
}

export interface SavedCallRecord extends CallRecord {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  createdByName?: string;
}

export interface ListCallsParams {
  limit?: number;
  offset?: number;
  search?: string;
  leadScore?: LeadScore;
}

export interface ListCallsResult {
  items: SavedCallRecord[];
  total: number;
}
