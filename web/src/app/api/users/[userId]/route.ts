import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
function getBackendBase() {
  const backendInternal = process.env.BACKEND_INTERNAL_URL || 'https://lad-backend-develop-741719885039.us-central1.run.app';
  return backendInternal.replace(/\/$/, '');
}
// DELETE /api/users/:userId
export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const backend = getBackendBase();
    const { userId } = params;
    const token = req.cookies.get('access_token')?.value || req.cookies.get('token')?.value || req.headers.get('authorization')?.replace('Bearer ', '');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const resp = await fetch(`${backend}/api/users/${userId}`, {
      method: 'DELETE',
      headers,
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      logger.error('[/api/users/:userId] DELETE Error', { userId, status: resp.status, data });
      return NextResponse.json(data, { status: resp.status });
    }
    return NextResponse.json(data);
  } catch (e: any) {
    logger.error('[/api/users/:userId] DELETE Error', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}