'use client';

import React, { useState } from 'react';
import { 
  Linkedin, 
  Mail, 
  MessageSquare, 
  Phone, 
  Instagram, 
  Zap,
  ArrowRight,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'linkedin' | 'email' | 'whatsapp' | 'instagram' | 'voice' | 'multi-channel';
  steps: string[];
  naturalLanguage: string;
}

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'linkedin-connect-message',
    name: 'LinkedIn Connect & Message',
    description: 'Visit profile, send connection request, then message if connected',
    icon: <Linkedin className="w-5 h-5" />,
    category: 'linkedin',
    steps: ['Visit Profile', 'Connect', 'If Connected', 'Send Message'],
    naturalLanguage: 'Send a LinkedIn message',
  },
  {
    id: 'linkedin-outreach',
    name: 'LinkedIn Outreach Sequence',
    description: 'Complete LinkedIn outreach: visit, follow, connect, and message',
    icon: <Linkedin className="w-5 h-5" />,
    category: 'linkedin',
    steps: ['Visit Profile', 'Follow', 'Connect', 'Message'],
    naturalLanguage: 'Create a LinkedIn outreach workflow',
  },
  {
    id: 'email-followup',
    name: 'Email Follow-up',
    description: 'Send a follow-up email to your leads',
    icon: <Mail className="w-5 h-5" />,
    category: 'email',
    steps: ['Send Follow-up Email'],
    naturalLanguage: 'I want to create a follow-up workflow',
  },
  {
    id: 'email-send',
    name: 'Send Email',
    description: 'Send an email to your leads',
    icon: <Mail className="w-5 h-5" />,
    category: 'email',
    steps: ['Send Email'],
    naturalLanguage: 'Send an email',
  },
  {
    id: 'multi-channel-sequence',
    name: 'Multi-Channel Sequence',
    description: 'Email first, then reach out on LinkedIn',
    icon: <Zap className="w-5 h-5" />,
    category: 'multi-channel',
    steps: ['Send Email', 'Wait', 'Visit LinkedIn', 'Connect'],
    naturalLanguage: 'Send an email first and then reach out on LinkedIn',
  },
  {
    id: 'whatsapp-send',
    name: 'WhatsApp Message',
    description: 'Send a WhatsApp message to your leads',
    icon: <MessageSquare className="w-5 h-5" />,
    category: 'whatsapp',
    steps: ['Send WhatsApp'],
    naturalLanguage: 'Send a WhatsApp message',
  },
  {
    id: 'voice-call',
    name: 'Voice Agent Call',
    description: 'Make an automated voice call to your leads',
    icon: <Phone className="w-5 h-5" />,
    category: 'voice',
    steps: ['Voice Agent Call'],
    naturalLanguage: 'Make a voice call',
  },
  {
    id: 'instagram-engagement',
    name: 'Instagram Engagement',
    description: 'Follow, like, and DM on Instagram',
    icon: <Instagram className="w-5 h-5" />,
    category: 'instagram',
    steps: ['Follow', 'Like Posts', 'Send DM'],
    naturalLanguage: 'Engage on Instagram',
  },
  {
    id: 'linkedin-scrape-connect',
    name: 'Scrape & Connect',
    description: 'Scrape LinkedIn profiles and send connection requests',
    icon: <Linkedin className="w-5 h-5" />,
    category: 'linkedin',
    steps: ['Scrape Profile', 'Connect'],
    naturalLanguage: 'Scrape LinkedIn profiles and connect',
  },
  {
    id: 'email-delay-linkedin',
    name: 'Email → LinkedIn',
    description: 'Send email, wait, then connect on LinkedIn',
    icon: <Zap className="w-5 h-5" />,
    category: 'multi-channel',
    steps: ['Send Email', 'Wait', 'Connect on LinkedIn'],
    naturalLanguage: 'email_send → delay → linkedin_visit → linkedin_connect',
  },
];

interface WorkflowLibraryProps {
  onSelectWorkflow: (workflow: WorkflowTemplate) => void;
  onClose: () => void;
}

export default function WorkflowLibrary({ onSelectWorkflow, onClose }: WorkflowLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const categories = [
    { id: 'all', name: 'All Workflows', icon: <Zap className="w-4 h-4" /> },
    { id: 'linkedin', name: 'LinkedIn', icon: <Linkedin className="w-4 h-4" /> },
    { id: 'email', name: 'Email', icon: <Mail className="w-4 h-4" /> },
    { id: 'whatsapp', name: 'WhatsApp', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'instagram', name: 'Instagram', icon: <Instagram className="w-4 h-4" /> },
    { id: 'voice', name: 'Voice', icon: <Phone className="w-4 h-4" /> },
    { id: 'multi-channel', name: 'Multi-Channel', icon: <Zap className="w-4 h-4" /> },
  ];

  const filteredWorkflows = selectedCategory === 'all' || !selectedCategory
    ? WORKFLOW_TEMPLATES
    : WORKFLOW_TEMPLATES.filter(w => w.category === selectedCategory);

  const getCategoryColor = (category: string) => {
    const colors = {
      linkedin: 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300',
      email: 'bg-purple-50 border-purple-200 hover:bg-purple-100 hover:border-purple-300',
      whatsapp: 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300',
      instagram: 'bg-pink-50 border-pink-200 hover:bg-pink-100 hover:border-pink-300',
      voice: 'bg-orange-50 border-orange-200 hover:bg-orange-100 hover:border-orange-300',
      'multi-channel': 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-50 border-gray-200 hover:bg-gray-100';
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Workflow Library</h2>
            <p className="text-sm text-gray-600 mt-1">Click any workflow to build it instantly</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter */}
        <div className="px-6 py-4 border-b border-gray-200 overflow-x-auto">
          <div className="flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id === 'all' ? null : cat.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border transition-all whitespace-nowrap',
                  (selectedCategory === cat.id || (cat.id === 'all' && !selectedCategory))
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                )}
              >
                {cat.icon}
                <span className="text-sm font-medium">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Workflow Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWorkflows.map((workflow) => (
              <button
                key={workflow.id}
                onClick={() => {
                  onSelectWorkflow(workflow);
                  onClose();
                }}
                className={cn(
                  'text-left p-5 rounded-xl border-2 transition-all hover:shadow-lg hover:scale-[1.02]',
                  getCategoryColor(workflow.category)
                )}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    workflow.category === 'linkedin' && 'bg-blue-100 text-blue-600',
                    workflow.category === 'email' && 'bg-purple-100 text-purple-600',
                    workflow.category === 'whatsapp' && 'bg-green-100 text-green-600',
                    workflow.category === 'instagram' && 'bg-pink-100 text-pink-600',
                    workflow.category === 'voice' && 'bg-orange-100 text-orange-600',
                    workflow.category === 'multi-channel' && 'bg-indigo-100 text-indigo-600',
                  )}>
                    {workflow.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{workflow.name}</h3>
                    <p className="text-xs text-gray-600">{workflow.description}</p>
                  </div>
                </div>
                
                {/* Steps Preview */}
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  {workflow.steps.map((step, idx) => (
                    <React.Fragment key={idx}>
                      <span className="text-xs px-2 py-1 bg-white/60 rounded-md text-gray-700 font-medium">
                        {step}
                      </span>
                      {idx < workflow.steps.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

