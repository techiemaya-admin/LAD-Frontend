import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

function getBackendBase() {
  const backendInternal = process.env.BACKEND_INTERNAL_URL || 'https://lad-backend-develop-160078175457.us-central1.run.app';
  return backendInternal.replace(/\/$/, '');
}

function getAuthHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = req.cookies.get('token')?.value || req.headers.get('authorization')?.replace('Bearer ', '');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * POST /api/campaigns/email-templates/upload-attachment
 * Upload a document attachment (PDF, DOCX, etc.) for email templates — 20 MB limit
 */
export async function POST(req: NextRequest) {
  try {
    const backend = getBackendBase();
    const url = `${backend}/api/campaigns/email-templates/upload-attachment`;

    const formData = await req.formData();
    const headers = getAuthHeaders(req);

    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      logger.error('[/api/campaigns/email-templates/upload-attachment] POST Error', { status: resp.status, data });
      return NextResponse.json(data, { status: resp.status });
    }

    return NextResponse.json(data);
  } catch (e: any) {
    logger.error('[/api/campaigns/email-templates/upload-attachment] POST Error', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
