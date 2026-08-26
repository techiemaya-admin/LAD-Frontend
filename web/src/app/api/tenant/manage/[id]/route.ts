/**
 * Tenant Detail API Proxy
 * GET /api/tenant/manage/:id?environment=develop  →  LAD_backend GET /api/admin/tenants/:id
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
  return (
    req.cookies.get('token')?.value ||
    req.cookies.get('access_token')?.value ||
    req.headers.get('authorization')?.replace('Bearer ', '') ||
    null
  );
}

// Guard against a malformed/undefined id (e.g. a page mounting before its tenant
// id hydrates → `/api/tenant/manage/undefined`). Forwarding "undefined" makes the
// backend raise a uuid 500; reject it here with a clean 400 instead.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Next.js 15+: dynamic-route `params` is now a Promise that must be awaited.
// Before that, `params.id` returned undefined and the proxy was forwarding
// "undefined" to the backend (or hitting the UUID guard with the literal
// string), producing the "Invalid tenant id: undefined" 400 in the dashboard.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id || '')) {
    return NextResponse.json(
      { success: false, error: `Invalid tenant id: ${JSON.stringify(id)}` },
      { status: 400 }
    );
  }
  try {
    const { searchParams } = new URL(req.url);
    const env = searchParams.get('environment') || 'develop';
    const token = extractToken(req);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const resp = await fetch(
      `${getBackendBase()}/api/admin/tenants/${id}?environment=${env}`,
      { method: 'GET', headers }
    );
    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.status });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to reach backend', details: e?.message }, { status: 502 });
  }
}
