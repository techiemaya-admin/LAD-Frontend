import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mrlads.com';

// Allow crawlers on the public marketing surface; keep the authenticated app
// and API routes out of the index (they only ever redirect to /login for an
// anonymous crawler and would show up as soft-404s otherwise).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin',
          '/crm',
          '/campaigns',
          '/conversations',
          '/prospects',
          '/pipeline',
          '/call-logs',
          '/overview',
          '/instagram',
          '/follow-ups',
          '/community-roi',
          '/phone-numbers',
          '/make-call',
          '/wallet',
          '/settings',
          '/onboarding',
          '/tenant',
          '/payment-success',
          '/login',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
