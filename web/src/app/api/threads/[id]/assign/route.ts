/**
 * Assign Conversation Proxy
 * POST /api/threads/[id]/assign → /threads/{id}/assign
 *
 * Assigns a conversation to a team member for human intervention.
 * AI stops responding when a conversation is assigned.
 *
 * Channel routing:
 *   channel=personal → LAD_backend (Node.js) personal WhatsApp service
 *   channel=waba     → LAD-WABA-Comms (Python) WhatsApp Business API service
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../whatsapp-conversations/utils/python-proxy';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // channel param is forwarded as-is — proxyToPythonService handles routing
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/threads/${id}/assign`);
}
