/**
 * Chat Settings Proxy
 * GET /api/whatsapp-conversations/chat-settings → Node.js /api/personal-whatsapp/chat-settings
 * PUT /api/whatsapp-conversations/chat-settings → Node.js /api/personal-whatsapp/chat-settings
 *
 * Uses channel=backend so the proxy routes directly to Node.js LAD_backend
 * without path transformation.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getBackendUrl } from '../utils/python-proxy';

function withBackendChannel(req: NextRequest): NextRequest {
  const url = new URL(req.url);
  url.searchParams.set('channel', 'backend');
  return new NextRequest(url, req);
}

export async function GET(req: NextRequest) {
  return proxyToPythonService(withBackendChannel(req), getBackendUrl(), '/api/personal-whatsapp/chat-settings');
}

export async function PUT(req: NextRequest) {
  return proxyToPythonService(withBackendChannel(req), getBackendUrl(), '/api/personal-whatsapp/chat-settings');
}
