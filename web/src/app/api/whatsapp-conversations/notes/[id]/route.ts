/**
 * Note Update/Delete Proxy
 * PUT    /api/whatsapp-conversations/notes/:id → Backend /api/notes/:id
 * DELETE /api/whatsapp-conversations/notes/:id → Backend /api/notes/:id
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/notes/${id}`);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/notes/${id}`);
}
