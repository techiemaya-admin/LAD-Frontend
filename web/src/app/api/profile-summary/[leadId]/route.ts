import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../utils/backend';
/**
 * GET /api/profile-summary/:leadId
 * Proxy to backend: GET /api/campaigns/:campaignId/leads/:leadId/summary
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;
    const backend = getBackendUrl();
    // Get query parameters from the request
    const searchParams = req.nextUrl.searchParams;
    const campaignId = searchParams.get('campaignId');
    if (!campaignId) {
      return NextResponse.json({ 
        success: false,
        error: 'campaignId query parameter is required'
      }, { status: 400 });
    }
    // Build URL - proxy to campaigns endpoint
    const url = `${backend}/api/campaigns/${campaignId}/leads/${leadId}/summary`;
    // Get auth token
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    const token = 
      (authHeader && authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null) ||
      req.cookies.get('access_token')?.value || 
      req.cookies.get('auth_token')?.value ||
      req.cookies.get('token')?.value;
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
    // Backend always returns 200 with { success: true, summary: null, exists: false } when no summary found
    // Only real errors return non-200 status
    if (!resp.ok) {
      console.error('[/api/profile-summary/:leadId] GET error:', {
        status: resp.status,
        data
      });
      return NextResponse.json(data, { status: resp.status });
    }
    return NextResponse.json(data);
  } catch (e: any) {
    console.error('[/api/profile-summary/:leadId] GET Error:', e);
    return NextResponse.json({ 
      success: false,
      error: 'Internal error', 
      details: e?.message
    }, { status: 500 });
  }
}