'use client';

/**
 * Debug-only page to verify the LAD-Email-Comms integration end-to-end.
 *
 * Renders the EmailBroadcastPanel - pulls accounts + runs + recipients from
 * /api/email-comms/* (the Next.js proxy → LAD-Email-Comms FastAPI).
 *
 * Auth is via the same access_token cookie the rest of the app uses, so log
 * in normally first. The tenant_id is lifted from the JWT.
 *
 * Remove this route once the integration is folded into EmailChannelView's
 * Sent folder for real.
 */
import { EmailBroadcastPanel } from '@/components/conversations/EmailBroadcastPanel';

export default function EmailBroadcastTestPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b px-4 py-3">
        <h1 className="text-lg font-semibold">
          Email Broadcast - debug view
        </h1>
        <p className="text-xs text-muted-foreground">
          Reads from <code>/api/email-comms/*</code> → LAD-Email-Comms on{' '}
          <code>localhost:8002</code>.
        </p>
      </div>
      <EmailBroadcastPanel />
    </div>
  );
}
