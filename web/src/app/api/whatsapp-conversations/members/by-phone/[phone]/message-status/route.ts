/**
 * Member Template-Message Delivery Status Proxy
 *
 * Forwards to the LAD-WABA-Comms Python service which has tenant-DB access
 * to read messages.message_status keyed off the wa_contact for this phone.
 *
 * GET /api/whatsapp-conversations/members/by-phone/:phone/message-status
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../../utils/python-proxy';

export async function GET(req: NextRequest, { params }: { params: Promise<{ phone: string }> }) {
  const { phone } = await params;
  return proxyToPythonService(
    req,
    getWhatsAppServiceUrl(),
    `/api/members/by-phone/${encodeURIComponent(phone)}/message-status`,
  );
}
