/**
 * Manual Followup Trigger Proxy
 * POST /api/whatsapp-conversations/followup-settings/trigger → Backend /api/followup-settings/trigger
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function POST(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/followup-settings/trigger');
}
