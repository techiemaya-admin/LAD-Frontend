import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

function getBackendBase() {
  const backendInternal = process.env.BACKEND_INTERNAL_URL || 'https://lad-backend-develop-160078175457.us-central1.run.app';
  return backendInternal.replace(/\/$/, '');
}

function getAuthHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = req.cookies.get('token')?.value || req.headers.get('authorization')?.replace('Bearer ', '');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * POST /api/campaigns/generate-message
 * Generate an AI-powered LinkedIn connection or follow-up message template.
 * Proxies to backend /api/campaigns/generate-message
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const backend = getBackendBase();
    const url = `${backend}/api/campaigns/generate-message`;

    const headers = getAuthHeaders(req);
    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      logger.error('[/api/campaigns/generate-message] POST Error', { status: resp.status, data });
      return NextResponse.json(data || { error: 'Unknown error' }, { status: resp.status });
    }

    return NextResponse.json(data);
  } catch (e: any) {
    logger.error('[/api/campaigns/generate-message] POST Error', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
