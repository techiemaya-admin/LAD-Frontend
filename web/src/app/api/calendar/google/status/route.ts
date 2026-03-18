import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../../utils/backend';

const BACKEND_PATH = '/api/social-integration/calendar/google/status';

function buildHeaders(req: NextRequest): Record<string, string> {
  const token = req.cookies.get('token')?.value || req.cookies.get('access_token')?.value || req.headers.get('authorization')?.replace('Bearer ', '');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Frontend-ID': 'settings',
    'X-API-Key': process.env.BASE_URL_FRONTEND_APIKEY || '',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function POST(req: NextRequest) {
  try {
    const backend = getBackendUrl();
    const body = await req.json().catch(() => ({}));
    const resp = await fetch(`${backend}${BACKEND_PATH}`, {
      method: 'POST',
      headers: buildHeaders(req),
      body: JSON.stringify(body),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return NextResponse.json(data, { status: resp.status });
    return NextResponse.json(data);
  } catch (e: any) {
    console.error('[/api/calendar/google/status] POST Error:', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const backend = getBackendUrl();
    const userId = req.nextUrl.searchParams.get('user_id');
    const resp = await fetch(`${backend}${BACKEND_PATH}`, {
      method: 'POST',
      headers: buildHeaders(req),
      body: JSON.stringify({ user_id: userId }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return NextResponse.json(data, { status: resp.status });
    return NextResponse.json(data);
  } catch (e: any) {
    console.error('[/api/calendar/google/status] GET Error:', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
