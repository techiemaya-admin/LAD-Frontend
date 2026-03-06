/**
 * WhatsApp Templates Proxy
 * GET /api/whatsapp-conversations/followup-settings/templates → Backend /api/followup-settings/templates
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/followup-settings/templates');
}
