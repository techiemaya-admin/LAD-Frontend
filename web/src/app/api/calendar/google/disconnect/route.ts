import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../../utils/backend';
export async function POST(req: NextRequest) {
  try {
    const backend = getBackendUrl();
    const token = req.cookies.get('token')?.value || req.headers.get('authorization')?.replace('Bearer ', '');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Frontend-ID': 'settings',
      'X-API-Key': process.env.BASE_URL_FRONTEND_APIKEY || '',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const body = await req.json().catch(() => ({}));
    const resp = await fetch(`${backend}/api/social-integration/calendar/google/disconnect`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return NextResponse.json(data, { status: resp.status });
    }
    return NextResponse.json(data);
  } catch (e: any) {
    console.error('[/api/calendar/google/disconnect] POST Error:', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
