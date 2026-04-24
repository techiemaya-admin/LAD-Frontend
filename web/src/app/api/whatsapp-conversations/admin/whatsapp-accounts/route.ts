/**
 * Admin WhatsApp Accounts Proxy
 * GET  /api/whatsapp-conversations/admin/whatsapp-accounts
 * POST /api/whatsapp-conversations/admin/whatsapp-accounts
 *
 * Routing strategy for GET:
 *   - Call BOTH the Node backend (social_whatsapp_accounts table) AND the Python BNI
 *     service in parallel, then merge the results (deduplicated by slug).
 *   - This ensures tenants whose accounts live in lad_dev.social_whatsapp_accounts
 *     (e.g. Techiemaya) as well as tenants managed by the Python service (BNI, TPF)
 *     all see their accounts correctly.
 *
 * Routing strategy for POST (create):
 *   - Try Python BNI service first (full onboarding flow).
 *   - Fall back to Node backend if BNI returns 4xx/5xx.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppServiceUrl } from '../../utils/python-proxy';
import { getBackendUrl } from '../../../utils/backend';

interface WaAccount {
  id: string;
  slug: string;
  display_name?: string;
  tenant_id?: string;
  status?: string;
  [key: string]: unknown;
}

/** Pull accounts from the Node backend (lad_dev.social_whatsapp_accounts). */
async function fetchNodeAccounts(req: NextRequest): Promise<WaAccount[]> {
  const backendUrl = getBackendUrl();
  const targetUrl = `${backendUrl}/api/whatsapp-conversations/admin/whatsapp-accounts`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const authHeader = req.headers.get('authorization');
  if (authHeader) headers['Authorization'] = authHeader;
  const tenantId = req.headers.get('x-tenant-id');
  if (tenantId) headers['X-Tenant-ID'] = tenantId;

  try {
    const resp = await fetch(targetUrl, { method: 'GET', headers });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (data?.success && Array.isArray(data.data)) return data.data;
    if (Array.isArray(data?.accounts)) return data.accounts;
    if (Array.isArray(data)) return data;
    return [];
  } catch {
    return [];
  }
}

/** Pull accounts from the Python BNI conversation service.
 *  Uses a direct fetch (not proxyToPythonService) so ECONNREFUSED is swallowed
 *  silently — Python is optional; Node.js accounts are the primary source.
 */
async function fetchPythonAccounts(req: NextRequest, tenantId: string | null): Promise<WaAccount[]> {
  const wabaBase = getWhatsAppServiceUrl();
  if (!wabaBase) return [];

  try {
    const targetUrl = new URL('/admin/whatsapp-accounts', wabaBase);
    if (tenantId) targetUrl.searchParams.set('tenant_id', tenantId);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const auth = req.headers.get('authorization');
    if (auth) headers['Authorization'] = auth;
    const tid = req.headers.get('x-tenant-id');
    if (tid) headers['X-Tenant-ID'] = tid;

    const resp = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(5000), // don't wait more than 5s for an optional source
    });

    if (!resp.ok) return [];
    const data = await resp.json();
    if (data?.success && Array.isArray(data.data)) return data.data;
    if (Array.isArray(data?.accounts)) return data.accounts;
    if (Array.isArray(data)) return data;
    return [];
  } catch {
    // Python service is optional — silently return empty when it's down
    return [];
  }
}

/** Merge two account lists, deduplicating by slug (Node backend takes precedence). */
function mergeAccounts(nodeAccounts: WaAccount[], pythonAccounts: WaAccount[]): WaAccount[] {
  const seen = new Set<string>();
  const merged: WaAccount[] = [];

  for (const acc of nodeAccounts) {
    const key = acc.slug || acc.id;
    if (key && !seen.has(key)) {
      seen.add(key);
      merged.push(acc);
    }
  }
  for (const acc of pythonAccounts) {
    const key = acc.slug || acc.id;
    if (key && !seen.has(key)) {
      seen.add(key);
      merged.push(acc);
    }
  }
  return merged;
}

async function callNodeBackend(
  req: NextRequest,
  method: string,
  body?: unknown,
): Promise<NextResponse> {
  const backendUrl = getBackendUrl();
  const targetUrl = `${backendUrl}/api/whatsapp-conversations/admin/whatsapp-accounts`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const authHeader = req.headers.get('authorization');
  if (authHeader) headers['Authorization'] = authHeader;
  const tenantId = req.headers.get('x-tenant-id');
  if (tenantId) headers['X-Tenant-ID'] = tenantId;

  const fetchOptions: RequestInit = { method, headers };
  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const resp = await fetch(targetUrl, fetchOptions);
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch {
    return NextResponse.json({ success: true, data: [], accounts: [] }, { status: 200 });
  }
}

export async function GET(req: NextRequest) {
  // Resolve the current tenant ID from the request
  const tenantId = req.headers.get('x-tenant-id') ?? null;

  // Fetch from both sources in parallel to minimise latency
  const [nodeAccounts, pythonAccountsRaw] = await Promise.all([
    fetchNodeAccounts(req),
    fetchPythonAccounts(req, tenantId),
  ]);

  // Secondary client-side guard: only keep accounts that explicitly belong to
  // this tenant. Accounts with no tenant_id are NOT included (they are cross-
  // tenant admin records and must never be surfaced to individual tenants).
  const pythonAccounts = tenantId
    ? pythonAccountsRaw.filter((a) => a.tenant_id === tenantId)
    : [];

  const merged = mergeAccounts(nodeAccounts, pythonAccounts);

  return NextResponse.json(
    { success: true, data: merged, accounts: merged },
    { status: 200 },
  );
}

export async function POST(req: NextRequest) {
  // Read the body once; we may need to re-send it to the Node fallback.
  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch { /* empty body */ }

  // Try Python BNI service first (full onboarding flow) using a direct fetch
  // so ECONNREFUSED is swallowed silently without proxy error logs.
  const wabaBase = getWhatsAppServiceUrl();
  if (wabaBase) {
    try {
      const targetUrl = new URL('/admin/whatsapp-accounts', wabaBase);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const auth = req.headers.get('authorization');
      if (auth) headers['Authorization'] = auth;
      const tid = req.headers.get('x-tenant-id');
      if (tid) headers['X-Tenant-ID'] = tid;

      const bniResp = await fetch(targetUrl.toString(), {
        method: 'POST',
        headers,
        body: parsedBody !== undefined ? JSON.stringify(parsedBody) : undefined,
        signal: AbortSignal.timeout(10000),
      });

      if (bniResp.ok) {
        const data = await bniResp.json();
        return NextResponse.json(data, { status: bniResp.status });
      }
      // BNI returned 4xx/5xx — fall through to Node fallback below
    } catch {
      // Python service down — fall through to Node fallback silently
    }
  }

  // Fallback: Node.js backend
  return callNodeBackend(req, 'POST', parsedBody);
}
