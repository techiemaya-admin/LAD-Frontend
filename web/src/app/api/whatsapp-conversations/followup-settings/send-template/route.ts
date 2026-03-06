/**
 * Send Template Message Proxy
 * POST /api/whatsapp-conversations/followup-settings/send-template → Backend /api/followup-settings/send-template
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function POST(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/followup-settings/send-template');
}
