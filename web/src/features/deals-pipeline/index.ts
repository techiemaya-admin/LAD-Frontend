/**
 * Deals Pipeline Feature - Web Layer Barrel Re-export
 * 
 * This file serves as a barrel re-export of SDK deals-pipeline functionality
 * plus web-layer utilities.
 * 
 * ARCHITECTURE NOTE: Per LAD Architecture Guidelines:
 * - Business logic (api.ts, types.ts, hooks.ts) lives in: sdk/features/deals-pipeline/
 * - UI components live in: web/src/components/deals-pipeline/
 * - Store and web-specific state lives here: web/src/features/deals-pipeline/
 * 
 * USAGE:
 * Import SDK types and hooks from here:
 * ```typescript
 * import { usePipeline, type Pipeline } from '@/features/deals-pipeline';
 * ```
 * 
 * Import store:
 * ```typescript
 * import { usePipelineStore } from '@/features/deals-pipeline';
 * ```
 * 
 * Import UI components from web/src/components/deals-pipeline directly:
 * ```typescript
 * import { PipelineBoard } from '@/components/deals-pipeline';
 * ```
 */

// ============================================================================
// SDK EXPORTS (if available)
// ============================================================================
export { 
  type Pipeline,
  type PipelineStage,
  type Deal,
} from '@lad/frontend-features/deals-pipeline';

// ============================================================================
// API & HOOKS (Web-layer)
// ============================================================================
export { getPipelineData } from './api/students';
export { useStudents } from './hooks/useStudents';

// ============================================================================
// FEATURES (Web-layer)
// ============================================================================
export { getDealsConfig, getPipelineFeatures } from './features/deals-pipeline';

// ============================================================================
// TYPES (Web-layer)
// ============================================================================
export type { PipelineConfig } from './types';

// ============================================================================
// STORE (Web-layer state management)
// ============================================================================
// Note: Store remains in web layer as it's UI-specific state management
export { usePipelineStore } from './store';
