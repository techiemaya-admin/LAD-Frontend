/**
 * Chat Settings Proxy — channel-aware
 *
 * ?channel=personal (default)
 *   GET/PUT → Node.js LAD_backend  /api/personal-whatsapp/chat-settings
 *
 * ?channel=waba
 *   GET     → Python WABA service  GET  /api/settings
 *   PATCH   → Python WABA service  PATCH /api/settings
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getBackendUrl, getWABAServiceUrl } from '../utils/python-proxy';

function withChannel(req: NextRequest, channel: string): NextRequest {
  const url = new URL(req.url);
  url.searchParams.set('channel', channel);
  return new NextRequest(url, req);
}

export async function GET(req: NextRequest) {
  const channel = new URL(req.url).searchParams.get('channel') || 'personal';
  if (channel === 'waba') {
    return proxyToPythonService(withChannel(req, 'waba'), getWABAServiceUrl(), '/api/settings');
  }
  return proxyToPythonService(withChannel(req, 'backend'), getBackendUrl(), '/api/personal-whatsapp/chat-settings');
}

export async function PUT(req: NextRequest) {
  // Personal channel uses PUT
  return proxyToPythonService(withChannel(req, 'backend'), getBackendUrl(), '/api/personal-whatsapp/chat-settings');
}

export async function PATCH(req: NextRequest) {
  // WABA channel uses PATCH (matches Python FastAPI endpoint)
  const channel = new URL(req.url).searchParams.get('channel') || 'personal';
  if (channel === 'waba') {
    return proxyToPythonService(withChannel(req, 'waba'), getWABAServiceUrl(), '/api/settings');
  }
  return proxyToPythonService(withChannel(req, 'backend'), getBackendUrl(), '/api/personal-whatsapp/chat-settings');
}
