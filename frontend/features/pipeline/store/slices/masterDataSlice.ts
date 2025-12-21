import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';

export interface Status {
  key: string;
  label: string;
  [key: string]: unknown;
}

export interface Priority {
  key: string;
  label: string;
  [key: string]: unknown;
}

export interface Source {
  key: string;
  label: string;
  [key: string]: unknown;
}

interface LastUpdated {
  statuses: string | null;
  priorities: string | null;
  sources: string | null;
}

interface MasterDataState {
  // Status options
  statuses: Status[];
  statusesLoading: boolean;
  statusesError: string | null;

  // Priority options
  priorities: Priority[];
  prioritiesLoading: boolean;
  prioritiesError: string | null;

  // Source options
  sources: Source[];
  sourcesLoading: boolean;
  sourcesError: string | null;

  // Last updated timestamps
  lastUpdated: LastUpdated;
}

/**
 * Master Data Slice
 * Stores reference data like statuses, priorities, and sources
 */
const initialState: MasterDataState = {
  // Status options
  statuses: [],
  statusesLoading: false,
  statusesError: null,

  // Priority options
  priorities: [],
  prioritiesLoading: false,
  prioritiesError: null,

  // Source options
  sources: [],
  sourcesLoading: false,
  sourcesError: null,

  // Last updated timestamps
  lastUpdated: {
    statuses: null,
    priorities: null,
    sources: null
  }
};

const masterDataSlice = createSlice({
  name: 'masterData',
  initialState,
  reducers: {
    // Status actions
    setStatusesLoading: (state, action: PayloadAction<boolean>) => {
      state.statusesLoading = action.payload;
    },
    setStatuses: (state, action: PayloadAction<Status[]>) => {
      console.log('[MasterDataSlice] Setting statuses:', action.payload);
      state.statuses = action.payload;
      state.statusesLoading = false;
      state.statusesError = null;
      state.lastUpdated.statuses = new Date().toISOString();
    },
    setStatusesError: (state, action: PayloadAction<string | null>) => {
      state.statusesError = action.payload;
      state.statusesLoading = false;
    },

    // Priority actions
    setPrioritiesLoading: (state, action: PayloadAction<boolean>) => {
      state.prioritiesLoading = action.payload;
    },
    setPriorities: (state, action: PayloadAction<Priority[]>) => {
      console.log('[MasterDataSlice] Setting priorities:', action.payload);
      state.priorities = action.payload;
      state.prioritiesLoading = false;
      state.prioritiesError = null;
      state.lastUpdated.priorities = new Date().toISOString();
    },
    setPrioritiesError: (state, action: PayloadAction<string | null>) => {
      state.prioritiesError = action.payload;
      state.prioritiesLoading = false;
    },

    // Source actions
    setSourcesLoading: (state, action: PayloadAction<boolean>) => {
      state.sourcesLoading = action.payload;
    },
    setSources: (state, action: PayloadAction<Source[]>) => {
      console.log('[MasterDataSlice] Setting sources:', action.payload);
      state.sources = action.payload;
      state.sourcesLoading = false;
      state.sourcesError = null;
      state.lastUpdated.sources = new Date().toISOString();
    },
    setSourcesError: (state, action: PayloadAction<string | null>) => {
      state.sourcesError = action.payload;
      state.sourcesLoading = false;
    },

    // Clear all data
    clearMasterData: (state) => {
      return initialState;
    }
  }
});

export const {
  setStatusesLoading,
  setStatuses,
  setStatusesError,
  setPrioritiesLoading,
  setPriorities,
  setPrioritiesError,
  setSourcesLoading,
  setSources,
  setSourcesError,
  clearMasterData
} = masterDataSlice.actions;

export default masterDataSlice.reducer;

// Base selectors - simplified for debugging
interface RootState {
  masterData: MasterDataState;
}

const selectMasterDataState = (state: RootState): MasterDataState => {
  console.log('[MasterDataSlice] selectMasterDataState called with state keys:', Object.keys(state));
  console.log('[MasterDataSlice] state.masterData:', state.masterData);
  return state.masterData || initialState;
};

// Simplified selectors for debugging
export const selectStatuses = (state: RootState): Status[] => {
  const masterData = selectMasterDataState(state);
  console.log('[MasterDataSlice] selectStatuses - masterData.statuses:', masterData.statuses);
  return masterData.statuses || [];
};

export const selectStatusesLoading = (state: RootState): boolean => {
  const masterData = selectMasterDataState(state);
  return masterData.statusesLoading || false;
};

export const selectStatusesError = (state: RootState): string | null => {
  const masterData = selectMasterDataState(state);
  return masterData.statusesError || null;
};

export const selectPriorities = (state: RootState): Priority[] => {
  const masterData = selectMasterDataState(state);
  console.log('[MasterDataSlice] selectPriorities - masterData.priorities:', masterData.priorities);
  return masterData.priorities || [];
};

export const selectPrioritiesLoading = (state: RootState): boolean => {
  const masterData = selectMasterDataState(state);
  return masterData.prioritiesLoading || false;
};

export const selectPrioritiesError = (state: RootState): string | null => {
  const masterData = selectMasterDataState(state);
  return masterData.prioritiesError || null;
};

export const selectSources = (state: RootState): Source[] => {
  const masterData = selectMasterDataState(state);
  console.log('[MasterDataSlice] selectSources - masterData.sources:', masterData.sources);
  return masterData.sources || [];
};

export const selectSourcesLoading = (state: RootState): boolean => {
  const masterData = selectMasterDataState(state);
  return masterData.sourcesLoading || false;
};

export const selectSourcesError = (state: RootState): string | null => {
  const masterData = selectMasterDataState(state);
  return masterData.sourcesError || null;
};

export const selectLastUpdated = (state: RootState): LastUpdated => {
  const masterData = selectMasterDataState(state);
  return masterData.lastUpdated || { statuses: null, priorities: null, sources: null };
};

// Combined selectors - simplified for debugging  
export const selectMasterDataLoading = (state: RootState): boolean => {
  const masterData = selectMasterDataState(state);
  return (
    masterData.statusesLoading || 
    masterData.prioritiesLoading || 
    masterData.sourcesLoading ||
    false
  );
};

export const selectMasterDataErrors = (state: RootState): string[] => {
  const masterData = selectMasterDataState(state);
  const errors: string[] = [];
  if (masterData.statusesError) errors.push(`Statuses: ${masterData.statusesError}`);
  if (masterData.prioritiesError) errors.push(`Priorities: ${masterData.prioritiesError}`);
  if (masterData.sourcesError) errors.push(`Sources: ${masterData.sourcesError}`);
  return errors;
};

