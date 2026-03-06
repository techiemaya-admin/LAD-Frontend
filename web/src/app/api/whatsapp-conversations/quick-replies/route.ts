/**
 * Quick Replies Proxy
 * GET  /api/whatsapp-conversations/quick-replies → Backend /api/quick-replies
 * POST /api/whatsapp-conversations/quick-replies → Backend /api/quick-replies
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/quick-replies');
}

export async function POST(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/quick-replies');
}
