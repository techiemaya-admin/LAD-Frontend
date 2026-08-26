/**
 * GET /api/email-comms/broadcast/runs/[id]/stats
 *   → LAD-Email-Comms GET /api/email-broadcast/runs/{id}/stats
 *
 * Engagement rollup for one broadcast: delivery, opens (unique/total/rate,
 * proxy-inflated share), repeat openers, time-to-first-open, clicks + top
 * links, opens-by-day timeline, failure breakdown.
 */
import { NextRequest } from 'next/server';
import { proxyToEmailComms } from '../../../../utils/email-proxy';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return proxyToEmailComms(req, `/api/email-broadcast/runs/${encodeURIComponent(id)}/stats`);
}
