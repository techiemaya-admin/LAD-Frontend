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

import * as pipelineService from '../../services/pipelineService';
import { AppDispatch, RootState } from '../store';
import { Stage } from '../slices/pipelineSlice';
import { Lead } from '../../components/leads/types';

// Thunk type
type AppThunk = (dispatch: AppDispatch, getState: () => RootState) => Promise<void> | void;

// ============ STAGES ACTIONS ============

// Fetch stages with cache management
export const fetchStagesAction = (): AppThunk => async (dispatch, getState) => {
  const state = getState();
  
  // Check cache validity
  const cacheValid = selectStagesCacheValid(state);
  if (cacheValid) {
    console.log('[Redux] Stages cache valid, skipping fetch');
    return;
  }
  
  try {
    dispatch(setStagesLoading(true));
    dispatch(clearStagesError());
    
    console.log('[Redux] Fetching stages from API...');
    const stages = await pipelineService.fetchStages();
    
    dispatch(setStages(stages));
    console.log('[Redux] Stages loaded successfully:', stages.length);
    
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
    console.log('[Redux] Creating stage:', stageData);
    const newStage = await pipelineService.addStage(
      stageData.name || stageData.label || '',
      stageData.positionStageId,
      stageData.positionType
    );
    
    console.log('[Redux] New stage received from backend:', newStage);
    
    // Force refresh stages by directly fetching and setting them (bypass cache)
    console.log('[Redux] Force refreshing all stages to get updated orders after backend shifting...');
    dispatch(setStagesLoading(true));
    
    // The addStage function already invalidated the cache, so this should fetch fresh data
    const allStages = await pipelineService.fetchStages();
    console.log('[Redux] Fetched', allStages.length, 'stages after creation');
    
    dispatch(setStages(allStages));
    dispatch(setStagesLoading(false));
    
    console.log('[Redux] Stage created successfully and stages refreshed:', (newStage as Stage).key || (newStage as { id?: string }).id);
    
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
    console.log('[Redux] Updating stage:', stageKey, updates);
    const updatedStage = await pipelineService.updateStage(stageKey, updates);
    
    dispatch(updateStage({ key: stageKey, updatedData: updatedStage }));
    console.log('[Redux] Stage updated successfully:', stageKey);
    
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
    console.log('[Redux] Deleting stage:', stageKey);
    await pipelineService.deleteStage(stageKey);
    
    console.log('[Redux] API call successful, dispatching removeStage with key:', stageKey);
    dispatch(removeStage(stageKey));
    console.log('[Redux] Stage deleted successfully:', stageKey);
    
  } catch (error) {
    const err = error as Error & { response?: { status?: number } };
    console.error('[Redux] Failed to delete stage:', error);
    
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
    console.log('[Redux] Reordering stages:', stageOrders);
    await pipelineService.reorderStages(stageOrders);
    
    // Refresh stages data after reordering
    await dispatch(fetchStagesAction());
    console.log('[Redux] Stages reordered successfully');
    
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
    console.log('[Redux] Leads cache valid, skipping fetch');
    return;
  }
  
  try {
    dispatch(setLeadsLoading(true));
    dispatch(clearLeadsError());
    
    console.log('[Redux] Fetching leads from API...');
    const leads = await pipelineService.fetchLeads();
    
    dispatch(setLeads(leads));
    console.log('[Redux] Leads loaded successfully:', leads.length);
    
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
    console.log('[Redux] Creating lead:', leadData);
    const newLead = await pipelineService.createLead(leadData);
    
    dispatch(addLead(newLead));
    console.log('[Redux] Lead created successfully:', newLead.id);
    
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
    console.log('[Redux] Updating lead:', leadId, updates);
    const updatedLead = await pipelineService.updateLead(leadId, updates);
    
    dispatch(updateLead({ id: leadId, data: updatedLead }));
    console.log('[Redux] Lead updated successfully:', leadId);
    
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
    console.log('[Redux] Deleting lead:', leadId);
    await pipelineService.deleteLead(leadId);
    
    dispatch(deleteLead(leadId));
    console.log('[Redux] Lead deleted successfully:', leadId);
    
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
    console.log('[Redux] Moving lead:', leadId, 'to stage:', newStageKey);
    
    // Optimistic update first - this makes the UI instantly responsive
    dispatch(updateLead({ id: leadId, data: { stage: newStageKey } }));
    console.log('[Redux] Optimistic update applied for lead:', leadId);
    
    // Then sync with backend - use moveLeadToStage for stage updates
    const updatedLead = await pipelineService.moveLeadToStage(leadId, newStageKey);
    
    // Update with full data from backend (but don't trigger loading states)
    dispatch(updateLead({ id: leadId, data: updatedLead }));
    console.log('[Redux] Lead moved successfully and synced with backend:', leadId);
    
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
    console.log('[Redux] Bulk updating leads:', updates.length);
    
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
    console.log('[Redux] Bulk update completed:', results.length);
    
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
    console.log('[Redux] Loading complete pipeline data...');
    
    // Load stages and leads in parallel
    await Promise.all([
      dispatch(fetchStagesAction()),
      dispatch(fetchLeadsAction())
    ]);
    
    console.log('[Redux] Pipeline data loaded successfully');
  } catch (error) {
    console.error('[Redux] Failed to load pipeline data:', error);
    // Individual actions handle their own error states
  }
};

// Refresh all data (force reload ignoring cache)
export const refreshPipelineDataAction = (): AppThunk => async (dispatch) => {
  try {
    console.log('[Redux] Refreshing pipeline data...');
    
    // Force refresh by setting loading states
    dispatch(setStagesLoading(true));
    dispatch(setLeadsLoading(true));
    
    const [stages, leads] = await Promise.all([
      pipelineService.fetchStages(),
      pipelineService.fetchLeads()
    ]);
    
    dispatch(setStages(stages));
    dispatch(setLeads(leads));
    
    console.log('[Redux] Pipeline data refreshed successfully');
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

