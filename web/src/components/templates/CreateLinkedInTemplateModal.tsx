'use client';

import React, { useState, useEffect, useRef } from 'react';
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
   * on edit. Backward-compatible — existing callers omit it.
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

  // Connection requests are text-only on LinkedIn — drop any attachment when the
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
      <DialogContent className="max-h-[90vh] overflow-y-auto  max-md:p-4 max-md:bg-white max-md:text-slate-900 max-md:border-slate-200 max-md:rounded-2xl dark:max-md:bg-[#020617] dark:max-md:text-white dark:max-md:border-slate-800 max-md:[&>button]:top-5 max-md:[&>button]:right-4 max-md:[&>button]:bg-slate-100 max-md:[&>button]:p-1.5 max-md:[&>button]:rounded-lg max-md:[&>button]:border max-md:[&>button]:border-slate-200 dark:max-md:[&>button]:bg-slate-900/80 dark:max-md:[&>button]:border-slate-800">
        
        {/* Header */}
        <DialogHeader className="max-md:pb-6 max-md:pt-2 max-md:border-b max-md:border-slate-200 dark:max-md:border-slate-800/80 dark:max-md:bg-[#020617]">
          {/* Added pr-10 right here */}
          <div className="flex items-center gap-3 pr-10">
            {/* Icon */}
            <div className="p-2.5 rounded-full bg-[#0A66C2]/10 text-[#0A66C2] border border-[#0A66C2]/20 max-md:bg-[#0066FF] max-md:text-white max-md:border-none flex items-center justify-center w-10 h-10 shrink-0">
              <Linkedin className="h-5 w-5 max-md:fill-current" />
            </div>

            <div className="flex flex-col text-left">
              <DialogTitle className="max-md:text-base max-md:font-bold max-md:text-slate-900 dark:max-md:text-white">
                {editing ? 'Edit LinkedIn Template' : 'New LinkedIn Template'}
              </DialogTitle>
              <DialogDescription className="max-md:text-xs max-md:text-slate-500 dark:max-md:text-slate-400">
                A reusable message for a connection request or a follow-up
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Form Content */}
        <div className="space-y-4 px-8 py-4 max-md:px-2 max-md:py-4">
          
          {/* Template Name */}
          <div className="space-y-1.5">
            <Label htmlFor="li-name" className="max-md:text-xs max-md:font-semibold max-md:text-slate-700 dark:max-md:text-slate-200">
              Template Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="li-name"
              placeholder="e.g. Sales Outreach - Enterprise"
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

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="li-desc" className="max-md:text-xs max-md:font-semibold max-md:text-slate-700 dark:max-md:text-slate-200">
              Description (optional)
            </Label>
            <Input
              id="li-desc"
              placeholder="When to use this template…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="max-md:bg-slate-50 max-md:h-10 max-md:border-slate-200 max-md:rounded-lg max-md:text-sm max-md:text-slate-900 max-md:placeholder:text-slate-400 dark:max-md:bg-[#020922] dark:max-md:border-slate-800 dark:max-md:text-white dark:max-md:placeholder:text-slate-600"
            />
          </div>

          {/* Template Type */}
          <div className="space-y-1.5">
            <Label htmlFor="li-type" className="max-md:text-xs max-md:font-semibold max-md:text-slate-700 dark:max-md:text-slate-200">
              Use this template for
            </Label>
            <select
              id="li-type"
              value={templateType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full h-9 px-3 py-2 text-sm border border-input rounded-md bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:h-10 max-md:bg-slate-50 max-md:border-slate-200 max-md:rounded-lg max-md:text-slate-800 dark:max-md:bg-[#020922] dark:max-md:border-slate-800 dark:max-md:text-slate-200"
            >
              {LINKEDIN_TEMPLATE_TYPES.map((t) => (
                <option key={t.value} value={t.value} className="max-md:bg-white max-md:text-slate-900 dark:bg-[#161717] dark:max-md:bg-[#020922] dark:max-md:text-white">
                  {t.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground max-md:text-slate-500 dark:max-md:text-slate-400">
              {isConnection
                ? 'Connection request note — text-only and limited to 300 characters.'
                : 'Follow-up message — sent after a connection is accepted. Supports an attachment.'}
            </p>
          </div>

          {/* Message Body + Variable Picker */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="li-body" className="max-md:text-xs max-md:font-semibold max-md:text-slate-700 dark:max-md:text-slate-200">
                Message
              </Label>
              <div className="flex items-center gap-2">
                {isConnection && (
                  <span
                    className={`text-xs ${
                      body.length > LINKEDIN_CONNECTION_MESSAGE_MAX_LENGTH
                        ? 'text-red-600'
                        : 'text-muted-foreground max-md:text-slate-500 dark:max-md:text-slate-400'
                    }`}
                  >
                    {body.length}/{LINKEDIN_CONNECTION_MESSAGE_MAX_LENGTH}
                  </span>
                )}
                
                <select
                  aria-label="Insert variable"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) insertVariable(e.target.value);
                    e.currentTarget.selectedIndex = 0;
                  }}
                  className="h-7 pl-2 pr-1 text-xs border border-input rounded-md bg-transparent text-[#0A66C2] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer max-md:bg-blue-50 max-md:border-blue-200 max-md:text-[#0A66C2] max-md:px-2.5 max-md:rounded-md dark:max-md:bg-[#031548] dark:max-md:border-[#0A66C2]/40 dark:max-md:text-[#3b82f6]"
                >
                  <option value="" className="max-md:bg-white max-md:text-slate-900 dark:bg-[#161717] dark:max-md:bg-[#020922] dark:text-white">
                    + Add variable
                  </option>
                  {VARIABLE_OPTIONS.map((v) => (
                    <option key={v.token} value={v.token} className="max-md:bg-white max-md:text-slate-900 dark:bg-[#161717] dark:max-md:bg-[#020922] dark:text-white">
                      {v.label}
                    </option>
                  ))}
                </select>
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
              rows={isConnection ? 3 : 5}
              className={`resize-none text-sm max-md:bg-slate-50 max-md:border-slate-200 max-md:rounded-lg max-md:text-slate-900 max-md:placeholder:text-slate-400 dark:max-md:bg-[#020922] dark:max-md:border-slate-800 dark:max-md:text-slate-200 dark:max-md:placeholder:text-slate-600 ${
                errors.body ? 'border-red-500' : ''
              }`}
            />
            {errors.body && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {errors.body}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground max-md:text-slate-500 dark:max-md:text-slate-400">
              Use the{' '}
              <span className="inline-flex items-center gap-0.5 font-medium text-[#0A66C2] dark:max-md:text-blue-400">
                <Plus className="h-3 w-3" />
                Add variable
              </span>{' '}
              menu to personalize with the recipient&apos;s name, company, title, or location.
            </p>
          </div>

          {/* Media Attachment */}
          {!isConnection && (
            <div className="space-y-1.5">
              <Label className="max-md:text-xs max-md:font-semibold max-md:text-slate-700 dark:max-md:text-slate-200">
                Attachment (optional)
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept={MEDIA_ACCEPT}
                onChange={handleMediaSelect}
                className="hidden"
              />
              {mediaUrl ? (
                <div className="flex items-center gap-3 p-2 border rounded-md max-md:bg-slate-50 max-md:border-slate-200 max-md:rounded-lg dark:max-md:bg-[#020922] dark:max-md:border-slate-800">
                  {mediaType === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaUrl}
                      alt={mediaFilename || 'attachment'}
                      className="h-14 w-14 rounded object-cover border max-md:border-slate-200 dark:max-md:border-slate-800"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded bg-muted flex items-center justify-center text-muted-foreground max-md:bg-slate-200 max-md:text-slate-600 dark:max-md:bg-slate-800 dark:max-md:text-slate-400">
                      {mediaType === 'video' ? (
                        <Film className="h-6 w-6" />
                      ) : mediaType === 'audio' ? (
                        <Music className="h-6 w-6" />
                      ) : (
                        <FileText className="h-6 w-6" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate max-md:text-slate-900 dark:max-md:text-white">
                      {mediaFilename || 'Attachment'}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize max-md:text-slate-500 dark:max-md:text-slate-400">
                      {mediaType || 'file'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearMedia}
                    title="Remove attachment"
                    className="max-md:text-slate-500 max-md:hover:text-slate-900 dark:max-md:text-slate-400 dark:max-md:hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingMedia}
                  className="w-full justify-start text-muted-foreground max-md:bg-slate-50 max-md:border-slate-200 max-md:text-slate-600 max-md:hover:bg-slate-100 dark:max-md:bg-[#020922] dark:max-md:border-slate-800 dark:max-md:text-slate-400 dark:max-md:hover:bg-slate-800/50 dark:max-md:hover:text-white"
                >
                  {uploadingMedia ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="mr-2 h-4 w-4" />
                  )}
                  {uploadingMedia ? 'Uploading…' : 'Attach image, video, voice note, or document'}
                </Button>
              )}
              <p className="text-[11px] text-muted-foreground max-md:text-slate-500 dark:max-md:text-slate-400">
                Sent with the follow-up message. Max 25MB.
              </p>
              {errors.media && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.media}
                </p>
              )}
            </div>
          )}

          {/* Default Toggle Card */}
          <div className="flex items-center justify-between p-3 border rounded-md max-md:p-4 max-md:border-slate-200 max-md:rounded-xl max-md:bg-slate-50/50 max-md:mt-6 dark:max-md:border-slate-700/80 dark:max-md:bg-transparent">
            <div className="space-y-0.5">
              <Label htmlFor="li-default" className="text-sm font-medium max-md:font-bold max-md:text-slate-900 dark:max-md:text-white">
                Set as Default Template
              </Label>
              <p className="text-xs text-muted-foreground max-md:text-slate-500 dark:max-md:text-slate-400">
                Used automatically for new campaigns
              </p>
            </div>
            <Switch id="li-default" checked={isDefault} onCheckedChange={setIsDefault} />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="max-md:pt-4 max-md:flex max-md:justify-center dark:max-md:bg-[#020617]">
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || uploadingMedia}
            className="px-8 bg-[#0B1957] hover:bg-[#0B1957]/90 text-white rounded-xl max-md:w-auto max-md:mx-auto max-md:bg-[#0B1957] max-md:border max-md:border-blue-900/20 dark:max-md:bg-[#0c1e5b] dark:max-md:border-slate-700/50"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {editing ? 'Save Changes' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
