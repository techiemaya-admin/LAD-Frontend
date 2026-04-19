import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import {
  Plus,
  Filter,
  Search,
  Settings,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Calendar,
  LayoutGrid,
  List
} from 'lucide-react';

const isLocal = process.env.NEXT_PUBLIC_SHOW_DEV_FEATURES === 'true';

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
  onViewModeChange?: (mode: 'kanban' | 'list') => void;
  // Actions
  onAddStage: () => void;
  onAddLead: () => void;
  onOpenFilter: () => void;
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
  onViewModeChange,
  // Actions
  onAddStage,
  onAddLead,
  onOpenFilter,
  onOpenSettings,
  onExport,
  onExportWithDateRange
}) => {
  const handleZoomIn = (): void => onZoomChange(zoom + 0.2);
  const handleZoomOut = (): void => onZoomChange(zoom - 0.2);
  const handleZoomReset = (): void => onZoomChange(1);

  return (
    <div className="rounded-3xl px-4 sm:px-2 py-2 sm:py-2">
      <div className="flex flex-col gap-4">
        {/* Responsive Toolbar Container */}
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

          {/* Row 2: Action buttons (show if isLocal regardless of view mode if user requested) */}
          {isLocal && (
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <Button
                onClick={onAddStage}
                className="flex-1 lg:flex-none bg-primary hover:bg-primary/80 text-white rounded-xl shadow-none h-9 text-sm"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Stage
              </Button>
              <Button
                onClick={onAddLead}
                className="flex-1 lg:flex-none bg-primary hover:bg-primary/80 text-white rounded-xl shadow-none h-9 text-sm"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add {labels.entity}
              </Button>
            </div>
          )}

          {/* Row 3: Search box (full width on mobile, auto width on desktop) */}
          <div className="w-full lg:w-60 lg:ml-auto">
            <div className="relative bg-white dark:bg-gray-800 rounded-xl flex items-center px-4 border border-gray-300 dark:border-gray-600 h-10 w-full">
              <Search className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder={`Search ${labels.entityPlural.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="border-0 outline-none bg-transparent w-full text-sm text-gray-800 dark:text-gray-200 focus:ring-0 focus:outline-none p-0 h-full placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Row 4: Control buttons (Filter, Export, Settings) */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <Button
              variant="outline"
              onClick={onOpenFilter}
              className="flex-1 lg:flex-none rounded-xl text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 h-9 text-sm"
            >
              <Filter className="h-4 w-4 mr-1.5" />
              Filter
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex-1 lg:flex-none rounded-xl text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 h-9 text-sm"
                >
                  <Download className="h-4 w-4 mr-1.5" />
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
              className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PipelineBoardToolbar;
