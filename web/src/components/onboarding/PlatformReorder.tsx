'use client';
import React, { useState, useEffect } from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import { Linkedin, Mail, MessageCircle, Phone, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { logger } from '@/lib/logger';
interface Platform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}
const PLATFORM_CONFIG: Record<string, Platform> = {
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: <Linkedin className="w-5 h-5" />,
    color: 'text-[#0077B5]',
    bgColor: 'bg-[#0077B5]',
  },
  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: <MessageCircle className="w-5 h-5" />,
    color: 'text-[#25D366]',
    bgColor: 'bg-[#25D366]',
  },
  email: {
    id: 'email',
    name: 'Email',
    icon: <Mail className="w-5 h-5" />,
    color: 'text-[#F59E0B]',
    bgColor: 'bg-[#F59E0B]',
  },
  voice: {
    id: 'voice',
    name: 'Voice',
    icon: <Phone className="w-5 h-5" />,
    color: 'text-[#8B5CF6]',
    bgColor: 'bg-[#8B5CF6]',
  },
};
export default function PlatformReorder() {
  const { workflowPreview, reorderPlatforms } = useOnboardingStore();
  const [platforms, setPlatforms] = useState<string[]>([]);
  // Extract unique platforms from workflow in their current order
  useEffect(() => {
    const platformOrder: string[] = [];
    const seen = new Set<string>();
    workflowPreview.forEach(step => {
      let platform = '';
      if (step.type.startsWith('linkedin_')) platform = 'linkedin';
      else if (step.type.startsWith('whatsapp_')) platform = 'whatsapp';
      else if (step.type.startsWith('email_')) platform = 'email';
      else if (step.type.startsWith('voice_')) platform = 'voice';
      if (platform && !seen.has(platform)) {
        seen.add(platform);
        platformOrder.push(platform);
      }
    });
    setPlatforms(platformOrder);
    logger.debug('Extracted platforms from workflow', { platformOrder });
  }, [workflowPreview]);
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...platforms];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setPlatforms(newOrder);
    // Reorder the workflow based on new platform order
    reorderPlatforms(newOrder);
    logger.debug('Platform moved up', { platform: platforms[index], newOrder });
  };
  const handleMoveDown = (index: number) => {
    if (index >= platforms.length - 1) return;
    const newOrder = [...platforms];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setPlatforms(newOrder);
    // Reorder the workflow based on new platform order
    reorderPlatforms(newOrder);
    logger.debug('Platform moved down', { platform: platforms[index], newOrder });
  };
  if (platforms.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No platforms configured in workflow
      </div>
    );
  }
  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
        Platform Order
      </h3>
      <p className="text-xs text-gray-500 mb-4">
        Drag or use arrows to reorder platforms. The workflow will update automatically.
      </p>
      <div className="space-y-2">
        {platforms.map((platformId, index) => {
          const platform = PLATFORM_CONFIG[platformId];
          if (!platform) return null;
          return (
            <div
              key={platformId}
              className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 group"
            >
              {/* Drag Handle */}
              <div className="text-gray-400 cursor-grab active:cursor-grabbing">
                <GripVertical className="w-5 h-5" />
              </div>
              {/* Platform Icon */}
              <div className={`w-10 h-10 ${platform.bgColor} rounded-lg flex items-center justify-center text-white shadow-md`}>
                {platform.icon}
              </div>
              {/* Platform Name */}
              <div className="flex-1">
                <span className="font-semibold text-gray-800">{platform.name}</span>
                <p className="text-xs text-gray-500">Position {index + 1}</p>
              </div>
              {/* Reorder Buttons */}
              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className={`p-1.5 rounded-md transition-all duration-200 ${
                    index === 0 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-500 hover:text-white hover:bg-blue-500'
                  }`}
                  title="Move up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === platforms.length - 1}
                  className={`p-1.5 rounded-md transition-all duration-200 ${
                    index === platforms.length - 1 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-500 hover:text-white hover:bg-blue-500'
                  }`}
                  title="Move down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {/* Visual Order Preview */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-500 mb-2">Workflow Order:</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-1 bg-emerald-500 text-white text-xs rounded-md font-medium">Start</span>
          <span className="text-gray-400">→</span>
          <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded-md font-medium">Leads</span>
          {platforms.map((platformId, idx) => (
            <React.Fragment key={platformId}>
              <span className="text-gray-400">→</span>
              <span className={`px-2 py-1 ${PLATFORM_CONFIG[platformId]?.bgColor || 'bg-gray-500'} text-white text-xs rounded-md font-medium`}>
                {PLATFORM_CONFIG[platformId]?.name || platformId}
              </span>
            </React.Fragment>
          ))}
          <span className="text-gray-400">→</span>
          <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-md font-medium">End</span>
        </div>
      </div>
    </div>
  );
}