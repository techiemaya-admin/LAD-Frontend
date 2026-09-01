/**
 * Teach-from-takeover proxy
 * POST /api/whatsapp-conversations/conversations/:id/messages/:messageId/teach
 *   → LAD-WABA-Comms /api/conversations/:id/messages/:messageId/teach
 *
 * Sibling of feedback/route.ts and, like it, WABA-only: the lesson is appended
 * to the WABA system prompt, so there is no personal-channel equivalent to
 * route to.
 *
 * This file is the whole reason the button 404'd on release — the component and
 * the SDK call shipped without it. Every endpoint under this tree needs its own
 * proxy route; there is no catch-all to fall through to.
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
    `/api/conversations/${id}/messages/${messageId}/teach`
  );
}
