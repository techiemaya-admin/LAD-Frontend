/**
 * Universal Feature Proxy Handler
 * 
 * PURPOSE:
 * Single unified proxy that routes all feature requests to backend.
 * Mirrors backend's feature-based architecture exactly.
 * 
 * SUPPORTED FEATURES:
 * - social-integration
 * - voice-agent
 * - apollo-leads
 * - lead-enrichment
 * - campaigns
 * - ai-icp-assistant
 * 
 * ROUTE PATTERN:
 * Frontend: /api/{feature}/{...path}
 * Backend:  /api/{feature}/{...path}
 * 
 * EXAMPLES:
 * /api/social-integration/linkedin/status → backend:/api/social-integration/linkedin/status
 * /api/voice-agent/calls/recent           → backend:/api/voice-agent/calls/recent
 * /api/apollo-leads/search                → backend:/api/apollo-leads/search
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../utils/backend';

async function handler(
  req: NextRequest,
  { params }: { params: { feature: string; path: string[] } }
) {
  try {
    const backend = getBackendUrl();
    const { feature, path } = params;
    
    // Build backend URL
    const pathSegments = path || [];
    const fullPath = pathSegments.join('/');
    const searchParams = req.nextUrl.searchParams.toString();
    const url = `${backend}/api/${feature}/${fullPath}${searchParams ? `?${searchParams}` : ''}`;
    
    // Get auth token from cookie or Authorization header
    const token = req.cookies.get('access_token')?.value || 
                  req.headers.get('authorization')?.replace('Bearer ', '');
    
    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Get request body for non-GET requests
    let body: string | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = await req.text();
    }
    
    // Forward request to backend
    const response = await fetch(url, {
      method: req.method,
      headers,
      body,
    });
    
    // Get response data
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    
    let data: any;
    if (isJson) {
      data = await response.json().catch(() => ({}));
    } else {
      data = await response.text();
    }
    
    // Return response
    if (!response.ok) {
      return NextResponse.json(
        isJson ? data : { error: data },
        { status: response.status }
      );
    }
    
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error(`[/api/${params.feature}] Error:`, error.message);
    return NextResponse.json(
      { error: `Failed to proxy to ${params.feature} feature` },
      { status: 500 }
    );
  }
}

// Export all HTTP methods
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
