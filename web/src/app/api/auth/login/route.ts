import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../utils/backend';
import { logger } from '@/lib/logger';

function extractToken(data: any): string | undefined {
  const candidates = [
    data?.token,
    data?.access_token,
    data?.accessToken,
    data?.authToken,
    data?.data?.token,
    data?.data?.access_token,
    data?.data?.accessToken,
    data?.data?.authToken,
    data?.result?.token,
    data?.result?.access_token,
    data?.result?.accessToken,
    data?.result?.authToken,
  ];

  const token = candidates.find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  return token?.trim();
}

function extractUser(data: any) {
  return data?.user ?? data?.data?.user ?? data?.result?.user ?? data?.profile ?? null;
}

export async function POST(req: NextRequest) {
  try {
    logger.debug('[/api/auth/login] Login attempt started');
    const body = await req.json().catch(() => ({}));
    const { email, password } = body || {};
    if (!email || !password) {
      logger.warn('[/api/auth/login] Missing email or password');
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }
    const backend = getBackendUrl();
    logger.debug('[/api/auth/login] Forwarding to backend API', { backend });
    const resp = await fetch(`${backend}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    logger.debug('[/api/auth/login] Backend response received', { status: resp.status });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      logger.warn('[/api/auth/login] Backend returned error', { status: resp.status });
      return NextResponse.json(data, { status: resp.status });
    }

    const token = extractToken(data);
    const user = extractUser(data);
    logger.debug('[/api/auth/login] Token present in response', { hasToken: !!token });
    if (!token) {
      logger.error('[/api/auth/login] Token missing from backend response');
      return NextResponse.json({ error: 'Token missing from backend response' }, { status: 502 });
    }

    // The backend login response already includes `capabilities` — the extra
    // /api/user-capabilities round trip here doubled login latency for no new
    // data, so it was removed.
    const res = NextResponse.json({
      user: {
        ...user,
        capabilities: user?.capabilities || [],
      },
      token,
    });

    // Set both compatibility cookies so the rest of the app can read auth
    // whether it expects `token` or the older `access_token` convention.
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: false, // Allow JavaScript to read token for cross-domain API requests
      secure: isProduction, // Only require HTTPS in production
      sameSite: isProduction ? 'none' : 'lax', // Use 'none' in production to allow cross-site redirects
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    } as const;

    res.cookies.set('token', token, cookieOptions);
    res.cookies.set('access_token', token, cookieOptions);

    logger.debug('Cookie set with production-safe settings', {
      httpOnly: false,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      maxAge: '7days',
      tokenLength: token.length,
    });
    return res;
  } catch (e: any) {
    logger.error('Login endpoint error', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
