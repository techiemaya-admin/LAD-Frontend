/**
 * Conversation Notes Proxy
 * GET  /api/whatsapp-conversations/conversations/:id/notes → Backend /api/conversations/:id/notes
 * POST /api/whatsapp-conversations/conversations/:id/notes → Backend /api/conversations/:id/notes
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../utils/python-proxy';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/conversations/${id}/notes`);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/conversations/${id}/notes`);
}
