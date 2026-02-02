import { NextRequest, NextResponse } from 'next/server';
import { envConfig } from '../../../../../sdk/shared/config';

/**
 * Debug endpoint to check current environment configuration
 * GET /api/debug/env
 */
export async function GET(req: NextRequest) {
  // Only allow in non-production environments
  if (envConfig.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoint not available in production' }, 
      { status: 404 }
    );
  }

  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      activeEnvironment: envConfig.NODE_ENV,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        NEXT_PUBLIC_ICP_BACKEND_URL: process.env.NEXT_PUBLIC_ICP_BACKEND_URL,
        NEXT_PUBLIC_CAMPAIGN_BACKEND_URL: process.env.NEXT_PUBLIC_CAMPAIGN_BACKEND_URL,
        BACKEND_INTERNAL_URL: process.env.BACKEND_INTERNAL_URL,
      },
      resolvedConfig: {
        NODE_ENV: envConfig.NODE_ENV,
        BACKEND_URL: envConfig.BACKEND_URL,
        API_URL: envConfig.API_URL,
        ICP_BACKEND_URL: envConfig.ICP_BACKEND_URL,
        CAMPAIGN_BACKEND_URL: envConfig.CAMPAIGN_BACKEND_URL,
        BACKEND_INTERNAL_URL: envConfig.BACKEND_INTERNAL_URL,
      },
      environmentFileStatus: {
        '.env': 'Always loaded',
        '.env.local': 'Loaded in all environments (ignored by git)',
        '.env.development': envConfig.NODE_ENV === 'development' ? 'ACTIVE' : 'inactive',
        '.env.staging': envConfig.NODE_ENV === 'staging' ? 'ACTIVE' : 'inactive', 
        '.env.production': envConfig.NODE_ENV === 'production' ? 'ACTIVE' : 'inactive',
      },
      notes: {
        message: `Currently running in ${envConfig.NODE_ENV.toUpperCase()} environment`,
        backendUrl: envConfig.BACKEND_URL,
        usingDefaultBackend: !process.env.NEXT_PUBLIC_BACKEND_URL,
        currentWorkingDirectory: process.cwd(),
      }
    };

    return NextResponse.json(debugInfo, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('[/api/debug/env] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get environment info', details: error }, 
      { status: 500 }
    );
  }
}