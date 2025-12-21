import { NextRequest, NextResponse } from 'next/server';

function getBackendBase() {
  const backendInternal = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3004';
  return backendInternal.replace(/\/$/, '');
}

// PUT /api/users/:userId/capabilities
export async function PUT(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const backend = getBackendBase();
    const { userId } = params;
    
    const token = req.cookies.get('access_token')?.value || req.cookies.get('token')?.value || req.headers.get('authorization')?.replace('Bearer ', '');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const resp = await fetch(`${backend}/api/users/${userId}/capabilities`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    
    const data = await resp.json().catch(() => ({}));
    
    if (!resp.ok) {
      console.error(`[/api/users/${userId}/capabilities] PUT Error:`, data);
      return NextResponse.json(data, { status: resp.status });
    }
    
    return NextResponse.json(data);
  } catch (e: any) {
    console.error('[/api/users/:userId/capabilities] PUT Error:', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
