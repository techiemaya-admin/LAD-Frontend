import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

function getBackendBase() {
  const backendInternal = process.env.BACKEND_INTERNAL_URL || 'https://lad-backend-develop-160078175457.us-central1.run.app';
  return backendInternal.replace(/\/$/, '');
}

function getAuthHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = req.cookies.get('token')?.value || req.headers.get('authorization')?.replace('Bearer ', '');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * GET /api/campaigns/email-templates/default
 * Get the default email template for the tenant
 */
export async function GET(req: NextRequest) {
  try {
    const backend = getBackendBase();
    const url = `${backend}/api/campaigns/email-templates/default`;

    const headers = getAuthHeaders(req);
    const resp = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      logger.error('[/api/campaigns/email-templates/default] GET Error', { status: resp.status, data });
      return NextResponse.json(data, { status: resp.status });
    }

    return NextResponse.json(data);
  } catch (e: any) {
    logger.error('[/api/campaigns/email-templates/default] GET Error', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
