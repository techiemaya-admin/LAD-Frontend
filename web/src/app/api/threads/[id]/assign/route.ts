/**
 * Assign Conversation Proxy
 * POST /api/threads/[id]/assign → Python POST /threads/{id}/assign
 *
 * Assigns a conversation to a team member for human intervention.
 * AI stops responding when a conversation is assigned.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../whatsapp-conversations/utils/python-proxy';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/threads/${id}/assign`);
}
