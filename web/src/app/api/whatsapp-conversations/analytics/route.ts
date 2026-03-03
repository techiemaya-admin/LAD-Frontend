/**
 * Conversation Analytics Proxy
 * GET /api/whatsapp-conversations/analytics → Python :8000 /health/detailed
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/health/detailed');
}
