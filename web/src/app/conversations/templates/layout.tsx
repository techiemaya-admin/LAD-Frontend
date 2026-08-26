'use client';
import { ReactNode } from 'react';
import { RequireFeature } from '@/components/RequireFeature';

// Templates now live under /conversations/templates (they power both
// conversation replies and broadcasts). Gate on the `conversations` feature to
// match the sidebar entry (requiredFeature: "conversations"). Previously the
// page inherited campaigns/layout.tsx and was gated on `campaigns`, which
// mismatched the sidebar and blocked conversations-only tenants.
export default function ConversationsTemplatesLayout({ children }: { children: ReactNode }) {
  return <RequireFeature featureKey="conversations">{children}</RequireFeature>;
}
