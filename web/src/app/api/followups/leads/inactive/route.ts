/**
 * Inactive Leads Proxy
 * GET /api/followups/leads/inactive → Python :8000 /followup/leads/inactive
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/followup/leads/inactive');
}
