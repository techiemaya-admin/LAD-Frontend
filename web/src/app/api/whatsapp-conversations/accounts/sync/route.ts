/**
 * Accounts Sync Proxy
 * POST /api/whatsapp-conversations/accounts/sync?channel=personal
 *   → LAD_backend at /api/whatsapp-conversations/accounts/sync
 *
 * Triggers Baileys to reconnect all active sessions for the tenant,
 * which causes WhatsApp to push full message history via messaging-history.set.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../../utils/python-proxy';

export async function POST(req: NextRequest) {
  return proxyToPythonService(req, getWABAServiceUrl(), '/api/accounts/sync');
}
