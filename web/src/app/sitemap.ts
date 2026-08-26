import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mrlads.com';

// Public marketing pages only. Blog posts can be appended here later once the
// post list is available from the content source.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes: { path: string; priority: number }[] = [
    { path: '', priority: 1 },
    { path: '/pricing', priority: 0.8 },
    { path: '/contact', priority: 0.7 },
    { path: '/blog', priority: 0.6 },
    { path: '/privacy-policy', priority: 0.3 },
    { path: '/terms-of-service', priority: 0.3 },
    { path: '/cookies-policy', priority: 0.3 },
    { path: '/account-deletion-policy', priority: 0.3 },
  ];

  return routes.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: 'weekly',
    priority,
  }));
}
