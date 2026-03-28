/**
 * Playground Chat Proxy
 * POST /api/whatsapp-conversations/playground/chat → Backend /api/playground/chat
 *
 * Sends a test message to the AI and returns a response.
 * No messages are persisted — purely stateless testing sandbox.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  url.searchParams.set('channel', 'waba');
  const newReq = new NextRequest(url, req);
  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), '/api/playground/chat');
}
