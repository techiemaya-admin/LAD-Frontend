/**
 * Cancel Followup Proxy
 * DELETE /api/followups/cancel/:leadId → Python :8000 /followup/cancel/:leadId
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../utils/python-proxy';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/followup/cancel/${leadId}`);
}
