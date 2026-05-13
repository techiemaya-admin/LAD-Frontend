/**
 * Web Scraping Settings Proxy
 *
 * PATCH → Python WABA service  PATCH /api/settings/web-scraping
 *
 * Body: { "enabled": boolean, "urls": string[] }
 *
 * Saves the company website / blog URLs and the enable flag.
 * The Python service immediately scrapes the URLs on save and caches the
 * extracted text in chat_settings.metadata so the WABA AI pipeline can
 * inject it at reply time without a live HTTP call.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../../utils/python-proxy';

function withWabaChannel(req: NextRequest): NextRequest {
  const url = new URL(req.url);
  url.searchParams.set('channel', 'waba');
  return new NextRequest(url, req);
}

export async function PATCH(req: NextRequest) {
  return proxyToPythonService(
    withWabaChannel(req),
    getWABAServiceUrl(),
    '/api/settings/web-scraping',
  );
}
