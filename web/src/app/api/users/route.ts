import { NextRequest, NextResponse } from 'next/server';

function getBackendBase() {
  const backendInternal = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3004';
  return backendInternal.replace(/\/$/, '');
}

export async function GET(req: NextRequest) {
  try {
    const backend = getBackendBase();
    const { searchParams } = new URL(req.url);
    const queryString = searchParams.toString();
    const url = `${backend}/api/users${queryString ? `?${queryString}` : ''}`;
    
    const token = req.cookies.get('access_token')?.value || req.headers.get('authorization')?.replace('Bearer ', '');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const resp = await fetch(url, {
      method: 'GET',
      headers,
    });
    
    const data = await resp.json().catch(() => ({}));
    
    if (!resp.ok) {
      return NextResponse.json(data, { status: resp.status });
    }
    
    return NextResponse.json(data);
  } catch (e: any) {
    console.error('[/api/users] GET Error:', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const backend = getBackendBase();
    
    const token = req.cookies.get('access_token')?.value || req.cookies.get('token')?.value || req.headers.get('authorization')?.replace('Bearer ', '');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const resp = await fetch(`${backend}/api/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    const data = await resp.json().catch(() => ({}));
    
    if (!resp.ok) {
      console.error('[/api/users] POST Error:', data);
      return NextResponse.json(data, { status: resp.status });
    }
    
    return NextResponse.json(data, { status: resp.status });
  } catch (e: any) {
    console.error('[/api/users] POST Error:', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
