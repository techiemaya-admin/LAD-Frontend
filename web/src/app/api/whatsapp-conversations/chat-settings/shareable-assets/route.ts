/**
 * Shareable Assets Proxy
 *
 * GET  /api/whatsapp-conversations/chat-settings/shareable-assets
 *   → Python WABA service GET /api/settings/shareable-assets
 *
 * PUT  /api/whatsapp-conversations/chat-settings/shareable-assets
 *   → Python WABA service PUT /api/settings/shareable-assets
 *
 * Body shape (PUT):
 *   {
 *     assets: [
 *       {
 *         key: string,                      // optional id
 *         url: string,                      // required, http(s)
 *         filename: string,                 // optional, shown in WhatsApp
 *         mime_type: string,                // default: application/pdf
 *         media_type: 'document'|'image',   // default: document
 *         trigger_keywords: string[]        // required, non-empty
 *       }
 *     ]
 *   }
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../../utils/python-proxy';

function withWabaChannel(req: NextRequest): NextRequest {
  const url = new URL(req.url);
  url.searchParams.set('channel', 'waba');
  return new NextRequest(url, req);
}

export async function GET(req: NextRequest) {
  return proxyToPythonService(
    withWabaChannel(req),
    getWABAServiceUrl(),
    '/api/settings/shareable-assets',
  );
}

export async function PUT(req: NextRequest) {
  return proxyToPythonService(
    withWabaChannel(req),
    getWABAServiceUrl(),
    '/api/settings/shareable-assets',
  );
}
