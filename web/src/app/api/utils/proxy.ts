import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from './backend';

/**
 * Decodes JWT without verification
 */
export function extractTenantFromJWT(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    );
    return payload.tenant_id || payload.tenantId || null;
  } catch {
    return null;
  }
}

export async function handleProxy(req: NextRequest, endpoint: string) {
  try {
    const authHeader = req.headers.get('Authorization');
    let token = authHeader?.replace('Bearer ', '');
    if (!token) {
      token = req.cookies.get('token')?.value;
    }

    if (!token) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    let tenantId = req.headers.get('X-Tenant-Id');
    if (!tenantId && token) {
      tenantId = extractTenantFromJWT(token);
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    const backend = getBackendUrl();
    const url = new URL(req.url);
    const apiUrl = `${backend}${endpoint}${url.search}`;

    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Tenant-Id': tenantId,
    };

    // Forward other pertinent headers if needed
    const method = req.method;
    const body = ['POST', 'PUT', 'PATCH'].includes(method) ? await req.text() : undefined;

    const resp = await fetch(apiUrl, {
      method,
      headers,
      body,
      cache: 'no-store',
    });

    if (!resp.ok) {
      const errorText = await resp.text().catch(() => 'Unknown error');
      try {
        const errorJson = JSON.parse(errorText);
        return NextResponse.json(errorJson, { status: resp.status });
      } catch {
        return NextResponse.json({ error: `Backend returned ${resp.status}`, details: errorText }, { status: resp.status });
      }
    }

    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Proxy error for ${endpoint}:`, error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
