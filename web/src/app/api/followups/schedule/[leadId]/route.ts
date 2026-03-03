/**
 * Schedule Followup Proxy
 * POST /api/followups/schedule/:leadId → Python :8000 /followup/schedule/:leadId
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../utils/python-proxy';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/followup/schedule/${leadId}`);
}
