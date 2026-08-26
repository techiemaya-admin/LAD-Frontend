/**
 * Tenant Form Metadata Proxy
 * GET /api/tenant/manage/meta  →  LAD_backend GET /api/admin/tenants/meta
 *
 * Returns the canonical lists of tenant features / feature flags / owner
 * capabilities - used by the onboard form so the available options stay in
 * sync with provision.js as new keys are added there.
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

export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const resp = await fetch(`${getBackendBase()}/api/admin/tenants/meta`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });
    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.status });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to reach backend', details: e?.message },
      { status: 502 }
    );
  }
}
