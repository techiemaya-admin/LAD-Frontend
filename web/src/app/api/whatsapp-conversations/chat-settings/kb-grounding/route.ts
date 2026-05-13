/**
 * KB Grounding Toggle Proxy
 *
 * PATCH → Python WABA service  PATCH /api/settings/kb-grounding
 *
 * Body: { "enabled": boolean }
 *
 * Toggles whether the tenant's default Gemini File Search stores are
 * attached to every WhatsApp inbound message as RAG grounding sources.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../../utils/python-proxy';

function withWabaChannel(req: NextRequest): NextRequest {
  const url = new URL(req.url);
  url.searchParams.set('channel', 'waba');
  return new NextRequest(url, req);
}

export async function PATCH(req: NextRequest) {
  return proxyToPythonService(
    withWabaChannel(req),
    getWABAServiceUrl(),
    '/api/settings/kb-grounding',
  );
}
