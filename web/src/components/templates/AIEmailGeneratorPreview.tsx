'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import HtmlEmailEditor from './HtmlEmailEditor';

interface EmailContent {
  subject: string;
  body: string;
  body_html?: string;
  content_format?: 'plain_text' | 'html';
  generated_at?: string;
}

interface AIEmailGeneratorPreviewProps {
  emailContent: EmailContent;
  onBack: () => void;
  loading?: boolean;
}

const AVAILABLE_PLACEHOLDERS = [
  { key: '{{first_name}}', label: 'First Name' },
  { key: '{{last_name}}', label: 'Last Name' },
  { key: '{{title}}', label: 'Job Title' },
  { key: '{{company}}', label: 'Company Name' },
  { key: '{{company_size}}', label: 'Company Size' },
  { key: '{{industry}}', label: 'Industry' },
];

export default function AIEmailGeneratorPreview({
  emailContent,
  onBack,
  loading = false,
}: AIEmailGeneratorPreviewProps) {
  const router = useRouter();
  const [editorMode, setEditorMode] = useState<'plain' | 'html'>('plain');
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('email_send');
  const [subject, setSubject] = useState(emailContent.subject);
  const [body, setBody] = useState(emailContent.body);
  const [bodyHtml, setBodyHtml] = useState(emailContent.body_html || '');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaAltText, setMediaAltText] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const convertToHtml = () => {
    // Escape HTML special characters
    let escaped = body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    // Convert line breaks to <br>
    escaped = escaped.replace(/\n\n/g, '</p><p>');
    escaped = escaped.replace(/\n/g, '<br>');

    // Wrap in paragraphs
    const html = `<p>${escaped}</p>`;
    setBodyHtml(html);
    setEditorMode('html');
  };

  const handleMediaUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

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
      setMediaUrl(data.url || data.data?.url);
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
    if (!templateName.trim()) {
      setError('Template name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/campaigns/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: templateName,
          subject,
          body,
          ...(editorMode === 'html' && bodyHtml ? { body_html: bodyHtml } : {}),
          content_format: editorMode === 'html' ? 'html' : 'plain_text',
          category: templateCategory,
          description: templateDescription,
          media_url: mediaUrl || null,
          media_alt_text: mediaAltText || null,
        }),
      });

      if (!response.ok) {
        let errorDetail = `${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorDetail = errorData.error || errorData.details || errorDetail;
        } catch (e) {}
        throw new Error(`Failed to save template: ${errorDetail}`);
      }

      const data = await response.json();
      // Handle both { success, data: { id } } and flat { id } response shapes
      const templateId = data?.data?.id ?? data?.id ?? data?.templateId;
      if (templateId) {
        router.push(`/campaigns/templates/edit/${templateId}`);
      } else {
        // Fallback: go to templates list if ID is missing
        router.push('/campaigns/templates');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Email Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Template Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Template Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Cold Outreach - Demo Request"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Optional description of this template"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="email_send">Initial Email</option>
                  <option value="email_followup">Follow-up Email</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📸 Media (Optional)
                </label>
                <div className="flex gap-2 items-center">
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
                  {mediaUrl && (
                    <span className="text-sm text-green-600">✓ Image uploaded</span>
                  )}
                </div>
                {mediaUrl && (
                  <div className="mt-3">
                    <img
                      src={mediaUrl}
                      alt="Preview"
                      className="max-h-40 rounded-lg mb-2"
                    />
                    <input
                      type="text"
                      value={mediaAltText}
                      onChange={(e) => setMediaAltText(e.target.value)}
                      placeholder="Alt text for accessibility"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setMediaUrl('');
                        setMediaAltText('');
                      }}
                      className="mt-2 text-sm text-red-600 hover:text-red-700"
                    >
                      Remove Image
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Email Content Preview */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Preview</h2>

            <div className="mb-4 flex gap-3 border-b border-gray-200 pb-3">
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
              <div className="flex-1"></div>
              {editorMode === 'plain' && (
                <button
                  type="button"
                  onClick={convertToHtml}
                  className="text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1 rounded border border-blue-200 font-medium"
                >
                  ✨ Convert to HTML
                </button>
              )}
            </div>

            {/* Plain Text Mode */}
            {editorMode === 'plain' && (
              <>
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-2">SUBJECT:</p>
                  <textarea
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded font-semibold text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-2">BODY:</p>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    rows={10}
                  />
                </div>
              </>
            )}

            {/* HTML Mode */}
            {editorMode === 'html' && (
              <HtmlEmailEditor
                htmlContent={bodyHtml}
                subject={subject}
                onContentChange={setBodyHtml}
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
          <div className="flex gap-4">
            <button
              onClick={onBack}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              ← Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !templateName.trim()}
              className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? 'Saving...' : '✅ Save Template'}
            </button>
          </div>
        </div>

        {/* Sidebar - Available Placeholders */}
        <div className="lg:col-span-1">
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 sticky top-8">
            <h3 className="font-semibold text-gray-900 mb-4">Available Placeholders</h3>
            <p className="text-xs text-gray-600 mb-4">Use these placeholders to personalize your email:</p>
            <div className="space-y-2">
              {AVAILABLE_PLACEHOLDERS.map((placeholder) => (
                <div key={placeholder.key} className="bg-white rounded p-3 border border-gray-200">
                  <p className="font-mono text-xs text-blue-600">{placeholder.key}</p>
                  <p className="text-xs text-gray-600">{placeholder.label}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-4">These will be replaced with actual values when emails are sent.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
