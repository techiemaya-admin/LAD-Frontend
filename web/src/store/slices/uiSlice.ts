import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Lead } from '../../components/leads/types';

/**
 * UI Slice
 * Manages UI state for the pipeline and other views
 */

interface PipelineActiveFilters {
  stages: string[];
  statuses: string[];
  priorities: string[];
  sources: string[];
  assignees: string[];
}

interface PipelineSortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

interface NewLeadForm {
  name: string;
  email: string;
  phone: string;
  company: string;
  stage: string;
  status: string;
  priority: string;
  source: string;
  amount: number | undefined;
  description: string;
  assignee: string;
  dueDate: string | null;
}

interface EditingLeadForm {
  id: string | number | null;
  name: string;
  email: string;
  phone: string;
  company: string;
  stage: string;
  status: string;
  priority: string;
  source: string;
  amount: string;
  description: string;
  assignee: string;
  dueDate: string | null;
  closeDate: string | null;
  goals: string[];
  labels: string[];
}

interface FormErrors {
  newLead: Record<string, string>;
  editLead: Record<string, string>;
}

interface FormLoading {
  createLead: boolean;
  editLead: boolean;
  deleteLead: boolean;
}

interface AIInsights {
  loading: boolean;
  score: number | null;
  suggestedStage: string | null;
  similarLeads: Lead[];
  emailValidation: unknown | null;
  phoneValidation: unknown | null;
  error: string | null;
}

interface LeadCardEditFormData {
  email: string;
  phone: string;
  company: string;
  assignee: string;
  source: string;
  status: string;
  priority: string;
  stage: string;
  amount: string;
  closeDate: string;
  expectedCloseDate: string;
  description: string;
  tags: string[];
}

interface LeadCardState {
  activeTab: number;
  expanded: boolean;
  editingOverview: boolean;
  editFormData: LeadCardEditFormData;
}

interface StageColumnEditFormData {
  stageName: string;
  position: string;
  positionType: 'before' | 'after';
}

interface StageColumnState {
  anchorEl: any;
  editDialogOpen: boolean;
  deleteDialogOpen: boolean;
  editFormData: StageColumnEditFormData;
}

interface PipelineState {
  viewMode: 'kanban' | 'list';
  zoom: number;
  searchQuery: string;
  activeFilters: PipelineActiveFilters;
  sortConfig: PipelineSortConfig;
  addStageDialogOpen: boolean;
  createLeadDialogOpen: boolean;
  editLeadDialogOpen: boolean;
  filterDialogOpen: boolean;
  sortDialogOpen: boolean;
  settingsDialogOpen: boolean;
  selectedLead: Lead | null;
  activeCard: string | number | null;
  activeStage: string | null;
  newStageName: string;
  positionStageId: string;
  positionType: 'before' | 'after';
  addStageError: string;
  isSubmitting: boolean;
  newLead: NewLeadForm;
  editingLead: EditingLeadForm;
  formErrors: FormErrors;
  formLoading: FormLoading;
  aiInsights: AIInsights;
  leadCard: LeadCardState;
  stageColumn: StageColumnState;
}

interface VisibleColumns {
  name: boolean;
  stage: boolean;
  status: boolean;
  priority: boolean;
  amount: boolean;
  closeDate: boolean;
  dueDate: boolean;
  expectedCloseDate: boolean;
  source: boolean;
  assignee: boolean;
  createdAt: boolean;
  updatedAt: boolean;
  lastActivity: boolean;
}

interface PipelineSettings {
  viewMode: 'kanban' | 'list';
  visibleColumns: VisibleColumns;
  autoRefresh: boolean;
  refreshInterval: number;
  compactView: boolean;
  showCardCount: boolean;
  showStageValue: boolean;
  enableDragAndDrop: boolean;
}

interface UILoading {
  global: boolean;
  pipeline: boolean;
  users: boolean;
}

interface UIState {
  pipeline: PipelineState;
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  loading: UILoading;
  pipelineSettings: PipelineSettings;
}

