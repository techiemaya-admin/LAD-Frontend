// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
// Update the import path if logger is in src/lib/logger relative to project root
import { logger } from './src/lib/logger';

/**
 * OPEN ROUTES - No authentication required
 * These paths are accessible to anyone (authenticated or not)
 */
const OPEN_ROUTES = {
  // Static & Framework
  static: ['/_next', '/public'],
  
  // Auth pages & endpoints
  auth: ['/login', '/register', '/forgot-password', '/api/auth', '/api/webhooks'],
  
  // Public pages
  public: ['/', '/pricing', '/favicon.ico', '/api/recording-proxy', '/landing', '/onboarding'],
  
  // Health checks & public APIs
  health: ['/api/health'],
};

/**
 * AUTH ROUTES - Authentication required
 * These paths require a valid access token
 */
const AUTH_ROUTES = [
  '/dashboard',
  '/campaigns',
  '/call-logs',
  '/conversations',
  '/phone-numbers',
  '/settings',
  '/billing',
  '/wallet',
  '/make-call',
  '/pipeline',
  '/api/protected', // Mark all protected API routes with /api/protected prefix
];

/**
 * Check if a path is publicly accessible (no auth required)
 */
function isOpenRoute(pathname: string): boolean {
  const allOpenRoutes = [
    ...OPEN_ROUTES.static,
    ...OPEN_ROUTES.auth,
    ...OPEN_ROUTES.public,
    ...OPEN_ROUTES.health,
  ];

  return allOpenRoutes.some(path => {
    if (path === pathname) return true;
    if (path.endsWith('/') && pathname.startsWith(path)) return true;
    if (!path.endsWith('/') && pathname.startsWith(path + '/')) return true;
    if (!path.endsWith('/') && pathname.startsWith(path)) return true;
    return false;
  });
}

/**
 * Check if a path requires authentication
 */
function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(route => {
    if (route === pathname) return true;
    if (route.endsWith('/') && pathname.startsWith(route)) return true;
    if (!route.endsWith('/') && pathname.startsWith(route + '/')) return true;
    return false;
  });
}

/**
 * Main middleware function
 * Handles routing based on authentication status
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  logger.debug('[Middleware] Processing request', { pathname });

  // 1. Check for authentication token
  const token = req.cookies.get('access_token')?.value;

  // 2. Redirect authenticated users from landing page to dashboard
  if (token && (pathname === '/' || pathname === '/landing')) {
    logger.debug('[Middleware] Authenticated user on landing page - Redirecting to dashboard', { pathname });
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // 3. Allow open routes (no auth required)
  if (isOpenRoute(pathname)) {
    logger.debug('[Middleware] Open route allowed', { pathname });
    return NextResponse.next();
  }

  // 4. If no token on protected route, redirect to login
  if (!token) {
    logger.warn('[Middleware] No authentication token - Redirecting to login', { 
      pathname,
      isAuthRoute: isAuthRoute(pathname),
    });
    
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Token exists - allow access
  logger.debug('[Middleware] Authentication valid - Access granted', { pathname });
  return NextResponse.next();
}

/**
 * Configure which routes the middleware should process
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|public).*)',
  ],
};