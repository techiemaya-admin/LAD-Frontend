/**
 * Mark Inbox Message Read Proxy
 * PUT /api/inbox/[id]/read → Python PUT /api/inbox/{id}/read
 *
 * Marks an inbox message as read for the currently authenticated user.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../whatsapp-conversations/utils/python-proxy';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/inbox/${id}/read`);
}
