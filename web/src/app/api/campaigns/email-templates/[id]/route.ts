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
 * GET /api/campaigns/email-templates/:id
 * Get a single email template by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const backend = getBackendBase();
    const { id } = await params;
    const url = `${backend}/api/campaigns/email-templates/${id}`;

    const headers = getAuthHeaders(req);
    const resp = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      logger.error('[/api/campaigns/email-templates/:id] GET Error', { id, status: resp.status, data });
      return NextResponse.json(data, { status: resp.status });
    }

    return NextResponse.json(data);
  } catch (e: any) {
    logger.error('[/api/campaigns/email-templates/:id] GET Error', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}

/**
 * PUT /api/campaigns/email-templates/:id
 * Update an email template
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const backend = getBackendBase();
    const { id } = await params;
    const url = `${backend}/api/campaigns/email-templates/${id}`;

    const headers = getAuthHeaders(req);
    const resp = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      logger.error('[/api/campaigns/email-templates/:id] PUT Error', { id, status: resp.status, data });
      return NextResponse.json(data, { status: resp.status });
    }

    return NextResponse.json(data);
  } catch (e: any) {
    logger.error('[/api/campaigns/email-templates/:id] PUT Error', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}

/**
 * DELETE /api/campaigns/email-templates/:id
 * Soft-delete an email template
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const backend = getBackendBase();
    const { id } = await params;
    const url = `${backend}/api/campaigns/email-templates/${id}`;

    const headers = getAuthHeaders(req);
    const resp = await fetch(url, {
      method: 'DELETE',
      headers,
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      logger.error('[/api/campaigns/email-templates/:id] DELETE Error', { id, status: resp.status, data });
      return NextResponse.json(data, { status: resp.status });
    }

    return NextResponse.json(data);
  } catch (e: any) {
    logger.error('[/api/campaigns/email-templates/:id] DELETE Error', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
