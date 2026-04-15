/**
 * Conversation Assignment Proxy
 * GET /api/threads/[id]/assignment → Python GET /threads/{id}/assignment  (channel=waba)
 *                                  → Node  GET /api/whatsapp-conversations/threads/{id}/assignment  (channel=personal)
 *
 * Returns current assignment and full history for a conversation.
 *
 * Routes to: LAD-WABA-Comms (Python) for WABA, LAD_backend (Node.js) for personal WhatsApp.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../whatsapp-conversations/utils/python-proxy';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Let the channel param pass through — proxyToPythonService handles routing:
  //   channel=personal  → LAD_backend  /api/whatsapp-conversations/threads/:id/assignment
  //   channel=waba      → Python       /threads/:id/assignment (default)
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/threads/${id}/assignment`);
}
