import { NextRequest, NextResponse } from 'next/server';
function getBackendBase() {
  const backendInternal = process.env.BACKEND_INTERNAL_URL || 'https://lad-backend-develop-741719885039.us-central1.run.app';
  return backendInternal.replace(/\/$/, '');
}
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const backend = getBackendBase();
    const resp = await fetch(`${backend}/api/gemini/generate-phrase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return NextResponse.json(data, { status: resp.status });
    }
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('[/api/gemini/generate-phrase] Error:', error.message);
    return NextResponse.json({ error: 'Failed to generate phrase' }, { status: 500 });
  }
}