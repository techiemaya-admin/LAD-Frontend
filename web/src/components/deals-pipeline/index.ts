/**
 * Deals Pipeline Components - Barrel Export
 * 
 * Main export point for all deals-pipeline-related UI components.
 * 
 * ARCHITECTURE NOTE: Per LAD Architecture Guidelines:
 * - Business logic (api.ts, hooks.ts, types.ts) lives in: sdk/features/deals-pipeline/
 * - UI components live here: web/src/components/deals-pipeline/
 * 
 * USAGE:
 * ```typescript
 * import { PipelineBoard, PipelineKanbanView } from '@/components/deals-pipeline';
 * import { usePipeline, type Pipeline } from '@lad/frontend-features/deals-pipeline'; // SDK imports
 * ```
 */

// Pipeline components barrel export
export { default as PipelineBoard } from './PipelineBoard';
export { default as PipelineBoardToolbar } from './PipelineBoardToolbar';
export { default as PipelineFilterDialog } from './PipelineFilterDialog';
export { default as PipelineSortDialog } from './PipelineSortDialog';
export { default as PipelineBoardSettings } from './PipelineBoardSettings';
export { default as PipelineListView } from './PipelineListView';
export { default as PipelineKanbanView } from './PipelineKanbanView';
export { default as PipelineStageColumn } from './PipelineStageColumn';
export { default as PipelineLeadCard } from './PipelineLeadCard';
export { default as PipelineBoardHeader } from './PipelineBoardHeader';
export { default as CreateCardDialog } from './CreateCardDialog';
export { default as AddStageDialog } from './AddStageDialog';
export { default as EnhancedAddStageDialog } from './EnhancedAddStageDialog';
export { default as LeadDetailsDialog } from './LeadDetailsDialog';
export { default as SlotBasedPipelineBoard } from './SlotBasedPipelineBoard';
export { default as EditLeadDialog } from './EditLeadDialog';
