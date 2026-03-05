import { createSlice, PayloadAction } from '@reduxjs/toolkit';
export interface Stage {
  key: string;
  label: string;
  display_order?: number;
  order?: number;
  [key: string]: unknown;
}
interface PipelineCache {
  isValid: boolean;
  expiresAt: number | null;
}
interface PipelineState {
  stages: Stage[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  cache: PipelineCache;
}
// Pipeline slice focuses only on stages management
const initialState: PipelineState = {
  stages: [],           // Raw stage data from API (key, label)
  loading: false,       // Loading state for stage operations
  error: null,          // Error messages for stage operations
  lastUpdated: null,    // Timestamp of last data fetch
  cache: {
    isValid: false,     // Cache validity flag
    expiresAt: null     // Cache expiration timestamp
  }
};
const pipelineSlice = createSlice({
  name: 'pipeline',
  initialState,
  reducers: {
    // Stage data management
    setStages(state, action: PayloadAction<Stage[]>) {
      state.stages = action.payload;
      // Sort stages by display_order to ensure consistent ordering
      state.stages.sort((a, b) => {
        const orderA = a.display_order || a.order || 0;
        const orderB = b.display_order || b.order || 0;
        return orderA - orderB;
      });
      state.lastUpdated = Date.now();
      state.cache.isValid = true;
      state.cache.expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes cache
      state.error = null;
    },
    addStage(state, action: PayloadAction<Stage>) {
      const newStage = action.payload;
      // Add the new stage to the array
      state.stages.push(newStage);
      // Sort the entire array by display_order to ensure correct positioning
      state.stages.sort((a, b) => {
        const orderA = a.display_order || a.order || 0;
        const orderB = b.display_order || b.order || 0;
        return orderA - orderB;
      });
      state.lastUpdated = Date.now();
      state.cache.isValid = false; // Invalidate cache on mutation
    },
    updateStage(state, action: PayloadAction<{ key: string; updatedData: Partial<Stage> }>) {
      const { key, updatedData } = action.payload;
      const stageIndex = state.stages.findIndex(s => s.key === key);
      if (stageIndex !== -1) {
        state.stages[stageIndex] = { ...state.stages[stageIndex], ...updatedData };
        state.lastUpdated = Date.now();
        state.cache.isValid = false;
      }
    },
    removeStage(state, action: PayloadAction<string>) {
      const stageKey = action.payload;
      );
      state.stages = state.stages.filter(s => s.key !== stageKey);
      );
      state.lastUpdated = Date.now();
      state.cache.isValid = false;
    },
    // Loading and error states
    setStagesLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
      if (action.payload) {
        state.error = null; // Clear error when starting to load
      }
    },
    setStagesError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
    },
    clearStagesError(state) {
      state.error = null;
    },
    // Cache management
    invalidateStagesCache(state) {
      state.cache.isValid = false;
      state.cache.expiresAt = null;
    }
  }
});
export const {
  setStages,
  addStage,
  updateStage,
  removeStage,
  setStagesLoading,
  setStagesError,
  clearStagesError,
  invalidateStagesCache
} = pipelineSlice.actions;
export default pipelineSlice.reducer;
// Basic selectors with defensive programming
interface RootState {
  pipeline: PipelineState;
}
export const selectStages = (state: RootState): Stage[] => state.pipeline?.stages || [];
export const selectStagesLoading = (state: RootState): boolean => state.pipeline?.loading || false;
export const selectStagesError = (state: RootState): string | null => state.pipeline?.error || null;
export const selectStagesLastUpdated = (state: RootState): number | null => state.pipeline?.lastUpdated || null;
export const selectStagesCacheValid = (state: RootState): boolean => {
  const cache = state.pipeline?.cache;
  if (!cache) return false;
  const { isValid, expiresAt } = cache;
  return isValid && expiresAt !== null && Date.now() < expiresAt;
};