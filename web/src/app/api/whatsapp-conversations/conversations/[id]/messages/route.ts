/**
 * Conversation Messages Proxy
 * GET  /api/whatsapp-conversations/conversations/:id/messages → Python :8000 /api/conversations/:id/messages
 * POST /api/whatsapp-conversations/conversations/:id/messages → Python :8000 /api/conversations/:id/messages
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../../utils/python-proxy';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/conversations/${id}/messages`);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/conversations/${id}/messages`);
}
