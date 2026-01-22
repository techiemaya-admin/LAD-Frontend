import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Chip } from '@/components/ui/chip';
import {
  Plus,
  Filter,
  ArrowUpDown,
  Search,
  Settings,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
interface PipelineBoardToolbarProps {
  // Data
  totalLeads: number;
  filteredLeadsCount: number;
  stagesCount: number;
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  // Zoom
  zoom: number;
  onZoomChange: (zoom: number) => void;
  // Actions
  onAddStage: () => void;
  onAddLead: () => void;
  onOpenFilter: () => void;
  onOpenSort: () => void;
  onOpenSettings: () => void;
}
const PipelineBoardToolbar: React.FC<PipelineBoardToolbarProps> = ({
  // Data
  totalLeads,
  filteredLeadsCount,
  stagesCount,
  // Search
  searchQuery,
  onSearchChange,
  // Zoom
  zoom,
  onZoomChange,
  // Actions
  onAddStage,
  onAddLead,
  onOpenFilter,
  onOpenSort,
  onOpenSettings
}) => {
  const handleZoomIn = (): void => onZoomChange(zoom + 0.2);
  const handleZoomOut = (): void => onZoomChange(zoom - 0.2);
  const handleZoomReset = (): void => onZoomChange(1);
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-gradient-to-r from-blue-50 via-white to-purple-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 shadow-lg rounded-3xl px-8 py-6 border border-gray-200 dark:border-gray-700">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight"> Deals Pipeline</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg">Customize your pipeline ✨</p>
        </div>
    <div className="p-4 flex justify-between items-center border-b border-gray-200">
      {/* Left side - Title and stats */}
      <div className="flex items-center gap-4">
        <div>
          {/* <h2 className="text-xl font-black text-gray-800">
            Deals Pipeline
          </h2> */}
          <div className="flex items-center mt-1">
            <span className="text-sm text-gray-500 mr-2">
              {filteredLeadsCount !== totalLeads ? `${filteredLeadsCount} of ` : ''}{totalLeads} leads
            </span>
            <Chip 
              variant="secondary"
              className="bg-gray-100 text-gray-500 h-5 text-xs"
            >
              {stagesCount} stages
            </Chip>
          </div>
        </div>
        {/* Action buttons */}
        <Button
          onClick={onAddStage}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-none"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Stage
        </Button>
        <Button
          onClick={onAddLead}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-none"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Lead
        </Button>
        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="text-gray-500 hover:bg-gray-200 w-7 h-7 rounded disabled:text-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="min-w-[45px] text-center text-xs text-gray-500 font-medium">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 2.0}
            className="text-gray-500 hover:bg-gray-200 w-7 h-7 rounded disabled:text-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={handleZoomReset}
            className="text-gray-500 hover:bg-gray-200 w-7 h-7 rounded ml-1 flex items-center justify-center"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>
      {/* Right side - Search and controls */}
      <div className="flex gap-2">
        <div className="relative bg-gray-50 rounded-lg flex items-center px-4 border border-gray-200 h-9 w-60 ml-4">
          <Search className="h-4 w-4 text-gray-400 mr-2" />
          <Input
            type="text"
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="border-0 outline-none bg-transparent w-full text-sm text-gray-800 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto"
          />
        </div>
        <Button
          variant="outline"
          onClick={onOpenFilter}
          className="rounded-lg text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        >
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
        <Button
          variant="outline"
          onClick={onOpenSort}
          className="rounded-lg text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        >
          <ArrowUpDown className="mr-2 h-4 w-4" />
          Sort
        </Button>
        <button
          onClick={onOpenSettings}
          className="bg-gray-100 text-gray-500 hover:bg-gray-200 w-9 h-9 rounded-lg flex items-center justify-center"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </div>
    </div>
  );
};
export default PipelineBoardToolbar;