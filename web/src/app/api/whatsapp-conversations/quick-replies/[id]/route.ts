/**
 * Quick Reply Update/Delete Proxy
 * PUT    /api/whatsapp-conversations/quick-replies/:id → Backend /api/quick-replies/:id
 * DELETE /api/whatsapp-conversations/quick-replies/:id → Backend /api/quick-replies/:id
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/quick-replies/${id}`);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/quick-replies/${id}`);
}
