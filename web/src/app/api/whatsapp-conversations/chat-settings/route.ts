/**
 * Chat Settings Proxy
 * GET /api/whatsapp-conversations/chat-settings → Backend /api/chat-settings
 * PUT /api/whatsapp-conversations/chat-settings → Backend /api/chat-settings
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/chat-settings');
}

export async function PUT(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/chat-settings');
}
