// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

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

  console.log('[Middleware] Processing:', pathname);

  // Allow public paths
  if (isPublicPath(pathname)) {
    console.log('[Middleware] Public path allowed:', pathname);
    return NextResponse.next();
  }

  // Check for authentication token
  const token = req.cookies.get('access_token')?.value;

  if (!token) {
    console.log('[Middleware] ⛔ No token - Redirecting to login from:', pathname);
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(loginUrl);
  }

  console.log('[Middleware] ✅ Token found - Access granted to:', pathname);
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