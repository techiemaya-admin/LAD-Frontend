/**
 * Media Upload Proxy (multipart) — for large file uploads bypassing JSON body limits
 *
 * POST /api/whatsapp-conversations/conversations/upload-media?channel=waba
 *   Accepts: multipart/form-data with a `file` field
 *   Returns: { success: true, media_id: "<handle>" }
 *
 * This endpoint forwards multipart form data directly to the Python WABA service,
 * which uploads the file to Meta's media API and returns a media_id.
 * The media_id can then be used in the send-message payload (no large base64 needed).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWABAServiceUrl } from '../../utils/python-proxy';

// No body size limit configuration needed — multipart streams directly to backend
export const maxDuration = 300;

/** Extract tenantId from JWT token payload (same as python-proxy.ts) */
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

export async function POST(req: NextRequest) {
  const wabaUrl = getWABAServiceUrl();
  const url = new URL('/api/conversations/upload-media', wabaUrl);

  const headers: Record<string, string> = {};

  // Forward auth header and extract tenant ID (same logic as python-proxy.ts)
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    headers['Authorization'] = authHeader;
    const token = authHeader.replace('Bearer ', '');
    const tenantId = extractTenantIdFromJwt(token);
    if (tenantId) headers['X-Tenant-ID'] = tenantId;
  }

  // Explicit X-Tenant-ID from client takes priority
  const directTenantId = req.headers.get('x-tenant-id');
  if (directTenantId) headers['X-Tenant-ID'] = directTenantId;

  // Fallback: extract from cookie
  if (!headers['X-Tenant-ID']) {
    const cookieToken = req.cookies.get('access_token')?.value || req.cookies.get('token')?.value;
    if (cookieToken) {
      const tenantId = extractTenantIdFromJwt(cookieToken);
      if (tenantId) headers['X-Tenant-ID'] = tenantId;
    }
  }

  // Forward content-type (multipart boundary must be preserved as-is)
  const contentType = req.headers.get('content-type');
  if (contentType) headers['Content-Type'] = contentType;

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: req.body,
      // @ts-ignore — duplex is required for streaming body in Node.js fetch
      duplex: 'half',
    });

    const data = await response.json();

    if (response.status >= 500) {
      console.error('[upload-media-proxy] 5xx from WABA service:', data?.detail || data);
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[upload-media-proxy] Error uploading media:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload media to WABA service' },
      { status: 502 },
    );
  }
}
