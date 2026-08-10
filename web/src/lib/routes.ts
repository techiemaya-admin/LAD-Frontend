/**
 * Shared route configuration and utilities
 * Used by both middleware (Edge runtime) and client components
 */

/**
 * OPEN ROUTES - No authentication required
 * These paths are accessible to anyone (authenticated or not)
 */
export const OPEN_ROUTES = {
  // Static & Framework
  static: ['/_next', '/public'],
  
  // Auth pages & endpoints
  auth: ['/login', '/register', '/forgot-password', '/api/auth', '/api/webhooks'],
  
  // Public pages
  public: ['/', '/pricing', '/favicon.ico', '/api/recording-proxy', '/landing', '/contact', '/privacy-policy', '/terms-of-service', '/cookies-policy', '/account-deletion-policy',
    // Founding-group landing page, its short /apply entry point, and the route
    // handler the form posts to. All must be open: the whole point is that a
    // stranger clicking a link in an InMail can reach them.
    '/community', '/apply', '/api/community-signup'],
  
  // Health checks & public APIs
  health: ['/api/health'],
};

/**
 * AUTH ROUTES - Authentication required
 * These paths require a valid access token
 */
export const AUTH_ROUTES = [
  '/overview',
  '/campaigns',
  '/call-logs',
  '/conversations',
  '/phone-numbers',
  '/settings',
  '/billing',
  '/wallet',
  '/make-call',
  '/pipeline',
  '/crm',
  '/prospects',
  '/onboarding',
  '/community-roi',
  '/follow-ups',
  '/instagram', // Instagram management (accounts, AI replies, comments, goals)
  '/admin', // Internal admin tooling (platform observability monitor, blog, submissions) — super-admin gated
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
export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(route => {
    if (route === pathname) return true;
    if (route.endsWith('/') && pathname.startsWith(route)) return true;
    if (!route.endsWith('/') && pathname.startsWith(route + '/')) return true;
    return false;
  });
}
