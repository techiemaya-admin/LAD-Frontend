/**
 * /api/email-comms/groups/[id]/contacts/[contactId]
 *   DELETE → LAD-Email-Comms DELETE /api/email-broadcast/groups/{id}/contacts/{contactId}
 *
 * Returns 204 on success (no body).
 */
import { NextRequest } from 'next/server';
import { proxyToEmailComms } from '../../../../utils/email-proxy';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> },
): Promise<Response> {
  const { id, contactId } = await params;
  return proxyToEmailComms(
    req,
    `/api/email-broadcast/groups/${encodeURIComponent(id)}/contacts/${encodeURIComponent(contactId)}`,
  );
}
