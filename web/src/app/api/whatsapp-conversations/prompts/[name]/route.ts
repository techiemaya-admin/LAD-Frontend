/**
 * Single Prompt Proxy
 * GET    /api/whatsapp-conversations/prompts/:name → Backend /api/prompts/:name
 * PUT    /api/whatsapp-conversations/prompts/:name → Backend /api/prompts/:name
 * DELETE /api/whatsapp-conversations/prompts/:name → Backend /api/prompts/:name
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function GET(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/prompts/${name}`);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/prompts/${name}`);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/prompts/${name}`);
}
