import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../utils/backend';

function isMultipart(contentType: string | null | undefined): boolean {
  return Boolean(contentType && contentType.toLowerCase().includes('multipart/form-data'));
}

function isJson(contentType: string | null | undefined): boolean {
  return Boolean(contentType && contentType.toLowerCase().includes('application/json'));
}

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ feature: string }> }
) {
  const resolvedParams = await params;
  const { feature } = resolvedParams;

  try {
    const backend = getBackendUrl();
    const searchParams = req.nextUrl.searchParams.toString();
    const url = `${backend}/api/${feature}${searchParams ? `?${searchParams}` : ''}`;

    const authHeaderToken = req.headers.get('authorization')?.replace('Bearer ', '');
    const token = authHeaderToken ||
      req.cookies.get('token')?.value ||
      req.cookies.get('access_token')?.value;
    const incomingContentType = req.headers.get('content-type');

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const tenantId = req.headers.get('x-tenant-id');
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }

    let body: BodyInit | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (isMultipart(incomingContentType)) {
        const originalFormData = await req.formData();
        const forwardedFormData = new FormData();
        for (const [key, value] of originalFormData.entries()) {
          forwardedFormData.append(key, value as any);
        }
        body = forwardedFormData;
      } else if (isJson(incomingContentType)) {
        headers['Content-Type'] = incomingContentType || 'application/json';
        body = await req.text();
      } else if (incomingContentType) {
        headers['Content-Type'] = incomingContentType;
        body = await req.arrayBuffer();
      } else {
        body = await req.text();
      }
    }

    const response = await fetch(url, {
      method: req.method,
      headers,
      body,
    });

    const responseContentType = response.headers.get('content-type');
    const responseIsJson = isJson(responseContentType);

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
    return NextResponse.json(
      { error: `Failed to proxy to ${resolvedParams.feature} feature` },
      { status: 500 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;