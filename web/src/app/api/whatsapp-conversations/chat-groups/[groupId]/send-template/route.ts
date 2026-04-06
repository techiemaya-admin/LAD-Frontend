/**
 * Send Template to Group Proxy
 *
 * Routing:
 *   ?channel=personal → LAD_backend (Node.js) — personal WA bulk send via Baileys
 *   ?channel=waba     → LAD-WABA-Comms (Python) — DEFAULT
 *
 * POST /api/whatsapp-conversations/chat-groups/:groupId/send-template
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../utils/python-proxy';

export async function POST(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const url = new URL(req.url);

  // Only default to waba when no explicit channel is provided
  if (!url.searchParams.get('channel')) {
    if (!url.searchParams.get('channel')) url.searchParams.set('channel', 'waba');
  }
  const newReq = new NextRequest(url, req);

  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), `/api/chat-groups/${groupId}/send-template`);
}
