import React, { useState, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Chip } from '@/components/ui/chip';
import { Avatar } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Edit, Trash2, User, Search, Filter, ArrowUpDown, Columns
} from 'lucide-react';
import { selectStatuses, selectPriorities } from '@/store/slices/masterDataSlice';
import PipelineLeadCard from './PipelineLeadCard';
import { getFieldValue } from '@/utils/fieldMappings';
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
    console.warn('Date formatting error:', { dateString, error: (error as Error).message });
    return 'Invalid date';
  }
};

interface PipelineListViewProps {
  leadsByStage: Record<string, { stage: unknown; leads: unknown[] }>;
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
}

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

const PipelineListView: React.FC<PipelineListViewProps> = ({ 
  leadsByStage, 
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
  compactMode = false
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

  // Debug log to understand master data structure
  console.log('[PipelineListView] Master data:', { statusOptions, priorityOptions });

  // Flatten all leads from all stages with enhanced data
  const allLeads = useMemo(() => {
    const leads = Object.values(leadsByStage).flatMap((stageData: { leads?: Lead[]; stage?: { label?: string; name?: string } }) => 
      (stageData.leads || []).map((lead: Lead) => {
        // Get proper labels from options
        const statusOption = statusOptions.find(s => s.key === lead.status);
        const priorityOption = priorityOptions.find(p => p.key === lead.priority);
        
        return {
          ...lead,
          stageName: stageData.stage?.label || stageData.stage?.name || 'Unknown',
          statusLabel: statusOption?.label || lead.status || 'Unknown',
          priorityLabel: priorityOption?.label || lead.priority || 'Unknown'
        };
      })
    );
    
    return leads;
  }, [leadsByStage, statusOptions, priorityOptions]);

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
      filtered = filtered.filter(lead => currentFilters.statuses.includes(lead.status));
    }
    if (currentFilters.priorities?.length > 0) {
      filtered = filtered.filter(lead => currentFilters.priorities.includes(lead.priority));
    }
    if (currentFilters.stages?.length > 0) {
      filtered = filtered.filter(lead => currentFilters.stages.includes(lead.stage));
    }

    // Apply sorting
    if (globalSortConfig && globalSortConfig.field) {
      filtered.sort((a, b) => {
        let aVal: unknown = a[globalSortConfig.field];
        let bVal: unknown = b[globalSortConfig.field];

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
        firstColumnMaxWidth: '200px'
      };
    }
    return {
      minWidth: Math.max(800, visibleColumnKeys.length * 150),
      cellMinWidth: '120px',
      cellMaxWidth: '250px',
      firstColumnMinWidth: '200px',
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
    dispatch(setSelectedLead(lead));
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
      console.log('[PipelineListView] Dropdown change:', { leadId: lead.id, field, newValue });
      
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
        console.error('Failed to save dropdown change:', error);
      }
    };
    
    switch (column) {
      case 'name':
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 text-sm">
              {lead.name?.charAt(0)?.toUpperCase() || 'L'}
            </Avatar>
            <div>
              <p className="text-sm font-medium">
                {lead.name || 'Unnamed Lead'}
              </p>
              <p className="text-xs text-gray-500">
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
              onChange={(e) => {
                e.stopPropagation();
                const newValue = e.target.value;
                handleDropdownChange('stage', newValue);
              }}
              className="min-w-[120px]"
            >
              <option value="">Select stage...</option>
              {stages.map((stage) => (
                <option key={stage.key} value={stage.key}>
                  {stage.label}
                </option>
              ))}
            </Select>
          </div>
        );
      
      case 'status':
        // Validate that the lead's status exists in available options
        const validStatusValue = statusOptions.find(option => option.key === lead.status) ? lead.status : '';
        
        // Log warning for invalid status values
        if (lead.status && !validStatusValue) {
          console.warn(`[PipelineListView] Invalid status value "${lead.status}" for lead ${lead.id}. Available options:`, statusOptions.map(s => s.key));
        }
        
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={validStatusValue}
              onChange={(e) => {
                e.stopPropagation();
                const newValue = e.target.value;
                console.log('[PipelineListView] Status change:', { leadId: lead.id, oldValue: lead.status, newValue });
                handleDropdownChange('status', newValue);
              }}
              className="min-w-[120px]"
            >
              <option value="">Select Status</option>
              {statusOptions.map((status) => (
                <option key={status.key} value={status.key}>
                  {status.label}
                </option>
              ))}
            </Select>
          </div>
        );
      
      case 'priority':
        // Validate that the lead's priority exists in available options
        const validPriorityValue = priorityOptions.find(option => option.key === lead.priority) ? lead.priority : '';
        
        // Log warning for invalid priority values
        if (lead.priority && !validPriorityValue) {
          console.warn(`[PipelineListView] Invalid priority value "${lead.priority}" for lead ${lead.id}. Available options:`, priorityOptions.map(p => p.key));
        }
        
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={validPriorityValue}
              onChange={(e) => {
                e.stopPropagation();
                const newValue = e.target.value;
                console.log('[PipelineListView] Priority change:', { leadId: lead.id, oldValue: lead.priority, newValue });
                handleDropdownChange('priority', newValue);
              }}
              className="min-w-[120px]"
            >
              <option value="">Select Priority</option>
              {priorityOptions.map((priority) => (
                <option key={priority.key} value={priority.key}>
                  {priority.label}
                </option>
              ))}
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
                onChange={(e) => {
                  e.stopPropagation();
                  const newValue = e.target.value;
                  handleDropdownChange('assignee', newValue);
                }}
                className="min-w-[150px]"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((member) => (
                  <option key={member.id || member.name} value={member.id || member._id}>
                    {member.name || member.email}
                  </option>
                ))}
              </Select>
            </div>
          );
        }
        
        // Non-admin users see read-only display
        const assigneeDisplayName = getAssigneeDisplayName(lead.assignee);
        return assigneeDisplayName ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6 text-xs">
              {assigneeDisplayName.charAt(0).toUpperCase()}
            </Avatar>
            <p className="text-sm">{assigneeDisplayName}</p>
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
              {filteredAndSortedLeads.map((lead) => (
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
                  className="hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                >
                  {visibleColumnKeys.map((column) => (
                    <td 
                      key={column} 
                      className="px-4 py-3 border-b border-gray-100 whitespace-nowrap overflow-hidden text-ellipsis"
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
          lead={globalSelectedLead as Lead}
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

