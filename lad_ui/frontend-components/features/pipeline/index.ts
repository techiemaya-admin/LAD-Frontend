// Pipeline Feature SDK
export { default as pipelineService } from './services/pipelineService';
export type {
  PipelineStage,
  PipelineLead,
  Pipeline,
} from './types';

// Default export for backward compatibility
export { default } from './services/pipelineService';
