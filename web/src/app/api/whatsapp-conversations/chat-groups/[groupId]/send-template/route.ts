/**
 * Send Template to Group Proxy
 * POST /api/whatsapp-conversations/chat-groups/:groupId/send-template → Backend
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../utils/python-proxy';

export async function POST(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
    // Force WABA channel routing to Python service (LAD-WABA-Comms)
  const url = new URL(req.url);
  url.searchParams.set('channel', 'waba');
  const newReq = new NextRequest(url, req);

  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), `/api/chat-groups/${groupId}/send-template`);
}
