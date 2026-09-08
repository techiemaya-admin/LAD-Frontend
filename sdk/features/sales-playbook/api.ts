/**
 * Sales Playbook feature — API functions.
 *
 * All requests flow through the shared apiClient; the Next.js catch-all proxy
 * at /api/[feature]/* forwards 'sales-playbook' to LAD_backend. Tenant scoping
 * is applied server-side from the caller's token — never sent from here.
 */
import { apiGet, apiPost, apiDelete } from '../../shared/apiClient';
import type {
  CallRecord,
  ListCallsParams,
  ListCallsResult,
  SavedCallRecord,
} from './types';

const BASE = '/api/sales-playbook';

interface Envelope<T> {
  success: boolean;
  data: T;
}

function buildQuery(params?: ListCallsParams): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      search.append(k, String(v));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const salesPlaybookKeys = {
  all: ['salesPlaybook'] as const,
  calls: () => [...salesPlaybookKeys.all, 'calls'] as const,
  callsList: (params?: ListCallsParams) =>
    [...salesPlaybookKeys.calls(), 'list', params ?? {}] as const,
};

export async function listCalls(params?: ListCallsParams): Promise<ListCallsResult> {
  const res = await apiGet<Envelope<ListCallsResult>>(`${BASE}/calls${buildQuery(params)}`);
  return res.data.data;
}

export async function saveCall(record: CallRecord): Promise<SavedCallRecord> {
  const res = await apiPost<Envelope<SavedCallRecord>>(`${BASE}/calls`, record);
  return res.data.data;
}

export async function deleteCall(id: string): Promise<void> {
  await apiDelete<Envelope<null>>(`${BASE}/calls/${id}`);
}
