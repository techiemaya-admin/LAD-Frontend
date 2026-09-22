'use client';
import { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Role gate. The studio proposes changes to what the whole workspace's agent
 * says, what the classifier may answer and what the funnel counts; applying
 * one is admin-only on the backend (PUT /api/snapshot/tailor/overlay). The
 * sidebar hides the item for other roles, but hiding is not access control —
 * a member who types the URL lands here, so the gate lives on the route.
 * Every LLM turn also bills the caller, which is not a member-level spend.
 */
export default function StudioLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const allowed = user?.role === 'admin' || user?.role === 'owner';
  if (!allowed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Lock className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Admins only</h2>
        <p className="mt-1 text-sm text-muted-foreground">The Tenant Studio changes how the whole workspace sells. Ask a workspace admin to open it.</p>
      </div>
    );
  }
  return <>{children}</>;
}
