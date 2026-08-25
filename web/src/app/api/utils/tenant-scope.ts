/**
 * Tenant scoping for the Next.js API proxy routes.
 *
 * Several proxy routes forward an `x-tenant-id` REQUEST header to a downstream
 * service to say "act on this tenant". That header is client-supplied and
 * unauthenticated, so honouring it for anyone lets any logged-in user read or
 * mutate any other tenant's data just by setting one header — the cross-tenant
 * data-exposure bug fixed for the CRM proxy in PR #947.
 *
 * The rule (identical to #947, matching the backend's `requireSuperAdmin` gate
 * in features/admin/routes/provision.js): `x-tenant-id` may name a DIFFERENT
 * tenant than the caller's token only when the caller is the super admin. The
 * super-admin identity is the JWT `email` claim — which lives inside the SIGNED
 * token and so, unlike the header, cannot be forged by the client. Everyone else
 * is pinned to their own token's tenant, and an attempt to override is ignored
 * and warn-logged.
 */
import { NextRequest } from 'next/server';

/**
 * Super-admin identity. Kept in sync with the backend's SUPER_ADMIN_EMAIL and
 * the other frontend gates (admin/monitor/layout.tsx, swagger, tenant/manage).
 */
export const SUPER_ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || 'admin@techiemaya.com'
).toLowerCase();

export interface JwtClaims {
  tenantId: string | null;
  email: string | null;
}

/**
 * Base64url-decode a JWT payload and pull the tenant + email claims. No
 * signature verification — that is the downstream service's job; here we only
 * need the caller's own claims to decide what they are allowed to ask for.
 */
export function decodeJwtClaims(token: string): JwtClaims {
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

/** The caller's claims, from the Authorization header first, then the auth cookie. */
export function callerClaims(req: NextRequest): JwtClaims {
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

/** Is this caller the super admin? (Signed email claim, case/space-insensitive.) */
export function isSuperAdmin(claims: JwtClaims): boolean {
  return !!claims.email && claims.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL;
}

export interface ResolveTenantOptions {
  /** Tag for the warn line emitted when a non-super-admin's header is ignored. */
  logLabel?: string;
  /**
   * Honour the dev-only DEV_TENANT_OVERRIDE escape hatch (gated on
   * NODE_ENV==='development'). Defaults to true; matches the Master-Agent proxy.
   */
  allowDevOverride?: boolean;
}

/**
 * The tenant this request is authorised to act on.
 *
 * Resolution order:
 *   1. DEV_TENANT_OVERRIDE (development only, opt-in) — local browsing hatch.
 *   2. If `x-tenant-id` names a tenant OTHER than the caller's token tenant,
 *      honour it only for the super admin; otherwise ignore it, warn, and fall
 *      back to the token tenant. This is the attack path being closed.
 *   3. Otherwise the caller's own token tenant (header absent or already equal).
 *
 * Returns null when the caller has no resolvable tenant (unauthenticated) and no
 * override applies — callers should treat that as 401.
 */
export function resolveAuthorizedTenantId(
  req: NextRequest,
  opts: ResolveTenantOptions = {},
): string | null {
  const { logLabel = 'tenant-scope', allowDevOverride = true } = opts;

  if (
    allowDevOverride &&
    process.env.NODE_ENV === 'development' &&
    process.env.DEV_TENANT_OVERRIDE
  ) {
    return process.env.DEV_TENANT_OVERRIDE;
  }

  const claims = callerClaims(req);
  const jwtTenant = claims.tenantId;

  const headerTenant = req.headers.get('x-tenant-id');
  if (headerTenant && headerTenant !== jwtTenant) {
    if (isSuperAdmin(claims)) return headerTenant;
    // Not authorised to switch tenants — ignore the header, fall back to the
    // token, and leave a trail. This branch is the cross-tenant attack path.
    console.warn(`[${logLabel}] ignoring x-tenant-id from non-super-admin caller`, {
      requested: headerTenant,
      jwtTenant,
      hasEmail: !!claims.email,
    });
    return jwtTenant;
  }

  // Header absent or already equal to the token's tenant: use the token.
  return jwtTenant;
}
