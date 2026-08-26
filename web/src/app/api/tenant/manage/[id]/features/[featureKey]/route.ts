/**
 * Tenant Feature Toggle Proxy
 * PUT /api/tenant/manage/:id/features/:featureKey  →  LAD_backend PUT /api/admin/tenants/:id/features/:featureKey
 *
 * The `environment` query param is forwarded deliberately: the backend picks
 * lad_dev or lad_stage from it, so dropping it here would toggle develop while
 * the admin is looking at stage.
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; featureKey: string }> },
) {
  const { id, featureKey } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ success: false, error: 'Invalid tenant id' }, { status: 400 });
  }

  const token = extractToken(req);
  if (!token) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const environment = new URL(req.url).searchParams.get('environment') || 'develop';
  const url =
    `${getBackendBase()}/api/admin/tenants/${id}/features/${encodeURIComponent(featureKey)}` +
    `?environment=${encodeURIComponent(environment)}`;

  try {
    const upstream = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: await req.text(),
    });
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Could not reach the backend' },
      { status: 502 },
    );
  }
}
