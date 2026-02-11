import { 
  setStages, 
  setStagesLoading, 
  setStagesError, 
  clearStagesError,
  addStage,
  updateStage,
  removeStage,
  selectStagesCacheValid
} from '../slices/pipelineSlice';
import { 
  setLeads, 
  setLeadsLoading, 
  setLeadsError, 
  clearLeadsError,
  addLead,
  updateLead,
  deleteLead,
  bulkUpdateLeads,
  selectLeadsCacheValid
} from '../slices/leadsSlice';
import * as pipelineService from '@lad/frontend-features/deals-pipeline';
import { AppDispatch, RootState } from '@/store/store';
import { Stage } from '../slices/pipelineSlice';
import { Lead } from '../../types';
// Thunk type
type AppThunk = (dispatch: AppDispatch, getState: () => RootState) => Promise<void> | void;
// ============ STAGES ACTIONS ============
// Fetch stages with cache management
export const fetchStagesAction = (): AppThunk => async (dispatch, getState) => {
  const state = getState();
  // Check cache validity
  const cacheValid = selectStagesCacheValid(state);
  if (cacheValid) {
    return;
  }
  try {
    dispatch(setStagesLoading(true));
    dispatch(clearStagesError());
    const stages = await pipelineService.fetchStages();
    dispatch(setStages(stages));
    } catch (error) {
    const err = error as Error;
    console.error('[Redux] Failed to fetch stages:', error);
    dispatch(setStagesError(err.message || 'Failed to load stages'));
  } finally {
    dispatch(setStagesLoading(false));
  }
};
// Create new stage
export const createStageAction = (stageData: { name?: string; label?: string; positionStageId?: string; positionType?: 'before' | 'after' }): AppThunk => async (dispatch) => {
  try {
    const newStage = await pipelineService.addStage(
      stageData.name || stageData.label || '',
      stageData.positionStageId,
      stageData.positionType
    );
    // Force refresh stages by directly fetching and setting them (bypass cache)
    dispatch(setStagesLoading(true));
    // The addStage function already invalidated the cache, so this should fetch fresh data
    const allStages = await pipelineService.fetchStages();
    dispatch(setStages(allStages));
    dispatch(setStagesLoading(false));
  } catch (error) {
    const err = error as Error;
    console.error('[Redux] Failed to create stage:', error);
    dispatch(setStagesError(err.message || 'Failed to create stage'));
    dispatch(setStagesLoading(false));
    throw error;
  }
};
// Update existing stage
export const updateStageAction = (stageKey: string, updates: Partial<Stage>): AppThunk => async (dispatch) => {
  try {
    const updatedStage = await pipelineService.updateStage(stageKey, updates);
    dispatch(updateStage({ key: stageKey, updatedData: updatedStage }));
    } catch (error) {
    const err = error as Error;
    console.error('[Redux] Failed to update stage:', error);
    dispatch(setStagesError(err.message || 'Failed to update stage'));
    throw error;
  }
};
// Delete stage
export const deleteStageAction = (stageKey: string): AppThunk => async (dispatch) => {
  try {
    await pipelineService.deleteStage(stageKey);
    dispatch(removeStage(stageKey));
    } catch (error) {
    const err = error as Error & { response?: { status?: number } };
    console.error('[Redux] Failed to delete stage:', error);
    console.error('[Redux] Error details:', { message: err.message, status: err.response?.status });
    // Don't set stages error for validation errors (400 status)
    // These are expected business logic errors that should only show in snackbar
    if (err.response?.status !== 400) {
      dispatch(setStagesError(err.message || 'Failed to delete stage'));
    }
    throw error;
  }
};
// Reorder stages
export const reorderStagesAction = (stageOrders: Array<{ key: string; order: number }>): AppThunk => async (dispatch) => {
  try {
    await pipelineService.reorderStages(stageOrders);
    // Refresh stages data after reordering
    await dispatch(fetchStagesAction());
    } catch (error) {
    const err = error as Error;
    console.error('[Redux] Failed to reorder stages:', error);
    dispatch(setStagesError(err.message || 'Failed to reorder stages'));
    throw error;
  }
};
// ============ LEADS ACTIONS ============
// Fetch leads with cache management
export const fetchLeadsAction = (): AppThunk => async (dispatch, getState) => {
  const state = getState();
  // Check cache validity
  const cacheValid = selectLeadsCacheValid(state);
  if (cacheValid) {
    return;
  }
  try {
    dispatch(setLeadsLoading(true));
    dispatch(clearLeadsError());
    const leads = await pipelineService.fetchLeads();
    dispatch(setLeads(leads));
    } catch (error) {
    const err = error as Error;
    console.error('[Redux] Failed to fetch leads:', error);
    dispatch(setLeadsError(err.message || 'Failed to load leads'));
  } finally {
    dispatch(setLeadsLoading(false));
  }
};
// Create new lead
export const createLeadAction = (leadData: Partial<Lead>): AppThunk => async (dispatch) => {
  try {
    const newLead = await pipelineService.createLead(leadData);
    dispatch(addLead(newLead));
    } catch (error) {
    const err = error as Error;
    console.error('[Redux] Failed to create lead:', error);
    dispatch(setLeadsError(err.message || 'Failed to create lead'));
    throw error;
  }
};
// Update existing lead
export const updateLeadAction = (leadId: string | number, updates: Partial<Lead>): AppThunk => async (dispatch) => {
  try {
    const updatedLead = await pipelineService.updateLead(leadId, updates);
    dispatch(updateLead({ id: leadId, data: updatedLead }));
    } catch (error) {
    const err = error as Error;
    console.error('[Redux] Failed to update lead:', error);
    dispatch(setLeadsError(err.message || 'Failed to update lead'));
    throw error;
  }
};
// Delete lead
export const deleteLeadAction = (leadId: string | number): AppThunk => async (dispatch) => {
  try {
    await pipelineService.deleteLead(leadId);
    dispatch(deleteLead(leadId));
    } catch (error) {
    const err = error as Error;
    console.error('[Redux] Failed to delete lead:', error);
    dispatch(setLeadsError(err.message || 'Failed to delete lead'));
    throw error;
  }
};
// Move lead to different stage (drag and drop)
export const moveLeadAction = (leadId: string | number, newStageKey: string): AppThunk => async (dispatch) => {
  try {
    // Optimistic update first - this makes the UI instantly responsive
    dispatch(updateLead({ id: leadId, data: { stage: newStageKey } }));
    // Then sync with backend - use moveLeadToStage for stage updates
    const updatedLead = await pipelineService.moveLeadToStage(leadId, newStageKey);
    // Update with full data from backend (but don't trigger loading states)
    dispatch(updateLead({ id: leadId, data: updatedLead }));
    } catch (error) {
    console.error('[Redux] Failed to move lead:', error);
    // Don't set loading error state - just log and rollback if needed
    console.warn('[Redux] Move failed, optimistic update may need rollback');
    // TODO: Implement rollback of optimistic update
    throw error;
  }
};
// Bulk update leads (for multiple operations)
export const bulkUpdateLeadsAction = (updates: Array<{ id: string | number; data: Partial<Lead> }>): AppThunk => async (dispatch) => {
  try {
    // Optimistic updates
    dispatch(bulkUpdateLeads(updates));
    // Sync with backend
    const promises = updates.map(({ id, data }) => 
      pipelineService.updateLead(id, data)
    );
    const results = await Promise.all(promises);
    // Update with full data from backend
    const fullUpdates = results.map((result, index) => ({
      id: updates[index].id,
      data: result
    }));
    dispatch(bulkUpdateLeads(fullUpdates));
    } catch (error) {
    const err = error as Error;
    console.error('[Redux] Failed to bulk update leads:', error);
    dispatch(setLeadsError(err.message || 'Failed to update leads'));
    // TODO: Implement rollback of optimistic updates
    throw error;
  }
};
// ============ COMBINED ACTIONS ============
// Load all pipeline data (stages + leads)
export const loadPipelineDataAction = (): AppThunk => async (dispatch) => {
  try {
    // Load stages and leads in parallel
    await Promise.all([
      dispatch(fetchStagesAction()),
      dispatch(fetchLeadsAction())
    ]);
    } catch (error) {
    console.error('[Redux] Failed to load pipeline data:', error);
    // Individual actions handle their own error states
  }
};
// Refresh all data (force reload ignoring cache)
export const refreshPipelineDataAction = (): AppThunk => async (dispatch) => {
  try {
    // Force refresh by setting loading states
    dispatch(setStagesLoading(true));
    dispatch(setLeadsLoading(true));
    const [stages, leads] = await Promise.all([
      pipelineService.fetchStages(),
      pipelineService.fetchLeads()
    ]);
    dispatch(setStages(stages));
    dispatch(setLeads(leads));
    } catch (error) {
    const err = error as Error;
    console.error('[Redux] Failed to refresh pipeline data:', error);
    dispatch(setStagesError(err.message || 'Failed to refresh stages'));
    dispatch(setLeadsError(err.message || 'Failed to refresh leads'));
  } finally {
    dispatch(setStagesLoading(false));
    dispatch(setLeadsLoading(false));
  }
};
