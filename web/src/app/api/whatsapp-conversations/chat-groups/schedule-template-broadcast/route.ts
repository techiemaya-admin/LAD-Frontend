/**
 * Schedule Template Broadcast Proxy
 * POST /api/whatsapp-conversations/chat-groups/schedule-template-broadcast
 *   → WAPA /chat-groups/schedule-template-broadcast (personal WhatsApp only)
 *
 * Schedules a template broadcast (one template → N groups) to fire at a chosen
 * time via a GCP Cloud Task.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../../utils/python-proxy';

export async function POST(req: NextRequest) {
  return proxyToPythonService(req, getWABAServiceUrl(), '/api/chat-groups/schedule-template-broadcast');
}
