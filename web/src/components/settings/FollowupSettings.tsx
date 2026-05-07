'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Clock,
  Send,
  Users,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  MessageSquare,
  FileText,
  CheckSquare,
} from 'lucide-react';

interface FollowupConfig {
  enabled: boolean;
  idle_hours: number;
  interval_minutes: number;
  max_attempts: number;
  message_type: 'template' | 'custom';
  template_message: string;
  custom_message: string;
}

interface IdleMember {
  member_phone: string;
  member_name: string | null;
  context_status: string;
  last_activity: string | null;
  idle: boolean;
  followup_attempts: number;
  last_followup_sent: string | null;
  max_attempts_reached: boolean;
}

interface FollowupStatus {
  config: FollowupConfig;
  total_incomplete_icp: number;
  total_idle: number;
  eligible_for_followup: number;
  members: IdleMember[];
}

interface WATemplate {
  name: string;
  language: string;
  status: string;
  category: string;
  body: string;
  parameter_count: number;
}

const API_BASE = '/api/whatsapp-conversations/followup-settings';

export function FollowupSettings() {
  const [config, setConfig] = useState<FollowupConfig | null>(null);
  const [status, setStatus] = useState<FollowupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggeringPhone, setTriggeringPhone] = useState<string | null>(null);
  const [customTriggerMessage, setCustomTriggerMessage] = useState('');
  const [triggerDialogPhone, setTriggerDialogPhone] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Template sending state
  const [waTemplates, setWaTemplates] = useState<WATemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WATemplate | null>(null);
  const [templateParams, setTemplateParams] = useState<string[]>([]);
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [sendingTemplate, setSendingTemplate] = useState(false);
  const [templateSendResult, setTemplateSendResult] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(API_BASE);
      const data = await res.json();
      if (data.success) setConfig(data.data);
    } catch (err) {
      console.error('Failed to fetch followup config:', err);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/status`);
      const data = await res.json();
      if (data.success) setStatus(data.data);
    } catch (err) {
      console.error('Failed to fetch followup status:', err);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/templates`);
      const data = await res.json();
      if (data.success) setWaTemplates(data.data || []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchConfig(), fetchStatus(), fetchTemplates()]).finally(() =>
      setLoading(false)
    );
  }, [fetchConfig, fetchStatus, fetchTemplates]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch(API_BASE, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.data);
        setSaveMessage('Settings saved successfully');
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (err) {
      console.error('Failed to save config:', err);
      setSaveMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTrigger = async (phone: string, message?: string) => {
    setTriggeringPhone(phone);
    try {
      const res = await fetch(`${API_BASE}/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_phone: phone,
          ...(message ? { message } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchStatus();
        setTriggerDialogPhone(null);
        setCustomTriggerMessage('');
      }
    } catch (err) {
      console.error('Failed to trigger followup:', err);
    } finally {
      setTriggeringPhone(null);
    }
  };

  const handleSelectTemplate = (template: WATemplate) => {
    setSelectedTemplate(template);
    setTemplateParams(new Array(template.parameter_count).fill(''));
    setTemplateSendResult(null);
  };

  const handleTogglePhone = (phone: string) => {
    setSelectedPhones((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) {
        next.delete(phone);
      } else {
        next.add(phone);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!status) return;
    const allPhones = status.members.map((m) => m.member_phone);
    if (selectedPhones.size === allPhones.length) {
      setSelectedPhones(new Set());
    } else {
      setSelectedPhones(new Set(allPhones));
    }
  };

  const handleSendTemplate = async () => {
    if (!selectedTemplate || selectedPhones.size === 0) return;
    setSendingTemplate(true);
    setTemplateSendResult(null);
    try {
      const phones =
        status && selectedPhones.size === status.members.length
          ? ['all']
          : Array.from(selectedPhones);

      const res = await fetch(`${API_BASE}/send-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_name: selectedTemplate.name,
          language_code: selectedTemplate.language,
          parameters: templateParams.length > 0 ? templateParams : null,
          member_phones: phones,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const d = data.data;
        setTemplateSendResult(
          `Sent to ${d.sent_count}/${d.total_targeted} members` +
            (d.failed_count > 0 ? ` (${d.failed_count} failed)` : '')
        );
        await fetchStatus();
      } else {
        setTemplateSendResult(`Failed: ${data.error}`);
      }
    } catch (err) {
      console.error('Failed to send template:', err);
      setTemplateSendResult('Failed to send template');
    } finally {
      setSendingTemplate(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-12 text-gray-500">
        Failed to load followup settings.
      </div>
    );
  }

  const statusLabel = (s: string) => {
    const map: Record<string, { label: string; color: string }> = {
      onboarding_greeting: { label: 'Greeting', color: 'bg-yellow-100 text-yellow-800' },
      onboarding_profile: { label: 'Profile', color: 'bg-orange-100 text-orange-800' },
      icp_discovery: { label: 'ICP Discovery', color: 'bg-blue-100 text-blue-800' },
    };
    return map[s] || { label: s, color: 'bg-gray-100 text-gray-800' };
  };

  const allSelected = status ? selectedPhones.size === status.members.length && status.members.length > 0 : false;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{status.total_incomplete_icp}</p>
                  <p className="text-sm text-gray-500">Incomplete ICP</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Clock className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{status.total_idle}</p>
                  <p className="text-sm text-gray-500">Idle ({config.idle_hours}h+)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Send className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{status.eligible_for_followup}</p>
                  <p className="text-sm text-gray-500">Eligible for Followup</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Followup Configuration</CardTitle>
          <CardDescription>
            Configure automatic followup messages for members who haven't completed ICP Discovery.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Enable Automatic Followups</Label>
              <p className="text-xs text-gray-500 mt-1">
                Automatically send nudge messages to idle members
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
            />
          </div>

          <div className="border-t pt-4 space-y-4">
            {/* Idle hours */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="idle_hours" className="text-sm font-medium">
                  Idle Threshold (hours)
                </Label>
                <p className="text-xs text-gray-500 mb-2">
                  Send followup after this many hours of inactivity
                </p>
                <Input
                  id="idle_hours"
                  type="number"
                  min={1}
                  max={168}
                  value={config.idle_hours}
                  onChange={(e) =>
                    setConfig({ ...config, idle_hours: parseInt(e.target.value) || 23 })
                  }
                />
              </div>

              {/* Check interval */}
              <div>
                <Label htmlFor="interval_minutes" className="text-sm font-medium">
                  Check Interval (minutes)
                </Label>
                <p className="text-xs text-gray-500 mb-2">
                  How often the scheduler checks for idle members
                </p>
                <Input
                  id="interval_minutes"
                  type="number"
                  min={5}
                  max={1440}
                  value={config.interval_minutes}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      interval_minutes: parseInt(e.target.value) || 60,
                    })
                  }
                />
              </div>
            </div>

            {/* Max attempts */}
            <div>
              <Label htmlFor="max_attempts" className="text-sm font-medium">
                Max Followup Attempts
              </Label>
              <p className="text-xs text-gray-500 mb-2">
                Stop sending after this many attempts per member
              </p>
              <Input
                id="max_attempts"
                type="number"
                min={1}
                max={10}
                value={config.max_attempts}
                className="w-32"
                onChange={(e) =>
                  setConfig({ ...config, max_attempts: parseInt(e.target.value) || 3 })
                }
              />
            </div>
          </div>

          {/* Message type */}
          <div className="border-t pt-4 space-y-4">
            <Label className="text-sm font-medium">Message Type</Label>
            <div className="flex gap-4">
              <button
                onClick={() => setConfig({ ...config, message_type: 'template' })}
                className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${
                  config.message_type === 'template'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="w-4 h-4" />
                  <span className="font-medium text-sm">Template Message</span>
                </div>
                <p className="text-xs text-gray-500">
                  Use the default template with {'{member_name}'} placeholder
                </p>
              </button>
              <button
                onClick={() => setConfig({ ...config, message_type: 'custom' })}
                className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${
                  config.message_type === 'custom'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Send className="w-4 h-4" />
                  <span className="font-medium text-sm">Custom Message</span>
                </div>
                <p className="text-xs text-gray-500">
                  Write your own followup message
                </p>
              </button>
            </div>

            {config.message_type === 'template' ? (
              <div>
                <Label htmlFor="template_message" className="text-sm font-medium">
                  Template Message
                </Label>
                <p className="text-xs text-gray-500 mb-2">
                  Use {'{member_name}'} as a placeholder for the member's name
                </p>
                <Textarea
                  id="template_message"
                  rows={4}
                  value={config.template_message}
                  onChange={(e) =>
                    setConfig({ ...config, template_message: e.target.value })
                  }
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="custom_message" className="text-sm font-medium">
                  Custom Message
                </Label>
                <p className="text-xs text-gray-500 mb-2">
                  Use {'{member_name}'} as a placeholder for the member's name
                </p>
                <Textarea
                  id="custom_message"
                  rows={4}
                  value={config.custom_message}
                  placeholder="Hi {member_name}! ..."
                  onChange={(e) =>
                    setConfig({ ...config, custom_message: e.target.value })
                  }
                />
              </div>
            )}
          </div>

          {/* Save button */}
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Save Settings
            </Button>
            {saveMessage && (
              <span
                className={`text-sm ${
                  saveMessage.includes('success') ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {saveMessage}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Send WhatsApp Template Message */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Send WhatsApp Template Message</CardTitle>
              <CardDescription>
                Select an approved WhatsApp template and send it to selected members or everyone
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTemplates}
              disabled={templatesLoading}
            >
              {templatesLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1" />
              )}
              Reload Templates
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Template selector */}
          {waTemplates.length === 0 ? (
            <div className="text-center py-6 text-gray-500 border rounded-lg bg-gray-50">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">
                {templatesLoading
                  ? 'Loading templates...'
                  : 'No approved WhatsApp templates found. Make sure WHATSAPP_BUSINESS_ACCOUNT_ID is set.'}
              </p>
            </div>
          ) : (
            <>
              <div>
                <Label className="text-sm font-medium mb-2 block">Select Template</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                  {waTemplates.map((t) => (
                    <button
                      key={`${t.name}-${t.language}`}
                      onClick={() => handleSelectTemplate(t)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        selectedTemplate?.name === t.name
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm truncate">{t.name}</span>
                        <Badge variant="secondary" className="text-xs ml-2 shrink-0">
                          {t.language}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">{t.body || 'No body text'}</p>
                      {t.parameter_count > 0 && (
                        <p className="text-xs text-blue-600 mt-1">
                          {t.parameter_count} parameter{t.parameter_count > 1 ? 's' : ''}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template parameters */}
              {selectedTemplate && selectedTemplate.parameter_count > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Template Parameters
                  </Label>
                  <p className="text-xs text-gray-500 mb-3">
                    Use {'{member_name}'} to insert the member's name dynamically
                  </p>
                  <div className="space-y-2">
                    {templateParams.map((param, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-16 shrink-0">
                          {`{{${i + 1}}}`}
                        </span>
                        <Input
                          value={param}
                          placeholder={i === 0 ? '{member_name}' : `Parameter ${i + 1}`}
                          onChange={(e) => {
                            const next = [...templateParams];
                            next[i] = e.target.value;
                            setTemplateParams(next);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Member selection + send */}
          {selectedTemplate && status && status.members.length > 0 && (
            <>
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">Select Members</Label>
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <CheckSquare className="w-4 h-4" />
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  {status.members.map((member) => {
                    const sl = statusLabel(member.context_status);
                    const isSelected = selectedPhones.has(member.member_phone);
                    const lastActivity = member.last_activity
                      ? new Date(member.last_activity)
                      : null;
                    const hoursAgo = lastActivity
                      ? Math.round(
                          (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60)
                        )
                      : null;

                    return (
                      <label
                        key={member.member_phone}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b last:border-b-0 transition-colors ${
                          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleTogglePhone(member.member_phone)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {member.member_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500">{member.member_phone}</p>
                        </div>
                        <Badge variant="secondary" className={`text-xs shrink-0 ${sl.color}`}>
                          {sl.label}
                        </Badge>
                        <span className="text-xs text-gray-400 shrink-0">
                          {hoursAgo !== null ? `${hoursAgo}h ago` : ''}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Send button */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSendTemplate}
                  disabled={sendingTemplate || selectedPhones.size === 0}
                >
                  {sendingTemplate ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send "{selectedTemplate.name}" to {selectedPhones.size} member
                  {selectedPhones.size !== 1 ? 's' : ''}
                </Button>
                {templateSendResult && (
                  <span
                    className={`text-sm ${
                      templateSendResult.startsWith('Sent')
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {templateSendResult}
                  </span>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Idle Members List */}
      {status && status.members.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Members Pending ICP Completion</CardTitle>
                <CardDescription>
                  Members who haven't completed their Ideal Customer Profile
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLoading(true);
                  fetchStatus().finally(() => setLoading(false));
                }}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                      Member
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                      Last Activity
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                      Followups Sent
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {status.members.map((member) => {
                    const sl = statusLabel(member.context_status);
                    const lastActivity = member.last_activity
                      ? new Date(member.last_activity)
                      : null;
                    const hoursAgo = lastActivity
                      ? Math.round(
                          (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60)
                        )
                      : null;

                    return (
                      <tr key={member.member_phone} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {member.member_name || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-500">{member.member_phone}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className={sl.color}>
                            {sl.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {member.idle ? (
                              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                            )}
                            <span
                              className={`text-sm ${
                                member.idle ? 'text-red-600 font-medium' : 'text-gray-600'
                              }`}
                            >
                              {hoursAgo !== null ? `${hoursAgo}h ago` : 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">
                            {member.followup_attempts} / {config.max_attempts}
                          </span>
                          {member.max_attempts_reached && (
                            <span className="text-xs text-red-500 ml-1">(max)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {triggerDialogPhone === member.member_phone ? (
                            <div className="flex flex-col gap-2 items-end">
                              <Textarea
                                rows={2}
                                className="w-64 text-sm"
                                placeholder="Custom message (optional)..."
                                value={customTriggerMessage}
                                onChange={(e) => setCustomTriggerMessage(e.target.value)}
                              />
                                <Button
                                  size="sm"
                                  className="w-full bg-[#0B1957] hover:bg-[#0B1957]/90 text-white rounded-xl"
                                  disabled={triggeringPhone === member.member_phone}
                                  onClick={() =>
                                    handleTrigger(
                                      member.member_phone,
                                      customTriggerMessage || undefined
                                    )
                                  }
                                >
                                  {triggeringPhone === member.member_phone ? (
                                    <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                  ) : (
                                    <Send className="w-3 h-3 mr-1" />
                                  )}
                                  Send
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                member.max_attempts_reached ||
                                triggeringPhone === member.member_phone
                              }
                              onClick={() => setTriggerDialogPhone(member.member_phone)}
                            >
                              {triggeringPhone === member.member_phone ? (
                                <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                              ) : (
                                <Send className="w-3 h-3 mr-1" />
                              )}
                              Send Followup
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
