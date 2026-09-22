'use client';

/**
 * What every block in the Studio chat can do, without prop-drilling through
 * the message list: post an owner turn, know whether one is in flight,
 * navigate a route a block carries, and whether this user may apply things.
 */
import { createContext, useContext } from 'react';
import type { BriefPlan, SendChatVars } from '@lad/frontend-features/tenant-studio';

export interface StudioChatContextValue {
  /** Post one owner turn (free text, an intent, or a pick). */
  send: (vars: SendChatVars) => void;
  /** A turn is in flight — pickers and chips disable meanwhile. */
  sending: boolean;
  /** A route from an `actions` block or a launch row: `/studio?room=…`, `/studio?step=N`, or any page. */
  navigate: (route: string) => void;
  /** Owner/admin: may apply reviews, go live, undo, switch pipelines. Members see the copy instead of the button. */
  canAct: boolean;
  /** Curated workspace (pipelines) — the state card words things accordingly. */
  curated: boolean;
  /** Open today's full plan review (the step-by-step path) for a plan card. */
  openPlanReview?: (plan: BriefPlan) => void;
}

const noop = () => undefined;

export const StudioChatContext = createContext<StudioChatContextValue>({
  send: noop, sending: false, navigate: noop, canAct: false, curated: false,
});

export function useStudioChatContext(): StudioChatContextValue {
  return useContext(StudioChatContext);
}