const initialState: UIState = {
  // Pipeline view preferences
  pipeline: {
    viewMode: 'kanban', // 'kanban' | 'list'
    zoom: 1,
    searchQuery: '',
    activeFilters: {
      stages: [],
      statuses: [],
      priorities: [],
      sources: [],
      assignees: []
    },
    sortConfig: {
      field: 'createdAt',
      direction: 'desc'
    },
    
    // Dialog states
    addStageDialogOpen: false,
    createLeadDialogOpen: false,
    editLeadDialogOpen: false,
    filterDialogOpen: false,
    sortDialogOpen: false,
    settingsDialogOpen: false,
    
    // Selected items for dialogs
    selectedLead: null,
    
    // Active states
    activeCard: null,
    activeStage: null,
    
    // Stage management
    newStageName: '',
    positionStageId: '',
    positionType: 'after', // 'before' | 'after'
    addStageError: '',
    isSubmitting: false,
    
    // New lead form
    newLead: {
      name: '',
      email: '',
      phone: '',
      company: '',
      stage: '',
      status: '',
      priority: '',
      source: '',
      amount: undefined,
      description: '',
      assignee: '',
      dueDate: null
    },
    
    // Lead form for editing
    editingLead: {
      id: null,
      name: '',
      email: '',
      phone: '',
      company: '',
      stage: '',
      status: '',
      priority: '',
      source: '',
      amount: '',
      description: '',
      assignee: '',
      dueDate: null,
      closeDate: null,
      goals: [],
      labels: []
    },
    
    // Form errors
    formErrors: {
      newLead: {},
      editLead: {}
    },
    
    // Form loading states
    formLoading: {
      createLead: false,
      editLead: false,
      deleteLead: false
    },
    
    // AI insights for lead creation
    aiInsights: {
      loading: false,
      score: null,
      suggestedStage: null,
      similarLeads: [],
      emailValidation: null,
      phoneValidation: null,
      error: null
    },
    
    // Lead card state (for detail view)
    leadCard: {
      activeTab: 0,
      expanded: false,
      editingOverview: false,
      editFormData: {
        // Lead Information
        email: '',
        phone: '',
        company: '',
        assignee: '',
        source: '',
        // Pipeline Information
        status: '',
        priority: '',
        stage: '',
        // Deal Information
        amount: '',
        closeDate: '',
        expectedCloseDate: '',
        // Description and Tags
        description: '',
        tags: []
      }
    },
    
    // Stage column state
    stageColumn: {
      anchorEl: null,
      editDialogOpen: false,
      deleteDialogOpen: false,
      editFormData: {
        stageName: '',
        position: '',
        positionType: 'after'
      }
    }
  },
  
  // General UI state
  sidebarOpen: true,
  theme: 'light', // This might be redundant with authSlice, consider consolidating
  loading: {
    global: false,
    pipeline: false,
    users: false
  },
  
  // Pipeline board settings (shared across components)
  pipelineSettings: {
    viewMode: 'kanban', // 'kanban' or 'list'
    visibleColumns: {
      name: true,
      stage: true,
      status: true,
      priority: true,
      amount: true,
      closeDate: true,
      dueDate: false,
      expectedCloseDate: false,
      source: true,
      assignee: true,
      createdAt: true,
      updatedAt: false,
      lastActivity: false
    },
    autoRefresh: true,
    refreshInterval: 30,
    compactView: false,
    showCardCount: true,
    showStageValue: true,
    enableDragAndDrop: true
  }
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Pipeline view actions
    setPipelineViewMode(state, action: PayloadAction<'kanban' | 'list'>) {
      state.pipeline.viewMode = action.payload;
    },
    
    setPipelineZoom(state, action: PayloadAction<number>) {
      state.pipeline.zoom = action.payload;
    },
    
    setPipelineSearchQuery(state, action: PayloadAction<string>) {
      state.pipeline.searchQuery = action.payload;
    },
    
    setPipelineActiveFilters(state, action: PayloadAction<Partial<PipelineActiveFilters>>) {
      state.pipeline.activeFilters = { ...state.pipeline.activeFilters, ...action.payload };
    },
    
    clearPipelineFilters(state) {
      state.pipeline.activeFilters = {
        stages: [],
        statuses: [],
        priorities: [],
        sources: [],
        assignees: []
      };
      state.pipeline.searchQuery = '';
    },
    
    setPipelineSortConfig(state, action: PayloadAction<Partial<PipelineSortConfig>>) {
      state.pipeline.sortConfig = { ...state.pipeline.sortConfig, ...action.payload };
    },
    
    // Dialog actions
    setAddStageDialogOpen(state, action: PayloadAction<boolean>) {
      state.pipeline.addStageDialogOpen = action.payload;
      if (!action.payload) {
        // Reset form when closing
        state.pipeline.newStageName = '';
        state.pipeline.positionStageId = '';
        state.pipeline.positionType = 'after';
        state.pipeline.addStageError = '';
      }
    },
    
    setCreateLeadDialogOpen(state, action: PayloadAction<boolean>) {
      state.pipeline.createLeadDialogOpen = action.payload;
      if (!action.payload) {
        // Reset form when closing
        state.pipeline.newLead = {
          name: '',
          email: '',
          phone: '',
          company: '',
          stage: '',
          status: '',
          priority: '',
          source: '',
          amount: undefined,
          description: '',
          assignee: '',
          dueDate: null
        };
        state.pipeline.formErrors.newLead = {};
        state.pipeline.formLoading.createLead = false;
        state.pipeline.aiInsights = {
          loading: false,
          score: null,
          suggestedStage: null,
          similarLeads: [],
          emailValidation: null,
          phoneValidation: null,
          error: null
        };
      }
    },
    
    setEditLeadDialogOpen(state, action: PayloadAction<boolean>) {
      state.pipeline.editLeadDialogOpen = action.payload;
      if (!action.payload) {
        // Reset form when closing
        state.pipeline.editingLead = {
          id: null,
          name: '',
          email: '',
          phone: '',
          company: '',
          stage: '',
          status: '',
          priority: '',
          source: '',
          amount: '',
          description: '',
          assignee: '',
          dueDate: null,
          closeDate: null,
          goals: [],
          labels: []
        };
        state.pipeline.formErrors.editLead = {};
        state.pipeline.formLoading.editLead = false;
      }
    },
    
    setSortDialogOpen(state, action: PayloadAction<boolean>) {
      state.pipeline.sortDialogOpen = action.payload;
    },
    
    setSettingsDialogOpen(state, action: PayloadAction<boolean>) {
      state.pipeline.settingsDialogOpen = action.payload;
    },

    setFilterDialogOpen(state, action: PayloadAction<boolean>) {
      state.pipeline.filterDialogOpen = action.payload;
    },
    
    // Selected items
    setSelectedLead(state, action: PayloadAction<Lead | null>) {
      state.pipeline.selectedLead = action.payload;
      // Pre-populate edit form when lead is selected
      if (action.payload) {
        state.pipeline.editingLead = {
          id: action.payload.id,
          name: action.payload.name || '',
          email: action.payload.email || '',
          phone: action.payload.phoneNumber || '',
          company: (action.payload as { company?: string }).company || '',
          stage: action.payload.stage || '',
          status: action.payload.status || '',
          priority: (action.payload as { priority?: string }).priority || '',
          source: (action.payload as { source?: string }).source || '',
          amount: String((action.payload as { amount?: number }).amount || ''),
          description: action.payload.bio || '',
          assignee: (action.payload as { assignee?: string }).assignee || '',
          dueDate: (action.payload as { dueDate?: string | null }).dueDate || null,
          closeDate: (action.payload as { closeDate?: string | null; close_date?: string | null }).closeDate || (action.payload as { close_date?: string | null }).close_date || null,
          goals: Array.isArray((action.payload as { goals?: string[] }).goals) ? (action.payload as { goals?: string[] }).goals as string[] : [],
          labels: Array.isArray((action.payload as { labels?: string[] }).labels) ? (action.payload as { labels?: string[] }).labels as string[] : []
        };
      }
    },
    
    // Active states
    setActiveCard(state, action: PayloadAction<string | number | null>) {
      state.pipeline.activeCard = action.payload;
    },
    
    setActiveStage(state, action: PayloadAction<string | null>) {
      state.pipeline.activeStage = action.payload;
    },
    
    // Stage form actions
    setNewStageName(state, action: PayloadAction<string>) {
      state.pipeline.newStageName = action.payload;
    },
    
    setPositionStageId(state, action: PayloadAction<string>) {
      state.pipeline.positionStageId = action.payload;
    },
    
    setPositionType(state, action: PayloadAction<'before' | 'after'>) {
      state.pipeline.positionType = action.payload;
    },
    
    setAddStageError(state, action: PayloadAction<string>) {
      state.pipeline.addStageError = action.payload;
    },
    
    setIsSubmitting(state, action: PayloadAction<boolean>) {
      state.pipeline.isSubmitting = action.payload;
    },
    
    // New lead form actions
    setNewLeadField(state, action: PayloadAction<{ field: keyof NewLeadForm; value: unknown }>) {
      const { field, value } = action.payload;
      (state.pipeline.newLead[field] as unknown) = value;
    },
    
    setNewLead(state, action: PayloadAction<Partial<NewLeadForm>>) {
      state.pipeline.newLead = { ...state.pipeline.newLead, ...action.payload };
    },
    
    resetNewLead(state) {
      state.pipeline.newLead = {
        name: '',
        email: '',
        phone: '',
        company: '',
        stage: '',
        status: '',
        priority: '',
        source: '',
        amount: undefined,
        description: '',
        assignee: '',
        dueDate: null
      };
      state.pipeline.formErrors.newLead = {};
      state.pipeline.aiInsights = {
        loading: false,
        score: null,
        suggestedStage: null,
        similarLeads: [],
        emailValidation: null,
        phoneValidation: null,
        error: null
      };
    },
    
    // Edit lead form actions
    setEditingLeadField(state, action: PayloadAction<{ field: keyof EditingLeadForm; value: unknown }>) {
      const { field, value } = action.payload;
      (state.pipeline.editingLead[field] as unknown) = value;
    },
    
    setEditingLead(state, action: PayloadAction<Partial<EditingLeadForm>>) {
      state.pipeline.editingLead = { ...state.pipeline.editingLead, ...action.payload };
    },
    
    resetEditingLead(state) {
      state.pipeline.editingLead = {
        id: null,
        name: '',
        email: '',
        phone: '',
        company: '',
        stage: '',
        status: '',
        priority: '',
        source: '',
        amount: '',
        description: '',
        assignee: '',
        dueDate: null,
        closeDate: null,
        goals: [],
        labels: []
      };
      state.pipeline.formErrors.editLead = {};
    },
    
    // Lead card actions
    setLeadCardActiveTab(state, action: PayloadAction<number>) {
      state.pipeline.leadCard.activeTab = action.payload;
    },
    
    setLeadCardExpanded(state, action: PayloadAction<boolean>) {
      state.pipeline.leadCard.expanded = action.payload;
    },
    
    setLeadCardEditingOverview(state, action: PayloadAction<boolean>) {
      state.pipeline.leadCard.editingOverview = action.payload;
    },
    
    setLeadCardEditFormData(state, action: PayloadAction<Partial<LeadCardEditFormData>>) {
      state.pipeline.leadCard.editFormData = { ...state.pipeline.leadCard.editFormData, ...action.payload };
    },
    
    resetLeadCardEditFormData(state, action: PayloadAction<Partial<Lead> | undefined>) {
      const leadData = action.payload || {};
      state.pipeline.leadCard.editFormData = {
        // Lead Information
        email: leadData.email || '',
        phone: leadData.phoneNumber || '',
        company: (leadData as { company?: string }).company || '',
        assignee: (leadData as { assignee?: string; assigned_to_id?: string }).assignee || (leadData as { assigned_to_id?: string }).assigned_to_id || '',
        source: (leadData as { source?: string }).source || '',
        // Pipeline Information
        status: leadData.status || '',
        priority: (leadData as { priority?: string }).priority || '',
        stage: leadData.stage || '',
        // Deal Information
        amount: String((leadData as { amount?: number }).amount || ''),
        closeDate: (leadData as { close_date?: string; closeDate?: string }).close_date || (leadData as { closeDate?: string }).closeDate || '',
        expectedCloseDate: (leadData as { expected_close_date?: string; expectedCloseDate?: string }).expected_close_date || (leadData as { expectedCloseDate?: string }).expectedCloseDate || '',
        // Description and Tags
        description: leadData.bio || '',
        tags: (leadData as { tags?: string[] }).tags || []
      };
    },
    
    // Stage column actions
    setStageColumnAnchorEl(state, action: PayloadAction<HTMLElement | null>) {
      state.pipeline.stageColumn.anchorEl = action.payload;
    },
    
    setStageColumnEditDialogOpen(state, action: PayloadAction<boolean>) {
      state.pipeline.stageColumn.editDialogOpen = action.payload;
    },
    
    setStageColumnDeleteDialogOpen(state, action: PayloadAction<boolean>) {
      state.pipeline.stageColumn.deleteDialogOpen = action.payload;
    },
    
    setStageColumnEditFormData(state, action: PayloadAction<Partial<StageColumnEditFormData>>) {
      state.pipeline.stageColumn.editFormData = { ...state.pipeline.stageColumn.editFormData, ...action.payload };
    },
    
    resetStageColumnEditFormData(state, action: PayloadAction<Partial<{ label?: string; name?: string }> | undefined>) {
      const stageData = action.payload || {};
      state.pipeline.stageColumn.editFormData = {
        stageName: stageData.label || stageData.name || '',
        position: '',
        positionType: 'after'
      };
    },
    
    // Form error actions
    setNewLeadErrors(state, action: PayloadAction<Record<string, string>>) {
      state.pipeline.formErrors.newLead = action.payload;
    },
    
    setEditLeadErrors(state, action: PayloadAction<Record<string, string>>) {
      state.pipeline.formErrors.editLead = action.payload;
    },
    
    clearFormErrors(state, action: PayloadAction<'newLead' | 'editLead' | undefined>) {
      const formType = action.payload; // 'newLead' or 'editLead'
      if (formType) {
        state.pipeline.formErrors[formType] = {};
      } else {
        state.pipeline.formErrors = { newLead: {}, editLead: {} };
      }
    },
    
    // Form loading actions
    setFormLoading(state, action: PayloadAction<{ formType: keyof FormLoading; loading: boolean }>) {
      const { formType, loading } = action.payload;
      state.pipeline.formLoading[formType] = loading;
    },
    
    // AI insights actions
    setAiInsights(state, action: PayloadAction<Partial<AIInsights>>) {
      state.pipeline.aiInsights = { ...state.pipeline.aiInsights, ...action.payload };
    },
    
    setAiInsightsLoading(state, action: PayloadAction<boolean>) {
      state.pipeline.aiInsights.loading = action.payload;
    },
    
    clearAiInsights(state) {
      state.pipeline.aiInsights = {
        loading: false,
        score: null,
        suggestedStage: null,
        similarLeads: [],
        emailValidation: null,
        phoneValidation: null,
        error: null
      };
    },
    
    // Pipeline settings actions
    setPipelineSettings(state, action: PayloadAction<Partial<PipelineSettings>>) {
      state.pipelineSettings = { ...state.pipelineSettings, ...action.payload };
    },
    
    setVisibleColumns(state, action: PayloadAction<Partial<VisibleColumns>>) {
      state.pipelineSettings.visibleColumns = { ...state.pipelineSettings.visibleColumns, ...action.payload };
    },
    
    toggleColumnVisibility(state, action: PayloadAction<keyof VisibleColumns>) {
      const columnKey = action.payload;
      state.pipelineSettings.visibleColumns[columnKey] = !state.pipelineSettings.visibleColumns[columnKey];
    },
    
    // General UI actions
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
    
    setGlobalLoading(state, action: PayloadAction<boolean>) {
      state.loading.global = action.payload;
    },
    
    setPipelineLoading(state, action: PayloadAction<boolean>) {
      state.loading.pipeline = action.payload;
    },
    
    setUsersLoading(state, action: PayloadAction<boolean>) {
      state.loading.users = action.payload;
    }
  }
});

