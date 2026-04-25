'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Send, Clock, Search, CheckCircle, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { useScheduleMessages } from '@lad/frontend-features/community-roi';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

interface MetaTemplate {
  name: string;
  body: string;
  parameter_count: number;
  parameters: string[];
  status: string;
  quality_score: string;
  quality_pending: boolean;
  category: string;
  language: string;
  language_code: string;
  header_type: string;
  header_url: string;
}

interface MessageTemplateSenderProps {
  memberName: string;
  noInteractionCount: number;
  recommendations: any[];
  allMembers: any[];
  onClose: () => void;
  onSuccess: (result: any) => void;
}

type Step = 'template' | 'params' | 'members' | 'confirm';
type SendMode = 'instant' | 'schedule';
type ParamMapping = Array<{ field: string; customValue: string }>;

// ── Field options available for parameter mapping ──────────────────────────
const FIELD_OPTIONS = [
  { value: 'name',       label: 'Full Name' },
  { value: 'first_name', label: 'First Name' },
  { value: 'company',    label: 'Company' },
  { value: 'phone',      label: 'Phone Number' },
  { value: 'email',      label: 'Email' },
  { value: 'custom',     label: 'Custom text...' },
];

/**
 * Inspect the body text around {{N}} to intelligently suggest a default field.
 * E.g. "Hi {{1}}, your company {{2}} is..." → 'name', 'company'
 */
function suggestField(body: string, paramNumber: number): string {
  const regex = new RegExp(`\\{\\{${paramNumber}\\}\\}`);
  const match = regex.exec(body);
  if (!match) return 'name';
  const ctx = body.slice(Math.max(0, match.index - 50), match.index + 50).toLowerCase();
  if (ctx.includes('company') || ctx.includes('business') || ctx.includes('organization')) return 'company';
  if (ctx.includes('phone') || ctx.includes('mobile') || ctx.includes('contact number')) return 'phone';
  if (ctx.includes('email')) return 'email';
  return 'name';
}

function resolveParam(member: any, field: string, customValue: string): string {
  if (field === 'custom') return customValue;
  if (field === 'first_name') return ((member?.name || '').split(' ')[0]) || '';
  return String(member?.[field] ?? '');
}

function highlightBody(body: string): React.ReactNode[] {
  return body.split(/(\{\{[^}]+\}\})/).map((part, i) =>
    /^\{\{[^}]+\}\}$/.test(part)
      ? <span key={i} className="inline bg-indigo-100 text-indigo-700 px-0.5 rounded font-mono font-bold text-xs">{part}</span>
      : <span key={i}>{part}</span>
  );
}

const displayName = (key: string) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const statusColor = (s: string, qualityPending?: boolean) => {
  if (qualityPending)   return 'bg-amber-100 text-amber-700';
  if (s === 'APPROVED' || s === 'ACTIVE') return 'bg-green-100 text-green-700';
  if (s === 'PENDING')  return 'bg-yellow-100 text-yellow-700';
  if (s === 'REJECTED') return 'bg-red-100 text-red-700';
  if (s === 'PAUSED')   return 'bg-orange-100 text-orange-700';
  return 'bg-slate-100 text-slate-500';
};

const statusLabel = (s: string, qualityPending?: boolean, qualityScore?: string) => {
  if (qualityPending) return '⏳ Quality Pending';
  if (s === 'ACTIVE')   return qualityScore ? `✓ Active · ${qualityScore}` : '✓ Active';
  if (s === 'APPROVED') return '✓ Approved';
  if (s === 'REJECTED') return '✗ Rejected';
  if (s === 'PAUSED')   return '⏸ Paused';
  return s;
};

