/**
 * Resolve-or-create group conversation proxy
 * POST /api/whatsapp-conversations/chat-groups/:groupId/resolve-conversation
 *   → WAPA /chat-groups/:groupId/resolve-conversation (personal WhatsApp only)
 *
 * Returns (creating if needed) the synced WA group's chat conversation id, so a
 * single click on a group reliably opens its chat - even before any messages.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../../../utils/python-proxy';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  return proxyToPythonService(req, getWABAServiceUrl(), `/api/chat-groups/${groupId}/resolve-conversation`);
}
