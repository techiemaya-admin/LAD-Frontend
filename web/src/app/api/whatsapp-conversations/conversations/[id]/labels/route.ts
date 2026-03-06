/**
 * Conversation Labels Proxy
 * GET    /api/whatsapp-conversations/conversations/:id/labels → Backend /api/conversations/:id/labels
 * POST   /api/whatsapp-conversations/conversations/:id/labels → Backend /api/conversations/:id/labels
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../utils/python-proxy';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/conversations/${id}/labels`);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/conversations/${id}/labels`);
}
