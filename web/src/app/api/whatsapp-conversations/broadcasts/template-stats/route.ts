/**
 * Broadcast Template Stats Proxy
 *
 * Returns per-template aggregate counts across all chapter members.
 * GET /api/whatsapp-conversations/broadcasts/template-stats
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/broadcasts/template-stats');
}
