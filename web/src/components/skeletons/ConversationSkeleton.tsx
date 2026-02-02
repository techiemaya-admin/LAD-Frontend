"use client";

import React from 'react';

/**
 * Skeleton loader for Conversations/Chat
 */
export function ConversationSkeleton() {
  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 p-4 space-y-4">
        <div className="h-10 w-full skeleton rounded-lg" />
        <div className="h-4 w-24 skeleton rounded mb-4" />

        {/* Conversation List */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 skeleton rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 skeleton rounded" />
                <div className="h-3 w-32 skeleton rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex-1">
            <div className="h-5 w-32 skeleton rounded mb-1" />
            <div className="h-3 w-24 skeleton rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-8 skeleton rounded-lg" />
            <div className="h-8 w-8 skeleton rounded-lg" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {Array.from({ length: 6 }).map((_, i) => {
            const isOwn = i % 2 === 0;
            return (
              <div key={i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs space-y-2 ${isOwn ? 'items-end' : 'items-start'}`}>
                  <div className={`h-10 w-40 skeleton rounded-lg ${isOwn ? 'rounded-br-none' : 'rounded-bl-none'}`} />
                  <div className="h-2 w-16 skeleton rounded" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 h-10 skeleton rounded-lg" />
            <div className="h-10 w-10 skeleton rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConversationSkeleton;
