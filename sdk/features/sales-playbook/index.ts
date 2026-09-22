/**
 * Sales Playbook Feature - Frontend SDK Exports
 *
 * USAGE:
 * ```typescript
 * import { useCallRecords, useSaveCall, type CallRecord } from '@/sdk/features/sales-playbook';
 * ```
 */

export { listCalls, saveCall, deleteCall, salesPlaybookKeys } from './api';
export { useCallRecords, useSaveCall, useDeleteCall } from './hooks';
export type {
  CallRecord,
  SavedCallRecord,
  ListCallsParams,
  ListCallsResult,
  LeadScore,
} from './types';
