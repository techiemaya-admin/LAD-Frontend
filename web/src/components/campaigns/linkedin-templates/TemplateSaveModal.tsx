'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/app-toaster';
import { useCreateLinkedInMessageTemplate } from '@lad/frontend-features/campaigns';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import type { CreateLinkedInTemplateRequest } from '@lad/frontend-features/campaigns';

interface TemplateSaveModalProps {
  open: boolean;
  onClose: () => void;
  connectionMessage: string;
  followupMessage: string;
  onTemplateSaved?: (templateId: string) => void;
}

export default function TemplateSaveModal({
  open,
  onClose,
  connectionMessage,
  followupMessage,
  onTemplateSaved,
}: TemplateSaveModalProps) {
  const { push } = useToast();
  const createMutation = useCreateLinkedInMessageTemplate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'sales' as const,
    is_default: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }

    if (!connectionMessage.trim() && !followupMessage.trim()) {
      newErrors.messages = 'At least one message (connection or followup) must be provided';
    }

    if (connectionMessage.length > 300) {
      newErrors.connection = 'Connection message must be 300 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const request: CreateLinkedInTemplateRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        connection_message: connectionMessage.trim() || undefined,
        followup_message: followupMessage.trim() || undefined,
        category: formData.category,
        is_default: formData.is_default,
        is_active: true,
      };

      const result = await createMutation.mutateAsync(request);

      push({
        variant: 'success',
        title: 'Template Saved',
        description: `"${formData.name}" has been saved successfully.`,
      });

      if (onTemplateSaved) {
        onTemplateSaved(result.id);
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        category: 'sales',
        is_default: false,
      });
      setErrors({});
      onClose();
    } catch (error: any) {
      push({
        variant: 'error',
        title: 'Save Failed',
        description: error?.message || 'Failed to save template. Please try again.',
      });
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      category: 'sales',
      is_default: false,
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save as Template
          </DialogTitle>
          <DialogDescription>
            Save your LinkedIn messages as a reusable template
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Name */}
          <div className="space-y-2">
            <Label htmlFor="template-name">
              Template Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="template-name"
              placeholder="e.g., Sales Outreach - Enterprise"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="template-description">Description (Optional)</Label>
            <Textarea
              id="template-description"
              placeholder="Brief description of when to use this template..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="template-category">Category</Label>
            <select
              id="template-category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full h-9 px-3 py-2 text-sm border border-input rounded-md bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="sales">Sales</option>
              <option value="recruiting">Recruiting</option>
              <option value="networking">Networking</option>
              <option value="partnership">Partnership</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Preview Messages */}
          <div className="space-y-2 p-3 bg-gray-50 rounded-md border">
            <Label className="text-xs font-semibold text-gray-700">Template Preview:</Label>
            
            {connectionMessage && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-600">Connection Message:</p>
                <p className="text-xs text-gray-800 bg-white p-2 rounded border">
                  {connectionMessage}
                </p>
                <p className="text-xs text-gray-500">
                  {connectionMessage.length}/300 characters
                </p>
              </div>
            )}

            {followupMessage && (
              <div className="space-y-1 mt-2">
                <p className="text-xs font-medium text-gray-600">Followup Message:</p>
                <p className="text-xs text-gray-800 bg-white p-2 rounded border">
                  {followupMessage}
                </p>
              </div>
            )}

            {errors.messages && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.messages}
              </p>
            )}
            {errors.connection && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.connection}
              </p>
            )}
          </div>

          {/* Set as Default */}
          <div className="flex items-center justify-between p-3 border rounded-md">
            <div className="space-y-0.5">
              <Label htmlFor="is-default" className="text-sm font-medium">
                Set as Default Template
              </Label>
              <p className="text-xs text-muted-foreground">
                This will be used automatically for new campaigns
              </p>
            </div>
            <Switch
              id="is-default"
              checked={formData.is_default}
              onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