export const {
  // Pipeline view actions
  setPipelineViewMode,
  setPipelineZoom,
  setPipelineSearchQuery,
  setPipelineActiveFilters,
  clearPipelineFilters,
  setPipelineSortConfig,
  
  // Dialog actions
  setAddStageDialogOpen,
  setCreateLeadDialogOpen,
  setEditLeadDialogOpen,
  setFilterDialogOpen,
  setSortDialogOpen,
  setSettingsDialogOpen,
  
  // Selected items
  setSelectedLead,
  
  // Active states
  setActiveCard,
  setActiveStage,
  
  // Stage form actions
  setNewStageName,
  setPositionStageId,
  setPositionType,
  setAddStageError,
  setIsSubmitting,
  
  // New lead form actions
  setNewLeadField,
  setNewLead,
  resetNewLead,
  
  // Edit lead form actions
  setEditingLeadField,
  setEditingLead,
  resetEditingLead,
  
  // Lead card actions
  setLeadCardActiveTab,
  setLeadCardExpanded,
  setLeadCardEditingOverview,
  setLeadCardEditFormData,
  resetLeadCardEditFormData,
  
  // Stage column actions
  setStageColumnAnchorEl,
  setStageColumnEditDialogOpen,
  setStageColumnDeleteDialogOpen,
  setStageColumnEditFormData,
  resetStageColumnEditFormData,
  
  // Form error actions
  setNewLeadErrors,
  setEditLeadErrors,
  clearFormErrors,
  
  // Form loading actions
  setFormLoading,
  
  // AI insights actions
  setAiInsights,
  setAiInsightsLoading,
  clearAiInsights,
  
  // Pipeline settings actions
  setPipelineSettings,
  setVisibleColumns,
  toggleColumnVisibility,
  
  // General UI actions
  setSidebarOpen,
  setGlobalLoading,
  setPipelineLoading,
  setUsersLoading
} = uiSlice.actions;

