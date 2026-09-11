import { NextRequest, NextResponse } from 'next/server';
import { forwardJson, callerToken } from '../../../auth/identity-proxy';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** PATCH { status, notes?, tenant_id? } — super-admin review. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ success: false, error: 'Application not found.' }, { status: 404 });
  const token = callerToken(req);
  if (!token) return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  return forwardJson(req, `/api/signup/applications/${id}`, 'PATCH', {
    headers: { Authorization: `Bearer ${token}` },
    tag: '[/api/signup/applications PATCH]',
  });
}
