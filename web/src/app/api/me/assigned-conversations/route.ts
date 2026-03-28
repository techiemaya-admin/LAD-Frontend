/**
 * My Assigned Conversations Proxy
 * GET /api/me/assigned-conversations → Python GET /threads/me/assigned-conversations
 *
 * Returns all conversations assigned to the currently authenticated user.
 * Used by the UserInbox component and My Assignments view.
 *
 * Routes to: LAD-WABA-Comms (Python) - assignment management
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../whatsapp-conversations/utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/threads/me/assigned-conversations');
}
