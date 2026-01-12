import { NextRequest, NextResponse } from 'next/server';

function getBackendBase() {
  const backendInternal = process.env.BACKEND_INTERNAL_URL || 'https://lad-backend-develop-741719885039.us-central1.run.app';
  return backendInternal.replace(/\/$/, '');
}

export async function POST(req: NextRequest) {
  try {
    const backend = getBackendBase();
    
    const token = req.cookies.get('token')?.value || req.headers.get('authorization')?.replace('Bearer ', '');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Frontend-ID': 'settings',
      'X-API-Key': '_L5cf6UXDkGTcWRaHka9Q13Kmu4k5dxaKEPRH165U8U',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const resp = await fetch(`${backend}/api/calendar/google/disconnect`, {
      method: 'POST',
      headers,
    });
    
    const data = await resp.json().catch(() => ({}));
    
    if (!resp.ok) {
      return NextResponse.json(data, { status: resp.status });
    }
    
    return NextResponse.json(data);
  } catch (e: any) {
    console.error('[/api/calendar/google/disconnect] POST Error:', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
