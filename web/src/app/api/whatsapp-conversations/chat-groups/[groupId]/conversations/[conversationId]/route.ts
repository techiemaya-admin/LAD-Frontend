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

  const url = new URL(req.url);
  if (!url.searchParams.get('channel')) url.searchParams.set('channel', 'waba');
  const wabaReq = new NextRequest(url, req);

  return proxyToPythonService(
    wabaReq,
    getWhatsAppServiceUrl(),
    `/api/chat-groups/${groupId}/conversations/${conversationId}`
  );
}
