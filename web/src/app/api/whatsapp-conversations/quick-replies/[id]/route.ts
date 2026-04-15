/**
 * Quick Reply Update/Delete Proxy
 * PUT    /api/whatsapp-conversations/quick-replies/:id → Backend /api/quick-replies/:id
 * DELETE /api/whatsapp-conversations/quick-replies/:id → Backend /api/quick-replies/:id
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
    // Force WABA channel routing to Python service (LAD-WABA-Comms)
  const url = new URL(req.url);
  if (!url.searchParams.get('channel')) url.searchParams.set('channel', 'waba');
  const newReq = new NextRequest(url, req);

  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), `/api/quick-replies/${id}`);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
    // Force WABA channel routing to Python service (LAD-WABA-Comms)
  const url = new URL(req.url);
  if (!url.searchParams.get('channel')) url.searchParams.set('channel', 'waba');
  const newReq = new NextRequest(url, req);

  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), `/api/quick-replies/${id}`);
}
