/**
 * AI ICP Assistant - Industry Classification API Route
 * Forwards requests to the ICP backend server
 */
import { NextRequest, NextResponse } from 'next/server';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Forward to ICP backend
    const response = await fetch(`${BACKEND_URL}/api/ai-icp-assistant/classify-industry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ai-icp-assistant/classify-industry] Backend error:', {
        status: response.status,
        statusText: response.statusText,
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
    console.error('[ai-icp-assistant/classify-industry] Error:', {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}