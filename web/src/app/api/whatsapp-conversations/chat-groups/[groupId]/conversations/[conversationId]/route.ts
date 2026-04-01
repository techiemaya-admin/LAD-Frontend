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

  // Force WABA channel routing to Python service
  const url = new URL(req.url);
  url.searchParams.set('channel', 'waba');
  const wabaReq = new NextRequest(url, req);

  return proxyToPythonService(
    wabaReq,
    getWhatsAppServiceUrl(),
    `/api/chat-groups/${groupId}/conversations/${conversationId}`
  );
}
