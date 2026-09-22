/**
 * Email Conversations proxy utilities.
 * Contacts/groups/templates → LAD-WABA-Comms (Python FastAPI)
 * Email sending             → LAD_backend (Node.js)
 */
import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthorizedTenantId } from '../../utils/tenant-scope';

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

  // Forward the Authorization header, lifting a cookie token into it when the
  // browser only sent a cookie. The session JWT lives in the `access_token`
  // cookie; LAD-WABA-Comms verifies a Bearer JWT and never reads cookies, so
  // passing the cookie through alone meant every /api/email/* call answered
  // 401 - which the Email channel swallowed as an empty list. Same
  // lift the WhatsApp proxy (python-proxy.ts) does.
  const auth = req.headers.get('Authorization') || req.headers.get('authorization');
  if (auth) {
    headers['Authorization'] = auth;
  } else {
    const cookieToken =
      req.cookies.get('access_token')?.value ||
      req.cookies.get('token')?.value;
    if (cookieToken) headers['Authorization'] = `Bearer ${cookieToken}`;
  }

  // The backend's jwtAuth also accepts the cookie directly; keep forwarding it
  // for the LAD_backend paths.
  const cookie = req.headers.get('cookie');
  if (cookie) headers['cookie'] = cookie;

  // Tenant scoping: only a tenant the caller is authorised for (super-admin
  // switch), never a bare client header.
  const authorizedTenant = resolveAuthorizedTenantId(req, { logLabel: 'email-conversations-proxy' });
  if (authorizedTenant) headers['X-Tenant-ID'] = authorizedTenant;
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
