/**
 * Template Debug Proxy
 * GET /api/whatsapp-conversations/conversations/templates/debug → Backend /api/conversations/templates/debug
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/conversations/templates/debug');
}
