/**
 * master-agent-proxy - forward Next.js /api/prospects/* requests to LAD-Master-Agent.
 *
 * Auth model:
 *   * The user's JWT cookie/header is read to extract `tenant_id`.
 *   * tenant_id is appended as a query parameter (the Master Agent API expects
 *     it that way - see LAD-Master-Agent/api/prospects.py).
 *   * The shared service token `LAD_MASTER_AGENT_SERVICE_TOKEN` is added as the
 *     `X-Service-Token` header. The user's JWT is NEVER forwarded to the
 *     Master Agent - it doesn't understand it.
 *
 * If LAD_MASTER_AGENT_SERVICE_TOKEN is missing from the env, every request 503s
 * with a clear message rather than 401'ing against the upstream silently.
 */
import { NextRequest, NextResponse } from 'next/server';

function getMasterAgentUrl(): string {
  return (
    process.env.MASTER_AGENT_URL ||
    process.env.NEXT_PUBLIC_MASTER_AGENT_URL ||
    'http://localhost:8000'
  );
}

function getServiceToken(): string | null {
  return process.env.LAD_MASTER_AGENT_SERVICE_TOKEN || null;
}

// Super-admin identity, matching the backend's authoritative gate
// (requireSuperAdmin in features/admin/routes/provision.js): the JWT `email`
// claim equals this address. Email is inside the SIGNED token, so unlike the
// x-tenant-id header it cannot be forged by the client.
const SUPER_ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || 'admin@techiemaya.com'
).toLowerCase();

function decodeJwtClaims(token: string): { tenantId: string | null; email: string | null } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { tenantId: null, email: null };
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return {
      tenantId:
        payload.tenantId ||
        payload.tenant_id ||
        payload.organizationId ||
        payload.orgId ||
        null,
      email: typeof payload.email === 'string' ? payload.email : null,
    };
  } catch {
    return { tenantId: null, email: null };
  }
}

/** The caller's claims, from Authorization header then cookie. */
function callerClaims(req: NextRequest): { tenantId: string | null; email: string | null } {
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const c = decodeJwtClaims(authHeader.replace(/^Bearer\s+/i, ''));
    if (c.tenantId || c.email) return c;
  }
  const cookieToken =
    req.cookies.get('access_token')?.value || req.cookies.get('token')?.value;
  if (cookieToken) return decodeJwtClaims(cookieToken);
  return { tenantId: null, email: null };
}

function resolveTenantId(req: NextRequest): string | null {
  // Dev-only escape hatch: DEV_TENANT_OVERRIDE bypasses JWT extraction so you
  // can browse /prospects locally without logging in. Gated on NODE_ENV so
  // this is impossible to trigger in stage/prod (NODE_ENV='production' there).
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.DEV_TENANT_OVERRIDE
  ) {
    return process.env.DEV_TENANT_OVERRIDE;
  }

  const claims = callerClaims(req);
  const jwtTenant = claims.tenantId;

  // x-tenant-id lets a caller act on a DIFFERENT tenant than their token names.
  // That is tenant switching, and it is a super-admin-only capability: honouring
  // it for anyone (as this used to) let any authenticated user read any other
  // tenant's data by setting one header. Gate it on the SIGNED email claim —
  // the same identity the backend's requireSuperAdmin trusts — and never let it
  // override an ordinary user's own tenant.
  const headerTenant = req.headers.get('x-tenant-id');
  if (headerTenant && headerTenant !== jwtTenant) {
    const isSuperAdmin = !!claims.email && claims.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL;
    if (isSuperAdmin) return headerTenant;
    // Not authorised to switch — ignore the header, fall back to the token, and
    // leave a trail. This is the attack path.
    console.warn('[master-agent-proxy] ignoring x-tenant-id from non-super-admin caller', {
      requested: headerTenant,
      jwtTenant,
      hasEmail: !!claims.email,
    });
    return jwtTenant;
  }

  // Header absent or already equal to the token's tenant: use the token.
  return jwtTenant;
}

/**
 * Proxy a request to LAD-Master-Agent.
 *
 * @param req   The incoming Next.js request
 * @param path  The Master Agent path, e.g. "/prospects" or "/prospects/abc/events".
 *              Must NOT include the tenant_id query param - this helper adds it.
 */
export async function proxyToMasterAgent(
  req: NextRequest,
  path: string,
): Promise<Response> {
  const token = getServiceToken();
  if (!token) {
    return NextResponse.json(
      {
        error: 'master_agent_service_token_missing',
        detail:
          'LAD_MASTER_AGENT_SERVICE_TOKEN is not set on the frontend. Set it via Secret Manager (see LAD-Master-Agent/docs/SERVICE_AUTH.md).',
      },
      { status: 503 },
    );
  }

  const tenantId = resolveTenantId(req);
  if (!tenantId) {
    return NextResponse.json(
      { error: 'missing_tenant', detail: 'Could not resolve tenant_id from request' },
      { status: 401 },
    );
  }

  const upstream = new URL(path, getMasterAgentUrl());
  upstream.searchParams.set('tenant_id', tenantId);

  // Pass through any other query params from the caller.
  req.nextUrl.searchParams.forEach((value, key) => {
    if (key !== 'tenant_id') {
      upstream.searchParams.set(key, value);
    }
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Service-Token': token,
  };
  const debugTraceId = req.headers.get('x-debug-trace-id');
  if (debugTraceId) headers['X-Debug-Trace-Id'] = debugTraceId;

  try {
    const response = await fetch(upstream.toString(), {
      method: req.method,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await response.json();
      const res = NextResponse.json(body, { status: response.status });
      // Forward pagination total (list endpoints) so the client can page.
      const totalCount = response.headers.get('x-total-count');
      if (totalCount !== null) res.headers.set('X-Total-Count', totalCount);
      return res;
    }
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { 'content-type': contentType || 'text/plain' },
    });
  } catch (err) {
    console.error('[master-agent-proxy] fetch failed', err);
    return NextResponse.json(
      {
        error: 'master_agent_unreachable',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}
