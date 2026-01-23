import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Chip } from '@/components/ui/chip';
import { X } from 'lucide-react';
import { Stage } from '../store/slices/pipelineSlice';
interface StageColor {
  value: string;
  label: string;
}
interface AddStageDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (stage: Partial<Stage> & { name: string; color?: string; position?: number }) => void;
  stage?: Stage | null;
  stages?: Stage[];
}
const defaultStage = {
  name: '',
  description: '',
  color: '#6B75CA',
  position: 0
};
const stageColors: StageColor[] = [
  { value: '#6B75CA', label: 'Purple' },
  { value: '#4CAF50', label: 'Green' },
  { value: '#2196F3', label: 'Blue' },
  { value: '#FF9800', label: 'Orange' },
  { value: '#F44336', label: 'Red' },
  { value: '#9C27B0', label: 'Deep Purple' },
  { value: '#00BCD4', label: 'Cyan' },
  { value: '#FFEB3B', label: 'Yellow' }
];
const AddStageDialog: React.FC<AddStageDialogProps> = ({ 
  open, 
  onClose, 
  onSubmit, 
  stage, 
  stages = [] 
}) => {
  const [localStage, setLocalStage] = useState<typeof defaultStage>(defaultStage);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (stage) {
      setLocalStage({ ...defaultStage, ...stage });
    } else {
      // For new stages, set position to the end
      setLocalStage({
        ...defaultStage,
        position: stages.length
      });
    }
    setErrors({});
  }, [stage, stages.length, open]);
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!localStage.name.trim()) {
      newErrors.name = 'Stage name is required';
    } else if (stages.some(s => s.label?.toLowerCase() === localStage.name.toLowerCase() && s.key !== stage?.key)) {
      newErrors.name = 'Stage name must be unique';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async () => {
    if (validateForm()) {
      setLoading(true);
      try {
        onSubmit(localStage);
      } catch (error) {
        const err = error as Error;
        setErrors({ submit: err.message || 'Failed to save stage' });
      } finally {
        setLoading(false);
      }
    }
  };
  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="p-6 pt-2 max-h-[90vh] overflow-y-auto">
        <DialogTitle className="flex justify-between items-center">
          <span className="text-lg font-semibold text-[#3A3A4F]">
            {stage ? 'Edit Stage' : 'Add New Stage'}
          </span>
          <button
            onClick={onClose}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogTitle>
        <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <Label htmlFor="stage-name">Stage Name *</Label>
              <Input
                id="stage-name"
                autoFocus
                value={localStage.name}
                onChange={(e) => {
                  setLocalStage({ ...localStage, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="stage-description">Description</Label>
              <textarea
                id="stage-description"
                rows={2}
                value={localStage.description}
                onChange={(e) => setLocalStage({ ...localStage, description: e.target.value })}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <Label>Stage Color</Label>
              <div className="flex flex-wrap gap-2">
                {stageColors.map(color => (
                  <Badge
                    key={color.value}
                    onClick={() => setLocalStage({ ...localStage, color: color.value })}
                    className={`cursor-pointer transition-opacity hover:opacity-90 ${
                      localStage.color === color.value
                        ? 'ring-2 ring-blue-500 ring-offset-2'
                        : ''
                    }`}
                    style={{
                      backgroundColor: color.value,
                      color: '#fff'
                    }}
                  >
                    {color.label}
                  </Badge>
                ))}
              </div>
            </div>
            {errors.submit && (
              <p className="text-sm text-red-500">{errors.submit}</p>
            )}
          </div>
          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={onClose}
              disabled={loading}
              variant="outline"
              className="rounded-lg font-semibold bg-white text-[#3B82F6] border-[1.5px] border-[#EBF4FF] hover:bg-[#EBF4FF]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-lg shadow-md font-semibold bg-[#3B82F6] text-white hover:bg-[#2563EB]"
            >
              {loading ? 'Saving...' : (stage ? 'Update Stage' : 'Add Stage')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
  );
};
export default AddStageDialog;