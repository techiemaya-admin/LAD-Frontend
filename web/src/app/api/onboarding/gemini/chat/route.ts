/**
 * Onboarding Gemini Chat API Route
 * Proxies requests to the AI ICP Assistant backend
 */

import { NextRequest, NextResponse } from 'next/server';

// Use ICP feature backend for AI chat (port 3001)
// Fallback to main backend if ICP backend not available
const ICP_BACKEND_URL = process.env.NEXT_PUBLIC_ICP_BACKEND_URL || 'http://localhost:3001';
const MAIN_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3004';
const BACKEND_URL = ICP_BACKEND_URL; // Use ICP backend for chat

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get auth token from cookie
    const token = request.cookies.get('access_token')?.value;
    
    // Forward request to ICP feature backend AI Assistant
    // The ICP backend runs on port 3001 and has /api/ai-icp-assistant/chat
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
