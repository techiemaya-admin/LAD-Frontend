/**
 * Proxy utility for forwarding Next.js API requests to LAD-Email-Comms
 * (Python FastAPI service at asia-south1).
 *
 * Mirrors the python-proxy pattern used by whatsapp-conversations but simpler  - 
 * no channel multiplexing, single target service. Lifts the JWT from
 * Authorization header OR access_token cookie, extracts tenantId, forwards
 * as X-Tenant-ID so the Python TenantMiddleware can route to the correct
 * per-tenant DB.
 */
import { NextRequest, NextResponse } from 'next/server';

/** LAD-Email-Comms (Python FastAPI) - outbound broadcasts + account listing. */
export function getEmailCommsServiceUrl(): string {
  return (
    process.env.NEXT_PUBLIC_EMAIL_COMMS_URL ||
    process.env.EMAIL_COMMS_SERVICE_URL ||
    'http://localhost:8000'
  );
}

/** Decode JWT payload (no signature verification - Python service trusts the
 * X-Tenant-ID we forward, so this is a routing hint only). */
function extractTenantIdFromJwt(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return (
      payload.tenantId ||
      payload.tenant_id ||
      payload.organizationId ||
      payload.orgId ||
      null
    );
  } catch {
    return null;
  }
}

/**
 * Forward an incoming Next.js request to LAD-Email-Comms.
 *
 * @param req   The incoming Next.js request
 * @param path  The destination path on LAD-Email-Comms, e.g. '/api/email-broadcast/runs'
 */
export async function proxyToEmailComms(
  req: NextRequest,
  path: string,
): Promise<Response> {
  const baseUrl = getEmailCommsServiceUrl();
  const url = new URL(path, baseUrl);

  // Forward query params
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Resolve auth - prefer Authorization header, fall back to access_token cookie.
  const authHeader = req.headers.get('authorization');
  let token: string | null = null;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.slice(7).trim();
    headers['Authorization'] = authHeader;
  } else {
    const cookieToken =
      req.cookies.get('access_token')?.value ||
      req.cookies.get('token')?.value ||
      null;
    if (cookieToken) {
      token = cookieToken;
      headers['Authorization'] = `Bearer ${cookieToken}`;
    }
  }

  // Forward X-Tenant-ID - explicit header from the client wins.
  const explicitTenant = req.headers.get('x-tenant-id');
  if (explicitTenant) {
    headers['X-Tenant-ID'] = explicitTenant;
  } else if (token) {
    const tenantId = extractTenantIdFromJwt(token);
    if (tenantId) headers['X-Tenant-ID'] = tenantId;
  }

  // Optional debug headers (kept for parity with python-proxy).
  const debugTrace = req.headers.get('x-debug-trace-id');
  if (debugTrace) headers['X-Debug-Trace-Id'] = debugTrace;

  const fetchOptions: RequestInit = {
    method: req.method,
    headers,
  };

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    try {
      const bodyText = await req.text();
      if (bodyText) fetchOptions.body = bodyText;
    } catch (err) {
      console.error('[email-proxy] failed to read request body', err);
    }
  }

  try {
    const response = await fetch(url.toString(), fetchOptions);
    if (response.status === 204) {
      return new Response(null, { status: 204 });
    }
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!isJson) {
      // The unsubscribe route returns HTML on the public endpoint, but THAT
      // endpoint isn't proxied through here - every route under
      // /api/email-comms/* targets a JSON FastAPI endpoint. If we get HTML,
      // something's wrong upstream.
      const text = await response.text();
      console.error('[email-proxy] non-JSON response', {
        status: response.status,
        contentType,
        preview: text.substring(0, 200),
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Email service returned non-JSON response',
          details:
            response.status >= 500
              ? 'Service temporarily unavailable'
              : text.substring(0, 500),
        },
        { status: response.status >= 500 ? 502 : response.status },
      );
    }

    const data = await response.json();
    if (response.status >= 500) {
      console.error(
        `[email-proxy] 5xx from ${url} (${response.status}):`,
        data?.detail || data?.error || data,
      );
    }
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    console.error(`[email-proxy] error proxying to ${url}:`, err);
    return NextResponse.json(
      { success: false, error: 'Failed to connect to email service' },
      { status: 502 },
    );
  }
}
