/**
 * Strategies - saved + shareable workflow playbooks (SDK exports).
 *
 * Phase 1: save the CustomWorkflowBuilder's current state as a named playbook
 * and re-apply it later. Phase 2 (backend flag STRATEGY_SHARING_ENABLED):
 * publish a sanitized copy to a super-admin-curated cross-tenant gallery, and
 * import other tenants' playbooks as independent copies.
 *
 * Backend: LAD_backend/features/campaigns/routes/strategies.js
 *          (proxied via /api/campaigns/strategies/*).
 *
 * Usage:
 *   import { useStrategies, useCreateStrategy } from '@lad/frontend-features/campaigns';
 */
export * from './types';
export * from './api';
export * from './hooks';
