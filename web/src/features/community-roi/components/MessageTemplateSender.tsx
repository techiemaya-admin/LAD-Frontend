'use client';

import React, { useState, useMemo } from 'react';
import { Send, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import {
  useRecommendationTemplates,
  useSendInstantMessages,
  useScheduleMessages,
  CommunicationTemplate,
} from '@lad/frontend-features/community-roi';

interface MessageTemplateSenderProps {
  memberName: string;
  noInteractionCount: number;
  recommendations: any[];
  allMembers: any[];
  onClose: () => void;
  onSuccess: (result: any) => void;
}

type SendMode = 'instant' | 'schedule';

const MessageTemplateSender: React.FC<MessageTemplateSenderProps> = ({
  memberName,
  noInteractionCount,
  recommendations,
  allMembers,
  onClose,
  onSuccess,
}) => {
  const { templates, isLoading: templatesLoading } = useRecommendationTemplates();
  const { sendMessages, isLoading: isSending } = useSendInstantMessages();
  const { scheduleMessages, isLoading: isScheduling } = useScheduleMessages();

  const [sendMode, setSendMode] = useState<SendMode>('instant');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [step, setStep] = useState<'mode' | 'templates' | 'members' | 'confirm'>('mode');

  // Calculate week dates for template preview
  const getWeekMonday = (weekNum: number) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(monday.getDate() + daysToMonday + (weekNum - 1) * 7);
    return monday.toISOString().split('T')[0];
  };

  // Preview messages with replaced variables
  const previewMessages = useMemo(() => {
    return templates.map(template => {
      let body = template.content || template.body || '';

      // Replace variables
      body = body.replace(/{{member_name}}/g, memberName);
      body = body.replace(/{{no_interaction_count}}/g, noInteractionCount.toString());
      body = body.replace(/{{week1_date}}/g, getWeekMonday(1));
      body = body.replace(/{{week2_date}}/g, getWeekMonday(2));

      // Get top 3 recommendations for week 1
      const week1Recs = recommendations
        .filter(r => r.week_number === 1)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      const memberNames = week1Recs.map(r => r.member_b || '—').join(', ');
      body = body.replace(/{{member1}},\s*{{member2}},\s*{{member3}}/g, memberNames);
      body = body.replace(/{{member1}}/g, week1Recs[0]?.member_b || '—');
      body = body.replace(/{{member2}}/g, week1Recs[1]?.member_b || '—');
      body = body.replace(/{{member3}}/g, week1Recs[2]?.member_b || '—');

      return {
        ...template,
        previewBody: body,
      };
    });
  }, [templates, memberName, noInteractionCount, recommendations]);

  const handleSelectAllChange = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedMembers(allMembers.map(m => m.id));
    } else {
      setSelectedMembers([]);
    }
  };

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers(prev => {
      const updated = prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId];

      // Auto-check "Select All" if all members are now selected
      if (updated.length === allMembers.length && allMembers.length > 0) {
        setSelectAll(true);
      } else {
        setSelectAll(false);
      }

      return updated;
    });
  };

  const handleSend = async () => {
    try {
      if (sendMode === 'instant') {
        if (selectedMembers.length === 0 && !selectAll) {
          alert('Please select at least one member');
          return;
        }

        const result = await sendMessages({
          sendToAllMembers: selectAll,
          memberIds: selectAll ? undefined : selectedMembers,
          templateIds: selectedTemplateIds,
          recommendations,
        });

        if (result.success) {
          onSuccess(result);
          onClose();
        } else {
          alert(`Error: ${result.error}`);
        }
      } else {
        // Schedule mode
        if (!scheduledTime) {
          alert('Please select a scheduled time');
          return;
        }

        const result = await scheduleMessages({
          scheduledTime,
          sendToAllMembers: selectAll,
          memberIds: selectAll ? undefined : selectedMembers,
          templateIds: selectedTemplateIds,
        });

        if (result.success) {
          onSuccess(result);
          onClose();
        } else {
          alert(`Error: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Error sending messages:', error);
      alert('Failed to send messages');
    }
  };

  const recipientCount = sendMode === 'instant' ? selectedMembers.length : (selectAll ? allMembers.length : selectedMembers.length);
  const isLoading = templatesLoading || isSending || isScheduling;

  // Step 1: Send Mode Selection
  if (step === 'mode') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Send Recommendations</h2>
          <p className="text-sm text-slate-500 mb-6">
            Choose how you'd like to send the WhatsApp recommendations to members
          </p>

          {/* Message Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-slate-900 mb-3">Message Preview</h3>
            <div className="space-y-4">
              {previewMessages.map((msg, idx) => (
                <div key={msg.id} className="bg-white rounded-lg p-3 text-sm">
                  <p className="text-xs text-slate-500 font-medium mb-1">Template {idx + 1}</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{msg.previewBody}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Send Mode Selection */}
          <div className="space-y-3 mb-6">
            <label className="flex items-start p-4 border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition">
              <input
                type="radio"
                checked={sendMode === 'instant'}
                onChange={() => setSendMode('instant')}
                className="mt-1 mr-3 cursor-pointer"
              />
              <div>
                <p className="font-semibold text-slate-900">Send Instantly</p>
                <p className="text-xs text-slate-500 mt-1">
                  Select specific members and send messages immediately
                </p>
              </div>
            </label>

            <label className="flex items-start p-4 border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition">
              <input
                type="radio"
                checked={sendMode === 'schedule'}
                onChange={() => setSendMode('schedule')}
                className="mt-1 mr-3 cursor-pointer"
              />
              <div>
                <p className="font-semibold text-slate-900">Schedule for Later</p>
                <p className="text-xs text-slate-500 mt-1">
                  Schedule messages to send at a specific date and time
                </p>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={() => setStep('templates')}
              className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Template Selection
  if (step === 'templates') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Select Templates</h2>
          <p className="text-sm text-slate-500 mb-6">
            Choose which WhatsApp templates to send. Each selected template will be sent as a separate message.
          </p>

          {templatesLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-500 text-sm">
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-sm gap-2">
              <AlertCircle className="w-8 h-8" />
              <p>No WhatsApp templates found for this tenant.</p>
              <p className="text-xs text-slate-400">Run the seed SQL to add Meta-approved templates.</p>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {previewMessages.map((msg) => (
                <label
                  key={msg.id}
                  className={`flex items-start p-4 border rounded-xl cursor-pointer transition ${
                    selectedTemplateIds.includes(msg.id)
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTemplateIds.includes(msg.id)}
                    onChange={() => {
                      setSelectedTemplateIds(prev =>
                        prev.includes(msg.id)
                          ? prev.filter(id => id !== msg.id)
                          : [...prev, msg.id]
                      );
                    }}
                    className="mt-1 mr-3 cursor-pointer accent-indigo-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm mb-1">{msg.name}</p>
                    <p className="text-xs text-slate-500 whitespace-pre-wrap break-words leading-relaxed">
                      {msg.previewBody}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setStep('mode')}
              className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition"
            >
              Back
            </button>
            <button
              onClick={() => setStep('members')}
              disabled={selectedTemplateIds.length === 0}
              className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition"
            >
              Next ({selectedTemplateIds.length} selected)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Member Selection
  if (step === 'members') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {sendMode === 'instant' ? 'Select Members' : 'Choose Recipients'}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {sendMode === 'instant'
              ? 'Select which members to send the recommendations to'
              : 'Send to all members or select specific ones'}
          </p>

          {/* Select All Checkbox */}
          <div className="mb-6 pb-6 border-b border-slate-200">
            <label className="flex items-center p-3 bg-indigo-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={e => handleSelectAllChange(e.target.checked)}
                className="w-4 h-4 mr-3 cursor-pointer"
              />
              <span className="font-medium text-slate-900">Send to all {allMembers.length} members</span>
            </label>
          </div>

          {/* Member List */}
          {!selectAll && (
            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
              {allMembers.map(member => (
                <label key={member.id} className="flex items-center p-3 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(member.id)}
                    onChange={() => handleMemberToggle(member.id)}
                    className="w-4 h-4 mr-3 cursor-pointer"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{member.name}</p>
                    {member.phone && (
                      <p className="text-xs text-slate-500">{member.phone}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Recipient Count */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-blue-900">
              📱 Will send to <strong>{recipientCount}</strong> {recipientCount === 1 ? 'member' : 'members'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setStep('templates')}
              className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition"
            >
              Back
            </button>
            <button
              onClick={() => setStep('confirm')}
              disabled={
                sendMode === 'instant'
                  ? selectedMembers.length === 0
                  : sendMode === 'schedule' && selectedMembers.length === 0 && !selectAll
              }
              className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Confirmation / Schedule Time
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {sendMode === 'instant' ? 'Confirm Send' : 'Schedule Messages'}
        </h2>

        {sendMode === 'schedule' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Scheduled Date & Time
            </label>
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={e => setScheduledTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}

        {/* Summary */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-slate-600">Mode:</span>{' '}
              <span className="font-medium text-slate-900">{sendMode === 'instant' ? 'Send Immediately' : 'Schedule'}</span>
            </p>
            <p>
              <span className="text-slate-600">Recipients:</span>{' '}
              <span className="font-medium text-slate-900">{recipientCount} members</span>
            </p>
            <p>
              <span className="text-slate-600">Templates:</span>{' '}
              <span className="font-medium text-slate-900">
                {selectedTemplateIds.length === 0
                  ? 'None selected'
                  : templates
                      .filter(t => selectedTemplateIds.includes(t.id))
                      .map(t => t.name)
                      .join(', ')}
              </span>
            </p>
            {sendMode === 'schedule' && scheduledTime && (
              <p>
                <span className="text-slate-600">Send At:</span>{' '}
                <span className="font-medium text-slate-900">{new Date(scheduledTime).toLocaleString()}</span>
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setStep('members')}
            className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition"
            disabled={isLoading}
          >
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
