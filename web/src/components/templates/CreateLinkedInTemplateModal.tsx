'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  useCreateLinkedInMessageTemplate,
  useUpdateLinkedInMessageTemplate,
  uploadLinkedInTemplateMedia,
  LINKEDIN_CONNECTION_MESSAGE_MAX_LENGTH,
  LINKEDIN_TEMPLATE_TYPES,
  LINKEDIN_MESSAGE_VARIABLES,
} from '@lad/frontend-features/campaigns';
import type {
  LinkedInMessageTemplate,
  CreateLinkedInTemplateRequest,
  LinkedInTemplateMediaType,
} from '@lad/frontend-features/campaigns';
import { Loader2, Save, AlertCircle, Linkedin, Paperclip, X, FileText, Film, Music, Plus } from 'lucide-react';

const MEDIA_ACCEPT =
  'image/*,video/*,audio/*,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Personalization tokens offered by the variable picker (label → placeholder).
const VARIABLE_OPTIONS: Array<{ label: string; token: string }> = [
  { label: 'First name', token: LINKEDIN_MESSAGE_VARIABLES.FIRST_NAME },
  { label: 'Last name', token: LINKEDIN_MESSAGE_VARIABLES.LAST_NAME },
  { label: 'Full name', token: LINKEDIN_MESSAGE_VARIABLES.FULL_NAME },
  { label: 'Company', token: LINKEDIN_MESSAGE_VARIABLES.COMPANY },
  { label: 'Title', token: LINKEDIN_MESSAGE_VARIABLES.TITLE },
  { label: 'Location', token: LINKEDIN_MESSAGE_VARIABLES.LOCATION },
];

const CONNECTION_TYPE = 'linkedin_connection';
const FOLLOWUP_TYPE = 'linkedin_followup';

interface CreateLinkedInTemplateModalProps {
  open: boolean;
  onClose: () => void;
  /** When provided, the modal edits this template instead of creating a new one */
  editing?: LinkedInMessageTemplate | null;
  /**
   * Optional callback fired with the freshly-created template (the create
   * mutation's result) right before the modal closes. Lets a caller auto-select
   * the new template (e.g. the per-touch follow-up template picker). Not called
   * on edit. Backward-compatible - existing callers omit it.
   */
  onCreated?: (tpl: LinkedInMessageTemplate) => void;
}

