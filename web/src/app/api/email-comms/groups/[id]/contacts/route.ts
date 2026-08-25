/**
 * /api/email-comms/groups/[id]/contacts
 *   POST → LAD-Email-Comms POST /api/email-broadcast/groups/{id}/contacts
 *
 * Body: { contact_ids: string[] } - up to 2000 per call, server dedups.
 */
import { NextRequest } from 'next/server';
import { proxyToEmailComms } from '../../../utils/email-proxy';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return proxyToEmailComms(
    req,
    `/api/email-broadcast/groups/${encodeURIComponent(id)}/contacts`,
  );
}
