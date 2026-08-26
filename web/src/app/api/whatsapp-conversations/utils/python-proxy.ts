/**
 * Proxy utility for forwarding Next.js API requests to the appropriate backend:
 *   - channel=personal  → LAD-WAPA-Comms (Node.js, Baileys; was LAD_backend pre-Phase 5)
 *   - channel=waba      → LAD-WABA-Comms (Python FastAPI) for WhatsApp Business API
 *   - channel=linkedin  → LAD_backend (Node.js) for LinkedIn via Unipile
 *   - channel=backend   → LAD_backend OR LAD-WAPA-Comms (path-aware: any path
 *                         starting with /api/personal-whatsapp/ goes to WAPA)
 *
 * The channel is determined by the `channel` query param or `X-WhatsApp-Channel` header.
 */
import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthorizedTenantId } from '../../utils/tenant-scope';

// ── Service URL resolvers ───────────────────────────────────────────

/** LAD_backend (Node.js) - everything except personal WhatsApp post-Phase 5 */
export function getBackendUrl(): string {
  return (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:3004'
  );
}

/** LAD-WAPA-Comms (Node.js) - personal WhatsApp via Baileys (Phase 5+) */
export function getWAPAServiceUrl(): string {
  return (
    process.env.NEXT_PUBLIC_WAPA_SERVICE_URL ||
    process.env.WAPA_SERVICE_URL ||
    process.env.WAPA_SERVICE_INTERNAL_URL ||
    'http://localhost:18080'
  );
}

/** LAD-WABA-Comms (Python FastAPI) - WhatsApp Business API */
export function getWABAServiceUrl(): string {
  return (
    process.env.NEXT_PUBLIC_WHATSAPP_API_URL ||
    process.env.WABA_SERVICE_URL ||
    process.env.NEXT_PUBLIC_BNI_SERVICE_URL ||
    process.env.BNI_SERVICE_URL ||
    'http://localhost:8000'
  );
}

/** @deprecated-use channel-based routing; kept for backwards compat */
export function getWhatsAppServiceUrl(): string {
  return getWABAServiceUrl();
}


