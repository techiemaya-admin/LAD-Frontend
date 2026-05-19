/**
 * Instagram Conversations Proxy
 *
 * Forwards any /api/instagram-conversations/<path> request to the standalone
 * LAD-Instagram-Comms FastAPI service (default localhost:8002). Mirrors the
 * WABA proxy pattern.
 *
 * The Bearer token from the browser is passed through so the Python service
 * can decode the tenant_id from it (see api/_tenant.py). The X-Tenant-ID
 * header is forwarded too in case the caller wants to override.
 */
import { NextRequest, NextResponse } from 'next/server';

function getInstagramServiceUrl(): string {
  return (
    process.env.NEXT_PUBLIC_INSTAGRAM_API_URL ||
    process.env.INSTAGRAM_SERVICE_URL ||
    'http://localhost:8002'
  );
}

function isMultipart(ct: string | null | undefined): boolean {
  return Boolean(ct && ct.toLowerCase().includes('multipart/form-data'));
}
function isJson(ct: string | null | undefined): boolean {
  return Boolean(ct && ct.toLowerCase().includes('application/json'));
}

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const resolved = await params;
  const pathSegments = resolved.path || [];
  const tail = pathSegments.join('/');
  const baseUrl = getInstagramServiceUrl();
  const search = req.nextUrl.searchParams.toString();
  const url = `${baseUrl}/api/${tail}${search ? `?${search}` : ''}`;

  try {
    const authHeader = req.headers.get('authorization');
    const cookieToken = req.cookies.get('token')?.value || req.cookies.get('access_token')?.value;
    const bearer = authHeader || (cookieToken ? `Bearer ${cookieToken}` : null);
    const tenantId = req.headers.get('x-tenant-id');

    const headers: Record<string, string> = {};
    if (bearer) headers['Authorization'] = bearer;
    if (tenantId) headers['X-Tenant-ID'] = tenantId;

    let body: BodyInit | undefined;
    const incomingContentType = req.headers.get('content-type');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (isMultipart(incomingContentType)) {
        const fd = await req.formData();
        const forward = new FormData();
        for (const [k, v] of fd.entries()) forward.append(k, v as any);
        body = forward;
      } else if (isJson(incomingContentType)) {
        headers['Content-Type'] = incomingContentType || 'application/json';
        body = await req.text();
      } else if (incomingContentType) {
        headers['Content-Type'] = incomingContentType;
        body = await req.arrayBuffer();
      }
    }

    const upstream = await fetch(url, {
      method: req.method,
      headers,
      body,
      cache: 'no-store',
    });

    const contentType = upstream.headers.get('content-type') || 'application/json';
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': contentType },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Instagram service unreachable' },
      { status: 502 },
    );
  }
}

export {
  handler as GET,
  handler as POST,
  handler as PATCH,
  handler as PUT,
  handler as DELETE,
};
