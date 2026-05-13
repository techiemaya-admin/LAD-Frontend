/**
 * Chat Group Conversations Proxy
 * GET  /api/whatsapp-conversations/chat-groups/:groupId/conversations → Backend
 * POST /api/whatsapp-conversations/chat-groups/:groupId/conversations → Backend
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../utils/python-proxy';

export async function GET(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/chat-groups/${groupId}/conversations`);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/chat-groups/${groupId}/conversations`);
}