export async function proxyToPythonService(
  req: NextRequest,
  baseUrl: string,
  path: string,
): Promise<Response> {
  // ── Channel-based routing ──────────────────────────────────────
  // Read from req.url (raw URL) - nextUrl may cache the original URL even after
  // a route rewrites it via new NextRequest(modifiedUrl, req).
  const rawUrl = new URL(req.url);
  const channel =
    rawUrl.searchParams.get('channel') ||
    req.nextUrl.searchParams.get('channel') ||
    req.headers.get('x-whatsapp-channel') ||
    'waba';  // default to waba (all our active integrations are WABA)

  let resolvedBaseUrl: string;
  let resolvedPath: string;

  if (channel === 'personal') {
    // Personal WhatsApp → LAD-WAPA-Comms (was LAD_backend pre-Phase 5)
    // Transform: /api/conversations → /api/whatsapp-conversations/conversations
    resolvedBaseUrl = getWAPAServiceUrl();
    resolvedPath = '/api/whatsapp-conversations' + path.replace(/^\/api/, '');
  } else if (channel === 'waba') {
    // WhatsApp Business API → LAD-WABA-Comms
    resolvedBaseUrl = getWABAServiceUrl();
    resolvedPath = path;
  } else if (channel === 'linkedin') {
    // LinkedIn → LAD_backend (Unipile LinkedIn Conversations)
    // Transform: /api/conversations → /api/linkedin-conversations/conversations
    resolvedBaseUrl = getBackendUrl();
    resolvedPath = '/api/linkedin-conversations' + path.replace(/^\/api/, '');
  } else if (channel === 'backend') {
    // Direct route - no path transformation. Path-aware destination:
    //   /api/personal-whatsapp/*  → LAD-WAPA-Comms  (Phase 5+)
    //   anything else             → LAD_backend     (LinkedIn, billing, etc.)
    resolvedBaseUrl = path.startsWith('/api/personal-whatsapp/')
      ? getWAPAServiceUrl()
      : getBackendUrl();
    resolvedPath = path;
  } else {
    // Fallback: use the passed-in baseUrl (backwards compat)
    resolvedBaseUrl = baseUrl;
    resolvedPath = path;
  }

  const url = new URL(resolvedPath, resolvedBaseUrl);

  // Forward query parameters (except `channel` - consumed by proxy)
  req.nextUrl.searchParams.forEach((value, key) => {
    if (key !== 'channel') {
      url.searchParams.set(key, value);
    }
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const debugTraceId = req.headers.get('x-debug-trace-id') || '';
  const debugClientTenant = req.headers.get('x-debug-client-tenant') || '';
  if (debugTraceId) headers['X-Debug-Trace-Id'] = debugTraceId;
  if (debugClientTenant) headers['X-Debug-Client-Tenant'] = debugClientTenant;

  // Forward the Authorization header, lifting a cookie token into it when the
  // browser only sent a cookie. Phase 5: WAPA (Node.js) actually verifies the
  // JWT, so its middleware needs a Bearer token even when auth arrived via cookie.
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    headers['Authorization'] = authHeader;
  } else {
    const cookieToken =
      req.cookies.get('access_token')?.value ||
      req.cookies.get('token')?.value;
    if (cookieToken) {
      headers['Authorization'] = `Bearer ${cookieToken}`;
    }
  }

  // Tenant scoping. Downstream services scope by X-Tenant-ID (and a few, e.g. the
  // account DELETE endpoint, read a tenant_id query param), and the Python WABA
  // service in particular TRUSTS whatever X-Tenant-ID it receives. So this proxy
  // must never let a caller name a tenant they aren't entitled to: an x-tenant-id
  // — or tenant_id query param — that differs from the caller's token tenant is
  // honoured only for the super admin (see utils/tenant-scope). This used to
  // forward the client header verbatim, letting any authenticated user read any
  // other tenant's conversations by setting one header.
  const authorizedTenant = resolveAuthorizedTenantId(req, { logLabel: 'python-proxy' });
  if (authorizedTenant) {
    headers['X-Tenant-ID'] = authorizedTenant;
    // Keep any tenant_id query param in lockstep with the header so it can't be
    // used as a second override channel for the endpoints that read it.
    if (url.searchParams.has('tenant_id')) {
      url.searchParams.set('tenant_id', authorizedTenant);
    }
  } else {
    // No resolvable tenant — strip any client-supplied tenant_id so nothing leaks.
    url.searchParams.delete('tenant_id');
  }

  console.warn(`[python-proxy] channel=${channel}, baseUrl=${resolvedBaseUrl}, path=${resolvedPath}, tenant=${headers['X-Tenant-ID'] || 'NONE'}, trace=${debugTraceId || 'none'}`);

  const fetchOptions: RequestInit = {
    method: req.method,
    headers,
  };

  // Forward body for POST/PUT/PATCH.
  // Use req.text() rather than req.json()+JSON.stringify() to:
  //   1. Avoid double parse/reserialise overhead (important for large base64 payloads like PDFs)
  //   2. Prevent silent body loss - req.json() throws on any read error and the old catch
  //      block silently forwarded a body-less POST, causing FastAPI 422 on dict params.
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    try {
      const bodyText = await req.text();
      if (bodyText) {
        fetchOptions.body = bodyText;
      }
    } catch (bodyErr) {
      console.error(`[python-proxy] Failed to read request body for ${req.method} ${path}:`, bodyErr);
      // Body could not be read - proceed without it (FastAPI will return its own validation error)
    }
  }

  try {
    const response = await fetch(url.toString(), fetchOptions);

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    if (!isJson) {
      const text = await response.text();
      console.error(`[python-proxy] Non-JSON response from ${url}:`, {
        status: response.status,
        contentType,
        preview: text.substring(0, 200)
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Conversation service returned non-JSON response',
          details: response.status >= 500 ? 'Service temporarily unavailable' : text.substring(0, 500)
        },
        { status: response.status >= 500 ? 502 : response.status },
      );
    }

    const data = await response.json();

    // Log Python-service 5xx errors so the actual exception message is visible
    // in Next.js dev logs (the global exception handler encodes it in `detail`).
    if (response.status >= 500) {
      console.error(
        `[python-proxy] 5xx from ${url} (${response.status}):`,
        data?.detail || data?.error || data
      );
    }

    const nextResponse = NextResponse.json(data, { status: response.status });
    nextResponse.headers.set('X-Debug-Trace-Id', debugTraceId || 'none');
    nextResponse.headers.set('X-Debug-Resolved-Tenant', headers['X-Tenant-ID'] || 'none');
    nextResponse.headers.set('X-Debug-Client-Tenant', debugClientTenant || 'none');
    return nextResponse;
  } catch (error) {
    console.error(`[python-proxy] Error proxying to ${url}:`, error);
    const errorResponse = NextResponse.json(
      { success: false, error: `Failed to connect to conversation service (${channel})` },
      { status: 502 },
    );
    errorResponse.headers.set('X-Debug-Trace-Id', debugTraceId || 'none');
    errorResponse.headers.set('X-Debug-Resolved-Tenant', headers['X-Tenant-ID'] || 'none');
    errorResponse.headers.set('X-Debug-Client-Tenant', debugClientTenant || 'none');
    return errorResponse;
  }
}
