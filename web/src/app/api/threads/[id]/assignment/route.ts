/**
 * Conversation Assignment Proxy
 * GET /api/threads/[id]/assignment → Python GET /threads/{id}/assignment
 *
 * Returns current assignment and full history for a conversation.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../whatsapp-conversations/utils/python-proxy';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/threads/${id}/assignment`);
}
