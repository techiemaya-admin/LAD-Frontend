/**
 * AI ICP Assistant - Messages Batch Save API Route
 * Proxies to backend to persist chat messages (including lead search results) in ai_messages.message_data
 */
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001').replace(/\/+$/, '');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/api/ai-icp-assistant/messages/batch-save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[messages/batch-save] Backend error:', {
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
    console.error('[messages/batch-save] Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
