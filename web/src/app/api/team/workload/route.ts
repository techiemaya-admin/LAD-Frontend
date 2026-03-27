/**
 * Team Workload Proxy
 * GET /api/team/workload → Python /threads/team/workload
 *
 * Returns assignment counts per team member for workload balancing.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../whatsapp-conversations/utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/threads/team/workload');
}
