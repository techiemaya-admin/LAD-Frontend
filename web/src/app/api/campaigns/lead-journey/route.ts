import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

function getBackendBase() {
  const backendInternal = process.env.BACKEND_INTERNAL_URL || '';
  return backendInternal.replace(/\/$/, '');
}

function getAuthHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = req.cookies.get('token')?.value || req.headers.get('authorization')?.replace('Bearer ', '');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const tenant = req.headers.get('x-tenant-id');
  if (tenant) headers['X-Tenant-ID'] = tenant;
  return headers;
}

/**
 * GET /api/campaigns/lead-journey
 * Tenant-wide lead-journey feed (accepted / responded / SAH) for the overview
 * dashboard widget. Proxies to backend /api/campaigns/lead-journey.
 */
export async function GET(req: NextRequest) {
  try {
    const backend = getBackendBase();
    const qs = req.nextUrl.search || '';
    const url = `${backend}/api/campaigns/lead-journey${qs}`;

    const resp = await fetch(url, { method: 'GET', headers: getAuthHeaders(req) });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      logger.error('[/api/campaigns/lead-journey] GET Error', { status: resp.status, data });
      return NextResponse.json(data || { error: 'Unknown error' }, { status: resp.status });
    }
    return NextResponse.json(data);
  } catch (e: any) {
    logger.error('[/api/campaigns/lead-journey] GET Error', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
