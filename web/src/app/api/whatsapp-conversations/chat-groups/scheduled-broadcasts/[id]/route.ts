/**
 * Scheduled Broadcast (cancel) Proxy
 * DELETE /api/whatsapp-conversations/chat-groups/scheduled-broadcasts/:id
 *   → WAPA /chat-groups/scheduled-broadcasts/:id (personal WhatsApp only)
 *
 * Cancels a still-scheduled group broadcast and deletes its Cloud Task.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../../../utils/python-proxy';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToPythonService(req, getWABAServiceUrl(), `/api/chat-groups/scheduled-broadcasts/${id}`);
}
