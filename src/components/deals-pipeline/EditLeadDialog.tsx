import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Chip } from '@/components/ui/chip';
import { useSelector, useDispatch } from 'react-redux';
import { selectStatuses, selectPriorities, selectSources } from '@/store/slices/masterDataSlice';
import { selectUsers } from '@/store/slices/usersSlice';
import { 
  selectEditingLead, 
  setEditingLead,
  resetEditingLead 
} from '@/store/slices/uiSlice';
import type { Lead } from '../types';
import { Stage } from '../store/slices/pipelineSlice';
interface EditLeadDialogProps {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSave: (lead: Lead) => void;
  stages: Stage[];
}
const EditLeadDialog: React.FC<EditLeadDialogProps> = ({ 
  open, 
  onClose, 
  lead, 
  onSave, 
  stages 
}) => {
  const dispatch = useDispatch();
  // Get master data options
  const statusOptions = useSelector(selectStatuses);
  const priorityOptions = useSelector(selectPriorities);
  const sourceOptions = useSelector(selectSources);
  const teamMembers = useSelector(selectUsers);
  // Get form data from Redux global state
  const editingLead = useSelector(selectEditingLead);
  // Local states that should remain local (component-specific)
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (lead) {
      dispatch(setEditingLead({
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phoneNumber || '',
        company: (lead as { company?: string }).company || '',
        stage: lead.stage || '',
        status: lead.status || '',
        priority: (lead as { priority?: string }).priority || '',
        source: (lead as { source?: string }).source || '',
        amount: String((lead as { amount?: number }).amount || ''),
        closeDate: (lead as { closeDate?: string | null }).closeDate || null,
        description: lead.bio || '',
        goals: Array.isArray((lead as { goals?: string[] }).goals) ? (lead as { goals?: string[] }).goals : [],
        labels: Array.isArray((lead as { labels?: string[] }).labels) ? (lead as { labels?: string[] }).labels : [],
      }));
    }
  }, [lead, dispatch]);
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!editingLead.name?.trim()) newErrors.name = 'Name is required';
    if (!editingLead.email?.trim()) newErrors.email = 'Email is required';
    if (!editingLead.stage) newErrors.stage = 'Stage is required';
    if (!editingLead.status) newErrors.status = 'Status is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (editingLead.email && !emailRegex.test(editingLead.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (editingLead.amount && isNaN(Number(editingLead.amount))) {
      newErrors.amount = 'Amount must be a number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = () => {
    if (validateForm() && lead) {
      onSave({
        ...lead,
        ...editingLead,
        email: editingLead.email,
        phoneNumber: editingLead.phone,
        company: editingLead.company,
        stage: editingLead.stage,
        status: editingLead.status,
        priority: editingLead.priority,
        source: editingLead.source,
        amount: editingLead.amount ? Number(editingLead.amount) : undefined,
        bio: editingLead.description,
        closeDate: editingLead.closeDate,
        goals: editingLead.goals,
        labels: editingLead.labels,
      } as Lead);
    }
  };
  const handleChange = (field: keyof typeof editingLead) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    dispatch(setEditingLead({
      ...editingLead,
      [field]: event.target.value,
    }));
    // Clear error when field is edited
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: '',
      });
    }
  };
  const handleSelectChange = (field: keyof typeof editingLead) => (value: string) => {
    dispatch(setEditingLead({
      ...editingLead,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: '',
      });
    }
  };
  const handleGoalsChange = (newGoals: string[]) => {
    dispatch(setEditingLead({
      ...editingLead,
      goals: newGoals,
    }));
  };
  const handleLabelsChange = (newLabels: string[]) => {
    dispatch(setEditingLead({
      ...editingLead,
      labels: newLabels,
    }));
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogTitle>Edit Lead</DialogTitle>
      <DialogContent className="p-6 pt-2">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500">Basic Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input
                    id="edit-name"
                    value={editingLead.name || ''}
                    onChange={handleChange('name')}
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingLead.email || ''}
                    onChange={handleChange('email')}
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={editingLead.phone || ''}
                    onChange={handleChange('phone')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-company">Company</Label>
                  <Input
                    id="edit-company"
                    value={editingLead.company || ''}
                    onChange={handleChange('company')}
                  />
                </div>
              </div>
            </div>
            {/* Pipeline & Deal Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500">Pipeline & Deal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status *</Label>
                  <Select
                    value={editingLead.status || undefined}
                    onValueChange={handleSelectChange('status')}
                  >
                    <SelectTrigger id="edit-status" className={errors.status ? 'border-red-500 w-full' : 'w-full'}>
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions
                        .filter((option) => option.key && String(option.key).trim() !== '')
                        .map((statusOption) => (
                          <SelectItem key={statusOption.key} value={String(statusOption.key)}>
                            {statusOption.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {errors.status && (
                    <p className="text-sm text-red-500">{errors.status}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-stage">Stage *</Label>
                  <Select
                    value={editingLead.stage || undefined}
                    onValueChange={handleSelectChange('stage')}
                  >
                    <SelectTrigger id="edit-stage" className={errors.stage ? 'border-red-500 w-full' : 'w-full'}>
                      <SelectValue placeholder="Select stage..." />
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
                  {errors.stage && (
                    <p className="text-sm text-red-500">{errors.stage}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-priority">Priority</Label>
                  <Select
                    value={editingLead.priority || undefined}
                    onValueChange={handleSelectChange('priority')}
                  >
                    <SelectTrigger id="edit-priority" className="w-full">
                      <SelectValue placeholder="Select priority..." />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions
                        .filter((option) => option.key && String(option.key).trim() !== '')
                        .map((priority) => (
                          <SelectItem key={priority.key} value={String(priority.key)}>
                            {priority.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-source">Lead Source</Label>
                  <Select
                    value={editingLead.source || undefined}
                    onValueChange={handleSelectChange('source')}
                  >
                    <SelectTrigger id="edit-source" className="w-full">
                      <SelectValue placeholder="Select source..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceOptions
                        .filter((option) => option.key && String(option.key).trim() !== '')
                        .map((source) => (
                          <SelectItem key={source.key} value={String(source.key)}>
                            {source.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-amount">Amount</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    value={editingLead.amount || ''}
                    onChange={handleChange('amount')}
                    className={errors.amount ? 'border-red-500' : ''}
                  />
                  {errors.amount && (
                    <p className="text-sm text-red-500">{errors.amount}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-close-date">Close Date</Label>
                  <Input
                    id="edit-close-date"
                    type="date"
                    value={editingLead.closeDate ? new Date(editingLead.closeDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      dispatch(setEditingLead({
                        ...editingLead,
                        closeDate: e.target.value || null,
                      }));
                    }}
                  />
                </div>
              </div>
            </div>
            {/* Description */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500">Additional Information</h3>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  rows={4}
                  value={editingLead.description || ''}
                  onChange={handleChange('description')}
                />
              </div>
            </div>
            {/* Goals and Labels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Goals</Label>
                <div className="flex flex-wrap gap-2">
                  {editingLead.goals?.map((goal, index) => (
                    <Chip key={index} variant="outline">
                      {goal}
                      <button
                        onClick={() => handleGoalsChange(editingLead.goals?.filter((_, i) => i !== index) || [])}
                        className="ml-2 text-xs"
                      >
                        ×
                      </button>
                    </Chip>
                  ))}
                  <Input
                    placeholder="Add goal"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        e.preventDefault();
                        handleGoalsChange([...(editingLead.goals || []), e.currentTarget.value.trim()]);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Labels</Label>
                <div className="flex flex-wrap gap-2">
                  {editingLead.labels?.map((label, index) => (
                    <Chip key={index} variant="outline">
                      {label}
                      <button
                        onClick={() => handleLabelsChange(editingLead.labels?.filter((_, i) => i !== index) || [])}
                        className="ml-2 text-xs"
                      >
                        ×
                      </button>
                    </Chip>
                  ))}
                  <Input
                    placeholder="Add label"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        e.preventDefault();
                        handleLabelsChange([...(editingLead.labels || []), e.currentTarget.value.trim()]);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogActions className="p-6 pt-2">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            className="bg-[#3B82F6] text-white hover:bg-[#2563EB]"
          >
            Save Changes
          </Button>
        </DialogActions>
    </Dialog>
  );
};
export default EditLeadDialog;