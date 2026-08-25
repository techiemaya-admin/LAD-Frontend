import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getBackendUrl } from '../api/utils/backend';
import SwaggerExplorer from './SwaggerExplorer';
import specs from './specs.json';

// Server-side admin gate. Decodes the session cookie via the backend's
// /api/auth/me, then allows the page only if the caller is a super-admin
// (matches LAD_backend's super-admin convention) OR has role admin/owner.
const SUPER_ADMIN_EMAIL = 'admin@techiemaya.com';
const ADMIN_ROLES = new Set(['admin', 'owner', 'super_admin', 'superadmin']);

type MeUser = {
  id?: string;
  email?: string;
  role?: string;
  tenantId?: string;
  capabilities?: string[];
};

async function fetchMe(token: string): Promise<MeUser | null> {
  const backend = getBackendUrl();
  try {
    const res = await fetch(`${backend}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return (data?.user || data) as MeUser;
  } catch {
    return null;
  }
}

function isAdmin(user: MeUser | null): boolean {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  const role = (user.role || '').toLowerCase().trim();
  if (email === SUPER_ADMIN_EMAIL) return true;
  if (ADMIN_ROLES.has(role)) return true;
  return false;
}

function ForbiddenPanel({ user }: { user: MeUser | null }) {
  const email = user?.email || '(unknown)';
  const role = user?.role || '(none)';
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: 'white',
          padding: '32px 36px',
          borderRadius: '12px',
          maxWidth: '440px',
          width: '100%',
          boxShadow: '0 4px 24px rgba(15, 23, 42, 0.08)',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ fontSize: '40px', lineHeight: 1, marginBottom: '12px' }}>🔒</div>
        <h1 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
          Admin access required
        </h1>
        <p style={{ margin: '0 0 16px', color: '#475569', fontSize: '14px', lineHeight: 1.55 }}>
          The API Explorer is restricted to administrators. Your account does not have the
          required role to view this page.
        </p>
        <div
          style={{
            background: '#f1f5f9',
            padding: '10px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            color: '#475569',
            marginBottom: '20px',
          }}
        >
          <div>Signed in as: <strong>{email}</strong></div>
          <div>Role: <strong>{role}</strong></div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link
            href="/"
            style={{
              flex: 1,
              padding: '10px',
              background: '#0f172a',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            Back home
          </Link>
          <Link
            href="/login?redirect=/swagger"
            style={{
              flex: 1,
              padding: '10px',
              background: 'white',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            Sign in as admin
          </Link>
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'API Explorer · LAD',
  robots: { index: false, follow: false },
};

export default async function SwaggerPage() {
  const cookieStore = await cookies();
  const token =
    cookieStore.get('token')?.value || cookieStore.get('access_token')?.value || '';

  if (!token) {
    redirect('/login?redirect=/swagger');
  }

  const user = await fetchMe(token);
  if (!isAdmin(user)) {
    return <ForbiddenPanel user={user} />;
  }

  return (
    <SwaggerExplorer
      specs={specs as Record<string, unknown>}
      currentUser={{ email: user?.email || '', role: user?.role || '' }}
      // Token is handed to the client only for use as a Bearer header in
      // Try-it-out requests. It is the same token already present in the
      // browser cookie (httpOnly: false in this codebase), so this is not a
      // privilege escalation.
      sessionToken={token}
    />
  );
}
