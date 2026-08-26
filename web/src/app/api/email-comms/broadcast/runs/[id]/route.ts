/**
 * GET /api/email-comms/broadcast/runs/[id]  → LAD-Email-Comms GET /api/email-broadcast/runs/{id}
 *
 * Returns BroadcastRunDetail. Polled by EmailChannelView while a broadcast
 * is in 'queued'/'running'/'paused_quota_exceeded' status to surface progress.
 */
import { NextRequest } from 'next/server';
import { proxyToEmailComms } from '../../../utils/email-proxy';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  // Next.js 16: params is a Promise.
  const { id } = await params;
  return proxyToEmailComms(req, `/api/email-broadcast/runs/${encodeURIComponent(id)}`);
}
