import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Chip } from '@/components/ui/chip';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { logger } from '@/lib/logger';
import { useSelector } from 'react-redux';
import { selectStatuses, selectPriorities, selectSources, selectMasterDataLoading } from '@/store/slices/masterDataSlice';
import { selectUsers, selectUsersLoading } from '@/store/slices/usersSlice';
import { Stage } from '../../features/deals-pipeline/store/slices/pipelineSlice';
interface PipelineActiveFilters {
  stages: string[];
  statuses: string[];
  priorities: string[];
  sources: string[];
  assignees: string[];
  dateRange?: {
    start: string | null;
    end: string | null;
  } | null;
}
interface PipelineFilterDialogProps {
  open: boolean;
  onClose: () => void;
  filters: PipelineActiveFilters;
  onFiltersChange: (filters: PipelineActiveFilters) => void;
  stages: Array<Stage & { name?: string; label?: string; key?: string }>;
  onClearFilters: () => void;
}
interface MultiSelectProps {
  label: string;
  options: Array<{ key: string; label: string }>;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  renderChip?: (key: string) => string;
}
const MultiSelect: React.FC<MultiSelectProps> = ({ label, options, value, onChange, disabled, renderChip }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  const handleToggle = (optionKey: string) => {
    const newValue = value.includes(optionKey)
      ? value.filter(v => v !== optionKey)
      : [...value, optionKey];
    onChange(newValue);
  };
  return (
    <div className="w-full relative" ref={dropdownRef}>
      <Label className="text-sm font-medium mb-2 block">{label}</Label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full min-h-[44px] px-3 py-2 text-left border border-input rounded-lg bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {value.length === 0 ? (
            <span className="text-gray-500">Select {label.toLowerCase()}...</span>
          ) : (
            value.map((key, index) => (
              <Chip key={`${key}-${index}`} variant="secondary" className="text-xs">
                {renderChip ? renderChip(key) : options.find(o => o.key === key)?.label || key}
              </Chip>
            ))
          )}
        </div>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {options.map((option, index) => {
            const isChecked = value.includes(option.key);
            // Ensure unique key by combining option.key with index as fallback
            const uniqueKey = option.key || `option-${index}`;
            return (
              <div
                key={uniqueKey}
                className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleToggle(option.key)}
              >
                <Checkbox
                  checked={isChecked}
                  className="mr-2 pointer-events-none"
                />
                <span className="text-sm select-none">{option.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
const PipelineFilterDialog: React.FC<PipelineFilterDialogProps> = ({
  open,
  onClose,
  filters,
  onFiltersChange,
  stages,
  onClearFilters
}) => {
  // Get master data from Redux
  const statusOptions = useSelector(selectStatuses);
  const priorityOptions = useSelector(selectPriorities);
  const sourceOptions = useSelector(selectSources);
  const masterDataLoading = useSelector(selectMasterDataLoading);
  // Get team members from Redux for assignee filter
  const teamMembers = useSelector(selectUsers);
  const usersLoading = useSelector(selectUsersLoading);
  // If master data is still loading or empty, show loading state
  const hasNoMasterData = statusOptions.length === 0 && priorityOptions.length === 0 && sourceOptions.length === 0;
  if (masterDataLoading || hasNoMasterData) {
    return (
      <Dialog open={open}>
        <DialogContent showCloseButton={false} className="p-6 pt-2 max-h-[90vh] overflow-y-auto">
          <DialogTitle className="flex justify-between items-center">
            <span className="text-lg font-semibold text-primary">Filter Leads</span>
            <button
              onClick={onClose}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogTitle>
          <div className="flex justify-center p-6">
            <p>Loading filter options...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  // Ensure filters has safe defaults
  const safeFilters: PipelineActiveFilters = {
    ...{
      stages: [],
      statuses: [],
      priorities: [],
      sources: [],
      assignees: [],
      dateRange: { start: null, end: null }
    },
    ...filters
  };
  // Ensure stages is safe
  const safeStages = Array.isArray(stages) ? stages.filter(stage => stage && (stage.key || stage.id)) : [];
  // Add fallback test stages if no stages provided (for testing)
  const testStages = safeStages.length === 0 ? [
    { key: 'lead', label: 'Lead' },
    { key: 'qualified', label: 'Qualified' },
    { key: 'proposal', label: 'Proposal' },
    { key: 'closed-won', label: 'Closed Won' },
    { key: 'closed-lost', label: 'Closed Lost' }
  ] : safeStages;
  const handleFilterChange = (field: keyof PipelineActiveFilters, value: string[] | { start: string | null; end: string | null }): void => {
    if (typeof onFiltersChange === 'function') {
      onFiltersChange({ ...safeFilters, [field]: value });
    } else {
      logger.warn('[PipelineFilterDialog] onFiltersChange is not a function');
    }
  };
  const handleDateRangeChange = (field: 'start' | 'end', value: string): void => {
    const currentRange = safeFilters.dateRange || { start: null, end: null };
    const nextRange = { ...currentRange, [field]: value || null };

    const start = nextRange.start;
    const end = nextRange.end;

    if (start && end && end < start) {
      nextRange.end = start;
    }

    onFiltersChange({
      ...safeFilters,
      dateRange: nextRange
    });
  };
  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="p-6 pt-2 max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogTitle className="flex justify-between items-center pb-1 mt-4">
          <span className="text-lg font-semibold text-primary">Filter Leads</span>
          <button
            onClick={onClose}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogTitle>
        <div className="mt-2 rounded-xl border border-gray-200 p-4 bg-[#f9fafb]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <MultiSelect
            label="Stages"
            options={testStages.map(stage => ({
              key: stage.key || String(stage.id),
              label: stage.label || stage.name || String(stage.id)
            }))}
            value={safeFilters.stages}
            onChange={(value) => handleFilterChange('stages', value)}
            renderChip={(key) => {
              const stage = testStages.find(s => (s.key || s.id) === key);
              return stage?.label || stage?.name || key;
            }}
          />
          <MultiSelect
            label="Statuses"
            options={Array.isArray(statusOptions) ? statusOptions.map(s => ({ key: s.key, label: s.label })) : []}
            value={safeFilters.statuses}
            onChange={(value) => handleFilterChange('statuses', value)}
            renderChip={(key) => {
              const statusOption = statusOptions.find(s => s.key === key);
              return statusOption?.label || key;
            }}
          />
          <MultiSelect
            label="Priorities"
            options={Array.isArray(priorityOptions) ? priorityOptions.map(p => ({ key: p.key, label: p.label })) : []}
            value={safeFilters.priorities}
            onChange={(value) => handleFilterChange('priorities', value)}
            renderChip={(key) => {
              const priorityOption = priorityOptions.find(p => p.key === key);
              return priorityOption?.label || key;
            }}
          />
          <MultiSelect
            label="Sources"
            options={Array.isArray(sourceOptions) ? sourceOptions.map(s => ({ key: s.key, label: s.label })) : []}
            value={safeFilters.sources}
            onChange={(value) => handleFilterChange('sources', value)}
            renderChip={(key) => {
              const sourceOption = sourceOptions.find(s => s.key === key);
              return sourceOption?.label || key;
            }}
          />
          <MultiSelect
            label="Assignees"
            options={Array.isArray(teamMembers) ? teamMembers.map(u => ({ key: String(u.id), label: u.name || String(u.id) })) : []}
            value={Array.isArray(safeFilters.assignees) ? safeFilters.assignees : []}
            onChange={(value) => handleFilterChange('assignees', value)}
            disabled={usersLoading}
            renderChip={(key) => {
              const user = teamMembers.find(u => String(u.id) === key);
              return user?.name || key;
            }}
          />
          <div className="sm:col-span-2">
            <Label className="text-sm font-medium mb-2 block">Date Range</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date" className="text-xs text-gray-500 mb-1 block">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={safeFilters.dateRange?.start || ''}
                  max={safeFilters.dateRange?.end || undefined}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  className="w-full h-11 rounded-lg"
                />
              </div>
              <div>
                <Label htmlFor="end-date" className="text-xs text-gray-500 mb-1 block">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={safeFilters.dateRange?.end || ''}
                  min={safeFilters.dateRange?.start || undefined}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  className="w-full h-11 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
        </div>
        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2 pt-4 border-t mt-6">
          <Button 
            onClick={onClearFilters}
            variant="outline"
            className="rounded-lg font-semibold bg-white text-gray-500 border-[1.5px] border-gray-200 hover:bg-gray-50 sm:mr-auto"
          >
            <X className="mr-2 h-4 w-4" />
            Clear All
          </Button>
          <div className="flex items-center justify-end gap-2">
            {/* <Button 
              onClick={onClose}
              variant="outline"
              className="rounded-lg font-semibold bg-white text-gray-600 border-[1.5px] border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button> */}
            <Button 
              onClick={onClose}
              className="rounded-lg font-semibold bg-primary hover:bg-primary/80 text-white"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default PipelineFilterDialog;
