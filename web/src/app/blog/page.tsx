import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Blog · Mr LAD',
  description: 'Insights, product updates, and playbooks from the Mr LAD team.',
};

function formatDate(date: Date | null) {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export default async function BlogIndexPage() {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverImage: true,
      author: true,
      tags: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-20 max-w-5xl">
          <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase mb-3">
            Mr LAD Blog
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Sales, AI, and everything in between.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Notes from the team building Mr LAD — playbooks, product updates,
            and lessons learned from automating outbound at scale.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 max-w-5xl">
        {posts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">No posts yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group block rounded-lg border border-border bg-card hover:border-foreground/30 hover:shadow-md transition-all overflow-hidden"
              >
                {post.coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-6">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <time dateTime={(post.publishedAt || post.createdAt).toISOString()}>
                      {formatDate(post.publishedAt || post.createdAt)}
                    </time>
                    {post.author && <span>· {post.author}</span>}
                  </div>
                  <h2 className="text-xl font-semibold mb-2 group-hover:underline">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-muted-foreground line-clamp-3">
                      {post.excerpt}
                    </p>
                  )}
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
