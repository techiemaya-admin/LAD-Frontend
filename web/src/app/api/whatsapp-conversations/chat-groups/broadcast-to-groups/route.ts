/**
 * Group-Chat Broadcast Proxy
 *
 * POST /api/whatsapp-conversations/chat-groups/broadcast-to-groups
 *   → WAPA /chat-groups/broadcast-to-groups  (channel=personal)
 *
 * Posts ONE message into each selected WhatsApp group chat, throttled
 * server-side (batch 5-10, 2min+ pause, 250/day cap). Personal WhatsApp only.
 * A static segment so it takes precedence over chat-groups/[groupId].
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function POST(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/chat-groups/broadcast-to-groups');
}
