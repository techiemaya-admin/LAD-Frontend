/**
 * AI ICP Assistant - Industry Suggestions API Route
 * Forwards requests to the ICP backend server
 */
import { NextRequest, NextResponse } from 'next/server';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    // Forward to ICP backend
    const response = await fetch(`${BACKEND_URL}/api/ai-icp-assistant/industry-suggestions?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ai-icp-assistant/industry-suggestions] Backend error:', {
        status: response.status,
        error: errorText,
      });
      return NextResponse.json(
        { success: false, error: `Backend error: ${response.statusText}` },
        { status: response.status }
      );
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[ai-icp-assistant/industry-suggestions] Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}