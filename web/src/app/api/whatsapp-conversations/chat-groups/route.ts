/**
 * Chat Groups Proxy
 *
 * Routing:
 *   ?channel=personal → LAD_backend (Node.js) personal WhatsApp service
 *   ?channel=waba     → LAD-WABA-Comms (Python FastAPI) — DEFAULT
 *
 * GET  /api/whatsapp-conversations/chat-groups
 * POST /api/whatsapp-conversations/chat-groups
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../utils/python-proxy';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  // Only default to waba if no explicit channel is set
  if (!url.searchParams.get('channel')) {
    if (!url.searchParams.get('channel')) url.searchParams.set('channel', 'waba');
  }
  const newReq = new NextRequest(url, req);
  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), '/api/chat-groups');
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  if (!url.searchParams.get('channel')) {
    if (!url.searchParams.get('channel')) url.searchParams.set('channel', 'waba');
  }
  const newReq = new NextRequest(url, req);
  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), '/api/chat-groups');
}
