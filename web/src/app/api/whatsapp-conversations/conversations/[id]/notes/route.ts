/**
 * Conversation Notes Proxy
 * GET  /api/whatsapp-conversations/conversations/:id/notes → Backend /api/conversations/:id/notes
 * POST /api/whatsapp-conversations/conversations/:id/notes → Backend /api/conversations/:id/notes
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../utils/python-proxy';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Note: GET /api/notes/conversations/{id} is the correct endpoint
    // Force WABA channel routing to Python service (LAD-WABA-Comms)
  const url = new URL(req.url);
  if (!url.searchParams.get('channel')) url.searchParams.set('channel', 'waba');
  const newReq = new NextRequest(url, req);

  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), `/api/notes/conversations/${id}`);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/conversations/${id}/notes`);
}
