import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../utils/backend';
/**
 * POST /api/profile-summary/generate
 * Proxy to backend: POST /api/campaigns/:campaignId/leads/:leadId/summary
 */
export async function POST(req: NextRequest) {
  try {
    const backend = getBackendUrl();
    const body = await req.json();
    const { leadId, campaignId } = body;
    if (!leadId || !campaignId) {
      return NextResponse.json({ 
        success: false,
        error: 'leadId and campaignId are required in request body'
      }, { status: 400 });
    }
    // Build URL - proxy to campaigns endpoint
    const url = `${backend}/api/campaigns/${campaignId}/leads/${leadId}/summary`;
    // Get auth token
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    const token = 
      (authHeader && authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null) ||
      req.cookies.get('token')?.value;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error('[/api/profile-summary/generate] POST error:', {
        status: resp.status,
        data
      });
      return NextResponse.json(data, { status: resp.status });
    }
    return NextResponse.json(data);
  } catch (e: any) {
    console.error('[/api/profile-summary/generate] POST Error:', e);
    return NextResponse.json({ 
      success: false,
      error: 'Internal error', 
      details: e?.message
    }, { status: 500 });
  }
}
