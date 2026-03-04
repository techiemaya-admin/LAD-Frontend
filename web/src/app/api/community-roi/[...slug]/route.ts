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
    // Handle async params in Next.js 15+
    const resolvedParams = await params;
    const slug = resolvedParams.slug || [];
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

    // Get auth token from cookies
    const token = req.cookies.get('token')?.value || '';

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add auth token if available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Forward other headers (exclude host-specific ones)
    const forwardHeaders = ['accept', 'accept-encoding', 'user-agent', 'x-tenant-id', 'x-workspace-id'];
    forwardHeaders.forEach((header) => {
      const value = req.headers.get(header);
      if (value) {
        headers[header] = value;
      }
    });

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers,
      credentials: 'include',
    };

    // Add body for methods that support it
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const contentType = req.headers.get('content-type');

      if (contentType?.includes('multipart/form-data')) {
        // Handle FormData for file uploads
        const formData = await req.formData();
        requestOptions.body = formData;
        // Remove Content-Type header to let fetch set the boundary
        delete (requestOptions.headers as any)['Content-Type'];
      } else {
        // For JSON and other content types, read the body once
        try {
          const body = await req.text();
          requestOptions.body = body;
          if (!contentType?.includes('application/json') && body) {
            headers['Content-Type'] = contentType || 'application/json';
          }
        } catch (error) {
          logger.warn('[community-roi-proxy] Failed to read request body', { error });
        }
      }
    }

    // Make the request to backend
    const response = await fetch(targetUrl, requestOptions);

    // Log response status
    logger.debug('[community-roi-proxy] Backend response', {
      status: response.status,
      statusText: response.statusText,
    });

    // Handle error responses
    if (!response.ok) {
      const errorData = await response.text().catch(() => '');
      logger.warn('[community-roi-proxy] Backend error response', {
        status: response.status,
        statusText: response.statusText,
        errorData: errorData.slice(0, 200), // Log first 200 chars
      });
    }

    // Return the response
    const data = await response.text();

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

export async function GET(req: NextRequest, params: RouteParams) {
  return handleRequest(req, params, 'GET');
}

export async function POST(req: NextRequest, params: RouteParams) {
  return handleRequest(req, params, 'POST');
}

export async function PUT(req: NextRequest, params: RouteParams) {
  return handleRequest(req, params, 'PUT');
}

export async function PATCH(req: NextRequest, params: RouteParams) {
  return handleRequest(req, params, 'PATCH');
}

export async function DELETE(req: NextRequest, params: RouteParams) {
  return handleRequest(req, params, 'DELETE');
}
