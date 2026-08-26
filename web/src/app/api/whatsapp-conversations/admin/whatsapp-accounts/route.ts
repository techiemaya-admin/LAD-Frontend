/**
 * Admin WhatsApp Accounts Proxy
 * GET  /api/whatsapp-conversations/admin/whatsapp-accounts
 * POST /api/whatsapp-conversations/admin/whatsapp-accounts
 *
 * Routing strategy for GET:
 *   - Call BOTH the Node backend (social_whatsapp_accounts table) AND the Python BNI
 *     service in parallel, then merge the results (deduplicated by slug).
 *   - This ensures tenants whose accounts live in social_whatsapp_accounts
 *     (e.g. Techiemaya) as well as tenants managed by the Python service (BNI, TPF)
 *     all see their accounts correctly.
 *
 * Routing strategy for POST (create):
 *   - Try Python BNI service first (full onboarding flow).
 *   - Fall back to Node backend if BNI returns 4xx/5xx.
 *
 * Tenant scoping: the tenant is resolved via utils/tenant-scope, so a client
 * x-tenant-id (or the ?tenant_id= query param) that names a DIFFERENT tenant
 * than the caller's token is honoured only for the super admin (admin tooling).
 * Ordinary callers are pinned to their own tenant — this used to trust the raw
 * header/query param, letting any user list or create another tenant's accounts.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppServiceUrl } from '../../utils/python-proxy';
import { getBackendUrl } from '../../../utils/backend';
import {
  resolveAuthorizedTenantId,
  callerClaims,
  isSuperAdmin,
} from '../../../utils/tenant-scope';

interface WaAccount {
  id: string;
  slug: string;
  display_name?: string;
  tenant_id?: string;
  status?: string;
  [key: string]: unknown;
}

/** Pull accounts from the Node backend (social_whatsapp_accounts). */
async function fetchNodeAccounts(req: NextRequest, tenantId: string | null): Promise<WaAccount[]> {
  const backendUrl = getBackendUrl();
  const targetUrl = `${backendUrl}/api/whatsapp-conversations/admin/whatsapp-accounts`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const authHeader = req.headers.get('authorization');
  if (authHeader) headers['Authorization'] = authHeader;
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
 *  silently - Python is optional; Node.js accounts are the primary source.
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
    if (tenantId) headers['X-Tenant-ID'] = tenantId;

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
    // Python service is optional - silently return empty when it's down
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

export async function GET(req: NextRequest) {
  // Resolve the tenant this caller is AUTHORISED to act on. x-tenant-id names a
  // different tenant only for the super admin (utils/tenant-scope). We keep the
  // ?tenant_id= query-param affordance for direct admin tooling (curl), but only
  // for the super admin too — for anyone else it was a second way to override the
  // tenant and read another workspace's accounts.
  const url = new URL(req.url);
  let tenantId = resolveAuthorizedTenantId(req, { logLabel: 'admin-wa-accounts' });
  if (isSuperAdmin(callerClaims(req)) && !req.headers.get('x-tenant-id')) {
    const queryTenant = url.searchParams.get('tenant_id');
    if (queryTenant) tenantId = queryTenant;
  }

  // Skip the Python call entirely when we have no tenant context - there is no
  // point making a round-trip that will just return [] and log a warning.
  const [nodeAccounts, pythonAccountsRaw] = await Promise.all([
    fetchNodeAccounts(req, tenantId),
    tenantId ? fetchPythonAccounts(req, tenantId) : Promise.resolve([]),
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
  // Create flow is owned exclusively by the Python WABA service - the Node
  // backend has no POST handler for /admin/whatsapp-accounts and its catch-all
  // returns a misleading 404 ("Personal WhatsApp endpoints must be explicitly
  // defined."). Surface real errors from Python instead of swallowing them.
  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch { /* empty body */ }

  const wabaBase = getWhatsAppServiceUrl();

  // Guard against unconfigured / placeholder / localhost URLs in deployed envs.
  const isUsable =
    !!wabaBase &&
    !wabaBase.includes('REPLACE_PROJECT_NUMBER') &&
    !(process.env.NODE_ENV === 'production' && wabaBase.includes('localhost'));

  if (!isUsable) {
    return NextResponse.json(
      {
        success: false,
        error: 'WABA service not configured',
        message:
          'NEXT_PUBLIC_WHATSAPP_API_URL / WABA_SERVICE_URL is missing or points at a placeholder. Set it on the lad-frontend Cloud Run service.',
      },
      { status: 503 },
    );
  }

  const targetUrl = new URL('/admin/whatsapp-accounts', wabaBase);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const auth = req.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;
  // Create under the tenant the caller is authorised for — not a raw client header.
  const tid = resolveAuthorizedTenantId(req, { logLabel: 'admin-wa-accounts' });
  if (tid) headers['X-Tenant-ID'] = tid;

  let bniResp: Response;
  try {
    bniResp = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers,
      body: parsedBody !== undefined ? JSON.stringify(parsedBody) : undefined,
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'WABA service unreachable',
        message: err instanceof Error ? err.message : String(err),
        target: targetUrl.toString(),
      },
      { status: 502 },
    );
  }

  // Pass Python's status and body through unchanged so 4xx validation errors
  // and 5xx server errors surface to the caller with their real meaning.
  const rawBody = await bniResp.text();
  let parsed: unknown;
  try {
    parsed = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    parsed = { success: bniResp.ok, error: 'Non-JSON response from WABA service', body: rawBody };
  }
  return NextResponse.json(parsed, { status: bniResp.status });
}
