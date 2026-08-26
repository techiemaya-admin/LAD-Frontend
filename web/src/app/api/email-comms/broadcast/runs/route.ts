/**
 * GET /api/email-comms/broadcast/runs  → LAD-Email-Comms GET /api/email-broadcast/runs
 *
 * Query: limit (1..100, default 20), offset (default 0).
 * Returns { runs: BroadcastRunSummary[], next_offset: number | null }.
 *
 * Used by the EmailChannelView "Sent" folder to render the broadcast history.
 */
import { NextRequest } from 'next/server';
import { proxyToEmailComms } from '../../utils/email-proxy';

export async function GET(req: NextRequest): Promise<Response> {
  return proxyToEmailComms(req, '/api/email-broadcast/runs');
}
