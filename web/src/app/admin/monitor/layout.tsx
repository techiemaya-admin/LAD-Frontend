'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldAlert, LayoutDashboard, Building2, ScrollText, Clock, Target, ListChecks, Sparkles, Database, ShieldCheck, Inbox, Route } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Client-side gate for UX only — the real enforcement is server-side
// (backend requireSuperAdmin on every /api/admin/monitor route). Keep this
// email in sync with the backend SUPER_ADMIN_EMAIL.
const SUPER_ADMIN_EMAIL = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || 'admin@techiemaya.com').toLowerCase();

const TABS = [
  { href: '/admin/monitor', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/monitor/tenants', label: 'Tenants', icon: Building2, exact: false },
  { href: '/admin/monitor/sah', label: 'Cost / SAH', icon: Target, exact: false },
  { href: '/admin/monitor/llm-cost', label: 'LLM Spend', icon: Sparkles, exact: false },
  { href: '/admin/monitor/llm-routing', label: 'LLM Routing', icon: Route, exact: false },
  { href: '/admin/monitor/crons', label: 'Crons', icon: Clock, exact: false },
  { href: '/admin/monitor/tasks', label: 'Tasks', icon: ListChecks, exact: false },
  { href: '/admin/monitor/migrations', label: 'Migrations', icon: Database, exact: false },
  { href: '/admin/monitor/strategies', label: 'Shared Strategies', icon: ShieldCheck, exact: false },
  { href: '/admin/monitor/signups', label: 'Community Signups', icon: Inbox, exact: false },
  { href: '/admin/monitor/logs', label: 'Cloud Logs', icon: ScrollText, exact: false },
];

export default function MonitorLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-gray-500">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
      </div>
    );
  }

  const isSuperAdmin = (user?.email || '').toLowerCase().trim() === SUPER_ADMIN_EMAIL;
  if (!isSuperAdmin) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <ShieldAlert className="mb-3 h-10 w-10 text-red-500" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Access restricted</h2>
        <p className="mt-1 max-w-md text-sm text-gray-500">
          The platform observability console is available to super-admins only.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Platform Observability</h1>
        <p className="text-sm text-gray-500">Internal monitoring across all tenants.</p>
      </div>

      <nav className="mb-6 flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
