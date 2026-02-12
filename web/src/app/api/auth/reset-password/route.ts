import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../utils/backend';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    logger.debug('[/api/auth/reset-password] Reset password attempt started');
    const body = await req.json().catch(() => ({}));
    const { password, token } = body || {};

    if (!password || !token) {
      logger.warn('[/api/auth/reset-password] Missing password or token');
      return NextResponse.json({ error: 'Password and token are required.' }, { status: 400 });
    }

    const backend = getBackendUrl();
    logger.debug('[/api/auth/reset-password] Forwarding to backend API', { backend });

    const resp = await fetch(`${backend}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, token }),
    });

    logger.debug('[/api/auth/reset-password] Backend response received', { status: resp.status });
    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      logger.warn('[/api/auth/reset-password] Backend returned error', { status: resp.status });
      return NextResponse.json(data, { status: resp.status });
    }

    return NextResponse.json({ message: 'Password reset successfully' });
  } catch (e: any) {
    logger.error('Reset password endpoint error', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
