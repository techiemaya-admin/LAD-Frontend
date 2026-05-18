/**
 * Audit Log Summary Proxy
 *
 * GET /api/whatsapp-conversations/audit-log/summary?since=…
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const target = `/api/audit-log/summary?${url.searchParams.toString()}`;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), target);
}
