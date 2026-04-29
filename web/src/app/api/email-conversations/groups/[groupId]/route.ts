/** GET|DELETE /api/email-conversations/groups/[groupId] */
import { NextRequest } from 'next/server';
import { proxyToWABA } from '../../utils/proxy';

export async function GET(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  return proxyToWABA(req, `/api/email/groups/${groupId}`);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  return proxyToWABA(req, `/api/email/groups/${groupId}`, 'DELETE');
}
