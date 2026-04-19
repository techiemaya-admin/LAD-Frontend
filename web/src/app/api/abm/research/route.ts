import { NextRequest, NextResponse } from 'next/server';

function getBackendBase() {
  return (process.env.BACKEND_INTERNAL_URL || 'https://lad-backend-develop-160078175457.us-central1.run.app').replace(/\/$/, '');
}

function getAuthHeaders(req: NextRequest): Record<string, string> {
  // Cookie name is 'token' (set by js-cookie / safeStorage in the SDK)
  // Also accept Authorization header as fallback (sent by some client components)
  const authHeader = req.headers.get('authorization');
  const token =
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null) ||
    req.cookies.get('token')?.value ||
    req.cookies.get('access_token')?.value || // legacy fallback
    '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// POST /api/abm/research  →  backend POST /api/abm/research
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const url  = `${getBackendBase()}/api/abm/research`;

    const resp = await fetch(url, {
      method:  'POST',
      headers: getAuthHeaders(req),
      body:    JSON.stringify(body),
    });

    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.status });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'ABM research failed' }, { status: 500 });
  }
}
