import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, slugify } from '../_helpers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: post });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const unauthorized = requireAdmin(request, body.token);
  if (unauthorized) return unauthorized;

  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.title === 'string') data.title = body.title.trim();
  if (typeof body.slug === 'string') data.slug = slugify(body.slug);
  if (body.excerpt !== undefined)
    data.excerpt = body.excerpt?.trim() || null;
  if (typeof body.content === 'string') data.content = body.content;
  if (body.coverImage !== undefined)
    data.coverImage = body.coverImage?.trim() || null;
  if (body.author !== undefined) data.author = body.author?.trim() || null;
  if (Array.isArray(body.tags)) data.tags = body.tags;
  if (typeof body.published === 'boolean') {
    data.published = body.published;
    if (body.published && !existing.publishedAt) {
      data.publishedAt = new Date();
    }
    if (!body.published) {
      data.publishedAt = null;
    }
  }

  try {
    const post = await prisma.blogPost.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: post });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: 'A post with this slug already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to update post' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const unauthorized = requireAdmin(request, body.token);
  if (unauthorized) return unauthorized;

  try {
    await prisma.blogPost.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Post deleted' });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to delete post' },
      { status: 500 }
    );
  }
}
