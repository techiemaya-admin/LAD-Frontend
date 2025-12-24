import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../utils/backend';

export async function GET(req: NextRequest) {
  try {
    // Try to get token from Authorization header first, then fall back to cookies
    const authHeader = req.headers.get('Authorization');
    let token = authHeader?.replace('Bearer ', '');
    
    console.log('[/api/auth/me] Authorization header:', authHeader ? 'present' : 'missing');
    
    if (!token) {
      token = req.cookies.get('access_token')?.value;
      console.log('[/api/auth/me] Using cookie token:', token ? 'present' : 'missing');
    }
    
    if (!token) {
      console.log('[/api/auth/me] No token found, returning 401');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
     const backend = getBackendUrl();
    console.log('[/api/auth/me] Forwarding to backend:', `${backend}/api/auth/me`);
    
    const resp = await fetch(`${backend}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    
    console.log('[/api/auth/me] Backend response status:', resp.status);
    
    if (!resp.ok) {
      const errorText = await resp.text().catch(() => 'Unknown error');
      console.error('[/api/auth/me] Backend error response:', errorText);
      return NextResponse.json({ error: 'Failed to fetch user data', details: errorText }, { status: resp.status });
    }

    const data = await resp.json().catch((parseError) => {
      console.error('[/api/auth/me] Failed to parse backend response:', parseError);
      return {};
    });
    
    // Debug log to see the full backend response
    console.log('[/api/auth/me] Backend response data:', JSON.stringify(data, null, 2));
    
    // Ensure voice_agent_user_id is included in the response
    if (data.voice_agent_user_id) {
      console.log('[/api/auth/me] Found voice_agent_user_id:', data.voice_agent_user_id);
    } else {
      console.log('[/api/auth/me] No voice_agent_user_id found in response');
    }
    
    return NextResponse.json(data);
  } catch (e: any) {
    console.error('[/api/auth/me] Error:', e);
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 });
  }
}
