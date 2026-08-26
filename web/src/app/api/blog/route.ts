import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, slugify } from './_helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const includeDrafts = request.nextUrl.searchParams.get('drafts') === '1';
  const adminToken = process.env.ADMIN_TOKEN;
  const providedToken =
    request.headers.get('x-admin-token') ||
    request.nextUrl.searchParams.get('token');
  const isAdmin = !!adminToken && providedToken === adminToken;

  const where = includeDrafts && isAdmin ? {} : { published: true };

  const posts = await prisma.blogPost.findMany({
    where,
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverImage: true,
      author: true,
      tags: true,
      published: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ success: true, count: posts.length, data: posts });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const unauthorized = requireAdmin(request, body.token);
  if (unauthorized) return unauthorized;

  const {
    title,
    slug,
    excerpt,
    content,
    coverImage,
    author,
    tags,
    published,
  } = body;

  const errors: Record<string, string> = {};
  if (!title?.trim()) errors.title = 'Title is required';
  if (!content?.trim()) errors.content = 'Content is required';
  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { success: false, message: 'Validation failed', errors },
      { status: 400 }
    );
  }

  const finalSlug = slugify(slug || title);
  try {
    const post = await prisma.blogPost.create({
      data: {
        slug: finalSlug,
        title: title.trim(),
        excerpt: excerpt?.trim() || null,
        content: content,
        coverImage: coverImage?.trim() || null,
        author: author?.trim() || null,
        tags: Array.isArray(tags) ? tags : [],
        published: !!published,
        publishedAt: published ? new Date() : null,
      },
    });
    return NextResponse.json({ success: true, data: post }, { status: 201 });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: 'A post with this slug already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to create post' },
      { status: 500 }
    );
  }
}
