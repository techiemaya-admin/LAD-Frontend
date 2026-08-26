import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Catch-all proxy for /api/campaigns/lead-reports/* → LAD_backend.
 *
 * Serves the CRM lead page's report + accelerator sections: by-lead read,
 * advance-research trigger, and the in-app approve/reject decision.
 *
 * The upstream status code is forwarded verbatim, which the client depends on:
 * 422 carries the NEEDS_RESEARCH refusal (a state the page renders, not an
 * error) and 409 means the approver settled it through the emailed link first.
 * Collapsing either into a generic 500 would lose that distinction.
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
  const url = `${backend}/api/campaigns/lead-reports/${suffix}${qs}`;
  const method = req.method;
  const init: RequestInit = { method, headers: getAuthHeaders(req) };
  if (method !== 'GET' && method !== 'DELETE') {
    const body = await req.json().catch(() => null);
    if (body !== null) init.body = JSON.stringify(body);
  }
  try {
    const resp = await fetch(url, init);
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok && resp.status >= 500) {
      logger.error('[/api/campaigns/lead-reports] proxy error', { url, method, status: resp.status });
    }
    return NextResponse.json(data, { status: resp.status });
  } catch (e: any) {
    logger.error('[/api/campaigns/lead-reports] proxy exception', { url, method, error: e?.message });
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
