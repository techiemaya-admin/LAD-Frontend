/**
 * Followup Settings Proxy
 * GET  /api/whatsapp-conversations/followup-settings → Backend /api/followup-settings
 * PUT  /api/whatsapp-conversations/followup-settings → Backend /api/followup-settings
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/followup-settings');
}

export async function PUT(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/followup-settings');
}
