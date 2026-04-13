/**
 * Follow-up Config Proxy
 * GET /api/whatsapp-conversations/followup-config → Backend /api/followup-config
 * PUT /api/whatsapp-conversations/followup-config → Backend /api/followup-config
 *
 * Manages post-conversation follow-up timing config:
 *   - Per-stage delays (FIRST/SECOND/THIRD/FOURTH)
 *   - Enable/disable each stage
 *   - Meeting reminder delay
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../utils/python-proxy';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (!url.searchParams.get('channel')) url.searchParams.set('channel', 'waba');
  const newReq = new NextRequest(url, req);
  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), '/api/followup-config');
}

export async function PUT(req: NextRequest) {
  const url = new URL(req.url);
  if (!url.searchParams.get('channel')) url.searchParams.set('channel', 'waba');
  const newReq = new NextRequest(url, req);
  return proxyToPythonService(newReq, getWhatsAppServiceUrl(), '/api/followup-config');
}
