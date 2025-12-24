import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../utils/backend';

export async function GET(req: NextRequest) {
  try {
    // For now, return enabled feature flags
    // In production, this should check authentication and fetch from backend
    const fallbackFlags = {
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
        }
      },
      metadata: {
        last_updated: new Date().toISOString(),
        version: "1.0.0"
      }
    };

    return NextResponse.json(fallbackFlags);
  } catch (e: any) {
    console.error('[/api/feature-flags] Error:', e);
    
    // Return minimal fallback flags on error
    return NextResponse.json({
      features: {
        'apollo-leads': { enabled: true },
        'ai-icp-assistant': { enabled: true },
      },
      metadata: {
        last_updated: new Date().toISOString(),
        version: "1.0.0"
      }
    });
  }
}
