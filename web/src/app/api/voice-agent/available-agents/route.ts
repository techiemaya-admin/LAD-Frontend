import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../utils/backend';

export async function GET(req: NextRequest) {
  try {
    // Try to get token from Authorization header first, then fall back to cookies
    const authHeader = req.headers.get('Authorization');
    let token = authHeader?.replace('Bearer ', '');
    
    // Try multiple cookie names
    if (!token) {
      token = req.cookies.get('access_token')?.value;
    }
    if (!token) {
      token = req.cookies.get('accessToken')?.value;
    }
    if (!token) {
      token = req.cookies.get('auth_token')?.value;
    }
    if (!token) {
      token = req.cookies.get('token')?.value;
    }
    
    // Log available cookies for debugging
    console.log('[Agents] Available cookies:', Array.from(req.cookies.getAll()).map(c => c.name));
    console.log('[Agents] Token found:', !!token);
    
    if (!token) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }
    
    const backend = getBackendUrl();
    const apiUrl = `${backend}/api/voice-agent/user/available-agents`;
    
    console.log('[Proxy] Fetching agents from:', apiUrl);
    
    const resp = await fetch(apiUrl, {
      method: 'GET',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    
    console.log('[Proxy] Backend response status:', resp.status);

    if (!resp.ok) {
      const errorText = await resp.text().catch(() => 'Unknown error');
      console.error('[Proxy] Backend error:', errorText);
      return NextResponse.json(
        { error: `Backend returned ${resp.status}`, details: errorText },
        { status: resp.status }
      );
    }

    const data = await resp.json().catch(() => ({}));
    console.log('[Proxy] Successfully fetched agents');

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
