/**
 * Single Template Proxy
 *
 * GET    /api/whatsapp-conversations/conversations/templates/:templateId
 * PUT    /api/whatsapp-conversations/conversations/templates/:templateId
 * DELETE /api/whatsapp-conversations/conversations/templates/:templateId
 *
 * channel=personal → LAD_backend  (no Meta approval, instant CRUD)
 * channel=waba     → Python svc   (WABA approved templates)
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../utils/python-proxy';

type Ctx = { params: Promise<{ templateId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { templateId } = await ctx.params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/conversations/templates/${templateId}`);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { templateId } = await ctx.params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/conversations/templates/${templateId}`);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { templateId } = await ctx.params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/conversations/templates/${templateId}`);
}
