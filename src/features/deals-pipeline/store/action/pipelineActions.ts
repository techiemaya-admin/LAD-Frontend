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
  selectLeadsCacheValid,
  setPagination,
  loadMoreLeads
} from '../slices/leadsSlice';
import * as pipelineService from '@lad/frontend-features/deals-pipeline';
import { AppDispatch, RootState } from '../../../../store/store';
import { Stage } from '../slices/pipelineSlice';
import { Lead } from '../../types';
import { logger } from '@/lib/logger';

const PIPELINE_LOAD_TIMEOUT_MS: number = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS) || 120000;
// Thunk type
type AppThunk = (dispatch: AppDispatch, getState: () => RootState) => Promise<void> | void;
// ============ STAGES ACTIONS ============
// Fetch stages with cache management
export const fetchStagesAction = (): AppThunk => async (dispatch, getState) => {
  const state = getState();
  // Check cache validity
  const cacheValid = selectStagesCacheValid(state);
  if (cacheValid) {
    logger.debug('[Redux] Stages cache valid, skipping fetch');
    return;
  }
  try {
    dispatch(setStagesLoading(true));
    dispatch(clearStagesError());
    logger.debug('[Redux] Fetching stages from API...');
    const stages = await pipelineService.fetchStages();
    dispatch(setStages(stages));
    logger.debug('[Redux] Stages loaded successfully:', { count: stages.length });
  } catch (error) {
    const err = error as Error;
    logger.error('[Redux] Failed to fetch stages:', error);
    dispatch(setStagesError(err.message || 'Failed to load stages'));
  } finally {
    dispatch(setStagesLoading(false));
  }
};
// Create new stage
export const createStageAction = (stageData: { name?: string; label?: string; positionStageId?: string; positionType?: 'before' | 'after' }): AppThunk => async (dispatch) => {
  try {
    logger.debug('[Redux] Creating stage:', stageData);
    const newStage = await pipelineService.addStage(
      stageData.name || stageData.label || '',
      stageData.positionStageId,
      stageData.positionType
    );
    logger.debug('[Redux] New stage received from backend:', newStage);
    // Force refresh stages by directly fetching and setting them (bypass cache)
    logger.debug('[Redux] Force refreshing all stages to get updated orders after backend shifting...');
    dispatch(setStagesLoading(true));
    // The addStage function already invalidated the cache, so this should fetch fresh data
    const allStages = await pipelineService.fetchStages();
    logger.debug('[Redux] Fetched stages after creation:', { count: allStages.length });
    dispatch(setStages(allStages));
    dispatch(setStagesLoading(false));
    logger.debug('[Redux] Stage created successfully and stages refreshed:', (newStage as Stage).key || (newStage as { id?: string }).id);
  } catch (error) {
    const err = error as Error;
    logger.error('[Redux] Failed to create stage:', error);
    dispatch(setStagesError(err.message || 'Failed to create stage'));
    dispatch(setStagesLoading(false));
    throw error;
  }
};
// Update existing stage
export const updateStageAction = (stageKey: string, updates: Partial<Stage>): AppThunk => async (dispatch) => {
  try {
    logger.debug('[Redux] Updating stage:', { stageKey, updates });
    const updatedStage = await pipelineService.updateStage(stageKey, updates);
    dispatch(updateStage({ key: stageKey, updatedData: updatedStage }));
    logger.debug('[Redux] Stage updated successfully:', stageKey);
  } catch (error) {
    const err = error as Error;
    logger.error('[Redux] Failed to update stage:', error);
    dispatch(setStagesError(err.message || 'Failed to update stage'));
    throw error;
  }
};
// Delete stage
export const deleteStageAction = (stageKey: string): AppThunk => async (dispatch) => {
  try {
    logger.debug('[Redux] deleteStageAction called with stageKey:', stageKey);
    logger.debug('[Redux] Calling pipelineService.deleteStage...');
    await pipelineService.deleteStage(stageKey);
    logger.debug('[Redux] API call successful, dispatching removeStage with key:', stageKey);
    dispatch(removeStage(stageKey));
    logger.debug('[Redux] removeStage dispatched, stage deleted successfully:', stageKey);
  } catch (error) {
    const err = error as any;
    logger.error('[Redux] Failed to delete stage:', {
      errorType: typeof err,
      errorConstructor: err?.constructor?.name,
      errorMessage: err?.message || err?.toString() || 'Unknown error',
      errorStack: err?.stack,
      errorResponse: err?.response?.data,
      errorStatus: err?.response?.status,
      errorKeys: err ? Object.keys(err) : [],
      rawError: JSON.stringify(err, Object.getOwnPropertyNames(err))
    });
    // Don't set stages error for validation errors (400 status)
    // These are expected business logic errors that should only show in snackbar
    if (err.response?.status !== 400) {
      dispatch(setStagesError(err?.message || 'Failed to delete stage'));
    }
    throw error;
  }
};
// Reorder stages
export const reorderStagesAction = (stageOrders: Array<{ key: string; order: number }>): AppThunk => async (dispatch) => {
  try {
    logger.debug('[Redux] Reordering stages:', stageOrders);
    await pipelineService.reorderStages(stageOrders);
    // Refresh stages data after reordering
    await dispatch(fetchStagesAction());
    logger.debug('[Redux] Stages reordered successfully');
  } catch (error) {
    const err = error as Error;
    logger.error('[Redux] Failed to reorder stages:', error);
    dispatch(setStagesError(err.message || 'Failed to reorder stages'));
    throw error;
  }
};
// ============ LEADS ACTIONS ============
// Fetch leads with cache management
export const fetchLeadsAction = (page: number = 1, limit: number = 50): AppThunk => async (dispatch, getState) => {
  const state = getState();
  // Check cache validity
  const cacheValid = selectLeadsCacheValid(state);
  // If we're requesting a specific page other than 1, we ignore cache
  if (cacheValid && page === 1) {
    logger.debug('[Redux] Leads cache valid, skipping fetch');
    return;
  }
  try {
    dispatch(setLeadsLoading(true));
    dispatch(clearLeadsError());
    logger.debug('[Redux] Fetching leads from API...', { page, limit });
    
    // Use getPipelineData to stay in sync with the board's data fetching behavior
    const response = await pipelineService.getPipelineData(page, limit);
    
    // Robustly extract leads array and pagination info
    const rawData = response as any;
    const leads = rawData.leads || (Array.isArray(rawData) ? rawData : []);
    const pagination = rawData.pagination;
    
    if (page === 1) {
      dispatch(setLeads(leads));
    } else {
      dispatch(loadMoreLeads(leads));
    }

    if (pagination) {
      // Handle both camelCase and snake_case property names from backend
      const totalPages = pagination.totalPages || pagination.total_pages || 0;
      const total = pagination.total || pagination.total_count || leads.length;
      
      dispatch(setPagination({
        page: pagination.page || page,
        limit: pagination.limit || limit,
        total: total,
        hasMore: pagination.hasMore ?? (totalPages > (pagination.page || page))
      }));
    } else if (page === 1) {
      // Default pagination if none provided
      dispatch(setPagination({
        page: 1,
        limit: leads.length,
        total: leads.length,
        hasMore: false
      }));
    }
    
    logger.debug('[Redux] Leads loaded successfully:', leads.length);
  } catch (error) {
    const err = error as Error;
    logger.error('[Redux] Failed to fetch leads:', error);
    dispatch(setLeadsError(err.message || 'Failed to load leads'));
  } finally {
    dispatch(setLeadsLoading(false));
  }
};
// Create new lead
export const createLeadAction = (leadData: Partial<Lead>): AppThunk => async (dispatch) => {
  try {
    logger.debug('[Redux] Creating lead:', leadData);
    const newLead = await pipelineService.createLead(leadData);
    dispatch(addLead(newLead));
    logger.debug('[Redux] Lead created successfully:', newLead.id);
  } catch (error) {
    const err = error as Error;
    logger.error('[Redux] Failed to create lead:', error);
    dispatch(setLeadsError(err.message || 'Failed to create lead'));
    throw error;
  }
};
// Update existing lead
export const updateLeadAction = (leadId: string | number, updates: Partial<Lead>): AppThunk => async (dispatch) => {
  try {
    logger.debug('[Redux] Updating lead:', { leadId, updates });
    const updatedLead = await pipelineService.updateLead(leadId, updates);
    dispatch(updateLead({ id: leadId, data: updatedLead }));
    logger.debug('[Redux] Lead updated successfully:', leadId);
  } catch (error) {
    const err = error as Error;
    logger.error('[Redux] Failed to update lead:', error);
    dispatch(setLeadsError(err.message || 'Failed to update lead'));
    throw error;
  }
};
// Delete lead
export const deleteLeadAction = (leadId: string | number): AppThunk => async (dispatch) => {
  try {
    logger.debug('[Redux] Deleting lead:', leadId);
    await pipelineService.deleteLead(leadId);
    dispatch(deleteLead(leadId));
    logger.debug('[Redux] Lead deleted successfully:', leadId);
  } catch (error) {
    const err = error as Error;
    logger.error('[Redux] Failed to delete lead:', error);
    dispatch(setLeadsError(err.message || 'Failed to delete lead'));
    throw error;
  }
};
// Move lead to different stage (drag and drop)
export const moveLeadAction = (leadId: string | number, newStageKey: string): AppThunk => async (dispatch) => {
  try {
    logger.debug('[Redux] Moving lead:', { leadId, newStageKey });
    // Optimistic update first - this makes the UI instantly responsive
    dispatch(updateLead({ id: leadId, data: { stage: newStageKey } }));
    logger.debug('[Redux] Optimistic update applied for lead:', leadId);
    // Then sync with backend - use moveLeadToStage for stage updates
    const updatedLead = await pipelineService.moveLeadToStage(leadId, newStageKey);
    // Update with full data from backend (but don't trigger loading states)
    dispatch(updateLead({ id: leadId, data: updatedLead }));
    logger.debug('[Redux] Lead moved successfully and synced with backend:', leadId);
  } catch (error) {
    logger.error('[Redux] Failed to move lead:', error);
    // Don't set loading error state - just log and rollback if needed
    console.warn('[Redux] Move failed, optimistic update may need rollback');
    // TODO: Implement rollback of optimistic update
    throw error;
  }
};
// Bulk update leads (for multiple operations)
export const bulkUpdateLeadsAction = (updates: Array<{ id: string | number; data: Partial<Lead> }>): AppThunk => async (dispatch) => {
  try {
    logger.debug('[Redux] Bulk updating leads:', updates.length);
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
    logger.debug('[Redux] Bulk update completed:', results.length);
  } catch (error) {
    const err = error as Error;
    logger.error('[Redux] Failed to bulk update leads:', error);
    dispatch(setLeadsError(err.message || 'Failed to update leads'));
    // TODO: Implement rollback of optimistic updates
    throw error;
  }
};
// ============ COMBINED ACTIONS ============
// Load all pipeline data (stages + leads)
export const loadPipelineDataAction = (page: number = 1, limit: number = 50): AppThunk => async (dispatch) => {
  try {
    logger.debug('[Redux] Loading complete pipeline data (single request)...', { page, limit });
    dispatch(setStagesLoading(true));
    dispatch(setLeadsLoading(true));
    dispatch(clearStagesError());
    dispatch(clearLeadsError());
    // Add timeout to prevent infinite loading
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(
        () => reject(new Error('Request timeout - please check your connection')),
        PIPELINE_LOAD_TIMEOUT_MS
      )
    );
    const data = await Promise.race([
      pipelineService.getPipelineData(page, limit),
      timeoutPromise
    ]) as Awaited<ReturnType<typeof pipelineService.getPipelineData>>;
    
    // cast data to any to access potentially nested structures or normalization info
    const rawData = data as any;
    const stages = rawData.stages || [];
    const leads = rawData.leads || [];
    const pagination = rawData.pagination;

    dispatch(setStages(stages));
    dispatch(setLeads(leads));
    
    if (pagination) {
      const pageNum = pagination.page || page;
      const totalPages = pagination.totalPages || pagination.total_pages || 0;
      const total = pagination.total || pagination.total_count || leads.length;

      dispatch(setPagination({
        page: pageNum,
        limit: pagination.limit || limit,
        total: total,
        hasMore: pagination.hasMore ?? (totalPages > pageNum)
      }));
    }

    logger.debug('[Redux] Pipeline data loaded successfully:', {
      stages: stages.length,
      leads: leads.length,
      pagination
    });
  } catch (error) {
    const err = error as any;
    
    // Extract detailed error information
    const errorDetails = {
      type: typeof err,
      constructor: err?.constructor?.name,
      message: err?.message || err?.toString() || 'Unknown error',
      statusCode: err?.response?.status,
      statusText: err?.response?.statusText,
      responseData: err?.response?.data,
      code: err?.code,
      isAxiosError: err?.isAxiosError,
      url: err?.config?.url,
      method: err?.config?.method,
      fullError: err instanceof Error ? {
        name: err.name,
        message: err.message,
        stack: err.stack
      } : null
    };
    
    // Log with full details using logger only
    logger.error('[Redux] Failed to load pipeline data:', errorDetails);
    
    const errorMessage = err?.message || err?.response?.data?.message || 'Failed to load pipeline data';
    dispatch(setStagesError(errorMessage));
    dispatch(setLeadsError(errorMessage));
  } finally {
    dispatch(setStagesLoading(false));
    dispatch(setLeadsLoading(false));
  }
};
// Refresh all data (force reload ignoring cache)
export const refreshPipelineDataAction = (page: number = 1, limit: number = 50): AppThunk => async (dispatch) => {
  try {
    logger.debug('[Redux] Refreshing pipeline data...', { page, limit });
    // Force refresh by setting loading states
    dispatch(setStagesLoading(true));
    dispatch(setLeadsLoading(true));
    const data = await pipelineService.getPipelineData(page, limit);
    const rawData = data as any;
    const stages = rawData.stages || [];
    const leads = rawData.leads || [];
    const pagination = rawData.pagination;

    dispatch(setStages(stages));
    dispatch(setLeads(leads));

    if (pagination) {
      const pageNum = pagination.page || page;
      const totalPages = pagination.totalPages || pagination.total_pages || 0;
      const total = pagination.total || pagination.total_count || leads.length;

      dispatch(setPagination({
        page: pageNum,
        limit: pagination.limit || limit,
        total: total,
        hasMore: pagination.hasMore ?? (totalPages > pageNum)
      }));
    }
    logger.debug('[Redux] Pipeline data refreshed successfully');
  } catch (error) {
    const err = error as Error;
    logger.error('[Redux] Failed to refresh pipeline data:', error);
    dispatch(setStagesError(err.message || 'Failed to refresh stages'));
    dispatch(setLeadsError(err.message || 'Failed to refresh leads'));
  } finally {
    dispatch(setStagesLoading(false));
    dispatch(setLeadsLoading(false));
  }
};
