// app/api/auth/resolve-login/route.ts (deprecated)
import { NextRequest, NextResponse } from 'next/server';
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error: 'This route is deprecated. Use POST /api/auth/login in voiceagent-ui which proxies sts-service /api/auth/login.'
    },
    { status: 410 }
  );
}