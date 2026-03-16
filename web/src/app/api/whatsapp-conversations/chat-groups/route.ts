/**
 * Chat Groups Proxy
 * GET  /api/whatsapp-conversations/chat-groups → Backend /api/chat-groups
 * POST /api/whatsapp-conversations/chat-groups → Backend /api/chat-groups
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/chat-groups');
}

export async function POST(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/chat-groups');
}
