// PipelineStageColumn.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash2, X } from 'lucide-react';
import PipelineLeadCard from './PipelineLeadCard';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { updateStage, deleteStage } from '@/services/pipelineService';
import { useDispatch } from 'react-redux';
import { Stage } from '../store/slices/pipelineSlice';
import type { Lead } from '@/features/deals-pipeline/types';
import { User } from '@/store/slices/usersSlice';
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
          updates.displayOrder = newDisplayOrder;
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
      console.error('[PipelineStageColumn] Delete stage error:', err);
      setDeleteDialogOpen(false);
      setError('Failed to delete stage');
    }
  };
  return (
    <>
      <div
        ref={setNodeRef}
        className={`p-3 w-full min-w-0 rounded-2xl transition-all duration-200 flex flex-col h-fit ${
          isOver ? 'bg-blue-100' : 'bg-gray-50'
        }`}
        style={{
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div
          className={`sticky top-0 z-10 flex justify-between items-center mb-2 min-h-[32px] rounded-[5px] px-2 py-1 -mx-2 ${
            isOver ? 'bg-blue-100' : 'bg-gray-50'
          }`}
        >
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-[#172560] whitespace-nowrap overflow-hidden text-ellipsis">
                {stage.name || stage.label}
              </h3>
              {showCardCount && (
                <Badge variant="secondary" className="bg-[#e8ebf7] text-[#172560] text-xs">
                  {leads.length}
                </Badge>
              )}
            </div>
            {showTotalValue && totalValue > 0 && (
              <p className="text-xs text-gray-600">
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
              <DropdownMenuItem onSelect={handleDeleteClick} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Stage
              </DropdownMenuItem>
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
                compactMode={compactView}
              />
            ))}
          </div>
        </SortableContext>
      </div>
      <Dialog open={editDialogOpen} onOpenChange={(isOpen) => !isOpen && setEditDialogOpen(false)}>
        <DialogContent showCloseButton={false} className="p-6 pt-2 max-h-[90vh] overflow-y-auto">
          <DialogTitle className="flex justify-between items-center">
            <span className="text-lg font-semibold text-[#3A3A4F]">Edit Stage</span>
            <button
              onClick={() => setEditDialogOpen(false)}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogTitle>
          <div className="pt-2">
            <div className="mb-6">
              <Label htmlFor="stage-name" className="text-sm font-medium mb-2 block">Stage Name</Label>
              <Input
                id="stage-name"
                autoFocus
                value={editFormData.stageName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditFormData({ ...editFormData, stageName: e.target.value })}
                className={error ? 'border-red-500' : ''}
              />
              {error && (
                <p className="text-sm text-red-500 mt-1">{error}</p>
              )}
            </div>
            <h4 className="text-base font-semibold mb-4">Change Position (Optional)</h4>
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <Label htmlFor="position-type" className="text-sm font-medium mb-2 block">Position Type</Label>
                <Select
                  value={editFormData.positionType}
                  onValueChange={(value: string) => setEditFormData({ ...editFormData, positionType: value as 'before' | 'after' })}
                >
                  <option value="before">Before</option>
                  <option value="after">After</option>
                </Select>
              </div>
              <div className="flex-1">
                <Label htmlFor="reference-stage" className="text-sm font-medium mb-2 block">Reference Stage</Label>
                <Select
                  value={editFormData.position}
                  onValueChange={(value: string) => setEditFormData({ ...editFormData, position: value })}
                >
                  <option value="">No position change</option>
                  {allStages
                    .filter(s => (s.key || s.id) !== (stage.key || stage.id))
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((stageOption) => (
                      <option key={stageOption.key || stageOption.id} value={stageOption.key || stageOption.id}>
                        {stageOption.name || stageOption.label}
                      </option>
                    ))}
                </Select>
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t mt-6">
              <Button
                onClick={() => setEditDialogOpen(false)}
                variant="outline"
                className="rounded-lg font-semibold text-gray-500 border-gray-200 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditStage}
                className="rounded-lg font-semibold bg-blue-500 hover:bg-blue-600 text-white"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteDialogOpen} onOpenChange={(isOpen) => !isOpen && setDeleteDialogOpen(false)}>
        <DialogContent showCloseButton={false} className="p-6 pt-2 max-h-[90vh] overflow-y-auto">
          <DialogTitle className="flex justify-between items-center">
            <span className="text-lg font-semibold text-[#3A3A4F]">Delete Stage</span>
            <button
              onClick={() => setDeleteDialogOpen(false)}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogTitle>
          <p className="mt-4">Are you sure you want to delete the stage "{stage.name || stage.label}"?</p>
          <div className="flex gap-2 pt-4 border-t mt-6">
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              variant="outline"
              className="rounded-lg font-semibold text-gray-500 border-gray-200 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteStage}
              className="rounded-lg font-semibold bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </Button>
          </div>
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
    // Deep compare lead IDs to detect if leads array actually changed
    JSON.stringify(prevProps.leads.map(l => l.id)) === JSON.stringify(nextProps.leads.map(l => l.id))
  );
});
