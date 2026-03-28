/**
 * Schedule / Cancel Followup Proxy
 * POST   /api/whatsapp-conversations/followup/schedule/[lead_id] → Backend POST   /followup/schedule/{lead_id}
 * DELETE /api/whatsapp-conversations/followup/schedule/[lead_id] → Backend DELETE /followup/cancel/{lead_id}
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../utils/python-proxy';

export async function POST(
  req: NextRequest,
  { params }: { params: { lead_id: string } },
) {
  // Force WABA channel routing to Python service
  const url = new URL(req.url);
  url.searchParams.set('channel', 'waba');
  const wabaReq = new NextRequest(url, req);

  return proxyToPythonService(
    wabaReq,
    getWhatsAppServiceUrl(),
    `/followup/schedule/${params.lead_id}`,
  );
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { lead_id: string } },
) {
  // Force WABA channel routing to Python service
  const url = new URL(req.url);
  url.searchParams.set('channel', 'waba');
  const wabaReq = new NextRequest(url, req);

  return proxyToPythonService(
    wabaReq,
    getWhatsAppServiceUrl(),
    `/followup/cancel/${params.lead_id}`,
  );
}
