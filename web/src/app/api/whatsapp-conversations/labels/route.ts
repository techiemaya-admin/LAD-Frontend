/**
 * Labels Proxy
 *   ?channel=personal → WAPA (Node)   /api/whatsapp-conversations/labels
 *   else (waba)       → WABA (Python)  /api/labels
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl, getWAPAServiceUrl } from '../utils/python-proxy';

function routeLabels(req: NextRequest) {
  const url = new URL(req.url);
  // Personal WhatsApp (WAPA) labels live in the Node service, not the Python WABA one.
  if (url.searchParams.get('channel') === 'personal') {
    return proxyToPythonService(req, getWAPAServiceUrl(), '/api/whatsapp-conversations/labels');
  }
  if (!url.searchParams.get('channel')) url.searchParams.set('channel', 'waba');
  const newReq = new NextRequest(url, req);
  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), '/api/labels');
}

export async function GET(req: NextRequest) {
  return routeLabels(req);
}

export async function POST(req: NextRequest) {
  return routeLabels(req);
}
