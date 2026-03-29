/**
 * Conversations List Proxy
 * GET /api/whatsapp-conversations/conversations → Backend /api/conversations
 *
 * Routes based on channel parameter:
 * - channel=personal → LAD_backend Node.js (/api/whatsapp-conversations/conversations)
 * - channel=waba → LAD-WABA-Comms Python FastAPI (/api/conversations)
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService } from '../utils/python-proxy';

export async function GET(req: NextRequest) {
  // Preserve channel param: 'personal' → LAD_backend, 'waba' → Python FastAPI
  // Only default to 'waba' if no channel is specified
  const url = new URL(req.url);
  if (!url.searchParams.get('channel')) {
    url.searchParams.set('channel', 'waba');
  }
  const newReq = new NextRequest(url, req);

  // proxyToPythonService handles channel-based routing internally:
  // - personal → LAD_backend at /api/whatsapp-conversations/conversations
  // - waba → LAD-WABA-Comms at /api/conversations
  return proxyToPythonService(newReq, '', '/api/conversations');
}
