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
  return proxyToPythonService(
    req,
    getWhatsAppServiceUrl(),
    `/followup/schedule/${params.lead_id}`,
  );
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { lead_id: string } },
) {
  return proxyToPythonService(
    req,
    getWhatsAppServiceUrl(),
    `/followup/cancel/${params.lead_id}`,
  );
}