export default function CreateLinkedInTemplateModal({
  open,
  onClose,
  editing,
  onCreated,
}: CreateLinkedInTemplateModalProps) {
  const { push } = useToast();
  const createMutation = useCreateLinkedInMessageTemplate();
  const updateMutation = useUpdateLinkedInMessageTemplate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  // A template is ONE body used for a chosen type (connection request | follow-up).
  const [templateType, setTemplateType] = useState<string>(CONNECTION_TYPE);
  const [body, setBody] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Media attachment (image / video / audio-voice-note / document).
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<LinkedInTemplateMediaType | string | null>(null);
  const [mediaFilename, setMediaFilename] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isConnection = templateType === CONNECTION_TYPE;

  // Hydrate form when opening (create = blank, edit = existing values)
  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setDescription(editing?.description ?? '');
    setTemplateType(editing?.category === FOLLOWUP_TYPE ? FOLLOWUP_TYPE : CONNECTION_TYPE);
    // Backend now returns the single `content`; fall back to the legacy aliases.
    setBody(editing?.content ?? editing?.connection_message ?? editing?.followup_message ?? '');
    setIsDefault(editing?.is_default ?? false);
    const meta = (editing?.metadata ?? {}) as Record<string, any>;
    setMediaUrl(meta.media_url ?? null);
    setMediaType(meta.media_type ?? null);
    setMediaFilename(meta.media_filename ?? null);
    setErrors({});
  }, [open, editing]);

  // Insert a personalization token at the cursor in the body textarea. The UI
  // <Textarea> is a plain component (no ref forwarding), so reach the element by id.
  const insertVariable = (token: string) => {
    const el = typeof document !== 'undefined'
      ? (document.getElementById('li-body') as HTMLTextAreaElement | null)
      : null;
    if (!el) {
      setBody((b) => b + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow re-selecting the same file next time.
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    // Guard client-side so an oversize file gets a clear message instead of
    // being truncated by the middleware body cap.
    if (file.size > 25 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, media: 'File too large. Max 25MB.' }));
      return;
    }

    setUploadingMedia(true);
    try {
      const result = await uploadLinkedInTemplateMedia(file);
      setMediaUrl(result.url);
      setMediaType(result.media_type);
      setMediaFilename(result.filename);
      setErrors((prev) => { const { media, ...rest } = prev; return rest; });
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, media: err?.message || 'Upload failed. Please try again.' }));
      push({ variant: 'error', title: 'Upload Failed', description: err?.message || 'Could not upload the file.' });
    } finally {
      setUploadingMedia(false);
    }
  };

  const clearMedia = () => {
    setMediaUrl(null);
    setMediaType(null);
    setMediaFilename(null);
  };

  // Connection requests are text-only on LinkedIn - drop any attachment when the
  // user switches the type to connection.
  const handleTypeChange = (value: string) => {
    setTemplateType(value);
    if (value === CONNECTION_TYPE) clearMedia();
    setErrors((prev) => {
      const next = { ...prev };
      delete next.body;
      delete next.connection;
      delete next.media;
      return next;
    });
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Template name is required';

    const hasMedia = !isConnection && !!mediaUrl; // media only rides a follow-up
    if (!body.trim() && !hasMedia) {
      e.body = isConnection
        ? 'A connection request message is required'
        : 'Provide a message or an attachment';
    }
    if (isConnection && body.length > LINKEDIN_CONNECTION_MESSAGE_MAX_LENGTH) {
      e.body = `Connection request messages must be ${LINKEDIN_CONNECTION_MESSAGE_MAX_LENGTH} characters or less`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const attachMedia = !isConnection && !!mediaUrl;
    const payload: CreateLinkedInTemplateRequest = {
      name: name.trim(),
      description: description.trim() || undefined,
      category: templateType,
      content: body.trim() || undefined,
      is_default: isDefault,
      is_active: true,
      // Media rides follow-up templates only. On edit, an explicit null clears a
      // previously-attached file (and always clears it for a connection type).
      media_url: attachMedia ? mediaUrl : (editing ? null : undefined),
      media_type: attachMedia ? mediaType : null,
      media_filename: attachMedia ? mediaFilename : null,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: payload });
        push({ variant: 'success', title: 'Template Updated', description: `"${name}" has been updated.` });
      } else {
        const created = await createMutation.mutateAsync(payload);
        push({ variant: 'success', title: 'Template Saved', description: `"${name}" has been created.` });
        // Hand the new template back so a caller can auto-select it. The create
        // hook has already invalidated the templates list + cleared the local
        // cache, so any dependent dropdown refetches on its own.
        if (created) onCreated?.(created);
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
    <Dialog open={open} onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
      <DialogContent showCloseButton={false} overlayClassName="bg-black/50 dark:bg-[#000724]/80 backdrop-blur-xs" className="w-[calc(100%-2rem)] sm:max-w-[660px] sm:w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-blue-900/40 bg-white dark:bg-[#000724] text-gray-900 dark:text-white p-0 rounded-2xl sm:rounded-3xl shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between px-4 pt-5 pb-4 sm:px-8 sm:pt-7 sm:pb-5 border-b border-gray-200 dark:border-blue-900/40 bg-white dark:bg-[#000724] shrink-0">
          <div className="flex items-center gap-3 sm:gap-3.5">
            <div className="p-2.5 rounded-full bg-[#0A66C2] text-white flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 shadow-md shadow-[#0A66C2]/30 shrink-0">
              <Linkedin className="h-5 w-5 text-white fill-current" />
            </div>
            <div className="flex flex-col">
              <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                {editing ? 'Edit LinkedIn Template' : 'Create LinkedIn Template'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-gray-500 dark:text-slate-300 mt-0.5">
                A reusable message for a connection request or a follow-up
              </DialogDescription>
            </div>
          </div>
          <DialogClose className="p-1.5 sm:p-2 rounded-lg border border-gray-200 dark:border-blue-900/50 bg-gray-50 dark:bg-[#071131] text-gray-500 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-blue-950/60 transition-colors focus:outline-none cursor-pointer">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        <div className="space-y-5 px-4 py-5 sm:px-8 sm:py-6 bg-white dark:bg-[#000724]">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="li-name" className="text-sm font-medium text-gray-900 dark:text-white">
              Template Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="li-name"
              placeholder="e.g. Sales Outreach - Enterprise"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full h-11 bg-white dark:bg-[#071131] text-gray-900 dark:text-white border-gray-200 dark:border-blue-900/50 placeholder:text-gray-400 dark:placeholder:text-slate-400 focus:border-[#0A66C2] focus:ring-[#0A66C2] rounded-lg min-w-0 ${errors.name ? 'border-red-500' : ''}`}
            />
            {errors.name && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" /> {errors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="li-desc" className="text-sm font-medium text-gray-900 dark:text-white">Description (optional)</Label>
            <Input
              id="li-desc"
              placeholder="When to use this template…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-11 bg-white dark:bg-[#071131] text-gray-900 dark:text-white border-gray-200 dark:border-blue-900/50 placeholder:text-gray-400 dark:placeholder:text-slate-400 focus:border-[#0A66C2] focus:ring-[#0A66C2] rounded-lg min-w-0"
            />
          </div>

          {/* Template type */}
          <div className="space-y-2">
            <Label htmlFor="li-type" className="text-sm font-medium text-gray-900 dark:text-white">Use this template for</Label>
            <select
              id="li-type"
              value={templateType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full h-11 px-3.5 py-2.5 text-sm bg-white dark:bg-[#071131] text-gray-900 dark:text-white border border-gray-200 dark:border-blue-900/50 rounded-lg focus-visible:outline-none focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2] cursor-pointer"
            >
              {LINKEDIN_TEMPLATE_TYPES.map((t) => (
                <option key={t.value} value={t.value} className="bg-white dark:bg-[#071131] text-gray-900 dark:text-white">{t.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              {isConnection
                ? 'Connection request note - text-only and limited to 300 characters.'
                : 'Follow-up message - sent after a connection is accepted. Supports an attachment.'}
            </p>
          </div>

          {/* Message body + variable picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label htmlFor="li-body" className="text-sm font-medium text-gray-900 dark:text-white">Message</Label>
              <div className="flex items-center gap-3">
                {isConnection && (
                  <span className={`text-xs ${body.length > LINKEDIN_CONNECTION_MESSAGE_MAX_LENGTH ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-slate-400'}`}>
                    {body.length}/{LINKEDIN_CONNECTION_MESSAGE_MAX_LENGTH}
                  </span>
                )}
                {/* Variable picker */}
                <div className="relative inline-block">
                  <select
                    aria-label="Insert variable"
                    value=""
                    onChange={(e) => { if (e.target.value) insertVariable(e.target.value); e.currentTarget.selectedIndex = 0; }}
                    className="h-8 pl-3 pr-7 text-xs bg-[#0A66C2]/10 dark:bg-[#0A66C2]/20 text-[#0A66C2] dark:text-[#38BDF8] border border-[#0A66C2]/20 dark:border-[#0A66C2]/40 font-medium rounded-md cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0A66C2] appearance-none"
                  >
                    <option value="" className="bg-white dark:bg-[#071131] text-gray-900 dark:text-white">+ Add variable</option>
                    {VARIABLE_OPTIONS.map((v) => (
                      <option key={v.token} value={v.token} className="bg-white dark:bg-[#071131] text-gray-900 dark:text-white">{v.label}</option>
                    ))}
                  </select>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#0A66C2] dark:text-[#38BDF8] text-[10px]">▼</span>
                </div>
              </div>
            </div>
            <Textarea
              id="li-body"
              placeholder={
                isConnection
                  ? 'Hi {{first_name}}, I came across your work at {{company}} and would love to connect.'
                  : 'Thanks for connecting, {{first_name}}! I wanted to share…'
              }
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={isConnection ? 4 : 6}
              className={`w-full bg-white dark:bg-[#071131] text-gray-900 dark:text-white border-gray-200 dark:border-blue-900/50 placeholder:text-gray-400 dark:placeholder:text-slate-400 resize-none text-sm leading-relaxed p-3.5 rounded-xl focus:border-[#0A66C2] focus:ring-[#0A66C2] ${errors.body ? 'border-red-500' : ''}`}
            />
            {errors.body && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" /> {errors.body}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5">
              Use the <span className="font-semibold text-[#0A66C2] dark:text-[#38BDF8] inline-flex items-center gap-0.5"><Plus className="h-3 w-3 inline" /> Add variable</span> menu to personalize with the recipient&apos;s name, company, title, or location.
            </p>
          </div>

          {/* Media attachment - follow-up templates only */}
          {!isConnection && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-900 dark:text-white">Attachment (optional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept={MEDIA_ACCEPT}
                onChange={handleMediaSelect}
                className="hidden"
              />
              {mediaUrl ? (
                <div className="flex items-center gap-3 p-3 bg-gray-50/50 dark:bg-[#071131] border border-gray-200 dark:border-blue-900/50 rounded-xl">
                  {mediaType === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl} alt={mediaFilename || 'attachment'} className="h-14 w-14 rounded-lg object-cover border border-gray-200 dark:border-blue-900/60" />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-gray-100 dark:bg-[#000724] flex items-center justify-center text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-blue-900/50">
                      {mediaType === 'video' ? <Film className="h-6 w-6" />
                        : mediaType === 'audio' ? <Music className="h-6 w-6" />
                        : <FileText className="h-6 w-6" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{mediaFilename || 'Attachment'}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">{mediaType || 'file'}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={clearMedia} title="Remove attachment" className="text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-blue-950/60">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingMedia}
                  className="w-full h-11 justify-start bg-white dark:bg-[#071131] text-gray-600 dark:text-slate-300 border-gray-200 dark:border-blue-900/50 hover:bg-gray-50 dark:hover:bg-blue-950/40 hover:text-gray-900 dark:hover:text-white rounded-xl"
                >
                  {uploadingMedia ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Paperclip className="mr-2 h-4 w-4" />}
                  {uploadingMedia ? 'Uploading…' : 'Attach image, video, voice note, or document'}
                </Button>
              )}
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Sent with the follow-up message. Max 25MB.
              </p>
              {errors.media && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.media}
                </p>
              )}
            </div>
          )}

          {/* Default toggle */}
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-blue-900/50 rounded-xl bg-gray-50/50 dark:bg-[#071131]">
            <div className="space-y-0.5">
              <Label htmlFor="li-default" className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">Set as Default Template</Label>
              <p className="text-xs text-gray-500 dark:text-slate-400">Used automatically for new campaigns</p>
            </div>
            <Switch id="li-default" checked={isDefault} onCheckedChange={setIsDefault} />
          </div>
        </div>

        <DialogFooter className="px-4 py-4 sm:px-8 sm:py-5 border-t border-gray-200 dark:border-blue-900/40 bg-gray-50/50 dark:bg-[#000724] flex justify-end items-center sm:justify-end">
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || uploadingMedia}
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
