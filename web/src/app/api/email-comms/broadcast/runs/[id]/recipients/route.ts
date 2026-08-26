/**
 * GET /api/email-comms/broadcast/runs/[id]/recipients
 *   → LAD-Email-Comms GET /api/email-broadcast/runs/{id}/recipients
 *
 * Query: status (pending|sent|failed|skipped_unsubscribed),
 *        limit (1..500, default 100), offset.
 *
 * Used for the "see who got it / who failed" drill-down view.
 */
import { NextRequest } from 'next/server';
import { proxyToEmailComms } from '../../../../utils/email-proxy';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return proxyToEmailComms(
    req,
    `/api/email-broadcast/runs/${encodeURIComponent(id)}/recipients`,
  );
}
