/**
 * Playground Proxy (base route)
 * GET  /api/whatsapp-conversations/playground         → not used directly
 * POST /api/whatsapp-conversations/playground         → Backend /api/playground/chat
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../utils/python-proxy';

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  url.searchParams.set('channel', 'waba');
  const newReq = new NextRequest(url, req);
  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), '/api/playground/chat');
}
