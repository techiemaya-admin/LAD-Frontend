/**
 * Update Assignment Delivery Mode Proxy
 * PUT /api/threads/[id]/assignment/delivery-mode → Python PUT /threads/{id}/assignment/delivery-mode
 *
 * Changes how messages are delivered to the assigned team member:
 * - 'whatsapp': Messages forwarded to team member's phone
 * - 'inbox': Messages stored in LAD in-app inbox
 * - 'both': Both phone and inbox delivery
 *
 * Routes to: LAD-WABA-Comms (Python) - assignment management for WhatsApp Business API
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../../whatsapp-conversations/utils/python-proxy';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Force WABA channel routing to Python service (LAD-WABA-Comms)
  // Assignments are managed in the Python service, not the Node backend
  const url = new URL(req.url);
  url.searchParams.set('channel', 'waba');
  const newReq = new NextRequest(url, req);

  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), `/threads/${id}/assignment/delivery-mode`);
}
