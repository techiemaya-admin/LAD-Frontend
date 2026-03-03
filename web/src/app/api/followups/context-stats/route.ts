/**
 * Context Stats Proxy
 * GET /api/followups/context-stats → Python :8000 /followup/context-stats
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/followup/context-stats');
}
