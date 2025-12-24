import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select } from '../../../components/ui/select';
import { X } from 'lucide-react';
import { Stage } from '../../store/slices/pipelineSlice';

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
    <Dialog open={open} onOpenChange={!isSubmitting ? onClose : undefined}>
      <DialogTitle className="flex justify-between items-center">
        <span className="text-lg font-semibold text-[#3A3A4F]">
          Add New Stage
        </span>
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>
      </DialogTitle>

      <DialogContent className="p-6 pt-2">
          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <Label htmlFor="stage-name">Stage Name *</Label>
              <Input
                id="stage-name"
                autoFocus
                value={newStageName}
                onChange={handleNameChange}
                disabled={isSubmitting}
                className={`rounded-lg ${(localErrors.name || error) ? 'border-red-500' : ''}`}
              />
              {(localErrors.name || (error && !localErrors.name)) && (
                <p className="text-sm text-red-500">
                  {localErrors.name || error}
                </p>
              )}
            </div>

            {stages.length > 0 && (
              <>
                <p className="text-sm text-gray-500 -mt-4 -mb-4">
                  Choose where to place the new stage in your pipeline. If no position is selected, the stage will be added at the end.
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="stage-position">Stage Position</Label>
                  <Select
                    id="stage-position"
                    value={positionStageId}
                    onChange={(e) => handlePositionChange(e.target.value)}
                    disabled={isSubmitting}
                    className={`rounded-lg ${localErrors.position ? 'border-red-500' : ''}`}
                  >
                    <option value="">Add at the end (after all stages)</option>
                    {stages.map((stage) => (
                      <option key={stage.key} value={stage.key}>
                        {getPositionText(stage, positionType)}
                      </option>
                    ))}
                  </Select>
                  {localErrors.position && (
                    <p className="text-sm text-red-500">{localErrors.position}</p>
                  )}
                </div>
              </>
            )}

            {positionStageId && (
              <div className="space-y-2">
                <Label htmlFor="placement-type">Placement</Label>
                <Select
                  id="placement-type"
                  value={positionType}
                  onChange={(e) => handlePositionTypeChange(e.target.value)}
                  disabled={isSubmitting}
                  className="rounded-lg"
                >
                  <option value="before">
                    Before "{stages.find(s => s.key === positionStageId)?.label || ''}"
                  </option>
                  <option value="after">
                    After "{stages.find(s => s.key === positionStageId)?.label || ''}"
                  </option>
                </Select>
              </div>
            )}

            {getPositionPreview && getPositionPreview()}

            {error && !localErrors.name && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>
        </DialogContent>

        <DialogActions className="p-6 pt-2">
          <Button
            onClick={onClose}
            disabled={isSubmitting}
            variant="outline"
            className="rounded-lg font-semibold bg-white text-[#3B82F6] border-[1.5px] border-[#EBF4FF] hover:bg-[#EBF4FF]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-lg shadow-md font-semibold bg-[#3B82F6] text-white hover:bg-[#2563EB]"
          >
            {isSubmitting ? 'Adding Stage...' : 'Add Stage'}
          </Button>
        </DialogActions>
    </Dialog>
  );
};

export default EnhancedAddStageDialog;

