'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';
import RequirementsCollection from './RequirementsCollection';
import SearchResultsCards from './SearchResultsCards';

interface ChatMessageBubbleProps {
  role: 'ai' | 'user';
  content: string;
  timestamp?: Date;
  status?: 'need_input' | 'ready';
  missing?: Record<string, boolean> | string[];
  workflow?: any[];
  searchResults?: any[];
  onRequirementsComplete?: (data: Record<string, any>) => void;
}

export default function ChatMessageBubble({
  role,
  content,
  timestamp,
  status,
  missing,
  workflow,
  searchResults,
  onRequirementsComplete,
}: ChatMessageBubbleProps) {
  const isAI = role === 'ai';
  const showRequirements = isAI && status === 'need_input' && missing;
  const showSearchResults = isAI && searchResults && searchResults.length > 0;

  return (
    <div
      className={cn(
        'flex gap-4 w-full max-w-3xl mx-auto px-4 py-6',
        isAI ? 'bg-white' : 'bg-gray-50'
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isAI ? (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600" />
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
            {content}
          </div>
        </div>

        {/* Requirements Collection Component */}
        {showRequirements && onRequirementsComplete && (
          <div className="mt-4">
            <RequirementsCollection
              requirements={missing}
              message={content}
              workflow={workflow}
              onComplete={onRequirementsComplete}
            />
          </div>
        )}

        {/* Search Results Cards */}
        {showSearchResults && (
          <div className="mt-4">
            <SearchResultsCards
              results={searchResults}
              onCompanyClick={(company) => {
                console.log('Company clicked:', company);
                // Handle company click - could open details, add to workflow, etc.
              }}
            />
          </div>
        )}

        {timestamp && (
          <div className="mt-2 text-xs text-gray-400">
            {timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>
    </div>
  );
}

