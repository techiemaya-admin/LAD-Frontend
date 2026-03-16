/**
 * Admin WhatsApp Accounts Proxy
 * GET  /api/whatsapp-conversations/admin/whatsapp-accounts → Backend /admin/whatsapp-accounts
 * POST /api/whatsapp-conversations/admin/whatsapp-accounts → Backend /admin/whatsapp-accounts
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/admin/whatsapp-accounts');
}

export async function POST(req: NextRequest) {
  return proxyToPythonService(req, getWhatsAppServiceUrl(), '/admin/whatsapp-accounts');
}
