/**
 * Team Workload Proxy
 * GET /api/team/workload → Python /threads/team/workload
 *
 * Returns assignment counts per team member for workload balancing.
 *
 * Routes to: LAD-WABA-Comms (Python) - team workload is only available for WhatsApp Business API
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../whatsapp-conversations/utils/python-proxy';

export async function GET(req: NextRequest) {
  // Force WABA channel routing to Python service (LAD-WABA-Comms)
  // Team workload is only available in the Python service, not the Node backend
  const url = new URL(req.url);
  url.searchParams.set('channel', 'waba');
  const newReq = new NextRequest(url, req);

  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), '/threads/team/workload');
}
