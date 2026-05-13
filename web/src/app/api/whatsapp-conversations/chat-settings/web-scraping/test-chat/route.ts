/**
 * Test Chat for Web Scraping Proxy
 *
 * POST → Python WABA service  POST /api/settings/web-scraping/test-chat
 *
 * Body: { "message": string, "history": [{role, content}] }
 *
 * Lets the user preview how Claude would answer customer questions using the
 * cached scraped website content for their tenant.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../../../utils/python-proxy';

function withWabaChannel(req: NextRequest): NextRequest {
  const url = new URL(req.url);
  url.searchParams.set('channel', 'waba');
  return new NextRequest(url, req);
}

export async function POST(req: NextRequest) {
  return proxyToPythonService(
    withWabaChannel(req),
    getWABAServiceUrl(),
    '/api/settings/web-scraping/test-chat',
  );
}
