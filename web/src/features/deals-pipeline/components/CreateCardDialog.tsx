import React, { useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Stage } from '../store/slices/pipelineSlice';
import { Lead } from '@/components/leads/types';
import { useSelector, useDispatch } from 'react-redux';
import { selectStatuses, selectPriorities, selectSources } from '@/store/slices/masterDataSlice';
import { selectUsers } from '@/store/slices/usersSlice';
import { 
  selectNewLead, 
  setNewLead, 
  resetNewLead
} from '@/store/slices/uiSlice';

interface CreateCardDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (leadData: Partial<Lead>) => Promise<void>;
  stages?: Stage[];
  leads?: Lead[];
}

const CreateCardDialog: React.FC<CreateCardDialogProps> = ({ 
  open, 
  onClose, 
  onCreate, 
  stages = [], 
  leads = [] 
}) => {
  const dispatch = useDispatch();
  
  // Get master data from Redux
  const statusOptions = useSelector(selectStatuses);
  const priorityOptions = useSelector(selectPriorities);
  const sourceOptions = useSelector(selectSources);
  
  // Get team members from Redux for assignee dropdown
  const teamMembers = useSelector(selectUsers);
  
  // Get form data from Redux global state
  const newLead = useSelector(selectNewLead);
  
  // Local state for creation loading
  const [isCreatingCard, setIsCreatingCard] = React.useState(false);

  // Get default values from master data
  const getDefaultStatus = (): string => {
    return statusOptions.length > 0 ? (statusOptions[0].key || '') : '';
  };
  
  const getDefaultSource = (): string => {
    const manualSource = sourceOptions.find(s => s.key === 'manual');
    return manualSource ? manualSource.key : (sourceOptions[0]?.key || '');
  };
  
  const getDefaultPriority = (): string => {
    const mediumPriority = priorityOptions.find(p => p.key === 'medium');
    return mediumPriority ? mediumPriority.key : (priorityOptions[0]?.key || '');
  };

  // Set default values when master data loads or component opens
  useEffect(() => {
    if (open && (!newLead.status || !newLead.source || !newLead.priority)) {
      dispatch(setNewLead({
        ...newLead,
        status: newLead.status || getDefaultStatus(),
        source: newLead.source || getDefaultSource(),
        priority: newLead.priority || getDefaultPriority()
      }));
    }
  }, [open, statusOptions, sourceOptions, priorityOptions, dispatch]);

  const handleCancel = () => {
    // Reset form data explicitly
    dispatch(resetNewLead());
    // Close dialog
    onClose();
  };

  const handleCreateCard = async () => {
    if (!newLead.name.trim()) {
      return;
    }
    if (!newLead.stage) {
      return;
    }

    setIsCreatingCard(true);
    try {
      // Only send fields that have values - filter out empty strings and undefined
      const leadData: Partial<Lead> = {};
      Object.entries(newLead).forEach(([key, value]) => {
        if (value !== '' && value !== undefined && value !== null) {
          (leadData as Record<string, unknown>)[key] = value;
        }
      });
      
      await onCreate(leadData);
      dispatch(resetNewLead());
      onClose();
    } catch (error) { 
      console.error('Failed to create lead:', error);
    } finally {
      setIsCreatingCard(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-6 pt-2 max-h-[90vh] overflow-y-auto">
        <DialogTitle>Create New Lead</DialogTitle>
        <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lead-name">Lead Name *</Label>
              <Input
                id="lead-name"
                type="text"
                placeholder="Enter lead name"
                value={newLead.name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch(setNewLead({ ...newLead, name: e.target.value }))}
                className={`w-full ${!newLead.name?.trim() ? 'border-red-500' : ''}`}
              />
              {!newLead.name?.trim() && (
                <p className="text-sm text-red-500">Name is required</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lead-email">Email</Label>
              <Input
                id="lead-email"
                type="email"
                value={newLead.email || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch(setNewLead({ ...newLead, email: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lead-phone">Phone</Label>
              <Input
                id="lead-phone"
                value={newLead.phone || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch(setNewLead({ ...newLead, phone: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lead-stage">Stage *</Label>
              <Select
                value={newLead.stage || undefined}
                onValueChange={(value: string) => dispatch(setNewLead({ ...newLead, stage: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages
                    .filter((stage) => stage.key && String(stage.key).trim() !== '')
                    .map((stage) => (
                      <SelectItem key={stage.key} value={String(stage.key)}>
                        {stage.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {!newLead.stage && (
                <p className="text-sm text-red-500">Stage is required</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lead-status">Status</Label>
              <Select
                value={newLead.status || undefined}
                onValueChange={(value: string) => dispatch(setNewLead({ ...newLead, status: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions
                    .filter((status) => status.key && String(status.key).trim() !== '')
                    .map((status) => (
                      <SelectItem key={status.key} value={String(status.key)}>
                        {status.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lead-priority">Priority</Label>
              <Select
                value={newLead.priority || undefined}
                onValueChange={(value: string) => dispatch(setNewLead({ ...newLead, priority: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select priority..." />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions
                    .filter((priority) => priority.key && String(priority.key).trim() !== '')
                    .map((priority) => (
                      <SelectItem key={priority.key} value={String(priority.key)}>
                        {priority.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lead-source">Source</Label>
              <Select
                value={newLead.source || undefined}
                onValueChange={(value: string) => dispatch(setNewLead({ ...newLead, source: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select source..." />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions
                    .filter((source) => source.key && String(source.key).trim() !== '')
                    .map((source) => (
                      <SelectItem key={source.key} value={String(source.key)}>
                        {source.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            {teamMembers && teamMembers.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="lead-assignee">Assignee</Label>
                <Select
                  value={newLead.assignee || 'unassigned'}
                  onValueChange={(value: string) => dispatch(setNewLead({ ...newLead, assignee: value === 'unassigned' ? '' : value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select assignee..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {teamMembers
                      .filter((member) => member.id)
                      .map((member) => (
                        <SelectItem key={member.id} value={String(member.id)}>
                          {member.name || member.email || 'Unknown'}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="lead-description">Description</Label>
              <Textarea
                id="lead-description"
                rows={3}
                value={newLead.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => dispatch(setNewLead({ ...newLead, description: e.target.value }))}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                onClick={handleCancel} 
                disabled={isCreatingCard}
                variant="outline"
                className="rounded-lg font-semibold bg-white text-[#3B82F6] border-[1.5px] border-[#EBF4FF] hover:bg-[#EBF4FF]"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateCard} 
                disabled={!newLead.name || !newLead.stage || isCreatingCard} 
                className="rounded-lg shadow-md font-semibold bg-[#3B82F6] text-white hover:bg-[#2563EB] disabled:opacity-50"
              >
                {isCreatingCard ? 'Creating...' : 'Create Lead'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
  );
};

export default CreateCardDialog;

