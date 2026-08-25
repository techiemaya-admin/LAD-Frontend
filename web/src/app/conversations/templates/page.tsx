'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutTemplate, Mail, Pencil, FileText, MessageSquare, RefreshCw,
  CheckCircle2, Clock, XCircle, AlertCircle, Image, FileIcon, Video,
  Linkedin, Instagram, Trash2, Star, Plus,
} from 'lucide-react';
import { useEmailTemplates } from '@lad/frontend-features/email-templates';
import {
  useLinkedInMessageTemplates,
  useDeleteLinkedInMessageTemplate,
  useInstagramMessageTemplates,
  useDeleteInstagramMessageTemplate,
  linkedinTemplateTypeLabel,
} from '@lad/frontend-features/campaigns';
import type {
  LinkedInMessageTemplate,
  InstagramMessageTemplate,
} from '@lad/frontend-features/campaigns';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import { useToast } from '@/components/ui/app-toaster';
import CreateLinkedInTemplateModal from '@/components/templates/CreateLinkedInTemplateModal';
import CreateInstagramTemplateModal from '@/components/templates/CreateInstagramTemplateModal';
import CreatePersonalWaTemplateModal, {
  type PersonalWaTemplate,
} from '@/components/templates/CreatePersonalWaTemplateModal';

type TabType = 'email' | 'whatsapp' | 'linkedin' | 'instagram';
type WaMode = 'business' | 'personal'; // business = WABA, personal = WAPA

