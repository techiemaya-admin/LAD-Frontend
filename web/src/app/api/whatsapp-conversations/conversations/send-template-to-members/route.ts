/**
 * Send Template to Members Proxy
 * POST /api/whatsapp-conversations/conversations/send-template-to-members
 *   → Python service /api/conversations/send-template-to-members
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function POST(req: NextRequest) {
  return proxyToPythonService(
    req,
    getWhatsAppServiceUrl(),
    '/api/conversations/send-template-to-members'
  );
}
