/**
 * Admin WhatsApp Accounts Proxy
 * GET  /api/whatsapp-conversations/admin/whatsapp-accounts
 * POST /api/whatsapp-conversations/admin/whatsapp-accounts
 *
 * Routing strategy:
 *   1. Try the BNI Python conversation service first (full data with ai_model, timezone, etc.)
 *   2. If BNI is unreachable or returns 5xx, fall back to the Node backend's
 *      /api/whatsapp-conversations/admin/whatsapp-accounts endpoint which queries
 *      the local social_whatsapp_accounts table.
 *
 * This prevents a 500/502 when the BNI service is not running locally or is temporarily down.
 */
import { NextRequest, NextResponse } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';
import { getBackendUrl } from '../../../utils/backend';

async function callNodeBackend(
  req: NextRequest,
  method: string,
  body?: unknown,
): Promise<NextResponse> {
  const backendUrl = getBackendUrl();
  const targetUrl = `${backendUrl}/api/whatsapp-conversations/admin/whatsapp-accounts`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const authHeader = req.headers.get('authorization');
  if (authHeader) headers['Authorization'] = authHeader;
  const tenantId = req.headers.get('x-tenant-id');
  if (tenantId) headers['X-Tenant-ID'] = tenantId;

  const fetchOptions: RequestInit = { method, headers };
  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const resp = await fetch(targetUrl, fetchOptions);
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch {
    // Node backend also unavailable — return empty list so the UI degrades gracefully
    return NextResponse.json({ success: true, data: [], accounts: [] }, { status: 200 });
  }
}

export async function GET(req: NextRequest) {
  // Force WABA channel routing to Python service
  const url = new URL(req.url);
  url.searchParams.set('channel', 'waba');
  const wabaReq = new NextRequest(url, req);

  const bniResponse = await proxyToPythonService(wabaReq, getWhatsAppServiceUrl(), '/admin/whatsapp-accounts');

  // Fall back to Node backend if BNI returned a server error or connection failure (5xx / 502)
  if (bniResponse.status >= 500) {
    return callNodeBackend(req, 'GET');
  }

  return bniResponse;
}

export async function POST(req: NextRequest) {
  // Read the body once before handing it to the BNI proxy, so we can re-send
  // it to the Node backend fallback if BNI fails (streams can only be read once).
  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch { /* empty body */ }

  try {
    // Reconstruct a cloned request with the already-read body for proxyToPythonService
    const bodyString = parsedBody !== undefined ? JSON.stringify(parsedBody) : undefined;
    const url = new URL(req.url);
    url.searchParams.set('channel', 'waba');
    const clonedReq = new NextRequest(url, {
      method: req.method,
      headers: req.headers,
      body: bodyString,
    });

    const bniResponse = await proxyToPythonService(clonedReq, getWhatsAppServiceUrl(), '/admin/whatsapp-accounts');

    // Fall back to Node backend on server errors or method-not-allowed (Python service
    // may not have this endpoint on older deployments).
    if (bniResponse.status >= 400) {
      return callNodeBackend(req, 'POST', parsedBody);
    }

    return bniResponse;
  } catch (err) {
    console.error('[admin/whatsapp-accounts POST] Python proxy error, falling back to Node:', err);
    return callNodeBackend(req, 'POST', parsedBody);
  }
}
