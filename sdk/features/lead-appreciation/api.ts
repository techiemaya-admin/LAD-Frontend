/**
 * Lead Appreciation feature - API functions.
 *
 * All requests flow through the shared apiClient; the Next.js catch-all proxy
 * at /api/[feature]/* forwards 'lead-appreciation' to LAD_backend.
 */
import { apiGet, apiPost } from '../../shared/apiClient';
import type {
  AppreciationSignal,
  AppreciationStatusCount,
  ApproveSignalInput,
  ListSignalsParams,
  RejectSignalInput,
} from './types';

const BASE = '/api/lead-appreciation';

interface Envelope<T> {
  success: boolean;
  data: T;
}

function buildQuery(params?: object): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      search.append(k, String(v));
    }
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

export async function listAppreciationSignals(
  params?: ListSignalsParams,
): Promise<AppreciationSignal[]> {
  const res = await apiGet<Envelope<AppreciationSignal[]>>(
    `${BASE}/signals${buildQuery(params)}`,
  );
  return res.data.data;
}

export async function getAppreciationSignal(
  signalId: string,
): Promise<AppreciationSignal> {
  const res = await apiGet<Envelope<AppreciationSignal>>(
    `${BASE}/signals/${signalId}`,
  );
  return res.data.data;
}

export async function approveAppreciationSignal(
  input: ApproveSignalInput,
): Promise<AppreciationSignal> {
  const res = await apiPost<Envelope<AppreciationSignal>>(
    `${BASE}/signals/${input.signalId}/approve`,
    input.messageText ? { messageText: input.messageText } : {},
  );
  return res.data.data;
}

export async function rejectAppreciationSignal(
  input: RejectSignalInput,
): Promise<AppreciationSignal> {
  const res = await apiPost<Envelope<AppreciationSignal>>(
    `${BASE}/signals/${input.signalId}/reject`,
    input.optOut ? { optOut: true } : {},
  );
  return res.data.data;
}

export async function getAppreciationStats(): Promise<AppreciationStatusCount[]> {
  const res = await apiGet<Envelope<AppreciationStatusCount[]>>(`${BASE}/stats`);
  return res.data.data;
}

export async function runAppreciationScan(): Promise<unknown> {
  const res = await apiPost<Envelope<unknown>>(`${BASE}/scan`, {});
  return res.data.data;
}
