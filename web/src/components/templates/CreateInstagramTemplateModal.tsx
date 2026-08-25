'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
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
import { Loader2, Save, AlertCircle, Instagram, X } from 'lucide-react';

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
      <DialogContent showCloseButton={false} overlayClassName="bg-black/50 dark:bg-[#000724]/80 backdrop-blur-xs" className="w-[calc(100%-2rem)] sm:max-w-[660px] sm:w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-blue-900/40 bg-white dark:bg-[#000724] text-gray-900 dark:text-white p-0 rounded-2xl sm:rounded-3xl shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between px-4 pt-5 pb-4 sm:px-8 sm:pt-7 sm:pb-5 border-b border-gray-200 dark:border-blue-900/40 bg-white dark:bg-[#000724] shrink-0">
          <div className="flex items-center gap-3 sm:gap-3.5">
            <div className="p-2.5 rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 shadow-md shadow-[#DD2A7B]/25 shrink-0">
              <Instagram className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                {editing ? 'Edit Instagram Template' : 'Create Instagram Template'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-gray-500 dark:text-slate-300 mt-0.5">
                Reusable Instagram DM - no Meta approval required
              </DialogDescription>
            </div>
          </div>
          <DialogClose className="p-1.5 sm:p-2 rounded-lg border border-gray-200 dark:border-blue-900/50 bg-gray-50 dark:bg-[#000c3b] text-gray-500 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-blue-950/60 transition-colors focus:outline-none cursor-pointer">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        <div className="space-y-5 px-4 py-5 sm:px-8 sm:py-6 bg-white dark:bg-[#000724]">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="ig-name" className="text-sm font-medium text-gray-900 dark:text-white">
              Template Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ig-name"
              placeholder="e.g. Welcome DM"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full h-11 bg-white dark:bg-[#000c3b] text-gray-900 dark:text-white border-gray-200 dark:border-blue-900/50 placeholder:text-gray-400 dark:placeholder:text-slate-400 focus:border-[#DD2A7B] focus:ring-[#DD2A7B] rounded-lg min-w-0 ${errors.name ? 'border-red-500' : ''}`}
            />
            {errors.name && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" /> {errors.name}
              </p>
            )}
          </div>

          {/* Body */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label htmlFor="ig-content" className="text-sm font-medium text-gray-900 dark:text-white">
                Message Body <span className="text-red-500">*</span>
              </Label>
              <span className={`text-xs ${overLimit ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-slate-400'}`}>
                {content.length}{overLimit ? ` · long DMs convert poorly` : ''}
              </span>
            </div>
            <Textarea
              id="ig-content"
              placeholder={'Hey {{first_name}}! 👋 Saw you follow {{company}} - wanted to reach out…'}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className={`w-full bg-white dark:bg-[#000c3b] text-gray-900 dark:text-white border-gray-200 dark:border-blue-900/50 placeholder:text-gray-400 dark:placeholder:text-slate-400 resize-none text-sm leading-relaxed p-3.5 rounded-xl focus:border-[#DD2A7B] focus:ring-[#DD2A7B] ${errors.content ? 'border-red-500' : ''}`}
            />
            {errors.content && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" /> {errors.content}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5">
              Use <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-blue-950/60 text-[#DD2A7B] dark:text-[#38BDF8] border border-gray-200 dark:border-blue-900/50 font-mono text-xs">{'{{first_name}}'}</code>,{' '}
              <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-blue-950/60 text-[#DD2A7B] dark:text-[#38BDF8] border border-gray-200 dark:border-blue-900/50 font-mono text-xs">{'{{username}}'}</code>,{' '}
              <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-blue-950/60 text-[#DD2A7B] dark:text-[#38BDF8] border border-gray-200 dark:border-blue-900/50 font-mono text-xs">{'{{company}}'}</code> for personalization.
            </p>
          </div>

          {/* Media URL (optional) */}
          <div className="space-y-2">
            <Label htmlFor="ig-media" className="text-sm font-medium text-gray-900 dark:text-white">Media URL (optional)</Label>
            <Input
              id="ig-media"
              placeholder="https://… image or video to attach"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              className="w-full h-11 bg-white dark:bg-[#000c3b] text-gray-900 dark:text-white border-gray-200 dark:border-blue-900/50 placeholder:text-gray-400 dark:placeholder:text-slate-400 focus:border-[#DD2A7B] focus:ring-[#DD2A7B] rounded-lg min-w-0"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="ig-desc" className="text-sm font-medium text-gray-900 dark:text-white">Description (optional)</Label>
            <Input
              id="ig-desc"
              placeholder="Internal note about this template"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-11 bg-white dark:bg-[#000c3b] text-gray-900 dark:text-white border-gray-200 dark:border-blue-900/50 placeholder:text-gray-400 dark:placeholder:text-slate-400 focus:border-[#DD2A7B] focus:ring-[#DD2A7B] rounded-lg min-w-0"
            />
          </div>

          {/* Default toggle */}
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-blue-900/50 rounded-xl bg-gray-50/50 dark:bg-[#000c3b]">
            <div className="space-y-0.5">
              <Label htmlFor="ig-default" className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">Set as Default Template</Label>
              <p className="text-xs text-gray-500 dark:text-slate-400">Used automatically for new campaigns</p>
            </div>
            <Switch id="ig-default" checked={isDefault} onCheckedChange={setIsDefault} />
          </div>
        </div>

        <DialogFooter className="px-4 py-4 sm:px-8 sm:py-5 border-t border-gray-200 dark:border-blue-900/40 bg-gray-50/50 dark:bg-[#000724] flex justify-end items-center sm:justify-end">
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-2.5 h-11 bg-[#0B1957] hover:bg-[#0B1957]/90 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {editing ? 'Save Changes' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
