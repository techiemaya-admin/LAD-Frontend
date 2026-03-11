/**
 * Leads Import Proxy
 * POST /api/whatsapp-conversations/leads/import → Backend /api/leads/import
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function POST(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/leads/import');
}
