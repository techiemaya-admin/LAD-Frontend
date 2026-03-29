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

  useEffect(() => {
    if (activeTab === 'email') {
      loadEmailTemplates();
    }
  }, [activeTab]);

  const loadEmailTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/campaigns/email-templates');
      if (!response.ok) throw new Error('Failed to load templates');
      const data = await response.json();
      setTemplates(data.data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Templates</h1>
            <p className="mt-2 text-gray-600">Manage your communication templates</p>
          </div>
          <button
            onClick={() => router.push(`/templates/create?type=${activeTab}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
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
                  ? 'border-blue-600 text-blue-600'
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
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading templates...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No templates yet</p>
                <button
                  onClick={() => router.push('/templates/create?type=email')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
                          href={`/templates/edit/${template.id}`}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
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
