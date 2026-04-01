/**
 * Admin WhatsApp Account by Slug Proxy
 * PATCH  /api/whatsapp-conversations/admin/whatsapp-accounts/:slug → Backend /admin/whatsapp-accounts/:slug
 * DELETE /api/whatsapp-conversations/admin/whatsapp-accounts/:slug → Backend /admin/whatsapp-accounts/:slug
 */
import { NextRequest, NextResponse } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../utils/python-proxy';
import { getBackendUrl } from '../../../../utils/backend';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    // Force WABA channel routing to Python service
    const url = new URL(req.url);
    url.searchParams.set('channel', 'waba');
    const wabaReq = new NextRequest(url, req);

    const res = await proxyToPythonService(wabaReq, getWhatsAppServiceUrl(), `/admin/whatsapp-accounts/${slug}`);
    if (res.status < 400) return res;
  } catch { /* fall through */ }

  // Fallback: Node backend
  try {
    const backendUrl = getBackendUrl();
    const body = await req.text();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const auth = req.headers.get('authorization');
    if (auth) headers['Authorization'] = auth;
    const tid = req.headers.get('x-tenant-id');
    if (tid) headers['X-Tenant-ID'] = tid;
    const resp = await fetch(`${backendUrl}/api/whatsapp-conversations/admin/whatsapp-accounts/${slug}`, {
      method: 'PATCH', headers, body,
    });
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update account' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    // Force WABA channel routing to Python service
    const url = new URL(req.url);
    url.searchParams.set('channel', 'waba');

    // Python DELETE endpoint requires tenant_id as a query param (Query(...))
    // Extract from X-Tenant-ID header and inject into the URL
    const tenantId = req.headers.get('x-tenant-id');
    if (tenantId) url.searchParams.set('tenant_id', tenantId);

    const wabaReq = new NextRequest(url, req);

    return await proxyToPythonService(wabaReq, getWhatsAppServiceUrl(), `/admin/whatsapp-accounts/${slug}`);
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to delete account' }, { status: 500 });
  }
}
