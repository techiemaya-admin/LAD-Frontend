/**
 * Prompts Proxy
 * GET  /api/whatsapp-conversations/prompts → Backend /api/prompts
 * POST /api/whatsapp-conversations/prompts → Backend /api/prompts
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/prompts');
}

export async function POST(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/api/prompts');
}
