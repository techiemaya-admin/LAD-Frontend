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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const env = searchParams.get('environment') || 'develop';
    const token = extractToken(req);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const resp = await fetch(
      `${getBackendBase()}/api/admin/tenants/${params.id}?environment=${env}`,
      { method: 'GET', headers }
    );
    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.status });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to reach backend', details: e?.message }, { status: 502 });
  }
}
