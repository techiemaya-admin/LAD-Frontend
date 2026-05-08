import React, { useState, useEffect } from 'react';
import { Edit } from 'lucide-react';
import { Dialog, DialogTitle, DialogContent, DialogActions, DialogHeader } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
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
        title:
          (lead as { title?: string }).title ||
          (lead as any)?.raw_data?._full_data?.title ||
          '',
        company:
          (lead as { company?: string }).company ||
          (lead as { company_name?: string }).company_name ||
          // Nested raw data from enrichment providers
          (lead as any)?.raw_data?.company_name ||
          (lead as any)?.raw_data?._full_data?.company_name ||
          (lead as any)?.raw_data?._full_data?.organization?.name ||
          '',
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
        title: editingLead.title,
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
      <DialogContent className="sm:w-[90vw] overflow-hidden flex flex-col p-0 h-auto max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-50 text-blue-600 border border-blue-100 shadow-sm flex items-center justify-center w-10 h-10">
              <Edit className="h-5 w-5 stroke-[2.5px]" />
            </div>
            <DialogTitle>Edit Lead Details</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Basic Information</h3>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-sm font-medium text-gray-700">Name *</Label>
                <Input
                  id="edit-name"
                  value={editingLead.name || ''}
                  onChange={handleChange('name')}
                  className={cn("h-11 rounded-xl", errors.name ? 'border-red-500' : 'border-gray-200')}
                />
                {errors.name && (
                  <p className="text-xs text-red-500 font-medium pl-1">{errors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email" className="text-sm font-medium text-gray-700">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingLead.email || ''}
                  onChange={handleChange('email')}
                  className={cn("h-11 rounded-xl", errors.email ? 'border-red-500' : 'border-gray-200')}
                />
                {errors.email && (
                  <p className="text-xs text-red-500 font-medium pl-1">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-title" className="text-sm font-medium text-gray-700">Job Title</Label>
                <Input
                  id="edit-title"
                  placeholder="e.g. CEO, Sales Manager"
                  value={editingLead.title || ''}
                  onChange={handleChange('title')}
                  className="h-11 rounded-xl border-gray-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone" className="text-sm font-medium text-gray-700">Phone Number</Label>
                <Input
                  id="edit-phone"
                  placeholder="+1 (555) 000-0000"
                  value={editingLead.phone || ''}
                  onChange={handleChange('phone')}
                  className="h-11 rounded-xl border-gray-200"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-company" className="text-sm font-medium text-gray-700">Company Name</Label>
                <Input
                  id="edit-company"
                  placeholder="Acme Corp"
                  value={editingLead.company || ''}
                  onChange={handleChange('company')}
                  className="h-11 rounded-xl border-gray-200"
                />
              </div>
            </div>
          </div>

          {/* Pipeline & Deal Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Pipeline & Deal Information</h3>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="edit-status" className="text-sm font-medium text-gray-700">Status *</Label>
                <Select
                  value={editingLead.status || undefined}
                  onValueChange={handleSelectChange('status')}
                >
                  <SelectTrigger id="edit-status" className={cn("h-11 rounded-xl border-gray-200", errors.status && 'border-red-500')}>
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
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
                  <p className="text-xs text-red-500 font-medium pl-1">{errors.status}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-stage" className="text-sm font-medium text-gray-700">Stage *</Label>
                <Select
                  value={editingLead.stage || undefined}
                  onValueChange={handleSelectChange('stage')}
                >
                  <SelectTrigger id="edit-stage" className={cn("h-11 rounded-xl border-gray-200", errors.stage && 'border-red-500')}>
                    <SelectValue placeholder="Select stage..." />
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
                {errors.stage && (
                  <p className="text-xs text-red-500 font-medium pl-1">{errors.stage}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-priority" className="text-sm font-medium text-gray-700">Priority</Label>
                <Select
                  value={editingLead.priority || undefined}
                  onValueChange={handleSelectChange('priority')}
                >
                  <SelectTrigger id="edit-priority" className="h-11 rounded-xl border-gray-200">
                    <SelectValue placeholder="Select priority..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
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
                <Label htmlFor="edit-source" className="text-sm font-medium text-gray-700">Lead Source</Label>
                <Select
                  value={editingLead.source || undefined}
                  onValueChange={handleSelectChange('source')}
                >
                  <SelectTrigger id="edit-source" className="h-11 rounded-xl border-gray-200">
                    <SelectValue placeholder="Select source..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
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
                <Label htmlFor="edit-amount" className="text-sm font-medium text-gray-700">Deal Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                  <Input
                    id="edit-amount"
                    type="number"
                    placeholder="0.00"
                    value={editingLead.amount || ''}
                    onChange={handleChange('amount')}
                    className={cn("h-11 pl-7 rounded-xl border-gray-200", errors.amount && 'border-red-500')}
                  />
                </div>
                {errors.amount && (
                  <p className="text-xs text-red-500 font-medium pl-1">{errors.amount}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-close-date" className="text-sm font-medium text-gray-700">Expected Close Date</Label>
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
                  className="h-11 rounded-xl border-gray-200"
                />
              </div>
            </div>
          </div>

          {/* Audit Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Audit History</h3>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Original Name</p>
                <p className="text-sm font-semibold text-gray-700 truncate">{lead?.name || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Original Company</p>
                <p className="text-sm font-semibold text-gray-700 truncate">{lead?.company_name || lead?.company || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Original Stage</p>
                <p className="text-sm font-semibold text-gray-700 truncate">{lead?.stage || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Last Updated</p>
                <p className="text-sm font-semibold text-gray-700">{lead?.updated_at ? new Date(lead.updated_at).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Created Date</p>
                <p className="text-sm font-semibold text-gray-700">{lead?.created_at ? new Date(lead.created_at).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        <DialogActions>
          <Button
            onClick={handleSubmit}
            className="rounded-xl px-8 h-11 font-bold bg-[#0B1957] hover:bg-[#0B1957]/90 text-white shadow-lg transition-all"
          >
            Save Changes
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
};
export default EditLeadDialog;
