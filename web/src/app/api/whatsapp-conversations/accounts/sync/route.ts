/**
 * Accounts Sync Proxy
 * POST /api/whatsapp-conversations/accounts/sync?channel=personal
 *   → LAD_backend at /api/whatsapp-conversations/accounts/sync
 *
 * Triggers Baileys to reconnect all active sessions for the tenant,
 * which causes WhatsApp to push full message history via messaging-history.set.
 *
 * Only applicable to personal WA (Baileys). WABA and other channels do not
 * require session-level reconnects — return 200 immediately for those.
 */
import { NextRequest, NextResponse } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../../utils/python-proxy';

export async function POST(req: NextRequest) {
  const channel =
    new URL(req.url).searchParams.get('channel') ||
    req.nextUrl.searchParams.get('channel') ||
    req.headers.get('x-whatsapp-channel');

  // Baileys reconnect sync is only meaningful for personal WA.
  // Silently succeed for WABA, LinkedIn, or unknown channel to avoid 404s.
  if (channel !== 'personal') {
    return NextResponse.json({ success: true, skipped: true, reason: 'not applicable for channel' });
  }

  return proxyToPythonService(req, getWABAServiceUrl(), '/api/accounts/sync');
}
