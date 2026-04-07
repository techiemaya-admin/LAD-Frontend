/**
 * WA Groups Sync Proxy — Personal WhatsApp only
 *
 * POST /api/whatsapp-conversations/wa-groups/sync
 *   → LAD_backend /api/whatsapp-conversations/wa-groups/sync
 *
 * Fetches native WhatsApp groups from the connected Baileys session and
 * upserts them into the tenant's chat_groups table so they appear in the
 * Chat Groups panel alongside manually created groups.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../utils/python-proxy';

function authHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const auth = req.headers.get('authorization');
  if (auth) {
    headers['Authorization'] = auth;

    // Extract tenantId from JWT to forward as X-Tenant-ID
    try {
      const token = auth.replace('Bearer ', '');
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        const tenantId = payload.tenantId || payload.tenant_id || payload.organizationId;
        if (tenantId) headers['X-Tenant-ID'] = tenantId;
      }
    } catch {
      // ignore — token may not be a JWT
    }
  }

  const directTenant = req.headers.get('x-tenant-id');
  if (directTenant) headers['X-Tenant-ID'] = directTenant;

  return headers;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const backendUrl = getBackendUrl();
    const targetUrl = `${backendUrl}/api/whatsapp-conversations/wa-groups/sync`;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: authHeaders(req),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[wa-groups/sync] Proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reach personal WhatsApp service' },
      { status: 502 },
    );
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const backendUrl = getBackendUrl();
    const targetUrl = `${backendUrl}/api/whatsapp-conversations/wa-groups`;

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: authHeaders(req),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[wa-groups] Proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reach personal WhatsApp service' },
      { status: 502 },
    );
  }
}
