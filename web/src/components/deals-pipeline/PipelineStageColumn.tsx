// PipelineStageColumn.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogHeader, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import PipelineLeadCard from './PipelineLeadCard';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { updateStage, deleteStage } from '@lad/frontend-features/deals-pipeline';
import { useDispatch } from 'react-redux';
import { Stage } from '@/features/deals-pipeline/store/slices/pipelineSlice';
import type { Lead } from '@/features/deals-pipeline/types';
import { User } from '@/store/slices/usersSlice';
import { logger } from '@/lib/logger';
interface PipelineStageColumnProps {
  stage: Stage & { name?: string; label?: string; order?: number; display_order?: number; totalStages?: number };
  leads: Lead[];
  teamMembers?: User[];
  droppableId: string | number;
  activeCardId?: string | number | null;
  onStageUpdate?: () => void;
  onStageDelete?: () => void;
  onStatusChange?: (leadId: string | number, newStatus: string) => void;
  onEdit?: (lead: Lead) => void;
  onDelete?: (leadId: string | number) => void;
  handlers?: {
    onUpdateStage?: (stageKey: string, updates: Record<string, unknown>) => Promise<void>;
    onDeleteStageAction?: (stageKey: string) => Promise<void>;
  };
  allStages?: Array<Stage & { name?: string; label?: string; order?: number; display_order?: number; key?: string; id?: string }>;
  compactView?: boolean;
  showCardCount?: boolean;
  showTotalValue?: boolean;
}
interface EditFormData {
  stageName: string;
  position: string;
  positionType: 'before' | 'after';
}
const PipelineStageColumn: React.FC<PipelineStageColumnProps> = ({
  stage,
  leads,
  teamMembers = [],
  droppableId,
  activeCardId,
  onStageUpdate,
  onStageDelete,
  onStatusChange,
  onEdit,
  onDelete,
  handlers,
  allStages = [],
  compactView = false,
  showCardCount = true,
  showTotalValue = true
}) => {
  const cleanDroppableId = String(droppableId);
  // Debug log to check props
  // Provide stage metadata on the droppable so handleDragEnd can read it
  const { setNodeRef, isOver } = useDroppable({
    id: cleanDroppableId,
    data: { type: 'stage', stageId: stage.key || stage.id }
  });
  const dispatch = useDispatch();
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    stageName: '',
    position: '',
    positionType: 'after'
  });
  const [error, setError] = useState<string>('');
  // Memoize visible leads to prevent unnecessary recalculation
  const visibleLeads = useMemo(
    () => (activeCardId ? leads.filter((lead) => String(lead.id) !== String(activeCardId)) : leads),
    [leads, activeCardId]
  );
  // Calculate total value for the stage
  const totalValue = useMemo(() => {
    return leads.reduce((sum, lead) => {
      const amount = typeof lead.amount === 'number' ? lead.amount : parseFloat(String(lead.amount || 0));
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }, [leads]);
  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };
  // Memoize sortable items array
  const sortableItems = useMemo(
    () => visibleLeads.map((l) => String(l.id)),
    [visibleLeads]
  );
  const handleEditClick = useCallback((): void => {
    setEditFormData({
      stageName: stage.name || stage.label || '',
      position: '',
      positionType: 'after'
    });
    setEditDialogOpen(true);
    setError('');
  }, [stage.name, stage.label]);
  const handleDeleteClick = useCallback((): void => {
    setDeleteDialogOpen(true);
  }, []);
  const handleEditStage = async (): Promise<void> => {
    if (!editFormData.stageName.trim()) {
      setError('Stage name is required');
      return;
    }
    try {
      const updates: Record<string, unknown> = {
        label: editFormData.stageName.trim(),
        name: editFormData.stageName.trim()
      };
      if (editFormData.position) {
        const targetStage = allStages.find((s) => (s.key || s.id) === editFormData.position);
        if (targetStage) {
          let newDisplayOrder: number;
          if (editFormData.positionType === 'before') {
            newDisplayOrder = targetStage.order || targetStage.display_order || 0;
          } else {
            newDisplayOrder = (targetStage.order || targetStage.display_order || 0) + 1;
          }
          updates.display_order = newDisplayOrder;
        }
      }
      const stageKey = stage.key || String(stage.id);
      if (handlers?.onUpdateStage) {
        await handlers.onUpdateStage(stageKey, updates);
      } else {
        await updateStage(stageKey, updates);
      }
      if (onStageUpdate) onStageUpdate();
      setEditDialogOpen(false);
      setError('');
    } catch (err) {
      const errorMessage = (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error || 
                          (err as { message?: string })?.message || 
                          'Failed to update stage';
      setError(errorMessage);
    }
  };
  const handleDeleteStage = async (): Promise<void> => {
    try {
      const stageKey = stage.key || String(stage.id);
      if (handlers?.onDeleteStageAction) {
        await handlers.onDeleteStageAction(stageKey);
        } else {
        await deleteStage(stageKey);
        }
      if (onStageDelete) onStageDelete();
      setDeleteDialogOpen(false);
    } catch (err) {
      logger.error('[PipelineStageColumn] Delete stage error:', err);
      setDeleteDialogOpen(false);
      setError('Failed to delete stage');
    }
  };
  return (
    <>
      <div
        ref={setNodeRef}
        className={`p-3 w-full min-w-0 rounded-xl transition-all duration-200 flex flex-col h-fit ${
          isOver ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-50 dark:bg-[#1a2a43]'
        }`}
        style={{
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div
          className={`sticky top-0 z-10 flex justify-between items-center mb-2 min-h-[32px] rounded-[5px] px-2 py-1 -mx-2 ${
            isOver ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-50 dark:bg-[#1a2a43]'
          }`}
        >
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-[#172560] dark:text-white whitespace-nowrap overflow-hidden text-ellipsis">
                {stage.name || stage.label}
              </h3>
              {showCardCount && (
                <Badge variant="secondary" className="bg-[#e8ebf7] dark:bg-[#253456] text-[#172560] dark:text-white text-xs">
                  {leads.length}
                </Badge>
              )}
            </div>
            {showTotalValue && totalValue > 0 && (
              <p className="text-xs text-gray-600 dark:text-[#7a8ba3]">
                {formatCurrency(totalValue)}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-blue-500 hover:bg-blue-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={handleEditClick}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Stage
              </DropdownMenuItem>
              {/* <DropdownMenuItem onSelect={handleDeleteClick} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Stage
              </DropdownMenuItem> */}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* SortableContext for leads inside the column */}
        <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
          <div className="min-h-2 flex-grow space-y-3">
            {visibleLeads.map((lead) => (
              <PipelineLeadCard
                key={lead.id}
                lead={lead}
                teamMembers={teamMembers}
                currentStage={stage.order ? stage.order - 1 : 0}
                totalStages={stage.totalStages || 0}
                onStatusChange={onStatusChange}
                onEdit={onEdit}
                onDelete={onDelete}
                
              />
            ))}
          </div>
        </SortableContext>
      </div>
      <Dialog open={editDialogOpen} onOpenChange={(isOpen) => !isOpen && setEditDialogOpen(false)}>
        <DialogContent className="sm:w-[90vw] h-auto max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
                <Edit className="h-5 w-5" />
              </div>
              <DialogTitle>Edit Stage</DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stage-name" className="text-sm font-medium text-gray-700">Stage Name</Label>
                <Input
                  id="stage-name"
                  autoFocus
                  value={editFormData.stageName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditFormData({ ...editFormData, stageName: e.target.value })}
                  className={cn("h-11 rounded-xl", error ? 'border-red-500' : 'border-gray-200')}
                />
                {error && (
                  <p className="text-xs text-red-500 font-medium pl-1">{error}</p>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Positioning
                  </h3>
                  <div className="h-px flex-1 bg-gray-100" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="stage-position" className="text-sm font-medium text-gray-700">Relative to Stage</Label>
                  <Select
                    value={
                      editFormData.position
                        ? `${editFormData.positionType}:${editFormData.position}`
                        : '__none__'
                    }
                    onValueChange={(value: string) => {
                      if (value === '__none__') {
                        setEditFormData({ ...editFormData, position: '' });
                        return;
                      }

                      const [positionType, position] = value.split(':');
                      setEditFormData({
                        ...editFormData,
                        positionType: (positionType as 'before' | 'after') || 'after',
                        position: position || ''
                      });
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-gray-200">
                      <SelectValue placeholder="No position change" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl z-[1001] max-h-[300px]">
                      <SelectItem value="__none__">No position change</SelectItem>
                      {allStages
                        .filter(s => (s.key || s.id) !== (stage.key || stage.id))
                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                        .flatMap((stageOption) => {
                          const id = String(stageOption.key || stageOption.id);
                          const label = stageOption.name || stageOption.label;
                          return [
                            <SelectItem key={`before:${id}`} value={`before:${id}`}>
                              Before: {label}
                            </SelectItem>,
                            <SelectItem key={`after:${id}`} value={`after:${id}`}>
                              After: {label}
                            </SelectItem>
                          ];
                        })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <DialogActions>
            <Button
              onClick={() => setEditDialogOpen(false)}
              variant="outline"
              className="rounded-xl px-6 h-11 font-semibold text-gray-500 border-gray-200 hover:bg-gray-50 transition-all"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditStage}
              className="rounded-xl px-8 h-11 font-bold bg-[#0B1957] hover:bg-[#0B1957]/90 text-white shadow-lg transition-all"
            >
              Save Changes
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={(isOpen) => !isOpen && setDeleteDialogOpen(false)}>
        <DialogContent className="overflow-hidden flex flex-col p-0">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-red-50 text-red-600 border border-red-100 shadow-sm">
                <Trash2 className="h-5 w-5" />
              </div>
              <DialogTitle>Delete Stage</DialogTitle>
            </div>
          </DialogHeader>

          <div className="px-8 py-6">
            <p className="text-sm text-gray-600 leading-relaxed">
              Are you sure you want to delete the stage <span className="font-bold text-gray-900">"{stage.name || stage.label}"</span>? This action cannot be undone.
            </p>
          </div>

          <DialogActions className="bg-red-50/30">
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              variant="outline"
              className="rounded-xl px-6 h-11 font-semibold text-gray-500 border-gray-200 hover:bg-gray-50 transition-all"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteStage}
              className="rounded-xl px-8 h-11 font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg transition-all"
            >
              Delete Stage
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </>
  );
};
// Wrap in React.memo with custom comparison to prevent unnecessary re-renders
export default React.memo(PipelineStageColumn, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.stage.key === nextProps.stage.key &&
    prevProps.stage.name === nextProps.stage.name &&
    prevProps.stage.label === nextProps.stage.label &&
    prevProps.leads.length === nextProps.leads.length &&
    prevProps.activeCardId === nextProps.activeCardId &&
    prevProps.droppableId === nextProps.droppableId &&
    prevProps.compactView === nextProps.compactView &&
    prevProps.showCardCount === nextProps.showCardCount &&
    prevProps.showTotalValue === nextProps.showTotalValue &&
    // Deep compare lead IDs and status to detect if leads array actually changed
    JSON.stringify(prevProps.leads.map(l => ({ id: l.id, status: l.status }))) ===
    JSON.stringify(nextProps.leads.map(l => ({ id: l.id, status: l.status })))
  );
});
