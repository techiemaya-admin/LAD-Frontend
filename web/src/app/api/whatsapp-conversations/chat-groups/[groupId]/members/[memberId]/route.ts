/**
 * Chat group member (remove) proxy
 * DELETE /api/whatsapp-conversations/chat-groups/:groupId/members/:memberId
 *   → WAPA /chat-groups/:groupId/members/:memberId (personal WhatsApp only)
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../../../../utils/python-proxy';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string; memberId: string }> }
) {
  const { groupId, memberId } = await params;
  return proxyToPythonService(req, getWABAServiceUrl(), `/api/chat-groups/${groupId}/members/${memberId}`);
}
