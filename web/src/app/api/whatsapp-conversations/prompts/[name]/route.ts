/**
 * Single Prompt Proxy — Personal WhatsApp (Node.js backend)
 * GET    /api/whatsapp-conversations/prompts/:name → Node.js /api/personal-whatsapp/prompts/:name
 * PUT    /api/whatsapp-conversations/prompts/:name → Node.js /api/personal-whatsapp/prompts/:name
 * DELETE /api/whatsapp-conversations/prompts/:name → Node.js /api/personal-whatsapp/prompts/:name
 *
 * Uses channel=backend so the proxy routes directly to Node.js LAD_backend
 * without path transformation (unlike channel=personal which prepends /api/whatsapp-conversations).
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getBackendUrl } from '../../utils/python-proxy';

function withBackendChannel(req: NextRequest): NextRequest {
  const url = new URL(req.url);
  url.searchParams.set('channel', 'backend');
  return new NextRequest(url, req);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return proxyToPythonService(withBackendChannel(req), getBackendUrl(), `/api/personal-whatsapp/prompts/${name}`);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return proxyToPythonService(withBackendChannel(req), getBackendUrl(), `/api/personal-whatsapp/prompts/${name}`);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return proxyToPythonService(withBackendChannel(req), getBackendUrl(), `/api/personal-whatsapp/prompts/${name}`);
}
