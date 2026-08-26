/**
 * Conversation Avatars Proxy
 * POST /api/whatsapp-conversations/conversations/avatars → WAPA /conversations/avatars
 *
 * Lazily resolves WhatsApp DPs (profile pictures) for a batch of conversation ids.
 * Personal WhatsApp only - the proxy routes channel=personal to LAD-WAPA-Comms, where
 * the URLs are fetched from Baileys and cached in wa_contacts.metadata (24h TTL).
 *
 * Pass the canonical waba-style path (/api/conversations/avatars) so the proxy's
 * personal-channel transform yields /api/whatsapp-conversations/conversations/avatars.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../../utils/python-proxy';

export async function POST(req: NextRequest) {
  return proxyToPythonService(req, getWABAServiceUrl(), '/api/conversations/avatars');
}
