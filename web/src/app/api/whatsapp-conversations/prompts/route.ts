/**
 * Prompts Proxy - the System Prompts store (channel-agnostic).
 *
 * The System Prompts UI saves prompts for EVERY channel (WABA / LinkedIn /
 * Gmail / Instagram / personal-whatsapp) through this one endpoint - the
 * target channel is a field in the request body, not the URL.
 *
 * GET/POST /api/whatsapp-conversations/prompts → /api/personal-whatsapp/prompts,
 * which since the Phase-5 split is owned by LAD-WAPA-Comms (NOT LAD_backend  - 
 * the backend's copy is the legacy, pre-split feature). WAPA writes to the
 * per-tenant `<TENANT_DB_SCHEMA>.prompts` table that every channel service
 * (WABA/LinkedIn/Instagram) reads its active prompt back from.
 *
 * Uses channel=backend (no path transformation); the proxy's path rule sends
 * /api/personal-whatsapp/* → WAPA. Requires WAPA_SERVICE_URL on the frontend
 * service (else getWAPAServiceUrl() falls back to localhost → ECONNREFUSED → 502).
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWAPAServiceUrl } from '../utils/python-proxy';

function withBackendChannel(req: NextRequest): NextRequest {
  const url = new URL(req.url);
  url.searchParams.set('channel', 'backend');
  return new NextRequest(url, req);
}

export async function GET(req: NextRequest) {
  return proxyToPythonService(withBackendChannel(req), getWAPAServiceUrl(), '/api/personal-whatsapp/prompts');
}

export async function POST(req: NextRequest) {
  return proxyToPythonService(withBackendChannel(req), getWAPAServiceUrl(), '/api/personal-whatsapp/prompts');
}
