/**
 * Context Statuses Proxy
 * GET /api/whatsapp-conversations/conversations/context-statuses
 *
 * Channel routing:
 *   channel=personal → Node.js /api/personal-whatsapp/conversations/context-statuses
 *   channel=waba     → Python WABA service, with Node.js fallback on 5xx
 *                      (e.g. when the tenant isn't in the Python service's
 *                       tenant_database_config yet — staging / new tenants)
 */
import { NextRequest, NextResponse } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl, getBackendUrl } from '../../utils/python-proxy';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const channel = url.searchParams.get('channel') || 'waba';

  // ── Personal WhatsApp: always Node.js ────────────────────────────────────
  if (channel === 'personal') {
    const backendReq = new NextRequest(url, req);
    url.searchParams.set('channel', 'personal');
    return proxyToPythonService(backendReq, getBackendUrl(), '/conversations/context-statuses');
  }

  // ── WABA: try Python service first, fall back to Node.js on 5xx ──────────
  try {
    const wabaResp = await proxyToPythonService(req, getWABAServiceUrl(), '/api/conversations/context-statuses');

    if (wabaResp.status < 500) {
      // 2xx / 4xx — return as-is (4xx = real client error, not a missing-tenant problem)
      return wabaResp;
    }

    // 5xx from Python service — check if it's a missing tenant_database_config error
    let body: any = {};
    try { body = await wabaResp.json(); } catch { /* ignore parse error */ }
    const detail: string = body?.detail || body?.error || body?.message || '';
    const isTenantMissing = detail.toLowerCase().includes('no database configuration') ||
                            detail.toLowerCase().includes('tenant_database_config');

    if (!isTenantMissing) {
      // Unrelated 5xx — surface the original error
      return NextResponse.json(body, { status: wabaResp.status });
    }

    // Tenant not configured in Python service — fall through to Node.js
  } catch {
    // Python service unreachable — fall through to Node.js
  }

  // ── Fallback: Node.js backend ─────────────────────────────────────────────
  const fallbackUrl = new URL(req.url);
  fallbackUrl.searchParams.set('channel', 'backend');
  const fallbackReq = new NextRequest(fallbackUrl, req);
  return proxyToPythonService(
    fallbackReq,
    getBackendUrl(),
    '/api/personal-whatsapp/conversations/context-statuses',
  );
}
