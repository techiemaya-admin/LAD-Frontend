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
  useCreateInstagramMessageTemplate,
  useUpdateInstagramMessageTemplate,
  INSTAGRAM_DM_RECOMMENDED_MAX_LENGTH,
} from '@lad/frontend-features/campaigns';
import type {
  InstagramMessageTemplate,
  CreateInstagramTemplateRequest,
} from '@lad/frontend-features/campaigns';
import { Loader2, Save, AlertCircle, Instagram } from 'lucide-react';

interface CreateInstagramTemplateModalProps {
  open: boolean;
  onClose: () => void;
  /** When provided, the modal edits this template instead of creating a new one */
  editing?: InstagramMessageTemplate | null;
}

export default function CreateInstagramTemplateModal({
  open,
  onClose,
  editing,
}: CreateInstagramTemplateModalProps) {
  const { push } = useToast();
  const createMutation = useCreateInstagramMessageTemplate();
  const updateMutation = useUpdateInstagramMessageTemplate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setDescription(editing?.description ?? '');
    setContent(editing?.content ?? '');
    setMediaUrl((editing?.metadata?.media_url as string) ?? '');
    setIsDefault(editing?.is_default ?? false);
    setErrors({});
  }, [open, editing]);

  const saving = createMutation.isPending || updateMutation.isPending;
  const overLimit = content.length > INSTAGRAM_DM_RECOMMENDED_MAX_LENGTH;

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Template name is required';
    if (!content.trim()) e.content = 'Message body is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const payload: CreateInstagramTemplateRequest = {
      name: name.trim(),
      content: content.trim(),
      description: description.trim() || undefined,
      media_url: mediaUrl.trim() || undefined,
      is_default: isDefault,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: payload });
        push({ variant: 'success', title: 'Template Updated', description: `"${name}" has been updated.` });
      } else {
        await createMutation.mutateAsync(payload);
        push({ variant: 'success', title: 'Template Saved', description: `"${name}" has been created.` });
      }
      onClose();
    } catch (err: any) {
      push({
        variant: 'error',
        title: editing ? 'Update Failed' : 'Save Failed',
        description: err?.message || 'Something went wrong. Please try again.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-md:p-4 max-md:bg-white max-md:text-slate-900 max-md:border-slate-200 max-md:rounded-2xl dark:max-md:bg-[#020617] dark:max-md:text-white dark:max-md:border-slate-800/80 max-md:[&>button]:top-5 max-md:[&>button]:right-4 max-md:[&>button]:bg-slate-100 max-md:[&>button]:p-1.5 max-md:[&>button]:rounded-lg max-md:[&>button]:border max-md:[&>button]:border-slate-200 dark:max-md:[&>button]:bg-slate-900/80 dark:max-md:[&>button]:border-slate-800">
        
        {/* Header */}
        <DialogHeader className="max-md:pb-5 max-md:pt-1 max-md:border-b max-md:border-slate-200 dark:max-md:bg-[#020617] dark:max-md:border-slate-800/80">
          <div className="flex items-center gap-3 pr-10">
            {/* Instagram Icon */}
            <div className="p-2.5 rounded-full bg-gradient-to-br from-[#F58529]/15 via-[#DD2A7B]/15 to-[#8134AF]/15 text-[#DD2A7B] border border-[#DD2A7B]/20 flex items-center justify-center w-10 h-10 shrink-0 max-md:bg-gradient-to-br max-md:from-[#f9ce34] max-md:via-[#ee2a7b] max-md:to-[#6228d7] max-md:text-white max-md:border-none">
              <Instagram className="h-5 w-5" />
            </div>

            <div className="flex flex-col text-left">
              <DialogTitle className="max-md:text-base max-md:font-bold max-md:text-slate-900 dark:max-md:text-white">
                {editing ? 'Edit Instagram Template' : 'New Instagram Template'}
              </DialogTitle>
              <DialogDescription className="max-md:text-xs max-md:text-slate-500 dark:max-md:text-slate-400">
                Reusable Instagram DM — no Meta approval required
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="space-y-4 px-8 py-4 max-md:px-2 max-md:py-4">
          
          {/* Template Name */}
          <div className="space-y-1.5">
            <Label htmlFor="ig-name" className="max-md:text-xs max-md:font-semibold max-md:text-slate-700 dark:max-md:text-slate-200">
              Template Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ig-name"
              placeholder="e.g. Welcome DM"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`max-md:bg-slate-50 max-md:h-10 max-md:border-slate-200 max-md:rounded-lg max-md:text-sm max-md:text-slate-900 max-md:placeholder:text-slate-400 dark:max-md:bg-[#020922] dark:max-md:border-slate-800 dark:max-md:text-white dark:max-md:placeholder:text-slate-600 ${
                errors.name ? 'border-red-500' : ''
              }`}
            />
            {errors.name && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {errors.name}
              </p>
            )}
          </div>

          {/* Message Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="ig-content" className="max-md:text-xs max-md:font-semibold max-md:text-slate-700 dark:max-md:text-slate-200">
                Message Body <span className="text-red-500">*</span>
              </Label>
              <span className={`text-xs ${overLimit ? 'text-amber-600' : 'text-muted-foreground max-md:text-slate-500 dark:max-md:text-slate-400'}`}>
                {content.length}{overLimit ? ` · long DMs convert poorly` : ' characters'}
              </span>
            </div>
            <Textarea
              id="ig-content"
              placeholder={'Hey {{first_name}}! 👋 Saw you follow {{company}} — wanted to reach out…'}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className={`resize-none text-sm max-md:bg-slate-50 max-md:border-slate-200 max-md:rounded-lg max-md:text-slate-900 max-md:placeholder:text-slate-400 dark:max-md:bg-[#020922] dark:max-md:border-slate-800 dark:max-md:text-slate-200 dark:max-md:placeholder:text-slate-600 ${
                errors.content ? 'border-red-500' : ''
              }`}
            />
            {errors.content && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {errors.content}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground max-md:text-slate-500 dark:max-md:text-slate-400 max-md:flex max-md:items-center max-md:gap-1.5 max-md:flex-wrap">
              Use{' '}
              <code className="px-1.5 py-0.5 rounded max-md:bg-blue-50 max-md:border max-md:border-blue-200 max-md:text-[#0A66C2] max-md:font-medium dark:max-md:bg-[#031548] dark:max-md:border-[#0A66C2]/40 dark:max-md:text-[#3b82f6]">
                {'{{first_name}}'}
              </code>
              ,{' '}
              <code className="px-1.5 py-0.5 rounded max-md:bg-blue-50 max-md:border max-md:border-blue-200 max-md:text-[#0A66C2] max-md:font-medium dark:max-md:bg-[#031548] dark:max-md:border-[#0A66C2]/40 dark:max-md:text-[#3b82f6]">
                {'{{username}}'}
              </code>
              ,{' '}
              <code className="px-1.5 py-0.5 rounded max-md:bg-blue-50 max-md:border max-md:border-blue-200 max-md:text-[#0A66C2] max-md:font-medium dark:max-md:bg-[#031548] dark:max-md:border-[#0A66C2]/40 dark:max-md:text-[#3b82f6]">
                {'{{company}}'}
              </code>{' '}
              for personalization.
            </p>
          </div>

          {/* Media URL */}
          <div className="space-y-1.5">
            <Label htmlFor="ig-media" className="max-md:text-xs max-md:font-semibold max-md:text-slate-700 dark:max-md:text-slate-200">
              Media URL (optional)
            </Label>
            <Input
              id="ig-media"
              placeholder="https://… image or video to attach"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              className="max-md:bg-slate-50 max-md:border-slate-200 max-md:h-10 max-md:rounded-lg max-md:text-sm max-md:text-slate-900 max-md:placeholder:text-slate-400 dark:max-md:bg-[#020922] dark:max-md:border-slate-800 dark:max-md:text-white dark:max-md:placeholder:text-slate-600"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="ig-desc" className="max-md:text-xs max-md:font-semibold max-md:text-slate-700 dark:max-md:text-slate-200">
              Description (optional)
            </Label>
            <Input
              id="ig-desc"
              placeholder="Internal note about this template"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="max-md:bg-slate-50 max-md:h-10 max-md:border-slate-200 max-md:rounded-lg max-md:text-sm max-md:text-slate-900 max-md:placeholder:text-slate-400 dark:max-md:bg-[#020922] dark:max-md:border-slate-800 dark:max-md:text-white dark:max-md:placeholder:text-slate-600"
            />
          </div>

          {/* Default Toggle Card */}
          <div className="flex items-center justify-between p-3 border rounded-md max-md:p-4 max-md:border-slate-200 max-md:rounded-xl max-md:bg-slate-50/50 max-md:mt-6 dark:max-md:border-slate-700/80 dark:max-md:bg-transparent">
            <div className="space-y-0.5">
              <Label htmlFor="ig-default" className="text-sm font-medium max-md:font-bold max-md:text-slate-900 dark:max-md:text-white">
                Set as Default Template
              </Label>
              <p className="text-xs text-muted-foreground max-md:text-slate-500 dark:max-md:text-slate-400">
                Used automatically for new campaigns
              </p>
            </div>
            <Switch id="ig-default" checked={isDefault} onCheckedChange={setIsDefault} />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="max-md:pt-4 max-md:flex max-md:justify-center dark:max-md:bg-[#020617]">
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-8 bg-[#0B1957] hover:bg-[#0B1957]/90 text-white rounded-xl max-md:w-auto max-md:mx-auto max-md:bg-[#0B1957] max-md:border max-md:border-blue-900/20 dark:max-md:bg-[#0c1e5b] dark:max-md:border-slate-700/50"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {editing ? 'Save Changes' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
