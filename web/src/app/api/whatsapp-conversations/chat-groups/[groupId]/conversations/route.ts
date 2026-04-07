/**
 * Chat Group Conversations Proxy
 * GET  /api/whatsapp-conversations/chat-groups/:groupId/conversations → Backend
 * POST /api/whatsapp-conversations/chat-groups/:groupId/conversations → Backend
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../utils/python-proxy';

export async function GET(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const url = new URL(req.url);
  if (!url.searchParams.get('channel')) url.searchParams.set('channel', 'waba');
  const newReq = new NextRequest(url, req);

  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), `/api/chat-groups/${groupId}/conversations`);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const url = new URL(req.url);
  if (!url.searchParams.get('channel')) url.searchParams.set('channel', 'waba');
  const newReq = new NextRequest(url, req);

  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), `/api/chat-groups/${groupId}/conversations`);
}
