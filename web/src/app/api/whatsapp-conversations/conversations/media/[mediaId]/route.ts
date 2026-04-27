/**
 * Media Proxy — streams inbound WhatsApp media to the browser
 *
 * GET /api/whatsapp-conversations/conversations/media/{mediaId}?channel=waba
 *
 * The Python WABA service fetches the file from Meta's CDN and returns raw bytes.
 * This proxy streams those bytes directly to the browser so images/documents
 * sent by customers (inbound) can be displayed in the conversation UI.
 */
import { NextRequest } from 'next/server';
import { getWABAServiceUrl, getBackendUrl } from '../../../utils/python-proxy';

function extractTenantIdFromJwt(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return payload.tenantId || payload.tenant_id || payload.organizationId || payload.orgId || null;
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const { mediaId } = await params;

  // Personal WhatsApp inbound media — IDs are prefixed with "pwa_"
  // These are stored on LAD_backend (Node.js), not the WABA Python service
  const isPersonalMedia = mediaId.startsWith('pwa_');
  const serviceUrl = isPersonalMedia ? getBackendUrl() : getWABAServiceUrl();
  const mediaPath  = isPersonalMedia
    ? `/api/whatsapp-conversations/conversations/media/${mediaId}`
    : `/api/conversations/media/${mediaId}`;

  const url = new URL(mediaPath, serviceUrl);

  const headers: Record<string, string> = {};

  // Auth + tenant extraction (same as python-proxy.ts)
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    headers['Authorization'] = authHeader;
    const token = authHeader.replace('Bearer ', '');
    const tenantId = extractTenantIdFromJwt(token);
    if (tenantId) headers['X-Tenant-ID'] = tenantId;
  }

  const directTenantId = req.headers.get('x-tenant-id');
  if (directTenantId) headers['X-Tenant-ID'] = directTenantId;

  if (!headers['X-Tenant-ID']) {
    const cookieToken = req.cookies.get('access_token')?.value || req.cookies.get('token')?.value;
    if (cookieToken) {
      const tenantId = extractTenantIdFromJwt(cookieToken);
      if (tenantId) headers['X-Tenant-ID'] = tenantId;
    }
  }

  try {
    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Media not found' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Stream the binary response straight to the browser
    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[media-proxy] Error fetching media:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch media' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
