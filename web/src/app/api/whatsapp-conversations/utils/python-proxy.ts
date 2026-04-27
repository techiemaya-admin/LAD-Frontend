/**
 * Proxy utility for forwarding Next.js API requests to the appropriate backend:
 *   - channel=personal  → LAD_backend (Node.js) for personal WhatsApp (Baileys)
 *   - channel=waba      → LAD-WABA-Comms (Python FastAPI) for WhatsApp Business API
 *   - channel=linkedin  → LAD_backend (Node.js) for LinkedIn via Unipile
 *
 * The channel is determined by the `channel` query param or `X-WhatsApp-Channel` header.
 */
import { NextRequest, NextResponse } from 'next/server';

// ── Service URL resolvers ───────────────────────────────────────────

/** LAD_backend (Node.js) – personal WhatsApp via Baileys */
export function getBackendUrl(): string {
  return (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:3004'
  );
}

/** LAD-WABA-Comms (Python FastAPI) – WhatsApp Business API */
export function getWABAServiceUrl(): string {
  return (
    process.env.NEXT_PUBLIC_WHATSAPP_API_URL ||
    process.env.WABA_SERVICE_URL ||
    process.env.NEXT_PUBLIC_BNI_SERVICE_URL ||
    process.env.BNI_SERVICE_URL ||
    'http://localhost:8000'
  );
}

/** @deprecated – use channel-based routing; kept for backwards compat */
export function getWhatsAppServiceUrl(): string {
  return getWABAServiceUrl();
}

/**
 * Extract tenantId from a JWT token (base64 decode payload, no verification needed
 * since the Python service doesn't verify — it just needs the tenant routing hint).
 */
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

export async function proxyToPythonService(
  req: NextRequest,
  baseUrl: string,
  path: string,
): Promise<Response> {
  // ── Channel-based routing ──────────────────────────────────────
  // Read from req.url (raw URL) — nextUrl may cache the original URL even after
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
    // Personal WhatsApp → LAD_backend
    // Transform: /api/conversations → /api/whatsapp-conversations/conversations
    resolvedBaseUrl = getBackendUrl();
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
  } else {
    // Fallback: use the passed-in baseUrl (backwards compat)
    resolvedBaseUrl = baseUrl;
    resolvedPath = path;
  }

  const url = new URL(resolvedPath, resolvedBaseUrl);

  // Forward query parameters (except `channel` — consumed by proxy)
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

  // Forward authorization header if present
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    headers['Authorization'] = authHeader;

    // Extract tenant ID from JWT and forward as X-Tenant-ID header
    // so the Python service routes to the correct per-tenant database
    const token = authHeader.replace('Bearer ', '');
    const tenantId = extractTenantIdFromJwt(token);
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }
  }

  // Explicit X-Tenant-ID from client takes priority (supports tenant switching)
  const directTenantId = req.headers.get('x-tenant-id');
  if (directTenantId) {
    headers['X-Tenant-ID'] = directTenantId;
  }

  // Fallback: check cookie token aliases
  if (!headers['X-Tenant-ID']) {
    const cookieToken = req.cookies.get('access_token')?.value || req.cookies.get('token')?.value;
    if (cookieToken) {
      const tenantId = extractTenantIdFromJwt(cookieToken);
      console.log(`[python-proxy] Extracted tenantId from cookie: ${tenantId}`);
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId;
      }
    } else {
      console.log('[python-proxy] No access_token/token cookie found');
    }
  }

  console.log(`[python-proxy] channel=${channel}, baseUrl=${resolvedBaseUrl}, path=${resolvedPath}, tenant=${headers['X-Tenant-ID'] || 'NONE'}, trace=${debugTraceId || 'none'}`);

  const fetchOptions: RequestInit = {
    method: req.method,
    headers,
  };

  // Forward body for POST/PUT/PATCH.
  // Use req.text() rather than req.json()+JSON.stringify() to:
  //   1. Avoid double parse/reserialise overhead (important for large base64 payloads like PDFs)
  //   2. Prevent silent body loss — req.json() throws on any read error and the old catch
  //      block silently forwarded a body-less POST, causing FastAPI 422 on dict params.
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    try {
      const bodyText = await req.text();
      if (bodyText) {
        fetchOptions.body = bodyText;
      }
    } catch (bodyErr) {
      console.error(`[python-proxy] Failed to read request body for ${req.method} ${path}:`, bodyErr);
      // Body could not be read — proceed without it (FastAPI will return its own validation error)
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
