/**
 * Shared plumbing for the verified-identity auth routes (Google, WhatsApp
 * OTP) and the signup-application routes.
 *
 * Two jobs:
 *  1. Forward a JSON body to the backend and pass its answer through
 *     unchanged — status code included, so the page can key on 401/410/429.
 *  2. When the backend answers `mode: 'login'`, set the SAME `token` cookie
 *     /api/auth/login sets. A user who signs in with Google must land in the
 *     exact session a password user does; the cookie attributes are copied
 *     verbatim from that route for that reason.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../utils/backend';
import { logger } from '@/lib/logger';

export const SESSION_COOKIE = 'token';

export function setSessionCookie(res: NextResponse, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: false, // Allow JavaScript to read token for cross-domain API requests (same as /api/auth/login)
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/** The caller's session token, from wherever the app keeps it. */
export function callerToken(req: NextRequest): string | null {
  return (
    req.cookies.get('token')?.value ||
    req.cookies.get('access_token')?.value ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    null
  );
}

interface ForwardOptions {
  /** Extra headers to send to the backend (signup token, Authorization). */
  headers?: Record<string, string>;
  /** Log prefix. */
  tag: string;
}

/**
 * Forward `req`'s JSON body to `${backend}${path}` and return the backend's
 * JSON + status. If the backend answered a login (mode:'login' + token), the
 * session cookie is set on the response.
 */
export async function forwardJson(
  req: NextRequest,
  path: string,
  method: 'POST' | 'GET' | 'PATCH',
  { headers = {}, tag }: ForwardOptions,
): Promise<NextResponse> {
  const backend = getBackendUrl();
  if (!backend) {
    logger.error(`${tag} backend URL not configured`);
    return NextResponse.json({ success: false, error: 'Service unavailable.' }, { status: 503 });
  }
  let body: string | undefined;
  if (method !== 'GET') {
    body = JSON.stringify(await req.json().catch(() => ({})));
  }
  try {
    const resp = await fetch(`${backend}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        // Cloud Run puts the client on the first hop; the backend's per-IP
        // limiter reads it. Without this every visitor is the Next.js server.
        ...(req.headers.get('x-forwarded-for') ? { 'x-forwarded-for': req.headers.get('x-forwarded-for') as string } : {}),
        ...headers,
      },
      body,
      cache: 'no-store',
    });
    const data = await resp.json().catch(() => ({}));
    const out = NextResponse.json(data, { status: resp.status });
    const retryAfter = resp.headers.get('retry-after');
    if (retryAfter) out.headers.set('Retry-After', retryAfter);
    if (resp.ok && data?.mode === 'login' && typeof data?.token === 'string') {
      setSessionCookie(out, data.token);
    }
    return out;
  } catch (e: any) {
    logger.error(`${tag} backend unreachable`, { error: e?.message });
    return NextResponse.json({ success: false, error: 'Service unavailable.' }, { status: 502 });
  }
}
