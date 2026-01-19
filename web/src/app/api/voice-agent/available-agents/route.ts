import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../utils/backend';

/**
 * Helper to extract tenant_id from JWT token
 * Decodes JWT without verification (signature verified by backend)
 */
function extractTenantFromJWT(token: string): string | null {
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

export async function GET(req: NextRequest) {
  try {
    // Try to get token from Authorization header first, then fall back to cookies
    const authHeader = req.headers.get('Authorization');
    let token = authHeader?.replace('Bearer ', '');
    
    // Try multiple cookie names
    if (!token) {
      token = req.cookies.get('access_token')?.value;
    }
    if (!token) {
      token = req.cookies.get('accessToken')?.value;
    }
    if (!token) {
      token = req.cookies.get('auth_token')?.value;
    }
    if (!token) {
      token = req.cookies.get('token')?.value;
    }
    
    // Token validation - no logging of cookie details for security
    if (!token) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    // Extract tenant context from JWT or request header
    let tenantId = req.headers.get('X-Tenant-Id');
    if (!tenantId && token) {
      tenantId = extractTenantFromJWT(token);
    }

    // Enforce tenant context
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      );
    }
    
    const backend = getBackendUrl();
    const apiUrl = `${backend}/api/voice-agent/user/available-agents`;

    const resp = await fetch(apiUrl, {
      method: 'GET',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Tenant-Id': tenantId,
      },
      cache: 'no-store',
    });

    if (!resp.ok) {
      const errorText = await resp.text().catch(() => 'Unknown error');
      return NextResponse.json(
        { error: `Backend returned ${resp.status}`, details: errorText },
        { status: resp.status }
      );
    }

    const data = await resp.json().catch(() => ({}));

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch agents', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
