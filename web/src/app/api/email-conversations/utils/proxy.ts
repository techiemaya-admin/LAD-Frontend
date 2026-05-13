/**
 * Email Conversations proxy utilities.
 * Contacts/groups/templates → LAD-WABA-Comms (Python FastAPI)
 * Email sending             → LAD_backend (Node.js)
 */
import { NextRequest, NextResponse } from 'next/server';

function getWABAUrl(): string {
  return (
    process.env.NEXT_PUBLIC_WHATSAPP_API_URL ||
    process.env.WABA_SERVICE_URL ||
    'http://localhost:8000'
  );
}

function getBackendUrl(): string {
  return (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:3004'
  );
}

function forwardHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  // Bearer token (set explicitly by some callers)
  const auth = req.headers.get('Authorization') || req.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;

  // Cookie-based auth (used by EmailTemplateEditor and other server-side callers
  // that use credentials:'include' instead of explicit Bearer tokens).
  // The backend's jwtAuth middleware accepts the token from either the
  // Authorization header OR a cookie named 'token'.
  const cookie = req.headers.get('cookie');
  if (cookie) headers['cookie'] = cookie;

  const tenant = req.headers.get('X-Tenant-ID');
  if (tenant) headers['X-Tenant-ID'] = tenant;
  return headers;
}

/** Proxy to WABA-Comms Python service (email contacts/groups/templates) */
export async function proxyToWABA(
  req: NextRequest,
  path: string,
  method?: string,
): Promise<NextResponse> {
  const url = `${getWABAUrl()}${path}`;
  const m = method || req.method;
  let body: string | undefined;
  if (m !== 'GET' && m !== 'DELETE') {
    body = await req.text();
  }
  try {
    const resp = await fetch(url, {
      method: m,
      headers: forwardHeaders(req),
      body,
    });
    const data = await resp.text();
    return new NextResponse(data, {
      status: resp.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

/** Proxy to LAD_backend Node.js service (email sending) */
export async function proxyToBackend(
  req: NextRequest,
  path: string,
  method?: string,
): Promise<NextResponse> {
  const url = `${getBackendUrl()}${path}`;
  const m = method || req.method;
  let body: string | undefined;
  if (m !== 'GET' && m !== 'DELETE') {
    body = await req.text();
  }
  try {
    const resp = await fetch(url, {
      method: m,
      headers: forwardHeaders(req),
      body,
    });
    const data = await resp.text();
    return new NextResponse(data, {
      status: resp.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
