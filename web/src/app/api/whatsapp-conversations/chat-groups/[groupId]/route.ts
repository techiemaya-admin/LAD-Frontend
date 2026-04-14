/**
 * Chat Group Update/Delete Proxy
 * PUT    /api/whatsapp-conversations/chat-groups/:groupId → Backend /api/chat-groups/:groupId
 * DELETE /api/whatsapp-conversations/chat-groups/:groupId → Backend /api/chat-groups/:groupId
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/chat-groups/${groupId}`);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/chat-groups/${groupId}`);
}
