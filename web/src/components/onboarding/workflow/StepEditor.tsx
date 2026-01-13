'use client';

import React, { useState, useEffect } from 'react';
import { useOnboardingStore, WorkflowPreviewStep } from '@/store/onboardingStore';
import { X, Save, Linkedin, Mail, MessageCircle, Phone, Users, Clock, CheckCircle } from 'lucide-react';

interface StepEditorProps {
  step: WorkflowPreviewStep;
  onClose: () => void;
}

export default function StepEditor({ step, onClose }: StepEditorProps) {
  const { updateWorkflowStep } = useOnboardingStore();
  
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
  });

  const getStepIcon = () => {
    if (step.type.startsWith('linkedin_')) return <Linkedin className="w-5 h-5" />;
    if (step.type.startsWith('whatsapp_')) return <MessageCircle className="w-5 h-5" />;
    if (step.type.startsWith('email_')) return <Mail className="w-5 h-5" />;
    if (step.type.startsWith('voice_')) return <Phone className="w-5 h-5" />;
    if (step.type === 'lead_generation') return <Users className="w-5 h-5" />;
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
    if (step.type === 'delay') return 'bg-gray-500';
    return 'bg-blue-500';
  };

  const handleSave = () => {
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
      
      updateWorkflowStep(step.id, {
        ...formData,
        title: delayTitle,
        description: formData.description || `Delay: ${parts.join(' ')}`,
        delayDays: days,
        delayHours: hours,
      });
    } else {
      updateWorkflowStep(step.id, {
        ...formData,
      });
    }
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
        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={`px-4 py-2 text-sm font-medium text-white ${getStepColor()} hover:opacity-90 rounded-lg transition-all flex items-center gap-2`}
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
