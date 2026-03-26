/**
 * MindBody Feature - SDK Exports
 *
 * Central export point for all MindBody integration functionality.
 *
 * USAGE:
 * ```typescript
 * import {
 *   getMindBodyStatus,
 *   connectMindBody,
 *   disconnectMindBody,
 *   getAvailableClasses,
 *   useMindBodyStatus,
 *   useConnectMindBody,
 *   useDisconnectMindBody,
 *   useAvailableClasses,
 *   type MindBodyStatus,
 *   type MindBodyConnectPayload,
 *   type MindBodyClass,
 * } from '@/sdk/features/mindbody';
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================
export type { MindBodyStatus, MindBodyConnectPayload, MindBodyClass } from './types';

// ============================================================================
// API FUNCTIONS
// ============================================================================
export {
  getMindBodyStatus,
  connectMindBody,
  disconnectMindBody,
  getAvailableClasses,
} from './api';

// ============================================================================
// HOOKS
// ============================================================================
export {
  mindBodyKeys,
  useMindBodyStatus,
  useConnectMindBody,
  useDisconnectMindBody,
  useAvailableClasses,
} from './hooks';
