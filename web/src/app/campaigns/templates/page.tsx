'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutTemplate, Mail, Pencil, FileText } from 'lucide-react';

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
      <div className="px-8">
        <div className="mb-5 flex flex-col sm:flex-row justify-between mt-10 items-stretch sm:items-center gap-2 sm:gap-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LayoutTemplate className="w-8 h-8 text-[#1E293B]" />
              <h1 className="text-2xl sm:text-4xl font-bold text-[#1E293B]">
                Templates
              </h1>
            </div>
            <p className="text-sm text-[#64748B] ml-2">
              Manage your communication templates
            </p>
          </div>
          <button
            onClick={() => router.push('/campaigns/templates/create')}
            className="px-4 py-2 bg-[#0b1957] text-white rounded-xl hover:bg-[#0a1540] font-semibold shadow-[0_4px_20px_rgba(11,25,87,0.3)] hover:shadow-[0_8px_30px_rgba(11,25,87,0.5)] w-full sm:w-auto"
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
      <div className="px-8 py-8">
        {activeTab === 'email' && (
          <div>
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white border border-[#E2E8F0] rounded-xl p-6 animate-pulse">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center shadow-sm">
                <div className="w-16 h-16 rounded-full bg-[#0b1957]/5 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-[#0b1957]/40" />
                </div>
                <h3 className="text-lg font-bold text-[#1E293B] mb-2">No templates yet</h3>
                <p className="text-sm text-[#64748B] mb-6">Create your first email template to get started</p>
                <button
                  onClick={() => router.push('/campaigns/templates/create')}
                  className="px-5 py-2.5 bg-[#0b1957] text-white rounded-xl hover:bg-[#0a1540] font-semibold shadow-[0_4px_20px_rgba(11,25,87,0.3)] hover:shadow-[0_8px_30px_rgba(11,25,87,0.5)] transition-all"
                >
                  + Create Template
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template: any) => (
                  <div
                    key={template.id}
                    className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group"
                  >
                    {/* Compact rich gradient header */}
                    <div className="relative h-16 bg-gradient-to-r from-[#0b1957] via-[#162a6e] to-[#1e3a8a] overflow-hidden">
                      {/* Decorative elements */}
                      <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-white/[0.07]" />
                      <div className="absolute -bottom-2 -left-2 w-10 h-10 rounded-full bg-white/[0.05]" />
                      {/* Mini email mockup */}
                      <div className="absolute left-3 top-2.5 bottom-2.5 right-10 rounded-md bg-white/[0.12] border border-white/[0.15] px-2.5 py-2 flex flex-col justify-center">
                        <div className="flex items-center gap-1 mb-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400/60" />
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400/60" />
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400/60" />
                          <div className="ml-1 h-1 rounded-sm bg-white/20 flex-1" />
                        </div>
                        <div className="space-y-1">
                          <div className="h-1 rounded-sm bg-white/20 w-3/4" />
                          <div className="h-1 rounded-sm bg-white/12 w-full" />
                          <div className="h-1 rounded-sm bg-white/8 w-[60%]" />
                        </div>
                      </div>
                      {/* Mail badge */}
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
                        <Mail className="w-3.5 h-3.5 text-white/70" />
                      </div>
                    </div>

                    {/* Card content */}
                    <div className="px-4 py-3">
                      <h3 className="font-bold text-[#1E293B] truncate text-sm">{template.name}</h3>
                      <p className="text-xs text-[#64748B] mt-0.5 line-clamp-1">
                        {template.subject || 'No subject'}
                      </p>
                    </div>

                    {/* Card footer */}
                    <div className="px-4 py-2.5 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          template.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {template.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <Link
                        href={`/campaigns/templates/edit/${template.id}`}
                        className="flex items-center gap-1 text-xs font-semibold text-[#0b1957] hover:text-[#0a1540] transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'whatsapp' && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center shadow-sm">
            <p className="text-[#64748B] text-lg">WhatsApp templates coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
