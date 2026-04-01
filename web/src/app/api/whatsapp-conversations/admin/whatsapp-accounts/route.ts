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
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';
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

/** Pull accounts from the Python BNI conversation service. */
async function fetchPythonAccounts(req: NextRequest): Promise<WaAccount[]> {
  try {
    const url = new URL(req.url);
    url.searchParams.set('channel', 'waba');
    const wabaReq = new NextRequest(url, req);
    const resp = await proxyToPythonService(wabaReq, getWhatsAppServiceUrl(), '/admin/whatsapp-accounts');
    if (resp.status >= 400) return [];
    const data = await resp.json();
    if (data?.success && Array.isArray(data.data)) return data.data;
    if (Array.isArray(data?.accounts)) return data.accounts;
    if (Array.isArray(data)) return data;
    return [];
  } catch {
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
    fetchPythonAccounts(req),
  ]);

  // Filter Python accounts to the current tenant only (the Python service may
  // return accounts for ALL tenants without server-side scoping).
  const pythonAccounts = tenantId
    ? pythonAccountsRaw.filter((a) => !a.tenant_id || a.tenant_id === tenantId)
    : pythonAccountsRaw;

  const merged = mergeAccounts(nodeAccounts, pythonAccounts);

  return NextResponse.json(
    { success: true, data: merged, accounts: merged },
    { status: 200 },
  );
}

export async function POST(req: NextRequest) {
  // Read the body once before handing it to the BNI proxy, so we can re-send
  // it to the Node backend fallback if BNI fails (streams can only be read once).
  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch { /* empty body */ }

  try {
    const bodyString = parsedBody !== undefined ? JSON.stringify(parsedBody) : undefined;
    const url = new URL(req.url);
    url.searchParams.set('channel', 'waba');
    const clonedReq = new NextRequest(url, {
      method: req.method,
      headers: req.headers,
      body: bodyString,
    });

    const bniResponse = await proxyToPythonService(clonedReq, getWhatsAppServiceUrl(), '/admin/whatsapp-accounts');

    // Fall back to Node backend on server errors or method-not-allowed
    if (bniResponse.status >= 400) {
      return callNodeBackend(req, 'POST', parsedBody);
    }

    return bniResponse;
  } catch (err) {
    console.error('[admin/whatsapp-accounts POST] Python proxy error, falling back to Node:', err);
    return callNodeBackend(req, 'POST', parsedBody);
  }
}
