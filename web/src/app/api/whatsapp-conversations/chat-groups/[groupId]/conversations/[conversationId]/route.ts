/**
 * Remove Conversation from Group Proxy
 * DELETE /api/whatsapp-conversations/chat-groups/:groupId/conversations/:conversationId → Backend
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../../utils/python-proxy';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string; conversationId: string }> }
) {
  const { groupId, conversationId } = await params;
  return proxyToPythonService(
    req,
    getWhatsAppServiceUrl(),
    `/api/chat-groups/${groupId}/conversations/${conversationId}`
  );
}
