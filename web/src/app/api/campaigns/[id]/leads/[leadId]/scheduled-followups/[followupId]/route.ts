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

/** DELETE /api/campaigns/[id]/leads/[leadId]/scheduled-followups/[followupId] - remove a pending follow-up */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string; followupId: string }> }
) {
  try {
    const { id, leadId, followupId } = await params;
    const url = `${getBackendBase()}/api/campaigns/${id}/leads/${leadId}/scheduled-followups/${followupId}`;
    const resp = await fetch(url, { method: 'DELETE', headers: getAuthHeaders(req) });
    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.ok ? 200 : resp.status });
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
