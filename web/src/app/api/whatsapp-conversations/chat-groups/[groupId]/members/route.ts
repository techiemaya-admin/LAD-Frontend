/**
 * Chat group members (list) proxy
 * GET /api/whatsapp-conversations/chat-groups/:groupId/members
 *   → WAPA /chat-groups/:groupId/members (personal WhatsApp only)
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../../../utils/python-proxy';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  return proxyToPythonService(req, getWABAServiceUrl(), `/api/chat-groups/${groupId}/members`);
}
