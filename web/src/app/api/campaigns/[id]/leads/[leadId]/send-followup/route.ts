import { NextRequest, NextResponse } from 'next/server';

function getBackendBase() {
  return (process.env.BACKEND_INTERNAL_URL || 'https://lad-backend-develop-160078175457.us-central1.run.app').replace(/\/$/, '');
}
function getAuthHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = req.cookies.get('token')?.value || req.headers.get('authorization')?.replace('Bearer ', '');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/** POST /api/campaigns/[id]/leads/[leadId]/send-followup */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  try {
    const { id, leadId } = await params;
    const body = await req.json().catch(() => ({}));
    const url = `${getBackendBase()}/api/campaigns/${id}/leads/${leadId}/send-followup`;
    const resp = await fetch(url, { method: 'POST', headers: getAuthHeaders(req), body: JSON.stringify(body) });
    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.ok ? 200 : resp.status });
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
