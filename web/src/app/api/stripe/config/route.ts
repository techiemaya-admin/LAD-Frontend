import { NextRequest, NextResponse } from 'next/server';

function getBackendBase() {
  const backendInternal = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3004';
  return backendInternal.replace(/\/$/, '');
}

export async function GET(req: NextRequest) {
  try {
    // Return a minimal config for now
    // In production, this should fetch from backend with proper authentication
    return NextResponse.json({
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
      enabled: false
    }, { status: 200 });
  } catch (error: any) {
    console.error('[/api/stripe/config] Error:', error.message);
    return NextResponse.json({ 
      publishableKey: '',
      enabled: false 
    }, { status: 200 });
  }
}
