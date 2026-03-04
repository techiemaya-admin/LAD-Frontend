/**
 * Proxy utility for forwarding Next.js API requests to the BNI Conversation Service (Python FastAPI).
 * See: /comms-service-guidelines.md for full API documentation
 */
import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_SERVICE_URL = process.env.NEXT_PUBLIC_BNI_SERVICE_URL
  || process.env.BNI_SERVICE_URL
  || 'https://bni-conversation-service-160078175457.us-central1.run.app';

export function getWhatsAppServiceUrl(): string {
  return DEFAULT_SERVICE_URL;
}

export async function proxyToPythonService(
  req: NextRequest,
  baseUrl: string,
  path: string,
): Promise<Response> {
  const url = new URL(path, baseUrl);

  // Forward query parameters
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Forward authorization header if present
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  const fetchOptions: RequestInit = {
    method: req.method,
    headers,
  };

  // Forward body for POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    try {
      const body = await req.json();
      fetchOptions.body = JSON.stringify(body);
    } catch {
      // No body or invalid JSON — proceed without body
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
          error: 'BNI service returned non-JSON response',
          details: response.status >= 500 ? 'Service temporarily unavailable' : text.substring(0, 500)
        },
        { status: response.status >= 500 ? 502 : response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`[python-proxy] Error proxying to ${url}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to connect to BNI service' },
      { status: 502 },
    );
  }
}
