/**
 * Conversation Message Delete Proxy
 * DELETE /api/whatsapp-conversations/conversations/:id/messages/:messageId
 *   → Backend /api/conversations/:id/messages/:messageId
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../../../../utils/python-proxy';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const { id, messageId } = await params;
  return proxyToPythonService(req, getWABAServiceUrl(), `/api/conversations/${id}/messages/${messageId}`);
}