// WhatsApp Templates sub-tabs. Personal (WAPA) is TEMPORARILY HIDDEN - re-add the
// commented entry below to restore it (the toggle auto-reappears with 2+ modes).
const WA_MODES: { key: WaMode; label: string; hint: string }[] = [
  { key: 'business', label: 'Business (WABA)', hint: 'Meta-approved templates' },
  // { key: 'personal', label: 'Personal (WAPA)', hint: 'No approval needed' },
];

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
  const DARK = "dark:!bg-transparent dark:!border-transparent dark:!px-0 dark:!py-0 dark:!rounded-none dark:!font-extrabold dark:tracking-wide";
  switch (status) {
    case 'APPROVED':
      return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 ${DARK} dark:!text-emerald-400`}>
          <CheckCircle2 className="w-3 h-3" /> Approved
        </span>
      );
    case 'PENDING':
    case 'PENDING_DELETION':
      return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 ${DARK} dark:!text-amber-300`}>
          <Clock className="w-3 h-3" /> Pending
        </span>
      );
    case 'REJECTED':
      return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 ${DARK} dark:!text-rose-400`}>
          <XCircle className="w-3 h-3" /> Rejected
        </span>
      );
    case 'PAUSED':
      return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 ${DARK} dark:!text-amber-300`}>
          <AlertCircle className="w-3 h-3" /> Paused
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 ${DARK} dark:!text-slate-300`}>
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

const GRID = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";

// Skeleton loader for any card grid
function CardSkeleton() {
  return (
    <div className={GRID}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-[#071131] border border-[#E2E8F0] dark:border-blue-950/40 rounded-xl p-6 animate-pulse">
          <div className="h-16 bg-gray-100 dark:bg-[#0f1b3e] rounded-lg mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-[#0f1b3e] rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-100 dark:bg-[#0f1b3e] rounded w-full mb-1" />
          <div className="h-3 bg-gray-100 dark:bg-[#0f1b3e] rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}

// Empty state shared across channels
function EmptyState({ icon, title, subtitle, ctaLabel, onCta }: {
  icon: React.ReactNode; title: string; subtitle: string; ctaLabel: string; onCta: () => void;
}) {
  return (
    <div className="bg-white dark:bg-[#071131] border border-[#E2E8F0] dark:border-blue-950/40 rounded-xl p-12 text-center shadow-sm">
      <div className="w-16 h-16 rounded-full bg-[#0b1957]/5 dark:bg-blue-950/40 flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-[#1E293B] dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-[#64748B] dark:text-[#7a8ba3] mb-6">{subtitle}</p>
      <button
        onClick={onCta}
        className="px-5 py-2.5 bg-[#0b1957] dark:bg-[#071131] dark:border dark:border-blue-950/40 text-white rounded-xl hover:bg-[#0a1540] dark:hover:bg-[#0f1b3e] font-semibold shadow-[0_4px_20px_rgba(11,25,87,0.3)] hover:shadow-[0_8px_30px_rgba(11,25,87,0.5)] transition-all inline-flex items-center gap-2"
      >
        <Plus className="w-4 h-4" /> {ctaLabel}
      </button>
    </div>
  );
}

// Generic card for templates across all channels (Email / WhatsApp / LinkedIn / Instagram)
function MessageTemplateCard({
  iconBadgeBg,
  icon,
  name,
  preview,
  isDefault,
  category,
  status,
  footerRight,
  onEdit,
  editLink,
  onDelete,
}: {
  iconBadgeBg: string;
  icon: React.ReactNode;
  name: string;
  preview: string;
  isDefault?: boolean;
  category?: React.ReactNode;
  status?: React.ReactNode;
  footerRight?: React.ReactNode;
  onEdit?: () => void;
  editLink?: string;
  onDelete?: () => void;
}) {
  return (
    <div className="bg-white dark:bg-[#071131] border border-[#E2E8F0] dark:border-blue-950/40 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group flex flex-col justify-between">
      <div>
        {/* Top Header Window Preview (as shown in screenshot) */}
        <div className="p-3 pb-1">
          <div className="bg-[#0b1957] dark:bg-[#040a1d] border border-[#0b1957]/20 dark:border-blue-950/60 rounded-xl p-3 flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              {/* Traffic light dots */}
              <div className="flex items-center gap-1.5 pt-1 shrink-0">
                <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
                <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                <div className="w-2 h-2 rounded-full bg-[#10b981]" />
              </div>
              {/* Lines */}
              <div className="flex-1 space-y-1.5 min-w-0 pt-0.5">
                <div className="h-1.5 rounded-full bg-white/30 dark:bg-blue-200/20 w-[85%]" />
                <div className="h-1.5 rounded-full bg-white/20 dark:bg-blue-200/15 w-[65%]" />
                <div className="h-1.5 rounded-full bg-white/12 dark:bg-blue-200/10 w-[40%]" />
              </div>
            </div>
            {/* Channel Icon Badge */}
            <div className={`w-8 h-8 rounded-xl ${iconBadgeBg} flex items-center justify-center shrink-0 shadow-md`}>
              {icon}
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-bold text-[#1E293B] dark:text-white text-sm truncate flex-1">{name}</h3>
            {category}
            {isDefault && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">
                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> Default
              </span>
            )}
          </div>
          {preview ? (
            <p className="text-xs text-[#64748B] dark:text-[#7a8ba3] line-clamp-2 leading-relaxed whitespace-pre-wrap">{preview}</p>
          ) : (
            <p className="text-xs text-[#94A3B8] dark:text-[#7a8ba3] italic">No message body</p>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-4 py-2.5 border-t border-[#E2E8F0] dark:border-blue-950/40 bg-[#F8FAFC] dark:bg-[#071131] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status}
          {footerRight && <div className="text-[10px] text-[#94A3B8] dark:text-[#7a8ba3]">{footerRight}</div>}
        </div>
        <div className="flex items-center gap-2">
          {editLink ? (
            <Link href={editLink} className="flex items-center gap-1 text-xs font-semibold text-[#0b1957] dark:text-white hover:text-[#0a1540] dark:hover:text-[#7a8ba3] transition-colors">
              <Pencil className="w-3 h-3" /> Edit
            </Link>
          ) : onEdit ? (
            <button onClick={onEdit} className="flex items-center gap-1 text-xs font-semibold text-[#0b1957] dark:text-white hover:text-[#0a1540] dark:hover:text-[#7a8ba3] transition-colors">
              <Pencil className="w-3 h-3" /> Edit
            </button>
          ) : null}
          {onDelete && (
            <button onClick={onDelete} className="text-[#94A3B8] hover:text-red-500 transition-colors" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const router = useRouter();
  const { push } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('email');
  const [waMode, setWaMode] = useState<WaMode>('business');

  // ── Email templates ─────────────────────────────────────────
  const { data: templates = [], isLoading: loading, error: queryError } = useEmailTemplates();
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load templates') : '';

  // ── WhatsApp Business (WABA) templates ──────────────────────
  const [waTemplates, setWaTemplates] = useState<WATemplate[]>([]);
  const [waLoading, setWaLoading] = useState(false);
  const [waError, setWaError] = useState('');

  const loadWaTemplates = useCallback(async () => {
    setWaLoading(true);
    setWaError('');
    try {
      const res = await fetchWithTenant('/api/whatsapp-conversations/conversations/templates?channel=waba');
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || d.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const list: WATemplate[] = Array.isArray(data)
        ? data
        : Array.isArray(data.templates) ? data.templates
        : Array.isArray(data.data) ? data.data
        : [];
      setWaTemplates(list);
    } catch (e: any) {
      setWaError(e.message || 'Failed to load WhatsApp templates');
    } finally {
      setWaLoading(false);
    }
  }, []);

  // ── WhatsApp Personal (WAPA) templates ──────────────────────
  const [wapaTemplates, setWapaTemplates] = useState<PersonalWaTemplate[]>([]);
  const [wapaLoading, setWapaLoading] = useState(false);
  const [wapaError, setWapaError] = useState('');

  const loadWapaTemplates = useCallback(async () => {
    setWapaLoading(true);
    setWapaError('');
    try {
      const res = await fetchWithTenant('/api/whatsapp-conversations/conversations/templates?channel=personal');
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || d.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const list: PersonalWaTemplate[] = Array.isArray(data?.templates)
        ? data.templates
        : Array.isArray(data) ? data
        : Array.isArray(data?.data) ? data.data
        : [];
      setWapaTemplates(list);
    } catch (e: any) {
      setWapaError(e.message || 'Failed to load personal WhatsApp templates');
    } finally {
      setWapaLoading(false);
    }
  }, []);

  // ── LinkedIn templates ──────────────────────────────────────
  const { data: liTemplates = [], isLoading: liLoading, error: liQueryError, refetch: refetchLi } = useLinkedInMessageTemplates();
  const liError = liQueryError ? (liQueryError instanceof Error ? liQueryError.message : 'Failed to load LinkedIn templates') : '';
  const deleteLi = useDeleteLinkedInMessageTemplate();

  // ── Instagram templates ─────────────────────────────────────
  const { data: igTemplates = [], isLoading: igLoading, error: igQueryError, refetch: refetchIg } = useInstagramMessageTemplates();
  const igError = igQueryError ? (igQueryError instanceof Error ? igQueryError.message : 'Failed to load Instagram templates') : '';
  const deleteIg = useDeleteInstagramMessageTemplate();

  // ── Modal state ─────────────────────────────────────────────
  const [liModalOpen, setLiModalOpen] = useState(false);
  const [liEditing, setLiEditing] = useState<LinkedInMessageTemplate | null>(null);
  const [igModalOpen, setIgModalOpen] = useState(false);
  const [igEditing, setIgEditing] = useState<InstagramMessageTemplate | null>(null);
  const [wapaModalOpen, setWapaModalOpen] = useState(false);
  const [wapaEditing, setWapaEditing] = useState<PersonalWaTemplate | null>(null);

  // ── Lazy-load WhatsApp lists when their view becomes active ─
  useEffect(() => {
    if (activeTab !== 'whatsapp') return;
    if (waMode === 'business' && waTemplates.length === 0 && !waLoading) loadWaTemplates();
    if (waMode === 'personal' && wapaTemplates.length === 0 && !wapaLoading) loadWapaTemplates();
  }, [activeTab, waMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Delete handlers ─────────────────────────────────────────
  const handleDeleteLi = async (t: LinkedInMessageTemplate) => {
    if (!confirm(`Delete "${t.name}"? This cannot be undone.`)) return;
    try {
      await deleteLi.mutateAsync(t.id);
      push({ variant: 'success', title: 'Template Deleted', description: `"${t.name}" was deleted.` });
    } catch (e: any) {
      push({ variant: 'error', title: 'Delete Failed', description: e?.message || 'Could not delete template.' });
    }
  };

  const handleDeleteIg = async (t: InstagramMessageTemplate) => {
    if (!confirm(`Delete "${t.name}"? This cannot be undone.`)) return;
    try {
      await deleteIg.mutateAsync(t.id);
      push({ variant: 'success', title: 'Template Deleted', description: `"${t.name}" was deleted.` });
    } catch (e: any) {
      push({ variant: 'error', title: 'Delete Failed', description: e?.message || 'Could not delete template.' });
    }
  };

  const handleDeleteWapa = async (t: PersonalWaTemplate) => {
    if (!confirm(`Delete "${t.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetchWithTenant(`/api/whatsapp-conversations/conversations/templates/${t.id}?channel=personal`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      push({ variant: 'success', title: 'Template Deleted', description: `"${t.name}" was deleted.` });
      loadWapaTemplates();
    } catch (e: any) {
      push({ variant: 'error', title: 'Delete Failed', description: e?.message || 'Could not delete template.' });
    }
  };

  // ── Header create button: label + action adapt to active view ─
  const createButton = (() => {
    if (activeTab === 'email') return { label: 'Create Email Template', icon: <Mail className="w-4 h-4" />, onClick: () => router.push('/conversations/templates/create') };
    if (activeTab === 'whatsapp' && waMode === 'business') return { label: 'Create WhatsApp Template', icon: <MessageSquare className="w-4 h-4" />, onClick: () => router.push('/conversations/templates/create/whatsapp') };
    if (activeTab === 'whatsapp' && waMode === 'personal') return { label: 'Create WhatsApp Template', icon: <MessageSquare className="w-4 h-4" />, onClick: () => { setWapaEditing(null); setWapaModalOpen(true); } };
    if (activeTab === 'linkedin') return { label: 'Create LinkedIn Template', icon: <Linkedin className="w-4 h-4" />, onClick: () => { setLiEditing(null); setLiModalOpen(true); } };
    return { label: 'Create Instagram Template', icon: <Instagram className="w-4 h-4" />, onClick: () => { setIgEditing(null); setIgModalOpen(true); } };
  })();

  const TABS: { key: TabType; label: string }[] = [
    { key: 'email', label: 'Email' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'instagram', label: 'Instagram' },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FE] dark:bg-[#000724]">
      {/* Header */}
      <div className="px-8 pt-6">
        <div className="mb-5 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LayoutTemplate className="w-8 h-8 text-[#1E293B] dark:text-white" />
              <h1 className="text-2xl sm:text-4xl font-bold text-[#1E293B] dark:text-white">Templates</h1>
            </div>
            <p className="text-sm text-[#64748B] dark:text-[#7a8ba3] ml-2">
              Manage your communication templates across every channel
            </p>
          </div>
          <button
            onClick={createButton.onClick}
            className="px-4 py-2 bg-[#0b1957] dark:bg-[#071131] dark:border dark:border-blue-950/40 text-white rounded-xl hover:bg-[#0a1540] dark:hover:bg-[#0f1b3e] font-semibold shadow-[0_4px_20px_rgba(11,25,87,0.3)] hover:shadow-[0_8px_30px_rgba(11,25,87,0.5)] w-full sm:w-auto flex items-center justify-center gap-2"
          >
            {createButton.icon}
            {createButton.label}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-[#071131] border-b border-gray-200 dark:border-blue-950/40">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex gap-8">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-[#0b1957] text-[#0b1957] dark:text-[#60a5fa] dark:border-[#60a5fa]'
                    : 'border-transparent text-gray-600 dark:text-[#7a8ba3] hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
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
              <CardSkeleton />
            ) : templates.length === 0 ? (
              <EmptyState
                icon={<FileText className="w-8 h-8 text-[#0b1957]/40 dark:text-white" />}
                title="No templates yet"
                subtitle="Create your first email template to get started"
                ctaLabel="Create Template"
                onCta={() => router.push('/conversations/templates/create')}
              />
            ) : (
              <div className={GRID}>
                {templates.map((template: any) => (
                  <MessageTemplateCard
                    key={template.id}
                    iconBadgeBg="bg-blue-600"
                    icon={<Mail className="w-4 h-4 text-white" />}
                    name={template.name}
                    preview={template.subject || 'No subject'}
                    status={
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full dark:!bg-transparent dark:!border-transparent dark:!px-0 dark:!py-0 dark:!rounded-none dark:!font-extrabold ${template.is_active ? 'bg-green-100 text-green-700 dark:!text-emerald-400' : 'bg-gray-100 text-gray-500 dark:!text-slate-300'}`}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </span>
                    }
                    editLink={`/conversations/templates/edit/${template.id}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── WhatsApp Tab (Business / Personal) ────────────────── */}
        {activeTab === 'whatsapp' && (
          <div>
            {/* Business / Personal segmented toggle - hidden while only one mode is available */}
            {WA_MODES.length > 1 && (
              <div className="inline-flex p-1 mb-6 bg-white dark:bg-[#071131] border border-[#E2E8F0] dark:border-blue-950/40 rounded-xl">
                {WA_MODES.map(m => (
                  <button
                    key={m.key}
                    onClick={() => setWaMode(m.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      waMode === m.key
                        ? 'bg-[#0b1957] text-white shadow-sm'
                        : 'text-[#64748B] dark:text-[#7a8ba3] hover:text-[#1E293B] dark:hover:text-white'
                    }`}
                    title={m.hint}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {/* ── WABA (Business) ── */}
            {waMode === 'business' && (
              <div>
                {waError && (
                  <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
                    <p className="text-red-700 text-sm">{waError}</p>
                    <button onClick={loadWaTemplates} className="ml-4 text-xs font-semibold text-red-600 hover:text-red-800 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Retry
                    </button>
                  </div>
                )}
                {waLoading ? (
                  <CardSkeleton />
                ) : waTemplates.length === 0 && !waError ? (
                  <EmptyState
                    icon={<MessageSquare className="w-8 h-8 text-[#0b1957]/40 dark:text-white" />}
                    title="No WhatsApp Business templates yet"
                    subtitle="Create a Meta-approved WhatsApp Business (WABA) template to get started"
                    ctaLabel="Create WhatsApp Template"
                    onCta={() => router.push('/conversations/templates/create/whatsapp')}
                  />
                ) : (
                  <>
                    <div className="flex justify-end mb-4">
                      <button onClick={loadWaTemplates} disabled={waLoading} className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] dark:text-[#7a8ba3] hover:text-[#1E293B] dark:hover:text-white border border-[#E2E8F0] dark:border-blue-950/40 bg-white dark:bg-[#071131] rounded-lg px-3 py-1.5 transition-colors">
                        <RefreshCw className={`w-3.5 h-3.5 ${waLoading ? 'animate-spin' : ''}`} /> Refresh
                      </button>
                    </div>
                    <div className={GRID}>
                      {waTemplates.map((tpl) => {
                        const bodyText = getBodyText(tpl);
                        const headerInfo = getHeaderInfo(tpl);
                        const buttonCount = tpl.components?.find(c => c.type === 'BUTTONS')?.buttons?.length;
                        return (
                          <MessageTemplateCard
                            key={tpl.id || tpl.name}
                            iconBadgeBg="bg-[#059669]"
                            icon={<HeaderFormatIcon format={headerInfo?.format || 'TEXT'} />}
                            name={tpl.name}
                            preview={bodyText}
                            category={<CategoryBadge category={tpl.category} />}
                            status={<StatusBadge status={tpl.status} />}
                            footerRight={
                              buttonCount
                                ? `${buttonCount} button${buttonCount > 1 ? 's' : ''}`
                                : tpl.language
                            }
                          />
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── WAPA (Personal) ── */}
            {waMode === 'personal' && (
              <div>
                {wapaError && (
                  <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
                    <p className="text-red-700 text-sm">{wapaError}</p>
                    <button onClick={loadWapaTemplates} className="ml-4 text-xs font-semibold text-red-600 hover:text-red-800 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Retry
                    </button>
                  </div>
                )}
                {wapaLoading ? (
                  <CardSkeleton />
                ) : wapaTemplates.length === 0 && !wapaError ? (
                  <EmptyState
                    icon={<MessageSquare className="w-8 h-8 text-[#0b1957]/40 dark:text-white" />}
                    title="No personal WhatsApp templates yet"
                    subtitle="Save a reusable personal WhatsApp message - no Meta approval required"
                    ctaLabel="New Personal Template"
                    onCta={() => { setWapaEditing(null); setWapaModalOpen(true); }}
                  />
                ) : (
                  <>
                    <div className="flex justify-end mb-4">
                      <button onClick={loadWapaTemplates} disabled={wapaLoading} className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] dark:text-[#7a8ba3] hover:text-[#1E293B] dark:hover:text-white border border-[#E2E8F0] dark:border-blue-950/40 bg-white dark:bg-[#071131] rounded-lg px-3 py-1.5 transition-colors">
                        <RefreshCw className={`w-3.5 h-3.5 ${wapaLoading ? 'animate-spin' : ''}`} /> Refresh
                      </button>
                    </div>
                    <div className={GRID}>
                      {wapaTemplates.map((t) => (
                        <MessageTemplateCard
                          key={t.id}
                          iconBadgeBg="bg-[#10b981]"
                          icon={<MessageSquare className="w-4 h-4 text-white" />}
                          name={t.name}
                          preview={[t.header_text, t.content, t.footer_text].filter(Boolean).join('\n')}
                          isDefault={t.is_default}
                          footerRight={t.media_type ? <span className="capitalize">{t.media_type}</span> : null}
                          onEdit={() => { setWapaEditing(t); setWapaModalOpen(true); }}
                          onDelete={() => handleDeleteWapa(t)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── LinkedIn Tab ──────────────────────────────────────── */}
        {activeTab === 'linkedin' && (
          <div>
            {liError && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
                <p className="text-red-700 text-sm">{liError}</p>
                <button onClick={() => refetchLi()} className="ml-4 text-xs font-semibold text-red-600 hover:text-red-800 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            )}
            {liLoading ? (
              <CardSkeleton />
            ) : liTemplates.length === 0 && !liError ? (
              <EmptyState
                icon={<Linkedin className="w-8 h-8 text-[#0b1957]/40 dark:text-white" />}
                title="No LinkedIn templates yet"
                subtitle="Save reusable connection requests and follow-up messages"
                ctaLabel="New LinkedIn Template"
                onCta={() => { setLiEditing(null); setLiModalOpen(true); }}
              />
            ) : (
              <div className={GRID}>
                {liTemplates.map((t) => (
                  <MessageTemplateCard
                    key={t.id}
                    iconBadgeBg="bg-[#0a66c2]"
                    icon={<Linkedin className="w-4 h-4 text-white" />}
                    name={t.name}
                    preview={t.content || t.connection_message || t.followup_message || t.description || ''}
                    isDefault={t.is_default}
                    footerRight={t.category ? <span>{linkedinTemplateTypeLabel(t.category)}</span> : null}
                    onEdit={() => { setLiEditing(t); setLiModalOpen(true); }}
                    onDelete={() => handleDeleteLi(t)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Instagram Tab ─────────────────────────────────────── */}
        {activeTab === 'instagram' && (
          <div>
            {igError && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
                <p className="text-red-700 text-sm">{igError}</p>
                <button onClick={() => refetchIg()} className="ml-4 text-xs font-semibold text-red-600 hover:text-red-800 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            )}
            {igLoading ? (
              <CardSkeleton />
            ) : igTemplates.length === 0 && !igError ? (
              <EmptyState
                icon={<Instagram className="w-8 h-8 text-[#0b1957]/40 dark:text-white" />}
                title="No Instagram templates yet"
                subtitle="Save reusable Instagram DMs - no Meta approval required"
                ctaLabel="New Instagram Template"
                onCta={() => { setIgEditing(null); setIgModalOpen(true); }}
              />
            ) : (
              <div className={GRID}>
                {igTemplates.map((t) => (
                  <MessageTemplateCard
                    key={t.id}
                    iconBadgeBg="bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af]"
                    icon={<Instagram className="w-4 h-4 text-white" />}
                    name={t.name}
                    preview={t.content || t.description || ''}
                    isDefault={t.is_default}
                    footerRight={t.usage_count > 0 ? <span>Used {t.usage_count}×</span> : null}
                    onEdit={() => { setIgEditing(t); setIgModalOpen(true); }}
                    onDelete={() => handleDeleteIg(t)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────── */}
      <CreateLinkedInTemplateModal open={liModalOpen} editing={liEditing} onClose={() => setLiModalOpen(false)} />
      <CreateInstagramTemplateModal open={igModalOpen} editing={igEditing} onClose={() => setIgModalOpen(false)} />
      <CreatePersonalWaTemplateModal open={wapaModalOpen} editing={wapaEditing} onClose={() => setWapaModalOpen(false)} onSaved={loadWapaTemplates} />
    </div>
  );
}
