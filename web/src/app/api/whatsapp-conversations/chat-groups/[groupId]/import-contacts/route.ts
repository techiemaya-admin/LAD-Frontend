/**
 * Import Contacts to Group Proxy
 * POST /api/whatsapp-conversations/chat-groups/:groupId/import-contacts → Backend
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../utils/python-proxy';

export async function POST(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  return proxyToPythonService(req, getWhatsAppServiceUrl(), `/api/chat-groups/${groupId}/import-contacts`);
}
