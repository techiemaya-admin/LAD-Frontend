/**
 * Unassign Conversation Proxy
 * POST /api/threads/[id]/unassign → Python POST /threads/{id}/unassign
 *
 * Releases a conversation back to the AI.
 * AI resumes responding after unassignment.
 *
 * Routes to: LAD-WABA-Comms (Python) - assignment management for WhatsApp Business API
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../whatsapp-conversations/utils/python-proxy';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // channel param forwarded as-is — proxyToPythonService handles routing to personal or waba
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/threads/${id}/unassign`);
}
