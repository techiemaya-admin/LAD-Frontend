/**
 * Contacts Proxy
 * GET /api/whatsapp-conversations/contacts → Backend /api/contacts
 *
 * Routing:
 *   ?channel=personal → LAD_backend (Node.js) — wa_contacts table (all 6000+ contacts)
 *   ?channel=waba     → LAD-WABA-Comms (Python) — DEFAULT
 *
 * Supports: limit, offset, search, page query params
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../utils/python-proxy';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (!url.searchParams.get('channel')) url.searchParams.set('channel', 'waba');
  const newReq = new NextRequest(url, req);

  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), '/api/contacts');
}
