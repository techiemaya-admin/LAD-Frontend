/**
 * Starred Messages Proxy
 * GET /api/whatsapp-conversations/conversations/starred-messages
 *   → WAPA /conversations/starred-messages (personal WhatsApp only)
 *
 * Lists starred messages across ALL conversations for the tenant, newest first.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWABAServiceUrl(), '/api/conversations/starred-messages');
}
