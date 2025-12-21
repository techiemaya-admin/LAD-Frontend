import { NextRequest, NextResponse } from 'next/server';

function getBackendBase() {
  // For server-side calls, use direct localhost connection to avoid nginx routing
  const backendInternal = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3004';
  return backendInternal.replace(/\/$/, '');
}

export async function POST(req: NextRequest) {
  try {
    console.log('[/api/auth/login] Login attempt started');
    const body = await req.json().catch(() => ({}));
    const { email, password } = body || {};
    console.log('[/api/auth/login] Email:', email);
    
    if (!email || !password) {
      console.log('[/api/auth/login] Missing email or password');
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const backend = getBackendBase();
    console.log('[/api/auth/login] Backend URL:', backend);
    console.log('[/api/auth/login] Forwarding to:', `${backend}/api/auth/login`);
    
    const resp = await fetch(`${backend}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    console.log('[/api/auth/login] Backend response status:', resp.status);
    console.log('[/api/auth/login] Backend response status:', resp.status);

    const data = await resp.json().catch(() => ({}));
    console.log('[/api/auth/login] Backend response data:', data);
    
    if (!resp.ok) {
      console.log('[/api/auth/login] Backend returned error');
      return NextResponse.json(data, { status: resp.status });
    }

    const token: string | undefined = data?.token;
    const user = data?.user;
    console.log('[/api/auth/login] Token present:', !!token);
    
    if (!token) {
      console.log('[/api/auth/login] Token missing from backend response');
      return NextResponse.json({ error: 'Token missing from backend response' }, { status: 502 });
    }

    // Fetch user capabilities
    let capabilities = [];
    try {
      const capabilitiesResponse = await fetch(`${backend}/api/user-capabilities/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (capabilitiesResponse.ok) {
        const capabilitiesData = await capabilitiesResponse.json();
        capabilities = capabilitiesData.capabilities || [];
        console.log('[/api/auth/login] Fetched user capabilities:', capabilities);
      } else {
        console.warn('[/api/auth/login] Failed to fetch user capabilities:', capabilitiesResponse.status);
      }
    } catch (error) {
      console.error('[/api/auth/login] Error fetching user capabilities:', error);
    }

    console.log('[/api/auth/login] Login successful, setting cookie');
    const res = NextResponse.json({ 
      user: {
        ...user,
        capabilities
      }, 
      token 
    });
    
    // Set cookie with production-safe settings
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookies.set('access_token', token, {
      httpOnly: true,
      secure: isProduction, // Only require HTTPS in production
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    
    console.log('[/api/auth/login] Cookie set with httpOnly:true, secure:', isProduction, 'sameSite:lax, path:/, maxAge: 7days');
    console.log('[/api/auth/login] Cookie name: access_token, value length:', token.length);
    return res;
  } catch (e: any) {
    console.error('[/api/auth/login] Error:', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
