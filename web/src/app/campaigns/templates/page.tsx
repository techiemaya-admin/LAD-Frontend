'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutTemplate, Mail, Pencil, FileText, MessageSquare, RefreshCw, CheckCircle2, Clock, XCircle, AlertCircle, Image, FileIcon, Video } from 'lucide-react';
import { useEmailTemplates } from '@lad/frontend-features/email-templates';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

type TabType = 'email' | 'whatsapp';

interface WATemplate {
  id: string;
  name: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | string;
  category: string;
  language: string;
  components: Array<{
    type: string;
    format?: string;
    text?: string;
    buttons?: Array<{ type: string; text: string }>;
  }>;
}

function getBodyText(tpl: WATemplate): string {
  const body = tpl.components?.find(c => c.type === 'BODY');
  return body?.text || '';
}

function getHeaderInfo(tpl: WATemplate): { format: string; text?: string } | null {
  const header = tpl.components?.find(c => c.type === 'HEADER');
  if (!header) return null;
  return { format: header.format || 'TEXT', text: header.text };
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'APPROVED':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
          <CheckCircle2 className="w-3 h-3" /> Approved
        </span>
      );
    case 'PENDING':
    case 'PENDING_DELETION':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
          <Clock className="w-3 h-3" /> Pending
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
          <XCircle className="w-3 h-3" /> Rejected
        </span>
      );
    case 'PAUSED':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          <AlertCircle className="w-3 h-3" /> Paused
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
          {status}
        </span>
      );
  }
}