export default uiSlice.reducer;

// Selectors with null safety
interface RootState {
  ui: UIState;
}

export const selectPipelineUI = (state: RootState): PipelineState => state.ui?.pipeline || initialState.pipeline;
export const selectPipelineViewMode = (state: RootState): 'kanban' | 'list' => state.ui?.pipeline?.viewMode || 'kanban';
export const selectPipelineZoom = (state: RootState): number => state.ui?.pipeline?.zoom || 1;
export const selectPipelineSearchQuery = (state: RootState): string => state.ui?.pipeline?.searchQuery || '';
export const selectPipelineActiveFilters = (state: RootState): PipelineActiveFilters => state.ui?.pipeline?.activeFilters || initialState.pipeline.activeFilters;
export const selectPipelineSortConfig = (state: RootState): PipelineSortConfig => state.ui?.pipeline?.sortConfig || initialState.pipeline.sortConfig;

// Dialog selectors
export const selectAddStageDialogOpen = (state: RootState): boolean => state.ui?.pipeline?.addStageDialogOpen || false;
export const selectCreateLeadDialogOpen = (state: RootState): boolean => state.ui?.pipeline?.createLeadDialogOpen || false;
export const selectEditLeadDialogOpen = (state: RootState): boolean => state.ui?.pipeline?.editLeadDialogOpen || false;
export const selectFilterDialogOpen = (state: RootState): boolean => state.ui?.pipeline?.filterDialogOpen || false;
export const selectSortDialogOpen = (state: RootState): boolean => state.ui?.pipeline?.sortDialogOpen || false;
export const selectSettingsDialogOpen = (state: RootState): boolean => state.ui?.pipeline?.settingsDialogOpen || false;

