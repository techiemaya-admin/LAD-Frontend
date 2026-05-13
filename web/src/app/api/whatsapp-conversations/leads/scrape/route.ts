/**
 * Leads URL Scrape Proxy
 * POST /api/whatsapp-conversations/leads/scrape → Backend /api/leads/scrape
 *
 * Hands a target URL to the Python service which fetches the page (via Jina
 * Reader so JS-rendered SPAs work) and uses Claude to extract a list of
 * contacts that the Import Leads dialog can review and save.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export const maxDuration = 300; // scraping + LLM call can take 60–120s on large pages

export async function POST(req: NextRequest) {
  // Force WABA channel routing to Python service (LAD-WABA-Comms)
  const url = new URL(req.url);
  if (!url.searchParams.get('channel')) url.searchParams.set('channel', 'waba');
  const newReq = new NextRequest(url, req);

  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), '/api/leads/scrape');
}
