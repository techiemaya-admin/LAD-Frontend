/**
 * Broadcast Template Recipients (by-status) Proxy
 *
 * Returns recipients whose most recent send of `template_name` ended in
 * `status` (sent | delivered | read | failed). Used by the "Resend to
 * failed only" filter on the broadcast wizard.
 *
 * GET /api/whatsapp-conversations/broadcasts/template-recipients?template_name=...&status=failed
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function GET(req: NextRequest) {
  // Pass through query string verbatim
  const url = new URL(req.url);
  const target = `/api/broadcasts/template-recipients?${url.searchParams.toString()}`;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), target);
}
