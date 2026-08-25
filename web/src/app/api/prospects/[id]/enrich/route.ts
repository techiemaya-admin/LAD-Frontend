/**
 * POST /api/prospects/[id]/enrich - Option C on-open enrichment trigger.
 *
 * Resolves tenant_id (DEV_TENANT_OVERRIDE / JWT / cookie - same as the
 * Master-Agent proxy) and forwards to LAD_backend's service-token-guarded
 * enrich endpoint, which does the Unipile profile fetch + emits the
 * enrichment.profile_enriched event to the Master Agent. Best-effort.
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Same super-admin identity as the shared master-agent-proxy and the backend's
// requireSuperAdmin: the SIGNED `email` claim, which the client cannot forge.
const SUPER_ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || 'admin@techiemaya.com'
).toLowerCase();

function claimsFromJwt(token: string): { tenantId: string | null; email: string | null } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { tenantId: null, email: null };
    const p = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return {
      tenantId: p.tenantId || p.tenant_id || p.organizationId || p.orgId || null,
      email: typeof p.email === 'string' ? p.email : null,
    };
  } catch {
    return { tenantId: null, email: null };
  }
}

function resolveTenantId(req: NextRequest): string | null {
  if (process.env.NODE_ENV === 'development' && process.env.DEV_TENANT_OVERRIDE) {
    return process.env.DEV_TENANT_OVERRIDE;
  }
  // Read the caller's claims (Authorization then cookie).
  let claims = { tenantId: null as string | null, email: null as string | null };
  const auth = req.headers.get('authorization');
  if (auth) claims = claimsFromJwt(auth.replace(/^Bearer\s+/i, ''));
  if (!claims.tenantId && !claims.email) {
    const cookie = req.cookies.get('access_token')?.value || req.cookies.get('token')?.value;
    if (cookie) claims = claimsFromJwt(cookie);
  }

  // Same gate as the read path (PR #947): x-tenant-id may name a different
  // tenant only for a super-admin. Without it, an ordinary user could trigger
  // enrichment against another tenant's prospect by forging the header.
  const header = req.headers.get('x-tenant-id');
  if (header && header !== claims.tenantId) {
    const isSuperAdmin =
      !!claims.email && claims.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL;
    if (isSuperAdmin) return header;
    console.warn('[prospects/enrich] ignoring x-tenant-id from non-super-admin caller', {
      requested: header,
      jwtTenant: claims.tenantId,
    });
    return claims.tenantId;
  }
  return claims.tenantId;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const tenantId = resolveTenantId(req);
  const token = process.env.LAD_MASTER_AGENT_SERVICE_TOKEN;
  const backend = (process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_URL || '').replace(/\/$/, '');

  if (!tenantId) return NextResponse.json({ error: 'missing_tenant' }, { status: 401 });
  if (!token) return NextResponse.json({ error: 'service_token_missing' }, { status: 503 });
  if (!backend) return NextResponse.json({ error: 'backend_url_missing' }, { status: 503 });

  try {
    const resp = await fetch(
      `${backend}/api/ai-icp-assistant/prospects/${encodeURIComponent(id)}/enrich-profile`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Service-Token': token },
        body: JSON.stringify({ tenant_id: tenantId }),
      },
    );
    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.status });
  } catch (e) {
    return NextResponse.json(
      { error: 'enrich_unreachable', detail: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
