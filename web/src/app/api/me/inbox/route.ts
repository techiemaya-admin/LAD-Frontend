/**
 * User Inbox Proxy
 * GET /api/me/inbox → Python GET /api/inbox
 *
 * Returns all inbox messages for the currently authenticated user.
 * Messages appear here when a conversation is assigned with 'inbox' or 'both' delivery mode.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../whatsapp-conversations/utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/inbox');
}
