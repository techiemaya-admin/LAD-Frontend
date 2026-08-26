/**
 * POST /api/email-comms/broadcast/send  → LAD-Email-Comms POST /api/email-broadcast/send
 *
 * Body shape - see LAD-Email-Comms api/schemas/broadcast.py BroadcastSendRequest:
 *   {
 *     from_email_account_id: UUID,
 *     subject: string,
 *     body_html: string,
 *     body_text?: string,
 *     template_id?: UUID,
 *     recipients: [{ email, name?, metadata? }, ...]  // 1..5000
 *   }
 *
 * Returns 202 Accepted with { broadcast_run_id, status: 'queued', recipient_count }.
 * The actual sending runs as a background task on LAD-Email-Comms - the frontend
 * polls GET /runs/{id} for status.
 */
import { NextRequest } from 'next/server';
import { proxyToEmailComms } from '../../utils/email-proxy';

export async function POST(req: NextRequest): Promise<Response> {
  return proxyToEmailComms(req, '/api/email-broadcast/send');
}
