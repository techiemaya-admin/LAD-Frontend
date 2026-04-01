/**
 * Label Delete Proxy
 * DELETE /api/whatsapp-conversations/labels/:id → Backend /api/labels/:id
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
    // Force WABA channel routing to Python service (LAD-WABA-Comms)
  const url = new URL(req.url);
  url.searchParams.set('channel', 'waba');
  const newReq = new NextRequest(url, req);

  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), `/api/labels/${id}`);
}
