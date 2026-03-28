/**
 * Team Workload Proxy
 * GET /api/threads/team/workload → Python GET /threads/team/workload
 *
 * Returns assignment workload per team member.
 * Used by the AssignmentPanel to show team member availability when assigning conversations.
 *
 * Routes to: LAD-WABA-Comms (Python) - assignment management
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../whatsapp-conversations/utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/threads/team/workload');
}
