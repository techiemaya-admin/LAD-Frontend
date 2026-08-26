'use client';

/**
 * "Existing chats were not imported" notice for a coexistence WhatsApp number.
 *
 * WHY THIS EXISTS
 * A tenant who connects their existing WhatsApp Business number expects to see
 * the conversations they already have. Meta only sends that history if the
 * business has chat-history sync switched ON in the Business App - and it
 * reports the refusal over the WEBHOOK, minutes after Embedded Signup has
 * already told the UI "connected". So the failure lands where nobody is
 * looking: a WARNING line in LAD-WABA-Comms' logs.
 *
 * Stage tenant Zopreneurs sat with a connected number and an empty inbox
 * exactly this way (code 2593109, 2026-08-14). Nothing on screen said the
 * import had been refused, so the connection itself looked broken.
 *
 * The remedy is unusually strict and that is the point of spelling it out:
 * Meta runs the history sync ONCE per onboarding, so turning the setting on
 * afterwards changes nothing on its own. The number has to be disconnected
 * from inside the Business App - offboarding is not an API call we can make  - 
 * and connected again.
 *
 * Kept separate from WhatsAppEmbeddedSignup so the wording can be read and
 * reviewed on its own, matching WhatsAppRelinkBanner.
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { WhatsAppAccount } from '@lad/frontend-features/meta-onboarding';

/** Meta's code for "the business turned chat-history sync off in the Business App". */
export const HISTORY_SYNC_DISABLED = 2593109;

export const CoexistenceHistoryNotice: React.FC<{ account: WhatsAppAccount }> = ({ account }) => {
  const history = account.coexistence_history;

  // Nothing to say when history arrived, when Meta has not answered yet, or on
  // a Cloud-API-only account that never had a Business App history to import.
  if (!history || history.shared) return null;

  const turnedOff = history.code === HISTORY_SYNC_DISABLED;

  return (
    <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-300 dark:bg-amber-950/20 dark:border-amber-900/50">
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="text-sm font-semibold text-amber-900 dark:text-amber-300">
          Existing chats were not imported
        </span>
      </div>
      <p className="text-xs text-amber-800 dark:text-amber-200/90">
        {turnedOff
          ? 'WhatsApp did not share this number’s past conversations because chat ' +
            'history sync is switched off in the WhatsApp Business App.'
          : `WhatsApp did not share this number’s past conversations${
              history.title ? `: ${history.title}` : '.'
            }`}{' '}
        New incoming messages are unaffected and will appear normally.
      </p>
      <p className="text-xs font-medium text-amber-900 dark:text-amber-200 mt-2">
        To import them, turn on chat history sync in the WhatsApp Business App,
        disconnect the number there, then connect it again here. WhatsApp only
        offers the import once per connection, so switching the setting on by
        itself will not backfill anything.
      </p>
    </div>
  );
};

export default CoexistenceHistoryNotice;
