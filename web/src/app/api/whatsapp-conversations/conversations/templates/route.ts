/**
 * Templates Proxy
 *
 * GET  /api/whatsapp-conversations/conversations/templates → list templates
 * POST /api/whatsapp-conversations/conversations/templates → create template
 *
 * Channel routing (handled by proxyToPythonService):
 *   channel=personal → LAD_backend  /api/whatsapp-conversations/conversations/templates
 *   channel=waba     → Python svc   /api/conversations/templates
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/conversations/templates');
}

export async function POST(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/conversations/templates');
}
