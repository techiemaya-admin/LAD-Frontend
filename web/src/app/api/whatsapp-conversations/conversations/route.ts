/**
 * Conversations List Proxy
 * GET /api/whatsapp-conversations/conversations → Backend /api/conversations
 *
 * Routes based on channel parameter (per WHATSAPP_FEATURE_SYSTEM_PROMPT.md §2):
 * - channel=personal → LAD_backend Node.js at /api/whatsapp-conversations/conversations
 * - channel=waba (default) → LAD-WABA-Comms Python FastAPI at /api/conversations
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getBackendUrl, getWABAServiceUrl } from '../utils/python-proxy';

export async function GET(req: NextRequest) {
  // Channel detection: read from raw URL query param, then header, then default to waba
  const rawUrl = new URL(req.url);
  const channel =
    rawUrl.searchParams.get('channel') ||
    req.headers.get('x-whatsapp-channel') ||
    'waba';

  // Ensure channel is always in the URL for proxy function
  if (!rawUrl.searchParams.get('channel')) {
    rawUrl.searchParams.set('channel', channel);
  }
  const newReq = new NextRequest(rawUrl, req);

  if (channel === 'personal') {
    // Personal WhatsApp → LAD_backend Node.js
    return proxyToPythonService(newReq, getBackendUrl(), '/api/whatsapp-conversations/conversations');
  } else {
    // WABA (default) → LAD-WABA-Comms Python FastAPI
    return proxyToPythonService(newReq, getWABAServiceUrl(), '/api/conversations');
  }
}
