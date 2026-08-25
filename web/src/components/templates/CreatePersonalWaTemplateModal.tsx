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
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import { Loader2, Save, AlertCircle, MessageSquare } from 'lucide-react';

/** Mirrors the personal-WA template shape returned by ?channel=personal */
export interface PersonalWaTemplate {
  id: string;
  name: string;
  content: string;
  description: string | null;
  header_text: string | null;
  footer_text: string | null;
  is_default: boolean;
  media_type?: 'image' | 'video' | 'document' | null;
  media_url?: string | null;
  media_filename?: string | null;
}

type MediaType = 'none' | 'image' | 'video' | 'document';

const API = '/api/whatsapp-conversations/conversations/templates';

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: PersonalWaTemplate | null;
  onSaved: () => void;
}

/** Normalize {name} / {{name}} variants to the {{name}} double-brace form */
function normalizeVars(text: string): string {
  return text.replace(/\{+([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}+/g, (_m, v) => `{{${v}}}`);
}

export default function CreatePersonalWaTemplateModal({ open, onClose, editing, onSaved }: Props) {
  const { push } = useToast();

  const [name, setName] = useState('');
  const [headerText, setHeaderText] = useState('');
  const [content, setContent] = useState('');
  const [footerText, setFooterText] = useState('');
  const [description, setDescription] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('none');
  const [mediaUrl, setMediaUrl] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setHeaderText(editing?.header_text ?? '');
    setContent(editing?.content ?? '');
    setFooterText(editing?.footer_text ?? '');
    setDescription(editing?.description ?? '');
    setMediaType((editing?.media_type as MediaType) ?? 'none');
    setMediaUrl(editing?.media_url ?? '');
    setIsDefault(editing?.is_default ?? false);
    setErrors({});
  }, [open, editing]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Template name is required';
    if (!content.trim()) e.content = 'Message body is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const body: Record<string, any> = {
        name: name.trim(),
        content: normalizeVars(content.trim()),
        description: description.trim() || null,
        header_text: headerText.trim() || null,
        footer_text: footerText.trim() || null,
        is_default: isDefault,
        media_type: mediaType !== 'none' ? mediaType : null,
        media_url: mediaType !== 'none' ? mediaUrl.trim() || null : null,
        media_filename: mediaType !== 'none' && mediaUrl ? mediaUrl.split('/').pop() || null : null,
      };

      const res = editing
        ? await fetchWithTenant(`${API}/${editing.id}?channel=personal`, {
            method: 'PUT',
            body: JSON.stringify(body),
          })
        : await fetchWithTenant(`${API}?channel=personal`, {
            method: 'POST',
            body: JSON.stringify(body),
          });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || d.detail || `HTTP ${res.status}`);
      }

      push({
        variant: 'success',
        title: editing ? 'Template Updated' : 'Template Saved',
        description: `"${name}" has been ${editing ? 'updated' : 'created'}.`,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      push({
        variant: 'error',
        title: editing ? 'Update Failed' : 'Save Failed',
        description: err?.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-[#25D366]/10 text-[#128C7E] border border-[#25D366]/20 flex items-center justify-center w-10 h-10">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <DialogTitle>{editing ? 'Edit WAPA Template' : 'New WAPA Template'}</DialogTitle>
              <DialogDescription>
                Saved message for personal WhatsApp - no Meta approval required
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-8 py-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="wa-name">
              Template Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="wa-name"
              placeholder="e.g. Welcome Message"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {errors.name}
              </p>
            )}
          </div>

          {/* Header */}
          <div className="space-y-1.5">
            <Label htmlFor="wa-header">Header (optional)</Label>
            <Input
              id="wa-header"
              placeholder="Short header line"
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label htmlFor="wa-content">
              Message Body <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="wa-content"
              placeholder={'Hi {{name}}, thanks for reaching out!\n\nUse {{variable}} for dynamic placeholders.'}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className={`resize-none font-mono text-sm ${errors.content ? 'border-red-500' : ''}`}
            />
            {errors.content && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {errors.content}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Use <code className="px-1 py-0.5 rounded bg-muted">{'{{name}}'}</code> for contact name,{' '}
              <code className="px-1 py-0.5 rounded bg-muted">{'{{1}}'}</code> for custom variables.
            </p>
          </div>

          {/* Footer */}
          <div className="space-y-1.5">
            <Label htmlFor="wa-footer">Footer (optional)</Label>
            <Input
              id="wa-footer"
              placeholder="e.g. Reply STOP to unsubscribe"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
            />
          </div>

          {/* Media (optional, URL paste) */}
          <div className="space-y-2 border border-border rounded-lg p-3">
            <Label className="text-sm font-medium">Media Attachment (optional)</Label>
            <div className="flex gap-2">
              {(['none', 'image', 'video', 'document'] as MediaType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setMediaType(type);
                    if (type === 'none') setMediaUrl('');
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs border transition-colors capitalize ${
                    mediaType === type
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:bg-muted/50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            {mediaType !== 'none' && (
              <Input
                placeholder={`Paste ${mediaType} URL (https://…)`}
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                className="text-sm"
              />
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="wa-desc">Description (optional)</Label>
            <Input
              id="wa-desc"
              placeholder="Internal note about this template"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Default toggle */}
          <div className="flex items-center justify-between p-3 border rounded-md">
            <div className="space-y-0.5">
              <Label htmlFor="wa-default" className="text-sm font-medium">Set as Default Template</Label>
              <p className="text-xs text-muted-foreground">Used automatically when no template is chosen</p>
            </div>
            <Switch id="wa-default" checked={isDefault} onCheckedChange={setIsDefault} />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-8 bg-[#0B1957] hover:bg-[#0B1957]/90 text-white rounded-xl"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {editing ? 'Save Changes' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
