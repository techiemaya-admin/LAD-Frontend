/**
 * Team Workload Proxy
 * GET /api/team/workload → /threads/team/workload
 *
 * Returns assignment counts per team member for workload balancing.
 *
 * Channel routing:
 *   channel=personal → LAD_backend (Node.js) personal WhatsApp service
 *   channel=waba     → LAD-WABA-Comms (Python) WhatsApp Business API service
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../whatsapp-conversations/utils/python-proxy';

export async function GET(req: NextRequest) {
  // channel param is forwarded as-is — proxyToPythonService handles routing
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/threads/team/workload');
}
