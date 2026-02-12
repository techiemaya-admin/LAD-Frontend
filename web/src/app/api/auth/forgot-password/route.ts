import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../utils/backend';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    logger.debug('[/api/auth/forgot-password] Forgot password attempt started');
    const body = await req.json().catch(() => ({}));
    const { email } = body || {};

    if (!email) {
      logger.warn('[/api/auth/forgot-password] Missing email');
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const backend = getBackendUrl();
    logger.debug('[/api/auth/forgot-password] Forwarding to backend API', { backend });

    const resp = await fetch(`${backend}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    logger.debug('[/api/auth/forgot-password] Backend response received', { status: resp.status });
    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      logger.warn('[/api/auth/forgot-password] Backend returned error', { status: resp.status });
      return NextResponse.json(data, { status: resp.status });
    }

    return NextResponse.json({ message: 'Reset email sent successfully' });
  } catch (e: any) {
    logger.error('Forgot password endpoint error', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
