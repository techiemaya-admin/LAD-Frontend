/**
 * Label Delete Proxy
 * DELETE /api/whatsapp-conversations/labels/:id → Backend /api/labels/:id
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/labels/${id}`);
}
