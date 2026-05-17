/**
 * Audit Log Proxy
 *
 * GET /api/whatsapp-conversations/audit-log?action=…&entity_type=…&since=…&limit=…
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../utils/python-proxy';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const target = `/api/audit-log?${url.searchParams.toString()}`;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), target);
}
