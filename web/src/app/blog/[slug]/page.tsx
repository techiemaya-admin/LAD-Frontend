import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

function formatDate(date: Date | null) {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post || !post.published) return { title: 'Not found · Mr LAD Blog' };
  return {
    title: `${post.title} · Mr LAD Blog`,
    description: post.excerpt || undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post || !post.published) return notFound();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <article className="container mx-auto px-4 py-16 max-w-3xl">
        <Link
          href="/blog"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block"
        >
          ← Back to blog
        </Link>

        <header className="mb-10">
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            {post.title}
          </h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {post.author && <span>{post.author}</span>}
            {post.author && <span>·</span>}
            <time dateTime={(post.publishedAt || post.createdAt).toISOString()}>
              {formatDate(post.publishedAt || post.createdAt)}
            </time>
          </div>
        </header>

        {post.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full rounded-lg mb-10 border border-border"
          />
        )}

        <div className="prose prose-neutral max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary prose-pre:bg-secondary prose-pre:border prose-pre:border-border prose-code:text-foreground">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>
      </article>
    </div>
  );
}
