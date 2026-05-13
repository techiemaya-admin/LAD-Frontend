import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl, getVoagHeaders } from '../../../utils/backend';
export async function POST(req: NextRequest) {
  try {
    const backend = getBackendUrl();
    const headers = getVoagHeaders(req);
    const body = await req.json().catch(() => ({}));
    const resp = await fetch(`${backend}/api/social-integration/email/google/disconnect`, {
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
