'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import ReadyToUseTemplates from './ReadyToUseTemplates';
import HtmlEmailEditor from './HtmlEmailEditor';

interface Template {
  id?: string;
  name: string;
  subject: string;
  body: string;
  body_html?: string;
  content_format?: 'plain_text' | 'html' | 'markdown';
  category?: string;
  description?: string;
  is_active?: boolean;
  media_url?: string;
  media_alt_text?: string;
}

interface EmailTemplateEditorProps {
  mode: 'create' | 'edit';
  initialTemplate?: Template;
}

export default function EmailTemplateEditor({
  mode,
  initialTemplate,
}: EmailTemplateEditorProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'editor' | 'templates'>('editor');
  const [editorMode, setEditorMode] = useState<'plain' | 'html'>('plain');
  const [template, setTemplate] = useState<Template>(
    initialTemplate || {
      name: '',
      subject: '',
      body: '',
      body_html: '',
      content_format: 'plain_text',
      category: '',
      description: '',
      is_active: true,
      media_url: '',
      media_alt_text: '',
    }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setTemplate((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMediaUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, etc.)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/campaigns/email-templates/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to upload media');
      }

      const data = await response.json();
      setTemplate((prev) => ({
        ...prev,
        media_url: data.url || data.data?.url,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    if (!template.name.trim() || !template.subject.trim() || !template.body.trim()) {
      setError('Please fill in all required fields (Name, Subject, Body)');
      return;
    }

    if (!template.category || !template.category.trim()) {
      setError('Please select a category');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const url =
        mode === 'create'
          ? '/api/campaigns/email-templates'
          : `/api/campaigns/email-templates/${template.id}`;

      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: template.name,
          subject: template.subject,
          body: template.body,
          body_html: template.body_html || null,
          content_format: template.content_format || 'plain_text',
          category: template.category,
          description: template.description,
          is_active: template.is_active,
          media_url: template.media_url || null,
          media_alt_text: template.media_alt_text || null,
        }),
      });

      if (!response.ok) {
        let errorDetail = `${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorDetail = errorData.error || errorData.details || errorDetail;
        } catch (e) {
          // If response body is not JSON, use status text
        }
        throw new Error(`Failed to save template: ${errorDetail}`);
      }

      const data = await response.json();
      router.push('/templates');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error saving template:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectTemplate = (selectedTemplate: Template) => {
    setTemplate({
      ...selectedTemplate,
      id: undefined, // New template, no ID yet
      name: `${selectedTemplate.name} (Copy)`,
    });
    setActiveTab('editor');
  };

  const convertPlainTextToHtml = () => {
    const plainText = template.body;
    // Escape HTML special characters
    let escaped = plainText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    // Convert line breaks to <br>
    escaped = escaped.replace(/\n\n/g, '</p><p>');
    escaped = escaped.replace(/\n/g, '<br>');

    // Wrap in paragraphs
    const html = `<p>${escaped}</p>`;

    setTemplate((prev) => ({
      ...prev,
      body_html: html,
      content_format: 'html',
    }));
    setEditorMode('html');
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('editor')}
          className={`py-3 px-4 font-medium text-sm border-b-2 ${
            activeTab === 'editor'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Editor
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`py-3 px-4 font-medium text-sm border-b-2 ${
            activeTab === 'templates'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Use Template
        </button>
      </div>

      {/* Editor Tab */}
      {activeTab === 'editor' && (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Template Name *
              </label>
              <input
                type="text"
                name="name"
                value={template.name}
                onChange={handleInputChange}
                placeholder="e.g., Welcome Email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Email Subject *
              </label>
              <input
                type="text"
                name="subject"
                value={template.subject}
                onChange={handleInputChange}
                placeholder="e.g., Welcome to our service!"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Category *
              </label>
              <select
                name="category"
                value={template.category || ''}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a category</option>
                <option value="email_send">Initial Email</option>
                <option value="email_followup">Follow-up Email</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={template.description}
                onChange={handleInputChange}
                placeholder="Describe when this template should be used"
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Media Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                📸 Media (Optional)
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm"
                >
                  {uploading ? 'Uploading...' : 'Choose Image'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleMediaUpload}
                  className="hidden"
                />
                {template.media_url && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-600">✓ Image uploaded</span>
                    <button
                      type="button"
                      onClick={() => setTemplate(prev => ({ ...prev, media_url: '' }))}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              {template.media_url && (
                <div className="mt-3">
                  <img
                    src={template.media_url}
                    alt="Preview"
                    className="max-h-48 rounded-lg"
                  />
                  <input
                    type="text"
                    name="media_alt_text"
                    value={template.media_alt_text || ''}
                    onChange={handleInputChange}
                    placeholder="Alt text for accessibility"
                    className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              )}
            </div>

            {/* Email Content Editor Tabs */}
            <div>
              <div className="mb-4 flex gap-3 border-b border-gray-200">
                <button
                  onClick={() => setEditorMode('plain')}
                  className={`py-2 px-4 font-medium text-sm border-b-2 transition ${
                    editorMode === 'plain'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Plain Text
                </button>
                <button
                  onClick={() => setEditorMode('html')}
                  className={`py-2 px-4 font-medium text-sm border-b-2 transition ${
                    editorMode === 'html'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  HTML
                </button>
              </div>

              {/* Plain Text Editor */}
              {editorMode === 'plain' && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-900">Email Body *</label>
                  <textarea
                    name="body"
                    value={template.body}
                    onChange={handleInputChange}
                    placeholder="Enter your email content here..."
                    rows={12}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      💡 Use {'{{'} placeholders {'}}'} for dynamic content like {'{{'} first_name {'}}'}
                    </p>
                    <button
                      type="button"
                      onClick={convertPlainTextToHtml}
                      className="text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1 rounded border border-blue-200 font-medium"
                    >
                      ✨ Convert to HTML
                    </button>
                  </div>
                </div>
              )}

              {/* HTML Editor */}
              {editorMode === 'html' && (
                <HtmlEmailEditor
                  htmlContent={template.body_html || ''}
                  subject={template.subject}
                  onContentChange={(html) => setTemplate((prev) => ({ ...prev, body_html: html }))}
                />
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4 pt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {saving
                  ? 'Saving...'
                  : mode === 'create'
                    ? 'Create Template'
                    : 'Save Template'}
              </button>
              <button
                onClick={() => router.push('/templates')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <ReadyToUseTemplates onSelectTemplate={handleSelectTemplate} />
      )}
    </div>
  );
}
