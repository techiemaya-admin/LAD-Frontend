/**
 * Template Debug Proxy
 * GET /api/whatsapp-conversations/conversations/templates/debug → Backend /api/conversations/templates/debug
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../utils/python-proxy';

export async function GET(req: NextRequest) {
    // Force WABA channel routing to Python service (LAD-WABA-Comms)
  const url = new URL(req.url);
  url.searchParams.set('channel', 'waba');
  const newReq = new NextRequest(url, req);

  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), '/api/conversations/templates/debug');
}
