/**
 * Labels Proxy
 * GET  /api/whatsapp-conversations/labels → Backend /api/labels
 * POST /api/whatsapp-conversations/labels → Backend /api/labels
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/labels');
}

export async function POST(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/labels');
}
