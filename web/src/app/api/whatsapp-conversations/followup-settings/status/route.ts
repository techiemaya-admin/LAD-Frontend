/**
 * Followup Status Proxy
 * GET /api/whatsapp-conversations/followup-settings/status → Backend /api/followup-settings/status
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/followup-settings/status');
}
