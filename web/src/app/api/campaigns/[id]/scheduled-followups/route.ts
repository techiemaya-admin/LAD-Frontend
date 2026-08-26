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

/** GET /api/campaigns/[id]/scheduled-followups - accepted leads + their scheduled follow-ups */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = `${getBackendBase()}/api/campaigns/${id}/scheduled-followups`;
    const resp = await fetch(url, { method: 'GET', headers: getAuthHeaders(req), cache: 'no-store' });
    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.ok ? 200 : resp.status });
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
