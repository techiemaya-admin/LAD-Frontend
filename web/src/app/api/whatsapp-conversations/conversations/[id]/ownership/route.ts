/**
 * Conversation Ownership Proxy
 * PATCH /api/whatsapp-conversations/conversations/:id/ownership → Python :8000 /ownership
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../../utils/python-proxy';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/ownership`);
}