const MessageTemplateSender: React.FC<MessageTemplateSenderProps> = ({
  allMembers,
  onClose,
  onSuccess,
}) => {
  const { scheduleMessages, isLoading: isScheduling } = useScheduleMessages();

  const [sendMode, setSendMode]     = useState<SendMode>('instant');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectAll, setSelectAll]   = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [step, setStep]             = useState<Step>('template');

  const [metaTemplates, setMetaTemplates]       = useState<MetaTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templateSearch, setTemplateSearch]     = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<MetaTemplate | null>(null);

  const [paramMapping, setParamMapping] = useState<ParamMapping>([]);
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');

  // Fetch Meta-approved templates on mount
  useEffect(() => {
    setTemplatesLoading(true);
    fetch('/api/whatsapp-conversations/conversations/templates?channel=waba')
      .then(r => r.json())
      .then(json => {
        const list: MetaTemplate[] = (json?.data ?? []).map((t: any) => ({
          name:            t.name || '',
          body:            t.body || '',
          parameter_count: t.parameter_count || 0,
          parameters:      t.parameters || [],
          status:          t.status || '',
          category:        t.category || '',
          language:        t.language || 'en',
          language_code:   t.language_code || t.language || 'en',
          quality_score:   t.quality_score || '',
          quality_pending: t.quality_pending ?? false,
          header_type:     t.header_type || '',,
          header_url:      t.header_url || '',
        }));
        list.sort((a, b) => {
          if (a.status === 'APPROVED' && b.status !== 'APPROVED') return -1;
          if (b.status === 'APPROVED' && a.status !== 'APPROVED') return 1;
          return a.name.localeCompare(b.name);
        });
        setMetaTemplates(list);
      })
      .catch(err => console.error('[MetaTemplates] fetch error', err))
      .finally(() => setTemplatesLoading(false));
  }, []);

  const filteredTemplates = useMemo(() =>
    metaTemplates.filter(t =>
      t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.body.toLowerCase().includes(templateSearch.toLowerCase())
    ),
  [metaTemplates, templateSearch]);

  // When a template is chosen, pre-fill param mapping and media URL with intelligent defaults
  const initParamMapping = useCallback((template: MetaTemplate) => {
    const mapping: ParamMapping = Array.from({ length: template.parameter_count }, (_, i) => ({
      field:       suggestField(template.body, i + 1),
      customValue: '',
    }));
    setParamMapping(mapping);
    const isMediaHeader = ['image', 'document', 'video'].includes(template.header_type);
    setHeaderMediaUrl(isMediaHeader && template.header_url?.startsWith('https://') ? template.header_url : '');
  }, []);

  // Member helpers
  const handleSelectAllChange = (checked: boolean) => {
    setSelectAll(checked);
    setSelectedMembers(checked ? allMembers.map((m: any) => m.id) : []);
  };

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers(prev => {
      const updated = prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId];
      setSelectAll(updated.length === allMembers.length && allMembers.length > 0);
      return updated;
    });
  };

  const recipientCount = selectAll ? allMembers.length : selectedMembers.length;
  const previewMember  = allMembers[0] ?? null;

  const buildPreviewBody = useCallback(() => {
    if (!selectedTemplate) return '';
    let body = selectedTemplate.body;
    paramMapping.forEach((m, i) => {
      const value = previewMember
        ? (resolveParam(previewMember, m.field, m.customValue) || '…')
        : (m.field === 'custom' ? m.customValue || '…' : `[${FIELD_OPTIONS.find(f => f.value === m.field)?.label ?? m.field}]`);
      body = body.replace(new RegExp(`\\{\\{${i + 1}\\}\\}`, 'g'), `[${value}]`);
    });
    return body;
  }, [selectedTemplate, paramMapping, previewMember]);

  const handleSend = async () => {
    if (!selectedTemplate) return;
    const targetMembers = selectAll
      ? allMembers
      : allMembers.filter((m: any) => selectedMembers.includes(m.id));

    if (targetMembers.length === 0) { alert('Please select at least one member'); return; }

    const memberCount = targetMembers.length;

    if (sendMode === 'instant') {
      onSuccess({ broadcasting: true, total: memberCount });
      onClose();

      // Build per-member parameters from the mapping
      const membersPayload = targetMembers.map((m: any) => ({
        phone: m.phone,
        name:  m.name,
        parameters: paramMapping.length > 0
          ? paramMapping.map(mp => resolveParam(m, mp.field, mp.customValue))
          : (m.name ? [m.name] : []),
      }));

      fetchWithTenant('/api/whatsapp-conversations/conversations/send-template-to-members', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          members:       membersPayload,
          template_name: selectedTemplate.name,
          language_code: selectedTemplate.language_code || 'en',
          header_type:   selectedTemplate.header_type || '',
          header_url:    headerMediaUrl,
        }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.failed > 0) {
            console.warn(`[TemplateSend] ${data.sent} sent, ${data.failed} failed`, data.results);
          } else {
            console.log(`[TemplateSend] Complete — ${data.sent} sent`);
          }
        })
        .catch(err => console.error('[TemplateSend] Error:', err));

    } else {
      // Schedule mode — uses hook (per-member mapping not yet supported)
      if (!scheduledTime) { alert('Please select a scheduled time'); return; }
      try {
        const result = await scheduleMessages({
          scheduledTime,
          sendToAllMembers: selectAll,
          memberIds: selectAll ? undefined : selectedMembers,
          templateIds: [],
          metaTemplateName: selectedTemplate.name,
          languageCode: selectedTemplate.language_code || 'en',
          templateParameterCount: selectedTemplate.parameter_count ?? 1,
        } as any);
        if ((result as any)?.success || (result as any)?.id) {
          onSuccess(result); onClose();
        } else {
          alert((result as any)?.error ?? 'Failed to schedule messages');
        }
      } catch (error: any) {
        alert(error?.response?.data?.error ?? error?.message ?? 'Unknown error');
      }
    }
  };

  // ─── STEP 1: Template Selection ────────────────────────────────────────────
  if (step === 'template') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Send Message</h2>
          <p className="text-sm text-slate-500 mb-5">Select a Meta-approved template to send</p>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search templates..."
              value={templateSearch}
              onChange={e => setTemplateSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 mb-5 pr-1">
            {templatesLoading ? (
              <div className="flex items-center justify-center py-10 text-slate-500 text-sm gap-2">
                <span className="w-4 h-4 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
                Loading templates from Meta...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-sm gap-2">
                <AlertCircle className="w-8 h-8" />
                <p>{templateSearch ? 'No templates match your search.' : 'No approved templates found.'}</p>
              </div>
            ) : (
              filteredTemplates.map(t => {
                const isSelected = selectedTemplate?.name === t.name;
                return (
                  <button
                    key={t.name}
                    onClick={() => setSelectedTemplate(t)}
                    className={`w-full text-left p-4 border rounded-xl transition ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {isSelected && <CheckCircle className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                      <span className="font-semibold text-slate-900 text-sm">{displayName(t.name)}</span>
                      <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor(t.status, t.quality_pending)}`}>
                        {statusLabel(t.status, t.quality_pending, t.quality_score)}
                      </span>
                    </div>
                    {t.quality_pending && (
                      <p className="text-[10px] text-amber-600 mt-1 mb-1">
                        ⚠️ Meta is assessing quality — delivery may be limited until approved.
                      </p>
                    )}
                    <p className="text-xs text-slate-500 font-mono leading-relaxed line-clamp-3">
                      {t.body || '(no body text)'}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {t.parameter_count > 0 && (
                        <p className="text-[10px] text-indigo-500">
                          {t.parameter_count} param{t.parameter_count > 1 ? 's' : ''}: {t.parameters.map(p => `{{${p}}}`).join(', ')}
                        </p>
                      )}
                      {t.header_type && t.header_type !== 'text' && (
                        <p className="text-[10px] text-slate-400">Header: {t.header_type}</p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {selectedTemplate && (
            <div className="flex gap-3 mb-5">
              <button
                onClick={() => setSendMode('instant')}
                className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition ${
                  sendMode === 'instant' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Send className="w-4 h-4" />Send Instantly
              </button>
              <button
                onClick={() => setSendMode('schedule')}
                className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition ${
                  sendMode === 'schedule' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Clock className="w-4 h-4" />Schedule for Later
              </button>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition">
              Cancel
            </button>
            <button
              onClick={() => {
                if (!selectedTemplate) return;
                const hasMediaHeader = ['image', 'document', 'video'].includes(selectedTemplate.header_type);
                if (selectedTemplate.parameter_count > 0 || hasMediaHeader) {
                  initParamMapping(selectedTemplate);
                  setStep('params');
                } else {
                  setStep('members');
                }
              }}
              disabled={!selectedTemplate}
              className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition flex items-center gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP 2: Parameter Mapping ──────────────────────────────────────────────
  if (step === 'params') {
    const paramCount = selectedTemplate?.parameter_count ?? 0;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Map Parameters</h2>
          <p className="text-sm text-slate-500 mb-5">
            Template: <span className="font-semibold text-indigo-600">{displayName(selectedTemplate?.name ?? '')}</span>
          </p>

          {/* Template body with highlighted placeholders */}
          <div className="mb-5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-1">Template body</p>
            <p className="text-sm text-slate-700 leading-relaxed font-mono whitespace-pre-wrap">
              {selectedTemplate ? highlightBody(selectedTemplate.body) : ''}
            </p>
          </div>

          {/* Media URL input for image/document/video header templates */}
          {['image', 'document', 'video'].includes(selectedTemplate?.header_type ?? '') && (
            <div className="mb-3 p-4 border border-slate-200 rounded-xl bg-white">
              <p className="text-sm font-medium text-slate-700 mb-2 capitalize">
                Header {selectedTemplate?.header_type} URL
              </p>
              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={headerMediaUrl}
                onChange={e => setHeaderMediaUrl(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Public URL for the {selectedTemplate?.header_type} to attach to this template
              </p>
            </div>
          )}

          {/* One row per {{N}} parameter */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 mb-4">
            {Array.from({ length: paramCount }, (_, i) => {
              const paramNum = i + 1;
              const mapping  = paramMapping[i] ?? { field: 'name', customValue: '' };
              const resolved = previewMember
                ? resolveParam(previewMember, mapping.field, mapping.customValue)
                : null;

              return (
                <div key={i} className="p-4 border border-slate-200 rounded-xl bg-white">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded font-mono text-xs font-bold">
                      {`{{${paramNum}}}`}
                    </span>
                    <span className="text-sm font-medium text-slate-700">Parameter {paramNum}</span>
                    {resolved !== null && (
                      <span className="ml-auto text-xs text-slate-400">
                        Preview: <span className="font-semibold text-slate-700">{resolved || '—'}</span>
                      </span>
                    )}
                  </div>

                  <select
                    value={mapping.field}
                    onChange={e => {
                      const updated = [...paramMapping];
                      updated[i] = { ...updated[i], field: e.target.value };
                      setParamMapping(updated);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    {FIELD_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  {mapping.field === 'custom' && (
                    <input
                      type="text"
                      placeholder="Enter fixed text for all members..."
                      value={mapping.customValue}
                      onChange={e => {
                        const updated = [...paramMapping];
                        updated[i] = { ...updated[i], customValue: e.target.value };
                        setParamMapping(updated);
                      }}
                      className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Live message preview using first member */}
          {previewMember && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-xs font-medium text-green-700 mb-1">
                Preview for <span className="font-bold">{previewMember.name}</span>
              </p>
              <p className="text-xs text-green-900 font-mono whitespace-pre-wrap leading-relaxed">
                {buildPreviewBody()}
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button onClick={() => setStep('template')} className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setStep('members')}
              className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition flex items-center gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP 3: Member Selection ───────────────────────────────────────────────
  if (step === 'members') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Select Recipients</h2>
          <p className="text-sm text-slate-500 mb-5">
            Template: <span className="font-semibold text-indigo-600">{displayName(selectedTemplate?.name ?? '')}</span>
          </p>

          <div className="mb-4 pb-4 border-b border-slate-200">
            <label className="flex items-center p-3 bg-indigo-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={e => handleSelectAllChange(e.target.checked)}
                className="w-4 h-4 mr-3 cursor-pointer accent-indigo-600"
              />
              <span className="font-medium text-slate-900">Send to all {allMembers.length} members</span>
            </label>
          </div>

          {!selectAll && (
            <div className="space-y-1 mb-5 max-h-64 overflow-y-auto">
              {allMembers.map((member: any) => (
                <label key={member.id} className="flex items-center p-3 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(member.id)}
                    onChange={() => handleMemberToggle(member.id)}
                    className="w-4 h-4 mr-3 cursor-pointer accent-indigo-600"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 text-sm">{member.name}</p>
                    {member.phone && <p className="text-xs text-slate-400">{member.phone}</p>}
                  </div>
                  {/* Show resolved param preview per member */}
                  {paramMapping.length > 0 && (
                    <p className="text-[10px] text-slate-400 ml-2 max-w-[120px] truncate">
                      {paramMapping.map(m => resolveParam(member, m.field, m.customValue) || '—').join(' · ')}
                    </p>
                  )}
                </label>
              ))}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-5 text-sm text-blue-900">
            📱 Will send to <strong>{recipientCount}</strong> {recipientCount === 1 ? 'member' : 'members'}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                const hasMediaHeader = ['image', 'document', 'video'].includes(selectedTemplate?.header_type ?? '');
                setStep((selectedTemplate?.parameter_count ?? 0) > 0 || hasMediaHeader ? 'params' : 'template');
              }}
              className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setStep('confirm')}
              disabled={recipientCount === 0}
              className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition flex items-center gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP 4: Confirm / Schedule ────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4">
        <h2 className="text-2xl font-bold text-slate-900 mb-5">
          {sendMode === 'instant' ? 'Confirm Send' : 'Schedule Message'}
        </h2>

        {sendMode === 'schedule' && (
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-700 mb-2">Scheduled Date & Time</label>
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={e => setScheduledTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}

        <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-2 text-sm">
          <p><span className="text-slate-500">Template:</span> <span className="font-semibold text-slate-900">{displayName(selectedTemplate?.name ?? '')}</span></p>
          <p><span className="text-slate-500">Mode:</span> <span className="font-semibold text-slate-900">{sendMode === 'instant' ? 'Send Immediately' : 'Scheduled'}</span></p>
          <p><span className="text-slate-500">Recipients:</span> <span className="font-semibold text-slate-900">{recipientCount} members</span></p>
          {sendMode === 'schedule' && scheduledTime && (
            <p><span className="text-slate-500">Send At:</span> <span className="font-semibold">{new Date(scheduledTime).toLocaleString()}</span></p>
          )}

          {/* Parameter mapping summary */}
          {paramMapping.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-slate-500 mb-2 text-xs font-medium uppercase tracking-wide">Parameter mapping</p>
              <div className="space-y-1">
                {paramMapping.map((m, i) => (
                  <p key={i} className="text-xs flex items-center gap-1.5">
                    <span className="font-mono text-indigo-600 bg-indigo-50 px-1 rounded">{`{{${i + 1}}}`}</span>
                    <span className="text-slate-400">→</span>
                    <span className="font-semibold text-slate-700">
                      {m.field === 'custom' ? `"${m.customValue}"` : (FIELD_OPTIONS.find(f => f.value === m.field)?.label ?? m.field)}
                    </span>
                    {previewMember && (
                      <span className="text-slate-400 ml-1">
                        e.g. &quot;{resolveParam(previewMember, m.field, m.customValue)}&quot;
                      </span>
                    )}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Message preview */}
          {selectedTemplate?.body && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-slate-500 mb-1 text-xs">Message preview ({previewMember?.name ?? 'first member'}):</p>
              <p className="text-xs text-slate-600 font-mono bg-white p-2 rounded border border-slate-200 whitespace-pre-wrap leading-relaxed">
                {buildPreviewBody() || selectedTemplate.body}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={() => setStep('members')} disabled={isScheduling} className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <button
            onClick={handleSend}
            disabled={isScheduling || (sendMode === 'schedule' && !scheduledTime)}
            className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition flex items-center gap-2"
          >
            {isScheduling && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {sendMode === 'instant' ? 'Send Now' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageTemplateSender;
