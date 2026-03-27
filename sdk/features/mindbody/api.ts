/**
 * MindBody Feature - API Functions
 *
 * All HTTP API calls for the MindBody integration.
 * Uses fetchWithTenant (passed as fetchFn) for tenant-aware requests,
 * consistent with the IntegrationsSettings component pattern.
 */
import type { MindBodyStatus, MindBodyConnectPayload, MindBodyClass } from './types';

const BASE = '/api/social-integration/mindbody';

/**
 * Get the current MindBody connection status for the tenant.
 */
export async function getMindBodyStatus(
  fetchFn: (url: string, init?: RequestInit) => Promise<Response>
): Promise<MindBodyStatus> {
  const res = await fetchFn(`${BASE}/status`, { method: 'POST' });
  return res.json();
}

/**
 * Connect MindBody using site credentials.
 */
export async function connectMindBody(
  fetchFn: (url: string, init?: RequestInit) => Promise<Response>,
  payload: MindBodyConnectPayload
): Promise<MindBodyStatus> {
  const res = await fetchFn(`${BASE}/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

/**
 * Disconnect MindBody for the tenant.
 */
export async function disconnectMindBody(
  fetchFn: (url: string, init?: RequestInit) => Promise<Response>
): Promise<{ success: boolean }> {
  const res = await fetchFn(`${BASE}/disconnect`, { method: 'POST' });
  return res.json();
}

/**
 * Fetch available classes from the connected MindBody site.
 */
export async function getAvailableClasses(
  fetchFn: (url: string, init?: RequestInit) => Promise<Response>
): Promise<MindBodyClass[]> {
  const res = await fetchFn(`${BASE}/classes`);
  const data = await res.json();
  return data.classes || [];
}
