'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Pencil, Trash2, Plus, RefreshCw, Eye, EyeOff } from 'lucide-react';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  author: string | null;
  tags: string[];
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PostFormState {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  author: string;
  tagsCsv: string;
  published: boolean;
}

const emptyForm: PostFormState = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImage: '',
  author: '',
  tagsCsv: '',
  published: false,
};

export default function AdminBlogPage() {
  const [token, setToken] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<PostFormState>(emptyForm);
  const [showEditor, setShowEditor] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPosts = useCallback(async (adminToken: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/blog?drafts=1&token=${encodeURIComponent(adminToken)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to fetch posts');
        setAuthenticated(false);
        return;
      }
      setPosts(data.data || []);
      setAuthenticated(true);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      setToken(urlToken);
      fetchPosts(urlToken);
    } else {
      setLoading(false);
    }
  }, [fetchPosts]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (token) fetchPosts(token);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowEditor(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditing(post);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || '',
      content: post.content,
      coverImage: post.coverImage || '',
      author: post.author || '',
      tagsCsv: post.tags.join(', '),
      published: post.published,
    });
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        token,
        title: form.title,
        slug: form.slug || undefined,
        excerpt: form.excerpt,
        content: form.content,
        coverImage: form.coverImage,
        author: form.author,
        tags: form.tagsCsv
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        published: form.published,
      };

      const url = editing ? `/api/blog/${editing.id}` : '/api/blog';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to save');
        return;
      }
      closeEditor();
      fetchPosts(token);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (post: BlogPost) => {
    const res = await fetch(`/api/blog/${post.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, published: !post.published }),
    });
    if (res.ok) fetchPosts(token);
  };

  const handleDelete = async (post: BlogPost) => {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/blog/${post.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (res.ok) fetchPosts(token);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <form
          onSubmit={handleAuth}
          className="w-full max-w-md bg-card border border-border rounded-lg p-8 shadow-sm"
        >
          <h1 className="text-2xl font-bold mb-2">Blog Admin</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Enter the admin token to manage blog posts.
          </p>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Admin token"
            className="w-full px-3 py-2 border border-border rounded-md bg-background mb-4 focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
          {error && <p className="text-sm text-destructive mb-4">{error}</p>}
          <button
            type="submit"
            disabled={!token || loading}
            className="w-full bg-primary text-primary-foreground rounded-md py-2 font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Continue'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Blog Admin</h1>
            <p className="text-sm text-muted-foreground">{posts.length} posts</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchPosts(token)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-border hover:bg-accent"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> New post
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {posts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-lg">
            No posts yet. Click <span className="font-medium">New post</span> to create one.
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-secondary-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Title</th>
                  <th className="text-left px-4 py-3 font-medium">Slug</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Updated</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{post.title}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {post.slug}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => togglePublished(post)}
                        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                          post.published
                            ? 'bg-green-100 text-green-800'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        {post.published ? (
                          <>
                            <Eye className="w-3 h-3" /> Published
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" /> Draft
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(post.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEdit(post)}
                          className="p-2 rounded-md hover:bg-accent"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(post)}
                          className="p-2 rounded-md hover:bg-destructive/10 text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showEditor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto py-10 px-4">
          <form
            onSubmit={handleSave}
            className="w-full max-w-3xl bg-card border border-border rounded-lg shadow-xl"
          >
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editing ? 'Edit post' : 'New post'}
              </h2>
              <button
                type="button"
                onClick={closeEditor}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Slug <span className="text-muted-foreground font-normal">(auto if blank)</span>
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="my-post-title"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Author</label>
                  <input
                    type="text"
                    value={form.author}
                    onChange={(e) => setForm({ ...form, author: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tags <span className="text-muted-foreground font-normal">(comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={form.tagsCsv}
                    onChange={(e) => setForm({ ...form, tagsCsv: e.target.value })}
                    placeholder="sales, ai, playbook"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Cover image URL</label>
                <input
                  type="url"
                  value={form.coverImage}
                  onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Excerpt</label>
                <textarea
                  value={form.excerpt}
                  onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Content * <span className="text-muted-foreground font-normal">(Markdown)</span>
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  required
                  rows={14}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  className="rounded"
                />
                Publish immediately
              </label>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeEditor}
                className="px-4 py-2 text-sm rounded-md border border-border hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editing ? 'Save changes' : 'Create post'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
