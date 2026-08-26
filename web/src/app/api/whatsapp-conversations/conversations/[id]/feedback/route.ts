/**
 * Conversation feedback list proxy
 * GET /api/whatsapp-conversations/conversations/:id/feedback
 *   → LAD-WABA-Comms /api/conversations/:id/feedback
 *
 * Lets the thread render existing verdicts instead of resetting the thumbs
 * every time the inbox reloads.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../../../utils/python-proxy';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToPythonService(req, getWABAServiceUrl(), `/api/conversations/${id}/feedback`);
}
