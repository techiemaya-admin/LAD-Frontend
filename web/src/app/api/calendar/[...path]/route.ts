/**
 * Calendar proxy.
 *
 * Forwards /api/calendar/<path> to LAD_backend /api/calendar/<path> — the
 * calendar sources, the meetings read off them and the reminders planned
 * against those meetings.
 *
 * The more specific /api/calendar/google/* and /api/calendar/microsoft/* routes
 * next to this one still win: they are the OAuth aliases onto the email
 * integration, and Next.js matches static segments before a catch-all.
 *
 * `x-tenant-id` is client-supplied and forgeable, so it is resolved through
 * utils/tenant-scope first: only the super admin may name a tenant other than
 * the one in their own signed token.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../utils/backend';
import { resolveAuthorizedTenantId } from '../../utils/tenant-scope';

function isJson(ct: string | null | undefined): boolean {
  return Boolean(ct && ct.toLowerCase().includes('application/json'));
}

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const resolved = await params;
  const tail = (resolved.path || []).join('/');
  const search = req.nextUrl.searchParams.toString();
  const url = `${getBackendUrl()}/api/calendar/${tail}${search ? `?${search}` : ''}`;

  try {
    const authHeader = req.headers.get('authorization');
    const cookieToken = req.cookies.get('token')?.value || req.cookies.get('access_token')?.value;
    const bearer = authHeader || (cookieToken ? `Bearer ${cookieToken}` : null);
    const tenantId = resolveAuthorizedTenantId(req, { logLabel: 'calendar' });

    const headers: Record<string, string> = {};
    if (bearer) headers['Authorization'] = bearer;
    if (tenantId) headers['X-Tenant-ID'] = tenantId;

    let body: BodyInit | undefined;
    const incomingContentType = req.headers.get('content-type');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      headers['Content-Type'] = isJson(incomingContentType)
        ? (incomingContentType as string)
        : 'application/json';
      body = await req.text();
      if (!body) body = '{}';
    }

    const upstream = await fetch(url, { method: req.method, headers, body, cache: 'no-store' });
    const contentType = upstream.headers.get('content-type') || 'application/json';
    const text = await upstream.text();
    return new NextResponse(text, { status: upstream.status, headers: { 'Content-Type': contentType } });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'calendar_unreachable', message: err?.message || 'Calendar service unreachable' },
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
