/** DELETE /api/email-conversations/groups/[groupId]/contacts/[contactId] */
import { NextRequest } from 'next/server';
import { proxyToWABA } from '../../../../utils/proxy';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string; contactId: string }> }
) {
  const { groupId, contactId } = await params;
  return proxyToWABA(req, `/api/email/groups/${groupId}/contacts/${contactId}`, 'DELETE');
}
