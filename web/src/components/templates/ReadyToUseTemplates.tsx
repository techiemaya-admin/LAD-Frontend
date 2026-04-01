'use client';

import { useState, useEffect } from 'react';

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  description: string;
}

interface ReadyToUseTemplatesProps {
  onSelectTemplate: (template: Template) => void;
}

export default function ReadyToUseTemplates({
  onSelectTemplate,
}: ReadyToUseTemplatesProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/campaigns/email-templates');
      if (!response.ok) {
        throw new Error(`Failed to load templates: ${response.status}`);
      }
      const data = await response.json();

      // Transform API response to component format
      const formattedTemplates = (data.data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        subject: t.subject || '',
        body: t.body || '',
        category: t.category || 'General',
        description: t.description || '',
      }));

      setTemplates(formattedTemplates);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error loading templates:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', ...new Set(templates.map((t) => t.category))];

  const filteredTemplates =
    selectedCategory === 'All'
      ? templates
      : templates.filter((t) => t.category === selectedCategory);

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading templates...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700 text-sm">{error}</p>
        <button
          onClick={loadTemplates}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No templates available yet. Create one to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="mb-4">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">
                {template.name}
              </h3>
              <p className="text-xs text-gray-500 bg-gray-100 inline-block px-2 py-1 rounded mb-3">
                {template.category}
              </p>
              <p className="text-sm text-gray-600">{template.description}</p>
            </div>

            <div className="bg-gray-50 rounded p-3 mb-4 max-h-32 overflow-hidden">
              <p className="text-xs font-mono text-gray-700 line-clamp-4">
                <strong>Subject:</strong> {template.subject}
              </p>
              <p className="text-xs font-mono text-gray-600 mt-2 line-clamp-2">
                {template.body.substring(0, 150)}...
              </p>
            </div>

            <button
              onClick={() => onSelectTemplate(template)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
            >
              Use This Template
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
