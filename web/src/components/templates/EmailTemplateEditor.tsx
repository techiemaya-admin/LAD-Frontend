'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ReadyToUseTemplates from './ReadyToUseTemplates';

interface Template {
  id?: string;
  name: string;
  subject: string;
  body: string;
  category?: string;
  description?: string;
  is_active?: boolean;
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
  const [template, setTemplate] = useState<Template>(
    initialTemplate || {
      name: '',
      subject: '',
      body: '',
      category: '',
      description: '',
      is_active: true,
    }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setTemplate((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    if (!template.name.trim() || !template.subject.trim() || !template.body.trim()) {
      setError('Please fill in all required fields');
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
        body: JSON.stringify({
          name: template.name,
          subject: template.subject,
          body: template.body,
          category: template.category,
          description: template.description,
          is_active: template.is_active,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      router.push('/templates');
    } catch (err) {
      setError('Failed to save template. Please try again.');
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
                Category
              </label>
              <input
                type="text"
                name="category"
                value={template.category}
                onChange={handleInputChange}
                placeholder="e.g., Onboarding"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Email Body *
              </label>
              <textarea
                name="body"
                value={template.body}
                onChange={handleInputChange}
                placeholder="Enter your email content here..."
                rows={12}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <p className="mt-2 text-xs text-gray-500">
                💡 Tip: Use {'{{'} placeholders {'}}'} for dynamic content like {'{{'}
                first_name {'}}'}
              </p>
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
