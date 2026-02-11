import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Filter,
  ArrowUpDown,
  Search,
  Settings,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Calendar
} from 'lucide-react';
interface PipelineBoardToolbarProps {
  // Data
  totalLeads: number;
  filteredLeadsCount: number;
  stagesCount: number;
  // Labels (dynamic based on vertical)
  labels?: {
    entity: string;
    entityPlural: string;
    pipeline: string;
    owner: string;
    deal: string;
    value: string;
  };
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  // Zoom
  zoom: number;
  onZoomChange: (zoom: number) => void;
  // View Mode
  viewMode?: 'kanban' | 'list';
  // Actions
  onAddStage: () => void;
  onAddLead: () => void;
  onOpenFilter: () => void;
  onOpenSort: () => void;
  onOpenSettings: () => void;
  onExport: () => void;
  onExportWithDateRange?: (range: 'today' | 'thisMonth' | 'thisYear' | 'custom', startDate?: string, endDate?: string) => void;
}
const PipelineBoardToolbar: React.FC<PipelineBoardToolbarProps> = ({
  // Data
  totalLeads,
  filteredLeadsCount,
  stagesCount,
  // Labels
  labels = {
    entity: 'Lead',
    entityPlural: 'Leads',
    pipeline: 'Pipeline',
    owner: 'Owner',
    deal: 'Deal',
    value: 'Value'
  },
  // Search
  searchQuery,
  onSearchChange,
  // Zoom
  zoom,
  onZoomChange,
  // View Mode
  viewMode = 'kanban',
  // Actions
  onAddStage,
  onAddLead,
  onOpenFilter,
  onOpenSort,
  onOpenSettings,
  onExport,
  onExportWithDateRange
}) => {
  const handleZoomIn = (): void => onZoomChange(zoom + 0.2);
  const handleZoomOut = (): void => onZoomChange(zoom - 0.2);
  const handleZoomReset = (): void => onZoomChange(1);
  return (
    <div className="rounded-3xl px-4 sm:px-8 py-4 sm:py-6">
      <div className="flex flex-col gap-4">
        {/* Top row: All controls */}
    <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
          {/* Left side - Stats, Action buttons, and Zoom */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Action buttons (hidden in list view) */}
            {viewMode !== 'list' && (
              <>
                <Button
                  onClick={onAddStage}
                  className="bg-primary hover:bg-primary/80 text-white rounded-xl shadow-none h-9 text-sm"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Stage
                </Button>
                <Button
                  onClick={onAddLead}
                  className="bg-primary hover:bg-primary/80 text-white rounded-xl shadow-none h-9 text-sm"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add {labels.entity}
                </Button>
              </>
            )}
            {/* Zoom controls - only show in kanban view */}
            {viewMode === 'kanban' && (
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                <button
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  className="text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 w-7 h-7 rounded-lg disabled:text-gray-300 dark:disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="min-w-[45px] text-center text-xs text-gray-600 dark:text-gray-300 font-medium">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  disabled={zoom >= 2.0}
                  className="text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 w-7 h-7 rounded-lg disabled:text-gray-300 dark:disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={handleZoomReset}
                  className="text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 w-7 h-7 rounded-lg ml-1 flex items-center justify-center transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          {/* Right side - Search and control buttons (hidden in list view) */}
          {viewMode !== 'list' && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:ml-auto">
              <div className="relative bg-white dark:bg-gray-800 rounded-xl flex items-center px-4 border border-gray-300 dark:border-gray-600 h-10 w-full sm:w-60">
                <Search className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                <input
                  type="text"
                  placeholder={`Search ${labels.entityPlural.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="border-0 outline-none bg-transparent w-full text-sm text-gray-800 dark:text-gray-200 focus:ring-0 focus:outline-none p-0 h-full placeholder:text-gray-400"
                />
              </div>
              <Button
                variant="outline"
                onClick={onOpenFilter}
                className="rounded-xl text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 h-9 text-sm"
              >
                <Filter className="mr-1.5 h-4 w-4" />
                Filter
              </Button>
              <Button
                variant="outline"
                onClick={onOpenSort}
                className="rounded-xl text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 h-9 text-sm"
              >
                <ArrowUpDown className="mr-1.5 h-4 w-4" />
                Sort
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="rounded-xl text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 h-9 text-sm"
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onExport()}>
                    All Leads
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExportWithDateRange?.('today')}>
                    Today
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExportWithDateRange?.('thisMonth')}>
                    This Month
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExportWithDateRange?.('thisYear')}>
                    This Year
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExportWithDateRange?.('custom')}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Custom Range
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                onClick={onOpenSettings}
                className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        {/* Bottom row: Description text - centered */}
        {/* <p className="text-gray-500 dark:text-gray-400 text-lg sm:text-xl text-center">
          Customize your pipeline ✨
        </p> */}
      </div>
    </div>
  );
};
export default PipelineBoardToolbar;
