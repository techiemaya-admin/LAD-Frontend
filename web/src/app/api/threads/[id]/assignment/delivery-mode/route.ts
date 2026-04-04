/**
 * Update Assignment Delivery Mode Proxy
 * PUT /api/threads/[id]/assignment/delivery-mode → Python PUT /threads/{id}/assignment/delivery-mode  (channel=waba)
 *                                                → Node   PUT /api/whatsapp-conversations/threads/{id}/assignment/delivery-mode  (channel=personal)
 *
 * Changes how messages are delivered to the assigned team member:
 * - 'whatsapp': Messages forwarded to team member's phone
 * - 'inbox': Messages stored in LAD in-app inbox
 * - 'both': Both phone and inbox delivery
 *
 * Routes to: LAD-WABA-Comms (Python) for WABA, LAD_backend (Node.js) for personal WhatsApp.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../../whatsapp-conversations/utils/python-proxy';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Let the channel param pass through — proxyToPythonService handles routing:
  //   channel=personal  → LAD_backend  /api/whatsapp-conversations/threads/:id/assignment/delivery-mode
  //   channel=waba      → Python       /threads/:id/assignment/delivery-mode (default)
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/threads/${id}/assignment/delivery-mode`);
}
