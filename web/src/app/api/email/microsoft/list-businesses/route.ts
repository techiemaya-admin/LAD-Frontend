import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl, getVoagHeaders } from '../../../utils/backend';

const BACKEND_PATH = '/api/social-integration/email/microsoft/list-businesses';

export async function GET(req: NextRequest) {
  try {
    const backend = getBackendUrl();
    const resp = await fetch(`${backend}${BACKEND_PATH}`, {
      method: 'GET',
      headers: getVoagHeaders(req),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return NextResponse.json(data, { status: resp.status });
    return NextResponse.json(data);
  } catch (e: any) {
    console.error('[/api/email/microsoft/list-businesses] GET Error:', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
