import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getApiUrl } from '@/config/api';
export async function POST(req: NextRequest) {
  try {
    logger.debug('[/api/auth/login] Login attempt started');
    const body = await req.json().catch(() => ({}));
    const { email, password } = body || {};
    if (!email || !password) {
      logger.warn('[/api/auth/login] Missing email or password');
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }
    const backend = getApiUrl('/auth/login');
    logger.debug('orwarding to backend API', { backend });
    const resp = await fetch(`${backend}`, {
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
    const token: string | undefined = data?.token;
    const user = data?.user;
    logger.debug('[/api/auth/login] Token present in response', { hasToken: !!token });
    if (!token) {
      logger.error('[/api/auth/login] Token missing from backend response');
      return NextResponse.json({ error: 'Token missing from backend response' }, { status: 502 });
    }
    // Fetch user capabilities
    let capabilities = [];
    try {
      const capabilitiesResponse = await fetch(getApiUrl(`/user-capabilities/${user.id}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (capabilitiesResponse.ok) {
        const capabilitiesData = await capabilitiesResponse.json();
        capabilities = capabilitiesData.capabilities || [];
        logger.debug('Fetched user capabilities', { capabilities });
      } else {
        logger.warn('Failed to fetch user capabilities', { status: capabilitiesResponse.status });
      }
    } catch (error) {
      logger.error('Error fetching user capabilities', error);
    }
    const res = NextResponse.json({ 
      user: {
        ...user,
        capabilities
      }, 
      token 
    });
    // Set cookie with production-safe settings
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookies.set('token', token, {
      httpOnly: true,
      secure: isProduction, // Only require HTTPS in production
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    logger.debug('Cookie set with production-safe settings', { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/', maxAge: '7days', tokenLength: token.length });
    return res;
  } catch (e: any) {
    logger.error('Login endpoint error', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
