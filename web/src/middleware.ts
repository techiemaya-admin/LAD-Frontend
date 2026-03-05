// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { logger } from './lib/logger';
import { validateAuthToken, getCurrentUser } from './utils/api-client';
import { isOpenRoute, isAuthRoute } from './lib/routes';

/**
 * Main middleware function
 * Handles routing based on authentication status
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  logger.debug('[Middleware] Processing request', { pathname });

  // 1. Get authentication token from cookies (check both 'token' and 'access_token' for backward compatibility)
  const token = req.cookies.get('token')?.value || req.cookies.get('access_token')?.value || '';

  // 2. Redirect authenticated users from auth pages to dashboard/target
  if (token && (pathname === '/login' || pathname === '/register')) {
    try {
      // Create a simplified check or use existing one
      // We don't want to block too long, but we need to know if token is valid enough to redirect
      const meAny: any = await getCurrentUser(token);
      logger.debug("[Middleware] User authenticated check", { hasUser: !!meAny });
      const userId = meAny?.user?.id || meAny?.id;
      
      if(userId){
        const redirectParam = req.nextUrl.searchParams.get('redirect_url');
        // Prevent redirect loops if redirect_url is also login
        const targetPath = (redirectParam && !redirectParam.includes('/login')) ? redirectParam : '/dashboard';
        
        logger.debug('[Middleware] Authenticated user on auth page - Redirecting', { pathname, targetPath });
        return NextResponse.redirect(new URL(targetPath, req.url));
      }
    } catch (error) {
      logger.debug('[Middleware] Error checking user state, continuing to login page...', { 
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // If error (e.g. invalid token), we let them stay on /login to re-authenticate
    }
  }

  // 3. Check if it's a public/open route - allow access regardless of token
  if (isOpenRoute(pathname)) {
    logger.debug('[Middleware] Public route allowed', { pathname });
    return NextResponse.next();
  }

  // 4. For protected routes, check if user has token
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