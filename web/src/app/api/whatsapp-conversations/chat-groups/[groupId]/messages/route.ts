/**
 * Group Messages Proxy (aggregated from all conversations in group)
 * GET /api/whatsapp-conversations/chat-groups/:groupId/messages → Backend
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../utils/python-proxy';

export async function GET(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/chat-groups/${groupId}/messages`);
}
