import React, { useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { Stage } from '../../../store/slices/pipelineSlice';
import { Lead } from './leads/types';
import { useSelector, useDispatch } from 'react-redux';
import { selectStatuses, selectPriorities, selectSources } from '../../../store/slices/masterDataSlice';
import { selectUsers } from '../../../store/slices/usersSlice';
import { 
  selectNewLead, 
  setNewLead, 
  resetNewLead
} from '../../../store/slices/uiSlice';

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
      <DialogTitle>Create New Lead</DialogTitle>
      <DialogContent className="p-6 pt-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lead-name">Lead Name *</Label>
              <Input
                id="lead-name"
                type="text"
                placeholder="Enter lead name"
                value={newLead.name || ''}
                onChange={(e) => dispatch(setNewLead({ ...newLead, name: e.target.value }))}
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
                onChange={(e) => dispatch(setNewLead({ ...newLead, email: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lead-phone">Phone</Label>
              <Input
                id="lead-phone"
                value={newLead.phone || ''}
                onChange={(e) => dispatch(setNewLead({ ...newLead, phone: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lead-stage">Stage *</Label>
              <Select
                id="lead-stage"
                value={newLead.stage || ''}
                onChange={(e) => dispatch(setNewLead({ ...newLead, stage: e.target.value }))}
                className={!newLead.stage ? 'border-red-500' : ''}
              >
                <option value="">Select a stage</option>
                {stages.map((stage) => (
                  <option key={stage.key} value={stage.key}>
                    {stage.label}
                  </option>
                ))}
              </Select>
              {!newLead.stage && (
                <p className="text-sm text-red-500">Stage is required</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lead-status">Status</Label>
              <Select
                id="lead-status"
                value={newLead.status || ''}
                onChange={(e) => dispatch(setNewLead({ ...newLead, status: e.target.value }))}
              >
                {statusOptions.map((status) => (
                  <option key={status.key} value={status.key}>
                    {status.label}
                  </option>
                ))}
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lead-priority">Priority</Label>
              <Select
                id="lead-priority"
                value={newLead.priority || ''}
                onChange={(e) => dispatch(setNewLead({ ...newLead, priority: e.target.value }))}
              >
                {priorityOptions.map((priority) => (
                  <option key={priority.key} value={priority.key}>
                    {priority.label}
                  </option>
                ))}
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lead-source">Source</Label>
              <Select
                id="lead-source"
                value={newLead.source || ''}
                onChange={(e) => dispatch(setNewLead({ ...newLead, source: e.target.value }))}
              >
                {sourceOptions.map((source) => (
                  <option key={source.key} value={source.key}>
                    {source.label}
                  </option>
                ))}
              </Select>
            </div>
            
            {teamMembers && teamMembers.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="lead-assignee">Assignee</Label>
                <Select
                  id="lead-assignee"
                  value={newLead.assignee || ''}
                  onChange={(e) => dispatch(setNewLead({ ...newLead, assignee: e.target.value }))}
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="lead-description">Description</Label>
              <Textarea
                id="lead-description"
                rows={3}
                value={newLead.description || ''}
                onChange={(e) => dispatch(setNewLead({ ...newLead, description: e.target.value }))}
              />
            </div>
          </div>
        </DialogContent>
        <DialogActions className="p-6 pt-2">
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
        </DialogActions>
    </Dialog>
  );
};

export default CreateCardDialog;

