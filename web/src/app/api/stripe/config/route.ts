import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../utils/backend';
import { logger } from '@/lib/logger';
export async function GET(req: NextRequest) {
  try {
    // Return a minimal config for now
    // In production, this should fetch from backend with proper authentication
    return NextResponse.json({
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
      enabled: false
    }, { status: 200 });
  } catch (error: any) {
    logger.error('[/api/stripe/config] Error', error);
    return NextResponse.json({ 
      publishableKey: '',
      enabled: false 
    }, { status: 200 });
  }
}