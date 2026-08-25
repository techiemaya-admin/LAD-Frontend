import { NextRequest, NextResponse } from 'next/server';

function getBackendBase() {
  return (process.env.BACKEND_INTERNAL_URL || '').replace(/\/$/, '');
}
function getAuthHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = req.cookies.get('token')?.value || req.headers.get('authorization')?.replace('Bearer ', '');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * GET /api/campaigns/[id]/followup-settings
 * Effective post-acceptance cadence for this campaign + where it came from
 * ('campaign' | 'tenant' | 'default').
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = `${getBackendBase()}/api/campaigns/${id}/followup-settings`;
    const resp = await fetch(url, { method: 'GET', headers: getAuthHeaders(req), cache: 'no-store' });
    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.ok ? 200 : resp.status });
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}

/**
 * PUT /api/campaigns/[id]/followup-settings
 * Body: { touches: [...] } to override, or { inherit: true } to fall back to the
 * tenant cadence. Affects FUTURE acceptances only - already-pending rows keep the
 * template stamped when they were scheduled.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const url = `${getBackendBase()}/api/campaigns/${id}/followup-settings`;
    const resp = await fetch(url, {
      method: 'PUT',
      headers: getAuthHeaders(req),
      body: JSON.stringify(body),
    });
    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.ok ? 200 : resp.status });
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
