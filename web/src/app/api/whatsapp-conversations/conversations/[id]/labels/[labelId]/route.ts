/**
 * Detach Label from Conversation Proxy
 * DELETE /api/whatsapp-conversations/conversations/:id/labels/:labelId → Backend
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../../utils/python-proxy';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; labelId: string }> }
) {
  const { id, labelId } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/conversations/${id}/labels/${labelId}`);
}
