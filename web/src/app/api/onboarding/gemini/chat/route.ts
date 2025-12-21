/**
 * Onboarding Gemini Chat API Route
 * Proxies requests to the AI ICP Assistant backend
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get auth token from cookie
    const token = request.cookies.get('access_token')?.value;
    
    // Forward request to backend AI ICP Assistant
    const response = await fetch(`${BACKEND_URL}/api/ai-icp-assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    // Transform response to match frontend expectations
    return NextResponse.json({
      text: data.response || data.text || '',
      options: data.options || null,
      workflowUpdates: data.workflowUpdates || [],
      currentState: data.currentState || null,
      nextQuestion: data.nextQuestion || null,
      nextAction: data.nextAction || null,
      platform: data.platform || null,
      feature: data.feature || null,
      status: data.status || 'need_input',
      missing: data.missing || [],
      workflow: data.workflow || [],
      schedule: data.schedule || null,
      searchResults: data.searchResults || [],
      suggestedParams: data.suggestedParams || null,
      shouldScrape: data.shouldScrape || false
    });

  } catch (error: any) {
    console.error('[onboarding/gemini/chat] Error:', error);
    return NextResponse.json(
      { 
        text: 'I apologize, but I encountered an error. Please try again.',
        options: null,
        error: error.message 
      },
      { status: 500 }
    );
  }
}
