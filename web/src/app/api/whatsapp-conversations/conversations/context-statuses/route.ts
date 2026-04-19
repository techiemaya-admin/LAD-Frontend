/**
 * Context Statuses Proxy
 * GET /api/whatsapp-conversations/conversations/context-statuses → Backend
 *
 * Channel routing handled inside proxyToPythonService:
 * - channel=personal → LAD_backend at /api/whatsapp-conversations/conversations/context-statuses
 * - channel=waba (default) → LAD-WABA-Comms at /api/conversations/context-statuses
 *
 * Pass canonical waba-style path so the proxy's path transform works:
 *   personal: /api/whatsapp-conversations + /conversations/context-statuses
 *   waba:     /api/conversations/context-statuses (unchanged)
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWABAServiceUrl(), '/api/conversations/context-statuses');
}
