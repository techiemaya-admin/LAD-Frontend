/** POST /api/email-conversations/groups/[groupId]/contacts — add contacts */
import { NextRequest } from 'next/server';
import { proxyToWABA } from '../../../utils/proxy';

export async function POST(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  return proxyToWABA(req, `/api/email/groups/${groupId}/contacts`, 'POST');
}
