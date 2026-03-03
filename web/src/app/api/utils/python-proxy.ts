/**
 * Python Service Proxy Utility
 *
 * Reusable function for proxying Next.js API route requests
 * to Python microservices (WhatsApp conversation service, followup scheduler).
 *
 * Responsibilities:
 * - Extract auth token from cookies/Authorization header
 * - Decode JWT to extract tenant_id (from auth context, never client input)
 * - Inject X-Tenant-ID header into forwarded requests
 * - Forward method, body, query params, content-type
 */
import { NextRequest, NextResponse } from 'next/server';
import { logger as baseLogger } from '@/lib/logger';

const logger = baseLogger.child('PythonProxy');

/**
 * Decode a JWT token to extract the payload (without verification).
 * Verification is handled by the Python service.
 */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Extract auth token from the incoming request
 */
function extractToken(req: NextRequest): string | null {
  return (
    req.cookies.get('token')?.value ||
    req.cookies.get('access_token')?.value ||
    req.headers.get('authorization')?.replace('Bearer ', '') ||
    null
  );
}

/**
 * Extract tenant_id from JWT token payload.
 * Looks for common claim names: tenant_id, tenantId, organization_id, org_id
 */
function extractTenantId(token: string): string | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return (
    payload.tenant_id ||
    payload.tenantId ||
    payload.organization_id ||
    payload.org_id ||
    null
  );
}

export interface ProxyOptions {
  timeout?: number;
  injectTenantId?: boolean;
}

/**
 * Proxy a Next.js API request to a Python microservice.
 *
 * @param req - The incoming Next.js request
 * @param serviceBaseUrl - The Python service base URL (e.g., http://localhost:8000)
 * @param path - The path to forward to on the Python service
 * @param options - Optional configuration
 */
export async function proxyToPythonService(
  req: NextRequest,
  serviceBaseUrl: string,
  path: string,
  options: ProxyOptions = {}
): Promise<NextResponse> {
  const { timeout = 30000, injectTenantId = true } = options;

  try {
    // Build target URL
    const searchParams = req.nextUrl.searchParams.toString();
    const url = `${serviceBaseUrl}${path}${searchParams ? `?${searchParams}` : ''}`;

    // Extract auth token
    const token = extractToken(req);

    // Build headers
    const headers: Record<string, string> = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;

      // Inject tenant_id from JWT into X-Tenant-ID header
      if (injectTenantId) {
        const tenantId = extractTenantId(token);
        if (tenantId) {
          headers['X-Tenant-ID'] = tenantId;
        } else {
          logger.warn('No tenant_id found in JWT token');
        }
      }
    }

    // Forward content-type
    const contentType = req.headers.get('content-type');
    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    // Get request body for non-GET requests
    let body: BodyInit | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (contentType?.includes('application/json')) {
        body = await req.text();
      } else if (contentType?.includes('multipart/form-data')) {
        const formData = await req.formData();
        const forwarded = new FormData();
        for (const [key, value] of formData.entries()) {
          forwarded.append(key, value as any);
        }
        body = forwarded;
        delete headers['Content-Type']; // Let fetch set boundary
      } else {
        body = await req.text();
      }
    }

    // Make the proxied request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: req.method,
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Parse response
    const responseContentType = response.headers.get('content-type');
    const isJson = responseContentType?.includes('application/json');

    if (!response.ok) {
      if (isJson) {
        const data = await response.json().catch(() => ({}));
        return NextResponse.json(data, { status: response.status });
      }
      const text = await response.text().catch(() => '');
      return NextResponse.json(
        { error: text || 'Upstream service error' },
        { status: response.status }
      );
    }

    if (isJson) {
      const data = await response.json().catch(() => ({}));
      return NextResponse.json(data, { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();
    const nextResponse = new NextResponse(arrayBuffer, { status: response.status });
    if (responseContentType) {
      nextResponse.headers.set('content-type', responseContentType);
    }
    return nextResponse;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      logger.error('Python service request timed out', { path });
      return NextResponse.json(
        { error: 'Service request timed out' },
        { status: 504 }
      );
    }

    logger.error('Python service proxy error', error);
    return NextResponse.json(
      { error: 'Failed to connect to service' },
      { status: 502 }
    );
  }
}

/**
 * Get the WhatsApp conversation service URL from environment
 */
export function getWhatsAppServiceUrl(): string {
  return process.env.WHATSAPP_SERVICE_URL || 'http://localhost:8000';
}

/**
 * Get the followup scheduler service URL from environment
 */
export function getFollowupServiceUrl(): string {
  return process.env.FOLLOWUP_SERVICE_URL || 'http://localhost:8001';
}
