import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

function getBackendBase() {
  const backendInternal = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3004';
  return backendInternal.replace(/\/$/, '');
}

export async function GET(req: NextRequest) {
  try {
    // Get auth token from cookies or Authorization header
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value || 
                  req.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const backend = getBackendBase();
    const resp = await fetch(`${backend}/api/metrics`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
    });
    
    const data = await resp.json().catch(() => ({}));
    
    if (!resp.ok) {
      return NextResponse.json(data, { status: resp.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('[/api/metrics] Error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
