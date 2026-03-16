/**
 * Context Statuses Proxy
 * GET /api/whatsapp-conversations/conversations/context-statuses → Backend
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/conversations/context-statuses');
}
