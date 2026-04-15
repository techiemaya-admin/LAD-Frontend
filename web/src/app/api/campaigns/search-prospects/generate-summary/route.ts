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
 * POST /api/campaigns/search-prospects/generate-summary
 * Runs ABM research + profile enrichment for a lead (used in Community ROI member profiles).
 * Proxies to backend /api/campaigns/search-prospects/generate-summary
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const backend = getBackendBase();
    const url = `${backend}/api/campaigns/search-prospects/generate-summary`;

    const headers = getAuthHeaders(req);
    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      logger.error('[/api/campaigns/search-prospects/generate-summary] POST Error', { status: resp.status, data });
      return NextResponse.json(data || { error: 'Unknown error' }, { status: resp.status });
    }

    return NextResponse.json(data);
  } catch (e: any) {
    logger.error('[/api/campaigns/search-prospects/generate-summary] POST Error', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
