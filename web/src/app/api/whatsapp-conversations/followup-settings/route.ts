/**
 * Followup Settings Proxy
 * GET  /api/whatsapp-conversations/followup-settings → Backend /api/followup-settings
 * PUT  /api/whatsapp-conversations/followup-settings → Backend /api/followup-settings
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../utils/python-proxy';

export async function GET(req: NextRequest) {
    // Force WABA channel routing to Python service (LAD-WABA-Comms)
  const url = new URL(req.url);
  url.searchParams.set('channel', 'waba');
  const newReq = new NextRequest(url, req);

  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), '/api/followup-settings');
}

export async function PUT(req: NextRequest) {
    // Force WABA channel routing to Python service (LAD-WABA-Comms)
  const url = new URL(req.url);
  url.searchParams.set('channel', 'waba');
  const newReq = new NextRequest(url, req);

  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), '/api/followup-settings');
}
