import React, { useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogHeader, DialogActions } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Stage } from '../store/slices/pipelineSlice';
import { Lead } from '@/components/leads/types';
import { Plus } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { selectStatuses, selectPriorities, selectSources } from '@/store/slices/masterDataSlice';
import { selectUsers } from '@/store/slices/usersSlice';
import { useAuth } from '@/contexts/AuthContext';
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
}) => {
  const dispatch = useDispatch();
  const { hasFeature } = useAuth();

  // Education vertical context
  const isEducation = hasFeature('education_vertical');

  // Dynamic labels based on vertical
  const labels = {
    entity: isEducation ? 'Student' : 'Lead',
    entityName: isEducation ? 'Student Name' : 'Lead Name',
    createTitle: isEducation ? 'Create New Student' : 'Create New Lead',
    createButton: isEducation ? 'Create Student' : 'Create Lead'
  };

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

  const handleCreateCard = async () => {
    if (!newLead.name.trim() || !newLead.stage) {
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
      <DialogContent className="sm:max-w-md overflow-hidden flex flex-col p-0 h-auto max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-50 text-blue-600 border border-blue-100 shadow-sm flex items-center justify-center w-10 h-10">
              <Plus className="h-6 w-6 stroke-[3px]" />
            </div>
            <DialogTitle>{labels.createTitle}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lead-name" className="text-sm font-medium text-gray-700">{labels.entityName} *</Label>
              <Input
                id="lead-name"
                type="text"
                placeholder={`Enter ${labels.entity.toLowerCase()} name`}
                value={newLead.name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch(setNewLead({ ...newLead, name: e.target.value }))}
                className={cn("h-11 rounded-xl", !newLead.name?.trim() && open ? 'border-red-500' : 'border-gray-200')}
              />
              {!newLead.name?.trim() && open && (
                <p className="text-xs text-red-500 font-medium pl-1">Name is required</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lead-email" className="text-sm font-medium text-gray-700">Email Address</Label>
                <Input
                  id="lead-email"
                  type="email"
                  placeholder="email@example.com"
                  value={newLead.email || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch(setNewLead({ ...newLead, email: e.target.value }))}
                  className="h-11 rounded-xl border-gray-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-phone" className="text-sm font-medium text-gray-700">Phone Number</Label>
                <Input
                  id="lead-phone"
                  placeholder="+1 (555) 000-0000"
                  value={newLead.phone || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch(setNewLead({ ...newLead, phone: e.target.value }))}
                  className="h-11 rounded-xl border-gray-200"
                />
              </div>
            </div>

            {/* Education-specific fields */}
            {isEducation && (
              <div className="space-y-6 pt-2 border-t border-gray-100">
                <div className="space-y-2">
                  <Label htmlFor="program" className="text-sm font-medium text-gray-700">Academic Program</Label>
                  <Input
                    id="program"
                    placeholder="e.g., Computer Science, Business Administration"
                    value={newLead.program || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch(setNewLead({ ...newLead, program: e.target.value }))}
                    className="h-11 rounded-xl border-gray-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="intake-year" className="text-sm font-medium text-gray-700">Intake Year</Label>
                    <Select
                      value={newLead.intakeYear || undefined}
                      onValueChange={(value: string) => dispatch(setNewLead({ ...newLead, intakeYear: value }))}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-gray-200">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2026">2026</SelectItem>
                        <SelectItem value="2027">2027</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gpa" className="text-sm font-medium text-gray-700">Current GPA</Label>
                    <Input
                      id="gpa"
                      type="number"
                      step="0.1"
                      min="0"
                      max="4.0"
                      placeholder="e.g., 3.8"
                      value={newLead.gpa || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch(setNewLead({ ...newLead, gpa: e.target.value }))}
                      className="h-11 rounded-xl border-gray-200"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="previous-education" className="text-sm font-medium text-gray-700">Previous Education</Label>
                  <Input
                    id="previous-education"
                    type="text"
                    placeholder="e.g., Bachelor's in Engineering"
                    value={newLead.previousEducation || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch(setNewLead({ ...newLead, previousEducation: e.target.value }))}
                    className="h-11 rounded-xl border-gray-200"
                  />
                </div>
                
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Counselling Session</h3>
                    <div className="h-px flex-1 bg-gray-100" />
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="preferred-counsellor" className="text-sm font-medium text-gray-700">Preferred Counsellor</Label>
                      <Select
                        value={newLead.preferredCounsellor || undefined}
                        onValueChange={(value: string) => dispatch(setNewLead({ ...newLead, preferredCounsellor: value }))}
                      >
                        <SelectTrigger className="h-11 rounded-xl border-gray-200">
                          <SelectValue placeholder="Select counsellor" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {teamMembers.filter(member => member.role === 'counsellor' || member.role === 'admin' || member.role === 'owner').map(member => (
                            <SelectItem key={member.id} value={member.id || ''}>
                              {member.name || `${member.firstName} ${member.lastName}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preferred-time" className="text-sm font-medium text-gray-700">Preferred Session Time</Label>
                      <Select
                        value={newLead.preferredTime || undefined}
                        onValueChange={(value: string) => dispatch(setNewLead({ ...newLead, preferredTime: value }))}
                      >
                        <SelectTrigger className="h-11 rounded-xl border-gray-200">
                          <SelectValue placeholder="Select time slot" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="morning">Morning (9:00 - 12:00)</SelectItem>
                          <SelectItem value="afternoon">Afternoon (12:00 - 17:00)</SelectItem>
                          <SelectItem value="evening">Evening (17:00 - 20:00)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="session-notes" className="text-sm font-medium text-gray-700">Session Notes</Label>
                      <Textarea
                        id="session-notes"
                        placeholder="Any specific topics or concerns to discuss..."
                        value={newLead.sessionNotes || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => dispatch(setNewLead({ ...newLead, sessionNotes: e.target.value }))}
                        rows={3}
                        className="rounded-xl border-gray-200 resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Pipeline Details</h3>
                <div className="h-px flex-1 bg-gray-100" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lead-stage" className="text-sm font-medium text-gray-700">Stage *</Label>
                  <Select
                    value={newLead.stage || undefined}
                    onValueChange={(value: string) => dispatch(setNewLead({ ...newLead, stage: value }))}
                  >
                    <SelectTrigger className={cn("h-11 rounded-xl border-gray-200", !newLead.stage && open && "border-red-500")}>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {stages
                        .filter((stage) => stage.key && String(stage.key).trim() !== '')
                        .map((stage) => (
                          <SelectItem key={stage.key} value={String(stage.key)}>
                            {stage.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {!newLead.stage && open && (
                    <p className="text-xs text-red-500 font-medium pl-1">Stage is required</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-status" className="text-sm font-medium text-gray-700">Status</Label>
                  <Select
                    value={newLead.status || undefined}
                    onValueChange={(value: string) => dispatch(setNewLead({ ...newLead, status: value }))}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-gray-200">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lead-priority" className="text-sm font-medium text-gray-700">Priority</Label>
                  <Select
                    value={newLead.priority || undefined}
                    onValueChange={(value: string) => dispatch(setNewLead({ ...newLead, priority: value }))}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-gray-200">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
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
                  <Label htmlFor="lead-source" className="text-sm font-medium text-gray-700">Lead Source</Label>
                  <Select
                    value={newLead.source || undefined}
                    onValueChange={(value: string) => dispatch(setNewLead({ ...newLead, source: value }))}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-gray-200">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
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
              </div>

              {teamMembers && teamMembers.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="lead-assignee" className="text-sm font-medium text-gray-700">Assigned To</Label>
                  <Select
                    value={newLead.assignee || 'unassigned'}
                    onValueChange={(value: string) => dispatch(setNewLead({ ...newLead, assignee: value === 'unassigned' ? '' : value }))}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-gray-200">
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {teamMembers
                        .filter((member) => member.id)
                        .map((member) => (
                          <SelectItem key={member.id} value={String(member.id)}>
                            {member.name || member.email || 'Unknown User'}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="lead-description" className="text-sm font-medium text-gray-700">Internal Description / Notes</Label>
              <Textarea
                id="lead-description"
                placeholder="Enter any additional details about this lead..."
                rows={3}
                value={newLead.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => dispatch(setNewLead({ ...newLead, description: e.target.value }))}
                className="rounded-xl border-gray-200 resize-none min-h-[100px]"
              />
            </div>
          </div>
        </div>

        <DialogActions>
          <Button
            onClick={handleCreateCard}
            disabled={!newLead.name || !newLead.stage || isCreatingCard}
            className="rounded-xl px-8 h-11 font-bold bg-[#0B1957] hover:bg-[#0B1957]/90 text-white shadow-lg transition-all"
          >
            {isCreatingCard ? 'Creating...' : labels.createButton}
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCardDialog;
