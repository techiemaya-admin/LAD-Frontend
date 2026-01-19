import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Lead } from '@/components/leads/types';
import { logger } from '@/lib/logger';

interface LeadsFilters {
  searchQuery: string;
  stage: string | null;
  status: string | null;
  source: string | null;
  priority: string | null;
}

interface LeadsPagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

interface LeadsCache {
  isValid: boolean;
  expiresAt: number | null;
}

interface LeadsState {
  leads: Lead[];            // Raw lead data from API
  loading: boolean;       // Loading state for lead operations
  error: string | null;          // Error messages for lead operations
  lastUpdated: number | null;    // Timestamp of last data fetch
  
  // Filtering and pagination for future use
  filters: LeadsFilters;
  
  pagination: LeadsPagination;
  
  // Sorting
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  
  // Cache management
  cache: LeadsCache;
}

// Leads slice focuses only on leads management
const initialState: LeadsState = {
  leads: [],            // Raw lead data from API
  loading: false,       // Loading state for lead operations
  error: null,          // Error messages for lead operations
  lastUpdated: null,    // Timestamp of last data fetch
  
  // Filtering and pagination for future use
  filters: {
    searchQuery: '',
    stage: null,
    status: null,
    source: null,
    priority: null
  },
  
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    hasMore: true
  },
  
  // Sorting
  sortBy: 'createdAt',
  sortOrder: 'desc',
  
  // Cache management
  cache: {
    isValid: false,
    expiresAt: null
  }
};

const leadsSlice = createSlice({
  name: 'leads',
  initialState,
  reducers: {
    // Core CRUD operations
    setLeads(state, action: PayloadAction<Lead[]>) {
      // Accept leads data as-is from backend (backend validates stage keys)
      state.leads = action.payload || [];
      state.lastUpdated = Date.now();
      state.cache.isValid = true;
      state.cache.expiresAt = Date.now() + (2 * 60 * 1000); // 2 minutes cache
      state.error = null;
      
      logger.debug('[LeadsSlice] Set leads:', { count: state.leads.length });
    },
    
    addLead(state, action: PayloadAction<Lead>) {
      state.leads.unshift(action.payload); // Add to beginning
      state.lastUpdated = Date.now();
      state.cache.isValid = false;
      state.pagination.total += 1;
    },
    
    updateLead(state, action: PayloadAction<{ id: string | number; data: Partial<Lead> }>) {
      const { id, data } = action.payload;
      const leadIndex = state.leads.findIndex((l: Lead) => l.id === id);
      if (leadIndex !== -1) {
        const oldLead = { ...state.leads[leadIndex] };
        // Update lead with provided data (no stage validation needed - backend validates)
        state.leads[leadIndex] = { ...state.leads[leadIndex], ...data };
        state.lastUpdated = Date.now();
        state.cache.isValid = false;
        
        logger.debug('[LeadsSlice] Updated lead:', { id, data });
        logger.debug('[LeadsSlice] Lead stage change:', {
          id,
          oldStage: oldLead.stage,
          newStage: state.leads[leadIndex].stage,
          changed: oldLead.stage !== state.leads[leadIndex].stage
        });
        
        // Log current stage distribution after update
        const stageDistribution: Record<string, number> = {};
        state.leads.forEach((lead: Lead) => {
          const stage = lead.stage || 'unknown';
          stageDistribution[stage] = (stageDistribution[stage] || 0) + 1;
        });
        logger.debug('[LeadsSlice] Current stage distribution after update:', { stageDistribution });
      } else {
        logger.warn('[LeadsSlice] Lead not found for update:', { id });
      }
    },
    
    deleteLead(state, action: PayloadAction<string | number>) {
      const leadId = action.payload;
      state.leads = state.leads.filter((l: Lead) => l.id !== leadId);
      state.lastUpdated = Date.now();
      state.cache.isValid = false;
      state.pagination.total = Math.max(0, state.pagination.total - 1);
    },
    
    // Bulk operations for future use
    bulkUpdateLeads(state, action: PayloadAction<Array<{ id: string | number; data: Partial<Lead> }>>) {
      const updates = action.payload; // Array of { id, data }
      updates.forEach(({ id, data }: { id: string | number; data: Partial<Lead> }) => {
        const leadIndex = state.leads.findIndex((l: Lead) => l.id === id);
        if (leadIndex !== -1) {
          state.leads[leadIndex] = { ...state.leads[leadIndex], ...data };
        }
      });
      state.lastUpdated = Date.now();
      state.cache.isValid = false;
    },
    
    // Filtering and search (for future cross-page use)
    setFilters(state, action: PayloadAction<Partial<LeadsFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1; // Reset to first page when filtering
    },
    
    clearFilters(state) {
      state.filters = initialState.filters;
      state.pagination.page = 1;
    },
    
    setSearchQuery(state, action: PayloadAction<string>) {
      state.filters.searchQuery = action.payload;
      state.pagination.page = 1;
    },
    
    // Pagination
    setPagination(state, action: PayloadAction<Partial<LeadsPagination>>) {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    
    // Sorting
    setSorting(state, action: PayloadAction<{ sortBy: string; sortOrder: 'asc' | 'desc' }>) {
      const { sortBy, sortOrder } = action.payload;
      state.sortBy = sortBy;
      state.sortOrder = sortOrder;
    },
    
    // UI state
    setLeadsLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },
    
    setLeadsError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
    },
    
    clearLeadsError(state) {
      state.error = null;
    },
    
    // Cache management
    invalidateLeadsCache(state) {
      state.cache.isValid = false;
      state.cache.expiresAt = null;
    },
    
    // Load more for pagination
    loadMoreLeads(state, action: PayloadAction<Lead[]>) {
      state.leads = [...state.leads, ...action.payload];
      state.pagination.page += 1;
      state.lastUpdated = Date.now();
    }
  }
});

export const {
  setLeads,
  addLead,
  updateLead,
  deleteLead,
  bulkUpdateLeads,
  setFilters,
  clearFilters,
  setSearchQuery,
  setPagination,
  setSorting,
  setLeadsLoading,
  setLeadsError,
  clearLeadsError,
  invalidateLeadsCache,
  loadMoreLeads
} = leadsSlice.actions;

export default leadsSlice.reducer;

// Basic selectors with defensive programming
interface RootState {
  leads: LeadsState;
}

export const selectLeads = (state: RootState): Lead[] => state.leads?.leads || [];
export const selectLeadsLoading = (state: RootState): boolean => state.leads?.loading || false;
export const selectLeadsError = (state: RootState): string | null => state.leads?.error || null;
export const selectLeadsLastUpdated = (state: RootState): number | null => state.leads?.lastUpdated || null;
export const selectLeadsFilters = (state: RootState): LeadsFilters => state.leads?.filters || initialState.filters;
export const selectLeadsPagination = (state: RootState): LeadsPagination => state.leads?.pagination || initialState.pagination;
export const selectLeadsSorting = (state: RootState): { sortBy: string; sortOrder: 'asc' | 'desc' } => ({
  sortBy: state.leads?.sortBy || 'createdAt',
  sortOrder: state.leads?.sortOrder || 'desc'
});
export const selectLeadsCacheValid = (state: RootState): boolean => {
  const cache = state.leads?.cache;
  if (!cache) return false;
  const { isValid, expiresAt } = cache;
  return isValid && expiresAt !== null && Date.now() < expiresAt;
};

