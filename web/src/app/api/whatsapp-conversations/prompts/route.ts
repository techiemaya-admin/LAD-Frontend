/**
 * Prompts Proxy
 * GET  /api/whatsapp-conversations/prompts → Backend /api/prompts
 * POST /api/whatsapp-conversations/prompts → Backend /api/prompts
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../utils/python-proxy';

export async function GET(req: NextRequest) {
    // Force WABA channel routing to Python service (LAD-WABA-Comms)
  const url = new URL(req.url);
  if (!url.searchParams.get('channel')) url.searchParams.set('channel', 'waba');
  const newReq = new NextRequest(url, req);

  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), '/api/prompts');
}

export async function POST(req: NextRequest) {
    // Force WABA channel routing to Python service (LAD-WABA-Comms)
  const url = new URL(req.url);
  if (!url.searchParams.get('channel')) url.searchParams.set('channel', 'waba');
  const newReq = new NextRequest(url, req);

  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), '/api/prompts');
}
