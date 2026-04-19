import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Community-ROI API Proxy
 * Forwards all community-roi requests to the dedicated backend
 * Handles: GET, POST, PUT, PATCH, DELETE
 */

const getCommunityROIBackend = () => {
  // Try environment variable first
  const envUrl = process.env.NEXT_PUBLIC_COMMUNITY_API_URL;
  if (envUrl) {
    return envUrl;
  }

  // Fallback to alternate Cloud Run service
  return 'https://lad-backend-develop-160078175457.us-central1.run.app';
};

interface RouteParams {
  params: {
    slug: string[];
  };
}

async function handleRequest(
  req: NextRequest,
  { params }: RouteParams,
  method: string
) {
  try {
    // params is already resolved by the time it reaches here
    const slug = params.slug || [];
    const pathSegments = slug.join('/');
    const backendUrl = getCommunityROIBackend();
    const fullUrl = `${backendUrl}/api/community-roi/${pathSegments}`;

    // Preserve query parameters
    const searchParams = req.nextUrl.searchParams.toString();
    const targetUrl = searchParams ? `${fullUrl}?${searchParams}` : fullUrl;

    logger.debug('[community-roi-proxy] Forwarding request', {
      method,
      from: `${req.nextUrl.pathname}${searchParams ? `?${searchParams}` : ''}`,
      to: targetUrl,
    });

    // Get auth token from request Authorization header or cookies
    let token = '';
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    } else {
      token = req.cookies.get('token')?.value || '';
    }

    logger.debug('[community-roi-proxy] Auth token', {
      hasAuthHeader: !!authHeader,
      hasToken: !!token,
      tokenLength: token.length,
    });

    // Prepare headers - preserve original content-type for FormData/multipart uploads
    const headers: Record<string, string> = {};

    // Copy content-type from request if present (important for FormData/multipart)
    const contentType = req.headers.get('content-type');
    if (contentType) {
      headers['Content-Type'] = contentType;
    } else if (['POST', 'PUT', 'PATCH'].includes(method)) {
      // Only set default JSON content-type for non-FormData requests
      headers['Content-Type'] = 'application/json';
    }

    // Add auth token if available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      logger.debug('[community-roi-proxy] Forwarding token to backend');
    } else {
      logger.warn('[community-roi-proxy] No auth token found');
    }

    // Forward other headers (exclude host-specific ones and content-type which we handle above)
    const forwardHeaders = ['accept', 'accept-encoding', 'user-agent', 'x-tenant-id', 'x-workspace-id'];
    forwardHeaders.forEach((header) => {
      const value = req.headers.get(header);
      if (value) {
        headers[header] = value;
      }
    });

    logger.debug('[community-roi-proxy] Request headers', {
      contentType: headers['Content-Type'],
      hasAuth: !!headers['Authorization'],
    });

    // Build the request - use the original request to avoid body-reading issues
    const requestInit: RequestInit = {
      method,
      headers,
    };

    // For methods with body, clone and forward the original request body
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        // Clone the request to avoid consuming the body
        const clonedReq = req.clone();
        const body = await clonedReq.arrayBuffer();
        if (body && body.byteLength > 0) {
          requestInit.body = body;
        }
      } catch (error) {
        logger.warn('[community-roi-proxy] Failed to read request body', {
          error: error instanceof Error ? error.message : 'Unknown error',
          method,
        });
      }
    }

    // Make the request to backend
    const response = await fetch(targetUrl, requestInit);

    // Read response body once to avoid reuse issues
    const data = await response.text();

    // Log response status
    logger.debug('[community-roi-proxy] Backend response', {
      status: response.status,
      statusText: response.statusText,
      hasData: !!data,
    });

    // Handle error responses
    if (!response.ok) {
      logger.warn('[community-roi-proxy] Backend error response', {
        status: response.status,
        statusText: response.statusText,
        errorData: data.slice(0, 200), // Log first 200 chars
      });
    }

    // Return the response
    return new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error) {
    logger.error('[community-roi-proxy] Proxy error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      method,
    });

    return NextResponse.json(
      {
        error: 'Proxy error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  return handleRequest(req, { params: resolvedParams }, 'GET');
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  return handleRequest(req, { params: resolvedParams }, 'POST');
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  return handleRequest(req, { params: resolvedParams }, 'PUT');
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  return handleRequest(req, { params: resolvedParams }, 'PATCH');
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  return handleRequest(req, { params: resolvedParams }, 'DELETE');
}
