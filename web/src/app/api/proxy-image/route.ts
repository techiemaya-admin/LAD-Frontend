/**
 * Image Proxy
 *
 * GET /api/proxy-image?url=<encoded URL>
 *
 * Streams an external image through our Next.js server so the browser fetches
 * it from same-origin. Solves the LinkedIn-CDN cross-origin block: requests to
 * media.licdn.com directly from the browser get rejected (403/blocked CORB),
 * but a server-side fetch works fine because LinkedIn doesn't gate image
 * downloads at the source.
 *
 * Security: only allowlisted hosts may be proxied to prevent SSRF — external
 * users could otherwise feed arbitrary internal URLs through our server.
 */

import { NextRequest, NextResponse } from 'next/server';

// Hosts permitted for proxying. Includes LinkedIn's CDN, Unipile-hosted media,
// and a few common social media CDNs we may serve avatars from later.
const ALLOWED_HOSTS = new Set<string>([
  'media.licdn.com',
  'static.licdn.com',
  'media-exp1.licdn.com',
  'media-exp2.licdn.com',
  'media-exp3.licdn.com',
  // Unipile occasionally hosts images directly
  'api.unipile.com',
  'api8.unipile.com',
  'cdn.unipile.com',
]);

function isHostAllowed(hostname: string): boolean {
  if (ALLOWED_HOSTS.has(hostname)) return true;
  // Wildcard match for licdn.com / linkedin.com subdomains (any region/dc shard)
  return /\.licdn\.com$/.test(hostname) || /\.linkedin\.com$/.test(hostname);
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('url');
  if (!target) {
    return NextResponse.json({ error: 'url query param required' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return NextResponse.json({ error: 'Only http(s) URLs allowed' }, { status: 400 });
  }

  if (!isHostAllowed(parsed.hostname)) {
    return NextResponse.json(
      { error: 'Host not allowed', host: parsed.hostname },
      { status: 403 }
    );
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      // Some CDNs gate on a User-Agent — send a normal one
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LAD-Avatar-Proxy/1.0)',
        Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
      },
      // Don't send cookies; this is a public-image proxy
      cache: 'no-store',
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: 'Upstream fetch failed', status: upstream.status },
        { status: upstream.status === 404 ? 404 : 502 }
      );
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Upstream did not return an image', contentType },
        { status: 415 }
      );
    }

    const bytes = await upstream.arrayBuffer();

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // 1-day browser cache + 1-week CDN cache, with stale-while-revalidate
        // so subsequent loads of the same conversation list are instant.
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
        // Avatars are immutable to a given URL — let the browser keep them
        // even across reloads as long as the URL hasn't changed.
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Proxy fetch error', message: err?.message || 'unknown' },
      { status: 502 }
    );
  }
}
