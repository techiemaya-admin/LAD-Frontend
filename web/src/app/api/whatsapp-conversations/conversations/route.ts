/**
 * Conversations List Proxy
 * GET /api/whatsapp-conversations/conversations → Backend /api/conversations
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/conversations');
}
