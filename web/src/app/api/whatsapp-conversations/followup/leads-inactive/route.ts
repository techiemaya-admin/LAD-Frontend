/**
 * Inactive Leads Proxy
 * GET /api/whatsapp-conversations/followup/leads-inactive → Backend /followup/leads/inactive
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/followup/leads/inactive');
}
