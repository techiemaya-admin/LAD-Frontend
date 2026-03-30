import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Chip } from '@/components/ui/chip';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Edit,
  Trash2,
  User,
  Search,
  Filter,
  ArrowUpDown,
  Columns,
  Download,
  Settings,
  Plus,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Linkedin,
  Phone,
  LayoutGrid,
  List,
  Calendar,
  Copy,
  Globe,
  Target,
  UserPlus,
  Goal
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { useToast } from '@/components/ui/use-toast';
import { selectStatuses, selectPriorities } from '@/store/slices/masterDataSlice';
import PipelineLeadCard from './PipelineLeadCard';
import { getFieldValue } from '@/utils/fieldMappings';
import { formatDateTimeUnified } from '@/utils/dateTime';
import { getTagConfig, normalizeLeadCategory, type LeadTag } from '@/utils/leadCategorization';
import { useUpdateLeadTags } from '@lad/frontend-features/deals-pipeline';
// UI-compatible Lead interface for pipeline list view
interface Lead {
  id: string | number;
  name?: string;
  email?: string;
  company?: string;
  phone?: string;
  status?: string;
  priority?: string;
  stage?: string;
  amount?: number | string;
  assignee?: string;
  source?: string;
  tags?: string[]; // API returns this field
  lead_tags?: string[]; // Legacy field
  lead_category?: string; // Legacy field
  [key: string]: unknown;
}
import {
  selectPipelineSearchQuery,
  selectPipelineActiveFilters,
  selectPipelineSortConfig,
  selectSelectedLead,
  setPipelineSearchQuery,
  setPipelineActiveFilters,
  setPipelineSortConfig,
  setSelectedLead,
  setFilterDialogOpen,
  setSettingsDialogOpen,
  toggleColumnVisibility
} from '@/store/slices/uiSlice';
const COLUMN_LABELS: Record<string, string> = {
  serialNo: 'S.No',
  name: 'Lead Name',
  company: 'Company',
  email: 'Email',
  phone: 'Phone',
  stage: 'Stage',
  status: 'Status',
  tags: 'Tags',
  closeDate: 'Close Date',
  dueDate: 'Due Date',
  expectedCloseDate: 'Expected Close Date',
  source: 'Source',
  createdAt: 'Created Date',
  updatedAt: 'Updated Date',
  lastActivity: 'Last Activity'
};
const formatCurrency = (amount?: number | string): string => {
  if (!amount) return '-';
  const numAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : (amount || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(numAmount);
};
interface PipelineListViewProps {
  leads: Lead[];
  stages: Array<{ key: string; label: string; name?: string }>;
  visibleColumns: Record<string, boolean>;
  totalLeadsCount?: number;
  totalPages?: number;
  isLoading?: boolean;
  searchQuery?: string;
  selectedLead?: unknown;
  viewMode?: 'kanban' | 'list';
  onViewModeChange?: (mode: 'kanban' | 'list') => void;
  onEdit?: (lead: unknown) => void;
  onDelete?: (id: string) => void;
  onAddStage?: () => void;
  onAddLead?: () => void;
  onStatusChange?: (leadId: string | number, status: string) => Promise<void> | void;
  onStageChange?: (leadId: string | number, stage: string) => Promise<void> | void;
  onPriorityChange?: (leadId: string | number, priority: string) => Promise<void> | void;
  onTagChange?: (leadId: string | number, tag: string) => Promise<void> | void;
  onAssigneeChange?: (leadId: string | number, assignee: string) => Promise<void> | void;
  onExport?: () => void;
  onExportWithDateRange?: (range: 'today' | 'thisMonth' | 'thisYear' | 'custom', startDate?: string, endDate?: string) => void;
  teamMembers?: Array<{ id?: string; _id?: string; name?: string; email?: string }>;
  currentUser?: { role?: string; isAdmin?: boolean } | null;
  compactMode?: boolean;
  // Pagination props for API-driven pagination
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  labels?: {
    entity: string;
    entityPlural: string;
    pipeline: string;
    owner: string;
    deal: string;
    value: string;
  };
}
const PipelineListView: React.FC<PipelineListViewProps> = ({
  leads,
  stages,
  visibleColumns,
  totalLeadsCount,
  totalPages: controlledTotalPages,
  isLoading = false,
  searchQuery,
  selectedLead,
  viewMode = 'list',
  onViewModeChange,
  onEdit,
  onDelete,
  onAddStage,
  onAddLead,
  onStatusChange,
  onStageChange,
  onPriorityChange,
  onTagChange,
  onAssigneeChange,
  onExport,
  onExportWithDateRange,
  teamMembers = [],
  currentUser = null,
  compactMode = false,
  // Pagination props
  currentPage: controlledCurrentPage,
  pageSize: controlledPageSize,
  onPageChange,
  onPageSizeChange,
  labels
}) => {
  // Redux dispatch
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { toast } = useToast();
  const masterDataRequestedRef = useRef<boolean>(false);
  // SDK hooks for lead mutations
  const updateLeadTagsMutation = useUpdateLeadTags();
  // Get shared state from Redux
  const globalSearchQuery = useSelector(selectPipelineSearchQuery);
  const globalActiveFilters = useSelector(selectPipelineActiveFilters);
  const globalSortConfig = useSelector(selectPipelineSortConfig);
  const globalSelectedLead = useSelector(selectSelectedLead);
  // Use Redux state or fallback to props
  const currentSearchQuery = searchQuery !== undefined ? searchQuery : globalSearchQuery;
  const currentFilters = globalActiveFilters;
  // Local states that should remain local (component-specific UI states)
  const [localSearch, setLocalSearch] = useState(currentSearchQuery || '');
  const [searchAnchorEl, setSearchAnchorEl] = useState<HTMLElement | null>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [columnAnchorEl, setColumnAnchorEl] = useState<HTMLElement | null>(null);
  // Lead details dialog state (component-specific)
  const [detailsOpen, setDetailsOpen] = useState(false);
  // Optimistic tag updates - track pending tag changes per lead
  const [optimisticTags, setOptimisticTags] = useState<Record<string | number, string>>({});
  // Helper function to get assignee display name from UUID or return name if already a name
  const getAssigneeDisplayName = useCallback((assigneeValue?: string | null): string => {
    if (!assigneeValue) return '';
    // If it's already a name (doesn't look like UUID), return as is
    if (!assigneeValue.includes('-') && assigneeValue.length < 20) {
      return assigneeValue;
    }
    // Look up the member by ID/UUID
    const member = teamMembers.find(m => (m.id === assigneeValue || m._id === assigneeValue));
    return member ? (member.name || member.email || '') : assigneeValue;
  }, [teamMembers]);
  // Helper function to get assignee value for dropdown (always return UUID if possible)
  const getAssigneeValue = useCallback((assigneeValue?: string | null): string => {
    if (!assigneeValue) return '';
    // If it's already a UUID (contains dashes and is long), return as is
    if (assigneeValue.includes('-') && assigneeValue.length > 20) {
      return assigneeValue;
    }
    // Look up the member by name/email to get their UUID
    const member = teamMembers.find(m => (m.name === assigneeValue || m.email === assigneeValue));
    return member ? (member.id || member._id || '') : assigneeValue;
  }, [teamMembers]);
  // Get master data for inline editing
  const statusOptions = useSelector(selectStatuses);
  const priorityOptions = useSelector(selectPriorities);
  // Debug logging for dropdown data
  // Ensure we have at least some fallback data for dropdowns
  const effectiveStatusOptions = useMemo(() => {
    if (statusOptions.length > 0) return statusOptions;
    return [
      { key: 'active', label: 'Active' },
      { key: 'on_hold', label: 'On Hold' },
      { key: 'closed_won', label: 'Closed Won' },
      { key: 'closed_lost', label: 'Closed Lost' },
      { key: 'archived', label: 'Archived' },
      { key: 'inactive', label: 'Inactive' }
    ];
  }, [statusOptions]);
  const effectivePriorityOptions = useMemo(() => {
    if (priorityOptions.length > 0) return priorityOptions;
    return [
      { key: 'low', label: 'Low' },
      { key: 'medium', label: 'Medium' },
      { key: 'high', label: 'High' },
      { key: 'urgent', label: 'Urgent' }
    ];
  }, [priorityOptions]);
  // Load master data if not loaded (bootstrap fallback)
  useEffect(() => {
    const loadMasterData = async () => {
      if (statusOptions.length === 0 && !masterDataRequestedRef.current) {
        try {
          masterDataRequestedRef.current = true;
          const { fetchStatuses, fetchPriorities, fetchSources } = await import('@lad/frontend-features/deals-pipeline');
          const [statuses, priorities, sources] = await Promise.all([
            fetchStatuses().catch(err => {
              logger.warn('[PipelineListView] Failed to load statuses');
              // Fallback to static statuses matching our backend
              return [
                { key: 'active', label: 'Active' },
                { key: 'on_hold', label: 'On Hold' },
                { key: 'closed_won', label: 'Closed Won' },
                { key: 'closed_lost', label: 'Closed Lost' },
                { key: 'archived', label: 'Archived' },
                { key: 'inactive', label: 'Inactive' }
              ];
            }),
            fetchPriorities().catch(err => {
              logger.warn('[PipelineListView] Failed to load priorities');
              // Fallback to static priorities
              return [
                { key: 'low', label: 'Low' },
                { key: 'medium', label: 'Medium' },
                { key: 'high', label: 'High' },
                { key: 'urgent', label: 'Urgent' }
              ];
            }),
            fetchSources().catch(err => {
              logger.warn('[PipelineListView] Failed to load sources');
              return [
                { key: 'website', label: 'Website' },
                { key: 'linkedin', label: 'LinkedIn' },
                { key: 'referral', label: 'Referral' },
                { key: 'cold_email', label: 'Cold Email' }
              ];
            })
          ]);
          const { setStatuses, setPriorities, setSources } = await import('@/store/slices/masterDataSlice');
          dispatch(setStatuses(statuses));
          dispatch(setPriorities(priorities));
          dispatch(setSources(sources));
        } catch (err) {
          logger.error('[PipelineListView] Failed to load master data', err);
        } finally {
          masterDataRequestedRef.current = false;
        }
      }
    };
    loadMasterData();
  }, [effectiveStatusOptions.length, dispatch]);
  // Process leads with enhanced data
  const allLeads = useMemo(() => {
    return leads.map((lead: Lead) => {
      // Get proper labels from options
      const statusOption = effectiveStatusOptions.find(s => s.key === lead.status);
      const priorityOption = effectivePriorityOptions.find(p => p.key === lead.priority);
      const stage = stages.find(s => s.key === lead.stage);
      return {
        ...lead,
        stageName: stage?.label || stage?.name || 'Unknown',
        statusLabel: statusOption?.label || lead.status || 'Unknown',
        priorityLabel: priorityOption?.label || lead.priority || 'Unknown'
      };
    });
  }, [leads, effectiveStatusOptions, effectivePriorityOptions, stages]);

  const getSortableValue = useCallback((lead: Lead & Record<string, unknown>, field: string): string | number => {
    if (!field) return '';

    // Prefer sorting by the same values the UI displays.
    if (field === 'stage') return (lead.stageName as string) || '';
    if (field === 'status') return (lead.statusLabel as string) || '';
    if (field === 'priority') return (lead.priorityLabel as string) || '';
    if (field === 'assignee') return getAssigneeDisplayName(lead.assignee as string) || '';

    const rawValue = getFieldValue(lead, field) ?? (lead as any)[field];

    // Date-ish fields
    if (
      field === 'createdAt' ||
      field === 'updatedAt' ||
      field === 'closeDate' ||
      field === 'dueDate' ||
      field === 'expectedCloseDate' ||
      field === 'lastActivity'
    ) {
      // Handle snake_case fallback used in some payloads
      const altRawValue =
        field === 'lastActivity'
          ? (rawValue ?? getFieldValue(lead, 'updated_at'))
          : rawValue;

      if (altRawValue == null || altRawValue === '' || altRawValue === 'null' || altRawValue === 'undefined') return 0;

      const d = altRawValue instanceof Date
        ? altRawValue
        : typeof altRawValue === 'number'
          ? new Date(altRawValue < 10000000000 ? altRawValue * 1000 : altRawValue)
          : new Date(String(altRawValue));

      const ts = d.getTime();
      return Number.isFinite(ts) ? ts : 0;
    }

    // Numeric fields
    if (field === 'amount') {
      if (rawValue == null || rawValue === '') return 0;
      if (typeof rawValue === 'number') return Number.isFinite(rawValue) ? rawValue : 0;
      const parsed = parseFloat(String(rawValue).replace(/[^0-9.\-]/g, ''));
      return Number.isFinite(parsed) ? parsed : 0;
    }

    // Default to string compare
    return String(rawValue ?? '').toLowerCase();
  }, [getAssigneeDisplayName]);
  // Filter and sort leads
  const filteredAndSortedLeads = useMemo(() => {
    let filtered = [...allLeads];
    // Apply search filter
    if (localSearch) {
      const searchLower = localSearch.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.name?.toLowerCase().includes(searchLower) ||
        lead.email?.toLowerCase().includes(searchLower) ||
        lead.company?.toLowerCase().includes(searchLower) ||
        lead.phone?.includes(searchLower)
      );
    }
    // Apply column filters
    if (currentFilters.statuses?.length > 0) {
      filtered = filtered.filter(lead => lead.status && currentFilters.statuses.includes(lead.status));
    }
    if (currentFilters.priorities?.length > 0) {
      filtered = filtered.filter(lead => lead.priority && currentFilters.priorities.includes(lead.priority));
    }
    if (currentFilters.stages?.length > 0) {
      filtered = filtered.filter(lead => lead.stage && currentFilters.stages.includes(lead.stage));
    }
    // Apply sorting
    if (globalSortConfig && globalSortConfig.field) {
      filtered.sort((a, b) => {
        const field = globalSortConfig.field;
        const aVal = getSortableValue(a as any, field);
        const bVal = getSortableValue(b as any, field);

        if (aVal < bVal) return globalSortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return globalSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [allLeads, localSearch, currentFilters, globalSortConfig, getSortableValue]);
  const DEFAULT_COLUMN_ORDER = useMemo(
    () => [
      'serialNo',
      'name',
      'company',
      'email',
      'phone',
      'stage',
      'status',
      'tags',
      'source',
      'createdAt',
      'updatedAt',
      'lastActivity'
    ],
    []
  );
  const visibleColumnKeys = useMemo(() => {
    const ordered = DEFAULT_COLUMN_ORDER.filter(
      (key) => !['assignee', 'amount', 'AssignedTo', 'assignedTo', 'priority'].includes(key) && (key === 'serialNo' || visibleColumns[key] !== false)
    );
    const extras = Object.keys(visibleColumns).filter(
      (key) => !['assignee', 'amount', 'AssignedTo', 'assignedTo', 'priority'].includes(key) && visibleColumns[key] && !DEFAULT_COLUMN_ORDER.includes(key)
    );
    return [...ordered, ...extras];
  }, [DEFAULT_COLUMN_ORDER, visibleColumns]);
  // Calculate column widths based on mode
  const getColumnWidths = () => {
    if (compactMode) {
      return {
        minWidth: Math.max(600, visibleColumnKeys.length * 100),
        cellMinWidth: '80px',
        cellMaxWidth: '150px',
        firstColumnMinWidth: '150px',
        firstColumnMaxWidth: '220px'
      };
    }
    return {
      minWidth: Math.max(800, visibleColumnKeys.length * 150),
      cellMinWidth: '120px',
      cellMaxWidth: '250px',
      firstColumnMinWidth: '180px',
      firstColumnMaxWidth: '300px'
    };
  };
  const columnWidths = getColumnWidths();
  // Pagination state - use controlled props if provided, otherwise local state
  const isControlledPagination = controlledCurrentPage !== undefined && onPageChange !== undefined;
  const [localCurrentPage, setLocalCurrentPage] = useState<number>(1);
  const [localPageSize, setLocalPageSize] = useState<number>(20);

  const currentPage = isControlledPagination ? controlledCurrentPage : localCurrentPage;
  const pageSize = controlledPageSize !== undefined ? controlledPageSize : localPageSize;

  const displayTotalRecords = typeof totalLeadsCount === 'number' && totalLeadsCount >= 0
    ? totalLeadsCount
    : filteredAndSortedLeads.length;
  const totalPages = controlledTotalPages !== undefined
    ? Math.max(1, controlledTotalPages)
    : Math.max(1, Math.ceil(displayTotalRecords / pageSize));
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  const handlePageChange = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    if (isControlledPagination) {
      onPageChange?.(nextPage);
    } else {
      setLocalCurrentPage(nextPage);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    if (onPageSizeChange) {
      onPageSizeChange(newSize);
    } else {
      setLocalPageSize(newSize);
      setLocalCurrentPage(1); // Reset to page 1 when size changes
    }
  };
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedLeads.slice(startIndex, endIndex);
  }, [filteredAndSortedLeads, currentPage, pageSize]);
  const handleSort = (field: string) => {
    const isAsc = globalSortConfig && globalSortConfig.field === field && globalSortConfig.direction === 'asc';
    dispatch(setPipelineSortConfig({
      field,
      direction: isAsc ? 'desc' : 'asc'
    }));
  };
  const handleSearchSubmit = () => {
    setSearchAnchorEl(null);
  };
  const handleFilterChange = (type: string, value: string) => {
    const currentFiltersOfType = (currentFilters[type as keyof typeof currentFilters] as string[]) || [];
    const newFilters = {
      ...currentFilters,
      [type]: currentFiltersOfType.includes(value)
        ? currentFiltersOfType.filter(v => v !== value)
        : [...currentFiltersOfType, value]
    };
    dispatch(setPipelineActiveFilters(newFilters));
  };
  const handleColumnToggle = (column: string) => {
    dispatch(toggleColumnVisibility(column as any));
  };
  // Lead details dialog handlers
  const handleRowClick = (lead: Lead) => {
    dispatch(setSelectedLead(lead as any));
    setDetailsOpen(true);
  };
  const handleDetailsClose = () => {
    setDetailsOpen(false);
    dispatch(setSelectedLead(null));
  };
  const handleSearchChange = (value: string): void => {
    setLocalSearch(value);
    dispatch(setPipelineSearchQuery(value));
  };
  // Check if current user is admin (you can adjust this logic based on your user roles)
  const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin;
  const getSortIcon = (column: string): React.ReactNode => {
    if (!globalSortConfig || globalSortConfig.field !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground opacity-50" />;
    }
    return globalSortConfig.direction === 'asc'
      ? <ArrowUp className="h-3.5 w-3.5 text-primary" />
      : <ArrowDown className="h-3.5 w-3.5 text-primary" />;
  };
  const renderCellContent = (lead: Lead, column: string): React.ReactNode => {
    const handleDropdownChange = async (field: string, newValue: string) => {
      try {
        if (field === 'status' && onStatusChange) {
          await onStatusChange(lead.id, newValue);
        } else if (field === 'stage' && onStageChange) {
          await onStageChange(lead.id, newValue);
        } else if (field === 'priority' && onPriorityChange) {
          await onPriorityChange(lead.id, newValue);
        } else if (field === 'assignee' && onAssigneeChange) {
          await onAssigneeChange(lead.id, newValue);
        }
      } catch (error) {
        // Error handling without console logging per LAD guidelines
      }
    };
    switch (column) {
      case 'serialNo':
        return (
          <p className="text-sm font-medium text-[#64748B]">
            {(currentPage - 1) * pageSize + (paginatedLeads.findIndex(l => l.id === lead.id) + 1)}
          </p>
        );
      case 'name':
        return (
          <div className="flex items-center gap-1 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm max-w-[125px] truncate font-medium">
                {lead.name || 'Unnamed Lead'}
              </p>
            </div>
          </div>
        );
      case 'company': {
        // Extract company name from raw_data if company is null
        const rawData = lead.raw_data as Record<string, unknown> | undefined;
        const fullData = rawData?._full_data as Record<string, unknown> | undefined;
        const employeeData = rawData?.employee_data as Record<string, unknown> | undefined;
        const fullOrg = fullData?.organization as Record<string, string> | undefined;
        const empOrg = employeeData?.organization as Record<string, string> | undefined;
        const companyFromRaw = (rawData?.company_name as string) ||
          (fullData?.company_name as string) ||
          fullOrg?.name ||
          empOrg?.name;
        const displayCompany = lead.company || companyFromRaw || '-';
        return (
          <p className="text-sm max-w-[150px] truncate" title={String(displayCompany)}>
            {displayCompany}
          </p>
        );
      }
      case 'email':
        const handleCopyEmail = async () => {
          if (lead.email) {
            await navigator.clipboard.writeText(lead.email);
            toast({
              title: 'Copied!',
              description: 'Email copied to clipboard',
            });
          }
        };
        return (
          <div className="group flex items-center gap-2">
            <p className="text-sm max-w-[125px] truncate" title={lead.email || ''}>
              {lead.email || '-'}
            </p>
            {lead.email && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyEmail();
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded"
                title="Copy email"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      case 'phone':
        const handleCopyPhone = async () => {
          if (lead.phone) {
            await navigator.clipboard.writeText(lead.phone);
            toast({
              title: 'Copied!',
              description: 'Phone number copied to clipboard',
            });
          }
        };
        return (
          <div className="group flex items-center gap-2">
            <p className="text-sm max-w-[100px] truncate">
              {lead.phone || '-'}
            </p>
            {lead.phone && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyPhone();
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
                title="Copy phone"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      case 'stage':
        // Validate that the lead's stage exists in available stages
        const validStageValue = stages.find(stage => stage.key === lead.stage) ? lead.stage : '';
        // Log warning for invalid stage values
        if (lead.stage && !validStageValue) {
          logger.warn(`[PipelineListView] Invalid stage value "${lead.stage}" for lead ${lead.id}.`);
        }
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={validStageValue}
              onValueChange={(newValue) => {
                handleDropdownChange('stage', newValue);
              }}
            >
              <SelectTrigger className="min-w-[100px] h-8 text-xs">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.key} value={stage.key}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 'status':
        // Validate that the lead's status exists in available options
        const validStatusValue = effectiveStatusOptions.find(option => option.key === lead.status) ? lead.status : '';
        // Log warning for invalid status values
        if (lead.status && !validStatusValue) {
          logger.warn(`[PipelineListView] Invalid status value "${lead.status}" for lead ${lead.id}.`);
        }
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={validStatusValue}
              onValueChange={(newValue) => {
                handleDropdownChange('status', newValue);
              }}
            >
              <SelectTrigger className="min-w-[120px] h-9">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                {effectiveStatusOptions.map((status) => (
                  <SelectItem key={status.key} value={status.key}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 'tags': {
        // Check for optimistic tag update first
        const optimisticTag = optimisticTags[lead.id];
        // Use API tags field, fallback to legacy lead_tags / lead_category
        const apiTags = lead.tags || [];
        const rawTags = apiTags.length > 0 ? apiTags : lead.lead_tags;
        const primaryTag = optimisticTag || (Array.isArray(rawTags) && rawTags.length > 0 ? String(rawTags[0]) : '');
        const normalizedPrimary = primaryTag.toLowerCase();
        let derivedTag: LeadTag = 'unknown';
        if (normalizedPrimary.includes('hot')) derivedTag = 'hot';
        else if (normalizedPrimary.includes('warm')) derivedTag = 'warm';
        else if (normalizedPrimary.includes('cold')) derivedTag = 'cold';
        else if (lead.lead_category) {
          const normalized = normalizeLeadCategory(lead.lead_category as string);
          if (normalized) derivedTag = normalized;
        }
        const tagConfig = getTagConfig(derivedTag);
        const toBackendTagLabel = (t: LeadTag): string | null => {
          if (t === 'hot') return 'Hot Lead';
          if (t === 'warm') return 'Warm Lead';
          if (t === 'cold') return 'Cold Lead';
          return null;
        };
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={derivedTag}
              onValueChange={async (newTag) => {
                const backendLabel = toBackendTagLabel(newTag as LeadTag);
                if (!backendLabel) return;
                
                // Optimistically update UI immediately
                setOptimisticTags(prev => ({ ...prev, [lead.id]: backendLabel }));
                
                // Call the SDK mutation to update tags
                try {
                  await updateLeadTagsMutation.mutateAsync({
                    leadId: lead.id,
                    tags: [backendLabel]
                  });
                  
                  // Notify parent component
                  if (onTagChange) {
                    onTagChange(lead.id, backendLabel);
                  }
                } catch (error) {
                  // Revert optimistic update on error
                  setOptimisticTags(prev => {
                    const next = { ...prev };
                    delete next[lead.id];
                    return next;
                  });
                  logger.error('[PipelineListView] Failed to update lead tags:', error);
                  toast({
                    title: 'Error',
                    description: 'Failed to update lead tag. Please try again.',
                    variant: 'destructive'
                  });
                }
              }}
            >
              <SelectTrigger className={`w-24 h-7 text-xs ${tagConfig.bgColor} ${tagConfig.textColor} border ${tagConfig.borderColor} focus:ring-0`}>
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hot" className="text-red-600">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Hot
                  </span>
                </SelectItem>
                <SelectItem value="warm" className="text-amber-600">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Warm
                  </span>
                </SelectItem>
                <SelectItem value="cold" className="text-blue-600">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Cold
                  </span>
                </SelectItem>
                <SelectItem value="unknown" className="text-gray-600">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    Unknown
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      }
      case 'source':
        const sourceValue = (lead.source || 'unknown').toLowerCase();
        const getSourceStyles = (source: string) => {
          switch (source) {
            case 'voice_agent':
              return 'bg-primary/20 text-primary border border-primary/30';
            case 'apollo':
            case 'apollo_io':
              return 'bg-green-100 text-green-600 border border-green-300';
            case 'website':
              return 'bg-purple-100 text-purple-600 border border-purple-300';
            case 'linkedin':
              return 'bg-blue-100 text-blue-600 border border-blue-300';
            default:
              return 'bg-gray-100 text-gray-600 border border-gray-300';
          }
        };
        const formatSourceName = (source: string) => {
          switch (source.toLowerCase()) {
            case 'apollo_io':
              return 'Apollo.io';
            case 'voice_agent':
              return 'Voice-Agent';
            case 'linkedin':
              return 'LinkedIn';
            default:
              return source || 'Unknown';
          }
        };
        const getSourceIcon = (source: string) => {
          switch (source.toLowerCase()) {
            case 'linkedin':
              return <Linkedin className="w-4 h-4" />;
            case 'voice_agent':
              return <Phone className="w-4 h-4" />;
            case 'website':
              return <Globe className="w-4 h-4" />;
            default:
              return <span className="w-2 h-2 rounded-full bg-current animate-pulse opacity-70" />;
          }
        };
        const sourceName = formatSourceName(lead.source || '');
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold ${getSourceStyles(sourceValue)}`}>
                  {getSourceIcon(sourceValue)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{sourceName}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'createdAt':
        return (
          <p className="text-sm">
            {formatDateTimeUnified(getFieldValue(lead, 'createdAt'))}
          </p>
        );
      case 'updatedAt':
        return (
          <p className="text-sm">
            {formatDateTimeUnified(getFieldValue(lead, 'updatedAt'))}
          </p>
        );
      case 'lastActivity':
        return (
          <p className="text-sm">
            {formatDateTimeUnified(getFieldValue(lead, 'lastActivity') || getFieldValue(lead, 'updated_at'))}
          </p>
        );
      default:
        return <p className="text-sm">-</p>;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm overflow-hidden">
      {/* Header with Search and Controls */}
      <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
          
          {/* Row 1: View mode toggle */}
          <div className="w-full lg:w-auto flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 shrink-0">
            <button
              type="button"
              onClick={() => onViewModeChange?.('kanban')}
              className={`h-8 flex-1 lg:flex-none px-3 rounded-lg text-xs font-medium flex items-center justify-center lg:justify-start gap-1.5 transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange?.('list')}
              className={`h-8 flex-1 lg:flex-none px-3 rounded-lg text-xs font-medium flex items-center justify-center lg:justify-start gap-1.5 transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <List className="h-4 w-4" />
              List
            </button>
          </div>

          {/* Row 2: Action buttons */}
          {process.env.NEXT_PUBLIC_SHOW_DEV_FEATURES === 'true' && (
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <Button
                className="flex-1 lg:flex-none bg-primary hover:bg-primary/80 text-white rounded-xl shadow-none h-9 text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddStage?.();
                }}
                disabled={!onAddStage}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Stage
              </Button>
              <Button
                className="flex-1 lg:flex-none bg-primary hover:bg-primary/80 text-white rounded-xl shadow-none h-9 text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddLead?.();
                }}
                disabled={!onAddLead}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Lead
              </Button>
            </div>
          )}

          {/* Row 3: Search box */}
          <div className="w-full lg:w-60 lg:ml-auto">
            <div className="relative bg-white dark:bg-gray-800 rounded-xl flex items-center px-4 border border-gray-300 dark:border-gray-600 h-10 w-full">
              <Search className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search leads..."
                className="border-0 outline-none bg-transparent w-full text-sm text-gray-800 dark:text-gray-200 focus:ring-0 focus:outline-none p-0 h-full placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Row 4: Control buttons (Filter, Export, Settings) */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <Button
              variant="outline"
              className="flex-1 lg:flex-none rounded-xl text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 h-9 text-sm"
              onClick={(e) => {
                e.stopPropagation();
                dispatch(setFilterDialogOpen(true));
              }}
            >
              <Filter className="h-4 w-4 mr-1.5" />
              Filter
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex-1 lg:flex-none rounded-xl text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 h-9 text-sm"
                  disabled={!onExport && !onExportWithDateRange}
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onExport?.()} disabled={!onExport}>
                  All Leads
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExportWithDateRange?.('today')} disabled={!onExportWithDateRange}>
                  Today
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExportWithDateRange?.('thisMonth')} disabled={!onExportWithDateRange}>
                  This Month
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExportWithDateRange?.('thisYear')} disabled={!onExportWithDateRange}>
                  This Year
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExportWithDateRange?.('custom')} disabled={!onExportWithDateRange}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Custom Range
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={(e) => {
                e.stopPropagation();
                dispatch(setSettingsDialogOpen(true));
              }}
              className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="w-full overflow-auto scrollbar-hide max-h-[calc(100vh-220px)] border-b border-[#E2E8F0]">
        <div className="min-w-[800px] w-full relative">
          <Table className={compactMode ? 'text-sm' : ''}>
            <TableHeader className="sticky top-0 z-20 bg-[#F8FAFC] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <TableRow className="border-b border-[#E2E8F0] hover:bg-transparent">
                {visibleColumnKeys.map((column) => (
                  <TableHead
                    key={column}
                    className={`font-semibold text-[#1E293B] whitespace-nowrap capitalize bg-[#F8FAFC] ${['name', 'company', 'stage', 'status', 'value', 'createdAt', 'updatedAt', 'assignee'].includes(column) ? 'cursor-pointer select-none' : ''
                      }`}
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex items-center gap-2">
                      {COLUMN_LABELS[column] || column}
                      {getSortIcon(column)}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, rowIndex) => (
                  <TableRow key={`skeleton-${rowIndex}`} className="animate-pulse">
                    {visibleColumnKeys.map((column) => (
                      <TableCell key={`${column}-skeleton-${rowIndex}`} className="py-2">
                        <div className="h-4 bg-gray-200 rounded w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
                : paginatedLeads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('select, button, input')) {
                        e.stopPropagation();
                        return;
                      }
                      handleRowClick(lead);
                    }}
                    className="cursor-pointer hover:bg-gray-50 border-b border-[#E2E8F0]"
                  >
                    {visibleColumnKeys.map((column) => (
                      <TableCell
                        key={column}
                        className="py-2 whitespace-nowrap px-3"
                      >
                        {renderCellContent(lead, column)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              {!isLoading && filteredAndSortedLeads.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnKeys.length}
                    className="text-center py-16"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <UserPlus className="w-8 h-8" />
                      <div className="text-lg font-semibold text-[#1E293B] mb-2">
                        No leads found
                      </div>
                      
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      {/* Pagination Controls */}
      {filteredAndSortedLeads.length > 0 && (
        <div className="flex items-center justify-between px-2 xs:px-4 py-3 gap-2 border-t border-[#E2E8F0] dark:bg-card">
          {/* Left Side: Records per page and total count info */}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-[#64748B]">
            <div className="flex items-center gap-2">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  handlePageSizeChange(Number(e.target.value));
                }}
                className="border border-[#E2E8F0] rounded px-2 py-1 text-xs sm:text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="whitespace-nowrap">of {displayTotalRecords} {labels?.entityPlural.toLowerCase()}</span>
            </div>
            {(currentSearchQuery || (currentFilters && Object.keys(currentFilters).length > 0)) && totalLeadsCount !== undefined && totalLeadsCount > 0 && (
              <span className="hidden md:inline text-xs text-muted-foreground">(filtered from {totalLeadsCount} total)</span>
            )}
          </div>

          {/* Right Side: Page navigation */}
          <div className="flex items-center gap-2">
            <div className="text-[10px] xs:text-xs sm:text-sm text-[#64748B] whitespace-nowrap">
              Page {currentPage} of {totalPages}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={!hasPreviousPage}
                className="h-8 w-8 p-0"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!hasPreviousPage}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!hasNextPage}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={!hasNextPage}
                className="h-8 w-8 p-0"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
      {globalSelectedLead && (
        <PipelineLeadCard
          lead={globalSelectedLead as any}
          teamMembers={teamMembers}
          hideCard={true}
          externalDetailsOpen={detailsOpen}
          onExternalDetailsClose={handleDetailsClose}
        />
      )}
    </div>
  );
};

export default PipelineListView;
