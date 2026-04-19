import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl, getVoagHeaders } from '../../../utils/backend';

const BACKEND_PATH = '/api/social-integration/email/microsoft/status';

export async function POST(req: NextRequest) {
  try {
    const backend = getBackendUrl();
    const body = await req.json().catch(() => ({}));
    const resp = await fetch(`${backend}${BACKEND_PATH}`, {
      method: 'POST',
      headers: getVoagHeaders(req),
      body: JSON.stringify(body),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return NextResponse.json(data, { status: resp.status });
    return NextResponse.json(data);
  } catch (e: any) {
    console.error('[/api/calendar/microsoft/status] POST Error:', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const backend = getBackendUrl();
    const userId = req.nextUrl.searchParams.get('user_id');
    const resp = await fetch(`${backend}${BACKEND_PATH}`, {
      method: 'POST',
      headers: getVoagHeaders(req),
      body: JSON.stringify({ user_id: userId }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return NextResponse.json(data, { status: resp.status });
    return NextResponse.json(data);
  } catch (e: any) {
    console.error('[/api/calendar/microsoft/status] GET Error:', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
