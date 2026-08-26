/**
 * GET /api/ai-icp-assistant/searches/:id → LAD_backend SearchDispatcher detail.
 */
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/ai-icp-assistant/searches/${encodeURIComponent(id)}`,
      {
        method: 'GET',
        headers: {
          Authorization: request.headers.get('Authorization') || '',
          Cookie: request.headers.get('cookie') || '',
        },
      },
    );

    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: 'invalid_json_from_backend', raw: text.slice(0, 500) };
    }
    if (!response.ok) {
      console.error('[ai-icp-assistant/searches/:id] Backend error', {
        status: response.status, statusText: response.statusText, id, data,
      });
    }
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[ai-icp-assistant/searches/:id] Proxy error', { message, id });
    return NextResponse.json(
      { success: false, error: message || 'Internal proxy error' },
      { status: 502 },
    );
  }
}
