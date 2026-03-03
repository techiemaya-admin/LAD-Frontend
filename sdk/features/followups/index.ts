/**
 * Followups Feature - SDK Exports
 */

// API Functions
export {
  getFollowupStatus,
  getInactiveLeads,
  getContextStats,
  scheduleFollowup,
  cancelFollowup,
  executeFollowups,
  getFollowupStatusOptions,
  getInactiveLeadsOptions,
  getContextStatsOptions,
  followupKeys,
} from './api';

// Hooks
export { useFollowupStatus } from './hooks/useFollowupStatus';
export { useInactiveLeads } from './hooks/useInactiveLeads';
export { useContextStats } from './hooks/useContextStats';
export { useScheduleFollowup } from './hooks/useScheduleFollowup';
export { useCancelFollowup } from './hooks/useCancelFollowup';

// Types
export type {
  FollowupStatus,
  InactiveLead,
  FollowupContextStats,
  ScheduleFollowupRequest,
  FollowupActionResult,
} from './types';
