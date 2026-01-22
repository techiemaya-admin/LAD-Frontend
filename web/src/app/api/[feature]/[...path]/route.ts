/**
 * Universal Feature Proxy Handler
 * 
 * PURPOSE:
 * Single unified proxy that routes all feature requests to backend.
 * Mirrors backend's feature-based architecture exactly.
 * 
 * SUPPORTED FEATURES:
 * - social-integration
 * - voice-agent
 * - apollo-leads
 * - lead-enrichment
 * - campaigns
 * - ai-icp-assistant
 * 
 * ROUTE PATTERN:
 * Frontend: /api/{feature}/{...path}
 * Backend:  /api/{feature}/{...path}
 * 
 * EXAMPLES:
 * /api/social-integration/linkedin/status → backend:/api/social-integration/linkedin/status
 * /api/voice-agent/calls/recent           → backend:/api/voice-agent/calls/recent
 * /api/apollo-leads/search                → backend:/api/apollo-leads/search
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../utils/backend';
function isMultipart(contentType: string | null | undefined): boolean {
  return Boolean(contentType && contentType.toLowerCase().includes('multipart/form-data'));
}
function isJson(contentType: string | null | undefined): boolean {
  return Boolean(contentType && contentType.toLowerCase().includes('application/json'));
}
async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ feature: string; path: string[] }> }
) {
  const resolvedParams = await params;
  const { feature, path } = resolvedParams;
  try {
    const backend = getBackendUrl();
    // Build backend URL
    const pathSegments = path || [];
    const fullPath = pathSegments.join('/');
    const searchParams = req.nextUrl.searchParams.toString();
    const url = `${backend}/api/${feature}/${fullPath}${searchParams ? `?${searchParams}` : ''}`;
    // Get auth token from cookie or Authorization header
    const token = req.cookies.get('access_token')?.value || 
                  req.headers.get('authorization')?.replace('Bearer ', '');
    const incomingContentType = req.headers.get('content-type');
    // Build headers
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Get request body for non-GET requests
    let body: BodyInit | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (isMultipart(incomingContentType)) {
        const originalFormData = await req.formData();
        const forwardedFormData = new FormData();
        for (const [key, value] of originalFormData.entries()) {
          forwardedFormData.append(key, value as any);
        }
        body = forwardedFormData;
        // Do NOT set Content-Type for multipart; fetch will add boundary.
      } else if (isJson(incomingContentType)) {
        headers['Content-Type'] = incomingContentType || 'application/json';
        body = await req.text();
      } else if (incomingContentType) {
        headers['Content-Type'] = incomingContentType;
        body = await req.arrayBuffer();
      } else {
        // No content-type; fall back to text.
        body = await req.text();
      }
    }
    // Forward request to backend
    const response = await fetch(url, {
      method: req.method,
      headers,
      body,
    });
    // Get response data
    const responseContentType = response.headers.get('content-type');
    const responseIsJson = isJson(responseContentType);
    // Return response
    if (!response.ok) {
      if (responseIsJson) {
        const data = await response.json().catch(() => ({}));
        return NextResponse.json(data, { status: response.status });
      }
      const dataText = await response.text().catch(() => '');
      return NextResponse.json(
        { error: dataText || 'Upstream request failed' },
        { status: response.status }
      );
    }
    if (responseIsJson) {
      const data = await response.json().catch(() => ({}));
      return NextResponse.json(data, { status: response.status });
    }
    const arrayBuffer = await response.arrayBuffer();
    const nextResponse = new NextResponse(arrayBuffer, { status: response.status });
    if (responseContentType) {
      nextResponse.headers.set('content-type', responseContentType);
    }
    const contentDisposition = response.headers.get('content-disposition');
    if (contentDisposition) {
      nextResponse.headers.set('content-disposition', contentDisposition);
    }
    return nextResponse;
  } catch (error: any) {
    console.error(`[/api/${resolvedParams.feature}] Error:`, error.message);
    return NextResponse.json(
      { error: `Failed to proxy to ${resolvedParams.feature} feature` },
      { status: 500 }
    );
  }
}
// Export all HTTP methods
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;