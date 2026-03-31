import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl, getVoagHeaders } from '../../utils/backend';

const BACKEND_PATH = '/api/ai-playground/reset';

/** POST /api/ai-playground/reset — clear chat history */
export async function POST(req: NextRequest) {
  try {
    const backend = getBackendUrl();
    const resp = await fetch(`${backend}${BACKEND_PATH}`, {
      method: 'POST',
      headers: getVoagHeaders(req),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return NextResponse.json(data, { status: resp.status });
    return NextResponse.json(data);
  } catch (e: any) {
    console.error('[/api/ai-playground/reset] POST error:', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
