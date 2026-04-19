/**
 * Conversation Messages Proxy
 * GET  /api/whatsapp-conversations/conversations/:id/messages → Backend /api/conversations/:id/messages
 * POST /api/whatsapp-conversations/conversations/:id/messages → Backend /api/conversations/:id/messages
 *
 * Channel routing is handled entirely inside proxyToPythonService:
 * - channel=personal → LAD_backend Node.js at /api/whatsapp-conversations/conversations/:id/messages
 * - channel=waba (default) → LAD-WABA-Comms Python FastAPI at /api/conversations/:id/messages
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../../../utils/python-proxy';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToPythonService(req, getWABAServiceUrl(), `/api/conversations/${id}/messages`);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToPythonService(req, getWABAServiceUrl(), `/api/conversations/${id}/messages`);
}
