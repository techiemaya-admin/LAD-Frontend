import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * /api/settings/business-hours - proxy to the backend's core settings routes.
 *
 * apiClient always calls `${window.location.origin}/api/...` from the browser,
 * so every SDK path needs a matching Next route handler here. Without this file
 * Next answers 404 and the Business Hours modal cannot save.
 */

// Confirmed live (QA loop, 2026-08-07): a cookied request to this route was
// routed to the [feature]/[...path] catch-all instead of this file - 404
// "Feature not found" - while an identical request WITHOUT cookies correctly
// reached this handler (401 "Access token required"). Two other routes were
// compared to isolate the cause: /api/auth/me (a static path, but reads
// cookies DIRECTLY in the handler body) and personal-whatsapp/[...path] (a
// dynamic path segment, cookies read via a helper like this file) both work
// correctly. This route is the only one that is BOTH a fully static path AND
// reads cookies only through an indirect helper (authHeaders below) - the one
// combination where Next's static/dynamic route analysis apparently fails to
// detect the cookie dependency and the route can be resolved as if it were
// static, misrouting cookie-bearing requests. force-dynamic is the framework's
// own escape hatch for exactly this ambiguity - already used elsewhere in this
// codebase for the same reason.
export const dynamic = 'force-dynamic';

function getBackendBase() {
  const backendInternal = process.env.BACKEND_INTERNAL_URL || '';
  return backendInternal.replace(/\/$/, '');
}

function authHeaders(req: NextRequest): Record<string, string> {
  // Matches the convention in api/personal-whatsapp/[...path]/route.ts - the
  // login flow sets 'token', not 'access_token'; checking only access_token
  // 401'd every request for a normal logged-in session (confirmed live: this
  // route deployed and immediately 401'd on a real session whose cookie is
  // named 'token').
  const token =
    req.cookies.get('access_token')?.value ||
    req.cookies.get('token')?.value ||
    req.headers.get('authorization')?.replace('Bearer ', '');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function GET(req: NextRequest) {
  try {
    const resp = await fetch(`${getBackendBase()}/api/settings/business-hours`, {
      method: 'GET',
      headers: authHeaders(req),
      cache: 'no-store',
    });
    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.status });
  } catch (e: any) {
    logger.error('[/api/settings/business-hours] GET Error', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const resp = await fetch(`${getBackendBase()}/api/settings/business-hours`, {
      method: 'PATCH',
      headers: authHeaders(req),
      body: JSON.stringify(body),
    });
    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.status });
  } catch (e: any) {
    logger.error('[/api/settings/business-hours] PATCH Error', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
