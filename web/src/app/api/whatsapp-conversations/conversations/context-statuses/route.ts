/**
 * Context Statuses Proxy
 * GET /api/whatsapp-conversations/conversations/context-statuses → Backend
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function GET(req: NextRequest) {
    // Force WABA channel routing to Python service (LAD-WABA-Comms)
  const url = new URL(req.url);
  if (!url.searchParams.get('channel')) url.searchParams.set('channel', 'waba');
  const newReq = new NextRequest(url, req);

  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), '/api/conversations/context-statuses');
}