// Selected items selectors
export const selectSelectedLead = (state: RootState): Lead | null => state.ui?.pipeline?.selectedLead || null;

// Active state selectors
export const selectActiveCard = (state: RootState): string | number | null => state.ui?.pipeline?.activeCard || null;
export const selectActiveStage = (state: RootState): string | null => state.ui?.pipeline?.activeStage || null;

// Stage form selectors
export const selectNewStageName = (state: RootState): string => state.ui?.pipeline?.newStageName || '';
export const selectPositionStageId = (state: RootState): string => state.ui?.pipeline?.positionStageId || '';
export const selectPositionType = (state: RootState): 'before' | 'after' => state.ui?.pipeline?.positionType || 'after';
export const selectAddStageError = (state: RootState): string => state.ui?.pipeline?.addStageError || '';
export const selectIsSubmitting = (state: RootState): boolean => state.ui?.pipeline?.isSubmitting || false;

// New lead form selectors
export const selectNewLead = (state: RootState): NewLeadForm => state.ui?.pipeline?.newLead || initialState.pipeline.newLead;

// Edit lead form selectors
export const selectEditingLead = (state: RootState): EditingLeadForm => state.ui?.pipeline?.editingLead || initialState.pipeline.editingLead;

// Lead card selectors
export const selectLeadCardActiveTab = (state: RootState): number => state.ui?.pipeline?.leadCard?.activeTab || 0;
export const selectLeadCardExpanded = (state: RootState): boolean => state.ui?.pipeline?.leadCard?.expanded || false;
export const selectLeadCardEditingOverview = (state: RootState): boolean => state.ui?.pipeline?.leadCard?.editingOverview || false;
export const selectLeadCardEditFormData = (state: RootState): LeadCardEditFormData => state.ui?.pipeline?.leadCard?.editFormData || initialState.pipeline.leadCard.editFormData;

