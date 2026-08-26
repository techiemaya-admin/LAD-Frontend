import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Catch-all proxy for /api/campaigns/linkedin-broadcast/* → LAD_backend.
 *
 * The LinkedIn broadcast feature lives entirely under one backend path prefix,
 * so a single [...path] catch-all forwards every method + subpath + query
 * (groups, members, audience/preview, templates, send, runs, recipients) rather
 * than a route file per endpoint.
 */

function getBackendBase() {
  const backendInternal = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';
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

async function forward(req: NextRequest, path: string[]) {
  const backend = getBackendBase();
  const suffix = (path || []).join('/');
  const qs = req.nextUrl.search || '';
  const url = `${backend}/api/campaigns/linkedin-broadcast/${suffix}${qs}`;
  const method = req.method;
  const init: RequestInit = { method, headers: getAuthHeaders(req) };
  if (method !== 'GET' && method !== 'DELETE') {
    const body = await req.json().catch(() => null);
    if (body !== null) init.body = JSON.stringify(body);
  }
  try {
    const resp = await fetch(url, init);
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      logger.error('[/api/campaigns/linkedin-broadcast] proxy error', { url, method, status: resp.status });
    }
    return NextResponse.json(data, { status: resp.status });
  } catch (e: any) {
    logger.error('[/api/campaigns/linkedin-broadcast] proxy exception', { url, method, error: e?.message });
    return NextResponse.json({ success: false, error: 'Internal error', details: e?.message }, { status: 500 });
  }
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { path } = await params;
  return forward(req, path);
}
export async function POST(req: NextRequest, { params }: Ctx) {
  const { path } = await params;
  return forward(req, path);
}
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { path } = await params;
  return forward(req, path);
}
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { path } = await params;
  return forward(req, path);
}
