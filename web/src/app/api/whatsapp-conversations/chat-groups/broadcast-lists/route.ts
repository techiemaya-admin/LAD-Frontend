/**
 * Broadcast-List Proxy
 *
 * POST /api/whatsapp-conversations/chat-groups/broadcast-lists
 *   → WAPA /chat-groups/broadcast-lists  (channel=personal)
 *
 * Saves a reusable "broadcast group" - a named set of WhatsApp chat groups.
 * A static segment so it takes precedence over chat-groups/[groupId].
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function POST(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/chat-groups/broadcast-lists');
}
