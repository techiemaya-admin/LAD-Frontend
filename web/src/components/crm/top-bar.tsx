'use client';
// Sticky top bar mirroring the design's chrome: LAD square mark + product name,
// breadcrumb trail, tenant pill, notifications, user avatar.

import * as React from 'react';
import { Building2, Bell, ChevronRight } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';

export interface Crumb {
  label: string;
  href?: string;
}

export default function TopBar({
  tenant,
  crumbs = [],
}: {
  tenant?: string;
  crumbs?: Crumb[];
}) {
  const { tenant: tenantCtx } = useTenant();
  const tenantName =
    tenant || (tenantCtx?.name && tenantCtx.name !== 'Default' ? tenantCtx.name : '');
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-[#F8F9FE]/85 dark:bg-[#000724]/85 border-b border-slate-200/70 dark:border-[#262831]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-md grid place-items-center"
              style={{ background: '#0B1957' }}
            >
              <span className="text-white font-bold text-[11px] tracking-tight">LAD</span>
            </div>
            <span
              className="text-[13.5px] font-semibold text-[#172560] dark:text-white"
              style={{ fontFamily: '"Space Grotesk", system-ui' }}
            >
              Mr LAD
            </span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <nav className="text-[12.5px] flex items-center gap-1.5 min-w-0">
            {crumbs.map((c, i, arr) => (
              <React.Fragment key={i}>
                {c.href ? (
                  <a
                    href={c.href}
                    className="text-slate-500 dark:text-slate-300 hover:text-[#0B1957] dark:hover:text-white"
                  >
                    {c.label}
                  </a>
                ) : (
                  <span className="text-[#172560] dark:text-white font-medium truncate">{c.label}</span>
                )}
                {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-slate-400" />}
              </React.Fragment>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {tenantName && (
            <div className="hidden md:flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-300">
              <Building2 className="w-3.5 h-3.5" />
              <span>{tenantName}</span>
            </div>
          )}
          <button
            disabled
            className="w-8 h-8 grid place-items-center rounded-md text-slate-600 dark:text-slate-300 opacity-50 cursor-not-allowed"
            aria-label="Notifications"
            title="Not available yet"
          >
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
