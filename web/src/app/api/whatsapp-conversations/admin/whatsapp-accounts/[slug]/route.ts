/**
 * Admin WhatsApp Account by Slug Proxy
 * PATCH  /api/whatsapp-conversations/admin/whatsapp-accounts/:slug → Backend /admin/whatsapp-accounts/:slug
 * DELETE /api/whatsapp-conversations/admin/whatsapp-accounts/:slug → Backend /admin/whatsapp-accounts/:slug
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../utils/python-proxy';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/admin/whatsapp-accounts/${slug}`);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/admin/whatsapp-accounts/${slug}`);
}
