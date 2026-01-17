/**
 * Onboarding Gemini Chat API Route
 * Proxies requests to the AI ICP Assistant backend
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 
                    process.env.NEXT_PUBLIC_BACKEND_URL || 
                    process.env.NEXT_PUBLIC_ICP_BACKEND_URL ||
                    'https://lad-backend-develop-741719885039.us-central1.run.app';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('[onboarding/gemini/chat] Received request:', {
      hasMessage: !!body.message,
      message: body.message?.substring(0, 50),
      keys: Object.keys(body)
    });
    
    // Get auth token from cookie
    const token = request.cookies.get('access_token')?.value;
    
    // Forward request to ICP feature backend AI Assistant
    // The ICP backend runs on port 3001 and has /api/ai-icp-assistant/chat
    console.log('[onboarding/gemini/chat] Forwarding to:', `${BACKEND_URL}/api/ai-icp-assistant/chat`);
    
    const response = await fetch(`${BACKEND_URL}/api/ai-icp-assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(body)
    });

    console.log('[onboarding/gemini/chat] Backend response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[onboarding/gemini/chat] Backend error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Backend error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[onboarding/gemini/chat] Backend response data:', {
      hasResponse: !!data.response,
      hasText: !!data.text,
      success: data.success
    });
    
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
    console.error('[onboarding/gemini/chat] Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Check if it's a network error (backend not reachable)
    if (error.message?.includes('fetch failed') || error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { 
          text: 'Unable to connect to AI backend. Please ensure the backend server is running on port 3001.',
          options: null,
          error: 'Backend connection failed'
        },
        { status: 503 }
      );
    }
    
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
