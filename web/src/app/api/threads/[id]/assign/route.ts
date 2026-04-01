/**
 * Assign Conversation Proxy
 * POST /api/threads/[id]/assign → Python POST /threads/{id}/assign
 *
 * Assigns a conversation to a team member for human intervention.
 * AI stops responding when a conversation is assigned.
 *
 * Routes to: LAD-WABA-Comms (Python) - assignment management for WhatsApp Business API
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../whatsapp-conversations/utils/python-proxy';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Force WABA channel routing to Python service (LAD-WABA-Comms)
  // Assignments are managed in the Python service, not the Node backend
  const url = new URL(req.url);
  url.searchParams.set('channel', 'waba');
  const newReq = new NextRequest(url, req);

  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), `/threads/${id}/assign`);
}
