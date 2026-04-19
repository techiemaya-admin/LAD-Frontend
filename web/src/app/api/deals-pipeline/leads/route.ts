import { NextRequest, NextResponse } from 'next/server';

function getBackendBase() {
  return (process.env.BACKEND_INTERNAL_URL || 'http://localhost:3004').replace(/\/$/, '');
}

function getAuthHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token =
    req.cookies.get('token')?.value ||
    req.headers.get('authorization')?.replace('Bearer ', '');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const tenantId = req.headers.get('x-tenant-id');
  if (tenantId) headers['X-Tenant-ID'] = tenantId;
  return headers;
}

/** GET /api/deals-pipeline/leads — list contacts with optional search/pagination */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const qs = searchParams.toString();
    const url = `${getBackendBase()}/api/deals-pipeline/leads${qs ? `?${qs}` : ''}`;
    const resp = await fetch(url, { method: 'GET', headers: getAuthHeaders(req) });
    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.status });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to fetch contacts', details: e?.message }, { status: 500 });
  }
}
