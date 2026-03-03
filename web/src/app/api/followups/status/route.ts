/**
 * Followup Status Proxy
 * GET /api/followups/status → Python :8000 /followup/status
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/followup/status');
}
