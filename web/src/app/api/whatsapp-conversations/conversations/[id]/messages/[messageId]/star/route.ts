/**
 * Toggle Message Star Proxy
 * PATCH /api/whatsapp-conversations/conversations/:id/messages/:messageId/star
 *   → WAPA /conversations/:id/messages/:messageId/star (personal WhatsApp only)
 *
 * Flips the message's starred flag (persisted in messages.metadata.starred).
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../../../../../utils/python-proxy';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const { id, messageId } = await params;
  return proxyToPythonService(
    req,
    getWABAServiceUrl(),
    `/api/conversations/${id}/messages/${messageId}/star`
  );
}
