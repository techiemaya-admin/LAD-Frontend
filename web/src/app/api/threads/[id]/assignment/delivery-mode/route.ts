/**
 * Update Assignment Delivery Mode Proxy
 * PUT /api/threads/[id]/assignment/delivery-mode → Python PUT /threads/{id}/assignment/delivery-mode
 *
 * Changes how messages are delivered to the assigned team member:
 * - 'whatsapp': Messages forwarded to team member's phone
 * - 'inbox': Messages stored in LAD in-app inbox
 * - 'both': Both phone and inbox delivery
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../../whatsapp-conversations/utils/python-proxy';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/threads/${id}/assignment/delivery-mode`);
}
