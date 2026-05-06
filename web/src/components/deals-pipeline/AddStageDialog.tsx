import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogHeader, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { Stage } from '../store/slices/pipelineSlice';
import { cn } from '@/lib/utils';

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
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="flex flex-col p-0 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-full bg-orange-50 border border-orange-100 shadow-sm flex items-center justify-center w-10 h-10">
              <Plus className="h-6 w-6 text-orange-600 stroke-[3px]" />
            </div>
            <DialogTitle>{stage ? 'Edit Stage' : 'Add New Stage'}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Stage Name</label>
              <Input
                placeholder="e.g. Discovery, Negotiation, etc."
                autoFocus
                value={localStage.name}
                onChange={(e) => {
                  setLocalStage({ ...localStage, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                className={cn(
                  "h-11 rounded-xl border-gray-100 bg-gray-50/50",
                  errors.name && "border-red-500 bg-red-50/30"
                )}
              />
              {errors.name && (
                <p className="text-xs text-red-500 font-medium">{errors.name}</p>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Stage Color</label>
              <div className="flex flex-wrap gap-2">
                {stageColors.map((color) => (
                  <Badge
                    key={color.value}
                    variant="outline"
                    className={cn(
                      'px-3 py-1.5 rounded-xl cursor-pointer transition-all border-2 text-xs font-bold',
                      localStage.color === color.value
                        ? `shadow-md scale-105 border-orange-400`
                        : `border-transparent opacity-60 hover:opacity-100 hover:scale-105`
                    )}
                    style={{
                      backgroundColor: color.value,
                      color: '#fff',
                      borderColor: localStage.color === color.value ? undefined : 'transparent'
                    }}
                    onClick={() => setLocalStage({ ...localStage, color: color.value })}
                  >
                    {color.label}
                  </Badge>
                ))}
              </div>
            </div>
            {errors.submit && (
              <p className="text-sm text-red-500 font-medium">{errors.submit}</p>
            )}
          </div>
        </div>

        <DialogActions>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-xl px-8 py-2.5 font-bold bg-[#0B1957] hover:bg-[#0B1957]/90 text-white shadow-lg transition-all"
          >
            {loading ? 'Saving...' : (stage ? 'Update Stage' : 'Add Stage')}
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
};

export default AddStageDialog;
