/**
 * Conversations List Proxy
 * GET /api/whatsapp-conversations/conversations → Backend /api/conversations
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../utils/python-proxy';

export async function GET(req: NextRequest) {
  // Preserve channel param: 'personal' → LAD_backend (port 3004), 'waba' → Python FastAPI (port 8001)
  // Only default to 'waba' if no channel is specified
  const url = new URL(req.url);
  if (!url.searchParams.get('channel')) {
    url.searchParams.set('channel', 'waba');
  }
  const newReq = new NextRequest(url, req);

  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), '/api/conversations');
}
