import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl, getVoagHeaders } from '../utils/backend';

const BACKEND_PATH = '/api/ai-playground';

/** GET /api/ai-playground — load saved profile + chat history */
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
    console.error('[/api/ai-playground] GET error:', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}

/** POST /api/ai-playground — save profile */
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
    console.error('[/api/ai-playground] POST error:', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
