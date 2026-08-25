/**
 * Agent-response feedback proxy
 * POST /api/whatsapp-conversations/conversations/:id/messages/:messageId/feedback
 *   → LAD-WABA-Comms /api/conversations/:id/messages/:messageId/feedback
 *
 * WABA-only: the corrections captured here are appended to the WABA system
 * prompt, so there is no personal-channel equivalent to route to.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../../../../../utils/python-proxy';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const { id, messageId } = await params;
  return proxyToPythonService(
    req,
    getWABAServiceUrl(),
    `/api/conversations/${id}/messages/${messageId}/feedback`
  );
}
