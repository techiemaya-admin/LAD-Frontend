/**
 * Tenant Onboard API Proxy
 *
 * POST /api/tenant/onboard  → LAD_backend /api/admin/tenants/provision
 * GET  /api/tenant/onboard  → LAD_backend /api/admin/tenants/meta
 *
 * Forwards the caller's auth token so the backend can verify the request.
 */
import { NextRequest, NextResponse } from 'next/server';

function getBackendBase(): string {
  return (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:3004'
  ).replace(/\/$/, '');
}

function extractToken(req: NextRequest): string | null {
  // Login sets cookie named 'token' (see /api/auth/login/route.ts)
  // Also check 'access_token' (set by backend directly) and Authorization header
  return (
    req.cookies.get('token')?.value ||
    req.cookies.get('access_token')?.value ||
    req.headers.get('authorization')?.replace('Bearer ', '') ||
    null
  );
}

/** GET — fetch form metadata (feature keys, capabilities, etc.) */
export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const resp = await fetch(`${getBackendBase()}/api/admin/tenants/meta`, {
      method: 'GET',
      headers,
    });

    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.status });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Failed to reach backend', details: e?.message },
      { status: 502 }
    );
  }
}

/** POST — provision a new tenant */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = extractToken(req);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const resp = await fetch(`${getBackendBase()}/api/admin/tenants/provision`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.status });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Failed to reach backend', details: e?.message },
      { status: 502 }
    );
  }
}
