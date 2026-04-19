import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl, getVoagHeaders } from '../../../utils/backend';

const BACKEND_PATH = '/api/social-integration/email/microsoft/list-services';

export async function GET(req: NextRequest) {
  try {
    const backend = getBackendUrl();
    const url = new URL(`${backend}${BACKEND_PATH}`);

    // Forward business_id query param if provided
    const businessId = req.nextUrl.searchParams.get('business_id');
    if (businessId) url.searchParams.set('business_id', businessId);

    const resp = await fetch(url.toString(), {
      method: 'GET',
      headers: getVoagHeaders(req),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return NextResponse.json(data, { status: resp.status });
    return NextResponse.json(data);
  } catch (e: any) {
    console.error('[/api/email/microsoft/list-services] GET Error:', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
