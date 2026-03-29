'use client';

import { useRouter, useParams } from 'next/navigation';
import EmailTemplateEditor from '@/components/templates/EmailTemplateEditor';
import { useEffect, useState } from 'react';

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const response = await fetch(`/api/campaigns/email-templates/${templateId}`);
        if (!response.ok) throw new Error('Failed to load template');
        const data = await response.json();
        setTemplate(data.data);
      } catch (error) {
        console.error('Error loading template:', error);
        router.push('/templates');
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [templateId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading template...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Template not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Template</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <EmailTemplateEditor mode="edit" initialTemplate={template} />
      </div>
    </div>
  );
}
