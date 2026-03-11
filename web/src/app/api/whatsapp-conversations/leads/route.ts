/**
 * Leads List Proxy
 * GET /api/whatsapp-conversations/leads → Backend /api/leads
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/leads');
}
