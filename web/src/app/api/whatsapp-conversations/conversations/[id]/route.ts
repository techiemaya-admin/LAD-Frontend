/**
 * Single Conversation Proxy
 * GET    /api/whatsapp-conversations/conversations/:id → Backend /api/conversations/:id
 * DELETE /api/whatsapp-conversations/conversations/:id → Backend /api/conversations/:id (soft delete)
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/conversations/${id}`);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/conversations/${id}`);
}
