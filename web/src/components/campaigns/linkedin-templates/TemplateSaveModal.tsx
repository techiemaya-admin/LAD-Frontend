'use client';

import React, { useState, useEffect } from 'react';
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
import {
  useCreateLinkedInMessageTemplate,
  LINKEDIN_TEMPLATE_TYPES,
  LINKEDIN_CONNECTION_MESSAGE_MAX_LENGTH,
} from '@lad/frontend-features/campaigns';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import type { CreateLinkedInTemplateRequest } from '@lad/frontend-features/campaigns';

const CONNECTION_TYPE = 'linkedin_connection';

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
    templateType: CONNECTION_TYPE as string,
    is_default: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const isConnection = formData.templateType === CONNECTION_TYPE;
  // The single body saved is the composed message that matches the chosen type.
  const body = isConnection ? connectionMessage : followupMessage;

  // Preselect the type based on which message the builder actually has.
  useEffect(() => {
    if (!open) return;
    const preferred = connectionMessage.trim()
      ? CONNECTION_TYPE
      : followupMessage.trim()
        ? 'linkedin_followup'
        : CONNECTION_TYPE;
    setFormData((f) => ({ ...f, templateType: preferred }));
  }, [open, connectionMessage, followupMessage]);

  const reset = () => {
    setFormData({ name: '', description: '', templateType: CONNECTION_TYPE, is_default: false });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }
    if (!body.trim()) {
      newErrors.messages = isConnection
        ? 'A connection request message is required'
        : 'A follow-up message is required';
    }
    if (isConnection && body.length > LINKEDIN_CONNECTION_MESSAGE_MAX_LENGTH) {
      newErrors.connection = `Connection request message must be ${LINKEDIN_CONNECTION_MESSAGE_MAX_LENGTH} characters or less`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const request: CreateLinkedInTemplateRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category: formData.templateType,
        content: body.trim() || undefined,
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

      reset();
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
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen: boolean) => !isOpen && handleClose()}>
      <DialogContent className="">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save as Template
          </DialogTitle>
          <DialogDescription>
            Save this LinkedIn message as a reusable template
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

          {/* Template type */}
          <div className="space-y-2">
            <Label htmlFor="template-type">Use this template for</Label>
            <select
              id="template-type"
              value={formData.templateType}
              onChange={(e) => setFormData({ ...formData, templateType: e.target.value })}
              className="w-full h-9 px-3 py-2 text-sm border border-input rounded-md bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {LINKEDIN_TEMPLATE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Preview */}
          <div className="space-y-2 p-3 bg-gray-50 rounded-md border">
            <Label className="text-xs font-semibold text-gray-700">Template Preview:</Label>
            {body ? (
              <div className="space-y-1">
                <p className="text-xs text-gray-800 bg-white p-2 rounded border whitespace-pre-wrap">{body}</p>
                {isConnection && (
                  <p className="text-xs text-gray-500">
                    {body.length}/{LINKEDIN_CONNECTION_MESSAGE_MAX_LENGTH} characters
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">
                No {isConnection ? 'connection request' : 'follow-up'} message to save yet.
              </p>
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
              onCheckedChange={(checked: boolean) => setFormData({ ...formData, is_default: checked })}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-end">
          <Button
            type="button"
            onClick={handleSave}
            disabled={createMutation.isPending}
            className="px-8 bg-[#0B1957] hover:bg-[#0B1957]/90 text-white rounded-xl"
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
