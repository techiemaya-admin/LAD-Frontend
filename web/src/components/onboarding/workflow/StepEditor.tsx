'use client';
import React, { useState, useEffect } from 'react';
import { useOnboardingStore, WorkflowPreviewStep } from '@/store/onboardingStore';
import { X, Save, Linkedin, Mail, MessageCircle, Phone, Users, Clock, CheckCircle, Wand2, Loader2, Film, FileImage } from 'lucide-react';
import { MediaGenerationModal } from '@/components/voice-agent/MediaGenerationModal';
import { useMediaBuilder } from '@/hooks/voice-agent/useMediaBuilder';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}`,
});
interface StepEditorProps {
  step: WorkflowPreviewStep;
  onClose: () => void;
  campaignId?: string | null;
}
export default function StepEditor({ step, onClose, campaignId }: StepEditorProps) {
  const { updateWorkflowStep } = useOnboardingStore();
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);

  // Fetch LinkedIn daily limit so we can cap leads per day
  useEffect(() => {
    fetch(`${API_BASE}/api/campaigns/linkedin/limits`, { headers: headers() })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const limit = d.remainingDailyLimit !== undefined ? d.remainingDailyLimit : (d.totalDailyLimit || null);
          setDailyLimit(limit);
          // Also clamp current formData.leadLimit if above limit
          if (limit !== null && formData.leadLimit > limit) {
            setFormData(prev => ({ ...prev, leadLimit: limit }));
          }
        }
      })
      .catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Parse delay values from step title/description if not set
  const parseDelayFromTitle = () => {
    const title = step.title?.toLowerCase() || '';
    // Extract number from title (e.g., "Wait 2 hours delay" -> 2)
    const match = title.match(/(\d+)/);
    const num = match ? parseInt(match[1]) : 0;
    if (title.includes('hour')) {
      return { days: 0, hours: num };
    } else if (title.includes('day')) {
      return { days: num, hours: 0 };
    }
    // Fallback to stored values
    return { days: step.delayDays || 0, hours: step.delayHours || 0 };
  };
  const parsedDelay = parseDelayFromTitle();
  const [formData, setFormData] = useState({
    title: step.title || '',
    description: step.description || '',
    message: step.message || '',
    subject: step.subject || '',
    template: step.template || '',
    script: step.script || '',
    delayDays: parsedDelay.days,
    delayHours: parsedDelay.hours,
    leadLimit: step.leadLimit || 10,
    // AI Media step - permanent quadruple set after import-generated
    mediaPrompt: step.mediaPrompt || '',
    mediaUrl: step.mediaUrl || '',
    mediaType: step.mediaType || '',
    mediaFilename: step.mediaFilename || '',
    mimeType: step.mimeType || '',
  });

  // ── AI Media step state (media_generation only) ──────────────────────────
  const [showMediaStudio, setShowMediaStudio] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [pasteUrl, setPasteUrl] = useState('');
  const mediaBuilder = useMediaBuilder();

  /** Coarse media category from a filename/URL extension. */
  const mediaTypeFromName = (name: string): string => {
    const ext = (name.split('?')[0].split('.').pop() || '').toLowerCase();
    if (['mp4', 'webm', 'mov', '3gp'].includes(ext)) return 'video';
    if (['pdf', 'doc', 'docx'].includes(ext)) return 'document';
    return 'image';
  };

  /** Re-home a generated asset (7-day signed URL) to the permanent campaign bucket. */
  const importGenerated = async (sourceUrl: string) => {
    if (!sourceUrl) return;
    setImporting(true);
    setImportError('');
    try {
      const filename = decodeURIComponent(sourceUrl.split('?')[0].split('/').pop() || 'generated-media');
      const res = await fetch(`${API_BASE}/api/campaigns/media/import-generated`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ source_url: sourceUrl, media_type: mediaTypeFromName(filename), filename }),
      });
      const d = await res.json();
      if (!res.ok || !d?.url) throw new Error(d?.error || `Import failed (${res.status})`);
      setFormData(prev => ({
        ...prev,
        mediaUrl: d.url,
        mediaType: d.media_type || mediaTypeFromName(d.filename || filename),
        mediaFilename: d.filename || filename,
        mimeType: d.mime_type || '',
        description: prev.description || `Attach ${d.media_type || 'media'} to outreach`,
      }));
      setShowGallery(false);
      setPasteUrl('');
    } catch (e: any) {
      setImportError(e?.message || 'Failed to import media');
    } finally {
      setImporting(false);
    }
  };
  const getStepIcon = () => {
    if (step.type.startsWith('linkedin_')) return <Linkedin className="w-5 h-5" />;
    if (step.type.startsWith('whatsapp_')) return <MessageCircle className="w-5 h-5" />;
    if (step.type.startsWith('email_')) return <Mail className="w-5 h-5" />;
    if (step.type.startsWith('voice_')) return <Phone className="w-5 h-5" />;
    if (step.type === 'lead_generation') return <Users className="w-5 h-5" />;
    if (step.type === 'media_generation') return <Wand2 className="w-5 h-5" />;
    if (step.type === 'delay') return <Clock className="w-5 h-5" />;
    if (step.type === 'condition') return <CheckCircle className="w-5 h-5" />;
    return null;
  };
  const getStepColor = () => {
    if (step.type.startsWith('linkedin_')) return 'bg-[#0077B5]';
    if (step.type.startsWith('whatsapp_')) return 'bg-[#25D366]';
    if (step.type.startsWith('email_')) return 'bg-[#F59E0B]';
    if (step.type.startsWith('voice_')) return 'bg-[#8B5CF6]';
    if (step.type === 'lead_generation') return 'bg-orange-500';
    if (step.type === 'media_generation') return 'bg-[#D946EF]';
    if (step.type === 'delay') return 'bg-gray-500';
    return 'bg-blue-500';
  };

  /**
   * Update localStorage icp_buffered_messages_default_session with workflow step changes
   * This syncs workflow edits back to the chat panel's data source
   */
  const updateBufferedMessages = (updatedData: Partial<typeof formData>) => {
    if (typeof window === 'undefined') return;

    try {
      const sessionId = 'default_session';
      const key = `icp_buffered_messages_${sessionId}`;
      const data = localStorage.getItem(key);
      const messages: any[] = data ? JSON.parse(data) : [];

      if (messages.length === 0) return;

      // Update messages based on step type
      if (step.type === 'lead_generation') {
        // Parse description for targeting info
        const description = updatedData.description || formData.description || '';
        const parts = description.split('|').map((p: string) => p.trim());

        const updates: Record<string, string> = {};
        for (const part of parts) {
          if (part.toLowerCase().startsWith('roles:')) {
            updates.icp_roles = part.replace(/^roles:\s*/i, '').trim();
          } else if (part.toLowerCase().startsWith('industries:')) {
            updates.icp_industries = part.replace(/^industries:\s*/i, '').trim();
          } else if (part.toLowerCase().startsWith('location:')) {
            updates.icp_location = part.replace(/^location:\s*/i, '').trim();
          }
        }

        // Update relevant messages in buffer
        const updatedMessages = messages.map((msg: any) => {
          if (msg.messageData) {
            // Update messageData with new values
            return {
              ...msg,
              messageData: { ...msg.messageData, ...updates }
            };
          }
          return msg;
        });

        localStorage.setItem(key, JSON.stringify(updatedMessages));
        console.warn('[StepEditor] Updated buffered messages with lead generation changes', updates);
      }

      // For message templates, update the corresponding message data
      if (step.type === 'linkedin_connect' && updatedData.message) {
        const updatedMessages = messages.map((msg: any) => {
          if (msg.messageData) {
            return {
              ...msg,
              messageData: { ...msg.messageData, linkedin_connection_message: updatedData.message }
            };
          }
          return msg;
        });
        localStorage.setItem(key, JSON.stringify(updatedMessages));
      }

      if (step.type === 'linkedin_message' && updatedData.message) {
        const updatedMessages = messages.map((msg: any) => {
          if (msg.messageData) {
            return {
              ...msg,
              messageData: { ...msg.messageData, linkedin_message_template: updatedData.message }
            };
          }
          return msg;
        });
        localStorage.setItem(key, JSON.stringify(updatedMessages));
      }

      // Also update window.__icpAnswers for immediate effect
      if ((window as any).__icpAnswers) {
        const currentAnswers = (window as any).__icpAnswers;
        if (step.type === 'lead_generation') {
          const description = updatedData.description || formData.description || '';
          const parts = description.split('|').map((p: string) => p.trim());
          for (const part of parts) {
            if (part.toLowerCase().startsWith('roles:')) {
              currentAnswers.icp_roles = part.replace(/^roles:\s*/i, '').trim();
            } else if (part.toLowerCase().startsWith('industries:')) {
              currentAnswers.icp_industries = part.replace(/^industries:\s*/i, '').trim();
            } else if (part.toLowerCase().startsWith('location:')) {
              currentAnswers.icp_location = part.replace(/^location:\s*/i, '').trim();
            }
          }
        }
        if (updatedData.leadLimit) {
          currentAnswers.leads_per_day = updatedData.leadLimit;
        }
        (window as any).__icpAnswers = currentAnswers;
      }

      // Dispatch event to notify chat panel of update
      window.dispatchEvent(new CustomEvent('workflowStepUpdated', {
        detail: { stepId: step.id, stepType: step.type, updatedData }
      }));

    } catch (e) {
      console.error('[StepEditor] Error updating buffered messages', e);
    }
  };

  const handleSave = () => {
    let updatedData: Partial<typeof formData>;

    // For delay steps, update title and description based on days/hours values
    if (step.type === 'delay') {
      const days = formData.delayDays || 0;
      const hours = formData.delayHours || 0;
      // Build a user-friendly title
      let delayTitle = 'Wait ';
      const parts = [];
      if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
      if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
      if (parts.length === 0) parts.push('0 hours');
      delayTitle += parts.join(' ');

      updatedData = {
        ...formData,
        title: delayTitle,
        description: formData.description || `Delay: ${parts.join(' ')}`,
        delayDays: days,
        delayHours: hours,
      };
      updateWorkflowStep(step.id, updatedData);
    } else {
      updatedData = { ...formData };
      updateWorkflowStep(step.id, updatedData);
    }

    // Sync changes to localStorage buffered messages
    updateBufferedMessages(updatedData);

    onClose();
  };
  const renderFields = () => {
    switch (step.type) {
      case 'lead_generation':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                placeholder="e.g., Roles: CEO | Industries: Healthcare | Location: USA"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Leads per Day
                {dailyLimit !== null && (
                  <span className="ml-2 text-xs text-gray-500 font-normal">
                    (LinkedIn daily limit: <strong className="text-[#172560]">{dailyLimit}</strong>)
                  </span>
                )}
              </label>
              <input
                type="number"
                value={formData.leadLimit}
                onChange={(e) => {
                  let val = parseInt(e.target.value) || 1;
                  if (dailyLimit !== null && val > dailyLimit) val = dailyLimit;
                  if (val < 1) val = 1;
                  setFormData({ ...formData, leadLimit: val });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                {...(dailyLimit !== null ? { max: dailyLimit } : {})}
                placeholder="10"
              />
              <p className="mt-1 text-xs text-gray-500">
                Number of leads to generate per day {dailyLimit !== null ? `(1-${dailyLimit})` : '(minimum 1)'}
              </p>
            </div>
          </div>
        );
      case 'linkedin_visit':
      case 'linkedin_follow':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="View target profile"
              />
            </div>
          </div>
        );
      case 'linkedin_connect':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Connection Message
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={4}
                placeholder="Hi {{first_name}}, I'd like to connect..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Use variables: {'{{first_name}}'}, {'{{company_name}}'}, {'{{job_title}}'}
              </p>
            </div>
          </div>
        );
      case 'linkedin_message':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message Template
              </label>
              <textarea
                value={formData.message || formData.description}
                onChange={(e) => setFormData({ ...formData, message: e.target.value, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={5}
                placeholder="Hi {{first_name}}, I noticed your work at {{company_name}}..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Use variables: {'{{first_name}}'}, {'{{company_name}}'}, {'{{job_title}}'}
              </p>
            </div>
          </div>
        );
      case 'whatsapp_broadcast':
      case 'whatsapp_message':
      case 'whatsapp_followup':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp Message
              </label>
              <textarea
                value={formData.message || formData.description}
                onChange={(e) => setFormData({ ...formData, message: e.target.value, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25D366] focus:border-[#25D366] resize-none"
                rows={5}
                placeholder="Hello {{first_name}}! I wanted to reach out about..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Use variables: {'{{first_name}}'}, {'{{company_name}}'}, {'{{phone}}'}
              </p>
            </div>
          </div>
        );
      case 'whatsapp_template':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name
              </label>
              <input
                type="text"
                value={formData.template}
                onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25D366] focus:border-[#25D366]"
                placeholder="welcome_message"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Content Preview
              </label>
              <textarea
                value={formData.message || formData.description}
                onChange={(e) => setFormData({ ...formData, message: e.target.value, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25D366] focus:border-[#25D366] resize-none"
                rows={4}
                placeholder="Template message content..."
              />
            </div>
          </div>
        );
      case 'email_send':
      case 'email_followup':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Subject
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B]"
                placeholder="Quick question about {{company_name}}"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Body
              </label>
              <textarea
                value={formData.message || formData.description}
                onChange={(e) => setFormData({ ...formData, message: e.target.value, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B] resize-none"
                rows={6}
                placeholder="Hi {{first_name}},\n\nI hope this email finds you well..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Use variables: {'{{first_name}}'}, {'{{company_name}}'}, {'{{job_title}}'}
              </p>
            </div>
          </div>
        );
      case 'voice_call':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Call Purpose
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B5CF6] focus:border-[#8B5CF6]"
                placeholder="Initial outreach call"
              />
            </div>
          </div>
        );
      case 'voice_script':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Call Script
              </label>
              <textarea
                value={formData.script || formData.description}
                onChange={(e) => setFormData({ ...formData, script: e.target.value, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B5CF6] focus:border-[#8B5CF6] resize-none"
                rows={8}
                placeholder="Hello, this is [Your Name] from [Company]. Am I speaking with {{first_name}}?&#10;&#10;Great! I'm reaching out because..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Use variables: {'{{first_name}}'}, {'{{company_name}}'}, {'{{phone}}'}
              </p>
            </div>
          </div>
        );
      case 'media_generation':
        return (
          <div className="space-y-4">
            {/* Selected media preview */}
            {formData.mediaUrl ? (
              <div className="border border-fuchsia-200 bg-fuchsia-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2 text-sm font-medium text-fuchsia-700">
                  {formData.mediaType === 'video' ? <Film className="w-4 h-4" /> : <FileImage className="w-4 h-4" />}
                  Attached {formData.mediaType || 'media'}
                  <button
                    onClick={() => setFormData({ ...formData, mediaUrl: '', mediaType: '', mediaFilename: '', mimeType: '' })}
                    className="ml-auto text-xs text-gray-500 hover:text-red-500">Remove</button>
                </div>
                {formData.mediaType === 'video' ? (
                  <video src={formData.mediaUrl} controls className="w-full max-h-48 rounded-md bg-black" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={formData.mediaUrl} alt={formData.mediaFilename} className="w-full max-h-48 object-contain rounded-md" />
                )}
                <p className="mt-1 text-xs text-gray-500 truncate">{formData.mediaFilename}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                Generate brand media in the AI Media Studio, then attach it here - it will be sent with this campaign&apos;s outreach messages.
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowMediaStudio(true)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#D946EF] text-white text-sm font-semibold hover:opacity-90">
                <Wand2 className="w-4 h-4" /> Open AI Media Studio
              </button>
              <button
                onClick={() => { setShowGallery(!showGallery); if (!showGallery) mediaBuilder.fetchGallery(); }}
                className="flex-1 px-3 py-2.5 rounded-lg border border-fuchsia-300 text-fuchsia-700 text-sm font-semibold hover:bg-fuchsia-50">
                {showGallery ? 'Hide generated media' : 'Pick from generated media'}
              </button>
            </div>

            {/* Gallery picker */}
            {showGallery && (
              <div className="border border-gray-200 rounded-lg p-2 max-h-56 overflow-y-auto">
                {mediaBuilder.loadingGallery ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading your generated media…
                  </div>
                ) : (
                  <>
                    {(mediaBuilder.galleryImages?.length || 0) + (mediaBuilder.galleryVideos?.length || 0) === 0 ? (
                      <p className="py-4 text-center text-sm text-gray-500">No generated media yet. Use the AI Media Studio first.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {(mediaBuilder.galleryImages || []).map((it: any, i: number) => {
                          const u = it?.url || it?.signed_url || (typeof it === 'string' ? it : '');
                          return u ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={`gi-${i}`} src={u} alt="generated" onClick={() => importGenerated(u)}
                              className="w-full h-20 object-cover rounded-md cursor-pointer border-2 border-transparent hover:border-fuchsia-400" />
                          ) : null;
                        })}
                        {(mediaBuilder.galleryVideos || []).map((it: any, i: number) => {
                          const u = it?.url || it?.signed_url || (typeof it === 'string' ? it : '');
                          return u ? (
                            <video key={`gv-${i}`} src={u} onClick={() => importGenerated(u)} muted
                              className="w-full h-20 object-cover rounded-md cursor-pointer border-2 border-transparent hover:border-fuchsia-400" />
                          ) : null;
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Manual URL fallback (asset URL copied from the studio) */}
            <div className="flex gap-2">
              <input
                type="url"
                value={pasteUrl}
                onChange={(e) => setPasteUrl(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500"
                placeholder="…or paste a generated asset URL"
              />
              <button
                onClick={() => importGenerated(pasteUrl)}
                disabled={importing || !pasteUrl}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold disabled:opacity-50">
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Attach'}
              </button>
            </div>
            {importing && <p className="text-xs text-gray-500">Saving a permanent copy of the asset…</p>}
            {importError && <p className="text-xs text-red-500">{importError}</p>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes / creative brief (optional)</label>
              <textarea
                value={formData.mediaPrompt}
                onChange={(e) => setFormData({ ...formData, mediaPrompt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 resize-none"
                rows={2}
                placeholder="e.g. Product hero image with brand colors, no text overlay"
              />
            </div>
          </div>
        );
      case 'delay':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Days
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.delayDays}
                  onChange={(e) => setFormData({ ...formData, delayDays: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hours
                </label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={formData.delayHours}
                  onChange={(e) => setFormData({ ...formData, delayHours: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                />
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
              />
            </div>
          </div>
        );
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className={`${getStepColor()} px-6 py-4 flex items-center gap-3`}>
          <div className="w-10 h-10 rounded-xl bg-white/25 flex items-center justify-center text-white">
            {getStepIcon()}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">{step.title}</h3>
            <p className="text-sm text-white/80">Edit step configuration</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Content */}
        <div className="p-6">
          {renderFields()}
        </div>
        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex justify-end">
          <button
            onClick={handleSave}
            className={`px-8 py-2.5 text-sm font-bold text-white ${getStepColor()} hover:opacity-90 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md`}
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>

      {/* Full AI Media Studio wizard (media_generation step only) */}
      {step.type === 'media_generation' && (
        <MediaGenerationModal isOpen={showMediaStudio} onClose={() => setShowMediaStudio(false)} />
      )}
    </div>
  );
}
