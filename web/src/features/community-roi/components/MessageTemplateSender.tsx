'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Send, Clock, Search, CheckCircle, AlertCircle } from 'lucide-react';
import { useSendInstantMessages, useScheduleMessages } from '@lad/frontend-features/community-roi';

// ── Meta template shape from /api/whatsapp-conversations/conversations/templates?channel=waba
interface MetaTemplate {
  name: string;           // template key, e.g. "bni_member_followup_1"
  body: string;           // raw body with {{1}}, {{2}} placeholders
  parameter_count: number;
  parameters: string[];   // placeholder names
  status: string;         // APPROVED / PENDING / etc.
  category: string;
  language: string;
  language_code: string;
}

interface MessageTemplateSenderProps {
  memberName: string;
  noInteractionCount: number;
  recommendations: any[];
  allMembers: any[];
  onClose: () => void;
  onSuccess: (result: any) => void;
}

type SendMode = 'instant' | 'schedule';

// Friendly display name from snake_case key
const displayName = (key: string) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// Status badge colour
const statusColor = (s: string) => {
  if (s === 'APPROVED') return 'bg-green-100 text-green-700';
  if (s === 'PENDING')  return 'bg-yellow-100 text-yellow-700';
  return 'bg-slate-100 text-slate-500';
};

const MessageTemplateSender: React.FC<MessageTemplateSenderProps> = ({
  memberName,
  noInteractionCount,
  recommendations,
  allMembers,
  onClose,
  onSuccess,
}) => {
  const { sendMessages, isLoading: isSending } = useSendInstantMessages();
  const { scheduleMessages, isLoading: isScheduling } = useScheduleMessages();

  const [sendMode, setSendMode]         = useState<SendMode>('instant');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectAll, setSelectAll]       = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [step, setStep]                 = useState<'template' | 'members' | 'confirm'>('template');

  // Meta templates from WABA endpoint
  const [metaTemplates, setMetaTemplates]     = useState<MetaTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templateSearch, setTemplateSearch]   = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<MetaTemplate | null>(null);

  // Fetch Meta-approved templates on mount
  useEffect(() => {
    setTemplatesLoading(true);
    fetch('/api/whatsapp-conversations/conversations/templates?channel=waba')
      .then(r => r.json())
      .then(json => {
        const list: MetaTemplate[] = json?.data ?? [];
        // Sort: APPROVED first, then alphabetical
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
  const isLoading = isSending || isScheduling;

  const handleSend = async () => {
    if (!selectedTemplate) return;

    try {
      if (sendMode === 'instant') {
        if (selectedMembers.length === 0 && !selectAll) {
          alert('Please select at least one member');
          return;
        }

        const memberCount = selectAll ? allMembers.length : selectedMembers.length;
        onSuccess({ broadcasting: true, total: memberCount });
        onClose();

        // Fire-and-forget — pass metaTemplateName so backend uses it directly
        sendMessages({
          sendToAllMembers: selectAll,
          memberIds: selectAll ? undefined : selectedMembers,
          templateIds: [],               // not used when metaTemplateName is set
          recommendations,
          metaTemplateName: selectedTemplate.name,
          languageCode: selectedTemplate.language_code || 'en',
          templateParameterCount: selectedTemplate.parameter_count ?? 1,
        } as any).then((result: any) => {
          const inner = result?.data ?? result;
          const sent   = inner?.sentCount  ?? 0;
          const failed = inner?.failedCount ?? 0;
          if (failed > 0) {
            console.warn(`[Broadcast] ${sent} sent, ${failed} failed`);
            console.warn('[Broadcast] Failed members:', JSON.stringify(inner?.failedMembers, null, 2));
          } else {
            console.log(`[Broadcast] Complete — ${sent} sent`);
          }
        }).catch((err: any) => {
          console.error('[Broadcast] Error:', err?.response?.data ?? err?.message ?? err);
        });

      } else {
        if (!scheduledTime) { alert('Please select a scheduled time'); return; }

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
      }
    } catch (error: any) {
      console.error('Error sending messages:', error);
      alert(error?.response?.data?.error ?? error?.message ?? 'Unknown error');
    }
  };

  // ─── STEP 1: Template Selection ────────────────────────────────────────────
  if (step === 'template') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Send Message</h2>
          <p className="text-sm text-slate-500 mb-5">Select a Meta-approved template to send</p>

          {/* Search */}
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

          {/* Template list */}
          <div className="flex-1 overflow-y-auto space-y-2 mb-5 pr-1">
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
                      <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>
                        {t.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono leading-relaxed line-clamp-3">
                      {t.body || '(no body text)'}
                    </p>
                    {t.parameter_count > 0 && (
                      <p className="text-[10px] text-slate-400 mt-1.5">
                        {t.parameter_count} parameter{t.parameter_count > 1 ? 's' : ''}: {t.parameters.map(p => `{{${p}}}`).join(', ')}
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Send mode */}
          {selectedTemplate && (
            <div className="flex gap-3 mb-5">
              <button
                onClick={() => setSendMode('instant')}
                className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition ${
                  sendMode === 'instant'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Send className="w-4 h-4" />
                Send Instantly
              </button>
              <button
                onClick={() => setSendMode('schedule')}
                className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition ${
                  sendMode === 'schedule'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Clock className="w-4 h-4" />
                Schedule for Later
              </button>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition">
              Cancel
            </button>
            <button
              onClick={() => setStep('members')}
              disabled={!selectedTemplate}
              className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP 2: Member Selection ───────────────────────────────────────────────
  if (step === 'members') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Select Recipients</h2>
          <p className="text-sm text-slate-500 mb-5">
            Template: <span className="font-semibold text-indigo-600">{displayName(selectedTemplate?.name ?? '')}</span>
          </p>

          {/* Select all */}
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

          {/* Member list */}
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
                </label>
              ))}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-5 text-sm text-blue-900">
            📱 Will send to <strong>{recipientCount}</strong> {recipientCount === 1 ? 'member' : 'members'}
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={() => setStep('template')} className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition">
              Back
            </button>
            <button
              onClick={() => setStep('confirm')}
              disabled={recipientCount === 0}
              className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP 3: Confirm / Schedule ────────────────────────────────────────────
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

        {/* Summary */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-2 text-sm">
          <p><span className="text-slate-500">Template:</span> <span className="font-semibold text-slate-900">{displayName(selectedTemplate?.name ?? '')}</span></p>
          <p><span className="text-slate-500">Mode:</span> <span className="font-semibold text-slate-900">{sendMode === 'instant' ? 'Send Immediately' : 'Scheduled'}</span></p>
          <p><span className="text-slate-500">Recipients:</span> <span className="font-semibold text-slate-900">{recipientCount} members</span></p>
          {sendMode === 'schedule' && scheduledTime && (
            <p><span className="text-slate-500">Send At:</span> <span className="font-semibold text-slate-900">{new Date(scheduledTime).toLocaleString()}</span></p>
          )}
          {selectedTemplate?.body && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-slate-500 mb-1">Message preview:</p>
              <p className="text-xs text-slate-600 font-mono bg-white p-2 rounded border border-slate-200 whitespace-pre-wrap">
                {selectedTemplate.body}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={() => setStep('members')} disabled={isLoading} className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition">
            Back
          </button>
          <button
            onClick={handleSend}
            disabled={isLoading || (sendMode === 'schedule' && !scheduledTime)}
            className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition flex items-center gap-2"
          >
            {isLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {sendMode === 'instant' ? 'Send Now' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageTemplateSender;
