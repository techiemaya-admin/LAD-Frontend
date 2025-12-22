// PipelineStageColumn.tsx
import React, { useState, useMemo } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '../../app/components/ui/dialog';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Label } from '../../app/components/ui/label';
import { Select } from '../../app/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../app/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash2 } from 'lucide-react';
import PipelineLeadCard from './PipelineLeadCard';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { updateStage, deleteStage } from '../../services/pipelineService';
import { useDispatch } from 'react-redux';
import { Stage } from '../../store/slices/pipelineSlice';
import { Lead } from '../leads/types';
import { User } from '../../store/slices/usersSlice';

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
  allStages = []
}) => {
  const cleanDroppableId = String(droppableId);

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

  // hide card being dragged from original column
  const visibleLeads = useMemo(
    () => (activeCardId ? leads.filter((lead) => String(lead.id) !== String(activeCardId)) : leads),
    [leads, activeCardId]
  );

  const handleEditClick = (): void => {
    setEditFormData({
      stageName: stage.name || stage.label || '',
      position: '',
      positionType: 'after'
    });
    setEditDialogOpen(true);
    setError('');
  };

  const handleDeleteClick = (): void => {
    setDeleteDialogOpen(true);
  };

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
      console.log('[PipelineStageColumn] Deleting stage:', stageKey);
      console.log('[PipelineStageColumn] Has onDeleteStageAction handler:', !!handlers?.onDeleteStageAction);
      
      if (handlers?.onDeleteStageAction) {
        console.log('[PipelineStageColumn] Calling onDeleteStageAction...');
        await handlers.onDeleteStageAction(stageKey);
        console.log('[PipelineStageColumn] onDeleteStageAction completed');
      } else {
        console.log('[PipelineStageColumn] Calling deleteStage directly...');
        await deleteStage(stageKey);
        console.log('[PipelineStageColumn] deleteStage completed');
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
        <div className="flex justify-between items-center mb-2 min-h-[32px]">
          <h3 className="text-lg font-semibold text-blue-500 whitespace-nowrap overflow-hidden text-ellipsis max-w-[90%]">
            {stage.name || stage.label}
          </h3>
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
        <SortableContext items={visibleLeads.map((l) => String(l.id))} strategy={verticalListSortingStrategy}>
          <div className="min-h-2 flex-grow">
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
        <DialogTitle>Edit Stage</DialogTitle>
        <DialogContent>
          <div className="pt-2">
            <div className="mb-6">
              <Label htmlFor="stage-name" className="text-sm font-medium mb-2 block">Stage Name</Label>
              <Input
                id="stage-name"
                autoFocus
                value={editFormData.stageName}
                onChange={(e) => setEditFormData({ ...editFormData, stageName: e.target.value })}
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
                  id="position-type"
                  value={editFormData.positionType}
                  onChange={(e) => setEditFormData({ ...editFormData, positionType: e.target.value as 'before' | 'after' })}
                  className="w-full"
                >
                  <option value="before">Before</option>
                  <option value="after">After</option>
                </Select>
              </div>
              <div className="flex-1">
                <Label htmlFor="reference-stage" className="text-sm font-medium mb-2 block">Reference Stage</Label>
                <Select
                  id="reference-stage"
                  value={editFormData.position}
                  onChange={(e) => setEditFormData({ ...editFormData, position: e.target.value })}
                  className="w-full"
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
          </div>
        </DialogContent>
        <DialogActions className="px-6 py-4">
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
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={(isOpen) => !isOpen && setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Stage</DialogTitle>
        <DialogContent>
          <p>Are you sure you want to delete the stage "{stage.name || stage.label}"?</p>
        </DialogContent>
        <DialogActions className="px-6 py-4">
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
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PipelineStageColumn;

