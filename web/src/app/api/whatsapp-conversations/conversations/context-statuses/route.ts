/**
 * Context Statuses Proxy
 * GET /api/whatsapp-conversations/conversations/context-statuses → Backend
 *
 * Routes based on channel parameter:
 * - channel=personal → LAD_backend Node.js
 * - channel=waba → LAD-WABA-Comms Python FastAPI (default if not specified)
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService } from '../../utils/python-proxy';

export async function GET(req: NextRequest) {
  // Preserve channel param, default to 'waba' for WABA-specific status checks
  const url = new URL(req.url);
  if (!url.searchParams.get('channel')) url.searchParams.set('channel', 'waba');
  const newReq = new NextRequest(url, req);

  // Let proxyToPythonService handle channel-based routing
  return proxyToPythonService(newReq, '', '/api/conversations/context-statuses');
}
