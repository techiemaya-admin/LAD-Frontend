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
  const [error, setError] = useState('');

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        // Validate template ID — must be a valid UUID
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!templateId || !UUID_REGEX.test(templateId)) {
          throw new Error(`Invalid template ID: "${templateId}". Please navigate from the Templates list.`);
        }

        console.log('Loading template with ID:', templateId);

        const response = await fetch(`/api/campaigns/email-templates/${templateId}`, {
          method: 'GET',
          credentials: 'include', // Include cookies for auth
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          let errorDetail = `${response.status} ${response.statusText}`;
          try {
            const errorData = await response.json();
            errorDetail = errorData.error || errorData.details || errorDetail;
          } catch (e) {
            // Use status text if response is not JSON
          }
          throw new Error(`Failed to load template: ${errorDetail}`);
        }

        const data = await response.json();
        console.log('Template loaded successfully:', data);
        setTemplate(data.data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('Error loading template:', err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [templateId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FE] flex items-center justify-center">
        <p className="text-gray-500">Loading template...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F9FE]">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Template</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={() => router.push('/campaigns/templates')}
              className="px-4 py-2 bg-[#0b1957] text-white rounded-xl hover:bg-[#0a1540] font-semibold shadow-[0_4px_20px_rgba(11,25,87,0.3)] hover:shadow-[0_8px_30px_rgba(11,25,87,0.5)]"
            >
              Back to Templates
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-[#F8F9FE] flex items-center justify-center">
        <p className="text-gray-500">Template not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FE]">
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
