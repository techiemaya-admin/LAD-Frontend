/**
 * Scheduled Broadcasts (list) Proxy
 * GET /api/whatsapp-conversations/chat-groups/scheduled-broadcasts
 *   → WAPA /chat-groups/scheduled-broadcasts (personal WhatsApp only)
 *
 * Lists upcoming/in-flight scheduled group broadcasts for the tenant.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWABAServiceUrl(), '/api/chat-groups/scheduled-broadcasts');
}
