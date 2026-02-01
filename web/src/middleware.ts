// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
// Update the import path if logger is in src/lib/logger relative to project root
import { logger } from './lib/logger';
import { validateAuthToken, getCurrentUser } from './utils/api-client';

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
  public: ['/', '/pricing', '/favicon.ico', '/api/recording-proxy', '/landing', '/contact'],
  
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
  '/onboarding',
  '/api/protected', // Mark all protected API routes with /api/protected prefix
];

/**
 * Check if a path is publicly accessible (no auth required)
 */
export function isOpenRoute(pathname: string): boolean {
  // First check if it matches any auth route - if so, it's not an open route
  const isAuthPath = AUTH_ROUTES.some(route => {
    if (route === pathname) return true;
    if (route.endsWith('/') && pathname.startsWith(route)) return true;
    if (!route.endsWith('/') && pathname.startsWith(route + '/')) return true;
    return false;
  });
  
  if (isAuthPath) return false;
  
  const allOpenRoutes = [
    ...OPEN_ROUTES.static,
    ...OPEN_ROUTES.auth,
    ...OPEN_ROUTES.public,
    ...OPEN_ROUTES.health,
  ];
  return allOpenRoutes.some(path => {
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
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  logger.debug('[Middleware] Processing request', { pathname });

  // 1. First check if it's a public/open route - allow access regardless of token
  if (isOpenRoute(pathname)) {
    logger.debug('[Middleware] Public route allowed', { pathname });
    return NextResponse.next();
  }

  // 2. Get authentication token from cookies
  const token = req.cookies.get('token')?.value || '';

  // 3. For protected routes, check if user has token
  if (!token) {
    logger.warn('[Middleware] No authentication token for protected route - Redirecting to login', { 
      pathname,
      isAuthRoute: isAuthRoute(pathname),
    });
    if (!isOpenRoute(pathname)) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect_url', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  // 4. Redirect authenticated users from auth pages to dashboard
  if (token && (pathname === '/login')) {
    try {
      const meAny: any = await getCurrentUser(token);
      logger.debug("[Middleware] User authenticated", { hasUser: !!meAny });
      // Use user.id from response (UUID format, not number)
      const userId = meAny?.user?.id || meAny?.id;
      if(userId){
        logger.debug('[Middleware] Authenticated user on auth page - Redirecting to dashboard', { pathname });
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    } catch (error) {
      logger.debug('[Middleware] Error fetching user, continuing...', { 
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // 5. Token exists - validate token by calling auth API
  try {
    const isTokenValid = await validateAuthToken(token);

    if (!isTokenValid) {
      logger.warn('[Middleware] Token validation failed - Invalid or expired token', { 
        pathname,
      });
      
      // Clear invalid token and redirect to login
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect_url', pathname);
      
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('token');
      response.cookies.delete('refresh_token');
      return response;
    }

    logger.debug('[Middleware] Token validation successful - Access granted', { pathname });
    return NextResponse.next();
  } catch (error) {
    logger.error('[Middleware] Token validation error', { 
      pathname,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    // If validation fails due to network error, still allow access with token
    // but log the error for monitoring
    return NextResponse.next();
  }
}

/**
 * Configure which routes the middleware should process
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images
     * This ensures middleware runs on ALL routes including /dalos and API routes
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};