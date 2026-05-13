/**
 * Prompts Proxy — Personal WhatsApp (Node.js backend)
 * GET  /api/whatsapp-conversations/prompts → Node.js /api/personal-whatsapp/prompts
 * POST /api/whatsapp-conversations/prompts → Node.js /api/personal-whatsapp/prompts
 *
 * Uses channel=backend so the proxy routes directly to Node.js LAD_backend
 * without path transformation (unlike channel=personal which prepends /api/whatsapp-conversations).
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getBackendUrl } from '../utils/python-proxy';

function withBackendChannel(req: NextRequest): NextRequest {
  const url = new URL(req.url);
  url.searchParams.set('channel', 'backend');
  return new NextRequest(url, req);
}

export async function GET(req: NextRequest) {
  return proxyToPythonService(withBackendChannel(req), getBackendUrl(), '/api/personal-whatsapp/prompts');
}

export async function POST(req: NextRequest) {
  return proxyToPythonService(withBackendChannel(req), getBackendUrl(), '/api/personal-whatsapp/prompts');
}