// Stage column selectors
export const selectStageColumnAnchorEl = (state: RootState): HTMLElement | null => state.ui?.pipeline?.stageColumn?.anchorEl || null;
export const selectStageColumnEditDialogOpen = (state: RootState): boolean => state.ui?.pipeline?.stageColumn?.editDialogOpen || false;
export const selectStageColumnDeleteDialogOpen = (state: RootState): boolean => state.ui?.pipeline?.stageColumn?.deleteDialogOpen || false;
export const selectStageColumnEditFormData = (state: RootState): StageColumnEditFormData => state.ui?.pipeline?.stageColumn?.editFormData || initialState.pipeline.stageColumn.editFormData;

// Form error selectors
export const selectNewLeadErrors = (state: RootState): Record<string, string> => state.ui?.pipeline?.formErrors?.newLead || {};
export const selectEditLeadErrors = (state: RootState): Record<string, string> => state.ui?.pipeline?.formErrors?.editLead || {};

// Form loading selectors
export const selectCreateLeadLoading = (state: RootState): boolean => state.ui?.pipeline?.formLoading?.createLead || false;
export const selectEditLeadLoading = (state: RootState): boolean => state.ui?.pipeline?.formLoading?.editLead || false;
export const selectDeleteLeadLoading = (state: RootState): boolean => state.ui?.pipeline?.formLoading?.deleteLead || false;

// AI insights selectors
export const selectAiInsights = (state: RootState): AIInsights => state.ui?.pipeline?.aiInsights || initialState.pipeline.aiInsights;
export const selectAiInsightsLoading = (state: RootState): boolean => state.ui?.pipeline?.aiInsights?.loading || false;

// Pipeline settings selectors
export const selectPipelineSettings = (state: RootState): PipelineSettings => state.ui?.pipelineSettings || initialState.pipelineSettings;
export const selectVisibleColumns = (state: RootState): VisibleColumns => state.ui?.pipelineSettings?.visibleColumns || initialState.pipelineSettings.visibleColumns;
export const selectPipelineViewModeFromSettings = (state: RootState): 'kanban' | 'list' => state.ui?.pipelineSettings?.viewMode || 'kanban';

// General UI selectors
export const selectSidebarOpen = (state: RootState): boolean => state.ui?.sidebarOpen ?? true;
export const selectUILoading = (state: RootState): UILoading => state.ui?.loading || initialState.loading;

