import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
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
  Copy
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { useToast } from '@/components/ui/use-toast';
import { selectStatuses, selectPriorities } from '@/store/slices/masterDataSlice';
import PipelineLeadCard from './PipelineLeadCard';
import { getFieldValue } from '@/utils/fieldMappings';
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
  name: 'Lead Name',
  email: 'Email',
  phone: 'Phone',
  stage: 'Stage',
  status: 'Status',
  priority: 'Priority',
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
const formatDate = (dateString?: string | Date | number | null): string => {
  if (!dateString) return '-';
  try {
    let date: Date;
    // If it's already a Date object
    if (dateString instanceof Date) {
      date = dateString;
    } else if (typeof dateString === 'string') {
      // Handle empty strings, 'null', 'undefined' strings
      if (dateString.trim() === '' || dateString === 'null' || dateString === 'undefined') {
        return '-';
      }
      date = new Date(dateString);
    } else if (typeof dateString === 'number') {
      // Handle Unix timestamps (both seconds and milliseconds)
      date = new Date(dateString < 10000000000 ? dateString * 1000 : dateString);
    } else {
      return '-';
    }
    // Check if the date is valid
    if (isNaN(date.getTime())) return 'Invalid date';
    // Check for unrealistic dates (before 1900 or too far in future)
    const year = date.getFullYear();
    if (year < 1900 || year > 2100) return 'Invalid date';
    return date.toLocaleDateString();
  } catch (error) {
    // Date formatting error - return invalid date message per LAD guidelines
    return 'Invalid date';
  }
};
interface PipelineListViewProps {
  leads: Lead[];
  stages: Array<{ key: string; label: string; name?: string }>;
  visibleColumns: Record<string, boolean>;
  totalLeadsCount?: number;
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
  onAssigneeChange?: (leadId: string | number, assignee: string) => Promise<void> | void;
  onExport?: () => void;
  onExportWithDateRange?: (range: 'today' | 'thisMonth' | 'thisYear' | 'custom', startDate?: string, endDate?: string) => void;
  teamMembers?: Array<{ id?: string; _id?: string; name?: string; email?: string }>;
  currentUser?: { role?: string; isAdmin?: boolean } | null;
  compactMode?: boolean;
}
const PipelineListView: React.FC<PipelineListViewProps> = ({ 
  leads, 
  stages, 
  visibleColumns, 
  totalLeadsCount,
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
  onAssigneeChange,
  onExport,
  onExportWithDateRange,
  teamMembers = [],
  currentUser = null,
  compactMode = false
}) => {
  // Redux dispatch
  const dispatch = useDispatch();
  const router = useRouter();
  const { toast } = useToast();
  const masterDataRequestedRef = useRef<boolean>(false);
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
        let aVal: any = (a as any)[globalSortConfig.field];
        let bVal: any = (b as any)[globalSortConfig.field];
        // Handle date fields
        if (globalSortConfig.field === 'createdAt' || globalSortConfig.field === 'updatedAt' || globalSortConfig.field === 'closeDate' || 
            globalSortConfig.field === 'dueDate' || globalSortConfig.field === 'expectedCloseDate' || globalSortConfig.field === 'lastActivity') {
          aVal = new Date((aVal as string) || 0);
          bVal = new Date((bVal as string) || 0);
        }
        // Handle numeric fields
        else if (globalSortConfig.field === 'amount') {
          aVal = parseFloat((aVal as string) || '0');
          bVal = parseFloat((bVal as string) || '0');
        }
        // Handle string fields
        else {
          aVal = ((aVal as string) || '').toString().toLowerCase();
          bVal = ((bVal as string) || '').toString().toLowerCase();
        }
        if (aVal < bVal) return globalSortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return globalSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [allLeads, localSearch, currentFilters, globalSortConfig]);
  const DEFAULT_COLUMN_ORDER = useMemo(
    () => [
      'name',
      'email',
      'phone',
      'stage',
      'status',
      'priority',
      'source',
      'createdAt',
      'updatedAt',
      'lastActivity'
    ],
    []
  );
  const visibleColumnKeys = useMemo(() => {
    const ordered = DEFAULT_COLUMN_ORDER.filter(
      (key) => !['assignee', 'amount', 'AssignedTo', 'assignedTo'].includes(key) && visibleColumns[key] !== false
    );
    const extras = Object.keys(visibleColumns).filter(
      (key) => !['assignee', 'amount', 'AssignedTo', 'assignedTo'].includes(key) && visibleColumns[key] && !DEFAULT_COLUMN_ORDER.includes(key)
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
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const displayTotalRecords = typeof totalLeadsCount === 'number' && totalLeadsCount >= 0
    ? totalLeadsCount
    : filteredAndSortedLeads.length;
  const totalPages = Math.max(1, Math.ceil(displayTotalRecords / pageSize));
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;
  const handlePageChange = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(nextPage);
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
      case 'name':
        return (
          <div className="flex items-center gap-1 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm max-w-[125px] truncate font-medium">
                {lead.name || 'Unnamed Lead'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {lead.company || ''}
              </p>
            </div>
          </div>
        );
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
      case 'priority':
        // Validate that the lead's priority exists in available options
        const validPriorityValue = effectivePriorityOptions.find(option => option.key === lead.priority) ? lead.priority : '';
        // Log warning for invalid priority values
        if (lead.priority && !validPriorityValue) {
          logger.warn(`[PipelineListView] Invalid priority value "${lead.priority}" for lead ${lead.id}.`);
        }
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={validPriorityValue}
              onValueChange={(newValue) => {
                handleDropdownChange('priority', newValue);
              }}
            >
              <SelectTrigger className="min-w-[120px] h-9">
                <SelectValue placeholder="Select Priority" />
              </SelectTrigger>
              <SelectContent>
                {effectivePriorityOptions.map((priority) => (
                  <SelectItem key={priority.key} value={priority.key}>
                    {priority.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
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
            {formatDate(getFieldValue(lead, 'createdAt'))}
          </p>
        );
      case 'updatedAt':
        return (
          <p className="text-sm">
            {formatDate(getFieldValue(lead, 'updatedAt'))}
          </p>
        );
      case 'lastActivity':
        return (
          <p className="text-sm">
            {formatDate(getFieldValue(lead, 'lastActivity') || getFieldValue(lead, 'updated_at'))}
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
        <div className="flex gap-3 flex-col sm:flex-row justify-between sm:items-center">
          <div className="flex items-center gap-2 justify-start">
            {/* View mode toggle */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
              <button
                type="button"
                onClick={() => onViewModeChange?.('kanban')}
                className={`h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange?.('list')}
                className={`h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <List className="h-4 w-4" />
                List
              </button>
            </div>
            
            <Button
              className="h-10"
              onClick={(e) => {
                e.stopPropagation();
                onAddStage?.();
              }}
              disabled={!onAddStage}
            >
              <Plus  />
              Add Stage
            </Button>
            <Button
              className="h-10"
              onClick={(e) => {
                e.stopPropagation();
                onAddLead?.();
              }}
              disabled={!onAddLead}
            >
              <Plus />
              Add Lead
            </Button>
          </div>
          <div className="flex gap-3 flex-col sm:flex-row justify-end items-center w-full sm:w-auto">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search leads..."
              className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive pl-10 h-10"
            />
          </div>
          <Button
            variant="outline"
            className="h-10"
            onClick={(e) => {
              e.stopPropagation();
              dispatch(setFilterDialogOpen(true));
            }}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10"
                disabled={!onExport && !onExportWithDateRange}
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onExport?.()}
                disabled={!onExport}
              >
                All Leads
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onExportWithDateRange?.('today')}
                disabled={!onExportWithDateRange}
              >
                Today
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onExportWithDateRange?.('thisMonth')}
                disabled={!onExportWithDateRange}
              >
                This Month
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onExportWithDateRange?.('thisYear')}
                disabled={!onExportWithDateRange}
              >
                This Year
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onExportWithDateRange?.('custom')}
                disabled={!onExportWithDateRange}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Custom Range
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10"
            onClick={(e) => {
              e.stopPropagation();
              dispatch(setSettingsDialogOpen(true));
            }}
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          </div>
        </div>
      </div>
      <Table className={compactMode ? 'text-sm' : ''}>
        <TableHeader>
          <TableRow className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
            {visibleColumnKeys.map((column) => (
              <TableHead
                key={column}
                className={`font-semibold text-[#1E293B] whitespace-nowrap capitalize ${
                  ['name', 'stage', 'status', 'priority', 'value', 'createdAt', 'updatedAt', 'assignee'].includes(column) ? 'cursor-pointer select-none' : ''
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
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#1E293B] mb-2">
                      Trigger a campaign
                    </h3>
                    <p className="text-sm text-[#64748B] mb-4">
                      Start a campaign to create leads and see them appear here
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push('/campaigns');
                    }}
                    className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg transition-all duration-300 font-medium shadow-md hover:shadow-lg hover:scale-105 flex items-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    Go to Campaigns
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {/* Pagination Controls */}
      {filteredAndSortedLeads.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0]">
          <div className="flex items-center gap-4 text-sm text-[#64748B]">
            <div className="flex items-center gap-2">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-[#E2E8F0] rounded px-2 py-1 text-sm"
              >
                {[5, 10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <span>
              {`${((currentPage - 1) * pageSize) + 1}-${Math.min(currentPage * pageSize, displayTotalRecords)} of ${displayTotalRecords}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-sm text-[#64748B]">
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
