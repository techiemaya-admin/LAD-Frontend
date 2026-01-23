import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Chip } from '@/components/ui/chip';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Edit, Trash2, User, Search, Filter, ArrowUpDown, Columns
} from 'lucide-react';
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
  setSelectedLead 
} from '@/store/slices/uiSlice';
const COLUMN_LABELS: Record<string, string> = {
  name: 'Lead Name',
  stage: 'Stage',
  status: 'Status',
  priority: 'Priority',
  amount: 'Amount',
  closeDate: 'Close Date',
  dueDate: 'Due Date',
  expectedCloseDate: 'Expected Close Date',
  source: 'Source',
  assignee: 'Assignee',
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
  searchQuery?: string;
  selectedLead?: unknown;
  onEdit?: (lead: unknown) => void;
  onDelete?: (leadId: string | number) => void;
  onSearchChange?: (query: string) => void;
  onColumnVisibilityChange?: (columns: Record<string, boolean>) => void;
  onStatusChange?: (leadId: string | number, status: string) => Promise<void> | void;
  onStageChange?: (leadId: string | number, stage: string) => Promise<void> | void;
  onPriorityChange?: (leadId: string | number, priority: string) => Promise<void> | void;
  onAssigneeChange?: (leadId: string | number, assignee: string) => Promise<void> | void;
  teamMembers?: Array<{ id?: string; _id?: string; name?: string; email?: string }>;
  currentUser?: { role?: string; isAdmin?: boolean } | null;
  compactMode?: boolean;
  showCardCount?: boolean;
  showTotalValue?: boolean;
}
const PipelineListView: React.FC<PipelineListViewProps> = ({ 
  leads, 
  stages, 
  visibleColumns, 
  searchQuery, 
  selectedLead,
  onEdit, 
  onDelete, 
  onSearchChange,
  onColumnVisibilityChange,
  onStatusChange,
  onStageChange,
  onPriorityChange,
  onAssigneeChange,
  teamMembers = [],
  currentUser = null,
  compactMode = false,
  showCardCount = true,
  showTotalValue = true
}) => {
  // Redux dispatch
  const dispatch = useDispatch();
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
      if (statusOptions.length === 0) {
        try {
          const { fetchStatuses, fetchPriorities, fetchSources } = await import('@/services/pipelineService');
          const [statuses, priorities, sources] = await Promise.all([
            fetchStatuses().catch(err => { 
              console.warn('Failed to load statuses:', err); 
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
              console.warn('Failed to load priorities:', err); 
              // Fallback to static priorities
              return [
                { key: 'low', label: 'Low' },
                { key: 'medium', label: 'Medium' },
                { key: 'high', label: 'High' },
                { key: 'urgent', label: 'Urgent' }
              ];
            }),
            fetchSources().catch(err => { 
              console.warn('Failed to load sources:', err); 
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
          console.error('[PipelineListView] Failed to load master data:', err);
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
  // Group leads by stage
  const leadsByStage = useMemo(() => {
    const grouped: Record<string, Lead[]> = {};
    // Initialize all stages
    stages.forEach(stage => {
      grouped[stage.key] = [];
    });
    // Group leads by stage
    allLeads.forEach(lead => {
      const stageKey = lead.stage || 'unknown';
      if (!grouped[stageKey]) {
        grouped[stageKey] = [];
      }
      grouped[stageKey].push(lead);
    });
    return grouped;
  }, [allLeads, stages]);
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
  const visibleColumnKeys = Object.keys(visibleColumns).filter(key => visibleColumns[key]);
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
  const handleSort = (field: string) => {
    const isAsc = globalSortConfig && globalSortConfig.field === field && globalSortConfig.direction === 'asc';
    dispatch(setPipelineSortConfig({
      field,
      direction: isAsc ? 'desc' : 'asc'
    }));
  };
  const handleSearchSubmit = () => {
    onSearchChange?.(localSearch);
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
    onColumnVisibilityChange?.({
      ...visibleColumns,
      [column]: !visibleColumns[column]
    });
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
  // Check if current user is admin (you can adjust this logic based on your user roles)
  const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin;
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
          <div className="flex items-center gap-2 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {lead.name || 'Unnamed Lead'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {lead.email || lead.company || ''}
              </p>
            </div>
          </div>
        );
      case 'stage':
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={lead.stage || ''}
              onValueChange={(newValue) => {
                handleDropdownChange('stage', newValue);
              }}
            >
              <SelectTrigger className="min-w-[120px]">
                <SelectValue placeholder="Select stage..." />
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
          console.warn(`[PipelineListView] Invalid status value "${lead.status}" for lead ${lead.id}. Available options:`, effectiveStatusOptions.map(s => s.key));
        }
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={validStatusValue}
              onValueChange={(newValue) => {
                handleDropdownChange('status', newValue);
              }}
            >
              <SelectTrigger className="min-w-[120px]">
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
          console.warn(`[PipelineListView] Invalid priority value "${lead.priority}" for lead ${lead.id}. Available options:`, effectivePriorityOptions.map(p => p.key));
        }
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={validPriorityValue}
              onValueChange={(newValue) => {
                handleDropdownChange('priority', newValue);
              }}
            >
              <SelectTrigger className="min-w-[120px]">
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
      case 'amount':
        return (
          <p className="text-sm font-medium">
            {formatCurrency(lead.amount)}
          </p>
        );
      case 'closeDate':
        return (
          <p className="text-sm">
            {formatDate(getFieldValue(lead, 'closeDate'))}
          </p>
        );
      case 'dueDate':
        return (
          <p className="text-sm">
            {formatDate(getFieldValue(lead, 'dueDate'))}
          </p>
        );
      case 'expectedCloseDate':
        return (
          <p className="text-sm">
            {formatDate(getFieldValue(lead, 'expectedCloseDate'))}
          </p>
        );
      case 'source':
        return (
          <Badge className="text-xs">
            {lead.source || 'Unknown'}
          </Badge>
        );
      case 'assignee':
        // Only show dropdown for admin users, otherwise show read-only display
        if (isAdmin) {
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <Select
                value={getAssigneeValue(lead.assignee) || ''}
                onValueChange={(newValue) => {
                  handleDropdownChange('assignee', newValue);
                }}
              >
                <SelectTrigger className="min-w-[150px]">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id || member.name} value={member.id || member._id || ''}>
                      {member.name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }
        // Non-admin users see read-only display
        const assigneeDisplayName = getAssigneeDisplayName(lead.assignee);
        return assigneeDisplayName ? (
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm truncate">{assigneeDisplayName}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Unassigned
          </p>
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
            {formatDate(getFieldValue(lead, 'lastActivity'))}
          </p>
        );
      default:
        return <p className="text-sm">-</p>;
    }
  };
  return (
    <div className="w-full h-full overflow-hidden flex flex-col">
      <div className="flex-1 rounded-lg shadow-sm border border-gray-200 bg-white w-full max-w-full overflow-x-auto overflow-y-auto min-w-0">
        <div className="min-w-full" style={{ minWidth: `${columnWidths.minWidth}px` }}>
          <table className={`w-full ${compactMode ? 'text-sm' : ''}`}>
            <thead>
              <tr className="bg-gray-50">
                {visibleColumnKeys.map((column) => (
                  <th 
                    key={column}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap"
                    style={{
                      minWidth: column === 'name' ? columnWidths.firstColumnMinWidth : columnWidths.cellMinWidth,
                      maxWidth: column === 'name' ? columnWidths.firstColumnMaxWidth : columnWidths.cellMaxWidth
                    }}
                  >
                    <button
                      onClick={() => handleSort(column)}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      {COLUMN_LABELS[column] || column}
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stages.map(stage => {
                const stageLeads = leadsByStage[stage.key] || [];
                const filteredStageLeads = filteredAndSortedLeads.filter(lead => lead.stage === stage.key);
                if (filteredStageLeads.length === 0) return null;
                const totalValue = filteredStageLeads.reduce((sum, lead) => {
                  const amount = typeof lead.amount === 'number' ? lead.amount : parseFloat(lead.amount as string || '0');
                  return sum + amount;
                }, 0);
                return (
                  <React.Fragment key={stage.key}>
                    {/* Stage Header Row */}
                    <tr className="bg-blue-50">
                      <td 
                        colSpan={visibleColumnKeys.length}
                        className="px-4 py-2 border-b border-gray-200"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-800">
                            {stage.label || stage.name || stage.key}
                          </span>
                          {showCardCount && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                              {filteredStageLeads.length}
                            </Badge>
                          )}
                          {showTotalValue && totalValue > 0 && (
                            <span className="text-xs text-gray-600 ml-2">
                              {formatCurrency(totalValue)}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Stage Leads */}
                    {filteredStageLeads.map((lead) => (
                      <tr 
                        key={lead.id}
                        onClick={(e) => {
                          // Don't open details dialog if clicking on interactive elements
                          if ((e.target as HTMLElement).closest('select, button, input')) {
                            e.stopPropagation();
                            return;
                          }
                          handleRowClick(lead);
                        }}
                        className="hover:bg-gray-50 cursor-pointer border-b border-gray-100 h-16"
                      >
                        {visibleColumnKeys.map((column) => (
                          <td 
                            key={column} 
                            className={`px-4 py-3 border-b border-gray-100 align-middle ${
                              column === 'name' || column === 'assignee' 
                                ? 'whitespace-nowrap' 
                                : 'whitespace-nowrap overflow-hidden text-ellipsis'
                            }`}
                            style={{
                              minWidth: column === 'name' ? columnWidths.firstColumnMinWidth : columnWidths.cellMinWidth,
                              maxWidth: column === 'name' ? columnWidths.firstColumnMaxWidth : columnWidths.cellMaxWidth
                            }}
                            title={column === 'name' ? `${lead.name || 'Unnamed Lead'} (${lead.email || lead.company || ''})` : undefined}
                          >
                            {renderCellContent(lead, column)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
              {filteredAndSortedLeads.length === 0 && (
                <tr>
                  <td 
                    colSpan={visibleColumnKeys.length} 
                    className="py-8 text-center text-gray-500"
                  >
                    No leads found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Lead Details Dialog */}
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