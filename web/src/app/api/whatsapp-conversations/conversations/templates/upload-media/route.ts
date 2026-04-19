/**
 * Template Media Upload Proxy
 * Receives multipart/form-data from frontend and forwards to Node backend.
 * Channel is always 'personal' — WABA media uploads are handled separately.
 */
import { NextRequest, NextResponse } from 'next/server';

function getBackendUrl(): string {
  return (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:3004'
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = req.headers.get('authorization');
    const tenantId = req.headers.get('x-tenant-id');

    // Forward multipart form data directly to Node backend
    const backendUrl = `${getBackendUrl()}/api/whatsapp-conversations/conversations/templates/upload-media`;

    const headers: Record<string, string> = {};
    if (authHeader) headers['Authorization'] = authHeader;
    if (tenantId) headers['X-Tenant-ID'] = tenantId;
    // Do NOT set Content-Type — let fetch set the multipart boundary automatically

    const formData = await req.formData();

    const response = await fetch(backendUrl, {
      method: 'POST',
      body: formData,
      headers,
    });

    const data = await response.json().catch(() => ({ error: 'Backend error' }));

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
