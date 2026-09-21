import { NextRequest, NextResponse } from 'next/server';

function getBackendBase() {
  return (process.env.BACKEND_INTERNAL_URL || '').replace(/\/$/, '');
}
function getAuthHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = req.headers.get('authorization')?.replace('Bearer ', '') || req.cookies.get('token')?.value || req.cookies.get('access_token')?.value;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * GET /api/campaigns/[id]/post-stats[?fresh=1]
 * Post performance for an auto-post campaign — posts, impressions, reactions,
 * comments, reposts, approvals, schedule health, connections since first post.
 * Backend answers 204 when the campaign has no schedule and no posts; that is
 * passed through so the page can hide the section. An explicit route rather
 * than the [feature]/[...path] catch-all because the catch-all builds a
 * NextResponse with a (empty) body for non-JSON upstreams, which the fetch
 * spec forbids for 204 — it would come back as a 500.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fresh = req.nextUrl.searchParams.get('fresh');
    const url = `${getBackendBase()}/api/campaigns/${id}/post-stats${fresh ? `?fresh=${encodeURIComponent(fresh)}` : ''}`;
    const resp = await fetch(url, { method: 'GET', headers: getAuthHeaders(req), cache: 'no-store' });
    if (resp.status === 204) return new NextResponse(null, { status: 204 });
    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.ok ? 200 : resp.status });
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
