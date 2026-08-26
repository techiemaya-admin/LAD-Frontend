/**
 * POST /api/ai-icp-assistant/search → LAD_backend SearchDispatcher.
 *
 * Runs a discovery search (Apollo + Sales Nav + ABM as configured) for the
 * tenant's active ICP. Sync by default; pass `?async=1` for a 202.
 *
 * Forwards the bearer token unchanged. Pass-through for query string + body.
 */
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  const t0 = Date.now();
  try {
    const body = await request.json().catch(() => ({}));
    const search = request.nextUrl.search || '';

    const response = await fetch(`${BACKEND_URL}/api/ai-icp-assistant/search${search}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') || '',
        Cookie: request.headers.get('cookie') || '',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: 'invalid_json_from_backend', raw: text.slice(0, 500) };
    }

    if (!response.ok) {
      console.error('[ai-icp-assistant/search] Backend error', {
        status: response.status,
        statusText: response.statusText,
        duration_ms: Date.now() - t0,
        data,
      });
    }
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[ai-icp-assistant/search] Proxy error', {
      message,
      duration_ms: Date.now() - t0,
    });
    return NextResponse.json(
      { success: false, error: message || 'Internal proxy error' },
      { status: 502 },
    );
  }
}
