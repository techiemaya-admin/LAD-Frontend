/**
 * lad-monitor — admin observability feature SDK.
 * Internal cross-tenant monitoring: dashboard, per-tenant health, Cloud Run logs.
 */

// Types
export * from './types';

// API functions
export {
  getDashboardStats,
  getMonitorTenants,
  getTenantDetail,
  getCloudLogs,
  getCloudLogServices,
  getCloudLogsConfig,
  getCronHealth,
  getCostPerSah,
  recomputeSah,
  getTaskHealth,
  getLlmCost,
  getMigrationStatus,
  getStrategiesForReview,
  reviewStrategy,
  getCommunitySignups,
  updateCommunitySignup,
  getLlmRoutingMeta,
  getTenantLlmRouting,
  setLlmRoutingChain,
  clearLlmRoutingChain,
  validateLlmRoutingChain,
} from './api';

// Hooks
export { useDashboardStats } from './hooks/useDashboardStats';
export { useMonitorTenants } from './hooks/useMonitorTenants';
export { useTenantDetail } from './hooks/useTenantDetail';
export { useCloudLogs } from './hooks/useCloudLogs';
export { useCronHealth } from './hooks/useCronHealth';
export { useCostPerSah } from './hooks/useCostPerSah';
export { useTaskHealth } from './hooks/useTaskHealth';
export { useLlmCost } from './hooks/useLlmCost';
export { useMigrationStatus } from './hooks/useMigrationStatus';
export { useStrategyReview } from './hooks/useStrategyReview';
export { useCommunitySignups } from './hooks/useCommunitySignups';
export { useLlmRouting } from './hooks/useLlmRouting';
