import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { DndContext, closestCorners, DragOverlay, useSensor, useSensors, PointerSensor, KeyboardSensor, TouchSensor, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store/store';
import { store } from '@/store/store';
import { getPipelinePreferences, savePipelinePreferences, autoSavePipelinePreferences } from '@/services/userService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import type { Lead } from '@/features/deals-pipeline/types';
import { logger } from '@/lib/logger';
import type { Stage } from '@/features/deals-pipeline/store/slices/pipelineSlice';
import { usePipelineStats } from '@lad/frontend-features/deals-pipeline';
// Pipeline component imports
import PipelineBoardToolbar from './PipelineBoardToolbar';
import PipelineStageColumn from './PipelineStageColumn';
import PipelineLeadCard from './PipelineLeadCard';
import EnhancedAddStageDialog from './EnhancedAddStageDialog';
import CreateCardDialog from './CreateCardDialog';
import PipelineFilterDialog from './PipelineFilterDialog';
import PipelineBoardSettings from './PipelineBoardSettings';
import PipelineListView from './PipelineListView';
import PipelineKanbanView from './PipelineKanbanView';
import {
  selectStagesWithNames,
  selectLeadsByStage,
  selectFilteredLeadsByStageFromUI,
  selectPipelineBoardDataWithFilters
} from '@/features/deals-pipeline/store/selector/pipelineSelectors';
import { 
  selectStagesLoading, 
  selectStagesError 
} from '@/features/deals-pipeline/store/slices/pipelineSlice';
import { 
  selectLeadsLoading, 
  selectLeadsError,
  selectLeads,
  selectLeadsPagination
} from '@/features/deals-pipeline/store/slices/leadsSlice';
import { 
  selectUsers,
  selectUsersLoading,
  selectUsersError
} from '@/store/slices/usersSlice';
import {
  selectPipelineUI,
  selectPipelineViewMode,
  selectPipelineZoom,
  selectPipelineSearchQuery,
  selectPipelineActiveFilters,
  selectAddStageDialogOpen,
  selectCreateLeadDialogOpen,
  selectEditLeadDialogOpen,
  selectFilterDialogOpen,
  selectSettingsDialogOpen,
  selectSelectedLead,
  selectActiveCard,
  selectNewStageName,
  selectPositionStageId,
  selectPositionType,
  selectAddStageError,
  selectIsSubmitting,
  selectNewLead,
  selectEditingLead,
  selectAiInsights,
  selectPipelineSettings,
  setPipelineViewMode,
  setPipelineZoom,
  setPipelineSearchQuery,
  setPipelineActiveFilters,
  clearPipelineFilters,
  setAddStageDialogOpen,
  setCreateLeadDialogOpen,
  setEditLeadDialogOpen,
  setFilterDialogOpen,
  setSettingsDialogOpen,
  setSelectedLead,
  setActiveCard,
  setNewStageName,
  setPositionStageId,
  setPositionType,
  setAddStageError,
  setIsSubmitting,
  setNewLead,
  resetNewLead,
  setEditingLead,
  setAiInsights,
  setPipelineSettings
} from '@/store/slices/uiSlice';
import { 
  selectUser,
  selectIsAuthenticated
} from '@/store/slices/authSlice';
import { 
  loadPipelineDataAction, 
  refreshPipelineDataAction,
  fetchLeadsAction,
  moveLeadAction,
  createLeadAction,
  updateLeadAction,
  deleteLeadAction,
  createStageAction,
  updateStageAction,
  deleteStageAction,
  reorderStagesAction
} from '@/features/deals-pipeline/store/action/pipelineActions';
import { fetchUsersAction } from '@/store/actions/usersActions';
import { bootstrapApp } from '@/store/actions/bootstrapActions';
import { showSnackbar } from '@/store/slices/bootstrapSlice';
import { 
  selectStatuses, 
  selectPriorities, 
  selectSources,
  selectMasterDataLoading,
  selectMasterDataErrors,
  setStatuses,
  setSources, 
  setPriorities
} from '@/store/slices/masterDataSlice';
import { fetchStatuses, fetchSources, fetchPriorities, updateLeadStage, addStage, createLead, updateLead, deleteLead, updateStage, deleteStage } from '@lad/frontend-features/deals-pipeline';
const HEADER_HEIGHT = 64; 
// Feature flags for gradual migration
const USE_REDUX_PIPELINE = true; // Enable Redux data fetching
const USE_REDUX_ACTIONS = true;  // Enable Redux actions (create, update, delete)
interface StageData {
  stage: Stage;
  leads: Lead[];
}
interface LeadsByStage {
  [key: string]: StageData;
}
interface FilteredLeadsByStage {
  [key: string]: StageData;
}
interface StageDataForCreate {
  name: string;
  positionStageId: string | undefined;
  positionType: 'before' | 'after';
}
interface StageUpdateData {
  [key: string]: unknown;
}
const PipelineBoard: React.FC = () => {
  const initialPipelineLoadRequestedRef = useRef(false);
  const initialMasterDataLoadRequestedRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isFetchingMoreRef = useRef(false);

  // Education vertical context
  const { hasFeature } = useAuth();
  const isEducation = hasFeature('education_vertical');
  // Dynamic labels based on vertical
  const labels = useMemo(() => ({
    entity: isEducation ? 'Student' : 'Lead',
    entityPlural: isEducation ? 'Students' : 'Leads',
    pipeline: isEducation ? 'Admissions Pipeline' : 'Pipeline',
    owner: isEducation ? 'Counsellor' : 'Owner',
    deal: isEducation ? 'Application' : 'Deal',
    value: isEducation ? 'Program Fee' : 'Value'
  }), [isEducation]);
  // Redux state and dispatch
  const dispatch = useDispatch<AppDispatch>();
  // Redux selectors
  const reduxLeadsByStage = useSelector(selectLeadsByStage);
  const reduxStages = useSelector(selectStagesWithNames);
  const reduxLeads = useSelector(selectLeads);
  const reduxStagesLoading = useSelector(selectStagesLoading);
  const reduxLeadsLoading = useSelector(selectLeadsLoading);
  const reduxStagesError = useSelector(selectStagesError);
  const reduxLeadsError = useSelector(selectLeadsError);
  const pagination = useSelector(selectLeadsPagination);
  // Master data selectors
  const statusOptions = useSelector(selectStatuses);
  const priorityOptions = useSelector(selectPriorities);
  const sourceOptions = useSelector(selectSources);
  const masterDataLoading = useSelector(selectMasterDataLoading);
  const masterDataErrors = useSelector(selectMasterDataErrors);
  // Get current user for role checking
  const currentUser = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  // Global state from Redux - Using new selectors
  const teamMembers = useSelector(selectUsers);
  const usersLoading = useSelector(selectUsersLoading);
  const usersError = useSelector(selectUsersError);
  // UI state from global Redux state - using selectors from uiSlice
  const viewMode = useSelector(selectPipelineViewMode);
  const zoom = useSelector(selectPipelineZoom);
  const searchQuery = useSelector(selectPipelineSearchQuery);
  const activeFilters = useSelector(selectPipelineActiveFilters);

  const { data: pipelineStats } = usePipelineStats(activeFilters as any);
  const serverTotalLeadsCount = Number(
    (pipelineStats as any)?.total_leads ?? (pipelineStats as any)?.totalLeads ?? 0
  );
  // Dialog states from global Redux state
  const addDialogOpen = useSelector(selectAddStageDialogOpen);
  const createCardDialogOpen = useSelector(selectCreateLeadDialogOpen);
  const filterDialogOpen = useSelector(selectFilterDialogOpen);
  const settingsDialogOpen = useSelector(selectSettingsDialogOpen);
  // Selected items from global Redux state
  const selectedLead = useSelector(selectSelectedLead);
  const activeCardId = useSelector(selectActiveCard);
  // Form states from global Redux state
  const newStageName = useSelector(selectNewStageName);
  const positionStageId = useSelector(selectPositionStageId);
  const positionType = useSelector(selectPositionType);
  const addStageError = useSelector(selectAddStageError);
  const isSubmitting = useSelector(selectIsSubmitting);
  const newLead = useSelector(selectNewLead);
  const editingLead = useSelector(selectEditingLead);
  const aiInsights = useSelector(selectAiInsights);
  // Pipeline settings from global Redux state
  const pipelineSettings = useSelector(selectPipelineSettings);
  // Debug log pipeline settings
  // Get filtered pipeline data from the new enhanced selector
  const pipelineBoardData = useSelector(selectPipelineBoardDataWithFilters);
  // Add preferences loading state (still local as it's component-specific)
  const [preferencesLoaded, setPreferencesLoaded] = useState<boolean>(false);
  // Custom export date range dialog state
  const [customExportDialogOpen, setCustomExportDialogOpen] = useState<boolean>(false);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  // Computed loading state combining all loading states
  const isLoading = reduxStagesLoading || reduxLeadsLoading || masterDataLoading || usersLoading || !preferencesLoaded;
  const currentError = reduxStagesError || reduxLeadsError || usersError || masterDataErrors?.[0] || null;
  // Use the filtered data directly from selector instead of manual filtering
  const currentStages = pipelineBoardData.stages;
  // Memoize normalized stages to prevent creating new objects on every render
  // This prevents child components from re-rendering unnecessarily
  const normalizedStages = useMemo(
    () => currentStages.map(s => ({ ...s, label: s.label || s.name || s.key })),
    [currentStages]
  );
  const currentLeadsByStage = useMemo<LeadsByStage>(() => {
    return pipelineBoardData.stages.reduce((acc: LeadsByStage, stage: any) => {
      // Sort leads by updated_at (most recent first)
      const sortedLeads = (stage.leads || []).sort((a: any, b: any) => {
        const dateA = new Date(a.updated_at || a.updatedAt || 0);
        const dateB = new Date(b.updated_at || b.updatedAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
      acc[stage.key] = { stage: { key: stage.key, label: stage.label || stage.name || stage.key }, leads: sortedLeads };
      return acc;
    }, {});
  }, [pipelineBoardData]);

  const activeCard = useMemo((): Lead | null => {
    if (activeCardId === null || activeCardId === undefined) return null;
    const allLeads = Object.values(currentLeadsByStage).flatMap((stage) => stage.leads || []);
    return allLeads.find((l) => String(l.id) === String(activeCardId)) || null;
  }, [activeCardId, currentLeadsByStage]);

  // Use filtered data directly (no manual filtering needed)
  const filteredAndSortedLeadsByStage = currentLeadsByStage;
  // Search and filter state handlers (now dispatch to Redux)
  const handleSearchQueryChange = useCallback((query: string) => {
    dispatch(setPipelineSearchQuery(query));
  }, [dispatch]);
  const handleFiltersChange = useCallback((filters: typeof activeFilters) => {
    dispatch(setPipelineActiveFilters(filters));
  }, [dispatch]);
  const handleClearFilters = useCallback(() => {
    dispatch(clearPipelineFilters());
  }, [dispatch]);
  // Local states that should remain local (component-specific, not shared globally)
  const [updating, setUpdating] = useState<boolean>(false);
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());
  // Detect if we're on a touch device
  const isTouchDevice = () => {
    return (
      typeof window !== 'undefined' &&
      (window.matchMedia('(hover: none)').matches ||
        window.matchMedia('(pointer: coarse)').matches ||
        navigator.maxTouchPoints > 0)
    );
  };
  // Sensors for drag - optimized for both desktop and mobile
  // Note: useSensors is a hook and must be called at top level (not inside useMemo)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 2, // Lower threshold for a more responsive drag start
        delay: isTouchDevice() ? 80 : 0, // Short delay on touch to reduce accidental drags without feeling stuck
        tolerance: isTouchDevice() ? 3 : 0 // Slight tolerance for touch movement
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 120, // Shorter delay to make drag feel more immediate
        tolerance: 3 // Slightly lower tolerance for quicker activation
      }
    }),
    useSensor(KeyboardSensor)
  );
  // Load preferences
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        const preferences = await getPipelinePreferences();
        // Merge uiSettings with viewMode and visibleColumns
        const newSettings = { 
          viewMode: preferences.viewMode || 'list',
          visibleColumns: preferences.visibleColumns as any || {},
          ...preferences.uiSettings 
        };
        dispatch(setPipelineSettings(newSettings as any));
      } catch (error) {
        console.error('[PipelineBoard] Failed to load preferences:', error);
      } finally {
        setPreferencesLoaded(true);
      }
    };
    loadUserPreferences();
  }, [dispatch]);
  // Load users/team members via Redux when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchUsersAction());
    }
  }, [isAuthenticated, dispatch]);

  // Infinite scroll handler for Kanban board
  useEffect(() => {
    const handleScroll = async () => {
      if (!scrollContainerRef.current || !pagination.hasMore || reduxLeadsLoading || isFetchingMoreRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      
      // If we're within 100px of the bottom, load more
      if (scrollHeight - scrollTop - clientHeight < 100) {
        try {
          isFetchingMoreRef.current = true;
          logger.debug('[PipelineBoard] Reached bottom, loading next page:', pagination.page + 1);
          await dispatch(fetchLeadsAction(pagination.page + 1, pagination.limit));
        } finally {
          isFetchingMoreRef.current = false;
        }
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer && pipelineSettings.viewMode === 'kanban') {
      scrollContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [pagination.hasMore, pagination.page, pagination.limit, reduxLeadsLoading, pipelineSettings.viewMode, dispatch]);
  // Calculate totals for toolbar
  const totalLeads = useMemo(() => {
    return Object.values(currentLeadsByStage).reduce((total, stage) => total + stage.leads.length, 0);
  }, [currentLeadsByStage]);
  const filteredLeadsCount = useMemo(() => {
    return Object.values(currentLeadsByStage).reduce((total, stage) => total + stage.leads.length, 0);
  }, [currentLeadsByStage]);
  // Flattened leads for ListView
  const sortedAndFilteredLeads = useMemo(() => {
    return Object.values(currentLeadsByStage)
      .flatMap(stageData => stageData.leads)
      .sort((a, b) => {
        const dateA = new Date(a.updated_at || a.updatedAt || 0);
        const dateB = new Date(b.updated_at || b.updatedAt || 0);
        return dateB.getTime() - dateA.getTime(); // Most recent first
      });
  }, [currentLeadsByStage]);

  const handleExportLeads = useCallback(async (): Promise<void> => {
    const leads = sortedAndFilteredLeads || [];
    const filename = `pipeline_leads_${new Date().toISOString().slice(0, 10)}.xlsx`;

    const { Workbook } = await import('exceljs');

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Leads');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 18 },
      { header: 'Name', key: 'name', width: 24 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Company', key: 'company', width: 24 },
      { header: 'Stage', key: 'stage', width: 18 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Source', key: 'source', width: 16 },
      { header: 'Value', key: 'value', width: 14 },
      { header: 'Assignee', key: 'assignee', width: 18 },
      { header: 'Created At', key: 'created_at', width: 20 },
      { header: 'Updated At', key: 'updated_at', width: 20 }
    ];

    leads.forEach((lead: any) => {
      worksheet.addRow({
        id: lead?.id ?? '',
        name: lead?.name ?? lead?.contact_name ?? '',
        email: lead?.email ?? '',
        phone: lead?.phone ?? '',
        company: lead?.company_name ?? lead?.company ?? '',
        stage: lead?.stage ?? '',
        status: lead?.status ?? '',
        priority: lead?.priority ?? '',
        source: lead?.source ?? '',
        value: lead?.amount ?? lead?.value ?? '',
        assignee: lead?.assigneeName ?? lead?.assignee ?? lead?.assigned_to_id ?? lead?.assigned_to ?? '',
        created_at: lead?.created_at ?? lead?.createdAt ?? '',
        updated_at: lead?.updated_at ?? lead?.updatedAt ?? ''
      });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [sortedAndFilteredLeads]);

  const handleExportLeadsWithDateRange = useCallback(async (
    range: 'today' | 'thisMonth' | 'thisYear' | 'custom',
    startDate?: string,
    endDate?: string
  ): Promise<void> => {
    const allLeads = sortedAndFilteredLeads || [];
    let start: Date;
    let end: Date;
    const now = new Date();
    now.setHours(0, 0, 0, 0); // start of today

    switch (range) {
      case 'today':
        start = new Date(now);
        end = new Date(now);
        end.setDate(end.getDate() + 1);
        end.setMilliseconds(end.getMilliseconds() - 1);
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        end.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        setCustomExportDialogOpen(true);
        return; // wait for user to pick dates in dialog
      default:
        return;
    }

    const filtered = allLeads.filter((lead: any) => {
      const createdAt = lead?.created_at || lead?.createdAt;
      if (!createdAt) return false;
      const created = new Date(createdAt);
      return created >= start && created <= end;
    });

    const filename = `pipeline_leads_${range}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Leads');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 18 },
      { header: 'Name', key: 'name', width: 24 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Company', key: 'company', width: 24 },
      { header: 'Stage', key: 'stage', width: 18 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Source', key: 'source', width: 16 },
      { header: 'Value', key: 'value', width: 14 },
      { header: 'Assignee', key: 'assignee', width: 18 },
      { header: 'Created At', key: 'created_at', width: 20 },
      { header: 'Updated At', key: 'updated_at', width: 20 }
    ];

    filtered.forEach((lead: any) => {
      worksheet.addRow({
        id: lead?.id ?? '',
        name: lead?.name ?? lead?.contact_name ?? '',
        email: lead?.email ?? '',
        phone: lead?.phone ?? '',
        company: lead?.company_name ?? lead?.company ?? '',
        stage: lead?.stage ?? '',
        status: lead?.status ?? '',
        priority: lead?.priority ?? '',
        source: lead?.source ?? '',
        value: lead?.amount ?? lead?.value ?? '',
        assignee: lead?.assigneeName ?? lead?.assignee ?? lead?.assigned_to_id ?? lead?.assigned_to ?? '',
        created_at: lead?.created_at ?? lead?.createdAt ?? '',
        updated_at: lead?.updated_at ?? lead?.updatedAt ?? ''
      });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [sortedAndFilteredLeads]);

  const handleCustomExport = useCallback(() => {
    if (!customStartDate || !customEndDate) return;
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    end.setHours(23, 59, 59, 999);
    const allLeads = sortedAndFilteredLeads || [];
    const filtered = allLeads.filter((lead: any) => {
      const createdAt = lead?.created_at || lead?.createdAt;
      if (!createdAt) return false;
      const created = new Date(createdAt);
      return created >= start && created <= end;
    });

    (async () => {
      const filename = `pipeline_leads_custom_${new Date().toISOString().slice(0, 10)}.xlsx`;
      const { Workbook } = await import('exceljs');
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet('Leads');

      worksheet.columns = [
        { header: 'ID', key: 'id', width: 18 },
        { header: 'Name', key: 'name', width: 24 },
        { header: 'Email', key: 'email', width: 28 },
        { header: 'Phone', key: 'phone', width: 18 },
        { header: 'Company', key: 'company', width: 24 },
        { header: 'Stage', key: 'stage', width: 18 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Priority', key: 'priority', width: 12 },
        { header: 'Source', key: 'source', width: 16 },
        { header: 'Value', key: 'value', width: 14 },
        { header: 'Assignee', key: 'assignee', width: 18 },
        { header: 'Created At', key: 'created_at', width: 20 },
        { header: 'Updated At', key: 'updated_at', width: 20 }
      ];

      filtered.forEach((lead: any) => {
        worksheet.addRow({
          id: lead?.id ?? '',
          name: lead?.name ?? lead?.contact_name ?? '',
          email: lead?.email ?? '',
          phone: lead?.phone ?? '',
          company: lead?.company_name ?? lead?.company ?? '',
          stage: lead?.stage ?? '',
          status: lead?.status ?? '',
          priority: lead?.priority ?? '',
          source: lead?.source ?? '',
          value: lead?.amount ?? lead?.value ?? '',
          assignee: lead?.assigneeName ?? lead?.assignee ?? lead?.assigned_to_id ?? lead?.assigned_to ?? '',
          created_at: lead?.created_at ?? lead?.createdAt ?? '',
          updated_at: lead?.updated_at ?? lead?.updatedAt ?? ''
        });
      });

      worksheet.getRow(1).font = { bold: true };
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setCustomExportDialogOpen(false);
      setCustomStartDate('');
      setCustomEndDate('');
    })();
  }, [customStartDate, customEndDate, sortedAndFilteredLeads]);

  // Memoized stage column component to prevent unnecessary re-renders
  const StageColumnMemo = useMemo(() => {
    return React.memo(({ stageKey, stage, leads, activeCard, handlers, allStages }: {
      stageKey: string;
      stage: Stage;
      leads: Lead[];
      activeCard: Lead | null;
      handlers: {
        onStageUpdate: () => void;
        onStageDelete: () => void;
        onEdit: (lead: Lead) => void;
        onDelete: (leadId: string | number) => void;
        onStatusChange: (leadId: string | number, newStatus: string) => void;
        onUpdateStage: (stageKey: string, updates: StageUpdateData) => Promise<void>;
        onDeleteStageAction: (stageKey: string) => Promise<void>;
      };
      allStages: Stage[];
    }) => {
      const leadIds = useMemo(() => leads?.map(l => l.id) || [], [leads]);
      return (
        <SortableContext 
          key={stageKey}
          items={leadIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="w-[280px] min-w-[280px] h-[600px] overflow-auto">
            <PipelineStageColumn
              stage={stage}
              leads={leads || []}
              teamMembers={teamMembers}
              droppableId={stageKey}
              activeCardId={activeCard ? activeCard.id : null}
              onStageUpdate={handlers.onStageUpdate}
              onStageDelete={handlers.onStageDelete}
              onEdit={handlers.onEdit}
              onDelete={handlers.onDelete}
              onStatusChange={handlers.onStatusChange}
              allStages={allStages}
              handlers={{
                onUpdateStage: async (stageKey: string, updates: Record<string, unknown>): Promise<void> => {
                  await handlers.onUpdateStage(stageKey, updates as StageUpdateData);
                },
                onDeleteStageAction: handlers.onDeleteStageAction
              }}
            />
          </div>
        </SortableContext>
      );
    });
  }, [zoom, currentStages, teamMembers]);
  // Data loading logic
  const loadStagesAndLeads = async (): Promise<void> => {
    if (USE_REDUX_PIPELINE) {
      // Use Redux for data loading
      dispatch(loadPipelineDataAction());
    } else {
      // Fallback to local state - this path is not used but kept for compatibility
      }
  };
  // Load master data if not available
  const loadMasterData = useCallback(async (): Promise<void> => {
    if (masterDataLoading) return;
    if (initialMasterDataLoadRequestedRef.current) return;

    if (!statusOptions.length || !priorityOptions.length || !sourceOptions.length) {
      try {
        initialMasterDataLoadRequestedRef.current = true;
        const [statuses, sources, priorities] = await Promise.all([
          fetchStatuses().catch((err: unknown) => { 
            console.warn('Failed to load statuses:', err); 
            return []; 
          }),
          fetchSources().catch((err: unknown) => { 
            console.warn('Failed to load sources:', err); 
            return []; 
          }),
          fetchPriorities().catch((err: unknown) => { 
            console.warn('Failed to load priorities:', err); 
            return []; 
          })
        ]);
        // Dispatch master data to Redux store
        dispatch(setStatuses(statuses));
        dispatch(setSources(sources));
        dispatch(setPriorities(priorities));
        } catch (error) {
        console.warn('[PipelineBoard] Failed to load master data:', error);
      } finally {
        initialMasterDataLoadRequestedRef.current = false;
      }
    }
  }, [dispatch, statusOptions.length, priorityOptions.length, sourceOptions.length, masterDataLoading]);
  useEffect(() => {
    if (!initialPipelineLoadRequestedRef.current) {
      initialPipelineLoadRequestedRef.current = true;
      dispatch(loadPipelineDataAction());
      dispatch(fetchUsersAction());
    }
    loadMasterData();
  }, [dispatch, loadMasterData]);
  // Memoize drag handlers to prevent child re-renders
  const handleDragStart = useCallback((event: DragStartEvent): void => {
    const { active } = event;
    if (!active) return;
    // Find lead in the appropriate data source
    const allLeads = Object.values(currentLeadsByStage).flatMap((stage) => stage.leads);
    const card = allLeads.find((l) => String(l.id) === String(active.id));
    if (card) {
      dispatch(setActiveCard(card.id));
    }
  }, [currentLeadsByStage, dispatch]);
  const handleDragEnd = useCallback(async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event;
    // Early exit checks BEFORE clearing drag state - prevents unnecessary state updates
    if (!over || !active) {
      dispatch(setActiveCard(null));
      return;
    }
    const allLeads = Object.values(currentLeadsByStage).flatMap((stage) => stage.leads || []);
    const activeLeadData = (active.data?.current as { lead?: Lead })?.lead;
    let activeLead = activeLeadData || allLeads.find(l => String(l.id) === String(active.id));
    const activeLeadId = activeLead?.id || active.id;
    let destinationStageId: string | number | null = null;
    if (over?.data?.current) {
      const d = over.data.current as { type?: string; stageId?: string | number; lead?: Lead };
      if (d.type === 'stage' && (d.stageId !== undefined && d.stageId !== null)) {
        destinationStageId = d.stageId;
      } else if (d.type === 'lead' && d.lead) {
        destinationStageId = d.lead.stage || null;
      }
    }
    if (!destinationStageId && over?.id) {
      const stageMatch = currentStages.find(s => s.key === over.id);
      if (stageMatch) {
        destinationStageId = stageMatch.key;
      } else {
        const leadMatch = allLeads.find(l => String(l.id) === String(over.id));
        if (leadMatch) {
          destinationStageId = leadMatch.stage || null;
        }
      }
    }
    if (!destinationStageId) {
      dispatch(setActiveCard(null));
      return;
    }
    const sourceStageId = activeLead?.stage;
    if (String(sourceStageId) === String(destinationStageId)) {
      dispatch(setActiveCard(null));
      return;
    }
    // Clear active card state immediately for instant UI responsiveness
    // This allows the next drag to start immediately without waiting for API
    dispatch(setActiveCard(null));
    // CRITICAL: Fire-and-forget pattern for instant UI responsiveness
    // The moveLeadAction already applies optimistic updates, so UI updates instantly
    // Server sync happens in background without blocking the next drag operation
    if (USE_REDUX_ACTIONS) {
      // Don't await - dispatch returns immediately, making next drag responsive
      Promise.resolve(dispatch(moveLeadAction(String(activeLeadId), String(destinationStageId))))
        .catch(() => {
          // Error handling is already done inside moveLeadAction
          // Just show user-facing message without blocking UI
          dispatch(showSnackbar({ message: 'Failed to move lead', severity: 'error' }));
        });
    } else {
      // Fallback: also non-blocking
      updateLeadStage(String(activeLeadId), String(destinationStageId))
        .then(() => dispatch(loadPipelineDataAction()))
        .catch(() => {
          dispatch(showSnackbar({ message: 'Failed to move lead', severity: 'error' }));
        });
    }
  }, [currentLeadsByStage, currentStages, dispatch]);
  const handleDragCancel = useCallback((): void => {
    dispatch(setActiveCard(null));
  }, [dispatch]);
  const handleAddStage = async (): Promise<void> => {
    dispatch(setAddStageError(''));
    if (!newStageName.trim()) {
      // Show validation error in snackbar and close dialog
      dispatch(showSnackbar({
        message: 'Stage name is required',
        severity: 'warning'
      }));
      return;
    }
    dispatch(setIsSubmitting(true));
    try {
      const stageData: StageDataForCreate = {
        name: newStageName.trim(),
        positionStageId: positionStageId || undefined,
        positionType
      };
      await handleCreateStage(stageData);
      // Success - show success message and close dialog
      dispatch(showSnackbar({
        message: 'Stage created successfully',
        severity: 'success'
      }));
      dispatch(setNewStageName(''));
      dispatch(setPositionStageId(''));
      dispatch(setPositionType('after'));
      dispatch(setAddStageDialogOpen(false));
    } catch (error) {
      // Error - show error in snackbar and close dialog
      const errorMessage = (error as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error || (error as { message?: string }).message || 'Failed to add stage';
      dispatch(showSnackbar({
        message: errorMessage,
        severity: 'error'
      }));
      // Close dialog even on error since we're showing the error in snackbar
      dispatch(setNewStageName(''));
      dispatch(setPositionStageId(''));
      dispatch(setPositionType('after'));
      dispatch(setAddStageDialogOpen(false));
    } finally {
      dispatch(setIsSubmitting(false));
    }
  };
  const handleCreateCard = async (): Promise<void> => {
    if (!newLead.name.trim()) {
      // Show validation error in snackbar
      dispatch(showSnackbar({
        message: 'Lead name is required',
        severity: 'warning'
      }));
      return;
    }
    if (!newLead.stage) {
      // Show validation error in snackbar
      dispatch(showSnackbar({
        message: 'Please select a stage',
        severity: 'warning'
      }));
      return;
    }
    try {
      // Always use Redux action for creating lead
      await dispatch(createLeadAction({ ...newLead, status: newLead.status as 'Active' | 'Inactive' | undefined }));
      // Success - show success message and close dialog
      dispatch(showSnackbar({
        message: 'Lead created successfully',
        severity: 'success'
      }));
      // Reset form
      dispatch(setNewLead({
        name: '',
        email: '',
        phone: '',
        company: '',
        stage: '',
        status: 'New',
        source: 'Manual',
        amount: undefined,
        description: '',
        priority: 'Medium',
        assignee: '',
        dueDate: null
      }));
      dispatch(setCreateLeadDialogOpen(false));
    } catch (error) {
      // Error - show error in snackbar and close dialog
      const errorMessage = (error as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error || (error as { message?: string }).message || 'Failed to create lead';
      dispatch(showSnackbar({
        message: errorMessage,
        severity: 'error'
      }));
      // Close dialog even on error since we're showing the error in snackbar
      dispatch(setNewLead({
        name: '',
        email: '',
        phone: '',
        company: '',
        stage: '',
        status: 'New',
        source: 'Manual',
        amount: undefined,
        description: '',
        priority: 'Medium',
        assignee: '',
        dueDate: null
      }));
      dispatch(setCreateLeadDialogOpen(false));
    }
  };
  const analyzeLead = async (): Promise<void> => {
    if (!newLead.name.trim() || !newLead.email) return;
    dispatch(setAiInsights({ ...aiInsights, loading: true, error: null }));
    try {
      const mockAnalysis = {
        score: Math.floor(Math.random() * 100),
        suggestedStage: currentStages[Math.floor(Math.random() * currentStages.length)]?.name || 'Lead',
        similarLeads: Object.values(currentLeadsByStage).flatMap(stage => stage.leads).slice(0, 3).map(lead => ({
          name: lead.name,
          stage: lead.stage,
          similarity: Math.floor(Math.random() * 100)
        })),
        emailValidation: {
          valid: true,
          suggestions: ['Consider using a business email']
        },
        phoneValidation: {
          valid: true,
          format: 'International'
        }
      };
      await new Promise(resolve => setTimeout(resolve, 1000));
      dispatch(setAiInsights({
        ...aiInsights,
        loading: false,
        suggestedStage: mockAnalysis.suggestedStage,
        score: mockAnalysis.score,
        similarLeads: [],
        emailValidation: mockAnalysis.emailValidation,
        phoneValidation: mockAnalysis.phoneValidation
      }));
    } catch (error) {
      dispatch(setAiInsights({
        ...aiInsights,
        loading: false,
        error: 'Failed to analyze lead'
      }));
    }
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      if (newLead.email) {
        analyzeLead();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [newLead.email]);
  const getPositionPreview = (): React.ReactNode => {
    if (!positionStageId) {
      // Show preview for "add at end"
      const stagesCopy = [...currentStages].sort((a, b) => (a.order || 0) - (b.order || 0));
      return (
        <div className="mt-4 p-4 bg-white rounded-lg">
          <h3 className="text-sm font-medium text-gray-600 mb-2">
            Stage Position Preview
          </h3>
          {stagesCopy.map((stage, index) => (
            <div
              key={index}
              className="flex items-center py-2 px-4 mb-2 rounded bg-gray-50 text-gray-900"
            >
              <span className="text-sm font-normal">
                {stage.name || stage.label}
              </span>
            </div>
          ))}
          {/* New stage at the end */}
          <div className="flex items-center py-2 px-4 mb-2 rounded bg-[#e8ebf7] text-primary border-2 border-primary/80">
            <span className="text-sm font-semibold">
              {newStageName || 'New Stage'} (will be added here)
            </span>
          </div>
        </div>
      );
    }
    const referenceStage = currentStages.find(s => s.key === positionStageId);
    if (!referenceStage) return null;
    const stagesCopy = [...currentStages].sort((a, b) => (a.order || 0) - (b.order || 0));
    const referenceIndex = stagesCopy.findIndex(s => s.key === positionStageId);
    let previewStages = [...stagesCopy];
    const previewId = `preview-${Date.now()}`;
    const previewStage = {
      id: previewId,
      key: previewId,
      label: newStageName || 'New Stage',
      name: newStageName || 'New Stage',
      isPreview: true,
      display_order: 0,
      leads: [],
      leadCount: 0,
      totalValue: 0,
      priority: { high: 0, medium: 0, low: 0 },
      order: positionType === 'before' ? referenceIndex : referenceIndex + 1
    };
    if (positionType === 'before') {
      previewStages.splice(referenceIndex, 0, { key: 'preview', label: newStageName || 'New Stage', isPreview: true } as any);
    } else {
      previewStages.splice(referenceIndex + 1, 0, { key: 'preview', label: newStageName || 'New Stage', isPreview: true } as any);
    }
    return (
      <div className="mt-4 p-4 bg-white rounded-lg">
        <h3 className="text-sm font-medium text-gray-600 mb-2">
          Stage Position Preview
        </h3>
        {previewStages.map((stage, index) => (
          <div
            key={index}
            className={`flex items-center py-2 px-4 mb-2 rounded ${
              (stage as Stage & { isPreview?: boolean }).isPreview 
                ? 'bg-[#e8ebf7] text-[#3B82F6] border-2 border-[#EBF4FF]' 
                : 'bg-gray-50 text-gray-900'
            }`}
          >
            <span className={`text-sm ${(stage as Stage & { isPreview?: boolean }).isPreview ? 'font-semibold' : 'font-normal'}`}>
              {stage.name || stage.label}{(stage as Stage & { isPreview?: boolean }).isPreview ? ' (will be added here)' : ''}
            </span>
          </div>
        ))}
      </div>
    );
  };
  const handleStageUpdate = useCallback(async (): Promise<void> => {
    if (USE_REDUX_PIPELINE) {
      // Use Redux to force refresh stages data from API
      dispatch(refreshPipelineDataAction());
    } else {
      // Fallback to local reload
      loadStagesAndLeads();
    }
  }, [USE_REDUX_PIPELINE, dispatch]);
  const handleStageDelete = useCallback(async (): Promise<void> => {
    if (USE_REDUX_PIPELINE) {
      // Use Redux to force refresh stages data from API
      dispatch(refreshPipelineDataAction());
    } else {
      // Fallback to local reload
      loadStagesAndLeads();
    }
  }, [USE_REDUX_PIPELINE, dispatch]);
  const handleCreateStage = useCallback(async (stageData: StageDataForCreate): Promise<void> => {
    try {
      console.debug('[PipelineBoard] Creating stage:', stageData);
      if (USE_REDUX_ACTIONS) {
        // Use Redux action for creating stage
        await dispatch(createStageAction({
          ...stageData,
          positionStageId: stageData.positionStageId || undefined
        }));
      } else {
        // Fallback to direct API call
        await addStage(stageData.name, stageData.positionStageId, stageData.positionType);
        loadStagesAndLeads();
      }
    } catch (error) {
      console.error('[PipelineBoard] Failed to create stage:', error);
      throw error;
    }
  }, [USE_REDUX_ACTIONS, dispatch, currentStages]);
  const handleUpdateStage = useCallback(async (stageKey: string, updates: StageUpdateData): Promise<void> => {
    try {
      if (USE_REDUX_ACTIONS) {
        // Use Redux action for updating stage
        await dispatch(updateStageAction(stageKey, updates));
      } else {
        // Fallback to direct API call
        await updateStage(stageKey, updates);
        loadStagesAndLeads();
      }
    } catch (error) {
      console.error('[PipelineBoard] Failed to update stage:', error);
      throw error;
    }
  }, [USE_REDUX_ACTIONS, dispatch]);
  const handleDeleteStage = useCallback(async (stageKey: string): Promise<void> => {
    try {
      // Wait for any pending lead move operations to complete
      if (pendingOperations.size > 0) {
        // Wait up to 5 seconds for pending operations to complete
        let waitTime = 0;
        const maxWaitTime = 5000;
        const checkInterval = 100;
        while (pendingOperations.size > 0 && waitTime < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          waitTime += checkInterval;
        }
        if (pendingOperations.size > 0) {
          console.warn('[PipelineBoard] Timeout waiting for pending operations, proceeding with deletion...');
        } else {
          }
      }
      // Get the most current leads data directly from the Redux store
      // This bypasses any selector caching issues
      const state = store.getState() as { leads?: { leads?: Lead[]; lastUpdated?: number } };
      const currentLeads = state.leads?.leads || [];
      const rawLeadsInStage = currentLeads.filter(lead => lead.stage === stageKey);
      logger.debug('[PipelineBoard] Stage leads count debug:', {
        stageKey,
        rawLeadsInStage: rawLeadsInStage.length,
        allLeadsCount: currentLeads.length,
        timestamp: Date.now(),
        storeTimestamp: state.leads?.lastUpdated || 'unknown',
        pendingOperations: pendingOperations.size
      });
      // Use the raw leads count as the authoritative source
      const actualLeadsCount = rawLeadsInStage.length;
      if (actualLeadsCount > 0) {
        // Show snackbar notification that stage has cards
        dispatch(showSnackbar({
          message: `Cannot delete stage. It contains ${actualLeadsCount} card${actualLeadsCount > 1 ? 's' : ''}. Please move or delete the cards first.`,
          severity: 'warning'
        }));
        return; // Don't proceed with deletion
      }
      // Add a small delay to ensure backend has processed all lead moves
      await new Promise(resolve => setTimeout(resolve, 500));
      if (USE_REDUX_ACTIONS) {
        // Use Redux action for deleting stage
        await dispatch(deleteStageAction(stageKey));
        // Show success message
        dispatch(showSnackbar({
          message: 'Stage deleted successfully',
          severity: 'success'
        }));
        // Force refresh of pipeline data to ensure UI consistency
        if (USE_REDUX_PIPELINE) {
          dispatch(loadPipelineDataAction());
        }
      } else {
        // Fallback to direct API call
        await deleteStage(stageKey);
        // Show success message
        dispatch(showSnackbar({
          message: 'Stage deleted successfully',
          severity: 'success'
        }));
        loadStagesAndLeads();
      }
    } catch (error) {
      console.error('[PipelineBoard] Failed to delete stage:', error);
      // Enhanced error handling for backend sync issues
      const errorObj = error as { response?: { status?: number; data?: { error?: string; leadsCount?: number } }; message?: string };
      if (errorObj.response?.status === 400 && errorObj.response?.data?.error?.includes('existing leads')) {
        const leadsCount = errorObj.response?.data?.leadsCount || 'unknown';
        dispatch(showSnackbar({
          message: `Cannot delete stage: Backend reports ${leadsCount} lead(s) still in this stage. This may be a synchronization issue. Please refresh the page and try again.`,
          severity: 'error'
        }));
      } else {
        // Show generic error message
        dispatch(showSnackbar({
          message: `Failed to delete stage: ${errorObj.message || 'Unknown error'}`,
          severity: 'error'
        }));
      }
      throw error;
    }
  }, [USE_REDUX_ACTIONS, USE_REDUX_PIPELINE, dispatch, pendingOperations]);
  const handleStatusChange = useCallback(async (leadId: string | number, newStatus: string): Promise<void> => {
    try {
      // Always use Redux action - it handles both API call AND state update
      await dispatch(updateLeadAction(leadId, { status: newStatus as 'Active' | 'Inactive' }));
      // Show success message
      dispatch(showSnackbar({
        message: 'Status updated successfully',
        severity: 'success'
      }));
    } catch (error) {
      console.error('[PipelineBoard] Failed to update lead status:', error);
      dispatch(showSnackbar({
        message: 'Failed to update lead status',
        severity: 'error'
      }));
    }
  }, [dispatch]);
  // Handler for inline stage editing
  const handleStageChangeInline = useCallback(async (leadId: string | number, newStageKey: string): Promise<void> => {
    try {
      if (USE_REDUX_ACTIONS) {
        await dispatch(moveLeadAction(leadId, newStageKey));
      } else {
        await updateLeadStage(leadId, newStageKey);
        loadStagesAndLeads();
      }
    } catch (err) {
      console.error('[PipelineBoard] Failed to update lead stage:', err);
      const errorMessage = (err as { message?: string }).message || 'Failed to update lead stage.';
      dispatch(showSnackbar({ message: errorMessage, severity: 'error' }));
    }
  }, [USE_REDUX_ACTIONS, dispatch]);
  // Handler for inline priority editing
  const handlePriorityChange = useCallback(async (leadId: string | number, newPriority: string): Promise<void> => {
    try {
      // Use Redux action for consistent state management
      await dispatch(updateLeadAction(leadId, { priority: newPriority }));
      // Show success message
      dispatch(showSnackbar({
        message: 'Priority updated successfully',
        severity: 'success'
      }));
    } catch (error) {
      console.error('[PipelineBoard] Failed to update lead priority:', error);
      dispatch(showSnackbar({
        message: 'Failed to update lead priority',
        severity: 'error'
      }));
    }
  }, [dispatch]);
  // Handler for inline assignee editing
  const handleAssigneeChange = useCallback(async (leadId: string | number, newAssignee: string): Promise<void> => {
    try {
      // Use Redux action for consistent state management
      await dispatch(updateLeadAction(leadId, { assignee: newAssignee }));
      // Show success message
      dispatch(showSnackbar({
        message: 'Assignee updated successfully',
        severity: 'success'
      }));
    } catch (error) {
      console.error('[PipelineBoard] Failed to update lead assignee:', error);
      dispatch(showSnackbar({
        message: 'Failed to update lead assignee',
        severity: 'error'
      }));
    }
  }, [dispatch]);
  const handleEditLead = useCallback((lead: Lead): void => {
    // Edit functionality removed as requested
    }, []);
  const handleSaveLead = useCallback(async (updatedLead: Lead): Promise<void> => {
    // Save functionality removed with edit functionality
    }, []);
  const handleDeleteLead = useCallback(async (leadId: string | number): Promise<void> => {
    try {
      // Always use Redux action for deleting lead
      await dispatch(deleteLeadAction(leadId));
      // Show success message
      dispatch(showSnackbar({
        message: 'Lead deleted successfully',
        severity: 'success'
      }));
    } catch (error) {
      console.error('[PipelineBoard] Failed to delete lead:', error);
      dispatch(showSnackbar({
        message: (error as { message?: string }).message || 'Failed to delete lead',
        severity: 'error'
      }));
    }
  }, [dispatch]);
  const handleZoomChange = useCallback((newZoom: number): void => {
    // Constrain zoom between 0.5 and 2.0
    const constrainedZoom = Math.max(0.5, Math.min(2.0, newZoom));
    dispatch(setPipelineZoom(constrainedZoom));
    // Auto-save zoom preference
    autoSavePipelinePreferences({
      viewMode: pipelineSettings.viewMode,
      visibleColumns: pipelineSettings.visibleColumns as unknown as Record<string, boolean>,
      filters: activeFilters as any,
      sortConfig: { field: 'createdAt', direction: 'desc' as const },
      uiSettings: {
        zoom: constrainedZoom,
        autoRefresh: pipelineSettings.autoRefresh,
        refreshInterval: pipelineSettings.refreshInterval,
        compactView: pipelineSettings.compactView,
        showCardCount: pipelineSettings.showCardCount,
        showStageValue: pipelineSettings.showStageValue,
        enableDragAndDrop: pipelineSettings.enableDragAndDrop
      }
    });
  }, [pipelineSettings, activeFilters, dispatch]);

  const handleViewModeChange = useCallback((mode: 'kanban' | 'list'): void => {
    dispatch(setPipelineSettings({ viewMode: mode }));
    autoSavePipelinePreferences({
      viewMode: mode,
      visibleColumns: pipelineSettings.visibleColumns as unknown as Record<string, boolean>,
      filters: activeFilters as any,
      sortConfig: { field: 'createdAt', direction: 'desc' as const },
      uiSettings: {
        zoom: zoom,
        autoRefresh: pipelineSettings.autoRefresh,
        refreshInterval: pipelineSettings.refreshInterval,
        compactView: pipelineSettings.compactView,
        showCardCount: pipelineSettings.showCardCount,
        showStageValue: pipelineSettings.showStageValue,
        enableDragAndDrop: pipelineSettings.enableDragAndDrop
      }
    });
  }, [pipelineSettings, activeFilters, dispatch, zoom]);
  // Toolbar dialog handlers
  const handleOpenFilter = useCallback((): void => {
    dispatch(setFilterDialogOpen(true));
  }, [dispatch]);
  const handleOpenSettings = useCallback((): void => {
    dispatch(setSettingsDialogOpen(true));
  }, [dispatch]);
  const handleSearchChange = useCallback((query: string): void => {
    dispatch(setPipelineSearchQuery(query));
    // Search is handled by Redux state, not persisted to preferences
  }, [dispatch]);
  // Handle pipeline settings changes
  const handleSettingsChange = useCallback(async (newSettings: typeof pipelineSettings): Promise<void> => {
    try {
      dispatch(setPipelineSettings(newSettings));
      // Save the complete preferences
      const preferences = {
        viewMode: newSettings.viewMode,
        visibleColumns: newSettings.visibleColumns as unknown as Record<string, boolean>,
        uiSettings: {
          zoom: zoom,
          autoRefresh: newSettings.autoRefresh,
          refreshInterval: newSettings.refreshInterval,
          compactView: newSettings.compactView,
          showCardCount: newSettings.showCardCount,
          showStageValue: newSettings.showStageValue,
          enableDragAndDrop: newSettings.enableDragAndDrop
        },
        filters: {
          stages: activeFilters.stages || [],
          statuses: activeFilters.statuses || [],
          priorities: activeFilters.priorities || [],
          sources: activeFilters.sources || [],
          assignees: activeFilters.assignees || [],
          dateRange: (activeFilters as { dateRange?: { start: string | null; end: string | null } }).dateRange || { start: null, end: null }
        },
        sortConfig: { field: 'createdAt', direction: 'desc' as const }
      };
      await savePipelinePreferences({
        viewMode: preferences.viewMode,
        visibleColumns: preferences.visibleColumns as unknown as Record<string, boolean>,
        filters: {
          statuses: preferences.filters.statuses,
          priorities: preferences.filters.priorities,
          sources: preferences.filters.sources,
          assignees: preferences.filters.assignees,
          dateRange: (preferences.filters.dateRange as { start: string | null; end: string | null }) || { start: null, end: null }
        },
        sortConfig: { field: 'createdAt', direction: 'desc' as const },
        uiSettings: preferences.uiSettings
      });
      // Show success message
      dispatch(showSnackbar({
        message: 'Pipeline settings saved successfully',
        severity: 'success'
      }));
    } catch (error) {
      console.error('Failed to save pipeline settings:', error);
      dispatch(showSnackbar({
        message: 'Failed to save pipeline settings',
        severity: 'error'
      }));
    }
  }, [zoom, activeFilters, dispatch]);
  // Memoized handlers object to prevent prop changes - defined after all handlers
  const memoizedHandlers = useMemo(() => ({
    onStageUpdate: handleStageUpdate,
    onStageDelete: handleStageDelete,
    onEdit: handleEditLead,
    onDelete: handleDeleteLead,
    onStatusChange: handleStatusChange,
    onStageChange: handleStageChangeInline,
    onPriorityChange: handlePriorityChange,
    onAssigneeChange: handleAssigneeChange,
    onCreateStage: handleCreateStage,
    onUpdateStage: handleUpdateStage,
    onDeleteStageAction: handleDeleteStage
  } as Record<string, unknown>), [handleStageUpdate, handleStageDelete, handleEditLead, handleDeleteLead, handleStatusChange, handleStageChangeInline, handlePriorityChange, handleAssigneeChange, handleCreateStage, handleUpdateStage, handleDeleteStage]);
  // Calculate responsive sizes based on zoom
  const getZoomedSize = (baseSize: number): number => {
    return Math.round(baseSize * zoom);
  };
  const getZoomedSpacing = (baseSpacing: number): number => {
    return Math.round(baseSpacing * zoom);
  };
  if (currentError) {
    return (
      <div className="flex flex-col justify-center items-center mt-32">
        <div className="rounded-lg shadow-sm bg-red-50 border border-red-200 p-4 mb-4">
          <p className="text-red-800">{currentError}</p>
        </div>
        <Button 
          variant="outline" 
          onClick={loadStagesAndLeads}
          className="rounded-lg"
        >
          Retry Loading
        </Button>
      </div>
    );
  }
  return (
    <div 
      className={
        pipelineSettings.viewMode === 'kanban'
          ? 'w-full flex flex-col bg-[#f8f9fe] p-1 border border-gray-200 rounded-lg'
          : 'w-full flex flex-col'
      }
      style={{ height: `calc(93vh - ${HEADER_HEIGHT}px)` }}
    >
      {(() => {
        if (pipelineSettings.viewMode === 'kanban') {
          return (
            <>
              <PipelineBoardToolbar
                totalLeads={totalLeads}
                filteredLeadsCount={filteredLeadsCount}
                stagesCount={currentStages.length}
                labels={labels}
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                zoom={zoom}
                onZoomChange={handleZoomChange}
                viewMode={pipelineSettings.viewMode}
                onViewModeChange={handleViewModeChange}
                onAddStage={() => dispatch(setAddStageDialogOpen(true))}
                onAddLead={() => dispatch(setCreateLeadDialogOpen(true))}
                onOpenFilter={handleOpenFilter}
                onOpenSettings={handleOpenSettings}
                onExport={handleExportLeads}
                onExportWithDateRange={handleExportLeadsWithDateRange}
              />
              <div 
                ref={scrollContainerRef}
                className="pipeline-board-scrollable flex-1 relative bg-[#f8f9fe] overflow-x-scroll overflow-y-auto"
                style={{ height: 0 }} // Force flex item to respect container height
              >
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCorners}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
                >
                  <PipelineKanbanView
                    stages={normalizedStages as (Stage & { name?: string; label?: string; key?: string })[]}
                    leadsByStage={currentLeadsByStage}
                    activeCard={activeCard}
                    zoom={zoom}
                    teamMembers={[]}
                    handlers={memoizedHandlers}
                    enableDragAndDrop={pipelineSettings.enableDragAndDrop}
                    compactView={pipelineSettings.compactView}
                    showCardCount={pipelineSettings.showCardCount}
                    showTotalValue={pipelineSettings.showStageValue}
                  />
                  {reduxLeadsLoading && pagination.page > 1 && (
                    <div className="flex justify-center p-4 w-full sticky bottom-0 bg-white/10 backdrop-blur-sm">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  )}
                </DndContext>
              </div>
            </>
          );
        }
        
        // List view - separate without toolbar
        return (
          <div 
            ref={scrollContainerRef}
            className="pipeline-board-scrollable flex-1 relative overflow-visible"
            style={{ height: 0 }} // Force flex item to respect container height
          >
            {(() => {
              // Normalize leads to ensure compatibility with PipelineListView's Lead interface
              const normalizedLeads = sortedAndFilteredLeads.map(lead => ({
                ...lead,
                name: lead.name ?? undefined, // Convert null to undefined
                email: lead.email ?? undefined,
                company: lead.company ?? undefined,
                phone: lead.phone ?? undefined,
                status: lead.status ?? undefined,
                priority: lead.priority ?? undefined,
                source: lead.source ?? undefined,
                amount: lead.amount ?? undefined, // Convert null to undefined for amount
                assignee: typeof lead.assignee === 'number' ? String(lead.assignee) : (lead.assignee ?? undefined),
              }));
              return (
                <PipelineListView
                  leads={normalizedLeads}
                  stages={normalizedStages as (Stage & { name?: string; label?: string; key?: string })[]}
                  teamMembers={[]}
                  visibleColumns={pipelineSettings.visibleColumns as unknown as Record<string, boolean>}
                  totalLeadsCount={serverTotalLeadsCount}
                  isLoading={isLoading}
                  viewMode={viewMode}
                  onViewModeChange={handleViewModeChange}
                  onAddStage={() => dispatch(setAddStageDialogOpen(true))}
                  onAddLead={() => dispatch(setCreateLeadDialogOpen(true))}
                  onExport={handleExportLeads}
                  onExportWithDateRange={handleExportLeadsWithDateRange}
                  onStatusChange={memoizedHandlers.onStatusChange as ((leadId: string | number, status: string) => Promise<void>) | undefined}
                  onStageChange={memoizedHandlers.onStageChange as ((leadId: string | number, stage: string) => Promise<void>) | undefined}
                  onPriorityChange={memoizedHandlers.onPriorityChange as ((leadId: string | number, priority: string) => Promise<void>) | undefined}
                  onAssigneeChange={memoizedHandlers.onAssigneeChange as ((leadId: string | number, assignee: string) => Promise<void>) | undefined}
                />
              );
            })()}
          </div>
        );
      })()}
      <EnhancedAddStageDialog
        open={addDialogOpen}
        onClose={() => {
          if (!isSubmitting) {
            dispatch(setAddStageDialogOpen(false));
            dispatch(setAddStageError(''));
            dispatch(setNewStageName(''));
            dispatch(setPositionStageId(''));
            dispatch(setPositionType('after'));
          }
        }}
        onAdd={handleAddStage}
        stages={[...currentStages].map(s => ({ ...s, label: s.label || s.name || s.key })).sort((a, b) => (a.order || a.display_order || 0) - (b.order || b.display_order || 0)) as Stage[]}
        isSubmitting={isSubmitting}
        error={addStageError}
        newStageName={newStageName}
        setNewStageName={(name: string) => dispatch(setNewStageName(name))}
        positionStageId={positionStageId}
        setPositionStageId={(id: string) => dispatch(setPositionStageId(id))}
        positionType={positionType}
        setPositionType={(type: 'before' | 'after') => dispatch(setPositionType(type))}
        getPositionPreview={getPositionPreview}
      />
      {!isLoading && (
        <CreateCardDialog
          open={createCardDialogOpen}
          onClose={() => dispatch(setCreateLeadDialogOpen(false))}
          onCreate={async (leadData: Partial<Lead>) => {
            if (USE_REDUX_ACTIONS) {
              await dispatch(createLeadAction(leadData));
            } else {
              await createLead(leadData as Lead);
              loadStagesAndLeads();
            }
            dispatch(setCreateLeadDialogOpen(false));
          }}
          stages={normalizedStages as Stage[] || []}
          leads={USE_REDUX_PIPELINE ? Object.values(currentLeadsByStage).flatMap(stage => stage.leads) : []}
        />
      )}
      <PipelineFilterDialog
        open={filterDialogOpen}
        onClose={() => dispatch(setFilterDialogOpen(false))}
        filters={{
          stages: activeFilters.stages || [],
          statuses: activeFilters.statuses || [],
          priorities: activeFilters.priorities || [],
          sources: activeFilters.sources || [],
          assignees: activeFilters.assignees || [],
          dateRange: (activeFilters as { dateRange?: { start: string | null; end: string | null } }).dateRange || null
        }}
        onFiltersChange={handleFiltersChange}
        stages={normalizedStages as (Stage & { name?: string; label?: string; key?: string })[]}
        onClearFilters={() => {
          const clearedFilters = {
            stages: [],
            statuses: [],
            priorities: [],
            sources: [],
            assignees: [],
            dateRange: null
          };
          dispatch(setPipelineActiveFilters(clearedFilters));
          // Also call handler to save cleared state
          handleFiltersChange(clearedFilters);
        }}
      />
      <PipelineBoardSettings
        open={settingsDialogOpen}
        onClose={() => dispatch(setSettingsDialogOpen(false))}
        onSettingsChange={handleSettingsChange}
      />
      {/* Custom Export Date Range Dialog */}
      <Dialog open={customExportDialogOpen} onOpenChange={setCustomExportDialogOpen}>
        <DialogContent className="max-w-md mx-auto p-6 bg-[#f8fafc] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl">
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Select Date Range</DialogTitle>
          <div className="flex gap-4 mb-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          {(() => {
            const isValid = !customStartDate || !customEndDate || new Date(customEndDate) >= new Date(customStartDate);
            if (!isValid) {
              return (
                <div className="text-sm text-red-600 mb-4">
                  End date must be on or after start date
                </div>
              );
            }
            return null;
          })()}
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => setCustomExportDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCustomExport}
              disabled={
                !customStartDate ||
                !customEndDate ||
                new Date(customEndDate) < new Date(customStartDate)
              }
            >
              Export
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default PipelineBoard;
