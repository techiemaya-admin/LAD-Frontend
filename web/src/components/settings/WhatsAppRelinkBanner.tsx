'use client';

/**
 * "Re-link required" banner for personal WhatsApp.
 *
 * WHY THIS EXISTS
 * When WhatsApp revokes a linked device, LAD-WAPA-Comms wipes the stored
 * credentials on purpose - dead creds must not be retried forever. The side
 * effect is that the account DISAPPEARS from GET /accounts, so the settings page
 * showed a plain "Disconnected" that looked exactly like "never set up". One
 * tenant sat dead for three days because nothing distinguished the two.
 *
 * GET /accounts/link-state reads the state that survives the wipe, and this
 * banner turns it into something a human can act on: what happened, how long
 * it has been true, and what it is costing them right now.
 *
 * Kept separate from WhatsAppIntegration so the presentation can be rendered
 * and reviewed on its own.
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface LinkState {
  state: 'connected' | 'auth_fatal' | 'replaced' | 'logged_out' | 'unknown';
  needsRelink: boolean;
  hasLiveSocket?: boolean;
  phoneNumber?: string | null;
  disconnectedAt?: string | null;
  downMinutes?: number | null;
}

/** Human-friendly outage duration: "3 days", "5 hours", "12 minutes". */
export function formatDowntime(minutes: number | null | undefined): string | null {
  if (minutes == null || minutes < 1) return null;
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

export const WhatsAppRelinkBanner: React.FC<{ linkState: LinkState | null }> = ({ linkState }) => {
  // needsRelink is false for a deliberate logout, so this never nags someone
  // who disconnected on purpose.
  if (!linkState?.needsRelink) return null;

  const downtime = formatDowntime(linkState.downMinutes);

  return (
    <div className="p-4 bg-amber-50 border border-amber-300 dark:bg-amber-950/20 dark:border-amber-900/50 rounded-xl">
      <div className="flex items-center gap-2 mb-1">
        <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="text-sm font-semibold text-amber-900 dark:text-amber-300">
          WhatsApp disconnected - re-link required
        </span>
      </div>
      <p className="text-xs text-amber-800 dark:text-amber-200/90">
        {linkState.state === 'replaced'
          ? 'Another WhatsApp Web or Desktop session took over this device slot.'
          : 'WhatsApp removed this linked device.'}{' '}
        {linkState.phoneNumber ? `Number +${linkState.phoneNumber} has been ` : 'It has been '}
        {downtime ? `disconnected for ${downtime}` : 'disconnected'}
        {linkState.disconnectedAt
          ? ` (since ${new Date(linkState.disconnectedAt).toLocaleString()}).`
          : '.'}
      </p>
      <p className="text-xs font-medium text-amber-900 dark:text-amber-200 mt-2">
        Incoming messages are not being received and automated replies are not being
        sent. Scan a new QR code below to restore it.
      </p>
    </div>
  );
};
