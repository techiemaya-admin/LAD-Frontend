import { NextRequest, NextResponse } from 'next/server';

function getBackendBase() {
  return (process.env.BACKEND_INTERNAL_URL || 'https://lad-backend-develop-160078175457.us-central1.run.app').replace(/\/$/, '');
}

function getAuthHeaders(req: NextRequest): Record<string, string> {
  const token = req.cookies.get('access_token')?.value || req.headers.get('authorization')?.replace('Bearer ', '');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// GET /api/abm/companies  →  backend GET /api/abm/companies
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.toString();
    const url   = `${getBackendBase()}/api/abm/companies${query ? `?${query}` : ''}`;

    const resp = await fetch(url, { method: 'GET', headers: getAuthHeaders(req) });
    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.status });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to list companies' }, { status: 500 });
  }
}
