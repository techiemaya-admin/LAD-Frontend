'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type TabType = 'email' | 'whatsapp';

export default function TemplatesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('email');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeTab === 'email') {
      loadEmailTemplates();
    }
  }, [activeTab]);

  const loadEmailTemplates = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/campaigns/email-templates');
      if (!response.ok) {
        throw new Error(`Failed to load templates: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      const templatesData = data.data || [];
      console.log('Loaded templates:', templatesData);
      templatesData.forEach((t: any, idx: number) => {
        console.log(`Template ${idx}:`, { id: t.id, name: t.name });
      });
      setTemplates(templatesData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error loading templates:', error);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FE]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Templates</h1>
            <p className="mt-2 text-gray-600">Manage your communication templates</p>
          </div>
          <button
            onClick={() => router.push('/campaigns/templates/create')}
            className="px-4 py-2 bg-[#0b1957] text-white rounded-xl hover:bg-[#0a1540] font-semibold shadow-[0_4px_20px_rgba(11,25,87,0.3)] hover:shadow-[0_8px_30px_rgba(11,25,87,0.5)]"
          >
            + Create Template
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('email')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'email'
                  ? 'border-[#0b1957] text-[#0b1957]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Email
            </button>
            <button
              onClick={() => setActiveTab('whatsapp')}
              disabled
              className="py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-400 cursor-not-allowed"
              title="WhatsApp templates coming soon"
            >
              WhatsApp (Coming Soon)
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {activeTab === 'email' && (
          <div>
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading templates...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No templates yet</p>
                <button
                  onClick={() => router.push('/campaigns/templates/create')}
                  className="px-4 py-2 bg-[#0b1957] text-white rounded-xl hover:bg-[#0a1540] font-semibold shadow-[0_4px_20px_rgba(11,25,87,0.3)] hover:shadow-[0_8px_30px_rgba(11,25,87,0.5)]"
                >
                  Create your first template
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template: any) => (
                  <div
                    key={template.id}
                    className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow p-6"
                  >
                    <h3 className="font-semibold text-gray-900 mb-2">{template.name}</h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {template.subject || 'No subject'}
                    </p>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          template.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {template.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <div className="flex gap-2">
                        <Link
                          href={`/campaigns/templates/edit/${template.id}`}
                          className="text-[#0b1957] hover:text-[#0a1540] text-sm font-semibold"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'whatsapp' && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">WhatsApp templates coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
