// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { logger } from './web/src/lib/logger';

function isPublicPath(pathname: string): boolean {
  // Only these paths are public (no authentication required)
  const publicPaths = [
    '/_next',
    '/public',
    '/api/webhooks',
    '/api/auth',
    '/api/recording-proxy',
    '/login',
    '/register',
    '/forgot-password',
    '/favicon.ico',
  ];

  return publicPaths.some(path => {
    if (path === pathname) return true;
    if (path.endsWith('/') && pathname.startsWith(path)) return true;
    if (!path.endsWith('/') && pathname.startsWith(path + '/')) return true;
    if (!path.endsWith('/') && pathname.startsWith(path)) return true;
    return false;
  });
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  logger.debug('[Middleware] Processing', { pathname });

  // Allow public paths
  if (isPublicPath(pathname)) {
    logger.debug('[Middleware] Public path allowed', { pathname });
    return NextResponse.next();
  }

  // Check for authentication token
  const token = req.cookies.get('access_token')?.value;

  if (!token) {
    logger.warn('[Middleware] No token - Redirecting to login', { pathname });
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(loginUrl);
  }

  logger.debug('[Middleware] Token found - Access granted', { pathname });
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};