function CategoryBadge({ category }: { category: string }) {
  const map: Record<string, string> = {
    MARKETING: 'bg-purple-100 text-purple-700',
    UTILITY: 'bg-blue-100 text-blue-700',
    AUTHENTICATION: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${map[category] || 'bg-gray-100 text-gray-500'}`}>
      {category}
    </span>
  );
}

function HeaderFormatIcon({ format }: { format: string }) {
  if (format === 'IMAGE') return <Image className="w-3.5 h-3.5 text-white/70" />;
  if (format === 'VIDEO') return <Video className="w-3.5 h-3.5 text-white/70" />;
  if (format === 'DOCUMENT') return <FileIcon className="w-3.5 h-3.5 text-white/70" />;
  return <MessageSquare className="w-3.5 h-3.5 text-white/70" />;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('email');

  // Email templates
  const { data: templates = [], isLoading: loading, error: queryError } = useEmailTemplates();
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load templates') : '';

  // WhatsApp templates
  const [waTemplates, setWaTemplates] = useState<WATemplate[]>([]);
  const [waLoading, setWaLoading] = useState(false);
  const [waError, setWaError] = useState('');

  const loadWaTemplates = useCallback(async () => {
    setWaLoading(true);
    setWaError('');
    try {
      const res = await fetchWithTenant('/api/whatsapp-conversations/conversations/templates');
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || d.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      // API may return array directly or { templates: [...] } or { data: [...] }
      const list: WATemplate[] = Array.isArray(data)
        ? data
        : Array.isArray(data.templates)
        ? data.templates
        : Array.isArray(data.data)
        ? data.data
        : [];
      setWaTemplates(list);
    } catch (e: any) {
      setWaError(e.message || 'Failed to load WhatsApp templates');
    } finally {
      setWaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'whatsapp' && waTemplates.length === 0 && !waLoading) {
      loadWaTemplates();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

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
          {activeTab === 'email' ? (
            <button
              onClick={() => router.push('/campaigns/templates/create')}
              className="px-4 py-2 bg-[#0b1957] text-white rounded-xl hover:bg-[#0a1540] font-semibold shadow-[0_4px_20px_rgba(11,25,87,0.3)] hover:shadow-[0_8px_30px_rgba(11,25,87,0.5)] w-full sm:w-auto"
            >
              + Create Template
            </button>
          ) : (
            <button
              onClick={() => router.push('/campaigns/templates/create/whatsapp')}
              className="px-4 py-2 bg-[#0b1957] text-white rounded-xl hover:bg-[#0a1540] font-semibold shadow-[0_4px_20px_rgba(11,25,87,0.3)] hover:shadow-[0_8px_30px_rgba(11,25,87,0.5)] w-full sm:w-auto flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              + Create WhatsApp Template
            </button>
          )}
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
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'whatsapp'
                  ? 'border-[#0b1957] text-[#0b1957]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-8">

        {/* ── Email Tab ─────────────────────────────────────────── */}
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
                      <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-white/[0.07]" />
                      <div className="absolute -bottom-2 -left-2 w-10 h-10 rounded-full bg-white/[0.05]" />
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
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
                        <Mail className="w-3.5 h-3.5 text-white/70" />
                      </div>
                    </div>

                    <div className="px-4 py-3">
                      <h3 className="font-bold text-[#1E293B] truncate text-sm">{template.name}</h3>
                      <p className="text-xs text-[#64748B] mt-0.5 line-clamp-1">
                        {template.subject || 'No subject'}
                      </p>
                    </div>

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

        {/* ── WhatsApp Tab ──────────────────────────────────────── */}
        {activeTab === 'whatsapp' && (
          <div>
            {waError && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
                <p className="text-red-700 text-sm">{waError}</p>
                <button
                  onClick={loadWaTemplates}
                  className="ml-4 text-xs font-semibold text-red-600 hover:text-red-800 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            )}

            {waLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white border border-[#E2E8F0] rounded-xl p-6 animate-pulse">
                    <div className="h-16 bg-gray-100 rounded-lg mb-4" />
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-full mb-1" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : waTemplates.length === 0 && !waError ? (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center shadow-sm">
                <div className="w-16 h-16 rounded-full bg-[#0b1957]/5 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-[#0b1957]/40" />
                </div>
                <h3 className="text-lg font-bold text-[#1E293B] mb-2">No WhatsApp templates yet</h3>
                <p className="text-sm text-[#64748B] mb-6">Create your first WhatsApp message template to get started</p>
                <button
                  onClick={() => router.push('/campaigns/templates/create/whatsapp')}
                  className="px-5 py-2.5 bg-[#0b1957] text-white rounded-xl hover:bg-[#0a1540] font-semibold shadow-[0_4px_20px_rgba(11,25,87,0.3)] hover:shadow-[0_8px_30px_rgba(11,25,87,0.5)] transition-all inline-flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  + Create WhatsApp Template
                </button>
              </div>
            ) : (
              <>
                {/* Refresh button */}
                <div className="flex justify-end mb-4">
                  <button
                    onClick={loadWaTemplates}
                    disabled={waLoading}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#1E293B] border border-[#E2E8F0] bg-white rounded-lg px-3 py-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${waLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {waTemplates.map((tpl) => {
                    const bodyText = getBodyText(tpl);
                    const headerInfo = getHeaderInfo(tpl);
                    return (
                      <div
                        key={tpl.id || tpl.name}
                        className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                      >
                        {/* Card gradient header */}
                        <div className="relative h-16 bg-gradient-to-r from-[#075E54] via-[#128C7E] to-[#25D366] overflow-hidden">
                          <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-white/[0.07]" />
                          <div className="absolute -bottom-2 -left-2 w-10 h-10 rounded-full bg-white/[0.05]" />
                          {/* Mini chat bubble mockup */}
                          <div className="absolute left-3 top-3 bottom-3 right-10 rounded-lg bg-white/[0.15] border border-white/[0.2] px-2.5 py-1.5 flex flex-col justify-center gap-1">
                            <div className="h-1.5 rounded-sm bg-white/40 w-3/4" />
                            <div className="h-1 rounded-sm bg-white/25 w-full" />
                            <div className="h-1 rounded-sm bg-white/15 w-1/2" />
                          </div>
                          {/* WA icon */}
                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                            <HeaderFormatIcon format={headerInfo?.format || 'TEXT'} />
                          </div>
                        </div>

                        {/* Card body */}
                        <div className="px-4 py-3">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h3 className="font-bold text-[#1E293B] text-sm truncate flex-1">{tpl.name}</h3>
                            <CategoryBadge category={tpl.category} />
                          </div>
                          {bodyText ? (
                            <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed">{bodyText}</p>
                          ) : (
                            <p className="text-xs text-[#94A3B8] italic">No body text</p>
                          )}
                          <p className="text-[10px] text-[#94A3B8] mt-1.5">{tpl.language}</p>
                        </div>

                        {/* Card footer */}
                        <div className="px-4 py-2.5 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
                          <StatusBadge status={tpl.status} />
                          <span className="text-[10px] text-[#94A3B8]">
                            {tpl.components?.find(c => c.type === 'BUTTONS')?.buttons?.length
                              ? `${tpl.components.find(c => c.type === 'BUTTONS')!.buttons!.length} button${tpl.components.find(c => c.type === 'BUTTONS')!.buttons!.length > 1 ? 's' : ''}`
                              : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
