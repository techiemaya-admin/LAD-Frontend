import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * /api/settings/business-hours — proxy to the backend's core settings routes.
 *
 * apiClient always calls `${window.location.origin}/api/...` from the browser,
 * so every SDK path needs a matching Next route handler here. Without this file
 * Next answers 404 and the Business Hours modal cannot save.
 */

function getBackendBase() {
  const backendInternal = process.env.BACKEND_INTERNAL_URL || '';
  return backendInternal.replace(/\/$/, '');
}

function authHeaders(req: NextRequest): Record<string, string> {
  const token =
    req.cookies.get('access_token')?.value ||
    req.headers.get('authorization')?.replace('Bearer ', '');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function GET(req: NextRequest) {
  try {
    const resp = await fetch(`${getBackendBase()}/api/settings/business-hours`, {
      method: 'GET',
      headers: authHeaders(req),
      cache: 'no-store',
    });
    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.status });
  } catch (e: any) {
    logger.error('[/api/settings/business-hours] GET Error', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const resp = await fetch(`${getBackendBase()}/api/settings/business-hours`, {
      method: 'PATCH',
      headers: authHeaders(req),
      body: JSON.stringify(body),
    });
    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.status });
  } catch (e: any) {
    logger.error('[/api/settings/business-hours] PATCH Error', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
