import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../utils/backend';

export async function GET(req: NextRequest) {
  try {
    // Get the authentication token from cookies or headers
    const authHeader = req.headers.get('authorization');
    
    // Fetch feature flags from the backend API
    const backendUrl = getBackendUrl();
    const backendResponse = await fetch(`${backendUrl}/api/feature-flags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
      credentials: 'include',
    });

    if (!backendResponse.ok) {
      throw new Error(`Backend returned ${backendResponse.status}`);
    }

    const flags = await backendResponse.json();
    return NextResponse.json(flags);
  } catch (e: any) {
    console.error('[/api/feature-flags] Error fetching from backend:', e);
    
    // Return sensible fallback flags when backend is unavailable
    // All features default to enabled to avoid blocking users
    return NextResponse.json({
      features: {
        'apollo-leads': {
          enabled: true,
          description: "Apollo.io lead generation",
          environments: { development: true, staging: true, production: true },
          user_groups: ['admin', 'sales', 'premium'],
          rollout_percentage: 100
        },
        'ai-icp-assistant': {
          enabled: true,
          description: "AI ICP Assistant for search guidance",
          environments: { development: true, staging: true, production: true },
          user_groups: ['admin', 'sales', 'premium'],
          rollout_percentage: 100
        },
        'voice-agent': {
          enabled: true,
          description: "AI voice agent",
          environments: { development: true, staging: true, production: true },
          user_groups: ['admin', 'sales'],
          rollout_percentage: 100
        },
        'campaigns_basic': {
          enabled: true,
          description: "Basic campaign features",
          environments: { development: true, staging: true, production: true },
          user_groups: ['admin', 'sales', 'premium'],
          rollout_percentage: 100
        },
        'campaigns_advanced_analytics': {
          enabled: true,
          description: "Advanced campaign analytics",
          environments: { development: true, staging: true, production: true },
          user_groups: ['admin', 'premium'],
          rollout_percentage: 100
        },
        'social_integration': {
          enabled: true,
          description: "Social media integrations",
          environments: { development: true, staging: true, production: true },
          user_groups: ['admin', 'sales'],
          rollout_percentage: 100
        },
        'deals_pipeline': {
          enabled: true,
          description: "Deals pipeline management",
          environments: { development: true, staging: true, production: true },
          user_groups: ['admin', 'sales'],
          rollout_percentage: 100
        }
      },
      metadata: {
        last_updated: new Date().toISOString(),
        version: "1.0.0",
        source: 'fallback' // Indicates this came from fallback, not database
      }
    }, { status: 200 });
  }
}
