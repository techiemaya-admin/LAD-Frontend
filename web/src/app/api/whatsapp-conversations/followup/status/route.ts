/**
 * Followup Status Proxy
 * GET /api/whatsapp-conversations/followup/status → Backend /followup/status
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/followup/status');
}
