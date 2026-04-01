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
    const wabaReq = new NextRequest(url, req);

    // Python DELETE endpoint requires tenant_id as a query param (Query(...)).
    // Embed it directly in the path string — nextUrl.searchParams can cache the
    // original URL when using new NextRequest(modifiedUrl, req), so setting it
    // on the cloned URL is not reliably forwarded by proxyToPythonService.
    // Try header first, fall back to JWT cookie decode.
    let tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) {
      const token = req.cookies.get('token')?.value || req.cookies.get('access_token')?.value;
      if (token) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            tenantId = payload.tenantId || payload.tenant_id || null;
          }
        } catch { /* ignore */ }
      }
    }
    const pythonPath = tenantId
      ? `/admin/whatsapp-accounts/${slug}?tenant_id=${encodeURIComponent(tenantId)}`
      : `/admin/whatsapp-accounts/${slug}`;

    return await proxyToPythonService(wabaReq, getWhatsAppServiceUrl(), pythonPath);
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to delete account' }, { status: 500 });
  }
}
