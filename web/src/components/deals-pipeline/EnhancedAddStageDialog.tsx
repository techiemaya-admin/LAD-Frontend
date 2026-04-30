import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogHeader, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { X, Plus } from 'lucide-react';
import { Stage } from '../store/slices/pipelineSlice';
interface EnhancedAddStageDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: () => void;
  stages?: Stage[];
  isSubmitting?: boolean;
  error?: string;
  newStageName: string;
  setNewStageName: (name: string) => void;
  positionStageId: string;
  setPositionStageId: (id: string) => void;
  positionType: 'before' | 'after';
  setPositionType: (type: 'before' | 'after') => void;
  getPositionPreview?: () => React.ReactNode;
}
const EnhancedAddStageDialog: React.FC<EnhancedAddStageDialogProps> = ({
  open,
  onClose,
  onAdd,
  stages = [],
  isSubmitting = false,
  error = '',
  newStageName,
  setNewStageName,
  positionStageId,
  setPositionStageId,
  positionType,
  setPositionType,
  getPositionPreview
}) => {
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (open) {
      setLocalErrors({});
    }
  }, [open]);
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!newStageName.trim()) {
      errors.name = 'Stage name is required';
    } else if (newStageName.trim().length < 2) {
      errors.name = 'Stage name must be at least 2 characters';
    } else if (stages.some(s => s.label?.toLowerCase() === newStageName.trim().toLowerCase())) {
      errors.name = 'Stage name already exists';
    }
    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const handleSubmit = () => {
    if (validateForm()) {
      onAdd();
    }
  };
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewStageName(e.target.value);
    if (localErrors.name) {
      setLocalErrors({ ...localErrors, name: '' });
    }
  };
  const handlePositionChange = (value: string) => {
    setPositionStageId(value);
    if (localErrors.position) {
      setLocalErrors({ ...localErrors, position: '' });
    }
  };
  const handlePositionTypeChange = (value: string) => {
    setPositionType(value as 'before' | 'after');
  };
  const getPositionText = (stage: Stage, type: 'before' | 'after'): string => {
    const stageName = stage.label || '';
    return type === 'before' ? `Before "${stageName}"` : `After "${stageName}"`;
  };
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="p-0 sm:w-[90vw] overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded-full bg-blue-50 text-blue-600 border border-blue-100 shadow-sm flex items-center justify-center w-10 h-10">
              <Plus className="h-6 w-6 stroke-[3px]" />
            </div>
            <DialogTitle>Add New Stage</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <Label htmlFor="stage-name" className="text-sm font-medium text-gray-700">Stage Name *</Label>
              <Input
                id="stage-name"
                autoFocus
                value={newStageName}
                onChange={handleNameChange}
                disabled={isSubmitting}
                className={`h-11 rounded-xl ${(localErrors.name || error) ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="e.g. Qualified, Negotiation..."
              />
              {(localErrors.name || (error && !localErrors.name)) && (
                <p className="text-xs text-red-500 font-medium pl-1">
                  {localErrors.name || error}
                </p>
              )}
            </div>

            {stages.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Positioning
                  </h3>
                  <div className="h-px flex-1 bg-gray-100" />
                </div>

                <p className="text-xs text-gray-500 italic">
                  Choose where to place the new stage in your pipeline. If no position is selected, it will be added at the end.
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="stage-position" className="text-sm font-medium text-gray-700">Relative to Stage</Label>
                    <Select
                      value={positionStageId}
                      onValueChange={(value: string) => handlePositionChange(value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="stage-position" className="h-11 rounded-xl border-gray-200">
                        <SelectValue placeholder="Add at the end" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {stages.map((stage, index) => (
                          <SelectItem key={`${stage.key}-${index}`} value={stage.key || ''}>
                            {getPositionText(stage, positionType)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {positionStageId && (
                    <div className="space-y-2">
                      <Label htmlFor="placement-type" className="text-sm font-medium text-gray-700">Placement</Label>
                      <Select
                        value={positionType}
                        onValueChange={(value: string) => handlePositionTypeChange(value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger id="placement-type" className="h-11 rounded-xl border-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="before">
                            Before "{stages.find(s => s.key === positionStageId)?.label || ''}"
                          </SelectItem>
                          <SelectItem value="after">
                            After "{stages.find(s => s.key === positionStageId)?.label || ''}"
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {getPositionPreview && (
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                {getPositionPreview()}
              </div>
            )}
          </div>
        </div>

        <DialogActions>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-xl px-8 h-11 font-bold bg-[#0B1957] hover:bg-[#0B1957]/90 text-white shadow-lg transition-all"
          >
            {isSubmitting ? 'Adding Stage...' : 'Add Stage'}
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
};
export default EnhancedAddStageDialog;
