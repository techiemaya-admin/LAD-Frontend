// app/api/webhooks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import type { WebhookEvent } from '@clerk/nextjs/server';
import { Webhook } from 'svix';
import { logger } from '@/lib/logger';

// Conditional Prisma import to avoid build errors
let PrismaClient: any = null;
let prisma: any = null;

try {
  ({ PrismaClient } = require('@prisma/client'));
  prisma = new PrismaClient();
} catch (error) {
  logger.warn('Prisma client not available, webhooks will not work properly');
}
export async function POST(req: NextRequest) {
  try {
    // Check if Prisma client is available
    if (!prisma) {
      logger.error('Prisma client not available');
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const payload = await req.text();
    const headerPayload = headers();
    const svixId = (await headerPayload).get('svix-id');
    const svixTimestamp = (await headerPayload).get('svix-timestamp');
    const svixSignature = (await headerPayload).get('svix-signature');
    // Debug logs (development only)
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Webhook headers received', {
        hasId: !!svixId,
        hasTimestamp: !!svixTimestamp,
        hasSignature: !!svixSignature
      });
    }
    if (!svixId || !svixTimestamp || !svixSignature) {
      logger.error('Missing Svix headers');
      return NextResponse.json({ error: 'Missing Svix headers' }, { status: 400 });
    }
    const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    if (!secret) {
      logger.error('Missing CLERK_WEBHOOK_SIGNING_SECRET');
      return NextResponse.json({ error: 'Missing CLERK_WEBHOOK_SIGNING_SECRET' }, { status: 400 });
    }
    const wh = new Webhook(secret);
    const evt = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
    const { type: eventType } = evt;
    const clerkUserId = evt.data.id as string;
    logger.debug('Processing webhook', { eventType, clerkUserId });
    switch (eventType) {
      case 'user.created':
      case 'user.updated': {
        const data = evt.data as any;
        const first_name = data.first_name || null;
        const last_name = data.last_name || null;
        const imageUrl = data.image_url || null;
        const email = data.email_addresses?.[0]?.email_address || null;
        await prisma.user.upsert({
          where: { clerk_user_id: clerkUserId },
          create: {
            clerk_user_id: clerkUserId,
            email,
            first_name,
            last_name,
            image_url: imageUrl,
          },
          update: {
            email,
            first_name,
            last_name,
            image_url: imageUrl,
          },
        });
        break;
      }
      case 'user.deleted': {
        // Soft-delete example (add `deleted_at: DateTime?` to your User model in schema.prisma)
        await prisma.user.updateMany({
          where: { clerk_user_id: clerkUserId },
          data: { deleted_at: new Date() },
        });
        // Or hard delete: await prisma.user.delete({ where: { clerk_user_id: clerkUserId } });
        break;
      }
      default:
        logger.warn('Unhandled webhook event type', { eventType });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('Webhook processing error', error);
    return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 });
  } finally {
    await prisma.$disconnect();
  }
}