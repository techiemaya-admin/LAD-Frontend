/**
 * Playground Config Proxy
 * GET /api/whatsapp-conversations/playground/config → Backend /api/playground/config
 *
 * Returns the tenant's chat settings + all saved prompts for the AI Playground UI.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (!url.searchParams.get('channel')) url.searchParams.set('channel', 'waba');
  const newReq = new NextRequest(url, req);
  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), '/api/playground/config');
}
