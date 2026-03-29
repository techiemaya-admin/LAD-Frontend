/**
 * Conversations List Proxy
 * GET /api/whatsapp-conversations/conversations → Backend /api/conversations
 *
 * Channel routing is handled entirely inside proxyToPythonService:
 * - channel=personal → LAD_backend Node.js at /api/whatsapp-conversations/conversations
 * - channel=waba (default) → LAD-WABA-Comms Python FastAPI at /api/conversations
 *
 * Pass the canonical waba-style path (/api/conversations) so the proxy's
 * path transform works correctly for both channels:
 *   personal: /api/whatsapp-conversations + /conversations  = /api/whatsapp-conversations/conversations
 *   waba:     /api/conversations  (unchanged)
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWABAServiceUrl(), '/api/conversations');
}
